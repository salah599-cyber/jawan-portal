"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import {
  INACTIVITY_LOGOUT_MS,
  LAST_ACTIVITY_STORAGE_KEY,
} from "@/lib/auth/constants";

const CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;

function readLastActivity() {
  const raw = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function recordActivity() {
  localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(Date.now()));
}

export function InactivityLogout() {
  const { isSignedIn } = useAuth();
  const { signOut, loaded } = useClerk();
  const signingOut = useRef(false);

  useEffect(() => {
    if (!loaded || !isSignedIn) return;

    recordActivity();
    signingOut.current = false;

    function logoutForInactivity() {
      if (signingOut.current) return;
      signingOut.current = true;
      localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
      void signOut({ redirectUrl: "/sign-in?reason=session_timeout" });
    }

    function checkInactivity() {
      if (Date.now() - readLastActivity() >= INACTIVITY_LOGOUT_MS) {
        logoutForInactivity();
      }
    }

    const onActivity = () => recordActivity();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

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

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [isSignedIn, loaded, signOut]);

  return null;
}
