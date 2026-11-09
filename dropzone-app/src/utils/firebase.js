const SERVER_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dropzone-server-production-f2d2.up.railway.app';
const WS_URL = SERVER_URL.replace(/^http/, 'ws');

export const callFunction = async (name, data) => {
  const res = await fetch(`${SERVER_URL}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) { const error = new Error(json.error || 'Request failed');error.status = res.status;throw error; }
  return { data: json };
};

export const fetchSession = async (sessionId) => {
  const res = await fetch(`${SERVER_URL}/sessions/${sessionId}`);
  if (!res.ok) return null;
  return res.json();
};

export function connectWebSocket(onMessage, onConnectionChange = () => {}) {
  let socket;
  let timer;
  let closed = false;
  let attempt = 0;
  function open() {
    if (closed) return;
    onConnectionChange(false);
    const current = new WebSocket(WS_URL);
    socket = current;
    current.onopen = () => {
      if (closed || current !== socket) return;
      attempt = 0;
      onConnectionChange(true);
    };
    current.onmessage = event => {
      if (closed || current !== socket) return;
      let data;
      try { data = JSON.parse(event.data); }
      catch (_) { return; }
      onMessage(data);
    };
    current.onerror = () => current.close();
    current.onclose = () => {
      if (closed || current !== socket) return;
      onConnectionChange(false);
      timer = setTimeout(open, Math.min(1000 * 2 ** Math.min(attempt++, 4), 10000));
    };
  }
  open();
  // Stable owner: close() always closes the latest socket and cancels retries.
  return { close() {
    closed = true;
    clearTimeout(timer);
    socket?.close();
  } };
}
