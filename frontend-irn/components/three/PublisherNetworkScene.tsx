'use client';

import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { NewsData } from '@/lib/types/api';
import { computePublisherDominance } from '@/lib/transformers';
import { CanvasWrapper } from './CanvasWrapper';
import { LazyCanvas } from './LazyCanvas';

interface NodeData {
  id: string;
  name: string;
  count: number;
  position: [number, number, number];
  radius: number;
  categories: Set<string>;
}

interface EdgeData {
  start: [number, number, number];
  end: [number, number, number];
  sharedCount: number;
}

function NetworkMesh({
  nodes,
  edges,
  hoveredNode,
  setHoveredNode,
}: {
  nodes: NodeData[];
  edges: EdgeData[];
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Edges */}
      {edges.map((edge, i) => {
        const isHighlighted =
          hoveredNode &&
          nodes.some(
            (n) =>
              n.id === hoveredNode &&
              ((n.position[0] === edge.start[0] && n.position[1] === edge.start[1]) ||
                (n.position[0] === edge.end[0] && n.position[1] === edge.end[1]))
          );

        return (
          <Line
            key={i}
            points={[edge.start, edge.end]}
            color={isHighlighted ? '#D32F2F' : '#9E9E9E'}
            lineWidth={isHighlighted ? 2.5 : 1}
            transparent
            opacity={isHighlighted ? 0.8 : 0.3}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const isHovered = hoveredNode === node.id;
        return (
          <group key={node.id} position={node.position}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredNode(node.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoveredNode(null);
              }}
            >
              <sphereGeometry args={[node.radius, 16, 16]} />
              <meshStandardMaterial
                color={isHovered ? '#D32F2F' : '#7B1FA2'}
                emissive={isHovered ? '#D32F2F' : '#2A0845'}
                emissiveIntensity={isHovered ? 0.6 : 0.2}
                roughness={0.3}
              />
            </mesh>

            <Html
              distanceFactor={8}
              position={[0, node.radius + 0.25, 0]}
              center
              className="pointer-events-none select-none whitespace-nowrap"
            >
              <div
                className={`rounded px-1.5 py-0.5 font-mono text-[9px] transition-all ${
                  isHovered
                    ? 'bg-ink-900 text-paper-50 shadow-md font-bold'
                    : 'bg-paper-100/80 text-ink-700 border border-paper-300'
                }`}
              >
                {node.name} ({node.count})
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function PublisherNetworkStaticFallback({ data }: { data: NewsData }) {
  const dominance = computePublisherDominance(data.items);
  const publishers = dominance.publishers.slice(0, 8);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-paper-50 border border-paper-300 rounded-card">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {publishers.map((p) => (
          <div key={p.publisher} className="p-3 bg-paper-100/60 border border-paper-200 rounded text-center">
            <span className="block text-xs font-semibold text-ink-900 truncate">{p.publisher}</span>
            <span className="text-[10px] font-mono text-ink-500">{p.count} artikel</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs font-mono text-ink-400">Jaringan Publisher 2D Fallback</p>
    </div>
  );
}

export function PublisherNetworkScene({ data }: { data: NewsData }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const dominance = computePublisherDominance(data.items);
    const topPubs = dominance.publishers.slice(0, 8);
    if (!topPubs.length) return { nodes: [], edges: [] };

    const maxCount = Math.max(...topPubs.map((p) => p.count), 1);

    // Map publisher to categories
    const pubCategories = new Map<string, Set<string>>();
    for (const item of data.items) {
      if (!pubCategories.has(item.publisher)) {
        pubCategories.set(item.publisher, new Set());
      }
      for (const cat of item.categories) {
        pubCategories.get(item.publisher)?.add(cat);
      }
    }

    const radiusCircle = 2.2;
    const computedNodes: NodeData[] = topPubs.map((p, idx) => {
      const angle = (idx / topPubs.length) * 2 * Math.PI;
      const x = Math.cos(angle) * radiusCircle;
      const y = Math.sin(angle) * radiusCircle * 0.7; // slight ellipse
      const z = Math.sin(angle * 2) * 0.4;
      const r = 0.18 + (p.count / maxCount) * 0.22;
      return {
        id: p.publisher,
        name: p.publisher,
        count: p.count,
        position: [x, y, z],
        radius: r,
        categories: pubCategories.get(p.publisher) ?? new Set(),
      };
    });

    // Compute edges based on shared categories
    const computedEdges: EdgeData[] = [];
    for (let i = 0; i < computedNodes.length; i++) {
      for (let j = i + 1; j < computedNodes.length; j++) {
        const setA = computedNodes[i].categories;
        const setB = computedNodes[j].categories;
        let shared = 0;
        setA.forEach((cat) => {
          if (setB.has(cat)) shared++;
        });
        if (shared > 0) {
          computedEdges.push({
            start: computedNodes[i].position,
            end: computedNodes[j].position,
            sharedCount: shared,
          });
        }
      }
    }

    return { nodes: computedNodes, edges: computedEdges };
  }, [data]);

  return (
    <LazyCanvas fallback={<PublisherNetworkStaticFallback data={data} />}>
      <CanvasWrapper
        fallback={<PublisherNetworkStaticFallback data={data} />}
        className="w-full min-h-[360px] md:min-h-[440px]"
      >
        <div className="relative w-full h-[360px] md:h-[440px] rounded-card border border-paper-300 bg-paper-50/50 overflow-hidden">
          <div className="absolute top-3 left-4 z-10 pointer-events-none">
            <span className="text-[10px] font-mono tracking-wider text-ink-500 uppercase">
              Grafik Aliran 3D • {nodes.length} Publisher Utama
            </span>
          </div>
          <div className="absolute bottom-3 right-4 z-10 pointer-events-none text-right">
            <span className="text-[10px] font-mono text-ink-400">
              Drag rotasi • Hover node untuk relasi kategori
            </span>
          </div>

          <Canvas
            camera={{ position: [0, 0, 5.5], fov: 45 }}
            dpr={[1, 1.75]}
            gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
          >
            <ambientLight intensity={0.9} />
            <pointLight position={[5, 5, 5]} intensity={0.8} />
            <NetworkMesh
              nodes={nodes}
              edges={edges}
              hoveredNode={hoveredNode}
              setHoveredNode={setHoveredNode}
            />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              dampingFactor={0.1}
              rotateSpeed={0.4}
            />
          </Canvas>
        </div>
      </CanvasWrapper>
    </LazyCanvas>
  );
}

export default PublisherNetworkScene;
