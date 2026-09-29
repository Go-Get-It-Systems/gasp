/**
 * network_on.js — Maestro runScript helper
 *
 * Re-enables network connectivity on the Android Emulator after the
 * upload-failure test has been asserted.
 */

const result = exec('adb shell settings put global airplane_mode_on 0');
if (result.exitCode !== 0) {
  throw new Error('Failed to disable airplane mode: ' + result.stderr);
}

exec(
  'adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false'
);

// Give the network stack a moment to re-establish connectivity.
// Maestro flows have a `wait` command; here we sleep in JS as a safeguard.
const start = Date.now();
while (Date.now() - start < 2000) { /* busy-wait 2s */ }

output.status = 'network_on';
