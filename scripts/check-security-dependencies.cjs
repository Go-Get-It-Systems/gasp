#!/usr/bin/env node
'use strict';

// Local verification only: no network, credentials, code upload or writes.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const floors = {
  ws: { 6: '6.2.6', 7: '7.5.13', 8: '8.22.0' },
  '@fastify/jwt': { 10: '10.2.5' },
  vitest: { 3: '3.2.7' },
};
function atLeast(version, floor) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
  const actual = version.split('.').map(Number);
  const minimum = floor.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (actual[i] !== minimum[i]) return actual[i] > minimum[i];
  }
  return true;
}
const checks = [];
for (const [location, entry] of Object.entries(lock.packages || {})) {
  for (const [name, branches] of Object.entries(floors)) {
    if (location !== `node_modules/${name}` && !location.endsWith(`/node_modules/${name}`)) continue;
    const floor = branches[Number(entry.version.split('.')[0])];
    const installedPath = path.join(root, location, 'package.json');
    const installed = fs.existsSync(installedPath) ? JSON.parse(fs.readFileSync(installedPath, 'utf8')).version : null;
    checks.push({ package: name, location, locked: entry.version, installed, minimum: floor || null,
      passed: Boolean(floor && atLeast(entry.version, floor) && installed === entry.version) });
  }
}
const hasWs = checks.some((check) => check.package === 'ws');
const passed = hasWs && checks.every((check) => check.passed);
console.log(JSON.stringify({ project: lock.name, scope: 'F06: ws, @fastify/jwt and Vitest; not a complete SCA', passed, checks }, null, 2));
if (!passed) process.exitCode = 1;
