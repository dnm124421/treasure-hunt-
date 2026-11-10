let serverTimeOffsetMs = 0;

export function getServerNow() {
  return Date.now() + serverTimeOffsetMs;
}

export function updateServerOffset(serverNowMs) {
  if (serverNowMs && typeof serverNowMs === 'number') {
    serverTimeOffsetMs = serverNowMs - Date.now();
  }
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (data.serverNowMs) {
      updateServerOffset(data.serverNowMs);
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(timeoutId);
    return { ok: false, status: 0, error: err.name === 'AbortError' ? 'timeout' : 'network_error', data: {} };
  }
}

export const api = {
  async getPublicConfig() {
    return request('/api/public-config');
  },

  async teamLogin(code, force = false) {
    return request('/api/team-login', {
      method: 'POST',
      body: JSON.stringify({ code, force })
    });
  },

  async getTeamState(token) {
    return request('/api/team-state', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  async submitCode(token, code, submissionId) {
    return request('/api/submit-code', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, submissionId })
    });
  },

  async getLeaderboard() {
    return request('/api/leaderboard');
  },

  async adminAction(token, action, params = {}) {
    return request('/api/admin-action', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...params })
    });
  }
};

