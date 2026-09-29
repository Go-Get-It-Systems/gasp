/**
 * unblock_ws_port.js — Maestro runScript helper
 *
 * Removes the iptables rule added by block_ws_port.js, restoring Socket.IO
 * connectivity to the GASP backend on port 3000.
 */

const result = exec(
  'adb shell iptables -D OUTPUT -p tcp --dport 3000 -j REJECT'
);

if (result.exitCode !== 0) {
  // Rule may already be absent if a previous test cleanup ran.
  // Log but do not throw — a missing rule is not a fatal error.
  console.log('iptables delete returned non-zero (rule may already be absent): ' + result.stderr);
}

output.status = 'ws_port_unblocked';
