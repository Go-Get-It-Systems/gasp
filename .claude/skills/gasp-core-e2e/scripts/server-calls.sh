#!/bin/sh
# Server-side evidence for gasp-core-e2e: the gasp/reaction calls production
# received, in order, with status codes. Read-only (railway logs).
# Usage: server-calls.sh [minutes-back, default 15]
set -eu
MINUTES="${1:-15}"
BACKEND_DIR="$(cd "$(dirname "$0")/../../../../.." && pwd)/gasp-backend"
cd "$BACKEND_DIR"
railway logs --json 2>/dev/null | python3 -c '
import json, sys, time
cutoff = (time.time() - int(sys.argv[1]) * 60) * 1000
reqs, done = {}, {}
for line in sys.stdin:
    try:
        j = json.loads(line)
    except ValueError:
        continue
    rid = j.get("reqId")
    if not rid:
        continue
    if j.get("message") == "incoming request" and "req" in j:
        reqs[rid] = (j.get("time", 0), j["req"]["method"], j["req"]["url"])
    elif j.get("message") == "request completed":
        done[rid] = (j.get("res", {}).get("statusCode"), round(j.get("responseTime", 0)))
keys = ("/gasps/", "/reactions", "/messages")
for rid, (t, method, url) in sorted(reqs.items(), key=lambda kv: kv[1][0]):
    if t < cutoff or method == "GET" or not any(k in url for k in keys):
        continue
    status, ms = done.get(rid, ("?", "?"))
    print(time.strftime("%H:%M:%S", time.localtime(t / 1000)) + ".%03d" % (t % 1000), method, url, status, f"{ms}ms")
' "$MINUTES"
