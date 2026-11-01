'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';

export function IdleOrbitControls() {
  const [autoRotate, setAutoRotate] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const resumeAfterIdle = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => setAutoRotate(true), 3000);
  }, [clearTimer]);

  const pauseOnInteraction = useCallback(() => {
    clearTimer();
    setAutoRotate(false);
  }, [clearTimer]);

  useEffect(() => {
    resumeAfterIdle();
    return clearTimer;
  }, [clearTimer, resumeAfterIdle]);

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      enableZoom
      minDistance={5}
      maxDistance={20}
      rotateSpeed={0.65}
      zoomSpeed={0.75}
      autoRotate={autoRotate}
      autoRotateSpeed={0.65}
      onStart={pauseOnInteraction}
      onEnd={resumeAfterIdle}
    />
  );
}
