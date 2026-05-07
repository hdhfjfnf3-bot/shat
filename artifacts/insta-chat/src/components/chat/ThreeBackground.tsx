import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export const ThreeBackground = () => {
  return (
    <div className="fixed inset-0 -z-50 pointer-events-none opacity-40">
      <Canvas camera={{ position: [0, 0, 1] }} dpr={[1, 1.5]}>
        <Scene />
      </Canvas>
    </div>
  );
};

const Scene = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle parallax rotation over time
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Deep space stars */}
      <Stars radius={50} depth={50} count={3000} factor={3} saturation={0} fade speed={1} />
      {/* Subtle floating dust/sparkles */}
      <Sparkles count={150} scale={10} size={2} speed={0.2} opacity={0.3} color="#c4b5fd" />
      <Sparkles count={50} scale={10} size={4} speed={0.4} opacity={0.1} color="#38bdf8" />
    </group>
  );
};
