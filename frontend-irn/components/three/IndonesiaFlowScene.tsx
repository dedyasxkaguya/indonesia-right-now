'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useScroll, useTransform, type MotionValue } from 'framer-motion';
import * as THREE from 'three';
import pointsData from '@/lib/three/indonesia-points.json';
import { CanvasWrapper } from './CanvasWrapper';
import { LazyCanvas } from './LazyCanvas';
import { IndonesiaFlowStatic } from './IndonesiaFlowStatic';

interface Hotspot {
  name: string;
  position: [number, number, number];
}

const HOTSPOTS: Hotspot[] = [
  { name: 'Jakarta (HQ)', position: [-1.4, -0.9, 0.05] },
  { name: 'Surabaya', position: [-0.4, -0.98, 0.05] },
  { name: 'Medan', position: [-3.1, 0.8, 0.05] },
  { name: 'Makassar', position: [0.65, -0.3, 0.05] },
  { name: 'Denpasar', position: [0.3, -1.05, 0.05] },
  { name: 'Jayapura', position: [3.8, -0.4, 0.05] },
];

function ParticleCloud({ itemsKept = 24, scrollProgress }: { itemsKept?: number; scrollProgress: MotionValue<number> }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const raw = pointsData as [number, number, number][];
    const pos = new Float32Array(raw.length * 3);
    const col = new Float32Array(raw.length * 3);

    const baseRed = new THREE.Color('#D32F2F');
    const accentPurple = new THREE.Color('#7B1FA2');
    const paperDot = new THREE.Color('#8D8D8D');

    for (let i = 0; i < raw.length; i++) {
      const p = raw[i];
      pos[i * 3] = p[0];
      pos[i * 3 + 1] = p[1];
      pos[i * 3 + 2] = p[2];

      // Color variation: mostly red/ink with occasional purple accents
      const rand = Math.random();
      let c = paperDot;
      if (rand < 0.35) {
        c = baseRed;
      } else if (rand < 0.45) {
        c = accentPurple;
      }

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      // Rotation speed slightly proportional to items kept (Sabang-to-Merauke drift)
      const speed = 0.02 + Math.min(itemsKept, 50) * 0.0003 + scrollProgress.get() * 0.03;
      pointsRef.current.rotation.z += delta * speed * 0.2;
      pointsRef.current.rotation.y += delta * speed * 0.4;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.038}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

function HotspotsMesh({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const scale = 1 + Math.sin(t * 3) * (0.25 + scrollProgress.get() * 0.2);
      groupRef.current.children.forEach((child) => {
        child.scale.set(scale, scale, scale);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {HOTSPOTS.map((h, i) => (
        <mesh key={i} position={h.position}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#D32F2F" />
        </mesh>
      ))}
    </group>
  );
}

function FlowOrnaments({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * (0.012 + scrollProgress.get() * 0.02);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -0.12]}>
      {[
        { position: [-2.7, 0.9, 0] as [number, number, number], radius: 0.24 },
        { position: [1.1, -0.15, 0] as [number, number, number], radius: 0.18 },
        { position: [3.2, -0.25, 0] as [number, number, number], radius: 0.3 },
      ].map((ring, index) => (
        <mesh key={index} position={ring.position} rotation={[0, 0, index * 0.45]}>
          <torusGeometry args={[ring.radius, 0.012, 6, 32]} />
          <meshBasicMaterial color="#D32F2F" transparent opacity={0.28} />
        </mesh>
      ))}
    </group>
  );
}

function ScrollCamera({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  useFrame(({ camera }, delta) => {
    const targetZ = 5 + scrollProgress.get() * 0.5;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 2, delta);
  });
  return null;
}

function SceneParallax({ pointer, children }: { pointer: { current: { x: number; y: number } }; children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, pointer.current.x * 0.04, 4, delta);
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, pointer.current.y * 0.04, 4, delta);
  });

  return <group ref={groupRef}>{children}</group>;
}

interface IndonesiaFlowSceneProps {
  className?: string;
  itemsKept?: number;
}

export function IndonesiaFlowScene({ className = '', itemsKept = 24 }: IndonesiaFlowSceneProps) {
  const [active, setActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const scrollProgress = useTransform(scrollYProgress, [0, 0.5], [0, 1], { clamp: true });

  useEffect(() => {
    const handleVisibility = () => {
      setActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePointer = (event: PointerEvent) => {
      if (motionPreference.matches) return;
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const resetPointer = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    window.addEventListener('pointermove', updatePointer, { passive: true });
    motionPreference.addEventListener('change', resetPointer);
    return () => {
      window.removeEventListener('pointermove', updatePointer);
      motionPreference.removeEventListener('change', resetPointer);
    };
  }, []);

  if (reducedMotion) {
    return <IndonesiaFlowStatic className={className} itemsKept={itemsKept} />;
  }

  return (
    <LazyCanvas
      className={className}
      fallback={<IndonesiaFlowStatic itemsKept={itemsKept} />}
    >
      <CanvasWrapper
        fallback={<IndonesiaFlowStatic itemsKept={itemsKept} />}
        className="w-full h-full min-h-[300px] md:min-h-[420px]"
      >
        <div className="relative w-full h-full min-h-[300px] md:min-h-[420px] rounded-card border border-paper-300 bg-paper-50/40 overflow-hidden">
          {/* Subtle overlay labels */}
          <div className="absolute top-3 left-4 z-10 pointer-events-none">
            <span className="text-[10px] font-mono tracking-wider text-ink-500 uppercase">
              Arus Geografis / {itemsKept} items
            </span>
          </div>
          <div className="absolute bottom-3 right-4 z-10 pointer-events-none text-right">
            <span className="text-[10px] font-mono text-ink-400">
              Drag untuk rotasi • Sabang-Merauke Flow
            </span>
          </div>

          {active && (
            <Canvas
              camera={{ position: [0, 0, 5], fov: 45 }}
              dpr={[1, 1.75]}
              gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
            >
              <ambientLight intensity={0.8} />
              <SceneParallax pointer={pointer}>
                <ScrollCamera scrollProgress={scrollProgress} />
                <ParticleCloud itemsKept={itemsKept} scrollProgress={scrollProgress} />
                <HotspotsMesh scrollProgress={scrollProgress} />
                <FlowOrnaments scrollProgress={scrollProgress} />
              </SceneParallax>
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate={false}
                dampingFactor={0.1}
                rotateSpeed={0.5}
              />
            </Canvas>
          )}
        </div>
      </CanvasWrapper>
    </LazyCanvas>
  );
}

export default IndonesiaFlowScene;
