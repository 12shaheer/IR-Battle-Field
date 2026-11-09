const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTeamMode, blocked } = require('../team-mode');
function fixture() {
  let time = 100000;
  const sessions = { match: { mode: 'team', maxPlayers: 40, status: 'lobby', joinCode: '123456', zoneCenter: { x: 50, y: 50 }, teams: {}, players: {}, events: [] } };
  const engine = createTeamMode({ sessions, now: () => time, broadcast() {}, addEvent: (key, event) => sessions[key].events.push(event) });
  const auth = result => ({ ...result.credentials, sessionId: 'match', playerId: result.me.playerId });
  function squad(prefix, teamName) {
    let leader = engine.createParty({ displayName: prefix + ' Captain' });
    let member = engine.joinParty({ displayName: prefix + ' Medic', invite: leader.invite });
    engine.readyParty({ ...auth(leader), ready: true });
    engine.readyParty({ ...auth(member), ready: true });
    leader = { ...leader, ...engine.joinTeamMatch({ ...auth(leader), joinCode: '123456', teamName }) };
    member = { ...member, ...engine.getParty(auth(member)) };
    return { leader, member, a: auth(leader), b: auth(member), first: sessions.match.players[leader.me.playerId], second: sessions.match.players[member.me.playerId] };
  }
  return { sessions, engine, auth, squad, advance: ms => { time += ms; }, now: () => time };
}
test('party QR joins 10, rejects an 11th, and never exposes member secrets', () => {
  const f = fixture(), leader = f.engine.createParty({ displayName: 'Captain' });
  for (let i = 1; i < 10; i++) f.engine.joinParty({ displayName: 'Member ' + i, invite: leader.invite });
  assert.equal(f.engine.getParty(f.auth(leader)).party.members.length, 10);
  assert.throws(() => f.engine.joinParty({ displayName: 'Overflow', invite: leader.invite }), /10 members/);
  assert(!JSON.stringify(f.engine.getParty(f.auth(leader)).party).includes(leader.credentials.memberToken));
  assert.throws(() => f.engine.getParty({ ...f.auth(leader), memberToken: 'forged' }), /expired/);
});
test('only a leader can commit 2–10 ready members; the whole team enters once', () => {
  const f = fixture(), leader = f.engine.createParty({ displayName: 'Captain' });
  assert.throws(() => f.engine.joinTeamMatch({ ...f.auth(leader), joinCode: '123456', teamName: 'Alpha' }), /2–10/);
  const member = f.engine.joinParty({ displayName: 'Medic', invite: leader.invite });
  assert.throws(() => f.engine.joinTeamMatch({ ...f.auth(member), joinCode: '123456', teamName: 'Alpha' }), /leader/);
  assert.throws(() => f.engine.joinTeamMatch({ ...f.auth(leader), joinCode: '123456', teamName: 'Alpha' }), /mark ready/);
  f.engine.readyParty({ ...f.auth(leader), ready: true });f.engine.readyParty({ ...f.auth(member), ready: true });
  f.engine.joinTeamMatch({ ...f.auth(leader), joinCode: '123456', teamName: 'Alpha' });
  f.engine.joinTeamMatch({ ...f.auth(leader), joinCode: '123456', teamName: 'Alpha' });
  assert.equal(Object.keys(f.sessions.match.players).length, 2);assert.equal(Object.keys(f.sessions.match.teams).length, 1);
});
test('capacity is checked atomically and teams cannot enter a solo match', () => {
  const f = fixture(), leader = f.engine.createParty({ displayName: 'Captain' }), member = f.engine.joinParty({ displayName: 'Medic', invite: leader.invite });
  for (const m of [leader, member]) f.engine.readyParty({ ...f.auth(m), ready: true });
  f.sessions.match.maxPlayers = 1;
  assert.throws(() => f.engine.joinTeamMatch({ ...f.auth(leader), joinCode: '123456', teamName: 'Alpha' }), /Nobody was added/);
  assert.equal(Object.keys(f.sessions.match.players).length, 0);
  f.sessions.match.maxPlayers = 40;f.sessions.match.mode = 'solo';
  assert.throws(() => f.engine.joinTeamMatch({ ...f.auth(leader), joinCode: '123456', teamName: 'Alpha' }), /Solo/);
});
test('leader departure transfers leadership and invalidates the old invite', () => {
  const f = fixture(), leader = f.engine.createParty({ displayName: 'Captain' }), member = f.engine.joinParty({ displayName: 'Medic', invite: leader.invite });
  f.engine.leaveParty(f.auth(leader));
  assert.equal(f.engine.getParty(f.auth(member)).me.leader, true);
  assert.throws(() => f.engine.joinParty({ displayName: 'Late player', invite: leader.invite }), /expired/);
});
test('four full teams fit exactly 40 players', () => {
  const f = fixture();
  for (let t = 0; t < 4; t++) {
    const leader = f.engine.createParty({ displayName: 'Captain ' + t });
    const members = [leader];
    for (let i = 1; i < 10; i++) members.push(f.engine.joinParty({ displayName: 'Player ' + t + '-' + i, invite: leader.invite }));
    for (const member of members) f.engine.readyParty({ ...f.auth(member), ready: true });
    f.engine.joinTeamMatch({ ...f.auth(leader), joinCode: '123456', teamName: 'Team ' + t });
  }
  assert.equal(Object.keys(f.sessions.match.players).length, 40);f.engine.validateStart(f.sessions.match);
});
test('healing QR rotates on opening, invalidates on closing, rejects enemy/self/replay', () => {
  const f = fixture(), a = f.squad('Alpha', 'Alpha'), b = f.squad('Bravo', 'Bravo');f.sessions.match.status = 'active';
  a.first.health = 50;
  const old = f.engine.setMedicalMode({ ...a.a, mode: 'receive' });
  const fresh = f.engine.setMedicalMode({ ...a.a, mode: 'receive' });assert.notEqual(old.qr, fresh.qr);
  f.engine.setMedicalMode({ ...a.b, mode: 'scan' });
  assert.throws(() => f.engine.startHeal({ ...a.b, qr: old.qr }), /expired/);
  f.engine.setMedicalMode({ ...b.a, mode: 'scan' });assert.throws(() => f.engine.startHeal({ ...b.a, qr: fresh.qr }), /own teammates/);
  f.engine.setMedicalMode({ ...a.a, mode: 'closed' });assert.throws(() => f.engine.startHeal({ ...a.b, qr: fresh.qr }), /expired/);
  const next = f.engine.setMedicalMode({ ...a.a, mode: 'receive' });
  f.engine.startHeal({ ...a.b, qr: next.qr });assert.throws(() => f.engine.startHeal({ ...a.b, qr: next.qr }), /scanner/);
  assert.throws(() => f.engine.setMedicalMode({ ...a.a, mode: 'closed' }), /five seconds/);
});
test('five-second heal keeps both vulnerable and consumes one kit only on completion', () => {
  const f = fixture(), a = f.squad('Alpha', 'Alpha');f.sessions.match.status = 'active';a.first.health = 50;
  const offer = f.engine.setMedicalMode({ ...a.a, mode: 'receive' });f.engine.setMedicalMode({ ...a.b, mode: 'scan' });f.engine.startHeal({ ...a.b, qr: offer.qr });
  assert(blocked(a.first) && blocked(a.second));assert.equal(a.second.medkits, 1);
  f.advance(3000);a.first.health -= 25; // Damage is still permitted during the lock.
  f.engine.heartbeat(a.a);f.engine.heartbeat(a.b);f.engine.tick();assert.equal(a.first.health, 25);
  f.advance(1999);f.engine.tick();assert.equal(a.first.health, 25);
  f.advance(1);f.engine.tick();assert.equal(a.first.health, 100);assert.equal(a.second.medkits, 0);assert(!blocked(a.first) && !blocked(a.second));
  f.engine.tick();assert.equal(a.second.medkits, 0);assert.throws(() => f.engine.setMedicalMode({ ...a.b, mode: 'scan' }), /already used/);
});
test('death and missing heartbeats cancel healing without consuming the kit', () => {
  for (const reason of ['death', 'disconnect']) {
    const f = fixture(), a = f.squad('Alpha', 'Alpha');f.sessions.match.status = 'active';a.first.health = 25;
    const offer = f.engine.setMedicalMode({ ...a.a, mode: 'receive' });f.engine.setMedicalMode({ ...a.b, mode: 'scan' });f.engine.startHeal({ ...a.b, qr: offer.qr });
    if (reason === 'death') { a.first.status = 'eliminated';a.first.health = 0; } else f.advance(3600);
    f.engine.tick();assert.equal(a.second.medkits, 1);assert(!blocked(a.second));assert.equal(a.first.health, reason === 'death' ? 0 : 25);
  }
});
test('expired offers, wrong credentials and full-health targets cannot be healed', () => {
  const f = fixture(), a = f.squad('Alpha', 'Alpha');f.sessions.match.status = 'active';
  assert.throws(() => f.engine.setMedicalMode({ ...a.a, mode: 'receive' }), /already full/);
  a.first.health = 50;const offer = f.engine.setMedicalMode({ ...a.a, mode: 'receive' });
  f.advance(46000);f.engine.setMedicalMode({ ...a.b, mode: 'scan' });assert.throws(() => f.engine.startHeal({ ...a.b, qr: offer.qr }), /expired/);
  assert.throws(() => f.engine.setMedicalMode({ ...a.a, memberToken: 'forged', mode: 'receive' }), /expired/);
});
test('team results use team totals and support draws', () => {
  const f = fixture();f.squad('Alpha', 'Alpha');f.squad('Bravo', 'Bravo');
  const teams = Object.values(f.sessions.match.teams);teams[1].score = 3;f.engine.endTeamGame(f.sessions.match);assert.equal(f.sessions.match.winnerName, 'Bravo');
  teams[0].score = 3;f.engine.endTeamGame(f.sessions.match);assert.equal(f.sessions.match.winnerName, 'Draw');
});
test('a finished match returns its party to assembly for the next game', () => {
  const f = fixture(), a = f.squad('Alpha', 'Alpha');
  f.sessions.match.status = 'ended';
  const party = f.engine.getParty(a.a);
  assert.equal(party.party.status, 'assembling');assert.equal(party.me.sessionId, null);assert.equal(party.me.playerId, null);
  assert.equal(party.party.members.length, 2);assert.notEqual(party.invite, a.leader.invite);
});
