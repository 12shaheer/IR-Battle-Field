const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ─── In-memory data store ────────────────────────────────────────────────────
const sessions = {};

function generateJoinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// ─── WebSocket connections ───────────────────────────────────────────────────
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, ...data });
  clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

// ─── Helper: check and end game ─────────────────────────────────────────────
function checkAndEndGame(sessionId, force = false) {
  const session = sessions[sessionId];
  if (!session || session.status !== 'active') return;

  const alive = Object.values(session.players).filter((p) => p.status === 'alive');
  // A natural end needs a last player standing; a forced end (GM's End Game
  // button) proceeds regardless.
  if (!force && alive.length > 1) return;

  session.status = 'ended';
  session.endedAt = Date.now();

  if (alive.length === 1) {
    session.winnerId = alive[0].id;
    session.winnerName = alive[0].displayName;
  } else if (alive.length > 1) {
    // Forced end with several survivors: best performer among the living wins.
    const best = [...alive].sort(
      (a, b) => (b.kills || 0) - (a.kills || 0) || (b.damageDealt || 0) - (a.damageDealt || 0)
    )[0];
    session.winnerId = best.id;
    session.winnerName = best.displayName;
  }

  const leaderboard = Object.values(session.players)
    .sort((a, b) => {
      if (a.status === 'alive' && b.status !== 'alive') return -1;
      if (b.status === 'alive' && a.status !== 'alive') return 1;
      return (b.kills || 0) - (a.kills || 0) || (b.damageDealt || 0) - (a.damageDealt || 0);
    })
    .map((p, i) => ({ rank: i + 1, ...p }));

  session.leaderboard = leaderboard;

  addEvent(sessionId, {
    type: 'game_ended',
    winnerId: session.winnerId,
    winnerName: session.winnerName,
  });

  broadcast('session_update', { sessionId, session });
}

function addEvent(sessionId, event) {
  const session = sessions[sessionId];
  if (!session) return;
  const full = { id: generateId(), timestamp: Date.now(), ...event };
  session.events.unshift(full);
  if (session.events.length > 100) session.events.length = 100;
  broadcast('event', { sessionId, event: full });
}

// ─── Game timer + Zone shrink timer ─────────────────────────────────────────
setInterval(() => {
  Object.entries(sessions).forEach(([sessionId, session]) => {
    if (session.status !== 'active') return;

    // End game when total time expires
    const totalGameSeconds = session.shrinkInterval * 4;
    const elapsed = (Date.now() - session.startedAt) / 1000;
    if (elapsed >= totalGameSeconds) {
      session.status = 'ended';
      session.endedAt = Date.now();

      const alive = Object.values(session.players).filter(p => p.status === 'alive');
      if (alive.length >= 1) {
        const winner = alive.sort((a, b) => (b.kills || 0) - (a.kills || 0) || (b.damageDealt || 0) - (a.damageDealt || 0))[0];
        session.winnerId = winner.id;
        session.winnerName = winner.displayName;
      }

      session.leaderboard = Object.values(session.players)
        .sort((a, b) => {
          if (a.status === 'alive' && b.status !== 'alive') return -1;
          if (b.status === 'alive' && a.status !== 'alive') return 1;
          return (b.kills || 0) - (a.kills || 0) || (b.damageDealt || 0) - (a.damageDealt || 0);
        })
        .map((p, i) => ({ rank: i + 1, ...p }));

      addEvent(sessionId, { type: 'game_ended', winnerId: session.winnerId, winnerName: session.winnerName, reason: 'time_expired' });
      broadcast('session_update', { sessionId, session });
      return;
    }

    if (!session.nextShrinkAt || Date.now() < session.nextShrinkAt) return;

    const prevRadius = session.zoneRadius;
    session.zoneRadius = Math.max(session.zoneRadius * (1 - session.shrinkAmount), 5);
    session.nextShrinkAt = Date.now() + session.shrinkInterval * 1000;

    addEvent(sessionId, {
      type: 'zone_shrink',
      previousRadius: prevRadius,
      newRadius: session.zoneRadius,
    });

    // Deal zone damage to players outside the zone
    Object.values(session.players).forEach((player) => {
      if (player.status !== 'alive' || !player.position) return;

      const dx = player.position.x - session.zoneCenter.x;
      const dy = player.position.y - session.zoneCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= session.zoneRadius) return;

      player.health -= session.zoneDamage;

      if (player.health <= 0) {
        player.health = 0;
        player.status = 'eliminated';
        player.eliminatedBy = 'zone';
        addEvent(sessionId, { type: 'zone_kill', targetId: player.id, targetName: player.displayName });
        checkAndEndGame(sessionId);
      } else {
        addEvent(sessionId, { type: 'zone_damage', targetId: player.id, targetName: player.displayName, damage: session.zoneDamage });
      }
    });

    broadcast('session_update', { sessionId, session });
  });
}, 1000);

// ─── REST API ────────────────────────────────────────────────────────────────

// List all sessions
app.get('/sessions', (req, res) => {
  const list = Object.entries(sessions).map(([id, s]) => ({
    id,
    venueName: s.venueName,
    status: s.status,
    joinCode: s.joinCode,
    playerCount: Object.keys(s.players).length,
    createdAt: s.createdAt,
  }));
  list.sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

// Get single session
app.get('/sessions/:id', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ id: req.params.id, ...session });
});

// Get players for a session
app.get('/sessions/:id/players', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(Object.values(session.players));
});

// Get events for a session
app.get('/sessions/:id/events', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session.events);
});

// Create session
app.post('/createSession', (req, res) => {
  const {
    venueName = 'DropZone Arena',
    maxPlayers = 40,
    zoneCenterX = 50,
    zoneCenterY = 50,
    zoneRadius = 40,
    shrinkInterval = 300,
    shrinkAmount = 0.2,
    zoneDamage = 10,
  } = req.body;

  const id = generateId();
  const joinCode = generateJoinCode();

  sessions[id] = {
    venueName,
    status: 'lobby',
    joinCode,
    maxPlayers,
    zoneCenter: { x: zoneCenterX, y: zoneCenterY },
    zoneRadius,
    shrinkInterval,
    shrinkAmount,
    zoneDamage,
    nextShrinkAt: null,
    startedAt: null,
    endedAt: null,
    winnerId: null,
    winnerName: null,
    leaderboard: [],
    createdAt: Date.now(),
    players: {},
    events: [],
  };

  broadcast('session_created', { sessionId: id, session: sessions[id] });
  res.json({ sessionId: id, joinCode });
});

// Join session
app.post('/joinSession', (req, res) => {
  const { joinCode, displayName } = req.body;

  if (!joinCode || !displayName) {
    return res.status(400).json({ error: 'Join code and display name required' });
  }

  const entry = Object.entries(sessions).find(
    ([, s]) => s.joinCode === joinCode && s.status === 'lobby'
  );

  if (!entry) {
    return res.status(404).json({ error: 'Session not found or already started' });
  }

  const [sessionId, session] = entry;

  if (Object.keys(session.players).length >= session.maxPlayers) {
    return res.status(400).json({ error: 'Session is full' });
  }

  const playerId = generateId();
  session.players[playerId] = {
    id: playerId,
    displayName,
    health: 100,
    ammo: 30,
    maxAmmo: 30,
    kills: 0,
    damageDealt: 0,
    status: 'alive',
    position: { x: session.zoneCenter.x, y: session.zoneCenter.y },
    eliminatedBy: null,
    joinedAt: Date.now(),
  };

  broadcast('player_joined', { sessionId, player: session.players[playerId] });
  res.json({ sessionId, playerId });
});

// Start game
app.post('/startGame', (req, res) => {
  const { sessionId } = req.body;
  const session = sessions[sessionId];

  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'lobby') return res.status(400).json({ error: 'Game already started' });

  const playerCount = Object.keys(session.players).length;
  if (playerCount < 1) return res.status(400).json({ error: 'Need at least 1 player' });

  session.status = 'active';
  session.startedAt = Date.now();
  session.nextShrinkAt = Date.now() + session.shrinkInterval * 1000;

  addEvent(sessionId, { type: 'game_started', playerCount });
  broadcast('session_update', { sessionId, session });
  res.json({ success: true, playerCount });
});

// Process hit
app.post('/processHit', (req, res) => {
  const { sessionId, shooterId, targetId } = req.body;
  const session = sessions[sessionId];

  if (!session || session.status !== 'active') {
    return res.status(400).json({ error: 'Game is not active' });
  }

  const shooter = session.players[shooterId];
  const target = session.players[targetId];

  if (!shooter || shooter.status !== 'alive') return res.status(400).json({ error: 'Shooter not alive' });
  if (!target || target.status !== 'alive') return res.json({ success: false, reason: 'Target already eliminated' });
  if (shooter.ammo <= 0) return res.json({ success: false, reason: 'No ammo' });

  const damage = 25;
  shooter.ammo--;
  shooter.damageDealt += damage;
  target.health -= damage;

  const eliminated = target.health <= 0;
  if (eliminated) {
    target.health = 0;
    target.status = 'eliminated';
    target.eliminatedBy = shooterId;
    shooter.kills++;
  }

  addEvent(sessionId, {
    type: eliminated ? 'kill' : 'hit',
    actorId: shooterId,
    actorName: shooter.displayName,
    targetId,
    targetName: target.displayName,
    damage,
  });

  if (eliminated) checkAndEndGame(sessionId);

  broadcast('session_update', { sessionId, session });
  res.json({ success: true, eliminated, targetHealth: target.health, shooterAmmo: shooter.ammo });
});

// Fire weapon (miss / no target — just decrements ammo)
app.post('/fireWeapon', (req, res) => {
  const { sessionId, playerId } = req.body;
  const session = sessions[sessionId];
  if (!session || session.status !== 'active') {
    return res.status(400).json({ error: 'Game is not active' });
  }
  const player = session.players[playerId];
  if (!player || player.status !== 'alive') return res.status(400).json({ error: 'Player not alive' });
  if (player.ammo <= 0) return res.json({ success: false, reason: 'No ammo' });

  player.ammo--;
  broadcast('session_update', { sessionId, session });
  res.json({ success: true, ammo: player.ammo });
});

// Reload ammo
app.post('/reloadAmmo', (req, res) => {
  const { sessionId, playerId } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const player = session.players[playerId];
  if (!player || player.status !== 'alive') return res.status(400).json({ error: 'Player not alive' });

  player.ammo = player.maxAmmo;
  broadcast('session_update', { sessionId, session });
  res.json({ success: true, ammo: player.ammo });
});

// Update position
app.post('/updatePosition', (req, res) => {
  const { sessionId, playerId, x, y } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const player = session.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.position = { x, y };
  broadcast('position_update', { sessionId, playerId, position: player.position });
  res.json({ success: true });
});

// End game manually
app.post('/endGameManually', (req, res) => {
  const { sessionId } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'active') return res.status(400).json({ error: 'Game is not active' });

  checkAndEndGame(sessionId, true);
  res.json({ success: true });
});

// Revive player
app.post('/revivePlayer', (req, res) => {
  const { sessionId, playerId } = req.body;
  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const player = session.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.health = 100;
  player.ammo = player.maxAmmo;
  player.status = 'alive';
  player.eliminatedBy = null;

  addEvent(sessionId, { type: 'player_revived', targetId: playerId, targetName: player.displayName });
  broadcast('session_update', { sessionId, session });
  res.json({ success: true });
});

// ─── Start server ────────────────────────────────────────────────────────────
const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`DropZone server running on http://localhost:${PORT}`);
  console.log(`WebSocket available on ws://localhost:${PORT}`);
});
