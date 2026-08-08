const LAGRANGIAN_URL = import.meta.env.PROD ? '/api/lagrangian' : 'http://localhost:3001/api/lagrangian';
let sessionId = null;
let cachedData = null;

const lagrangianService = {
  async init(username, password) {
    const res = await fetch(LAGRANGIAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init', username, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    sessionId = data.sessionId;
    return data;
  },

  isActive() { return !!sessionId; },
  get _sessionId() { return sessionId; },
  clearCache() { cachedData = null; sessionId = null; }
};

export default lagrangianService;
