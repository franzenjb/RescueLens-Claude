import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import {
  Maximize2, Minimize2, RotateCcw, Sun, Moon,
  AlertTriangle, Info, ZoomIn, ZoomOut, Move3d, Eye
} from 'lucide-react';

// ============================================
// AAA GAME QUALITY SHADERS - HALO/FLIGHT SIM LEVEL
// ============================================

const vertexShader = `
  attribute float size;
  attribute float intensity;
  attribute float roughness;

  varying vec3 vColor;
  varying float vDepth;
  varying float vIntensity;
  varying float vRoughness;
  varying vec3 vWorldPosition;

  void main() {
    vColor = color;
    vIntensity = intensity;
    vRoughness = roughness;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;

    // Point scale for good coverage
    float pointScale = 550.0;
    gl_PointSize = size * (pointScale / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 3.0, 35.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vDepth;
  varying float vIntensity;
  varying float vRoughness;
  varying vec3 vWorldPosition;

  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform vec3 skyColor;
  uniform vec3 groundColor;
  uniform float time;

  // Fresnel effect for realistic edges
  float fresnel(vec3 normal, vec3 viewDir, float power) {
    return pow(1.0 - max(dot(normal, viewDir), 0.0), power);
  }

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    // Soft circular point with high-quality anti-aliasing
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.35, 0.5, dist);

    // Generate surface normal from point coordinate
    float z = sqrt(max(0.0, 1.0 - 4.0 * dot(center, center)));
    vec3 normal = normalize(vec3(center * 2.0, z));

    // PBR-style lighting
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // Diffuse (Lambert)
    float NdotL = max(dot(normal, sunDirection), 0.0);
    vec3 diffuse = vColor * NdotL * sunColor;

    // Ambient (hemisphere lighting)
    float hemisphere = normal.y * 0.5 + 0.5;
    vec3 ambient = mix(groundColor, skyColor, hemisphere) * vColor * 0.4;

    // Specular (Blinn-Phong with roughness)
    vec3 halfDir = normalize(sunDirection + viewDir);
    float specPower = mix(128.0, 8.0, vRoughness);
    float spec = pow(max(dot(normal, halfDir), 0.0), specPower);
    vec3 specular = sunColor * spec * (1.0 - vRoughness) * 0.5;

    // Fresnel rim lighting
    float rim = fresnel(normal, viewDir, 3.0);
    vec3 rimLight = skyColor * rim * 0.3;

    // Combine lighting
    vec3 litColor = ambient + diffuse * 0.8 + specular + rimLight;

    // Atmospheric scattering (distance fog with color shift)
    float fogFactor = smoothstep(fogNear, fogFar, vDepth);
    vec3 atmosphereColor = mix(fogColor, skyColor * 0.5, 0.3);
    litColor = mix(litColor, atmosphereColor, fogFactor * 0.8);

    // Subtle color variation for realism
    litColor *= (0.9 + vIntensity * 0.2);

    // Tone mapping (ACES-like)
    litColor = litColor / (litColor + vec3(1.0));
    litColor = pow(litColor, vec3(1.0 / 2.2));

    gl_FragColor = vec4(litColor, alpha);
  }
`;

interface PointCloudStats {
  totalPoints: number;
  structuresDetected: number;
  severelyDamaged: number;
  moderatelyDamaged: number;
  intact: number;
}

// ============================================
// ULTRA HIGH DENSITY REALISTIC SCENE GENERATOR
// ============================================
function generateNeighborhoodData(): {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  intensities: Float32Array;
  roughnesses: Float32Array;
  stats: PointCloudStats
} {
  const points: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const intensities: number[] = [];
  const roughnesses: number[] = [];

  let structuresDetected = 0;
  let severelyDamaged = 0;
  let moderatelyDamaged = 0;
  let intact = 0;

  // Helper to add a point with all attributes
  const addPoint = (
    x: number, y: number, z: number,
    r: number, g: number, b: number,
    size: number = 0.12,
    intensity: number = 0.8,
    roughness: number = 0.5
  ) => {
    // Add slight noise for organic feel
    points.push(
      x + (Math.random() - 0.5) * 0.008,
      y + (Math.random() - 0.5) * 0.008,
      z + (Math.random() - 0.5) * 0.008
    );
    // Slight color variation
    colors.push(
      r * (0.95 + Math.random() * 0.1),
      g * (0.95 + Math.random() * 0.1),
      b * (0.95 + Math.random() * 0.1)
    );
    sizes.push(size * (0.9 + Math.random() * 0.2));
    intensities.push(intensity * (0.9 + Math.random() * 0.2));
    roughnesses.push(roughness);
  };

  // REALISTIC MATERIAL COLORS (not damage classification)
  const materials = {
    // Siding colors
    whiteSiding: { r: 0.92, g: 0.90, b: 0.88, roughness: 0.7 },
    graySiding: { r: 0.55, g: 0.55, b: 0.58, roughness: 0.65 },
    beigeStucco: { r: 0.85, g: 0.78, b: 0.68, roughness: 0.8 },
    brickRed: { r: 0.6, g: 0.25, b: 0.2, roughness: 0.85 },
    blueSiding: { r: 0.45, g: 0.55, b: 0.7, roughness: 0.6 },
    yellowSiding: { r: 0.9, g: 0.85, b: 0.6, roughness: 0.65 },
    greenSiding: { r: 0.5, g: 0.6, b: 0.45, roughness: 0.7 },

    // Roof colors
    asphaltShingle: { r: 0.25, g: 0.23, b: 0.22, roughness: 0.9 },
    brownShingle: { r: 0.35, g: 0.28, b: 0.22, roughness: 0.85 },
    grayShingle: { r: 0.4, g: 0.4, b: 0.42, roughness: 0.8 },
    terracotta: { r: 0.7, g: 0.4, b: 0.3, roughness: 0.75 },

    // Other materials
    concrete: { r: 0.6, g: 0.58, b: 0.55, roughness: 0.95 },
    asphalt: { r: 0.18, g: 0.18, b: 0.2, roughness: 0.9 },
    grass: { r: 0.25, g: 0.45, b: 0.2, roughness: 0.95 },
    dirtGrass: { r: 0.35, g: 0.38, b: 0.25, roughness: 0.95 },
    wood: { r: 0.5, g: 0.38, b: 0.28, roughness: 0.8 },
    darkWood: { r: 0.3, g: 0.22, b: 0.18, roughness: 0.75 },
    glass: { r: 0.4, g: 0.5, b: 0.6, roughness: 0.1 },
    metal: { r: 0.7, g: 0.7, b: 0.72, roughness: 0.3 },
    blueTarp: { r: 0.15, g: 0.35, b: 0.7, roughness: 0.4 },
    water: { r: 0.2, g: 0.35, b: 0.5, roughness: 0.05 },
    debris: { r: 0.45, g: 0.4, b: 0.35, roughness: 0.9 },
  };

  // ============================================
  // GROUND - Optimized density for performance
  // ============================================
  const groundSpacing = 0.12;  // Larger spacing with bigger points
  for (let x = -55; x < 55; x += groundSpacing) {
    for (let z = -55; z < 55; z += groundSpacing) {
      const noise = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.15 +
                   Math.sin(x * 0.2 + 1) * Math.cos(z * 0.15) * 0.05;
      const y = noise + (Math.random() - 0.5) * 0.02;

      // Vary grass color based on position
      const grassVar = Math.random();
      const isPath = Math.abs(x) < 1.5 || Math.abs(z) < 1.5;

      if (isPath) {
        // Sidewalks/paths
        addPoint(x, y - 0.02, z,
          materials.concrete.r, materials.concrete.g, materials.concrete.b,
          0.18, 0.7, materials.concrete.roughness);
      } else if (grassVar > 0.85) {
        // Bare dirt patches
        addPoint(x, y, z,
          materials.dirtGrass.r, materials.dirtGrass.g, materials.dirtGrass.b,
          0.18, 0.6, 0.95);
      } else {
        // Grass with variation
        const grassIntensity = 0.7 + Math.random() * 0.3;
        addPoint(x, y, z,
          materials.grass.r * grassIntensity,
          materials.grass.g * (0.9 + Math.random() * 0.2),
          materials.grass.b * grassIntensity,
          0.18, 0.75, materials.grass.roughness);
      }
    }
  }

  // ============================================
  // ROADS with realistic asphalt texture
  // ============================================
  const roadSpacing = 0.08;  // Optimized for performance
  const roads = [
    { x1: -60, z1: 0, x2: 60, z2: 0, width: 6 },
    { x1: 0, z1: -60, x2: 0, z2: 60, width: 6 },
    { x1: -60, z1: 30, x2: 60, z2: 30, width: 5 },
    { x1: -60, z1: -30, x2: 60, z2: -30, width: 5 },
    { x1: 30, z1: -60, x2: 30, z2: 60, width: 5 },
    { x1: -30, z1: -60, x2: -30, z2: 60, width: 5 },
  ];

  roads.forEach(road => {
    const isHorizontal = road.z1 === road.z2;
    const length = isHorizontal ? Math.abs(road.x2 - road.x1) : Math.abs(road.z2 - road.z1);

    for (let t = 0; t <= 1; t += roadSpacing / length) {
      for (let w = -road.width / 2; w < road.width / 2; w += roadSpacing) {
        const x = road.x1 + (road.x2 - road.x1) * t + (isHorizontal ? 0 : w);
        const z = road.z1 + (road.z2 - road.z1) * t + (isHorizontal ? w : 0);

        const isCenterLine = Math.abs(w) < 0.08;
        const isEdgeLine = Math.abs(Math.abs(w) - road.width / 2 + 0.2) < 0.08;
        const isDashed = Math.floor(t * length / 3) % 2 === 0;

        if (isCenterLine && isDashed) {
          // Yellow center line
          addPoint(x, -0.05, z, 0.85, 0.75, 0.15, 0.12, 0.9, 0.6);
        } else if (isEdgeLine) {
          // White edge lines
          addPoint(x, -0.05, z, 0.9, 0.9, 0.9, 0.12, 0.85, 0.5);
        } else {
          // Asphalt with texture variation
          const asphaltVar = 0.9 + Math.random() * 0.2;
          addPoint(x, -0.06 + Math.random() * 0.01, z,
            materials.asphalt.r * asphaltVar,
            materials.asphalt.g * asphaltVar,
            materials.asphalt.b * asphaltVar,
            0.14, 0.5, materials.asphalt.roughness);
        }
      }
    }
  });

  // ============================================
  // REALISTIC HOUSES with proper materials
  // ============================================
  const houses = [
    { x: -20, z: -20, w: 12, d: 14, h: 7, siding: 'whiteSiding', roof: 'asphaltShingle', damage: 'destroyed' },
    { x: 20, z: -20, w: 14, d: 12, h: 8, siding: 'beigeStucco', roof: 'terracotta', damage: 'destroyed' },
    { x: -20, z: 20, w: 11, d: 13, h: 6.5, siding: 'graySiding', roof: 'brownShingle', damage: 'major' },
    { x: 20, z: 20, w: 13, d: 11, h: 7.5, siding: 'brickRed', roof: 'grayShingle', damage: 'major' },
    { x: -45, z: -20, w: 10, d: 12, h: 6, siding: 'blueSiding', roof: 'asphaltShingle', damage: 'major' },
    { x: 45, z: -20, w: 12, d: 10, h: 7, siding: 'yellowSiding', roof: 'brownShingle', damage: 'minor' },
    { x: -45, z: 20, w: 11, d: 11, h: 6.5, siding: 'whiteSiding', roof: 'grayShingle', damage: 'minor' },
    { x: 45, z: 20, w: 10, d: 13, h: 6, siding: 'greenSiding', roof: 'asphaltShingle', damage: 'minor' },
    { x: -20, z: 45, w: 13, d: 12, h: 7, siding: 'beigeStucco', roof: 'terracotta', damage: 'intact' },
    { x: 20, z: 45, w: 11, d: 14, h: 6.5, siding: 'graySiding', roof: 'brownShingle', damage: 'intact' },
    { x: -20, z: -45, w: 12, d: 11, h: 7.5, siding: 'whiteSiding', roof: 'asphaltShingle', damage: 'intact' },
    { x: 20, z: -45, w: 14, d: 13, h: 8, siding: 'brickRed', roof: 'grayShingle', damage: 'intact' },
    { x: -45, z: 45, w: 10, d: 10, h: 6, siding: 'yellowSiding', roof: 'brownShingle', damage: 'intact' },
    { x: 45, z: 45, w: 11, d: 12, h: 6.5, siding: 'blueSiding', roof: 'grayShingle', damage: 'intact' },
    { x: -45, z: -45, w: 12, d: 11, h: 7, siding: 'greenSiding', roof: 'asphaltShingle', damage: 'intact' },
    { x: 45, z: -45, w: 13, d: 10, h: 7.5, siding: 'beigeStucco', roof: 'terracotta', damage: 'intact' },
  ];

  const wallSpacing = 0.05;  // Optimized - use larger points for coverage
  const roofSpacing = 0.055;

  houses.forEach(house => {
    structuresDetected++;
    const siding = materials[house.siding as keyof typeof materials];
    const roof = materials[house.roof as keyof typeof materials];
    const damageLevel = house.damage === 'destroyed' ? 0.7 :
                       house.damage === 'major' ? 0.3 :
                       house.damage === 'minor' ? 0.1 : 0;

    if (house.damage === 'destroyed') severelyDamaged++;
    else if (house.damage === 'major') severelyDamaged++;
    else if (house.damage === 'minor') moderatelyDamaged++;
    else intact++;

    const hx = house.x, hz = house.z;
    const hw = house.w, hd = house.d, hh = house.h;

    // Foundation
    for (let fx = -0.3; fx <= hw + 0.3; fx += wallSpacing * 3) {
      for (let fz = -0.3; fz <= hd + 0.3; fz += wallSpacing * 3) {
        addPoint(hx + fx - hw/2, 0.03, hz + fz - hd/2,
          materials.concrete.r, materials.concrete.g, materials.concrete.b,
          0.12, 0.6, materials.concrete.roughness);
      }
    }

    if (house.damage === 'destroyed') {
      // DESTROYED - Debris pile where house was
      for (let i = 0; i < 2500; i++) {  // Reduced for performance
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * Math.max(hw, hd) * 0.8;
        const h = Math.random() * 3 * (1 - r / Math.max(hw, hd));
        const dx = hx + Math.cos(angle) * r;
        const dz = hz + Math.sin(angle) * r;

        const debrisType = Math.random();
        if (debrisType < 0.3) {
          // Roof debris
          addPoint(dx, h, dz, roof.r * 0.8, roof.g * 0.8, roof.b * 0.8, 0.22, 0.5, 0.9);
        } else if (debrisType < 0.6) {
          // Wall debris
          addPoint(dx, h, dz, siding.r * 0.7, siding.g * 0.7, siding.b * 0.7, 0.2, 0.5, 0.85);
        } else if (debrisType < 0.8) {
          // Wood framing
          addPoint(dx, h, dz, materials.wood.r, materials.wood.g, materials.wood.b, 0.18, 0.6, 0.8);
        } else {
          // Mixed debris
          addPoint(dx, h, dz, materials.debris.r, materials.debris.g, materials.debris.b, 0.18, 0.4, 0.95);
        }
      }
      // Partial remaining walls
      for (let i = 0; i < 600; i++) {  // Reduced
        const wx = hx + (Math.random() - 0.5) * hw;
        const wz = hz + (Math.random() - 0.5) * hd;
        const wy = Math.random() * hh * 0.4;
        addPoint(wx, wy, wz, siding.r * 0.8, siding.g * 0.8, siding.b * 0.8, 0.15, 0.6, siding.roughness);
      }
    } else {
      // STANDING STRUCTURE - Dense walls
      // Front wall
      for (let wx = 0; wx <= hw; wx += wallSpacing) {
        for (let wy = 0; wy <= hh; wy += wallSpacing) {
          if (Math.random() > damageLevel) {
            const normX = wx / hw, normY = wy / hh;
            const isWindow = (normX > 0.1 && normX < 0.35 && normY > 0.4 && normY < 0.75) ||
                           (normX > 0.65 && normX < 0.9 && normY > 0.4 && normY < 0.75);
            const isDoor = normX > 0.4 && normX < 0.6 && normY < 0.55;

            if (isWindow) {
              addPoint(hx + wx - hw/2, wy, hz - hd/2 + 0.05,
                materials.glass.r, materials.glass.g, materials.glass.b, 0.12, 0.9, materials.glass.roughness);
            } else if (isDoor) {
              addPoint(hx + wx - hw/2, wy, hz - hd/2 + 0.03,
                materials.darkWood.r, materials.darkWood.g, materials.darkWood.b, 0.14, 0.7, materials.darkWood.roughness);
            } else {
              addPoint(hx + wx - hw/2, wy, hz - hd/2, siding.r, siding.g, siding.b, 0.14, 0.75, siding.roughness);
            }
          }
        }
      }
      // Back wall
      for (let wx = 0; wx <= hw; wx += wallSpacing) {
        for (let wy = 0; wy <= hh; wy += wallSpacing) {
          if (Math.random() > damageLevel * 0.8) {
            addPoint(hx + wx - hw/2, wy, hz + hd/2, siding.r, siding.g, siding.b, 0.14, 0.7, siding.roughness);
          }
        }
      }
      // Left wall
      for (let wz = 0; wz <= hd; wz += wallSpacing) {
        for (let wy = 0; wy <= hh; wy += wallSpacing) {
          if (Math.random() > damageLevel * 0.8) {
            addPoint(hx - hw/2, wy, hz + wz - hd/2, siding.r * 0.9, siding.g * 0.9, siding.b * 0.9, 0.14, 0.7, siding.roughness);
          }
        }
      }
      // Right wall
      for (let wz = 0; wz <= hd; wz += wallSpacing) {
        for (let wy = 0; wy <= hh; wy += wallSpacing) {
          if (Math.random() > damageLevel * 0.8) {
            addPoint(hx + hw/2, wy, hz + wz - hd/2, siding.r * 0.95, siding.g * 0.95, siding.b * 0.95, 0.14, 0.7, siding.roughness);
          }
        }
      }

      // ROOF
      const roofPitch = 0.4;
      const ridgeHeight = hh + (hw / 2) * roofPitch;
      const overhang = 0.6;

      for (let rx = 0; rx <= hw / 2 + overhang; rx += roofSpacing) {
        for (let rz = -overhang; rz <= hd + overhang; rz += roofSpacing) {
          if (Math.random() > damageLevel) {
            const roofY = hh + rx * roofPitch;
            // Shingle texture variation
            const shingleVar = 0.9 + Math.random() * 0.15;
            // Left slope
            addPoint(hx - hw/2 + rx - overhang, roofY, hz + rz - hd/2,
              roof.r * shingleVar, roof.g * shingleVar, roof.b * shingleVar, 0.15, 0.65, roof.roughness);
            // Right slope
            addPoint(hx + hw/2 - rx + overhang, roofY, hz + rz - hd/2,
              roof.r * shingleVar, roof.g * shingleVar, roof.b * shingleVar, 0.15, 0.65, roof.roughness);
          }
        }
      }

      // Ridge cap
      for (let rz = -overhang; rz <= hd + overhang; rz += roofSpacing * 0.8) {
        addPoint(hx, ridgeHeight + 0.05, hz + rz - hd/2,
          roof.r * 0.8, roof.g * 0.8, roof.b * 0.8, 0.16, 0.6, roof.roughness);
      }

      // Blue tarp on damaged roofs
      if (house.damage === 'major' || house.damage === 'minor') {
        const tarpSize = house.damage === 'major' ? 0.5 : 0.25;
        const tarpX = (Math.random() - 0.5) * hw * 0.3;
        const tarpW = hw * tarpSize;
        const tarpD = hd * tarpSize;

        for (let tx = 0; tx < tarpW; tx += roofSpacing * 0.8) {
          for (let tz = 0; tz < tarpD; tz += roofSpacing * 0.8) {
            const roofY = hh + Math.abs(tarpX + tx - hw/4) * roofPitch + 0.08;
            const billow = Math.sin(tx * 4) * Math.sin(tz * 4) * 0.03;
            addPoint(hx + tarpX + tx - tarpW/2, roofY + billow, hz + tz - tarpD/2,
              materials.blueTarp.r, materials.blueTarp.g, materials.blueTarp.b,
              0.14, 0.85, materials.blueTarp.roughness);
          }
        }
      }
    }
  });

  // ============================================
  // TREES - Dense realistic foliage
  // ============================================
  const trees = [
    { x: -55, z: -55, h: 14, r: 6 }, { x: 55, z: -55, h: 12, r: 5 },
    { x: -55, z: 55, h: 15, r: 7 }, { x: 55, z: 55, h: 13, r: 5 },
    { x: -35, z: 10, h: 11, r: 5 }, { x: 35, z: -10, h: 12, r: 5 },
    { x: 10, z: 35, h: 10, r: 4 }, { x: -10, z: -35, h: 13, r: 6 },
    { x: -50, z: 0, h: 11, r: 5 }, { x: 50, z: 0, h: 12, r: 5 },
    { x: 0, z: 50, h: 14, r: 6 }, { x: 0, z: -50, h: 13, r: 5 },
  ];

  trees.forEach(tree => {
    // Trunk
    for (let y = 0; y < tree.h * 0.4; y += 0.06) {
      const trunkR = 0.4 * (1 - y / tree.h * 0.4);
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        addPoint(
          tree.x + Math.cos(a) * trunkR,
          y,
          tree.z + Math.sin(a) * trunkR,
          0.35, 0.25, 0.18, 0.1, 0.6, 0.85);
      }
    }
    // Canopy - optimized density
    for (let i = 0; i < 800; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * tree.r;
      const h = tree.h * 0.35 + Math.random() * tree.h * 0.65;
      addPoint(
        tree.x + Math.cos(a) * r,
        h,
        tree.z + Math.sin(a) * r,
        0.12 + Math.random() * 0.1,
        0.35 + Math.random() * 0.2,
        0.1 + Math.random() * 0.08,
        0.2, 0.7, 0.9);
    }
  });

  // ============================================
  // FALLEN TREES blocking roads
  // ============================================
  const fallenTrees = [
    { x: -8, z: 1, len: 14, angle: 0.1 },
    { x: 8, z: -30, len: 12, angle: 0.3 },
    { x: 1, z: 12, len: 15, angle: -0.2 },
  ];

  fallenTrees.forEach(ft => {
    // Root ball
    for (let i = 0; i < 300; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.5;
      const h = Math.random() * 2;
      addPoint(
        ft.x - Math.cos(ft.angle) * ft.len/2 + Math.cos(a) * r,
        h,
        ft.z - Math.sin(ft.angle) * ft.len/2 + Math.sin(a) * r,
        0.4, 0.3, 0.2, 0.13, 0.5, 0.9);
    }
    // Trunk
    for (let t = 0; t < 1; t += 0.01) {
      const x = ft.x - Math.cos(ft.angle) * ft.len/2 + Math.cos(ft.angle) * ft.len * t;
      const z = ft.z - Math.sin(ft.angle) * ft.len/2 + Math.sin(ft.angle) * ft.len * t;
      const taper = 0.5 * (1 - t * 0.7);
      for (let a = 0; a < Math.PI * 2; a += 0.4) {
        addPoint(x, taper + 0.3, z, 0.4, 0.28, 0.2, 0.11, 0.55, 0.85);
      }
    }
    // Fallen canopy
    for (let i = 0; i < 1500; i++) {
      const t = 0.5 + Math.random() * 0.5;
      const x = ft.x - Math.cos(ft.angle) * ft.len/2 + Math.cos(ft.angle) * ft.len * t;
      const z = ft.z - Math.sin(ft.angle) * ft.len/2 + Math.sin(ft.angle) * ft.len * t;
      addPoint(
        x + (Math.random() - 0.5) * 4,
        Math.random() * 2.5,
        z + (Math.random() - 0.5) * 4,
        0.15 + Math.random() * 0.1, 0.35 + Math.random() * 0.15, 0.12,
        0.11, 0.6, 0.9);
    }
  });

  // Standing water / flooding
  for (let x = -60; x < -25; x += 0.08) {
    for (let z = -60; z < -35; z += 0.08) {
      addPoint(x, -0.2 + Math.sin(x * 0.3 + z * 0.2) * 0.02, z,
        materials.water.r, materials.water.g, materials.water.b,
        0.15, 0.95, materials.water.roughness);
    }
  }

  // Scattered debris
  for (let i = 0; i < 15000; i++) {
    const dx = (Math.random() - 0.5) * 120;
    const dz = (Math.random() - 0.5) * 120;
    const type = Math.random();
    if (type < 0.3) {
      addPoint(dx, Math.random() * 0.3, dz, 0.5, 0.42, 0.32, 0.1, 0.5, 0.9);
    } else if (type < 0.5) {
      addPoint(dx, Math.random() * 0.2, dz, 0.6, 0.58, 0.55, 0.09, 0.45, 0.85);
    } else if (type < 0.7) {
      addPoint(dx, Math.random() * 0.15, dz, 0.35, 0.32, 0.35, 0.08, 0.4, 0.9);
    } else {
      addPoint(dx, Math.random() * 0.25, dz, materials.debris.r, materials.debris.g, materials.debris.b, 0.1, 0.5, 0.95);
    }
  }

  return {
    positions: new Float32Array(points),
    colors: new Float32Array(colors),
    sizes: new Float32Array(sizes),
    intensities: new Float32Array(intensities),
    roughnesses: new Float32Array(roughnesses),
    stats: { totalPoints: points.length / 3, structuresDetected, severelyDamaged, moderatelyDamaged, intact }
  };
}

// ============================================
// POINT CLOUD COMPONENT WITH AAA SHADERS
// ============================================
function PointCloud({ pointSize }: { pointSize: number }) {
  const { positions, colors, sizes, intensities, roughnesses } = useMemo(() => generateNeighborhoodData(), []);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometryRef.current.setAttribute('size', new THREE.BufferAttribute(
        sizes.map(s => s * pointSize / 2), 1
      ));
      geometryRef.current.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
      geometryRef.current.setAttribute('roughness', new THREE.BufferAttribute(roughnesses, 1));
    }
  }, [positions, colors, sizes, intensities, roughnesses, pointSize]);

  // Animate time uniform for subtle effects
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime();
    }
  });

  const uniforms = useMemo(() => ({
    fogColor: { value: new THREE.Color(0x1a1a2e) },
    fogNear: { value: 40.0 },
    fogFar: { value: 150.0 },
    sunDirection: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
    sunColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
    skyColor: { value: new THREE.Color(0.6, 0.75, 0.95) },
    groundColor: { value: new THREE.Color(0.2, 0.18, 0.15) },
    time: { value: 0 },
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

function Grid() {
  return <gridHelper args={[120, 60, 0x333340, 0x1a1a25]} position={[0, -0.3, 0]} />;
}

export const LidarViewerTool: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [pointSize, setPointSize] = useState(2.5);
  const [showInfo, setShowInfo] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const controlsRef = useRef<any>(null);

  const stats = useMemo(() => generateNeighborhoodData().stats, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3500);
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
      <div className="flex items-center justify-between p-3 bg-slate-900/95 border-b border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-cyan-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white">LiDAR Point Cloud Viewer</span>
            <span className="text-xs text-cyan-400/70 ml-2">DJI Zenmuse L3</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80">
            <span className="text-xs text-slate-400">Density:</span>
            <input type="range" min="1" max="4" step="0.25" value={pointSize}
              onChange={(e) => setPointSize(parseFloat(e.target.value))}
              className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors" title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={resetCamera}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors" title="Reset view">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-colors ${showInfo ? 'bg-cyan-600 text-white' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'}`}
            title="Toggle info panel">
            <Info className="w-4 h-4" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Canvas - AAA QUALITY */}
      <div className="flex-1 relative">
        <Canvas
          style={{ background: 'linear-gradient(to bottom, #0d0d15 0%, #1a1a2e 50%, #0d0d15 100%)' }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          dpr={[1, 2]}
        >
          <PerspectiveCamera makeDefault position={[70, 50, 70]} fov={45} near={0.5} far={500} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={15}
            maxDistance={200}
            maxPolarAngle={Math.PI / 2.05}
          />

          {/* Cinematic Lighting */}
          <directionalLight position={[60, 100, 40]} intensity={2.0} color={0xfff8f0} />
          <directionalLight position={[-50, 60, -50]} intensity={0.6} color={0xa0c4ff} />
          <directionalLight position={[0, 40, -80]} intensity={0.8} color={0xffaa66} />
          <ambientLight intensity={0.12} color={0x404060} />

          <fog attach="fog" args={['#1a1a2e', 60, 200]} />

          <PointCloud pointSize={pointSize} />
          <Grid />

          {/* Post Processing */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.6}
              luminanceSmoothing={0.9}
              intensity={0.8}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.1} darkness={0.5} />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.0005, 0.0005)}
            />
          </EffectComposer>
        </Canvas>

        {/* Stats Panel */}
        {stats && showInfo && (
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30">
            <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Scan Analysis
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-8">
                <span className="text-slate-400">Total Points:</span>
                <span className="text-white font-mono font-bold">{stats.totalPoints.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-slate-400">Structures:</span>
                <span className="text-white font-mono">{stats.structuresDetected}</span>
              </div>
              <hr className="border-slate-700 my-2" />
              <div className="flex justify-between gap-8">
                <span className="text-red-400">Severe Damage:</span>
                <span className="text-red-400 font-mono">{stats.severelyDamaged}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-yellow-400">Moderate:</span>
                <span className="text-yellow-400 font-mono">{stats.moderatelyDamaged}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-green-400">Intact:</span>
                <span className="text-green-400 font-mono">{stats.intact}</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls Help */}
        {showInfo && (
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1"><Move3d className="w-3 h-3" /><span>Drag to orbit</span></div>
              <div className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /><span>Scroll to zoom</span></div>
              <span>Right-drag to pan</span>
            </div>
          </div>
        )}

        {/* DJI Badge */}
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-cyan-500/30">
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
            <div className="bg-black/80 backdrop-blur-md rounded-2xl p-8 border border-cyan-500/50 max-w-md text-center">
              <AlertTriangle className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Post-Hurricane Assessment</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                LiDAR captures structural damage in complete darkness, through smoke, and in areas inaccessible due to flooding or debris.
              </p>
              <p className="text-xs text-cyan-400 mt-4 animate-pulse">Click anywhere to explore</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LidarViewerTool;
