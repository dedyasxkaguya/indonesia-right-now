'use client';

import { useEffect, useState } from 'react';

export function useSceneFallback() {
  const [fallback, setFallback] = useState<boolean | null>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const device = navigator as Navigator & { deviceMemory?: number };
    const lowMemory = typeof device.deviceMemory === 'number' && device.deviceMemory < 4;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl');
    const hasWebGL = Boolean(context);
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    const update = () => setFallback(preference.matches || lowMemory || !hasWebGL);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  return fallback;
}

export function useScenePageActive() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const update = () => setActive(!document.hidden && document.hasFocus());
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return active;
}
