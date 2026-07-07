import { useEffect, useRef, useState, useCallback } from 'react';
import { tokenStore } from '../api/client.js';

// Live alert stream over WebSocket (SRS §9.2).
export function useLiveAlerts(onAlert) {
  useEffect(() => {
    if (!tokenStore.access) return undefined;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws?token=${tokenStore.access}`;
    let ws;
    let closed = false;
    try {
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.kind === 'alert') onAlert?.(msg.alert);
        } catch { /* ignore */ }
      };
    } catch { /* ws unavailable */ }
    return () => {
      closed = true;
      if (ws && ws.readyState === ws.OPEN) ws.close();
      else if (ws) ws.onopen = () => closed && ws.close();
    };
  }, [onAlert]);
}

// Browser geolocation (FR-08, FR-12 graceful denial).
// Watches the position so the fix refines from the first coarse (wifi/cell)
// estimate down to true GPS accuracy — `settled` flips true once the fix is
// within GOOD_ACCURACY_M or we've waited long enough for the best we'll get.
const GOOD_ACCURACY_M = 25;
const SETTLE_TIMEOUT_MS = 20000;

export function useGeolocation() {
  const [state, setState] = useState({ status: 'idle', coords: null, accuracy: null, settled: false, error: null });
  const askedRef = useRef(false);
  const watchRef = useRef(null);

  const stopWatch = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: 'unsupported', coords: null, accuracy: null, settled: true, error: 'Geolocation not supported' });
      return;
    }
    setState((s) => ({ ...s, status: 'pending', settled: false }));
    stopWatch();
    const started = Date.now();
    let best = Infinity;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy != null && accuracy >= best) return; // ignore worse fixes
        best = accuracy ?? best;
        const settled = (accuracy != null && accuracy <= GOOD_ACCURACY_M) || Date.now() - started > SETTLE_TIMEOUT_MS;
        if (settled) stopWatch();
        setState({ status: 'granted', coords: { lat: latitude, lng: longitude }, accuracy: accuracy ?? null, settled, error: null });
      },
      (err) => {
        stopWatch();
        setState({ status: 'denied', coords: null, accuracy: null, settled: true, error: err.message });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    // Safety net: mark the best fix so far as settled once the window closes.
    setTimeout(() => {
      if (watchRef.current != null) {
        stopWatch();
        setState((s) => (s.status === 'granted' ? { ...s, settled: true } : s));
      }
    }, SETTLE_TIMEOUT_MS);
  }, [stopWatch]);

  useEffect(() => stopWatch, [stopWatch]);

  // Auto-request once on mount (FR-08 — ask when app opens).
  useEffect(() => {
    if (!askedRef.current) {
      askedRef.current = true;
      request();
    }
  }, [request]);

  return { ...state, request };
}
