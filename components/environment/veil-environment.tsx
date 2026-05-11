"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useVeilStore } from "@/store/use-veil-store";

function EnergyOrb() {
  const mesh = useRef<THREE.Mesh>(null);
  const phase = useVeilStore((state) => state.phase);
  const audioLevel = useVeilStore((state) => state.audioLevel);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.8) * 0.035 + audioLevel * 0.14;
    mesh.current.scale.setScalar(phase === "speaking" ? pulse * 1.08 : pulse);
    mesh.current.rotation.y += 0.004;
    mesh.current.rotation.x = Math.sin(clock.elapsedTime * 0.45) * 0.13;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.16} floatIntensity={0.42}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.55, 8]} />
        <meshStandardMaterial
          color={phase === "listening" ? "#fbbf24" : phase === "speaking" ? "#fde68a" : "#c4b5fd"}
          roughness={0.18}
          metalness={0.22}
          emissive={phase === "orchestrating" ? "#f59e0b" : "#111827"}
          emissiveIntensity={phase === "idle" ? 0.34 : 0.82}
          transparent
          opacity={0.88}
        />
      </mesh>
      <mesh scale={2.1}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.05} blending={THREE.AdditiveBlending} />
      </mesh>
    </Float>
  );
}

function NeuralField() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const data = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i += 1) {
      data[i * 3] = (Math.random() - 0.5) * 18;
      data[i * 3 + 1] = (Math.random() - 0.5) * 10;
      data[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return data;
  }, []);

  useFrame(({ clock }) => {
    if (!points.current) return;
    points.current.rotation.y = clock.elapsedTime * 0.018;
    points.current.rotation.x = Math.sin(clock.elapsedTime * 0.18) * 0.035;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} color="#fdba74" transparent opacity={0.42} depthWrite={false} />
    </points>
  );
}

export function VeilEnvironment() {
  return (
    <div className="absolute inset-0">
      <Canvas gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 7], fov: 42 }} dpr={[1, 1.6]}>
        <ambientLight intensity={0.62} />
        <pointLight position={[2, 3, 4]} intensity={5.5} color="#f59e0b" />
        <pointLight position={[-4, -2, 3]} intensity={1.4} color="#60a5fa" />
        <EnergyOrb />
        <NeuralField />
        <Sparkles count={48} scale={[8, 4, 4]} size={1.6} speed={0.12} opacity={0.18} color="#f59e0b" />
      </Canvas>
    </div>
  );
}
