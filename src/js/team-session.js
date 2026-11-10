const SESSION_KEY = 'ch_session';
const TEAM_NAME_KEY = 'ch_team_name';

export const teamSession = {
  save(token, teamName) {
    try {
      localStorage.setItem(SESSION_KEY, token);
      if (teamName) localStorage.setItem(TEAM_NAME_KEY, teamName);
    } catch {}
  },

  getToken() {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },

  getTeamName() {
    try {
      return localStorage.getItem(TEAM_NAME_KEY) || 'Your Team';
    } catch {
      return 'Your Team';
    }
  },

  clear() {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TEAM_NAME_KEY);
    } catch {}
  },

  isLoggedIn() {
    return !!this.getToken();
  }
};

