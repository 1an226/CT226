const LAGRANGIAN_URL = import.meta.env.PROD ? '/api/lagrangian' : 'http://localhost:3001/api/lagrangian';

class LagrangianService {
  constructor() {
    this._active = false;
    this._sessionId = null; // kept only for back-compat with older server code paths
  }

  isActive() {
    return this._active;
  }

  async init(username, password) {
    const resp = await fetch(LAGRANGIAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // REQUIRED: without this, the browser won't store the httpOnly
      // Set-Cookie the server sends back, and every subsequent request
      // will look unauthenticated even though login "succeeded".
      credentials: 'include',
      body: JSON.stringify({ action: 'init', username, password }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }

    this._active = true;
    this._sessionId = data.sessionId || null; // server no longer sends this; fine if absent
    return data;
  }

  async logout() {
    try {
      await fetch(LAGRANGIAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'logout', sessionId: this._sessionId }),
      });
    } finally {
      this._active = false;
      this._sessionId = null;
    }
  }
}

const lagrangianService = new LagrangianService();
export default lagrangianService;
