const SERVER_URL = 'https://pacific-spirit-production-b3f8.up.railway.app';
const WS_URL = 'wss://pacific-spirit-production-b3f8.up.railway.app';

export const callFunction = async (name, data) => {
  const res = await fetch(`${SERVER_URL}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return { data: json };
};

export const fetchSessions = async () => {
  const res = await fetch(`${SERVER_URL}/sessions`);
  return res.json();
};

export const fetchSession = async (sessionId) => {
  const res = await fetch(`${SERVER_URL}/sessions/${sessionId}`);
  if (!res.ok) return null;
  return res.json();
};

export const fetchPlayers = async (sessionId) => {
  const res = await fetch(`${SERVER_URL}/sessions/${sessionId}/players`);
  return res.json();
};

export const fetchEvents = async (sessionId) => {
  const res = await fetch(`${SERVER_URL}/sessions/${sessionId}/events`);
  return res.json();
};

export function connectWebSocket(onMessage) {
  const ws = new WebSocket(WS_URL);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  ws.onclose = () => {
    setTimeout(() => connectWebSocket(onMessage), 2000);
  };
  return ws;
}
