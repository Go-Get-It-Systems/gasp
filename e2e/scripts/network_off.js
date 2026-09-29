/**
 * network_off.js — Maestro runScript helper
 *
 * Disables all network connectivity on the Android Emulator via ADB.
 * Called before the upload-failure assertion in 03_upload_failure_retry.yaml.
 *
 * iOS alternative: use mitmproxy to intercept and drop Firebase Storage requests.
 * See e2e/README.md section "iOS Network Simulation".
 *
 * Maestro runScript receives an `output` object to pass values back to the flow.
 * This script ignores output — it only performs a side effect.
 */

// Maestro's JS runtime exposes a global `exec` function for shell commands.
// It is synchronous and returns { exitCode, stdout, stderr }.
const result = exec('adb shell settings put global airplane_mode_on 1');
if (result.exitCode !== 0) {
  throw new Error('Failed to enable airplane mode: ' + result.stderr);
}

exec(
  'adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true'
);

output.status = 'network_off';
