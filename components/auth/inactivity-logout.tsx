"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import {
  INACTIVITY_LOGOUT_MS,
  LAST_ACTIVITY_COOKIE,
  LAST_ACTIVITY_STORAGE_KEY,
} from "@/lib/auth/constants";
import { isInactiveBeyondThreshold } from "@/lib/auth/inactivity";

const CHECK_INTERVAL_MS = 60 * 1000;
const WINDOW_ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "click"] as const;

function readLastActivity() {
  const raw = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function recordActivity() {
  const now = String(Date.now());
  localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, now);

  const secure = process.env.NODE_ENV === "production" ? "; secure" : "";
  document.cookie = `${LAST_ACTIVITY_COOKIE}=${now}; path=/; max-age=${Math.ceil(
    INACTIVITY_LOGOUT_MS / 1000,
  )}; samesite=lax${secure}`;
}

export { isInactiveBeyondThreshold };

export function InactivityLogout() {
  const { isSignedIn } = useAuth();
  const { signOut, loaded } = useClerk();
  const signOutRef = useRef(signOut);
  const signingOut = useRef(false);
  const wasSignedIn = useRef(false);

  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  useEffect(() => {
    if (!loaded) return;

    if (!isSignedIn) {
      wasSignedIn.current = false;
      return;
    }

    if (!wasSignedIn.current) {
      recordActivity();
      wasSignedIn.current = true;
      signingOut.current = false;
    }

    function logoutForInactivity() {
      if (signingOut.current) return;
      signingOut.current = true;
      localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
      document.cookie = `${LAST_ACTIVITY_COOKIE}=; path=/; max-age=0`;
      void signOutRef.current({ redirectUrl: "/sign-in?reason=session_timeout" });
    }

    function checkInactivity() {
      if (isInactiveBeyondThreshold(readLastActivity(), Date.now())) {
        logoutForInactivity();
      }
    }

    const onActivity = () => recordActivity();

    for (const event of WINDOW_ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    // Scroll does not bubble; capture on document to detect nested scroll containers.
    document.addEventListener("scroll", onActivity, { passive: true, capture: true });

    const intervalId = window.setInterval(checkInactivity, CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_STORAGE_KEY) {
        checkInactivity();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);
    checkInactivity();

    return () => {
      for (const event of WINDOW_ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("scroll", onActivity, { capture: true });
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [isSignedIn, loaded]);

  return null;
}
