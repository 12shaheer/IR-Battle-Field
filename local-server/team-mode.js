const { randomBytes } = require('node:crypto');
const id = () => randomBytes(18).toString('base64url');
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
const label = (value, max = 20) => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= max ? value.trim() : fail(`Enter a name with 2–${max} characters.`);
const isTeam = session => session?.mode === 'team';
const blocked = player => !!player?.medicalMode && player.medicalMode !== 'closed';

function createTeamMode({ sessions, broadcast, addEvent, now = Date.now }) {
  const parties = new Map(), offers = new Map(), heals = new Map();
  function authenticate(input) {
    const party = parties.get(input.partyId);
    const member = party?.members.find(m => m.id === input.memberId && m.token === input.memberToken);
    if (!member) fail('Party membership expired. Please join the party again.', 403);
    member.lastSeen = now();
    return { party, member };
  }
  function snapshot(party) {
    return { id: party.id, leaderId: party.leaderId, status: party.status, inviteCode: party.inviteCode,
      teamName: party.teamName || '', sessionId: party.sessionId || null,
      members: party.members.map(m => ({ id: m.id, displayName: m.name, ready: m.ready, gunLabel: m.gunLabel || '', playerId: m.playerId || null })) };
  }
  function privateState(party, member) {
    return { party: snapshot(party), me: { id: member.id, leader: party.leaderId === member.id, playerId: member.playerId || null, sessionId: party.sessionId || null },
      invite: `DZPARTY:${party.invite}`, serverNow: now() };
  }
  function newMember(name) { return { id: id(), token: id(), name: label(name), ready: false, lastSeen: now() }; }
  function credentials(party, member) { return { partyId: party.id, memberId: member.id, memberToken: member.token }; }
  function createParty(input) {
    const member = newMember(input.displayName);
    const party = { id: id(), invite: id(), inviteCode: randomBytes(4).toString('hex').toUpperCase(), leaderId: member.id, members: [member], status: 'assembling', createdAt: now() };
    parties.set(party.id, party);
    return { ...privateState(party, member), credentials: credentials(party, member) };
  }
  function joinParty(input) {
    const code = String(input.invite || '').replace(/^DZPARTY:/, '').trim();
    const party = [...parties.values()].find(p => p.invite === code || p.inviteCode === code.toUpperCase());
    if (!party || now() - party.createdAt > 7200000) fail('Party code expired or not found.', 404);
    if (party.status !== 'assembling') fail('This party has already entered a game.');
    if (party.members.length >= 10) fail('This party already has 10 members.');
    const member = newMember(input.displayName);
    if (party.members.some(m => m.name.toLowerCase() === member.name.toLowerCase())) fail('A member with this username is already in this party.');
    // Transfer only after the destination has passed validation.
    if (input.partyId) {
      const previous = authenticate(input);
      if (previous.party.id === party.id) return { ...privateState(party, previous.member), credentials: credentials(party, previous.member) };
      leaveParty(input);
    }
    party.members.push(member);
    return { ...privateState(party, member), credentials: credentials(party, member) };
  }
  function getParty(input) {
    const { party, member } = authenticate(input);
    if (party.sessionId && sessions[party.sessionId]?.status === 'ended') {
      party.sessionId = null;party.teamName = '';party.status = 'assembling';
      for (const m of party.members) m.playerId = null;
      party.invite = id();party.inviteCode = randomBytes(4).toString('hex').toUpperCase();party.createdAt = now();
    }
    return privateState(party, member);
  }
  function leaveParty(input) {
    const { party, member } = authenticate(input);
    if (party.status !== 'assembling' && sessions[party.sessionId]?.status !== 'ended') fail('Your team has entered the game. Wait for the match to finish.');
    party.members = party.members.filter(m => m.id !== member.id);
    if (!party.members.length) parties.delete(party.id);
    else if (party.leaderId === member.id) { party.leaderId = party.members[0].id;party.invite = id();party.inviteCode = randomBytes(4).toString('hex').toUpperCase(); }
    return { success: true };
  }
  function readyParty(input) {
    const { party, member } = authenticate(input);
    if (party.status !== 'assembling') fail('The party has already entered a game.');
    member.ready = input.ready === true;
    member.gunLabel = typeof input.gunId === 'string' ? input.gunId.slice(0, 40) : 'QR-only';
    return privateState(party, member);
  }
  function joinTeamMatch(input) {
    const { party, member } = authenticate(input);
    if (party.leaderId !== member.id) fail('Only the party leader can enter the game.', 403);
    if (party.sessionId) return privateState(party, member); // Retry-safe commit.
    if (party.members.length < 2 || party.members.length > 10) fail('A team needs 2–10 members.');
    if (party.members.some(m => !m.ready)) fail('Every member must finish gun setup and mark ready.');
    const entry = Object.entries(sessions).find(([, s]) => s.joinCode === input.joinCode && s.status === 'lobby');
    if (!entry) fail('Game not found or already started.', 404);
    const [sessionId, session] = entry;
    if (!isTeam(session)) fail('This game code is for Solo. Ask for a Team Deathmatch game code.');
    const name = label(input.teamName, 24);
    session.teams ||= {};
    if (Object.values(session.teams).some(t => t.name.toLowerCase() === name.toLowerCase())) fail('A team with this name is already in the game.');
    const players = Object.values(session.players);
    if (players.length + party.members.length > Math.min(40, session.maxPlayers)) fail('Not enough room for the whole team. Nobody was added.');
    if (party.members.some(m => players.some(p => p.displayName.toLowerCase() === m.name.toLowerCase()))) fail('A username in this party is already in the game.');
    const teamId = id();
    const team = { id: teamId, name, partyId: party.id, score: 0, playerIds: [] };
    for (const m of party.members) {
      const playerId = id();m.playerId = playerId;
      session.players[playerId] = { id: playerId, displayName: m.name, playerNumber: Object.keys(session.players).length + 1,
        teamId, teamName: name, health: 100, maxHealth: 100, ammo: 30, maxAmmo: 30, kills: 0, deaths: 0, respawns: 0, damageDealt: 0,
        medkits: 1, medicalMode: 'closed', healUntil: null, status: 'alive', position: { ...session.zoneCenter }, joinedAt: now() };
      team.playerIds.push(playerId);
    }
    session.teams[teamId] = team;party.teamName = name;party.sessionId = sessionId;party.status = 'queued';
    broadcast('session_update', { sessionId, session });
    return privateState(party, member);
  }
  function playerFor(input, active = true) {
    const { party, member } = authenticate(input);
    const session = sessions[party.sessionId], player = session?.players[member.playerId];
    if (!isTeam(session) || !player || input.sessionId !== party.sessionId || (input.playerId && input.playerId !== player.id)) fail('Player does not belong to this team match.', 403);
    if (active && (session.status !== 'active' || player.status !== 'alive')) fail('You must be alive in an active game.');
    return { party, member, session, player, sessionId: party.sessionId };
  }
  function authorizeCombat(input, allowedIds) {
    const { player, sessionId } = playerFor(input);
    if (sessionId !== input.sessionId || !allowedIds.includes(player.id)) fail('Invalid combat player.', 403);
  }
  function publish(sessionId) { const session = sessions[sessionId];if (session) broadcast('session_update', { sessionId, session }); }
  function eraseOffers(sessionId, playerId) {
    for (const [token, offer] of offers) if (offer.sessionId === sessionId && offer.targetId === playerId) offers.delete(token);
  }
  function finishHeal(heal, completed) {
    const session = sessions[heal.sessionId];
    const healer = session?.players[heal.healerId], target = session?.players[heal.targetId];
    if (!heals.delete(heal.id)) return;
    clearTimeout(heal.timer);
    if (completed && healer && target) {
      target.health = Math.min(target.maxHealth || 100, 100);healer.medkits--;
      addEvent(heal.sessionId, { type: 'teammate_healed', actorId: healer.id, actorName: healer.displayName, targetId: target.id, targetName: target.displayName });
    }
    for (const p of [healer, target]) if (p) { p.medicalMode = 'closed';p.healUntil = null;p.healPartner = null; }
    publish(heal.sessionId);
  }
  function memberSeen(sessionId, playerId) {
    const party = [...parties.values()].find(p => p.sessionId === sessionId && p.members.some(m => m.playerId === playerId));
    return party?.members.find(m => m.playerId === playerId)?.lastSeen || 0;
  }
  function tick() {
    for (const [token, offer] of offers) {
      const session = sessions[offer.sessionId], player = session?.players[offer.targetId];
      if (offer.expiresAt <= now() || session?.status !== 'active' || player?.status !== 'alive' || player.medicalMode !== 'receive' || now() - memberSeen(offer.sessionId, offer.targetId) > 8000) {
        offers.delete(token);
        if (player?.medicalMode === 'receive') { player.medicalMode = 'closed';publish(offer.sessionId); }
      }
    }
    for (const heal of [...heals.values()]) {
      const session = sessions[heal.sessionId], healer = session?.players[heal.healerId], target = session?.players[heal.targetId];
      const valid = session?.status === 'active' && healer?.status === 'alive' && target?.status === 'alive' && healer.medkits > 0
        && now() - memberSeen(heal.sessionId, heal.healerId) <= 3500 && now() - memberSeen(heal.sessionId, heal.targetId) <= 3500;
      if (!valid) finishHeal(heal, false);
      else if (now() >= heal.endsAt) finishHeal(heal, true);
    }
    for (const [sessionId, session] of Object.entries(sessions)) if (isTeam(session)) for (const p of Object.values(session.players)) {
      if (blocked(p) && p.medicalMode !== 'healing' && (session.status !== 'active' || p.status !== 'alive' || now() - memberSeen(sessionId, p.id) > 8000)) {
        eraseOffers(sessionId, p.id);p.medicalMode = 'closed';publish(sessionId);
      }
    }
  }
  function setMedicalMode(input) {
    tick();const { player, sessionId } = playerFor(input);
    if (player.medicalMode === 'healing') fail('Healing is locked for five seconds.');
    if (!['closed', 'menu', 'receive', 'scan'].includes(input.mode)) fail('Unknown first-aid action.');
    if (input.mode === 'scan' && player.medkits <= 0) fail('You have already used your first-aid kit.');
    if (input.mode === 'receive' && player.health >= (player.maxHealth || 100)) fail('Your health is already full.');
    eraseOffers(sessionId, player.id);player.medicalMode = input.mode;
    const result = { mode: input.mode, serverNow: now() };
    if (input.mode === 'receive') {
      const token = id(), expiresAt = now() + 45000;
      offers.set(token, { sessionId, targetId: player.id, expiresAt });
      result.qr = `DZHEAL:${token}`;result.expiresAt = expiresAt;
    }
    publish(sessionId);return result;
  }
  function startHeal(input) {
    tick();const { player: healer, session, sessionId } = playerFor(input);
    if (healer.medicalMode !== 'scan' || healer.medkits <= 0) fail('Open the heal-teammate scanner first.');
    const token = typeof input.qr === 'string' && input.qr.startsWith('DZHEAL:') ? input.qr.slice(7) : '';
    const offer = offers.get(token), target = offer && session.players[offer.targetId];
    if (!offer || offer.sessionId !== sessionId || !target || offer.expiresAt <= now()) fail('Healing QR expired or already used.');
    if (target.id === healer.id) fail('You cannot heal yourself.');
    if (!target.teamId || healer.teamId !== target.teamId) fail('You can only heal your own teammates.');
    if (target.status !== 'alive' || target.medicalMode !== 'receive') fail('This teammate is no longer receiving healing.');
    if (target.health >= (target.maxHealth || 100)) fail('This teammate already has full health.');
    offers.delete(token);
    const heal = { id: id(), sessionId, healerId: healer.id, targetId: target.id, endsAt: now() + 5000 };
    heals.set(heal.id, heal);
    heal.timer = setTimeout(() => tick(), 5000);heal.timer.unref?.();
    for (const p of [healer, target]) { p.medicalMode = 'healing';p.healUntil = heal.endsAt;p.healPartner = p.id === healer.id ? target.displayName : healer.displayName; }
    publish(sessionId);return { endsAt: heal.endsAt, serverNow: now() };
  }
  function heartbeat(input) { const { player } = playerFor(input, false);tick();return { medicalMode: player.medicalMode, healUntil: player.healUntil, serverNow: now() }; }
  function validateStart(session) {
    const teams = Object.values(session.teams || {});
    if (teams.length < 2) fail('Team Deathmatch needs at least two teams.');
    if (Object.keys(session.players).length > 40) fail('A game can have at most 40 players.');
    if (teams.some(team => team.playerIds.length < 2 || team.playerIds.length > 10)) fail('Each team needs 2–10 members.');
  }
  function endTeamGame(session) {
    const ranked = Object.values(session.teams || {}).sort((a, b) => b.score - a.score);
    const tied = ranked.length > 1 && ranked[0].score === ranked[1].score;
    session.teamLeaderboard = ranked;session.winnerTeamId = tied ? null : ranked[0]?.id;
    session.winnerName = tied ? 'Draw' : ranked[0]?.name;session.winnerId = null;
    session.leaderboard = Object.values(session.players).sort((a, b) => b.kills - a.kills || b.damageDealt - a.damageDealt).map((p, i) => ({ rank: i + 1, ...p }));
  }
  function mount(app) {
    for (const [name, action] of Object.entries({ createParty, joinParty, getParty, leaveParty, readyParty, joinTeamMatch, setMedicalMode, startHeal, teamHeartbeat: heartbeat })) {
      app.post('/' + name, (req, res) => { try { res.json(action(req.body)); } catch (e) { res.status(e.status || 400).json({ error: e.message }); } });
    }
  }
  return { mount, tick, validateStart, endTeamGame, authorizeCombat, createParty, joinParty, getParty, leaveParty, readyParty, joinTeamMatch, setMedicalMode, startHeal, heartbeat, snapshot };
}
module.exports = { createTeamMode, isTeam, blocked };
