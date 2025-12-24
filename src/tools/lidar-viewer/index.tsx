import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  Maximize2, Minimize2, RotateCcw, Sun, Moon,
  AlertTriangle, Info, ZoomIn, ZoomOut, Move3d, Eye
} from 'lucide-react';

// ============================================
// CUSTOM SHADERS FOR PHOTOREALISTIC RENDERING
// ============================================

const vertexShader = `
  attribute float size;
  attribute float intensity;

  varying vec3 vColor;
  varying float vDepth;
  varying float vIntensity;

  void main() {
    vColor = color;
    vIntensity = intensity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;

    // Advanced screen-space point size with distance attenuation
    float pointScale = 350.0;
    gl_PointSize = size * (pointScale / -mvPosition.z);

    // Clamp point size for quality
    gl_PointSize = clamp(gl_PointSize, 1.0, 15.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vDepth;
  varying float vIntensity;

  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  uniform vec3 lightDir;
  uniform float ambientStrength;

  void main() {
    // Circular point with soft anti-aliased edge
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    // Discard outside circle
    if (dist > 0.5) discard;

    // Soft edge falloff for anti-aliasing
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    // Simulate surface normal from point coord (hemispherical shading)
    vec3 normal = vec3(center * 2.0, sqrt(1.0 - dot(center * 2.0, center * 2.0)));
    normal = normalize(normal);

    // Diffuse lighting
    float diff = max(dot(normal, lightDir), 0.0);

    // Ambient + diffuse
    vec3 litColor = vColor * (ambientStrength + diff * (1.0 - ambientStrength));

    // Add slight specular highlight
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
    litColor += vec3(1.0, 0.98, 0.95) * spec * 0.15 * vIntensity;

    // Distance fog for depth perception
    float fogFactor = smoothstep(fogNear, fogFar, vDepth);
    vec3 finalColor = mix(litColor, fogColor, fogFactor * 0.7);

    // Intensity variation for material feel
    finalColor *= (0.85 + vIntensity * 0.3);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface PointCloudStats {
  totalPoints: number;
  structuresDetected: number;
  severelyDamaged: number;
  moderatelyDamaged: number;
  intact: number;
}

// Generate HIGH DENSITY point cloud data - DJI L3 simulation
function generateNeighborhoodData(): { positions: Float32Array; colors: Float32Array; stats: PointCloudStats } {
  const points: number[] = [];
  const colors: number[] = [];

  let structuresDetected = 0;
  let severelyDamaged = 0;
  let moderatelyDamaged = 0;
  let intact = 0;

  const addPoint = (x: number, y: number, z: number, r: number, g: number, b: number) => {
    points.push(x, y, z);
    colors.push(r, g, b);
  };

  // L3 multi-return simulation - adds noise/scatter typical of LiDAR
  const addLidarPoint = (x: number, y: number, z: number, r: number, g: number, b: number, returns: number = 1) => {
    // Primary return
    addPoint(x + (Math.random() - 0.5) * 0.02, y + (Math.random() - 0.5) * 0.02, z + (Math.random() - 0.5) * 0.02, r, g, b);
    // Additional returns (L3 supports up to 5)
    for (let i = 1; i < returns; i++) {
      const scatter = 0.03 * i;
      addPoint(
        x + (Math.random() - 0.5) * scatter,
        y + (Math.random() - 0.5) * scatter - 0.01 * i,
        z + (Math.random() - 0.5) * scatter,
        r * (1 - i * 0.1), g * (1 - i * 0.1), b * (1 - i * 0.1)
      );
    }
  };

  // ULTRA HIGH DENSITY Ground - photorealistic terrain coverage
  const groundDensity = 0.08; // AAA game quality spacing
  for (let x = -50; x < 50; x += groundDensity) {
    for (let z = -50; z < 50; z += groundDensity) {
      // Perlin-like noise for realistic terrain
      const noise = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.3 +
                   Math.sin(x * 0.3 + 1) * Math.cos(z * 0.2) * 0.1;
      const y = noise + (Math.random() - 0.5) * 0.03;

      // Height-based coloring (elevation gradient) - typical LiDAR visualization
      const elevation = (y + 0.5) / 1.0;
      const groundColor = Math.random() > 0.6 ?
        [0.25 + elevation * 0.1 + Math.random() * 0.05, 0.2 + Math.random() * 0.05, 0.12] :
        [0.15 + Math.random() * 0.05, 0.28 + elevation * 0.1 + Math.random() * 0.08, 0.12];
      addLidarPoint(x, y, z, groundColor[0], groundColor[1], groundColor[2], Math.random() > 0.8 ? 2 : 1);
    }
  }

  // HIGH DENSITY Roads with road markings
  const roads = [
    { start: [-50, 0], end: [50, 0], width: 5 },
    { start: [0, -50], end: [0, 50], width: 5 },
    { start: [-50, -25], end: [50, -25], width: 4 },
    { start: [-25, -50], end: [-25, 50], width: 4 },
  ];
  roads.forEach(road => {
    const [x1, z1] = road.start;
    const [x2, z2] = road.end;
    const isHorizontal = z1 === z2;
    const roadLength = Math.sqrt((x2-x1)**2 + (z2-z1)**2);
    const step = 0.06; // Denser road surface

    for (let t = 0; t < 1; t += step / roadLength) {
      for (let w = -road.width/2; w < road.width/2; w += 0.06) {
        const x = x1 + (x2 - x1) * t + (isHorizontal ? 0 : w);
        const z = z1 + (z2 - z1) * t + (isHorizontal ? w : 0);
        const isCenterLine = Math.abs(w) < 0.15;
        const isEdgeLine = Math.abs(Math.abs(w) - road.width/2 + 0.3) < 0.1;

        if (isCenterLine && Math.floor(t * 20) % 2 === 0) {
          addLidarPoint(x, -0.08, z, 0.7, 0.65, 0.2); // Yellow center line
        } else if (isEdgeLine) {
          addLidarPoint(x, -0.08, z, 0.6, 0.6, 0.6); // White edge line
        } else {
          const gray = 0.22 + Math.random() * 0.06;
          addLidarPoint(x, -0.1 + Math.random() * 0.02, z, gray, gray, gray);
        }
      }
    }
  });

  // ULTRA HIGH DENSITY Houses - architectural precision like DJI L3
  const houses = [
    { x: -30, z: -20, width: 9, depth: 11, height: 6, damage: 'destroyed', hasGarage: true, hasPorch: false },
    { x: 15, z: -35, width: 11, depth: 9, height: 7.5, damage: 'destroyed', hasGarage: false, hasPorch: true },
    { x: -15, z: 18, width: 10, depth: 10, height: 6.5, damage: 'major', hasGarage: true, hasPorch: true },
    { x: 28, z: 12, width: 9, depth: 11, height: 5.5, damage: 'major', hasGarage: false, hasPorch: false },
    { x: -38, z: 32, width: 11, depth: 9, height: 6.5, damage: 'major', hasGarage: true, hasPorch: false },
    { x: 38, z: -18, width: 10, depth: 9, height: 6, damage: 'minor', hasGarage: true, hasPorch: true },
    { x: -22, z: -38, width: 9, depth: 10, height: 5.5, damage: 'minor', hasGarage: false, hasPorch: true },
    { x: 12, z: 38, width: 11, depth: 11, height: 7, damage: 'minor', hasGarage: true, hasPorch: false },
    { x: -42, z: -8, width: 9, depth: 9, height: 5.5, damage: 'intact', hasGarage: true, hasPorch: true },
    { x: 42, z: 28, width: 10, depth: 10, height: 6, damage: 'intact', hasGarage: false, hasPorch: true },
    { x: -12, z: -12, width: 8, depth: 9, height: 5, damage: 'intact', hasGarage: true, hasPorch: false },
    { x: 8, z: -8, width: 7, depth: 8, height: 5, damage: 'affected', hasGarage: false, hasPorch: true },
    { x: -8, z: 38, width: 9, depth: 8, height: 5.5, damage: 'affected', hasGarage: true, hasPorch: false },
  ];

  // ULTRA HIGH density - photorealistic surfaces with AAA game quality
  const wallDensity = 0.025; // Extremely tight for solid surfaces
  const roofDensity = 0.03; // Dense roof coverage

  houses.forEach(house => {
    structuresDetected++;
    let baseColor: [number, number, number];
    let roofColor: [number, number, number];
    let trimColor: [number, number, number] = [0.85, 0.85, 0.82];

    switch (house.damage) {
      case 'destroyed':
        baseColor = [0.85, 0.12, 0.12];
        roofColor = [0.7, 0.1, 0.1];
        severelyDamaged++;
        break;
      case 'major':
        baseColor = [0.95, 0.45, 0.08];
        roofColor = [0.8, 0.35, 0.05];
        severelyDamaged++;
        break;
      case 'minor':
        baseColor = [0.92, 0.82, 0.15];
        roofColor = [0.75, 0.65, 0.1];
        moderatelyDamaged++;
        break;
      case 'affected':
        baseColor = [0.3, 0.6, 0.85];
        roofColor = [0.25, 0.5, 0.7];
        moderatelyDamaged++;
        break;
      default:
        baseColor = [0.15, 0.7, 0.25];
        roofColor = [0.1, 0.55, 0.2];
        intact++;
    }

    const hx = house.x;
    const hz = house.z;
    const hw = house.width;
    const hd = house.depth;
    const hh = house.height;

    // Concrete foundation - very precise flat surface
    for (let fx = -0.4; fx <= hw + 0.4; fx += wallDensity * 2) {
      for (let fz = -0.4; fz <= hd + 0.4; fz += wallDensity * 2) {
        addPoint(hx + fx - hw/2, 0.02, hz + fz - hd/2, 0.55, 0.55, 0.53);
      }
    }

    // PRECISION WALLS - clean flat surfaces with architectural detail
    const damageLevel = house.damage === 'destroyed' ? 0.6 : house.damage === 'major' ? 0.25 : 0;

    // Define windows and door positions precisely
    const frontWindows = [
      { x1: 0.12, x2: 0.28, y1: 0.45, y2: 0.75 },
      { x1: 0.72, x2: 0.88, y1: 0.45, y2: 0.75 },
    ];
    const frontDoor = { x1: 0.42, x2: 0.58, y1: 0.02, y2: 0.52 };
    const sideWindows = [
      { z1: 0.2, z2: 0.4, y1: 0.45, y2: 0.75 },
      { z1: 0.6, z2: 0.8, y1: 0.45, y2: 0.75 },
    ];

    // Front wall (negative Z face) - ultra precise
    for (let wx = 0; wx <= hw; wx += wallDensity) {
      for (let wy = 0; wy <= hh; wy += wallDensity) {
        const normX = wx / hw;
        const normY = wy / hh;

        // Check if in window
        const inFrontWindow = frontWindows.some(w =>
          normX >= w.x1 && normX <= w.x2 && normY >= w.y1 && normY <= w.y2);
        // Check if in door
        const inDoor = normX >= frontDoor.x1 && normX <= frontDoor.x2 &&
                      normY >= frontDoor.y1 && normY <= frontDoor.y2;

        if (Math.random() > damageLevel) {
          if (inFrontWindow) {
            // Window - recessed with frame
            addPoint(hx + wx - hw/2, wy, hz - hd/2 + 0.08, 0.2, 0.25, 0.35); // Glass (recessed)
          } else if (inDoor) {
            // Door - recessed
            addPoint(hx + wx - hw/2, wy, hz - hd/2 + 0.05, 0.35, 0.28, 0.22);
          } else {
            // Wall surface - siding texture (horizontal lines)
            const sidingOffset = Math.floor(wy / 0.15) * 0.002;
            addPoint(hx + wx - hw/2, wy, hz - hd/2 + sidingOffset, baseColor[0], baseColor[1], baseColor[2]);
          }
        }
      }
    }

    // Back wall (positive Z face)
    for (let wx = 0; wx <= hw; wx += wallDensity) {
      for (let wy = 0; wy <= hh; wy += wallDensity) {
        const normX = wx / hw;
        const normY = wy / hh;
        const inWindow = frontWindows.some(w =>
          normX >= w.x1 && normX <= w.x2 && normY >= w.y1 && normY <= w.y2);

        if (Math.random() > damageLevel) {
          if (inWindow) {
            addPoint(hx + wx - hw/2, wy, hz + hd/2 - 0.08, 0.2, 0.25, 0.35);
          } else {
            const sidingOffset = Math.floor(wy / 0.15) * 0.002;
            addPoint(hx + wx - hw/2, wy, hz + hd/2 - sidingOffset, baseColor[0], baseColor[1], baseColor[2]);
          }
        }
      }
    }

    // Left wall (negative X face)
    for (let wz = 0; wz <= hd; wz += wallDensity) {
      for (let wy = 0; wy <= hh; wy += wallDensity) {
        const normZ = wz / hd;
        const normY = wy / hh;
        const inWindow = sideWindows.some(w =>
          normZ >= w.z1 && normZ <= w.z2 && normY >= w.y1 && normY <= w.y2);

        if (Math.random() > damageLevel * 0.8) {
          if (inWindow) {
            addPoint(hx - hw/2 + 0.08, wy, hz + wz - hd/2, 0.2, 0.25, 0.35);
          } else {
            const sidingOffset = Math.floor(wy / 0.15) * 0.002;
            addPoint(hx - hw/2 + sidingOffset, wy, hz + wz - hd/2, baseColor[0], baseColor[1], baseColor[2]);
          }
        }
      }
    }

    // Right wall (positive X face)
    for (let wz = 0; wz <= hd; wz += wallDensity) {
      for (let wy = 0; wy <= hh; wy += wallDensity) {
        const normZ = wz / hd;
        const normY = wy / hh;
        const inWindow = sideWindows.some(w =>
          normZ >= w.z1 && normZ <= w.z2 && normY >= w.y1 && normY <= w.y2);

        if (Math.random() > damageLevel * 0.8) {
          if (inWindow) {
            addPoint(hx + hw/2 - 0.08, wy, hz + wz - hd/2, 0.2, 0.25, 0.35);
          } else {
            const sidingOffset = Math.floor(wy / 0.15) * 0.002;
            addPoint(hx + hw/2 - sidingOffset, wy, hz + wz - hd/2, baseColor[0], baseColor[1], baseColor[2]);
          }
        }
      }
    }

    // CORNERS - architectural trim detail
    for (let wy = 0; wy <= hh; wy += wallDensity * 0.5) {
      if (Math.random() > damageLevel) {
        addPoint(hx - hw/2, wy, hz - hd/2, trimColor[0], trimColor[1], trimColor[2]);
        addPoint(hx + hw/2, wy, hz - hd/2, trimColor[0], trimColor[1], trimColor[2]);
        addPoint(hx - hw/2, wy, hz + hd/2, trimColor[0], trimColor[1], trimColor[2]);
        addPoint(hx + hw/2, wy, hz + hd/2, trimColor[0], trimColor[1], trimColor[2]);
      }
    }

    // EAVES (roof overhang) - critical architectural detail
    const eaveOverhang = 0.5;
    const eaveHeight = hh;
    for (let ex = -eaveOverhang; ex <= hw + eaveOverhang; ex += wallDensity * 1.5) {
      addPoint(hx + ex - hw/2, eaveHeight, hz - hd/2 - eaveOverhang, 0.75, 0.7, 0.65);
      addPoint(hx + ex - hw/2, eaveHeight, hz + hd/2 + eaveOverhang, 0.75, 0.7, 0.65);
    }
    for (let ez = -eaveOverhang; ez <= hd + eaveOverhang; ez += wallDensity * 1.5) {
      addPoint(hx - hw/2 - eaveOverhang, eaveHeight, hz + ez - hd/2, 0.75, 0.7, 0.65);
      addPoint(hx + hw/2 + eaveOverhang, eaveHeight, hz + ez - hd/2, 0.75, 0.7, 0.65);
    }

    // ROOF - gable style with shingle texture
    if (house.damage === 'destroyed') {
      // Collapsed roof - massive debris pile
      for (let i = 0; i < 5000; i++) {
        const rx = hx + (Math.random() - 0.5) * hw * 1.6;
        const rz = hz + (Math.random() - 0.5) * hd * 1.6;
        const ry = Math.random() * 2.5;
        const debrisType = Math.random();
        if (debrisType < 0.4) {
          addPoint(rx, ry, rz, roofColor[0] * 0.7, roofColor[1] * 0.7, roofColor[2] * 0.7); // Shingles
        } else if (debrisType < 0.7) {
          addPoint(rx, ry, rz, 0.6, 0.55, 0.4); // Wood
        } else {
          addPoint(rx, ry, rz, baseColor[0] * 0.8, baseColor[1] * 0.8, baseColor[2] * 0.8); // Wall pieces
        }
      }
      // Remaining partial walls
      for (let i = 0; i < 500; i++) {
        const wx = hx + (Math.random() - 0.5) * hw;
        const wz = hz + (Math.random() - 0.5) * hd;
        const wy = Math.random() * hh * 0.5;
        addPoint(wx, wy, wz, baseColor[0], baseColor[1], baseColor[2]);
      }
    } else {
      // Intact pitched roof with shingle rows
      const roofPitch = 0.35;
      const ridgeHeight = hh + (hw/2) * roofPitch;

      // Left slope
      for (let rx = 0; rx <= hw/2; rx += roofDensity) {
        for (let rz = -eaveOverhang; rz <= hd + eaveOverhang; rz += roofDensity) {
          const roofY = hh + rx * roofPitch;
          // Shingle row texture
          const shingleRow = Math.floor(rx / 0.3);
          const shingleOffset = (shingleRow % 2) * 0.15;
          const zPos = rz + shingleOffset;

          const hasDamage = house.damage === 'major' && Math.random() > 0.75;
          if (!hasDamage) {
            addPoint(hx - hw/2 + rx - eaveOverhang, roofY, hz + zPos - hd/2,
              roofColor[0] + (shingleRow % 3) * 0.02, roofColor[1] + (shingleRow % 3) * 0.02, roofColor[2]);
          }
        }
      }

      // Right slope
      for (let rx = 0; rx <= hw/2; rx += roofDensity) {
        for (let rz = -eaveOverhang; rz <= hd + eaveOverhang; rz += roofDensity) {
          const roofY = hh + rx * roofPitch;
          const shingleRow = Math.floor(rx / 0.3);
          const shingleOffset = (shingleRow % 2) * 0.15;
          const zPos = rz + shingleOffset;

          const hasDamage = house.damage === 'major' && Math.random() > 0.75;
          if (!hasDamage) {
            addPoint(hx + hw/2 - rx + eaveOverhang, roofY, hz + zPos - hd/2,
              roofColor[0] + (shingleRow % 3) * 0.02, roofColor[1] + (shingleRow % 3) * 0.02, roofColor[2]);
          }
        }
      }

      // Ridge cap - prominent detail
      for (let rz = -eaveOverhang; rz <= hd + eaveOverhang; rz += roofDensity * 0.5) {
        addPoint(hx, ridgeHeight + 0.05, hz + rz - hd/2, roofColor[0] * 0.85, roofColor[1] * 0.85, roofColor[2] * 0.85);
      }

      // BLUE TARPS on damaged roofs
      if (house.damage === 'major' || house.damage === 'minor') {
        const tarpCoverage = house.damage === 'major' ? 0.5 : 0.25;
        const tarpStartX = (Math.random() > 0.5 ? -1 : 1) * hw * 0.15;
        const tarpWidth = hw * tarpCoverage;
        const tarpDepth = hd * (0.4 + Math.random() * 0.3);
        const tarpStartZ = hz - hd/2 + hd * 0.2;

        for (let tx = 0; tx < tarpWidth; tx += roofDensity * 0.7) {
          for (let tz = 0; tz < tarpDepth; tz += roofDensity * 0.7) {
            const roofY = hh + Math.abs(tarpStartX + tx) * roofPitch + 0.03;
            const billow = Math.sin(tx * 3) * Math.sin(tz * 3) * 0.02;
            addPoint(hx + tarpStartX + tx, roofY + billow, tarpStartZ + tz,
              0.05, 0.2 + Math.random() * 0.05, 0.75 + Math.random() * 0.1);
          }
        }
      }
    }

    // GARAGE (attached)
    if (house.hasGarage && house.damage !== 'destroyed') {
      const gw = 3.5;
      const gd = 5;
      const gh = 3;
      const gx = hx + hw/2 + gw/2;
      const gz = hz - hd/2 + gd/2;

      // Garage walls
      for (let wx = 0; wx <= gw; wx += wallDensity) {
        for (let wy = 0; wy <= gh; wy += wallDensity) {
          if (Math.random() > damageLevel * 0.5) {
            // Front (garage door)
            if (wy > 0.1 && wy < gh - 0.3 && wx > 0.3 && wx < gw - 0.3) {
              addPoint(gx + wx - gw/2, wy, gz - gd/2, 0.7, 0.68, 0.65); // Door panels
            } else {
              addPoint(gx + wx - gw/2, wy, gz - gd/2, baseColor[0] * 0.95, baseColor[1] * 0.95, baseColor[2] * 0.95);
            }
          }
        }
      }
      // Garage roof (flat)
      for (let rx = 0; rx <= gw; rx += roofDensity) {
        for (let rz = 0; rz <= gd; rz += roofDensity) {
          addPoint(gx + rx - gw/2, gh, gz + rz - gd/2, roofColor[0], roofColor[1], roofColor[2]);
        }
      }
    }

    // FRONT PORCH
    if (house.hasPorch && house.damage !== 'destroyed') {
      const pw = hw * 0.5;
      const pd = 2.5;
      const porchHeight = 0.3;

      // Porch deck
      for (let px = 0; px <= pw; px += wallDensity * 2) {
        for (let pz = 0; pz <= pd; pz += wallDensity * 2) {
          addPoint(hx + px - pw/2, porchHeight, hz - hd/2 - pz, 0.45, 0.38, 0.3);
        }
      }
      // Porch steps
      for (let step = 0; step < 3; step++) {
        const stepY = step * 0.1;
        const stepZ = hz - hd/2 - pd - step * 0.25;
        for (let sx = 0; sx <= pw * 0.6; sx += wallDensity * 2) {
          addPoint(hx + sx - pw * 0.3, stepY, stepZ, 0.55, 0.55, 0.53);
        }
      }
      // Porch roof supports (columns)
      if (house.damage !== 'major') {
        for (let cy = porchHeight; cy <= hh * 0.6; cy += wallDensity * 0.5) {
          addPoint(hx - pw/2 + 0.2, cy, hz - hd/2 - pd + 0.2, 0.8, 0.78, 0.75);
          addPoint(hx + pw/2 - 0.2, cy, hz - hd/2 - pd + 0.2, 0.8, 0.78, 0.75);
        }
      }
    }

    // DEBRIS PILE near damaged homes
    if (house.damage === 'destroyed' || house.damage === 'major') {
      const pileX = hx + (Math.random() > 0.5 ? 1 : -1) * (hw/2 + 4);
      const pileZ = hz + (Math.random() - 0.5) * hd;
      const pileRadius = house.damage === 'destroyed' ? 5 : 3;
      const pileHeight = house.damage === 'destroyed' ? 3 : 1.8;

      for (let i = 0; i < 1500; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * pileRadius;
        const h = Math.random() * pileHeight * (1 - r/pileRadius * 0.7);
        const debrisType = Math.random();
        if (debrisType < 0.3) {
          addPoint(pileX + Math.cos(angle) * r, h, pileZ + Math.sin(angle) * r, 0.55, 0.45, 0.35);
        } else if (debrisType < 0.5) {
          addPoint(pileX + Math.cos(angle) * r, h, pileZ + Math.sin(angle) * r, 0.42, 0.38, 0.42);
        } else if (debrisType < 0.7) {
          addPoint(pileX + Math.cos(angle) * r, h, pileZ + Math.sin(angle) * r, 0.78, 0.76, 0.72);
        } else {
          addPoint(pileX + Math.cos(angle) * r, h, pileZ + Math.sin(angle) * r, 0.48, 0.45, 0.4);
        }
      }
    }

    // CHIMNEY
    if ((house.damage === 'intact' || house.damage === 'affected' || house.damage === 'minor') && Math.random() > 0.3) {
      const chimX = hx + hw * 0.25 - hw/2;
      const chimZ = hz + hd * 0.6 - hd/2;
      const chimW = 0.6;
      const chimD = 0.6;
      const roofAtChim = hh + Math.abs(hw * 0.25 - hw/2) * 0.35;
      const chimTop = roofAtChim + 1.5;

      for (let cx = 0; cx <= chimW; cx += wallDensity) {
        for (let cy = roofAtChim - 1; cy <= chimTop; cy += wallDensity) {
          addPoint(chimX + cx - chimW/2, cy, chimZ - chimD/2, 0.5, 0.4, 0.35);
          addPoint(chimX + cx - chimW/2, cy, chimZ + chimD/2, 0.5, 0.4, 0.35);
        }
      }
      for (let cz = 0; cz <= chimD; cz += wallDensity) {
        for (let cy = roofAtChim - 1; cy <= chimTop; cy += wallDensity) {
          addPoint(chimX - chimW/2, cy, chimZ + cz - chimD/2, 0.5, 0.4, 0.35);
          addPoint(chimX + chimW/2, cy, chimZ + cz - chimD/2, 0.5, 0.4, 0.35);
        }
      }
      // Chimney cap
      for (let cx = -0.1; cx <= chimW + 0.1; cx += wallDensity) {
        for (let cz = -0.1; cz <= chimD + 0.1; cz += wallDensity) {
          addPoint(chimX + cx - chimW/2, chimTop + 0.05, chimZ + cz - chimD/2, 0.55, 0.55, 0.53);
        }
      }
    }
  });

  // HIGH DENSITY Trees with realistic canopy
  const trees = [
    { x: -45, z: -42, height: 10, spread: 5 },
    { x: 45, z: -42, height: 9, spread: 4 },
    { x: -45, z: 42, height: 11, spread: 5 },
    { x: 45, z: 42, height: 8, spread: 4 },
    { x: -38, z: 18, height: 12, spread: 6 },
    { x: 42, z: -5, height: 10, spread: 5 },
    { x: 20, z: 22, height: 9, spread: 4 },
    { x: -25, z: -5, height: 8, spread: 4 },
    { x: 5, z: -42, height: 10, spread: 5 },
    { x: -5, z: 25, height: 11, spread: 5 },
  ];

  trees.forEach(tree => {
    // Trunk - detailed
    for (let y = 0; y < tree.height * 0.5; y += 0.08) {
      const trunkRadius = 0.3 * (1 - y / tree.height * 0.3);
      for (let angle = 0; angle < Math.PI * 2; angle += 0.4) {
        addLidarPoint(
          tree.x + Math.cos(angle) * trunkRadius + (Math.random() - 0.5) * 0.05,
          y,
          tree.z + Math.sin(angle) * trunkRadius + (Math.random() - 0.5) * 0.05,
          0.32, 0.22, 0.12, 1);
      }
    }
    // Canopy - dense multi-return through foliage for photorealistic trees
    for (let i = 0; i < 1500; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * tree.spread;
      const heightVar = tree.height * 0.4 + Math.random() * tree.height * 0.6;
      // Multiple returns through canopy
      const returns = Math.random() > 0.6 ? 3 : Math.random() > 0.3 ? 2 : 1;
      addLidarPoint(
        tree.x + Math.cos(angle) * radius,
        heightVar,
        tree.z + Math.sin(angle) * radius,
        0.08 + Math.random() * 0.08, 0.32 + Math.random() * 0.15, 0.06, returns);
    }
  });

  // FALLEN TREES blocking roads - key hurricane damage indicator
  const fallenTrees = [
    { x: -10, z: 0, length: 12, angle: 0.1, blocking: 'road' },  // Across main horizontal road
    { x: 5, z: -25, length: 10, angle: 0.3, blocking: 'road' },   // Across secondary road
    { x: 0, z: 15, length: 14, angle: -0.2, blocking: 'road' },   // Across main vertical road
    { x: -35, z: 20, length: 8, angle: 0.8, blocking: 'yard' },   // In yard area
  ];

  fallenTrees.forEach(tree => {
    const trunkRadius = 0.4;
    const rootBallRadius = 1.2;

    // Root ball (uprooted)
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * rootBallRadius;
      const h = Math.random() * 1.5;
      addLidarPoint(
        tree.x - Math.cos(tree.angle) * tree.length/2 + Math.cos(angle) * r,
        h,
        tree.z - Math.sin(tree.angle) * tree.length/2 + Math.sin(angle) * r,
        0.35 + Math.random() * 0.1, 0.25 + Math.random() * 0.08, 0.15, 2);
    }

    // Trunk lying on ground
    for (let t = 0; t <= 1; t += 0.015) {
      const x = tree.x - Math.cos(tree.angle) * tree.length/2 + Math.cos(tree.angle) * tree.length * t;
      const z = tree.z - Math.sin(tree.angle) * tree.length/2 + Math.sin(tree.angle) * tree.length * t;
      const taperRadius = trunkRadius * (1 - t * 0.6);

      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        const y = taperRadius + Math.sin(a) * taperRadius * 0.5;
        addLidarPoint(
          x + Math.sin(tree.angle) * Math.cos(a) * taperRadius,
          y,
          z + Math.cos(tree.angle) * Math.cos(a) * taperRadius,
          0.38, 0.28, 0.18, 1);
      }
    }

    // Branches and foliage (fallen canopy) - dense for dramatic impact
    for (let i = 0; i < 1000; i++) {
      const t = 0.4 + Math.random() * 0.6; // Branches toward end
      const x = tree.x - Math.cos(tree.angle) * tree.length/2 + Math.cos(tree.angle) * tree.length * t;
      const z = tree.z - Math.sin(tree.angle) * tree.length/2 + Math.sin(tree.angle) * tree.length * t;
      const spread = 3 + (1 - t) * 2;
      addLidarPoint(
        x + (Math.random() - 0.5) * spread,
        Math.random() * 2,
        z + (Math.random() - 0.5) * spread,
        0.1 + Math.random() * 0.1, 0.3 + Math.random() * 0.15, 0.08, Math.random() > 0.5 ? 2 : 1);
    }
  });

  // Flooded area with water surface
  for (let x = -50; x < -15; x += 0.2) {
    for (let z = -50; z < -20; z += 0.2) {
      // Water surface - single return, very flat
      addPoint(x, -0.35 + Math.sin(x * 0.5 + z * 0.3) * 0.02, z,
        0.15 + Math.random() * 0.05, 0.25 + Math.random() * 0.05, 0.45 + Math.random() * 0.1);
    }
  }

  // Scattered debris across scene - high density for realism
  for (let i = 0; i < 12000; i++) {
    const dx = (Math.random() - 0.5) * 100;
    const dz = (Math.random() - 0.5) * 100;
    const debrisType = Math.random();
    if (debrisType < 0.25) {
      // Wood
      addLidarPoint(dx, Math.random() * 0.25, dz, 0.45, 0.38, 0.28, 1);
    } else if (debrisType < 0.45) {
      // Metal
      addLidarPoint(dx, Math.random() * 0.2, dz, 0.55, 0.55, 0.58, 1);
    } else if (debrisType < 0.6) {
      // Shingles
      addLidarPoint(dx, Math.random() * 0.15, dz, 0.35, 0.32, 0.38, 1);
    } else {
      // General debris
      addLidarPoint(dx, Math.random() * 0.3, dz, 0.38, 0.35, 0.32, 1);
    }
  }

  // Downed power lines
  const powerPoles = [
    { x1: -45, z1: -3, x2: -20, z2: -3 },
    { x1: 20, z1: 3, x2: 45, z2: 3 },
  ];
  powerPoles.forEach(line => {
    // Poles
    [{ x: line.x1, z: line.z1 }, { x: line.x2, z: line.z2 }].forEach(pole => {
      for (let y = 0; y < 8; y += 0.1) {
        addLidarPoint(pole.x + (Math.random() - 0.5) * 0.1, y, pole.z + (Math.random() - 0.5) * 0.1, 0.4, 0.35, 0.3, 1);
      }
    });
    // Downed wires
    for (let t = 0; t < 1; t += 0.02) {
      const x = line.x1 + (line.x2 - line.x1) * t;
      const z = line.z1 + (line.z2 - line.z1) * t;
      const sag = Math.sin(t * Math.PI) * 5; // Wire sag
      addLidarPoint(x, Math.max(0.1, 7 - sag + Math.random() * 0.2), z, 0.2, 0.2, 0.22, 1);
    }
  });

  // Vehicles (damaged/abandoned)
  const vehicles = [
    { x: -28, z: -2, rot: 0.2 },
    { x: 18, z: 2, rot: -0.1 },
    { x: -5, z: -27, rot: 0.8 },
  ];
  vehicles.forEach(v => {
    for (let vx = -2; vx < 2; vx += 0.15) {
      for (let vz = -1; vz < 1; vz += 0.15) {
        const rx = vx * Math.cos(v.rot) - vz * Math.sin(v.rot);
        const rz = vx * Math.sin(v.rot) + vz * Math.cos(v.rot);
        const height = Math.abs(vx) < 1.5 ? 1.2 : 0.8;
        addLidarPoint(v.x + rx, height, v.z + rz, 0.4, 0.4, 0.45, 1);
      }
    }
  });

  return {
    positions: new Float32Array(points),
    colors: new Float32Array(colors),
    stats: { totalPoints: points.length / 3, structuresDetected, severelyDamaged, moderatelyDamaged, intact }
  };
}

// Point Cloud Component - using CUSTOM SHADERS for photorealistic rendering
function PointCloud({ pointSize }: { pointSize: number }) {
  const { positions, colors } = useMemo(() => generateNeighborhoodData(), []);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Generate size and intensity attributes for each point
  const { sizes, intensities } = useMemo(() => {
    const pointCount = positions.length / 3;
    const sizes = new Float32Array(pointCount);
    const intensities = new Float32Array(pointCount);

    for (let i = 0; i < pointCount; i++) {
      // Vary point sizes slightly for organic feel
      sizes[i] = 0.15 + Math.random() * 0.1;

      // Intensity based on position and random variation (simulates reflectance)
      const y = positions[i * 3 + 1];
      intensities[i] = 0.6 + Math.random() * 0.4 + (y > 5 ? 0.2 : 0);
    }

    return { sizes, intensities };
  }, [positions]);

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometryRef.current.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometryRef.current.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
    }
  }, [positions, colors, sizes, intensities]);

  // Update point size uniform when slider changes
  useEffect(() => {
    if (materialRef.current) {
      // Scale the base size
      const geometry = geometryRef.current;
      if (geometry) {
        const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
        const baseSize = 0.15;
        for (let i = 0; i < sizeAttr.count; i++) {
          sizeAttr.array[i] = (baseSize + Math.random() * 0.1) * (pointSize / 2);
        }
        sizeAttr.needsUpdate = true;
      }
    }
  }, [pointSize]);

  // Shader uniforms
  const uniforms = useMemo(() => ({
    fogColor: { value: new THREE.Color(0x080810) },
    fogNear: { value: 30.0 },
    fogFar: { value: 120.0 },
    lightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    ambientStrength: { value: 0.35 },
  }), []);

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geometryRef} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

// Grid Helper
function Grid() {
  return <gridHelper args={[100, 50, 0x444444, 0x222222]} position={[0, -0.5, 0]} />;
}

export const LidarViewerTool: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [pointSize, setPointSize] = useState(2);
  const [showInfo, setShowInfo] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const controlsRef = useRef<any>(null);

  const stats = useMemo(() => generateNeighborhoodData().stats, []);

  // Auto-dismiss welcome
  React.useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const containerClass = isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-180px)]';

  return (
    <div className={`${containerClass} flex flex-col bg-slate-950`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-cyan-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white">LiDAR Point Cloud Viewer</span>
            <span className="text-xs text-slate-500 ml-2">DJI L3 Simulation</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800">
            <span className="text-xs text-slate-400">Points:</span>
            <input type="range" min="1" max="5" step="0.5" value={pointSize}
              onChange={(e) => setPointSize(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300" title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={resetCamera}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300" title="Reset view">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-colors ${showInfo ? 'bg-cyan-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
            title="Toggle info panel">
            <Info className="w-4 h-4" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Canvas - PHOTOREALISTIC RENDERING */}
      <div className="flex-1 relative">
        <Canvas
          style={{ background: isDarkMode ? '#080810' : '#e8e8f0' }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
          }}
          dpr={[1, 2]}
        >
          <PerspectiveCamera makeDefault position={[60, 40, 60]} fov={50} near={1} far={500} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={10}
            maxDistance={180}
            maxPolarAngle={Math.PI / 2.1}
          />

          {/* CINEMATIC MULTI-LIGHT SETUP */}
          {/* Key light - warm afternoon sun from upper right */}
          <directionalLight
            position={[50, 80, 30]}
            intensity={1.8}
            color={0xfff4e6}
          />

          {/* Fill light - cool sky bounce from opposite side */}
          <directionalLight
            position={[-40, 50, -40]}
            intensity={0.5}
            color={0xb0d4ff}
          />

          {/* Rim light - dramatic edge definition, sunset orange */}
          <directionalLight
            position={[0, 35, -70]}
            intensity={0.7}
            color={0xff9955}
          />

          {/* Ambient - very subtle base illumination */}
          <ambientLight intensity={0.15} color={isDarkMode ? 0x303040 : 0x808090} />

          {/* Scene fog for depth perception */}
          <fog attach="fog" args={[isDarkMode ? '#080810' : '#e8e8f0', 50, 200]} />

          <PointCloud pointSize={pointSize} />
          <Grid />

          {/* POST-PROCESSING EFFECTS */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.7}
              luminanceSmoothing={0.8}
              intensity={0.6}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>

        {/* Stats Panel */}
        {stats && showInfo && (
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700 pointer-events-none">
            <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Scan Analysis
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-8">
                <span className="text-slate-400">Total Points:</span>
                <span className="text-white font-mono">{stats.totalPoints.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-slate-400">Structures Detected:</span>
                <span className="text-white font-mono">{stats.structuresDetected}</span>
              </div>
              <hr className="border-slate-700 my-2" />
              <div className="flex justify-between gap-8">
                <span className="text-red-400">Severe Damage:</span>
                <span className="text-red-400 font-mono">{stats.severelyDamaged}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-yellow-400">Moderate Damage:</span>
                <span className="text-yellow-400 font-mono">{stats.moderatelyDamaged}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-green-400">Intact:</span>
                <span className="text-green-400 font-mono">{stats.intact}</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        {showInfo && (
          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700 pointer-events-none">
            <h3 className="text-sm font-bold text-white mb-3">FEMA PDA Classification</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600" /><span className="text-slate-300">Destroyed</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-slate-300">Major Damage</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400" /><span className="text-slate-300">Minor Damage</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400" /><span className="text-slate-300">Affected</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-slate-300">Intact</span></div>
              <hr className="border-slate-700 my-2" />
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600" /><span className="text-slate-300">Blue Tarp (temp repair)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-700" /><span className="text-slate-300">Fallen Tree</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-600" /><span className="text-slate-300">Flooded Area</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-500" /><span className="text-slate-300">Roads</span></div>
            </div>
          </div>
        )}

        {/* Controls Help */}
        {showInfo && (
          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-slate-700 pointer-events-none">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1"><Move3d className="w-3 h-3" /><span>Drag to orbit</span></div>
              <div className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /><span>Scroll to zoom</span></div>
              <span>Right-drag to pan</span>
            </div>
          </div>
        )}

        {/* DJI Badge */}
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-slate-700 pointer-events-none">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Simulated Output</div>
            <div className="text-sm font-bold text-white">DJI Zenmuse L3</div>
            <div className="text-[10px] text-cyan-400">450m altitude • 5 returns • Night capable</div>
          </div>
        </div>

        {/* Welcome Overlay */}
        {showWelcome && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            onClick={() => setShowWelcome(false)}>
            <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/50 max-w-md text-center">
              <AlertTriangle className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Post-Hurricane Assessment</h3>
              <p className="text-sm text-slate-300">
                LiDAR captures structural damage in complete darkness, through smoke, and in areas inaccessible due to flooding or debris.
              </p>
              <p className="text-xs text-cyan-400 mt-3 animate-pulse">Click anywhere or wait to explore</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LidarViewerTool;
