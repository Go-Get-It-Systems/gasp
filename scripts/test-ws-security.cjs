#!/usr/bin/env node
'use strict';

// Bounded, in-memory receiver tests. No sockets, remote targets or load test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

function receive(receiver, event, frames) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      receiver.destroy();
      reject(new Error('Receiver did not produce the expected ' + event));
    }, 1500);
    receiver.once(event, (value) => { clearTimeout(timeout); resolve(value); });
    if (event !== 'error') receiver.once('error', (error) => { clearTimeout(timeout); reject(error); });
    for (const frame of frames) receiver.write(frame);
  });
}

(async () => {
  const results = [];
  for (const [location, entry] of Object.entries(lock.packages || {})) {
    if (location !== 'node_modules/ws' && !location.endsWith('/node_modules/ws')) continue;
    const ws = require(path.join(root, location));
    const installed = JSON.parse(fs.readFileSync(path.join(root, location, 'package.json'), 'utf8')).version;
    assert.equal(installed, entry.version, 'Lockfile differs from the installed ws');
    const major = Number(installed.split('.')[0]);
    // Preserve each supported major's public Receiver constructor signature.
    const receiver = (maxBufferedChunks, maxFragments) => {
      if (major === 6) return new ws.Receiver('nodebuffer', {}, 1024, maxBufferedChunks, maxFragments);
      if (major === 7) return new ws.Receiver('nodebuffer', {}, true, 1024, maxBufferedChunks, maxFragments);
      return new ws.Receiver({ isServer: true, maxPayload: 1024, maxFragments, maxBufferedChunks });
    };
    const server = new ws.Server({ noServer: true });
    assert.ok(server.options.maxFragments > 0, 'Server must limit fragments by default');
    assert.ok(server.options.maxBufferedChunks > 0, 'Server must limit buffered chunks by default');
    server.close();

    const normal = receiver(8, 4);
    const message = await receive(normal, 'message', [Buffer.from([0x81, 0x82, 0, 0, 0, 0, 0x6f, 0x6b])]);
    assert.equal(message.toString(), 'ok');
    normal.destroy();

    const allowedFragments = receiver(8, 4);
    const allowedMessage = await receive(allowedFragments, 'message', [
      Buffer.from([0x01, 0x81, 0, 0, 0, 0, 0x6f]),
      Buffer.from([0x80, 0x81, 0, 0, 0, 0, 0x6b]),
    ]);
    assert.equal(allowedMessage.toString(), 'ok');
    allowedFragments.destroy();

    const fragmented = receiver(8, 4);
    const frames = [Buffer.from([0x01, 0x81, 0, 0, 0, 0, 0x61])];
    for (let i = 0; i < 4; i++) frames.push(Buffer.from([0x00, 0x81, 0, 0, 0, 0, 0x61]));
    const error = await receive(fragmented, 'error', frames);
    assert.equal(error.name, 'RangeError');
    assert.equal(error.message, 'Too many message fragments');
    assert.ok(Object.getOwnPropertySymbols(error).some((symbol) => symbol.description === 'status-code' && error[symbol] === 1008));
    if (major >= 7) assert.equal(error.code, 'WS_ERR_TOO_MANY_BUFFERED_PARTS');
    fragmented.destroy();

    const buffered = receiver(4, 8);
    const chunks = [Buffer.from([0x82, 0xff])];
    for (let i = 0; i < 5; i++) chunks.push(Buffer.from([0]));
    const bufferedError = await receive(buffered, 'error', chunks);
    assert.equal(bufferedError.name, 'RangeError');
    assert.equal(bufferedError.message, 'Too many buffered chunks');
    assert.ok(Object.getOwnPropertySymbols(bufferedError).some((symbol) => symbol.description === 'status-code' && bufferedError[symbol] === 1008));
    if (major >= 7) assert.equal(bufferedError.code, 'WS_ERR_TOO_MANY_BUFFERED_PARTS');
    buffered.destroy();
    results.push({ location, version: installed, defaultLimits: 'passed', normalMessage: 'passed',
      allowedFragmentedMessage: 'passed', boundedFragmentLimit: 'passed', bufferedChunkLimit: 'passed',
      maximumTestPayloadBytes: 7, networkConnections: 0 });
  }
  assert.ok(results.length > 0, 'No ws dependency was tested');
  console.log(JSON.stringify({ project: lock.name, passed: true, results }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ project: lock.name, passed: false, error: error.message }));
  process.exitCode = 1;
});
