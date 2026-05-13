"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import * as THREE from "three";

interface AgentCharacterProps {
  position?: [number, number, number];
  state?: "idle" | "listening" | "speaking" | "working" | "waiting";
  name?: string;
  color?: string;
}

export function AgentCharacter({ position = [0, 0, 0], state = "idle", name = "Agent", color = "#8b5cf6" }: AgentCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const floatRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current || !headRef.current) return;
    
    floatRef.current += delta;
    const time = floatRef.current;
    
    switch (state) {
      case "listening":
        groupRef.current.position.y = position[1] + 0.05 + Math.sin(time * 8) * 0.02;
        headRef.current.rotation.x = Math.sin(time * 2) * 0.1;
        leftArmRef.current?.rotation.set(Math.sin(time * 3) * 0.3, 0, 0);
        rightArmRef.current?.rotation.set(-Math.sin(time * 3) * 0.3, 0, 0);
        break;
        
      case "speaking":
        groupRef.current.position.y = position[1] + 0.1 + Math.sin(time * 6) * 0.05;
        headRef.current.rotation.x = Math.sin(time * 4) * 0.15;
        leftArmRef.current?.rotation.set(0.5 + Math.sin(time * 5) * 0.2, 0, 0.3);
        rightArmRef.current?.rotation.set(0.5 - Math.sin(time * 5) * 0.2, 0, -0.3);
        break;
        
      case "working":
        groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.02;
        headRef.current.rotation.x = -0.2;
        leftArmRef.current?.rotation.set(Math.PI / 2 + Math.sin(time * 10) * 0.1, 0, 0);
        rightArmRef.current?.rotation.set(Math.PI / 2 - Math.sin(time * 10) * 0.1, 0, 0);
        break;
        
      case "waiting":
        groupRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.03;
        headRef.current.rotation.x = 0.2;
        leftArmRef.current?.rotation.set(Math.sin(time * 2) * 0.2, 0, 0);
        rightArmRef.current?.rotation.set(-Math.sin(time * 2) * 0.2, 0, 0);
        break;
        
      default:
        groupRef.current.position.y = position[1] + Math.sin(time * 1.2) * 0.03;
        headRef.current.rotation.x = 0;
        leftArmRef.current?.rotation.set(0, 0, 0);
        rightArmRef.current?.rotation.set(0, 0, 0);
    }
    
    if (bodyRef.current) {
      bodyRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
    }
  });

  const agentColor = useMemo(() => new THREE.Color(color), [color]);
  const darkerColor = useMemo(() => new THREE.Color(color).multiplyScalar(0.6), [color]);

  return (
    <group ref={groupRef} position={position}>
      <Float speed={state === "listening" ? 4 : 2} rotationIntensity={0.1} floatIntensity={0.2}>
        <group>
          <mesh ref={bodyRef} position={[0, 0.6, 0]} castShadow>
            <capsuleGeometry args={[0.25, 0.4, 8, 16]} />
            <meshStandardMaterial color={agentColor} metalness={0.3} roughness={0.7} />
          </mesh>
          
          <mesh ref={headRef} position={[0, 1.15, 0]} castShadow>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#f5f5f5" metalness={0.1} roughness={0.8} />
          </mesh>
          
          <mesh position={[0, 1.15, 0.18]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[0, 1.15, 0.17]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={agentColor} emissive={agentColor} emissiveIntensity={0.5} />
          </mesh>
          
          <mesh position={[-0.08, 1.2, 0.15]} rotation={[0, 0, -0.2]}>
            <capsuleGeometry args={[0.03, 0.1, 4, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[0.08, 1.2, 0.15]} rotation={[0, 0, 0.2]}>
            <capsuleGeometry args={[0.03, 0.1, 4, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          
          <mesh ref={leftArmRef} position={[-0.35, 0.7, 0]} rotation={[0, 0, 0.3]} castShadow>
            <capsuleGeometry args={[0.08, 0.25, 4, 8]} />
            <meshStandardMaterial color={darkerColor} />
          </mesh>
          
          <mesh ref={rightArmRef} position={[0.35, 0.7, 0]} rotation={[0, 0, -0.3]} castShadow>
            <capsuleGeometry args={[0.08, 0.25, 4, 8]} />
            <meshStandardMaterial color={darkerColor} />
          </mesh>
          
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 0.15, 16]} />
            <meshStandardMaterial color="#2d2d3d" />
          </mesh>
          
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.1, 16]} />
            <meshStandardMaterial color="#1a1a2a" />
          </mesh>
        </group>
      </Float>
      
      {name && (
        <Text
          position={[0, 1.8, 0]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {name}
        </Text>
      )}
      
      <Text
        position={[0, 1.55, 0]}
        fontSize={0.1}
        color={state === "listening" ? "#4ade80" : state === "speaking" ? "#60a5fa" : "#94a3b8"}
        anchorX="center"
        anchorY="middle"
      >
        {state === "listening" ? "🎤" : state === "speaking" ? "💬" : state === "working" ? "⚡" : state === "waiting" ? "⏳" : "✓"}
      </Text>
    </group>
  );
}