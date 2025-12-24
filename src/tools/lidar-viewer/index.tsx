import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Sky,
  Cloud,
  ContactShadows,
  useTexture,
  Instances,
  Instance,
  MeshReflectorMaterial
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SSAO, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  Maximize2, Minimize2, RotateCcw, Sun, Moon,
  AlertTriangle, Info, ZoomIn, ZoomOut, Move3d, Eye
} from 'lucide-react';

// ============================================
// PROCEDURAL TEXTURE GENERATORS
// ============================================

function createBrickTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base brick color
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, 0, 512, 512);

  const brickWidth = 64;
  const brickHeight = 32;
  const mortarSize = 4;

  for (let row = 0; row < 16; row++) {
    const offset = row % 2 === 0 ? 0 : brickWidth / 2;
    for (let col = -1; col < 9; col++) {
      const x = col * brickWidth + offset;
      const y = row * brickHeight;

      // Brick variation
      const r = 139 + Math.random() * 30 - 15;
      const g = 69 + Math.random() * 20 - 10;
      const b = 19 + Math.random() * 15 - 7;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + mortarSize, y + mortarSize, brickWidth - mortarSize * 2, brickHeight - mortarSize * 2);

      // Brick texture noise
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.fillRect(
          x + mortarSize + Math.random() * (brickWidth - mortarSize * 2),
          y + mortarSize + Math.random() * (brickHeight - mortarSize * 2),
          2, 2
        );
      }
    }
  }

  // Mortar
  ctx.strokeStyle = '#9a9a8a';
  ctx.lineWidth = mortarSize;
  for (let row = 0; row <= 16; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * brickHeight);
    ctx.lineTo(512, row * brickHeight);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function createSidingTexture(baseColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Parse base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Horizontal siding lines
  const boardHeight = 16;
  for (let y = 0; y < 256; y += boardHeight) {
    // Shadow line at top of each board
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, y, 256, 2);

    // Highlight at bottom
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, y + boardHeight - 2, 256, 2);

    // Subtle texture variation
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * 256, y, Math.random() * 20 + 5, boardHeight);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 4);
  return texture;
}

function createShingleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark base
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, 512, 512);

  const shingleWidth = 32;
  const shingleHeight = 16;

  for (let row = 0; row < 32; row++) {
    const offset = row % 2 === 0 ? 0 : shingleWidth / 2;
    for (let col = -1; col < 18; col++) {
      const x = col * shingleWidth + offset;
      const y = row * shingleHeight;

      // Shingle color variation
      const gray = 35 + Math.random() * 25;
      ctx.fillStyle = `rgb(${gray},${gray},${gray + 5})`;
      ctx.fillRect(x + 1, y + 1, shingleWidth - 2, shingleHeight - 1);

      // Granule texture
      for (let i = 0; i < 15; i++) {
        const g = 20 + Math.random() * 40;
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(
          x + 2 + Math.random() * (shingleWidth - 4),
          y + 2 + Math.random() * (shingleHeight - 4),
          1, 1
        );
      }

      // Shadow at bottom edge
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y + shingleHeight - 2, shingleWidth, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 6);
  return texture;
}

function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base green
  ctx.fillStyle = '#3d6b3d';
  ctx.fillRect(0, 0, 512, 512);

  // Grass blade strokes
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const length = 5 + Math.random() * 15;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;

    const green = 80 + Math.random() * 80;
    ctx.strokeStyle = `rgb(${green * 0.4},${green},${green * 0.3})`;
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }

  // Darker patches
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = `rgba(0,50,0,${Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 40, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  return texture;
}

function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 256, 256);

  // Aggregate texture
  for (let i = 0; i < 2000; i++) {
    const gray = 15 + Math.random() * 30;
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // Cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 50;
      y += Math.random() * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 30);
  return texture;
}

function createConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 256, 256);

  // Noise
  for (let i = 0; i < 5000; i++) {
    const gray = 100 + Math.random() * 60;
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }

  // Subtle joints
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 252, 252);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

// ============================================
// REALISTIC HOUSE COMPONENT WITH TEXTURES
// ============================================
interface HouseProps {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  wallType: 'brick' | 'siding';
  wallColor: string;
  damage: 'destroyed' | 'major' | 'minor' | 'intact';
}

function House({ position, width, depth, height, wallType, wallColor, damage }: HouseProps) {
  const [x, y, z] = position;

  const wallTexture = useMemo(() => {
    return wallType === 'brick' ? createBrickTexture() : createSidingTexture(wallColor);
  }, [wallType, wallColor]);

  const roofTexture = useMemo(() => createShingleTexture(), []);

  const showRoof = damage !== 'destroyed';
  const showWalls = damage !== 'destroyed';
  const roofPitch = height * 0.45;

  // Roof geometry
  const roofGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const halfWidth = width / 2 + 0.5;
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(0, roofPitch);
    shape.lineTo(halfWidth, 0);
    shape.lineTo(-halfWidth, 0);

    return new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: depth + 1,
      bevelEnabled: false,
    });
  }, [width, depth, roofPitch]);

  return (
    <group position={[x, y, z]}>
      {/* Foundation */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.6, 0.4, depth + 0.6]} />
        <meshStandardMaterial color="#555555" roughness={0.95} />
      </mesh>

      {showWalls && (
        <>
          {/* Main walls with texture */}
          <mesh position={[0, height / 2 + 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial map={wallTexture} roughness={0.8} />
          </mesh>

          {/* Front door with frame */}
          <mesh position={[0, 1.5, -depth / 2 - 0.02]} castShadow>
            <boxGeometry args={[1.4, 2.4, 0.15]} />
            <meshStandardMaterial color="#2d1810" roughness={0.7} />
          </mesh>
          {/* Door panels */}
          <mesh position={[-0.3, 1.8, -depth / 2 - 0.1]}>
            <boxGeometry args={[0.4, 0.8, 0.05]} />
            <meshStandardMaterial color="#3d2818" roughness={0.6} />
          </mesh>
          <mesh position={[0.3, 1.8, -depth / 2 - 0.1]}>
            <boxGeometry args={[0.4, 0.8, 0.05]} />
            <meshStandardMaterial color="#3d2818" roughness={0.6} />
          </mesh>
          <mesh position={[-0.3, 0.9, -depth / 2 - 0.1]}>
            <boxGeometry args={[0.4, 0.8, 0.05]} />
            <meshStandardMaterial color="#3d2818" roughness={0.6} />
          </mesh>
          <mesh position={[0.3, 0.9, -depth / 2 - 0.1]}>
            <boxGeometry args={[0.4, 0.8, 0.05]} />
            <meshStandardMaterial color="#3d2818" roughness={0.6} />
          </mesh>
          {/* Door handle */}
          <mesh position={[0.5, 1.3, -depth / 2 - 0.12]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#aa8844" metalness={0.8} roughness={0.3} />
          </mesh>

          {/* Windows with frames and mullions */}
          {[[-width / 3, height / 2 + 1], [width / 3, height / 2 + 1]].map((pos, i) => (
            <group key={i} position={[pos[0], pos[1], -depth / 2 - 0.02]}>
              {/* Window frame */}
              <mesh castShadow>
                <boxGeometry args={[1.8, 1.5, 0.12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
              </mesh>
              {/* Glass */}
              <mesh position={[0, 0, 0.02]}>
                <boxGeometry args={[1.5, 1.2, 0.05]} />
                <meshStandardMaterial
                  color="#87CEEB"
                  transparent
                  opacity={0.4}
                  metalness={0.9}
                  roughness={0.1}
                />
              </mesh>
              {/* Mullions */}
              <mesh position={[0, 0, 0.06]}>
                <boxGeometry args={[0.06, 1.2, 0.02]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0, 0.06]}>
                <boxGeometry args={[1.5, 0.06, 0.02]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
              {/* Window sill */}
              <mesh position={[0, -0.8, 0.1]}>
                <boxGeometry args={[2, 0.1, 0.25]} />
                <meshStandardMaterial color="#ffffff" roughness={0.6} />
              </mesh>
            </group>
          ))}

          {/* Side windows */}
          {[[-width / 2 - 0.02, height / 2 + 1, 0], [width / 2 + 0.02, height / 2 + 1, 0]].map((pos, i) => (
            <group key={`side-${i}`} position={pos as [number, number, number]} rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
              <mesh>
                <boxGeometry args={[1.4, 1.2, 0.1]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <boxGeometry args={[1.1, 0.9, 0.05]} />
                <meshStandardMaterial color="#87CEEB" transparent opacity={0.4} metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          ))}

          {/* Gutters */}
          <mesh position={[0, height + 0.35, -depth / 2 - 0.55]} castShadow>
            <boxGeometry args={[width + 1, 0.15, 0.15]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          {/* Downspout */}
          <mesh position={[width / 2 + 0.4, height / 2 + 0.2, -depth / 2 - 0.5]} castShadow>
            <boxGeometry args={[0.1, height, 0.1]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>

          {/* Trim at corners */}
          {[[-width / 2 - 0.02, 0], [width / 2 + 0.02, 0]].map((pos, i) => (
            <mesh key={`trim-${i}`} position={[pos[0], height / 2 + 0.4, -depth / 2 - 0.02]} castShadow>
              <boxGeometry args={[0.15, height, 0.15]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
          ))}
        </>
      )}

      {showRoof && (
        <group position={[0, height + 0.4, -depth / 2 - 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={roofGeometry} castShadow receiveShadow>
            <meshStandardMaterial map={roofTexture} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Blue tarp on damaged roofs */}
      {(damage === 'major' || damage === 'minor') && (
        <mesh
          position={[width * 0.1, height + roofPitch * 0.4 + 0.5, 0]}
          rotation={[0.25, 0, 0.1]}
          castShadow
        >
          <boxGeometry args={[width * 0.45, 0.03, depth * 0.35]} />
          <meshStandardMaterial color="#1565C0" roughness={0.5} />
        </mesh>
      )}

      {/* Destroyed house debris */}
      {damage === 'destroyed' && (
        <group>
          {Array.from({ length: 35 }).map((_, i) => {
            const debrisX = (Math.random() - 0.5) * width * 1.2;
            const debrisZ = (Math.random() - 0.5) * depth * 1.2;
            const debrisH = Math.random() * 2;
            const size = 0.3 + Math.random() * 1.2;
            return (
              <mesh
                key={i}
                position={[debrisX, debrisH, debrisZ]}
                rotation={[Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5]}
                castShadow
              >
                <boxGeometry args={[size, size * 0.4, size * 0.8]} />
                <meshStandardMaterial
                  color={Math.random() > 0.6 ? '#8B4513' : Math.random() > 0.5 ? '#666666' : wallColor}
                  roughness={0.9}
                />
              </mesh>
            );
          })}
          {/* Partial wall standing */}
          <mesh position={[-width / 3, height * 0.25, -depth / 2 + 0.1]} castShadow>
            <boxGeometry args={[width * 0.35, height * 0.5, 0.2]} />
            <meshStandardMaterial map={wallTexture} roughness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ============================================
// REALISTIC TREE WITH PROPER GEOMETRY
// ============================================
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const [x, y, z] = position;

  return (
    <group position={[x, y, z]} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 4, 8]} />
        <meshStandardMaterial color="#4a3728" roughness={0.95} />
      </mesh>

      {/* Main branches */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 0.5, 3.5 + i * 0.3, Math.sin(angle) * 0.5]}
          rotation={[Math.PI / 4, angle, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.08, 0.15, 2, 6]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} />
        </mesh>
      ))}

      {/* Foliage clusters - irregular shapes */}
      {[
        [0, 5.5, 0, 2.5],
        [-1, 4.5, 0.8, 1.8],
        [1.2, 4.8, -0.5, 1.6],
        [0.3, 6.5, 0.2, 1.8],
        [-0.8, 5.8, -0.8, 1.5],
        [0.8, 5.2, 0.8, 1.4],
      ].map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], pos[2]]} castShadow>
          <dodecahedronGeometry args={[pos[3], 1]} />
          <meshStandardMaterial
            color={`rgb(${30 + Math.random() * 20}, ${80 + Math.random() * 40}, ${30 + Math.random() * 20})`}
            roughness={0.95}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================
// POWER LINE POLES
// ============================================
function PowerPole({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main pole */}
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 10, 8]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>
      {/* Cross arm */}
      <mesh position={[0, 9, 0]} castShadow>
        <boxGeometry args={[3, 0.15, 0.15]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>
      {/* Insulators */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 9.2, 0]}>
          <cylinderGeometry args={[0.05, 0.08, 0.2, 8]} />
          <meshStandardMaterial color="#4a6741" roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================
// STREET LAMP
// ============================================
function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 7, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.6, 6.8, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 1.3, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[1, 6.6, 0]}>
        <boxGeometry args={[0.5, 0.25, 0.3]} />
        <meshStandardMaterial
          color="#ffffee"
          emissive="#ffffaa"
          emissiveIntensity={0.8}
        />
      </mesh>
      <pointLight position={[1, 6.4, 0]} intensity={2} distance={15} color="#fff5e6" />
    </group>
  );
}

// ============================================
// CAR WITH MORE DETAIL
// ============================================
function Car({ position, color, rotation = 0 }: { position: [number, number, number]; color: string; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.8, 0.6, 4.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1, -0.2]} castShadow>
        <boxGeometry args={[1.6, 0.6, 2.2]} />
        <meshStandardMaterial color="#111122" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wheels */}
      {[[-0.85, 0.3, 1.3], [0.85, 0.3, 1.3], [-0.85, 0.3, -1.1], [0.85, 0.3, -1.1]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.22, 8]} />
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Headlights */}
      <mesh position={[-0.6, 0.5, -2.15]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffff99" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.6, 0.5, -2.15]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffff99" emissiveIntensity={0.3} />
      </mesh>
      {/* Taillights */}
      <mesh position={[-0.6, 0.5, 2.15]}>
        <boxGeometry args={[0.2, 0.15, 0.05]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.6, 0.5, 2.15]}>
        <boxGeometry args={[0.2, 0.15, 0.05]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

// ============================================
// MAIN SCENE
// ============================================
function Scene({ isDarkMode }: { isDarkMode: boolean }) {
  const grassTexture = useMemo(() => createGrassTexture(), []);
  const asphaltTexture = useMemo(() => createAsphaltTexture(), []);
  const concreteTexture = useMemo(() => createConcreteTexture(), []);

  const houses: HouseProps[] = useMemo(() => [
    { position: [-25, 0, -20], width: 10, depth: 12, height: 6, wallType: 'siding', wallColor: '#e8e4dc', damage: 'destroyed' },
    { position: [-10, 0, -20], width: 11, depth: 11, height: 6.5, wallType: 'brick', wallColor: '#8B4513', damage: 'major' },
    { position: [5, 0, -20], width: 10, depth: 13, height: 7, wallType: 'siding', wallColor: '#f5f5f5', damage: 'major' },
    { position: [20, 0, -20], width: 12, depth: 11, height: 6, wallType: 'siding', wallColor: '#d4c4a8', damage: 'destroyed' },
    { position: [-25, 0, 5], width: 11, depth: 12, height: 7, wallType: 'siding', wallColor: '#f0e6d3', damage: 'minor' },
    { position: [-10, 0, 5], width: 10, depth: 11, height: 6, wallType: 'brick', wallColor: '#8B4513', damage: 'minor' },
    { position: [5, 0, 5], width: 12, depth: 13, height: 6.5, wallType: 'siding', wallColor: '#dcdcdc', damage: 'intact' },
    { position: [20, 0, 5], width: 10, depth: 12, height: 7, wallType: 'siding', wallColor: '#f8f8f8', damage: 'intact' },
    { position: [-25, 0, 30], width: 10, depth: 11, height: 6, wallType: 'siding', wallColor: '#fffaf0', damage: 'intact' },
    { position: [-10, 0, 30], width: 11, depth: 12, height: 6.5, wallType: 'brick', wallColor: '#8B4513', damage: 'intact' },
    { position: [5, 0, 30], width: 10, depth: 11, height: 7, wallType: 'siding', wallColor: '#f5deb3', damage: 'intact' },
    { position: [20, 0, 30], width: 12, depth: 13, height: 6, wallType: 'siding', wallColor: '#fafad2', damage: 'intact' },
  ], []);

  return (
    <group>
      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={isDarkMode ? [0, -1, 0] : [100, 20, 50]}
        inclination={isDarkMode ? 0 : 0.49}
        azimuth={0.25}
        rayleigh={isDarkMode ? 0 : 0.5}
      />

      {/* HDRI-like environment */}
      <Environment preset={isDarkMode ? "night" : "sunset"} background={false} />

      {/* Sun light */}
      <directionalLight
        position={[60, 80, 40]}
        intensity={isDarkMode ? 0.1 : 2.5}
        color={isDarkMode ? '#4466aa' : '#fff8f0'}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0001}
      />

      {/* Fill lights */}
      <directionalLight position={[-40, 30, -40]} intensity={isDarkMode ? 0.02 : 0.4} color="#aaccff" />
      <hemisphereLight intensity={isDarkMode ? 0.1 : 0.5} color="#87ceeb" groundColor="#3d6b3d" />

      {/* Ground with grass texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial map={grassTexture} roughness={0.95} />
      </mesh>

      {/* Main road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -8]} receiveShadow>
        <planeGeometry args={[200, 10]} />
        <meshStandardMaterial map={asphaltTexture} roughness={0.9} />
      </mesh>

      {/* Center line markings */}
      {Array.from({ length: 25 }).map((_, i) => (
        <mesh key={`line-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-60 + i * 5, 0.03, -8]}>
          <planeGeometry args={[3, 0.15]} />
          <meshStandardMaterial color="#f4d03f" roughness={0.6} />
        </mesh>
      ))}

      {/* Sidewalks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -14]} receiveShadow>
        <planeGeometry args={[200, 2.5]} />
        <meshStandardMaterial map={concreteTexture} roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -2]} receiveShadow>
        <planeGeometry args={[200, 2.5]} />
        <meshStandardMaterial map={concreteTexture} roughness={0.85} />
      </mesh>

      {/* Houses */}
      {houses.map((house, i) => (
        <House key={i} {...house} />
      ))}

      {/* Trees */}
      <Tree position={[-38, 0, -28]} scale={1.2} />
      <Tree position={[38, 0, -28]} scale={1.1} />
      <Tree position={[-38, 0, 15]} scale={1.0} />
      <Tree position={[38, 0, 15]} scale={1.3} />
      <Tree position={[-38, 0, 42]} scale={1.1} />
      <Tree position={[38, 0, 42]} scale={1.0} />
      <Tree position={[-15, 0, -32]} scale={0.9} />
      <Tree position={[12, 0, -32]} scale={1.0} />

      {/* Power poles */}
      <PowerPole position={[-35, 0, -10]} />
      <PowerPole position={[0, 0, -10]} />
      <PowerPole position={[35, 0, -10]} />

      {/* Street lamps */}
      <StreetLamp position={[-25, 0, -14]} />
      <StreetLamp position={[5, 0, -14]} />
      <StreetLamp position={[30, 0, -14]} />

      {/* Parked cars */}
      <Car position={[-18, 0, -13]} color="#b71c1c" rotation={0} />
      <Car position={[12, 0, -13]} color="#1565c0" rotation={0} />
      <Car position={[-5, 0, -13]} color="#f5f5f5" rotation={0} />

      {/* Contact shadows */}
      <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={150} blur={2} far={60} />
    </group>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function LidarViewerTool() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
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
    <div ref={containerRef} className="relative w-full h-[calc(100vh-180px)] min-h-[600px] bg-gradient-to-b from-sky-200 to-sky-400 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-semibold drop-shadow">3D Neighborhood Assessment</span>
            <span className="text-white/80 text-sm ml-2 drop-shadow">Hurricane Damage Survey</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        camera={{ position: [70, 50, 70], fov: 45 }}
      >
        <Scene isDarkMode={isDarkMode} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={25}
          maxDistance={180}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 5]}
        />

        <EffectComposer>
          <Bloom luminanceThreshold={0.95} luminanceSmoothing={0.9} intensity={0.15} />
          <Vignette eskil={false} offset={0.1} darkness={0.3} />
        </EffectComposer>
      </Canvas>

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute left-4 top-20 bg-black/60 backdrop-blur-md rounded-xl p-4 text-white max-w-xs shadow-xl">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Damage Assessment
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Structures:</span>
              <span className="font-bold">{stats.totalStructures}</span>
            </div>
            <div className="h-px bg-white/20" />
            <div className="flex justify-between">
              <span className="text-red-400">Destroyed:</span>
              <span className="font-bold text-red-400">{stats.destroyed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-400">Major Damage:</span>
              <span className="font-bold text-orange-400">{stats.majorDamage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">Minor Damage:</span>
              <span className="font-bold text-yellow-400">{stats.minorDamage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">Intact:</span>
              <span className="font-bold text-green-400">{stats.intact}</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-white/70 text-sm drop-shadow">
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
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur rounded-lg px-3 py-2 shadow-lg">
        <div className="text-xs text-gray-400">SIMULATED OUTPUT</div>
        <div className="text-white font-medium">DJI Zenmuse L3</div>
        <div className="text-xs text-cyan-400">450m altitude • Real-time 3D</div>
      </div>
    </div>
  );
}

export default LidarViewerTool;
