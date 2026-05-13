"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Text, Float } from "@react-three/drei";
import { AgentCharacter } from "./agent-character";
import { useVeilStore } from "@/store/use-veil-store";
import type { AgentStatus, AIPhase } from "@/types/veil";

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#1a1a2e" />
    </mesh>
  );
}

function GridFloor() {
  return (
    <gridHelper args={[20, 20, "#2a2a4e", "#1a1a3e"]} position={[0, 0, 0]} />
  );
}

function OfficeDesk({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[2, 0.05, 1]} />
        <meshStandardMaterial color="#3d2c1e" />
      </mesh>
      <mesh position={[-0.9, 0.2, 0.4]} castShadow>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color="#2d1c0e" />
      </mesh>
      <mesh position={[-0.9, 0.2, -0.4]} castShadow>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color="#2d1c0e" />
      </mesh>
      <mesh position={[0.9, 0.2, 0.4]} castShadow>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color="#2d1c0e" />
      </mesh>
      <mesh position={[0.9, 0.2, -0.4]} castShadow>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color="#2d1c0e" />
      </mesh>
    </group>
  );
}

function OfficeChair({ position = [0, 0, 0], rotation = 0 }: { position?: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
        <meshStandardMaterial color="#4a3f35" />
      </mesh>
      <mesh position={[0, 0.55, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#4a3f35" />
      </mesh>
      <mesh position={[-0.2, 0.15, 0.25]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.3]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
      <mesh position={[0.2, 0.15, 0.25]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.3]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
    </group>
  );
}

function DecorPlant({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.3]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4]} />
        <meshStandardMaterial color="#228b22" />
      </mesh>
      <mesh position={[0.1, 0.7, 0]} rotation={[0.3, 0, 0.2]} castShadow>
        <coneGeometry args={[0.15, 0.3, 8]} />
        <meshStandardMaterial color="#32cd32" />
      </mesh>
      <mesh position={[-0.1, 0.65, 0]} rotation={[-0.2, 0, -0.1]} castShadow>
        <coneGeometry args={[0.12, 0.25, 8]} />
        <meshStandardMaterial color="#3cb371" />
      </mesh>
    </group>
  );
}

function WallSection({ position = [0, 0, 0], rotation = 0 }: { position?: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.5, -4.5]} castShadow>
        <boxGeometry args={[9, 3, 0.1]} />
        <meshStandardMaterial color="#2a2a4a" />
      </mesh>
      <mesh position={[0, 2.8, -4.55]}>
        <boxGeometry args={[9, 0.3, 0.1]} />
        <meshStandardMaterial color="#3a3a5a" />
      </mesh>
    </group>
  );
}

function FloatingTitle() {
  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <Text
        position={[0, 3, -3]}
        fontSize={0.5}
        color="#6366f1"
        anchorX="center"
        anchorY="middle"
      >
        Voice Companion
      </Text>
    </Float>
  );
}

const AGENT_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"] as const;
const AGENT_POSITIONS: [number, number, number][] = [
  [-2.1, 0, 0.3],
  [-0.7, 0, 0.3],
  [0.7, 0, 0.3],
  [2.1, 0, 0.3],
];

function toVisualState(
  status: AgentStatus,
  agentId: string,
  phase: AIPhase
): "idle" | "listening" | "speaking" | "working" | "waiting" {
  if (agentId === "intent" && phase === "listening") return "listening";
  if (agentId === "voice" && phase === "speaking") return "speaking";
  if (agentId === "orchestrator" && phase === "orchestrating") return "working";
  if (agentId === "memory" && phase === "thinking") return "waiting";
  switch (status) {
    case "running": return "working";
    case "planning": return "waiting";
    case "connecting": return "waiting";
    case "error": return "waiting";
    default: return "idle";
  }
}

function AgentsController() {
  const agents = useVeilStore((s) => s.agents);
  const phase = useVeilStore((s) => s.phase);

  return (
    <group>
      {agents.slice(0, 4).map((agent, i) => (
        <AgentCharacter
          key={agent.id}
          position={AGENT_POSITIONS[i]}
          state={toVisualState(agent.status, agent.id, phase)}
          name={agent.name}
          color={AGENT_COLORS[i]}
        />
      ))}
    </group>
  );
}

export function OfficeScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 6], fov: 50 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <color attach="background" args={["#0a0a1a"]} />
      <fog attach="fog" args={["#0a0a1a", 5, 15]} />
      
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-3, 3, 0]} intensity={0.5} color="#6366f1" />
      <pointLight position={[3, 3, 0]} intensity={0.3} color="#ec4899" />

      <Floor />
      <GridFloor />
      <WallSection position={[0, 0, 0]} />
      
      <OfficeDesk position={[-1.5, 0, 0]} />
      <OfficeChair position={[-1.5, 0, 0.8]} rotation={Math.PI} />
      
      <OfficeDesk position={[1.5, 0, 0]} />
      <OfficeChair position={[1.5, 0, 0.8]} rotation={Math.PI} />
      
      <DecorPlant position={[-3, 0, -2]} />
      <DecorPlant position={[3, 0, -2]} />
      
      <AgentsController />
      
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.5}
        scale={10}
        blur={2}
        far={4}
      />
      
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={12}
      />
      
      <Environment preset="city" />
      <FloatingTitle />
    </Canvas>
  );
}