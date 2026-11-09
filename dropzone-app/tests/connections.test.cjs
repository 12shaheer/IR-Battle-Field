const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function harness(reactNative = {}) {
  const timers = new Map(); let next = 0;
  const manager = { startDeviceScan: (_services, _options, cb) => { manager.scan = cb; },
    stopDeviceScan() { manager.scan = null; },
    onDeviceDisconnected(id, cb) { manager.listeners.set(id, cb); return { remove: () => manager.listeners.delete(id) }; },
    listeners: new Map() };
  const mocks = { './teamParty': { teamAuth: () => ({}) }, 'react-native': { Platform: { OS: 'ios' }, ...reactNative },
    './ble': { bleManager: manager }, './targeting': { getTargetInSight: () => null }, './combat': { fireShot: async () => {}, registerHit: async () => {} },
    '../utils/sounds': { playSound() {} } };
  const cache = {};
  const globals = { Buffer, process: { env: {} }, console: { log() {}, warn() {}, error() {} },
    setTimeout: (cb, delay) => { const id = ++next; timers.set(id, { cb, delay }); return id; },
    clearTimeout: id => timers.delete(id) };
  function load(file) {
    if (cache[file]) return cache[file].exports;
    const module = { exports: {} }; cache[file] = module;
    const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
      babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`, globals)(id => {
      if (mocks[id]) return mocks[id];
      if (id === 'buffer') return { Buffer };
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.js'));
      throw new Error(id);
    }, module, module.exports);
    return module.exports;
  }
  const game = path.resolve(__dirname, '../src/game');
  const pairing = load(game + '/gunPairing.js');
  pairing.setPairedGun({ gunId: 'gun001', transmitter: 'TX001', receiver: 'RX001' });
  const ir = load(game + '/ir.js'); const setup = load(game + '/irSetup.js');
  function board(id) {
    const d = { id, name: 'DropZone-' + id, connected: false, connects: 0, cancels: 0, monitors: [], writes: [],
      async connect() { d.connects++; d.connected = true; return d; },
      async cancelConnection() { d.cancels++; d.connected = false; },
      async isConnected() { return d.connected; },
      async discoverAllServicesAndCharacteristics() {},
      async readCharacteristicForService() { return { value: Buffer.from(id).toString('base64') }; },
      async writeCharacteristicWithResponseForService(...args) { d.writes.push(args); },
      async writeCharacteristicWithoutResponseForService(...args) { d.writes.push(args); },
      monitorCharacteristicForService(_svc, _char, cb) { d.monitors.push(cb); return { remove() {} }; } };
    return d;
  }
  return { timers, manager, load, pairing, ir, setup, board, globals };
}
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const args = { players: [{ id: 'p1', displayName: 'Player' }], myPlayerId: 'p1', sessionId: 's1' };
async function connectPair(h) {
  const tx = h.board('TX001'), rx = h.board('RX001');
  const done = h.setup.setupIRHardware(args); await flush();
  h.manager.scan(null, tx); await flush(); h.manager.scan(null, rx); await done;
  return { tx, rx };
}
test('two boards stay connected; roster updates reuse links and subscriptions', async () => {
  const h = harness(); const { tx, rx } = await connectPair(h);
  assert.equal(h.setup.getBleStatus().status, 'connected');
  assert.equal(tx.writes.length, 1); assert.equal(tx.monitors.length, 1); assert.equal(rx.monitors.length, 1);
  await h.setup.setupIRHardware({ ...args, players: [...args.players, { id: 'p2', displayName: 'Other' }] });
  assert.equal(tx.connects, 1); assert.equal(rx.connects, 1); assert.equal(tx.monitors.length, 1);
  h.setup.teardownIRHardware(); assert.equal(h.timers.size, 0);
});
test('RX loss retries only RX and restores combined status', async () => {
  const h = harness(); const { tx, rx } = await connectPair(h);
  rx.connected = false; h.manager.listeners.get(rx.id)(new Error('out of range'));
  assert.equal(h.setup.getBleStatus().device, 'RX'); assert.equal(h.timers.size, 1);
  const [id, timer] = [...h.timers][0]; h.timers.delete(id); timer.cb(); await flush();
  h.manager.scan(null, rx); await flush();
  assert.equal(h.setup.getBleStatus().status, 'connected'); assert.equal(tx.connects, 1); assert.equal(rx.connects, 2);
  h.setup.teardownIRHardware();
});
test('RX setup failure leaves TX monitored and retries RX', async () => {
  const h = harness(); const tx = h.board('TX001');
  const done = h.setup.setupIRHardware(args); await flush(); h.manager.scan(null, tx); await flush();
  h.manager.scan(new Error('RX absent')); await done;
  assert.equal(tx.monitors.length, 1); assert.ok(h.manager.listeners.has(tx.id));
  assert.equal(h.setup.getBleStatus().device, 'RX'); assert.equal(h.timers.size, 1);
  h.setup.teardownIRHardware();
});
test('receiver without an advertised name connects using its verified GATT ID', async () => {
  const h = harness(); const tx = h.board('TX001'), rx = h.board('RX001');
  rx.name = null;
  const done = h.setup.setupIRHardware(args); await flush();
  h.manager.scan(null, tx); await flush(); h.manager.scan(null, rx); await done;
  assert.equal(h.setup.getBleStatus().status, 'connected');
  assert.equal(rx.monitors.length, 1);
  h.setup.teardownIRHardware();
});
test('unnamed receiver with wrong GATT ID is rejected and discovery continues', async () => {
  const h = harness(); const wrong = h.board('RX002'), rx = h.board('RX001');
  wrong.name = null;
  const done = h.ir.scanAndVerifyDevice('RX001', h.setup.RX_SERVICE_UUID); await flush();
  h.manager.scan(null, wrong); await flush();
  assert.equal(wrong.connected, false);
  assert.equal(typeof h.manager.scan, 'function');
  h.manager.scan(null, rx);
  assert.equal(await done, rx);
  h.setup.teardownIRHardware();
});
test('discovery ignores other players and late connection cannot revive teardown', async () => {
  const h = harness(); const other = h.board('TX002'); const tx = h.board('TX001');
  let complete;
  tx.connect = () => new Promise(resolve => { complete = resolve; });
  const done = h.setup.setupIRHardware(args); await flush();
  h.manager.scan(null, other); await flush(); assert.equal(other.connected, false);
  h.manager.scan(null, tx); h.setup.teardownIRHardware(); complete(tx); await done; await flush();
  assert.equal(h.setup.getBleStatus().status, 'disconnected'); assert.equal(h.manager.listeners.size, 0);
  assert.ok(tx.cancels > 0); assert.equal(h.timers.size, 0);
});
test('shooting without TX does not start discovery or reconnect', async () => {
  const h = harness(); assert.equal(await h.ir.fireIR('Player'), false);
  assert.equal(h.manager.scan, undefined); assert.equal(h.timers.size, 0);
});
test('stale advertised receiver name cannot override the correct GATT identity', async () => {
  const h = harness(), rx = h.board('RX001'); rx.name = 'Old receiver firmware';
  const done = h.ir.scanAndVerifyDevice('RX001', h.setup.RX_SERVICE_UUID); await flush();
  h.manager.scan(null, rx); assert.equal(await done, rx);
  h.setup.teardownIRHardware();
});
test('transient receiver GATT failure can recover within the same scan attempt', async () => {
  const h = harness(), rx = h.board('RX001'); let reads = 0;
  rx.readCharacteristicForService = async () => {
    if (++reads === 1) throw new Error('GATT busy');
    return { value: Buffer.from('RX001').toString('base64') };
  };
  const done = h.ir.scanAndVerifyDevice('RX001', h.setup.RX_SERVICE_UUID); await flush();
  h.manager.scan(null, rx); await flush(); h.manager.scan(null, rx);
  assert.equal(await done, rx); assert.equal(rx.connects, 2);
  h.setup.teardownIRHardware();
});
test('failed RX notifications reconnect RX without disturbing TX', async () => {
  const h = harness(); const { tx, rx } = await connectPair(h);
  rx.monitors[0](new Error('Notifications stopped')); await flush();
  assert.equal(h.setup.getBleStatus().device, 'RX'); assert.equal(rx.connected, false);
  const [id, timer] = [...h.timers][0]; h.timers.delete(id); timer.cb(); await flush();
  h.manager.scan(null, rx); await flush();
  assert.equal(h.setup.getBleStatus().status, 'connected');
  assert.equal(tx.connects, 1); assert.equal(rx.monitors.length, 2);
  h.setup.teardownIRHardware();
});
test('manual WebSocket close cancels retries and closes the replacement socket', () => {
  const h = harness(); const sockets = [];
  h.globals.WebSocket = class { constructor() { sockets.push(this); } close() { this.closed = true; this.onclose?.(); } };
  const api = h.load(path.resolve(__dirname, '../src/utils/firebase.js'));
  const connection = api.connectWebSocket(() => {});
  sockets[0].onclose(); const [id, timer] = [...h.timers][0]; h.timers.delete(id); timer.cb();
  assert.equal(sockets.length, 2); connection.close(); assert.equal(sockets[1].closed, true); assert.equal(h.timers.size, 0);
});
test('server connection status follows socket lifecycle without requiring a game message', () => {
  const h = harness(); const sockets = [], states = [];
  h.globals.WebSocket = class { constructor() { sockets.push(this); } close() { this.onclose?.(); } };
  const api = h.load(path.resolve(__dirname, '../src/utils/firebase.js'));
  const connection = api.connectWebSocket(() => {}, value => states.push(value));
  assert.equal(states.at(-1), false);
  sockets[0].onopen(); assert.equal(states.at(-1), true);
  sockets[0].onclose(); assert.equal(states.at(-1), false);
  const [id, timer] = [...h.timers][0]; h.timers.delete(id); timer.cb();
  sockets[1].onopen(); assert.equal(states.at(-1), true);
  const count = states.length; sockets[0].onopen(); assert.equal(states.length, count);
  connection.close();
});
test('simultaneous loss serializes scans and restores both boards', async () => {
  const h = harness(); const { tx, rx } = await connectPair(h);
  tx.connected = false; rx.connected = false;
  h.manager.listeners.get(tx.id)(new Error('TX off'));
  h.manager.listeners.get(rx.id)(new Error('RX off'));
  for (const [id, timer] of [...h.timers]) { h.timers.delete(id); timer.cb(); }
  await flush(); h.manager.scan(null, tx); await flush(); h.manager.scan(null, rx); await flush();
  assert.equal(h.setup.getBleStatus().status, 'connected');
  assert.equal(tx.connects, 2); assert.equal(rx.connects, 2);
  assert.equal(tx.writes.length, 2); h.setup.teardownIRHardware();
});
test('old notification callbacks cannot affect a new match', async () => {
  const h = harness(); const { tx } = await connectPair(h);
  const callback = tx.monitors[0]; h.setup.teardownIRHardware();
  let fired = 0;
  const next = h.setup.setupIRHardware({ ...args, sessionId: 's2', onTriggerFired: () => fired++ });
  callback(null, { value: 'Cg==' }); assert.equal(fired, 0);
  await flush(); h.setup.teardownIRHardware(); await next;
});
test('Unity is optional on existing native builds and unsupported platforms', async () => {
  const h = harness();
  const bridge = h.load(path.resolve(__dirname, '../src/game/unityBridge.js'));
  assert.equal(bridge.unityAvailable, false);
  assert.doesNotThrow(() => bridge.updateUnity({ ammo: 10 }));
  assert.doesNotThrow(() => bridge.presentUnity('PresentShot'));
  assert.equal(typeof bridge.onUnityEvent(() => {}), 'function');
  await assert.rejects(bridge.launchUnity({}), /not installed/);
});
test('Unity bridge forwards authoritative state and removes native event listeners', async () => {
  const calls = []; let listener, removed = false;
  const native = { launch: value => { calls.push(JSON.parse(value)); return Promise.resolve(true); }, updateState: value => calls.push(JSON.parse(value)), send: (...args) => calls.push(args) };
  const h = harness({ Platform: { OS: 'android' }, NativeModules: { DropZoneUnity: native }, NativeEventEmitter: class {
    addListener(name, callback) { assert.equal(name, 'DropZoneUnityEvent'); listener = callback; return { remove() { removed = true; } }; }
  } });
  const bridge = h.load(path.resolve(__dirname, '../src/game/unityBridge.js'));
  assert.equal(bridge.unityAvailable, true);
  await bridge.launchUnity({ ammo: 12, health: 80 });
  bridge.updateUnity({ ammo: 11 }); bridge.presentUnity('PresentShot');
  assert.equal(calls[0].ammo, 12); assert.equal(calls[1].ammo, 11); assert.equal(calls[2][0], 'PresentShot');
  let event; const unsubscribe = bridge.onUnityEvent(value => { event = value; });
  listener({ type: 'qr', value: 'DZ:p2' }); assert.equal(event.value, 'DZ:p2');
  unsubscribe(); assert.equal(removed, true);
});

test('first-aid hardware lock blocks firing and is restored after transmitter reconnect', async () => {
  const h = harness(), { tx, rx } = await connectPair(h);
  const lockUuid = '64504f91-6444-4e50-85de-800a1828f3b1';
  await h.ir.setHardwareCombatLock(true);
  assert.equal(tx.writes.at(-1)[1], lockUuid);
  assert.equal(Buffer.from(tx.writes.at(-1)[2], 'base64')[0], 1);
  const writes = tx.writes.length;assert.equal(await h.ir.fireIR(), false);assert.equal(tx.writes.length, writes);
  tx.connected = false;h.manager.listeners.get(tx.id)(new Error('TX lost'));
  const [timerId, timer] = [...h.timers][0];h.timers.delete(timerId);timer.cb();await flush();
  h.manager.scan(null, tx);await flush();
  assert.equal(Buffer.from(tx.writes.filter(w => w[1] === lockUuid).at(-1)[2], 'base64')[0], 1);
  await h.ir.setHardwareCombatLock(false);assert.equal(Buffer.from(tx.writes.at(-1)[2], 'base64')[0], 0);
  assert.equal(await h.ir.fireIR(), true);h.setup.teardownIRHardware();
});
