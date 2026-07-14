const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// ─── HELPER: Distance between two GPS points in meters ───────────────────────
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── HELPER: Generate a random 6-digit join code ─────────────────────────────
function generateJoinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── HELPER: Check if game should end, end it if so ──────────────────────────
async function checkAndEndGame(sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);

  const alivePlayers = await sessionRef.collection("players")
    .where("status", "==", "alive")
    .get();

  if (alivePlayers.size > 1) return;

  const now = admin.firestore.Timestamp.now();
  let winnerId = null;
  let winnerName = null;

  if (alivePlayers.size === 1) {
    winnerId = alivePlayers.docs[0].id;
    winnerName = alivePlayers.docs[0].data().displayName;
  }

  const allPlayers = await sessionRef.collection("players")
    .orderBy("kills", "desc")
    .get();

  const leaderboard = allPlayers.docs.map((doc, index) => ({
    rank: index + 1,
    playerId: doc.id,
    displayName: doc.data().displayName,
    kills: doc.data().kills,
    damageDealt: doc.data().damageDealt || 0,
    status: doc.data().status,
  }));

  await sessionRef.update({
    status: "ended",
    endedAt: now,
    winnerId,
    winnerName,
    leaderboard,
  });

  await sessionRef.collection("events").add({
    type: "game_ended",
    winnerId,
    winnerName,
    timestamp: now,
  });
}

// ─── HELPER: Deal zone damage to players outside the zone ────────────────────
async function dealZoneDamage(sessionId, sessionData) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const { zoneCenter, zoneRadius, zoneDamage } = sessionData;

  const alivePlayers = await sessionRef.collection("players")
    .where("status", "==", "alive")
    .get();

  if (alivePlayers.empty) return;

  const now = admin.firestore.Timestamp.now();

  const promises = alivePlayers.docs.map(async (playerDoc) => {
    const player = playerDoc.data();
    if (!player.position) return;

    const distance = getDistanceMeters(
      player.position.lat, player.position.lng,
      zoneCenter.lat, zoneCenter.lng
    );

    if (distance <= zoneRadius) return;

    const newHealth = player.health - (zoneDamage || 10);

    if (newHealth <= 0) {
      await playerDoc.ref.update({
        health: 0,
        status: "eliminated",
        eliminatedBy: "zone",
      });
      await sessionRef.collection("events").add({
        type: "zone_kill",
        targetId: playerDoc.id,
        targetName: player.displayName,
        timestamp: now,
      });
      await checkAndEndGame(sessionId);
    } else {
      await playerDoc.ref.update({ health: newHealth });
      await sessionRef.collection("events").add({
        type: "zone_damage",
        targetId: playerDoc.id,
        damage: zoneDamage || 10,
        timestamp: now,
      });
    }
  });

  await Promise.all(promises);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1 — createSession
// Called by GM to create a new game session
// ─────────────────────────────────────────────────────────────────────────────
exports.createSession = functions.https.onCall(async (data, context) => {
  const {
    venueName,
    maxPlayers = 40,
    zoneRadius = 150,
    zoneCenterLat,
    zoneCenterLng,
    shrinkInterval = 300,
    shrinkAmount = 0.2,
    zoneDamage = 10,
    gameDuration = 5400,
  } = data;

  if (!zoneCenterLat || !zoneCenterLng) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Zone center coordinates are required"
    );
  }

  const joinCode = generateJoinCode();

  const sessionRef = await db.collection("sessions").add({
    venueName: venueName || "DropZone Arena",
    status: "lobby",
    joinCode,
    maxPlayers,
    zoneRadius,
    zoneCenter: { lat: zoneCenterLat, lng: zoneCenterLng },
    shrinkInterval,
    shrinkAmount,
    zoneDamage,
    gameDuration,
    nextShrinkAt: null,
    startedAt: null,
    endedAt: null,
    winnerId: null,
    winnerName: null,
    leaderboard: [],
    createdAt: admin.firestore.Timestamp.now(),
  });

  return {
    success: true,
    sessionId: sessionRef.id,
    joinCode,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 2 — joinSession
// Called when a player enters the join code and their name
// ─────────────────────────────────────────────────────────────────────────────
exports.joinSession = functions.https.onCall(async (data, context) => {
  const { joinCode, displayName } = data;

  if (!joinCode || !displayName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Join code and display name are required"
    );
  }

  const sessionsSnap = await db.collection("sessions")
    .where("joinCode", "==", joinCode)
    .where("status", "==", "lobby")
    .get();

  if (sessionsSnap.empty) {
    throw new functions.https.HttpsError(
      "not-found",
      "Session not found or already started"
    );
  }

  const sessionDoc = sessionsSnap.docs[0];
  const session = sessionDoc.data();

  const existingPlayers = await sessionDoc.ref.collection("players").get();
  if (existingPlayers.size >= session.maxPlayers) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Session is full"
    );
  }

  const playerRef = await sessionDoc.ref.collection("players").add({
    displayName,
    health: 100,
    ammo: 30,
    maxAmmo: 30,
    kills: 0,
    damageDealt: 0,
    status: "alive",
    position: { lat: session.zoneCenter.lat, lng: session.zoneCenter.lng },
    eliminatedBy: null,
    joinedAt: admin.firestore.Timestamp.now(),
    lastSeen: admin.firestore.Timestamp.now(),
  });

  return {
    success: true,
    sessionId: sessionDoc.id,
    playerId: playerRef.id,
    sessionData: {
      venueName: session.venueName,
      maxPlayers: session.maxPlayers,
      zoneRadius: session.zoneRadius,
      zoneCenter: session.zoneCenter,
    },
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 3 — startGame
// Called by GM to start the session
// ─────────────────────────────────────────────────────────────────────────────
exports.startGame = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;

  if (!sessionId) {
    throw new functions.https.HttpsError("invalid-argument", "Session ID required");
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const session = await sessionRef.get();

  if (!session.exists) {
    throw new functions.https.HttpsError("not-found", "Session not found");
  }

  if (session.data().status !== "lobby") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Game already started"
    );
  }

  const players = await sessionRef.collection("players").get();
  if (players.size < 2) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Need at least 2 players to start"
    );
  }

  const now = admin.firestore.Timestamp.now();
  const nextShrinkAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + session.data().shrinkInterval * 1000
  );

  await sessionRef.update({
    status: "active",
    startedAt: now,
    nextShrinkAt,
  });

  await sessionRef.collection("events").add({
    type: "game_started",
    playerCount: players.size,
    timestamp: now,
  });

  return { success: true, playerCount: players.size };
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 4 — processHit
// Called when player A shoots player B
// ─────────────────────────────────────────────────────────────────────────────
exports.processHit = functions.https.onCall(async (data, context) => {
  const { sessionId, shooterId, targetId } = data;

  if (!sessionId || !shooterId || !targetId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId, shooterId and targetId are required"
    );
  }

  if (shooterId === targetId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Cannot shoot yourself"
    );
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const session = await sessionRef.get();

  if (!session.exists || session.data().status !== "active") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Game is not active"
    );
  }

  const shooterRef = sessionRef.collection("players").doc(shooterId);
  const targetRef = sessionRef.collection("players").doc(targetId);

  const [shooter, target] = await Promise.all([
    shooterRef.get(),
    targetRef.get(),
  ]);

  if (!shooter.exists || shooter.data().status !== "alive") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Shooter is not alive"
    );
  }

  if (!target.exists || target.data().status !== "alive") {
    return { success: false, reason: "Target already eliminated" };
  }

  if (shooter.data().ammo <= 0) {
    return { success: false, reason: "No ammo" };
  }

  const damage = 25;
  const newHealth = target.data().health - damage;
  const newAmmo = shooter.data().ammo - 1;
  const newDamageDealt = (shooter.data().damageDealt || 0) + damage;
  const eliminated = newHealth <= 0;
  const now = admin.firestore.Timestamp.now();

  await db.runTransaction(async (transaction) => {
    transaction.update(shooterRef, {
      ammo: newAmmo,
      damageDealt: newDamageDealt,
      ...(eliminated && { kills: shooter.data().kills + 1 }),
    });
    transaction.update(targetRef, {
      health: Math.max(0, newHealth),
      ...(eliminated && {
        status: "eliminated",
        eliminatedBy: shooterId,
      }),
    });
  });

  await sessionRef.collection("events").add({
    type: eliminated ? "kill" : "hit",
    actorId: shooterId,
    actorName: shooter.data().displayName,
    targetId,
    targetName: target.data().displayName,
    damage,
    timestamp: now,
  });

  if (eliminated) {
    await checkAndEndGame(sessionId);
  }

  return {
    success: true,
    eliminated,
    targetHealth: Math.max(0, newHealth),
    shooterAmmo: newAmmo,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 5 — reloadAmmo
// Called when player reloads their gun
// ─────────────────────────────────────────────────────────────────────────────
exports.reloadAmmo = functions.https.onCall(async (data, context) => {
  const { sessionId, playerId } = data;

  if (!sessionId || !playerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId and playerId required"
    );
  }

  const playerRef = db.collection("sessions").doc(sessionId)
    .collection("players").doc(playerId);

  const player = await playerRef.get();

  if (!player.exists || player.data().status !== "alive") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Player not available"
    );
  }

  if (player.data().ammo === player.data().maxAmmo) {
    return { success: false, reason: "Already full ammo" };
  }

  const maxAmmo = player.data().maxAmmo || 30;
  await playerRef.update({ ammo: maxAmmo });

  return { success: true, ammo: maxAmmo };
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 6 — updatePosition
// Called by app every second to update player GPS position
// ─────────────────────────────────────────────────────────────────────────────
exports.updatePosition = functions.https.onCall(async (data, context) => {
  const { sessionId, playerId, lat, lng } = data;

  if (!sessionId || !playerId || lat === undefined || lng === undefined) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId, playerId, lat and lng required"
    );
  }

  await db.collection("sessions").doc(sessionId)
    .collection("players").doc(playerId)
    .update({
      position: { lat, lng },
      lastSeen: admin.firestore.Timestamp.now(),
    });

  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 7 — shrinkZone
// Runs every minute, checks if zone should shrink, deals damage if so
// ─────────────────────────────────────────────────────────────────────────────
exports.shrinkZone = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    const activeSessions = await db.collection("sessions")
      .where("status", "==", "active")
      .where("nextShrinkAt", "<=", now)
      .get();

    if (activeSessions.empty) return null;

    const promises = activeSessions.docs.map(async (sessionDoc) => {
      const session = sessionDoc.data();
      const sessionRef = db.collection("sessions").doc(sessionDoc.id);

      const newRadius = Math.max(
        session.zoneRadius * (1 - (session.shrinkAmount || 0.2)),
        10
      );

      const nextShrinkAt = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + session.shrinkInterval * 1000
      );

      await sessionRef.update({
        zoneRadius: newRadius,
        nextShrinkAt,
      });

      await sessionRef.collection("events").add({
        type: "zone_shrink",
        previousRadius: session.zoneRadius,
        newRadius,
        timestamp: now,
      });

      await dealZoneDamage(sessionDoc.id, {
        ...session,
        zoneRadius: newRadius,
      });
    });

    await Promise.all(promises);
    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 8 — endGameManually
// Called by GM to force end the game early
// ─────────────────────────────────────────────────────────────────────────────
exports.endGameManually = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;

  if (!sessionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId required"
    );
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const session = await sessionRef.get();

  if (!session.exists) {
    throw new functions.https.HttpsError("not-found", "Session not found");
  }

  if (session.data().status !== "active") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Game is not active"
    );
  }

  await checkAndEndGame(sessionId);

  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 9 — revivePlayer
// Called by GM to revive an eliminated player (for testing or VIP events)
// ─────────────────────────────────────────────────────────────────────────────
exports.revivePlayer = functions.https.onCall(async (data, context) => {
  const { sessionId, playerId } = data;

  if (!sessionId || !playerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId and playerId required"
    );
  }

  const playerRef = db.collection("sessions").doc(sessionId)
    .collection("players").doc(playerId);

  const player = await playerRef.get();

  if (!player.exists) {
    throw new functions.https.HttpsError("not-found", "Player not found");
  }

  await playerRef.update({
    health: 100,
    ammo: player.data().maxAmmo || 30,
    status: "alive",
    eliminatedBy: null,
  });

  await db.collection("sessions").doc(sessionId)
    .collection("events").add({
      type: "player_revived",
      targetId: playerId,
      targetName: player.data().displayName,
      timestamp: admin.firestore.Timestamp.now(),
    });

  return { success: true };
});