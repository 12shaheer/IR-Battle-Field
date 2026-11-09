const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
test('HTTP team flow enforces friendly fire, medical shooting locks, damage and team scores', async () => {
  const port = await new Promise(resolve => { const s = net.createServer();s.listen(0, '127.0.0.1', () => { const p = s.address().port;s.close(() => resolve(p)); }); });
  const server = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  const url = 'http://127.0.0.1:' + port;
  async function post(action, body) { const response = await fetch(url + '/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });return { status: response.status, data: await response.json() }; }
  const auth = result => ({ ...result.credentials, sessionId: result.me.sessionId, playerId: result.me.playerId });
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(url + '/health')).ok) break; } catch (_) {}await pause(50); }
    const session = (await post('createSession', { mode: 'team', maxPlayers: 40, durationSeconds: 1200 })).data;
    assert.equal((await post('createSession', { mode: 'team', maxPlayers: 41 })).status, 400);
    assert.equal((await post('joinSession', { joinCode: session.joinCode, displayName: 'Wrong Route' })).status, 400);
    async function squad(prefix) {
      let leader = (await post('createParty', { displayName: prefix + ' Captain' })).data;
      let member = (await post('joinParty', { displayName: prefix + ' Medic', invite: leader.invite })).data;
      for (const m of [leader, member]) assert.equal((await post('readyParty', { ...m.credentials, ready: true })).status, 200);
      const committed = await post('joinTeamMatch', { ...leader.credentials, joinCode: session.joinCode, teamName: prefix });
      assert.equal(committed.status, 200);
      leader = { ...leader, ...committed.data };
      member = { ...member, ...(await post('getParty', member.credentials)).data };
      return { leader, member, a: auth(leader), b: auth(member) };
    }
    const a = await squad('Alpha');
    assert.equal((await post('startGame', { sessionId: session.sessionId })).status, 400);
    const b = await squad('Bravo');assert.equal((await post('startGame', { sessionId: session.sessionId })).status, 200);
    const hit = (shooter, target, reporter = shooter) => post('processHit', { sessionId: session.sessionId, shooterId: shooter.playerId, targetId: target.playerId, ...reporter });
    const friendly = await hit(a.a, a.b);assert.equal(friendly.data.success, false);assert.match(friendly.data.reason, /Friendly/);
    assert.equal((await post('fireWeapon', { sessionId: session.sessionId, playerId: a.a.playerId })).status, 403);
    assert.equal((await hit(b.a, a.a)).data.targetHealth, 75);
    const offer = await post('setMedicalMode', { ...a.a, mode: 'receive' });assert.equal(offer.status, 200);assert.match(offer.data.qr, /^DZHEAL:/);
    const denied = await post('fireWeapon', a.a);assert.equal(denied.data.success, false);
    assert.equal((await hit(a.a, b.a)).data.success, false);
    await post('setMedicalMode', { ...a.b, mode: 'scan' });
    const started = await post('startHeal', { ...a.b, qr: offer.data.qr });assert.equal(started.status, 200);
    assert.equal((await post('setMedicalMode', { ...a.a, mode: 'closed' })).status, 400);
    assert.equal((await hit(b.a, a.a)).data.targetHealth, 50); // Both stay vulnerable during healing.
    const heartbeat = setInterval(() => { post('teamHeartbeat', a.a);post('teamHeartbeat', a.b); }, 700);
    await pause(5300);clearInterval(heartbeat);
    const state = await (await fetch(url + '/sessions/' + session.sessionId)).json();
    assert.equal(state.players[a.a.playerId].health, 100);assert.equal(state.players[a.b.playerId].medkits, 0);
    assert.equal(state.players[a.a.playerId].medicalMode, 'closed');
    assert(!JSON.stringify(state).includes(offer.data.qr.slice(7)), 'Private healing token leaked into session');
    assert.equal((await post('startHeal', { ...a.b, qr: offer.data.qr })).status, 400);
    for (let i = 0; i < 4; i++) await hit(b.a, a.a);
    const afterKill = await (await fetch(url + '/sessions/' + session.sessionId)).json();
    assert.equal(afterKill.teams[afterKill.players[b.a.playerId].teamId].score, 1);
    await post('endGameManually', { sessionId: session.sessionId });
    const ended = await (await fetch(url + '/sessions/' + session.sessionId)).json();assert.equal(ended.winnerName, 'Bravo');
  } finally { server.kill('SIGTERM'); }
});
