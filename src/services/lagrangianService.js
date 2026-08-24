const LAGRANGIAN_URL = import.meta.env.PROD ? '/api/lagrangian' : 'http://localhost:3001/api/lagrangian'\;

export function getTabId() {
  let tabId = sessionStorage.getItem('ct226_tab_id');
  if (!tabId) {
    tabId = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('ct226_tab_id', tabId);
  }
  return tabId;
}

class LagrangianService {
  constructor() {
    this._active = false;
    this._sessionId = null;
  }

  isActive() {
    return this._active;
  }

  async init(username, password) {
    const tabId = getTabId();

    const resp = await fetch(LAGRANGIAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'init', username, password, tabId }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }

    this._active = true;
    this._sessionId = data.sessionId || null;
    return data;
  }

  async logout() {
    const tabId = getTabId();

    try {
      await fetch(LAGRANGIAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'logout', tabId, sessionId: this._sessionId }),
      });
    } finally {
      this._active = false;
      this._sessionId = null;
      sessionStorage.removeItem('ct226_tab_id');
    }
  }
}

const lagrangianService = new LagrangianService();
export default lagrangianService;
