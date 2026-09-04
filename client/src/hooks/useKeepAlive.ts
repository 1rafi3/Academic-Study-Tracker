import { useEffect } from 'react';
import { API_BASE } from '../api/apiClient.js';

/**
 * useKeepAlive -- Prevents Render free-tier backend spin-down.
 *
 * Render free web services sleep after 15 minutes of inactivity.
 * This hook pings GET /api/health every 10 minutes while the app is open
 * so the server stays warm and responses remain instant for users.
 *
 * - Registered once at the App root (works on login screen too).
 * - Uses the public /api/health endpoint (no JWT needed).
 * - Silently ignores network failures (e.g. user is offline).
 */
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export const useKeepAlive = (): void => {
  useEffect(() => {
    const ping = async () => {
      try {
        // e.g. https://my-backend.onrender.com/api -> .../api/health
        // or /api (local Vite proxy) -> /api/health
        const healthUrl = API_BASE + '/health';
        await fetch(healthUrl, { method: 'GET' });
        console.debug('[KeepAlive] Backend pinged successfully.');
      } catch {
        // Silently ignore -- user may be offline or server is cold-starting
      }
    };

    // Ping immediately on mount to warm up any cold start
    ping();

    // Then ping every 10 minutes
    const intervalId = setInterval(ping, PING_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []); // Empty deps: run once on mount, clean up on unmount
};
