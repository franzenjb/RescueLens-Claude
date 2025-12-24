import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  useTexture,
  Sky,
  Cloud,
  ContactShadows,
  Plane,
  Box,
  Cylinder,
  Cone,
  Sphere
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SSAO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import {
  Maximize2, Minimize2, RotateCcw, Sun, Moon,
  AlertTriangle, Info, ZoomIn, ZoomOut, Move3d, Eye
} from 'lucide-react';

// ============================================
// REALISTIC 3D HOUSE COMPONENT
// ============================================
interface HouseProps {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  roofColor: string;
  damage: 'destroyed' | 'major' | 'minor' | 'intact';
  roofStyle?: 'gable' | 'hip';
}

function House({ position, width, depth, height, wallColor, roofColor, damage, roofStyle = 'gable' }: HouseProps) {
  const [x, y, z] = position;

  // Damage affects the house appearance
  const damageOffset = damage === 'destroyed' ? 0.3 : damage === 'major' ? 0.1 : 0;
  const showRoof = damage !== 'destroyed';
  const showWalls = damage !== 'destroyed';
  const roofPitch = height * 0.4;

  // Create roof geometry for gable roof
  const roofGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const halfWidth = width / 2 + 0.3; // overhang
    const halfDepth = depth / 2 + 0.3;

    shape.moveTo(-halfWidth, 0);
    shape.lineTo(0, roofPitch);
    shape.lineTo(halfWidth, 0);
    shape.lineTo(-halfWidth, 0);

    const extrudeSettings = {
      steps: 1,
      depth: depth + 0.6,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [width, depth, roofPitch]);

  return (
    <group position={[x, y, z]}>
      {/* Foundation */}
      <Box args={[width + 0.4, 0.3, depth + 0.4]} position={[0, 0.15, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#666666" roughness={0.9} />
      </Box>

      {showWalls && (
        <>
          {/* Main walls */}
          <Box args={[width, height, depth]} position={[0, height / 2 + 0.3, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={wallColor} roughness={0.7} />
          </Box>

          {/* Front door */}
          <Box args={[1.2, 2.2, 0.1]} position={[0, 1.4, -depth / 2 - 0.05]} castShadow>
            <meshStandardMaterial color="#4a3728" roughness={0.6} />
          </Box>

          {/* Windows - front */}
          <Box args={[1.5, 1.2, 0.15]} position={[-width / 3, height / 2 + 0.8, -depth / 2 - 0.05]} castShadow>
            <meshStandardMaterial color="#87CEEB" roughness={0.1} metalness={0.3} />
          </Box>
          <Box args={[1.5, 1.2, 0.15]} position={[width / 3, height / 2 + 0.8, -depth / 2 - 0.05]} castShadow>
            <meshStandardMaterial color="#87CEEB" roughness={0.1} metalness={0.3} />
          </Box>

          {/* Window frames */}
          <Box args={[1.6, 0.1, 0.2]} position={[-width / 3, height / 2 + 1.4, -depth / 2 - 0.08]}>
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </Box>
          <Box args={[1.6, 0.1, 0.2]} position={[width / 3, height / 2 + 1.4, -depth / 2 - 0.08]}>
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </Box>

          {/* Chimney */}
          <Box args={[1, 2, 1]} position={[width / 3, height + roofPitch / 2 + 0.5, depth / 4]} castShadow>
            <meshStandardMaterial color="#8B4513" roughness={0.85} />
          </Box>
        </>
      )}

      {showRoof && (
        <group position={[0, height + 0.3, -depth / 2 - 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={roofGeometry} castShadow receiveShadow>
            <meshStandardMaterial color={roofColor} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Blue tarp for damaged houses */}
      {(damage === 'major' || damage === 'minor') && (
        <Box
          args={[width * 0.4, 0.05, depth * 0.3]}
          position={[width * 0.1, height + roofPitch * 0.5 + 0.4, 0]}
          rotation={[0.3, 0, 0]}
        >
          <meshStandardMaterial color="#1E90FF" roughness={0.4} />
        </Box>
      )}

      {/* Destroyed house - debris pile */}
      {damage === 'destroyed' && (
        <group>
          {/* Debris chunks */}
          {Array.from({ length: 25 }).map((_, i) => (
            <Box
              key={i}
              args={[
                0.5 + Math.random() * 1.5,
                0.3 + Math.random() * 0.8,
                0.5 + Math.random() * 1.5
              ]}
              position={[
                (Math.random() - 0.5) * width * 0.9,
                0.3 + Math.random() * 1.5,
                (Math.random() - 0.5) * depth * 0.9
              ]}
              rotation={[
                Math.random() * 0.5,
                Math.random() * Math.PI,
                Math.random() * 0.5
              ]}
              castShadow
            >
              <meshStandardMaterial
                color={Math.random() > 0.5 ? wallColor : roofColor}
                roughness={0.9}
              />
            </Box>
          ))}
          {/* Partial standing wall */}
          <Box args={[width * 0.3, height * 0.4, 0.2]} position={[-width / 3, height * 0.2 + 0.3, -depth / 2]} castShadow>
            <meshStandardMaterial color={wallColor} roughness={0.8} />
          </Box>
        </group>
      )}
    </group>
  );
}

// ============================================
// REALISTIC TREE COMPONENT
// ============================================
interface TreeProps {
  position: [number, number, number];
  height: number;
  spread: number;
}

function Tree({ position, height, spread }: TreeProps) {
  const [x, y, z] = position;

  return (
    <group position={[x, y, z]}>
      {/* Trunk */}
      <Cylinder args={[0.3, 0.5, height * 0.4, 8]} position={[0, height * 0.2, 0]} castShadow>
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </Cylinder>

      {/* Foliage layers */}
      <Sphere args={[spread * 0.8, 8, 8]} position={[0, height * 0.5, 0]} castShadow>
        <meshStandardMaterial color="#2E7D32" roughness={0.9} />
      </Sphere>
      <Sphere args={[spread * 0.6, 8, 8]} position={[0, height * 0.7, 0]} castShadow>
        <meshStandardMaterial color="#388E3C" roughness={0.9} />
      </Sphere>
      <Sphere args={[spread * 0.4, 8, 8]} position={[0, height * 0.85, 0]} castShadow>
        <meshStandardMaterial color="#43A047" roughness={0.9} />
      </Sphere>
    </group>
  );
}

// ============================================
// STREET LAMP COMPONENT
// ============================================
function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Cylinder args={[0.1, 0.15, 6, 8]} position={[0, 3, 0]} castShadow>
        <meshStandardMaterial color="#333333" roughness={0.3} metalness={0.8} />
      </Cylinder>
      <Cylinder args={[0.05, 0.1, 1.5, 8]} position={[0.5, 5.8, 0]} rotation={[0, 0, Math.PI / 3]} castShadow>
        <meshStandardMaterial color="#333333" roughness={0.3} metalness={0.8} />
      </Cylinder>
      <Box args={[0.4, 0.3, 0.4]} position={[0.9, 5.9, 0]}>
        <meshStandardMaterial color="#FFFFE0" emissive="#FFFFE0" emissiveIntensity={0.5} />
      </Box>
    </group>
  );
}

// ============================================
// CAR COMPONENT
// ============================================
function Car({ position, color, rotation = 0 }: { position: [number, number, number], color: string, rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Body */}
      <Box args={[2, 0.8, 4]} position={[0, 0.6, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </Box>
      {/* Cabin */}
      <Box args={[1.8, 0.7, 2]} position={[0, 1.15, -0.3]} castShadow>
        <meshStandardMaterial color="#1a1a2e" roughness={0.1} metalness={0.3} />
      </Box>
      {/* Wheels */}
      {[[-0.9, 0.3, 1.2], [0.9, 0.3, 1.2], [-0.9, 0.3, -1.2], [0.9, 0.3, -1.2]].map((pos, i) => (
        <Cylinder key={i} args={[0.35, 0.35, 0.3, 16]} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </Cylinder>
      ))}
    </group>
  );
}

// ============================================
// MAIN SCENE COMPONENT
// ============================================
function Scene({ isDarkMode }: { isDarkMode: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  // House configurations
  const houses: HouseProps[] = [
    // Row 1 - Front (some destroyed/major)
    { position: [-25, 0, -20], width: 10, depth: 12, height: 6, wallColor: '#F5F5DC', roofColor: '#4A4A4A', damage: 'destroyed' },
    { position: [-10, 0, -20], width: 11, depth: 11, height: 6.5, wallColor: '#8B4513', roofColor: '#2F2F2F', damage: 'major' },
    { position: [5, 0, -20], width: 10, depth: 13, height: 7, wallColor: '#FFFFFF', roofColor: '#3D3D3D', damage: 'major' },
    { position: [20, 0, -20], width: 12, depth: 11, height: 6, wallColor: '#D2B48C', roofColor: '#4A4A4A', damage: 'destroyed' },

    // Row 2 - Middle (mixed damage)
    { position: [-25, 0, 5], width: 11, depth: 12, height: 7, wallColor: '#F0E68C', roofColor: '#2F2F2F', damage: 'minor' },
    { position: [-10, 0, 5], width: 10, depth: 11, height: 6, wallColor: '#DCDCDC', roofColor: '#3D3D3D', damage: 'minor' },
    { position: [5, 0, 5], width: 12, depth: 13, height: 6.5, wallColor: '#BC8F8F', roofColor: '#4A4A4A', damage: 'intact' },
    { position: [20, 0, 5], width: 10, depth: 12, height: 7, wallColor: '#F5F5F5', roofColor: '#2F2F2F', damage: 'intact' },

    // Row 3 - Back (mostly intact)
    { position: [-25, 0, 30], width: 10, depth: 11, height: 6, wallColor: '#FFE4C4', roofColor: '#3D3D3D', damage: 'intact' },
    { position: [-10, 0, 30], width: 11, depth: 12, height: 6.5, wallColor: '#E6E6FA', roofColor: '#4A4A4A', damage: 'intact' },
    { position: [5, 0, 30], width: 10, depth: 11, height: 7, wallColor: '#F5DEB3', roofColor: '#2F2F2F', damage: 'intact' },
    { position: [20, 0, 30], width: 12, depth: 13, height: 6, wallColor: '#FAFAD2', roofColor: '#3D3D3D', damage: 'intact' },
  ];

  // Trees
  const trees = [
    { position: [-35, 0, -30] as [number, number, number], height: 12, spread: 5 },
    { position: [35, 0, -30] as [number, number, number], height: 14, spread: 6 },
    { position: [-35, 0, 15] as [number, number, number], height: 11, spread: 5 },
    { position: [35, 0, 15] as [number, number, number], height: 13, spread: 5 },
    { position: [-35, 0, 40] as [number, number, number], height: 15, spread: 6 },
    { position: [35, 0, 40] as [number, number, number], height: 12, spread: 5 },
    { position: [-18, 0, -35] as [number, number, number], height: 10, spread: 4 },
    { position: [12, 0, -35] as [number, number, number], height: 11, spread: 4 },
  ];

  return (
    <group ref={groupRef}>
      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={isDarkMode ? [0, -1, 0] : [100, 50, 100]}
        inclination={isDarkMode ? 0 : 0.5}
        azimuth={0.25}
      />

      {/* Clouds */}
      {!isDarkMode && (
        <>
          <Cloud position={[-30, 40, -20]} speed={0.2} opacity={0.5} />
          <Cloud position={[30, 45, 10]} speed={0.1} opacity={0.4} />
          <Cloud position={[0, 50, 30]} speed={0.15} opacity={0.3} />
        </>
      )}

      {/* Main directional light (sun) */}
      <directionalLight
        position={[50, 80, 30]}
        intensity={isDarkMode ? 0.1 : 2}
        color={isDarkMode ? '#4466aa' : '#fff5e6'}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0001}
      />

      {/* Fill light */}
      <directionalLight
        position={[-30, 40, -30]}
        intensity={isDarkMode ? 0.05 : 0.5}
        color="#b4d7ff"
      />

      {/* Ambient light */}
      <ambientLight intensity={isDarkMode ? 0.1 : 0.3} color={isDarkMode ? '#223355' : '#ffffff'} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#3d6b3d" roughness={0.9} />
      </mesh>

      {/* Main road (horizontal) */}
      <Box args={[200, 0.1, 8]} position={[0, 0.02, -8]} receiveShadow>
        <meshStandardMaterial color="#2a2a2a" roughness={0.85} />
      </Box>
      {/* Road markings */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Box key={`h-mark-${i}`} args={[3, 0.02, 0.2]} position={[-45 + i * 5, 0.08, -8]}>
          <meshStandardMaterial color="#ffcc00" />
        </Box>
      ))}

      {/* Cross road (vertical) */}
      <Box args={[8, 0.1, 200]} position={[-2, 0.02, 0]} receiveShadow>
        <meshStandardMaterial color="#2a2a2a" roughness={0.85} />
      </Box>

      {/* Sidewalks */}
      <Box args={[200, 0.15, 2]} position={[0, 0.05, -13]} receiveShadow>
        <meshStandardMaterial color="#999999" roughness={0.8} />
      </Box>
      <Box args={[200, 0.15, 2]} position={[0, 0.05, -3]} receiveShadow>
        <meshStandardMaterial color="#999999" roughness={0.8} />
      </Box>

      {/* Houses */}
      {houses.map((house, i) => (
        <House key={i} {...house} />
      ))}

      {/* Trees */}
      {trees.map((tree, i) => (
        <Tree key={i} {...tree} />
      ))}

      {/* Street lamps */}
      <StreetLamp position={[-30, 0, -12]} />
      <StreetLamp position={[0, 0, -12]} />
      <StreetLamp position={[30, 0, -12]} />

      {/* Parked cars */}
      <Car position={[-20, 0, -12]} color="#cc0000" rotation={0} />
      <Car position={[15, 0, -12]} color="#0044cc" rotation={0} />
      <Car position={[28, 0, 2]} color="#333333" rotation={Math.PI / 2} />

      {/* Debris on street (from destroyed houses) */}
      {Array.from({ length: 15 }).map((_, i) => (
        <Box
          key={`street-debris-${i}`}
          args={[0.3 + Math.random() * 0.5, 0.1 + Math.random() * 0.2, 0.3 + Math.random() * 0.5]}
          position={[
            -30 + Math.random() * 60,
            0.1,
            -10 + Math.random() * 4
          ]}
          rotation={[0, Math.random() * Math.PI, 0]}
          castShadow
        >
          <meshStandardMaterial color="#8B7355" roughness={0.9} />
        </Box>
      ))}

      {/* Contact shadows for extra realism */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.4}
        scale={100}
        blur={2}
        far={50}
      />
    </group>
  );
}

// ============================================
// CAMERA CONTROLS
// ============================================
function CameraController() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(60, 40, 60);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}

// ============================================
// MAIN COMPONENT
// ============================================
export function LidarViewerTool() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const stats = {
    totalStructures: 12,
    destroyed: 2,
    majorDamage: 2,
    minorDamage: 2,
    intact: 6,
  };

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-180px)] min-h-[600px] bg-slate-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-semibold">3D Neighborhood View</span>
            <span className="text-slate-400 text-sm ml-2">Post-Hurricane Assessment</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={isDarkMode ? 'Day mode' : 'Night mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Toggle info"
          >
            <Info className="w-5 h-5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Three.js Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        <PerspectiveCamera makeDefault position={[60, 40, 60]} fov={50} />
        <CameraController />

        <Scene isDarkMode={isDarkMode} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={20}
          maxDistance={150}
          maxPolarAngle={Math.PI / 2.1}
        />

        {/* Post-processing */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.9}
            luminanceSmoothing={0.9}
            intensity={0.2}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.4} />
        </EffectComposer>
      </Canvas>

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute left-4 top-20 bg-black/70 backdrop-blur-md rounded-xl p-4 text-white max-w-xs">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Damage Assessment
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Structures:</span>
              <span className="font-medium">{stats.totalStructures}</span>
            </div>
            <div className="h-px bg-white/20 my-2" />
            <div className="flex justify-between">
              <span className="text-red-400">Destroyed:</span>
              <span className="font-medium text-red-400">{stats.destroyed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-400">Major Damage:</span>
              <span className="font-medium text-orange-400">{stats.majorDamage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">Minor Damage:</span>
              <span className="font-medium text-yellow-400">{stats.minorDamage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">Intact:</span>
              <span className="font-medium text-green-400">{stats.intact}</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-white/60 text-sm">
        <div className="flex items-center gap-2">
          <Move3d className="w-4 h-4" />
          <span>Drag to orbit</span>
        </div>
        <div className="flex items-center gap-2">
          <ZoomIn className="w-4 h-4" />
          <span>Scroll to zoom</span>
        </div>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur rounded-lg px-3 py-2">
        <div className="text-xs text-slate-400">SIMULATED OUTPUT</div>
        <div className="text-white font-medium">DJI Zenmuse L3</div>
        <div className="text-xs text-cyan-400">450m altitude • Real-time 3D</div>
      </div>
    </div>
  );
}

export default LidarViewerTool;
