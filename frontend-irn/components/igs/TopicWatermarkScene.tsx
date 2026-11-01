'use client';

import { Canvas } from '@react-three/fiber';
import { useSceneFallback } from './useSceneRuntime';

function AccentMaterial() {
  return <meshBasicMaterial color="#0E4A6F" transparent opacity={0.42} />;
}

function TopicSymbol({ slug }: { slug: string }) {
  if (slug === 'lingkungan') {
    return <group rotation={[0.2, 0, -0.45]}>
      <mesh scale={[0.55, 1, 0.12]}><AccentMaterial /><sphereGeometry args={[0.62, 18, 12]} /></mesh>
      <mesh position={[0, -0.55, 0]} rotation={[0, 0, 0.25]}><AccentMaterial /><cylinderGeometry args={[0.025, 0.04, 0.85, 6]} /></mesh>
    </group>;
  }

  if (slug === 'infrastruktur') {
    return <group>
      <mesh><AccentMaterial /><torusGeometry args={[0.42, 0.09, 8, 24]} /></mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return <mesh key={index} position={[Math.cos(angle) * 0.52, Math.sin(angle) * 0.52, 0]} rotation={[0, 0, angle]}><AccentMaterial /><boxGeometry args={[0.2, 0.15, 0.12]} /></mesh>;
      })}
    </group>;
  }

  if (slug === 'pangan') {
    return <group rotation={[0, 0, -0.12]}>
      <mesh><AccentMaterial /><cylinderGeometry args={[0.025, 0.04, 1.65, 6]} /></mesh>
      {[-0.35, -0.05, 0.25, 0.52].map((height, index) => <mesh key={index} position={[index % 2 ? 0.18 : -0.18, height, 0]} rotation={[0, 0, index % 2 ? -0.55 : 0.55]} scale={[0.14, 0.27, 0.12]}><AccentMaterial /><sphereGeometry args={[0.55, 12, 8]} /></mesh>)}
      <mesh position={[0, 0.82, 0]} scale={[0.25, 0.34, 0.15]}><AccentMaterial /><sphereGeometry args={[0.55, 12, 8]} /></mesh>
    </group>;
  }

  if (slug === 'ekonomi') {
    return <group>
      {[-0.42, -0.08, 0.26].map((height, index) => <mesh key={index} position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}><AccentMaterial /><cylinderGeometry args={[0.42, 0.42, 0.13, 24]} /></mesh>)}
    </group>;
  }

  if (slug === 'pendidikan') {
    return <group rotation={[0, 0, -0.15]}>
      <mesh position={[-0.24, 0, 0]}><AccentMaterial /><boxGeometry args={[0.42, 0.72, 0.12]} /></mesh>
      <mesh position={[0.24, 0, 0]}><AccentMaterial /><boxGeometry args={[0.42, 0.72, 0.12]} /></mesh>
      <mesh position={[0, 0, 0.08]}><AccentMaterial /><boxGeometry args={[0.08, 0.78, 0.08]} /></mesh>
    </group>;
  }

  if (slug === 'sosial-publik') {
    return <group>
      {[-0.48, 0, 0.48].map((x, index) => <group key={index} position={[x, index === 1 ? 0.1 : -0.08, 0]}>
        <mesh position={[0, 0.38, 0]}><AccentMaterial /><sphereGeometry args={[0.16, 12, 8]} /></mesh>
        <mesh position={[0, -0.05, 0]}><AccentMaterial /><cylinderGeometry args={[0.13, 0.2, 0.55, 8]} /></mesh>
      </group>)}
    </group>;
  }

  if (slug === 'pemerintahan') {
    return <group>
      <mesh position={[0, 0.48, 0]}><AccentMaterial /><coneGeometry args={[0.78, 0.3, 4]} /></mesh>
      {[-0.48, -0.16, 0.16, 0.48].map((x, index) => <mesh key={index} position={[x, -0.05, 0]}><AccentMaterial /><cylinderGeometry args={[0.055, 0.055, 0.75, 8]} /></mesh>)}
      <mesh position={[0, -0.48, 0]}><AccentMaterial /><boxGeometry args={[1.25, 0.12, 0.24]} /></mesh>
    </group>;
  }

  return <group rotation={[0.25, 0.2, -0.15]}>
    <mesh><AccentMaterial /><icosahedronGeometry args={[0.75, 1]} /></mesh>
    <mesh rotation={[0.5, 0.3, 0]}><AccentMaterial /><torusGeometry args={[1.05, 0.025, 6, 40]} /></mesh>
  </group>;
}

export function TopicWatermarkScene({ slug }: { slug: string }) {
  const fallback = useSceneFallback();
  if (fallback !== false) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute -right-4 -top-5 z-0 size-36 opacity-70 sm:size-52">
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 42 }}
        dpr={1}
        frameloop="demand"
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={1} />
        <TopicSymbol slug={slug} />
      </Canvas>
    </div>
  );
}
