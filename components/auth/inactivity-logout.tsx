"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import {
  JWT_LIFETIME_MS,
  LAST_ACTIVITY_COOKIE,
  LAST_ACTIVITY_STORAGE_KEY,
  SESSION_BOUNDARY_COOKIE,
  SESSION_BOUNDARY_STORAGE_KEY,
  SESSION_MAX_LIFETIME_MS,
} from "@/lib/auth/constants";
import {
  encodeSessionBoundary,
  getSessionExpiryReason,
  parseSessionBoundary,
  resolveSessionStart,
  type SessionExpiryReason,
} from "@/lib/auth/session";

const CHECK_INTERVAL_MS = 60 * 1000;
const WINDOW_ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "click"] as const;

function readLastActivity() {
  const raw = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function readSessionStart(sessionId: string) {
  const raw = localStorage.getItem(SESSION_BOUNDARY_STORAGE_KEY);
  const parsed = parseSessionBoundary(raw);
  return resolveSessionStart(sessionId, raw, Date.now());
}

function persistSessionBoundary(sessionId: string, startedAtMs: number) {
  const value = encodeSessionBoundary(sessionId, startedAtMs);
  localStorage.setItem(SESSION_BOUNDARY_STORAGE_KEY, value);

  const secure = process.env.NODE_ENV === "production" ? "; secure" : "";
  document.cookie = `${SESSION_BOUNDARY_COOKIE}=${value}; path=/; max-age=${Math.ceil(
    SESSION_MAX_LIFETIME_MS / 1000,
  )}; samesite=lax${secure}`;
}

function recordActivity(sessionId: string, startedAtMs: number) {
  const now = String(Date.now());
  localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, now);
  persistSessionBoundary(sessionId, startedAtMs);

  const secure = process.env.NODE_ENV === "production" ? "; secure" : "";
  document.cookie = `${LAST_ACTIVITY_COOKIE}=${now}; path=/; max-age=${Math.ceil(
    JWT_LIFETIME_MS / 1000,
  )}; samesite=lax${secure}`;
}

export { getSessionExpiryReason, isInactiveBeyondThreshold } from "@/lib/auth/session";

export function InactivityLogout() {
  const { isSignedIn, sessionId, getToken } = useAuth();
  const { signOut, loaded } = useClerk();
  const signOutRef = useRef(signOut);
  const getTokenRef = useRef(getToken);
  const signingOut = useRef(false);
  const wasSignedIn = useRef(false);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!loaded) return;

    if (!isSignedIn || !sessionId) {
      wasSignedIn.current = false;
      sessionStartRef.current = null;
      return;
    }

    const activeSessionId = sessionId;

    if (!wasSignedIn.current) {
      const startedAt = readSessionStart(activeSessionId);
      sessionStartRef.current = startedAt;
      recordActivity(activeSessionId, startedAt);
      wasSignedIn.current = true;
      signingOut.current = false;
    }

    function logoutForSessionExpiry(reason: SessionExpiryReason) {
      if (signingOut.current) return;
      signingOut.current = true;
      localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
      localStorage.removeItem(SESSION_BOUNDARY_STORAGE_KEY);
      document.cookie = `${LAST_ACTIVITY_COOKIE}=; path=/; max-age=0`;
      document.cookie = `${SESSION_BOUNDARY_COOKIE}=; path=/; max-age=0`;
      void signOutRef.current({ redirectUrl: `/sign-in?reason=${reason}` });
    }

    function checkSession() {
      const startedAt = sessionStartRef.current ?? readSessionStart(activeSessionId);
      sessionStartRef.current = startedAt;

      const expiryReason = getSessionExpiryReason(readLastActivity(), startedAt, Date.now());
      if (expiryReason) {
        logoutForSessionExpiry(expiryReason);
      }
    }

    async function refreshAccessToken() {
      try {
        await getTokenRef.current({ skipCache: true });
      } catch {
        // Clerk will handle invalid sessions on the next request.
      }
    }

    function onActivity() {
      const startedAt = sessionStartRef.current ?? readSessionStart(activeSessionId);
      sessionStartRef.current = startedAt;

      const expiryReason = getSessionExpiryReason(readLastActivity(), startedAt, Date.now());
      if (expiryReason) {
        logoutForSessionExpiry(expiryReason);
        return;
      }

      recordActivity(activeSessionId, startedAt);
      void refreshAccessToken();
    }

    for (const event of WINDOW_ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    // Scroll does not bubble; capture on document to detect nested scroll containers.
    document.addEventListener("scroll", onActivity, { passive: true, capture: true });

    const intervalId = window.setInterval(checkSession, CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === LAST_ACTIVITY_STORAGE_KEY ||
        event.key === SESSION_BOUNDARY_STORAGE_KEY
      ) {
        checkSession();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);
    checkSession();

    return () => {
      for (const event of WINDOW_ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("scroll", onActivity, { capture: true });
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [isSignedIn, loaded, sessionId]);

  return null;
}
