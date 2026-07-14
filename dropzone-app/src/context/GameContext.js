import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { connectWebSocket, fetchSession } from '../utils/firebase';

const GameContext = createContext(null);

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};

export const GameProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const wsRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    // Catch up on the current roster right away, in case we connected a
    // moment after the "player joined" broadcast already went out.
    fetchSession(sessionId).then((session) => {
      if (!session) return;
      setSessionData({ id: sessionId, ...session });
      const playersList = Object.values(session.players || {});
      setPlayers(playersList);
      if (playerId) {
        const me = playersList.find((p) => p.id === playerId);
        if (me) setPlayerData(me);
      }
      if (session.events) setRecentEvents(session.events.slice(0, 10));
    });

    const ws = connectWebSocket((msg) => {
      if (msg.sessionId !== sessionId) return;

      if (msg.session) {
        setSessionData({ id: sessionId, ...msg.session });
        const playersList = Object.values(msg.session.players || {});
        setPlayers(playersList);
        if (playerId) {
          const me = playersList.find((p) => p.id === playerId);
          if (me) setPlayerData(me);
        }
        if (msg.session.events) {
          setRecentEvents(msg.session.events.slice(0, 10));
        }
      }

      if (msg.type === 'event' && msg.event) {
        setRecentEvents((prev) => [msg.event, ...prev].slice(0, 10));
      }

      if (msg.type === 'player_joined' && msg.player) {
        setPlayers((prev) => [...prev.filter((p) => p.id !== msg.player.id), msg.player]);
      }

      if (msg.type === 'position_update' && msg.playerId === playerId) {
        setPlayerData((prev) => prev ? { ...prev, position: msg.position } : prev);
      }

      setIsConnected(true);
    });

    wsRef.current = ws;
    return () => ws.close();
  }, [sessionId, playerId]);

  const clearGameState = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setSessionId(null);
    setPlayerId(null);
    setSessionData(null);
    setPlayerData(null);
    setPlayers([]);
    setRecentEvents([]);
  }, []);

  const value = {
    sessionId,
    setSessionId,
    playerId,
    setPlayerId,
    sessionData,
    playerData,
    players,
    recentEvents,
    isConnected,
    clearGameState,
    selectedCharacter,
    setSelectedCharacter,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
