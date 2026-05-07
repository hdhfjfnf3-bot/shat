import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, PerspectiveCamera, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useChatStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export const ThreeDDiceOverlay = () => {
  const activeDiceRoll = useChatStore(s => s.activeDiceRoll);
  const clearDiceRoll = useChatStore(s => s.clearDiceRoll);

  if (!activeDiceRoll) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999999] pointer-events-none flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 5, 8]} fov={50} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 10]} intensity={2} castShadow />
          <Environment preset="city" />
          {activeDiceRoll.targets.map((target, idx) => (
            <Dice 
              key={idx} 
              target={target} 
              position={[(idx - (activeDiceRoll.targets.length - 1) / 2) * 2.5, 10, 0]} 
              delay={idx * 200}
              onComplete={idx === 0 ? () => {
                activeDiceRoll.onComplete();
                setTimeout(clearDiceRoll, 1000);
              } : undefined} 
            />
          ))}
        </Canvas>
      </motion.div>
    </AnimatePresence>
  );
};

const getTargetRotation = (num: number) => {
  switch(num) {
    case 1: return [0, 0, 0];
    case 2: return [0, -Math.PI / 2, 0];
    case 3: return [Math.PI / 2, 0, 0];
    case 4: return [-Math.PI / 2, 0, 0];
    case 5: return [0, Math.PI / 2, 0];
    case 6: return [Math.PI, 0, 0];
    default: return [0, 0, 0];
  }
};

const Dice = ({ target, position, delay, onComplete }: { target: number, position: [number, number, number], delay: number, onComplete?: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [phase, setPhase] = useState<"waiting" | "falling" | "rolling" | "landing" | "done">("waiting");
  
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("falling"), delay);
    const t2 = setTimeout(() => setPhase("rolling"), delay + 500);
    const t3 = setTimeout(() => setPhase("landing"), delay + 1500);
    const t4 = setTimeout(() => {
      setPhase("done");
      if (onComplete) onComplete();
    }, delay + 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [delay, onComplete]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    if (phase === "falling") {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0, 10 * delta);
      meshRef.current.rotation.x += 15 * delta;
      meshRef.current.rotation.y += 20 * delta;
    } else if (phase === "rolling") {
      meshRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 2;
      meshRef.current.rotation.x += 10 * delta;
      meshRef.current.rotation.z += 12 * delta;
    } else if (phase === "landing" || phase === "done") {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0, 15 * delta);
      const targetRot = getTargetRotation(target);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRot[0], 10 * delta);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot[1], 10 * delta);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRot[2], 10 * delta);
    }
  });

  return (
    <group position={position} ref={meshRef as any}>
      <mesh castShadow receiveShadow visible={phase !== "waiting"}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#f87171" roughness={0.1} metalness={0.1} />
        {/* Real dots could go here, fallback to numbers on face */}
        <meshBasicMaterial attach="material-0" color="#ef4444" />
        <meshBasicMaterial attach="material-1" color="#ef4444" />
        <meshBasicMaterial attach="material-2" color="#ef4444" />
        <meshBasicMaterial attach="material-3" color="#ef4444" />
        <meshBasicMaterial attach="material-4" color="#ef4444" />
        <meshBasicMaterial attach="material-5" color="#ef4444" />
      </mesh>
      {phase === "done" && <Sparkles count={50} scale={5} size={6} speed={2} opacity={1} color="#fcd34d" />}
    </group>
  );
};
