'use client';

import React, { useState, useEffect } from 'react';

interface CanvasWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function CanvasWrapper({ children, fallback, className = '' }: CanvasWrapperProps) {
  const [canRenderWebGL, setCanRenderWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Reduced motion check
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCanRenderWebGL(false);
      return;
    }

    // 2. Hardware concurrency / low memory check
    if (typeof navigator !== 'undefined') {
      const concurrency = navigator.hardwareConcurrency || 4;
      const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 8;
      if (concurrency < 4 || memory < 4) {
        setCanRenderWebGL(false);
        return;
      }
    }

    // 3. WebGL capability check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setCanRenderWebGL(Boolean(gl));
    } catch {
      setCanRenderWebGL(false);
    }
  }, []);

  if (canRenderWebGL === null) {
    // Initial SSR/mount skeleton
    return (
      <div className={`relative flex items-center justify-center bg-paper-100/50 ${className}`}>
        <div className="w-8 h-8 rounded-full border-2 border-brand-red/30 border-t-brand-red animate-spin" />
      </div>
    );
  }

  if (!canRenderWebGL) {
    return <div className={`relative ${className}`}>{fallback ?? null}</div>;
  }

  return <div className={`relative ${className}`}>{children}</div>;
}
