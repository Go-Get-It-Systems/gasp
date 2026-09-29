/**
 * block_ws_port.js — Maestro runScript helper
 *
 * Blocks TCP port 3000 (GASP backend / Socket.IO) on the Android Emulator
 * using iptables, while leaving all other network (Firebase, DNS) intact.
 *
 * Requires the emulator to be running with root access:
 *   adb root
 *   adb remount
 *
 * This is more surgical than airplane mode — only Socket.IO is disconnected,
 * allowing Firebase Storage calls to still succeed.
 */

// Block outbound TCP to port 3000.
const result = exec(
  'adb shell iptables -A OUTPUT -p tcp --dport 3000 -j REJECT'
);

if (result.exitCode !== 0) {
  throw new Error(
    'iptables block failed (ensure emulator is rooted): ' + result.stderr
  );
}

output.status = 'ws_port_blocked';
output.port = '3000';
