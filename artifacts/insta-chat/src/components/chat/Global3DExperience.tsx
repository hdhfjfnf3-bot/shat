import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, MeshDistortMaterial, Sphere, Float, Sparkles, Stars, MeshTransmissionMaterial, MeshWobbleMaterial, Decal, useTexture } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { useChatStore } from "@/lib/store";

export const Global3DExperience = () => {
  const active3D = useChatStore(s => s.active3DExperience);
  const close = () => useChatStore.getState().setActive3DExperience(null);

  if (!active3D) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center"
      style={{ touchAction: "none" }}
    >
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 2]}>
          <SceneManager type={active3D.type} />
        </Canvas>
      </div>
      
      <button 
        onClick={close}
        className="absolute top-12 left-6 z-50 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white text-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-90 transition-transform"
      >
        ✕
      </button>

      {/* Dynamic Overlay Text based on Emotion */}
      <div className="absolute bottom-16 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }}
          className="text-white font-black text-3xl tracking-widest text-center px-4"
          style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}
        >
          {getTitle(active3D.type)}
        </motion.div>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className="text-white/60 text-sm mt-3 font-bold">
          حرك الشاشة والمس للتفاعل
        </motion.div>
      </div>
    </motion.div>
  );
};

const getTitle = (type: string) => {
  switch(type) {
    case "universe_share": return "اتصال روحي عميق";
    case "heartbeat_sync": return "نبض واحد";
    case "coffee_share": return "دفء القهوة والمشاعر";
    case "staring_contest": return "في عينيك";
    case "shatter":
    case "anxiety": return "فوضى وانكسار";
    case "hug":
    case "love_letter": return "احتواء دافئ";
    case "loneliness":
    case "missing_you": return "وحدة وحنين";
    case "cry_together": return "دموع وراحة";
    case "weather": return "أجواء شتوية";
    case "bored": return "فراغ تام";
    case "walk_away": return "نهاية الطريق";
    case "kiss": return "قبلة";
    case "hold_hand": return "إيد في إيد";
    case "forgive_me": return "آسف جداً";
    case "knock":
    case "nudge":
    case "poke": return "تنبيه";
    case "slap": return "فوق!";
    case "confetti":
    case "cheers": return "احتفال";
    default: return "تجربة شعورية";
  }
};

const SceneManager = ({ type }: { type: string }) => {
  switch (type) {
    case "universe_share": return <UniverseScene />;
    case "heartbeat_sync": return <HeartbeatScene />;
    case "coffee_share": return <WarmthScene />;
    case "staring_contest": return <EyeScene />;
    case "shatter":
    case "anxiety": return <ShatterScene />;
    case "hug":
    case "love_letter": return <WarmHugScene />;
    case "loneliness":
    case "missing_you": return <LonelinessScene />;
    case "cry_together": return <TearsScene />;
    case "weather": return <RainScene />;
    case "bored": return <BoredScene />;
    case "walk_away": return <WalkAwayScene />;
    case "kiss":
    case "hold_hand": return <WarmHugScene />;
    case "forgive_me": return <RainScene />;
    case "knock":
    case "nudge":
    case "poke":
    case "slap": return <ShatterScene />;
    case "confetti":
    case "cheers": return <PartyScene />;
    default: return <WarmthScene />;
  }
};

// 1. Universe Share
const UniverseScene = () => {
  return (
    <>
      <color attach="background" args={['#050510']} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 20, 10]} intensity={2} color="#8b5cf6" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Float speed={1.5} rotationIntensity={2} floatIntensity={3}>
        <UniverseCore />
      </Float>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
      <Environment preset="city" />
    </>
  );
};

const UniverseCore = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [active, setActive] = useState(false);
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.setScalar(active ? scale * 1.3 : scale);
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    }
  });
  return (
    <group onPointerDown={() => setActive(true)} onPointerUp={() => setActive(false)}>
      <Sphere args={[1.5, 64, 64]}>
        <MeshDistortMaterial color={active ? "#ff2a5f" : "#6d28d9"} emissive={active ? "#e11d48" : "#4c1d95"} emissiveIntensity={3} distort={0.5} speed={4} />
      </Sphere>
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        <MeshTransmissionMaterial color="#ffffff" clearcoat={1} roughness={0} transmission={0.9} thickness={0.5} distortion={0.3} />
      </Sphere>
      <Sparkles count={200} scale={6} size={4} speed={0.8} opacity={0.6} color={active ? "#f43f5e" : "#c4b5fd"} />
    </group>
  );
};

// 2. Heartbeat Scene
const HeartbeatScene = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    let t: number;
    if (pressed) {
      t = window.setInterval(() => {
        if (window.navigator?.vibrate) window.navigator.vibrate([60, 40, 80]);
      }, 700);
    }
    return () => clearInterval(t);
  }, [pressed]);

  useFrame((state) => {
    if (meshRef.current) {
      // Simulate heartbeat curve: sharp beat, minor beat, pause
      const t = (state.clock.elapsedTime * 2) % (Math.PI * 2);
      let beat = 1;
      if (t < 0.5) beat = 1 + Math.sin(t * Math.PI) * 0.3;
      else if (t > 1 && t < 1.5) beat = 1 + Math.sin((t - 1) * Math.PI) * 0.15;
      
      meshRef.current.scale.setScalar(pressed ? beat * 1.3 : beat);
    }
  });

  return (
    <>
      <color attach="background" args={['#1a0005']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={pressed ? 5 : 2} color="#ff0040" />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#ff8888" />
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere ref={meshRef} args={[2, 64, 64]} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)}>
          <MeshWobbleMaterial color="#e11d48" emissive="#881337" emissiveIntensity={pressed ? 1.5 : 0.5} factor={pressed ? 1 : 0.2} speed={pressed ? 5 : 1} roughness={0.2} metalness={0.8} />
        </Sphere>
      </Float>
      <Sparkles count={100} scale={8} size={pressed ? 10 : 4} speed={pressed ? 2 : 0.5} color="#fda4af" />
      <OrbitControls enableZoom={false} enablePan={false} />
    </>
  );
};

// 3. Warmth / Coffee Scene
const WarmthScene = () => {
  const [heat, setHeat] = useState(1);
  return (
    <>
      <color attach="background" args={['#1e0a00']} />
      <ambientLight intensity={0.5} color="#ffa500" />
      <pointLight position={[0, -2, 0]} intensity={heat * 2} color="#ff4500" />
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
        <Sphere args={[2, 64, 64]} onPointerDown={() => setHeat(3)} onPointerUp={() => setHeat(1)}>
          <MeshTransmissionMaterial color="#d97706" clearcoat={1} transmission={0.9} thickness={2} roughness={0.2} />
        </Sphere>
      </Float>
      {/* Steam Particles */}
      <Sparkles count={300 * heat} scale={[4, 10, 4]} position={[0, 2, 0]} size={6} speed={heat} opacity={0.3} color="#fde68a" />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={heat} />
    </>
  );
};

// 4. Staring / Eye Scene
const EyeScene = () => {
  const eyeRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (eyeRef.current) {
      // Make the eye smoothly track the mouse/pointer
      const targetX = (state.mouse.x * Math.PI) / 4;
      const targetY = (state.mouse.y * Math.PI) / 4;
      eyeRef.current.rotation.y = THREE.MathUtils.lerp(eyeRef.current.rotation.y, targetX, 0.1);
      eyeRef.current.rotation.x = THREE.MathUtils.lerp(eyeRef.current.rotation.x, -targetY, 0.1);
    }
  });

  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[0, 0, 5]} intensity={2} color="#a5b4fc" />
      <group ref={eyeRef}>
        {/* Sclera */}
        <Sphere args={[2, 64, 64]}>
          <meshStandardMaterial color="#ffffff" roughness={0.1} />
        </Sphere>
        {/* Iris */}
        <Sphere args={[2.01, 32, 32]} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#4f46e5" transparent opacity={0.9} roughness={0.2} />
        </Sphere>
        {/* Pupil */}
        <Sphere args={[2.02, 32, 32]} position={[0, 0, 0.1]} scale={[0.4, 0.4, 0.4]}>
          <meshBasicMaterial color="#000000" />
        </Sphere>
      </group>
      <OrbitControls enableZoom={false} enableRotate={false} />
    </>
  );
};

// 5. Shatter / Anxiety Scene
const ShatterScene = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      // Erratic intense shaking for anxiety
      groupRef.current.position.x = (Math.random() - 0.5) * 0.1;
      groupRef.current.position.y = (Math.random() - 0.5) * 0.1;
      groupRef.current.position.z = (Math.random() - 0.5) * 0.1;
    }
  });
  return (
    <>
      <color attach="background" args={['#050000']} />
      <ambientLight intensity={0.5} color="#ff0000" />
      <pointLight position={[0, 2, 0]} intensity={5} color="#ff0000" distance={10} />
      <directionalLight position={[0, 5, 5]} intensity={2} color="#ff4444" />
      
      <group ref={groupRef}>
        {/* Anxious person huddled on the floor */}
        <Person 
          color="#000" 
          position={[0, -1.5, 0]}
          bodyRot={[0.6, 0, 0]} 
          headRot={[0.8, 0, 0]}
          leftArmRot={[0.5, 0, 2.5]} 
          rightArmRot={[0.5, 0, -2.5]}
          leftLegRot={[-1.5, -0.2, 0]}
          rightLegRot={[-1.5, 0.2, 0]}
          roughness={0.9}
        />
      </group>
      
      {/* Chaotic fragments / dark thoughts */}
      <Sparkles count={300} scale={10} size={5} speed={10} color="#ff0000" opacity={0.8} />
      <Sparkles count={100} scale={5} size={15} speed={15} color="#000000" opacity={1} />
      
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={5} />
    </>
  );
};

// 6. Hug / Romantic Scene
const WarmHugScene = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle swaying together
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <>
      <color attach="background" args={['#2a0a18']} />
      <ambientLight intensity={0.5} color="#ffb3c6" />
      <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ff8fab" />
      <pointLight position={[-5, -5, -5]} intensity={1} color="#fb6f92" />
      
      <group ref={groupRef} position={[0, -1.5, 0]}>
        {/* Person 1 */}
        <Person 
          color="#8a3c4b" 
          position={[0, 0, 0.3]}
          headRot={[0, 0.5, 0]}
          leftArmRot={[0.5, 0, 1.5]}
          rightArmRot={[0.5, 0, -1.5]}
        />
        {/* Person 2 */}
        <Person 
          color="#ffc2d1" 
          position={[0, 0, -0.3]}
          bodyRot={[0, Math.PI, 0]}
          headRot={[0, 0.5, 0]}
          leftArmRot={[0.5, 0, 1.5]}
          rightArmRot={[0.5, 0, -1.5]}
        />
      </group>
      
      {/* Surrounding warm floating particles */}
      <Sparkles count={200} scale={10} size={6} speed={0.2} opacity={0.6} color="#ffe5ec" />
      <Sparkles count={100} scale={8} size={10} speed={0.4} opacity={0.8} color="#fb6f92" />
      
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
      <Environment preset="sunset" />
    </>
  );
};

// 7. Rain / Weather Scene
const RainScene = () => {
  return (
    <>
      <color attach="background" args={['#0f172a']} />
      <ambientLight intensity={0.2} color="#94a3b8" />
      <directionalLight position={[0, 10, 5]} intensity={1} color="#e2e8f0" />
      <Sparkles count={2000} scale={[20, 20, 20]} size={8} speed={10} opacity={0.6} color="#bae6fd" />
      {/* Fog effect */}
      <fog attach="fog" args={['#0f172a', 5, 20]} />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} />
    </>
  );
};

// 8. Bored / Empty Void Scene
const BoredScene = () => {
  return (
    <>
      <color attach="background" args={['#171717']} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[0, 5, 0]} intensity={0.5} color="#525252" />
      
      {/* Person lying flat on the ground */}
      <Person 
        color="#262626" 
        position={[0, -1.8, 0]}
        bodyRot={[-Math.PI / 2, 0, 0]}
        headRot={[-0.2, 0, 0]}
        leftArmRot={[0, 0, 0.2]}
        rightArmRot={[0, 0, -0.2]}
        leftLegRot={[0, 0, 0.1]}
        rightLegRot={[0, 0, -0.1]}
      />
      
      <Sparkles count={50} scale={15} size={2} speed={0.1} opacity={0.2} color="#a3a3a3" />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2.5} />
    </>
  );
};

// 9. Walk Away Scene
const WalkAwayScene = () => {
  const personRef = useRef<THREE.Group>(null);
  const doorRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const [closed, setClosed] = useState(false);

  useFrame((state, delta) => {
    if (closed) return;
    
    if (personRef.current) {
      // Walk towards the door
      personRef.current.position.z -= delta * 6;
      // Walking bobbing effect
      personRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.5;

      if (personRef.current.position.z < -28) {
        // Person reached the door
        setClosed(true);
      }
    }
  });

  useEffect(() => {
    if (closed) {
      // Close the door quickly
      let t = 0;
      const interval = setInterval(() => {
        t += 0.1;
        if (doorRef.current) {
          doorRef.current.rotation.y = THREE.MathUtils.lerp(0, -Math.PI / 2, t);
        }
        if (lightRef.current) {
          lightRef.current.intensity = THREE.MathUtils.lerp(5, 0, t);
        }
        if (t >= 1) {
          clearInterval(interval);
          // Turn everything black, then close experience
          setTimeout(() => {
            useChatStore.getState().setActive3DExperience(null);
          }, 1500);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [closed]);

  return (
    <>
      <color attach="background" args={['#020205']} />
      <ambientLight intensity={closed ? 0 : 0.1} />
      <spotLight position={[0, 5, 0]} intensity={closed ? 0 : 2} angle={0.8} penumbra={1} color="#64748b" />
      <pointLight ref={lightRef} position={[0, 0, -28]} intensity={5} color="#e2e8f0" />
      
      {/* Path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -15]}>
        <planeGeometry args={[4, 60]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* The Door Frame */}
      <mesh position={[0, 2, -30]}>
        <boxGeometry args={[5, 8, 0.5]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* The Door (hinged on the left) */}
      <group position={[-2, 2, -30]} ref={doorRef as any}>
        <mesh position={[2, 0, 0]}>
          <boxGeometry args={[4, 7.8, 0.2]} />
          <meshStandardMaterial color="#ffffff" emissive={closed ? "#000000" : "#ffffff"} emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* The Person (Walking) */}
      <group ref={personRef} position={[0, 0, 5]}>
        {/* Body */}
        <mesh position={[0, 1.5, 0]}>
          <capsuleGeometry args={[0.5, 1.5, 4, 8]} />
          <meshStandardMaterial color="#000000" roughness={1} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#000000" roughness={1} />
        </mesh>
      </group>

      {/* Rain / dramatic particles */}
      <Sparkles count={300} scale={[10, 10, 40]} position={[0, 0, -10]} size={2} speed={0.5} opacity={closed ? 0 : 0.3} color="#94a3b8" />
      
      <fog attach="fog" args={['#020205', 5, 40]} />
      {!closed && <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2.2} />}
    </>
  );
};

// 9b. Loneliness Scene
const LonelinessScene = () => {
  const lightRef = useRef<THREE.SpotLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      // Flickering street light effect
      const flicker = Math.random() > 0.95 ? 0.2 : 1;
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 4 * flicker, 0.1);
    }
  });

  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.02} />
      
      {/* A single flickering street lamp */}
      <spotLight ref={lightRef} position={[0, 8, 0]} angle={0.3} penumbra={0.5} intensity={4} color="#fef08a" castShadow />
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" roughness={0.9} />
      </mesh>

      {/* A single isolated person standing alone under the light, looking down */}
      <Person 
        color="#000" 
        position={[0, -1.5, 0]}
        headRot={[0.6, 0, 0]}
        leftArmRot={[0, 0, 0.1]}
        rightArmRot={[0, 0, -0.1]}
        leftLegRot={[0, 0, 0.05]}
        rightLegRot={[0, 0, -0.05]}
      />

      {/* Faint rain/dust strictly under the light */}
      <Sparkles count={50} scale={[2, 8, 2]} position={[0, 2, 0]} size={2} speed={0.2} opacity={0.5} color="#fef08a" />

      <fog attach="fog" args={['#000000', 5, 20]} />
      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 3} autoRotate autoRotateSpeed={0.5} />
    </>
  );
};

// 10. Party / Confetti Scene
const PartyScene = () => {
  return (
    <>
      <color attach="background" args={['#1e0a2d']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 10, 0]} intensity={2} color="#a855f7" />
      <pointLight position={[5, 0, 5]} intensity={2} color="#f43f5e" />
      <pointLight position={[-5, 0, -5]} intensity={2} color="#3b82f6" />
      
      {/* Colorful massive sparkles */}
      <Sparkles count={500} scale={20} size={15} speed={2} opacity={0.8} color="#fcd34d" />
      <Sparkles count={500} scale={20} size={15} speed={2.5} opacity={0.8} color="#f43f5e" />
      <Sparkles count={500} scale={20} size={15} speed={1.5} opacity={0.8} color="#3b82f6" />
      <Sparkles count={500} scale={20} size={15} speed={3} opacity={0.8} color="#10b981" />
      
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={5} />
    </>
  );
};

// 10. Tears / Crying Scene
const TearsScene = () => {
  const personRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (personRef.current) {
      // Subtle crying heave
      personRef.current.position.y = -1.5 + Math.sin(state.clock.elapsedTime * 3) * 0.03;
      personRef.current.rotation.x = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.02;
    }
  });

  return (
    <>
      <color attach="background" args={['#030e1f']} />
      <ambientLight intensity={0.2} color="#60a5fa" />
      <spotLight position={[0, 10, 0]} intensity={3} color="#93c5fd" angle={0.5} penumbra={1} castShadow />
      
      {/* Sad person sitting and crying */}
      <Person 
        ref={personRef}
        color="#0a1a2f" 
        position={[0, -1.5, 0]}
        bodyRot={[0.6, 0, 0]} 
        headRot={[1.2, 0, 0]}
        leftArmRot={[0.2, 0, 0.5]} 
        rightArmRot={[0.2, 0, -0.5]}
        leftLegRot={[-1.5, -0.3, 0]}
        rightLegRot={[-1.5, 0.3, 0]}
        roughness={0.5}
      />

      {/* Ripple/Puddle on the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <MeshDistortMaterial color="#020617" distort={0.1} speed={2} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Raining tears */}
      <Sparkles count={300} scale={[10, 10, 10]} position={[0, 2, 0]} size={3} speed={5} opacity={0.5} color="#60a5fa" />
      
      <fog attach="fog" args={['#030e1f', 5, 15]} />
      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 3} autoRotate autoRotateSpeed={0.5} />
    </>
  );
};

// --- Reusable Person Component ---
const Person = React.forwardRef(({ 
  color = "#222", 
  headRot = [0,0,0], 
  bodyRot = [0,0,0], 
  leftArmRot = [0,0,0], 
  rightArmRot = [0,0,0], 
  leftLegRot = [0,0,0], 
  rightLegRot = [0,0,0],
  position = [0,0,0],
  scale = 1,
  wireframe = false,
  metalness = 0.5,
  roughness = 0.5,
  transparent = false,
  opacity = 1
}: any, ref: any) => {
  const mat = <meshStandardMaterial color={color} wireframe={wireframe} metalness={metalness} roughness={roughness} transparent={transparent} opacity={opacity} />;
  return (
    <group position={position} scale={scale} rotation={bodyRot} ref={ref}>
      {/* Head */}
      <mesh position={[0, 1.8, 0]} rotation={headRot} castShadow>
        <sphereGeometry args={[0.3, 32, 32]} />
        {mat}
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.35, 1, 16, 16]} />
        {mat}
      </mesh>
      {/* Left Arm */}
      <group position={[0.45, 1.3, 0]} rotation={leftArmRot}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.8, 16, 16]} />
          {mat}
        </mesh>
      </group>
      {/* Right Arm */}
      <group position={[-0.45, 1.3, 0]} rotation={rightArmRot}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.8, 16, 16]} />
          {mat}
        </mesh>
      </group>
      {/* Left Leg */}
      <group position={[0.2, 0.3, 0]} rotation={leftLegRot}>
        <mesh position={[0, -0.5, 0]} castShadow>
          <capsuleGeometry args={[0.15, 1, 16, 16]} />
          {mat}
        </mesh>
      </group>
      {/* Right Leg */}
      <group position={[-0.2, 0.3, 0]} rotation={rightLegRot}>
        <mesh position={[0, -0.5, 0]} castShadow>
          <capsuleGeometry args={[0.15, 1, 16, 16]} />
          {mat}
        </mesh>
      </group>
    </group>
  );
});
