const fs = require('fs');
const path = 'f:/New folder (24)/Attached-Assets/artifacts/insta-chat/src/components/chat/Global3DExperience.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add Person component at the end
const personCode = `
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
`;

if (!code.includes('const Person = React.forwardRef')) {
  code += personCode;
}

// Replace ShatterScene
code = code.replace(/const ShatterScene = \(\) => \{[\s\S]*?\};\n/g, `const ShatterScene = () => {
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
`);

// Replace TearsScene
code = code.replace(/const TearsScene = \(\) => \{[\s\S]*?\};\n/g, `const TearsScene = () => {
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
`);

// Replace LonelinessScene
code = code.replace(/const LonelinessScene = \(\) => \{[\s\S]*?\};\n/g, `const LonelinessScene = () => {
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
`);

// Replace WarmHugScene
code = code.replace(/const WarmHugScene = \(\) => \{[\s\S]*?\};\n/g, `const WarmHugScene = () => {
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
`);

// Replace BoredScene
code = code.replace(/const BoredScene = \(\) => \{[\s\S]*?\};\n/g, `const BoredScene = () => {
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
`);

fs.writeFileSync(path, code);
console.log('Scenes updated successfully');
