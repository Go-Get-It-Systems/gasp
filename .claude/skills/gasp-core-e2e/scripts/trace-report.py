"""Check a device run against the contract from its `[gasp-flow]` Metro lines.

Usage: paste the lines (from preview_logs search "[gasp-flow]") on stdin:
    python3 trace-report.py < trace.txt
Only the last run (from the last hold-start that reached a reveal) is judged.
"""
import re
import sys

LINE = re.compile(r'\[gasp-flow\] (\S+) at=(\d+)(.*)')
events = []
for raw in sys.stdin:
    m = LINE.search(raw)
    if not m:
        continue
    fields = dict(kv.split('=', 1) for kv in m.group(3).split() if '=' in kv)
    events.append((m.group(1), int(m.group(2)), fields))

if not events:
    sys.exit('no [gasp-flow] lines: is the app a dev build connected to this Metro?')

# Metro can print a line twice; drop exact repeats.
deduped = []
for e in events:
    if not deduped or deduped[-1][:2] != e[:2]:
        deduped.append(e)
events = deduped

starts = [i for i, e in enumerate(events) if e[0] == 'hold-start']
run = events
for i in reversed(starts):
    if any(e[0] == 'reveal' for e in events[i:]):
        run = events[i:]
        break

t0 = run[0][1]
print('timeline (ms from hold-start):')
for step, at, fields in run:
    extra = ' '.join(f'{k}={v}' for k, v in fields.items())
    print(f'  +{at - t0:>6}  {step:<20} {extra}')

def first(step):
    return next((e for e in run if e[0] == step), None)

checks = []
def last(step):
    return next((e for e in reversed(run) if e[0] == step), None)

# Retries are expected (expo-camera can reject the first attempt); judge the
# attempt that actually recorded, i.e. the last one.
rec, reveal, composite = last('recording-started'), first('reveal'), first('composite')
delivered, close = first('reaction-delivered'), first('close-view')

if rec and reveal:
    lead = reveal[1] - rec[1]
    checks.append(('C3 recording starts during the countdown', rec[2].get('duringCountdown') == 'true' and lead >= 1500,
                   f'recording began {lead}ms before the reveal (expected ~3000ms)'))
else:
    checks.append(('C3 recording starts during the countdown', False,
                   'no recording-started' if not rec else 'no reveal'))
retries = [e for e in run if e[0] == 'recording-failed']
gave_up = [e for e in retries if e[2].get('retry') != 'true']
checks.append(('C4/C5 recording kept going', not gave_up and first('no-clip') is None,
               'gave up: ' + gave_up[0][2].get('error', '') if gave_up else
               'no clip' if first('no-clip') else f'ok ({len(retries)} not-ready retries)'))
if composite:
    offset = composite[2].get('revealOffsetMs')
    ok = offset not in (None, 'undefined') and int(offset) >= 1500
    checks.append(('C6 composite offset matches the countdown', ok and composite[2].get('isComposite') == 'true',
                   f'revealOffsetMs={offset} isComposite={composite[2].get("isComposite")}'))
if delivered:
    bad_close = close is not None and close[1] <= delivered[1]
    checks.append(('C7 no close-view before the reaction is delivered', not bad_close,
                   f'close-view ({close[2].get("why")}) came first' if bad_close else f'delivered via {delivered[2].get("via")}'))
elif first('reaction-failed'):
    checks.append(('C8 failed delivery closes the view', close is not None, 'close-view sent' if close else 'missing close-view'))

print('\ncontract checks:')
failed = False
for name, ok, detail in checks:
    failed |= not ok
    print(f'  {"PASS" if ok else "FAIL"}  {name}: {detail}')
sys.exit(1 if failed else 0)
