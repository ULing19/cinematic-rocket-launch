import * as THREE from 'three';

export function seeded(seed = 42) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D, random: () => number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!, seeded());
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function createMaterials() {
  const metalMap = canvasTexture(1024, 1024, (ctx, random) => {
    ctx.fillStyle = '#b8bdc0'; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 18000; i++) {
      const a = random() * 0.16;
      ctx.strokeStyle = random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(20,28,35,${a})`;
      const x = random() * 1024, y = random() * 1024;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 150 + 10, y); ctx.stroke();
    }
    for (let x = 0; x < 1024; x += 128) {
      ctx.fillStyle = '#858d9450'; ctx.fillRect(x, 0, 2, 1024);
      for (let y = 16; y < 1024; y += 32) { ctx.fillStyle = '#5d686f'; ctx.beginPath(); ctx.arc(x + 5, y, 1.4, 0, 7); ctx.fill(); }
    }
    for (const y of [64, 470, 950]) { ctx.fillStyle = '#8b949b50'; ctx.fillRect(0, y, 1024, 3); }
  });
  const heatMap = canvasTexture(512, 1024, (ctx, random) => {
    ctx.fillStyle = '#343c42'; ctx.fillRect(0, 0, 512, 1024);
    for (let y = 0; y < 1024; y += 38) for (let x = 0; x < 512; x += 32) {
      const c = 28 + Math.floor(random() * 27);
      ctx.fillStyle = `rgb(${c + 3},${c + 6},${c + 9})`; ctx.fillRect(x + 1, y + 1, 30, 36);
      ctx.strokeStyle = '#a0856020'; ctx.strokeRect(x + 1, y + 1, 30, 36);
    }
    for (let i = 0; i < 4500; i++) { ctx.fillStyle = `rgba(169,107,61,${random() * 0.15})`; ctx.fillRect(random() * 512, random() * 1024, 2, random() * 30); }
    const g = ctx.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, '#38201500'); g.addColorStop(0.7, '#2f1a1244'); g.addColorStop(1, '#140e0bd0'); ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 1024);
  });
  const concreteMap = canvasTexture(1024, 1024, (ctx, random) => {
    ctx.fillStyle = '#69716f'; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 150000; i++) {
      const a = random() * 0.15; ctx.fillStyle = random() > 0.6 ? `rgba(220,217,201,${a})` : `rgba(15,22,24,${a})`;
      ctx.fillRect(random() * 1024, random() * 1024, 1 + random() * 3, 1 + random() * 3);
    }
    ctx.strokeStyle = '#202b2c66'; ctx.lineWidth = 2;
    for (let i = 0; i < 1024; i += 256) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke(); }
    for (let i = 0; i < 24; i++) { let x = random() * 1024, y = random() * 1024; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 9; j++) { x += random() * 24 - 12; y += random() * 15; ctx.lineTo(x, y); } ctx.stroke(); }
  });
  concreteMap.wrapS = concreteMap.wrapT = THREE.RepeatWrapping; concreteMap.repeat.set(48, 48);
  const metalNormal = canvasTexture(512, 512, (ctx, random) => {
    ctx.fillStyle = '#8080ff'; ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y++) { ctx.fillStyle = `rgb(128,${118 + Math.floor(random() * 20)},254)`; ctx.fillRect(0, y, 512, 1); }
    for (let x = 0; x < 512; x += 64) { ctx.fillStyle = '#aa80f4'; ctx.fillRect(x, 0, 1, 512); ctx.fillStyle = '#5580f4'; ctx.fillRect(x + 1, 0, 1, 512); }
  });
  const heatNormal = canvasTexture(512, 1024, ctx => {
    ctx.fillStyle = '#8080ff'; ctx.fillRect(0, 0, 512, 1024);
    for (let y = 0; y < 1024; y += 38) for (let x = 0; x < 512; x += 32) {
      ctx.fillStyle = '#8080ff'; ctx.fillRect(x + 2, y + 2, 28, 34);
      ctx.fillStyle = '#b080ec'; ctx.fillRect(x + 1, y + 1, 1, 36);
      ctx.fillStyle = '#5080ec'; ctx.fillRect(x + 30, y + 1, 1, 36);
      ctx.fillStyle = '#80b0ec'; ctx.fillRect(x + 1, y + 1, 30, 1);
      ctx.fillStyle = '#8050ec'; ctx.fillRect(x + 1, y + 36, 30, 1);
    }
  });
  metalNormal.colorSpace = heatNormal.colorSpace = THREE.NoColorSpace;
  const metal = new THREE.MeshPhysicalMaterial({ color: '#dde3e6', map: metalMap, metalness: 0.78, roughness: 0.33, normalMap: metalNormal, normalScale: new THREE.Vector2(0.25, 0.25), anisotropy: 0.65, anisotropyRotation: Math.PI / 2 });
  const heat = new THREE.MeshStandardMaterial({ map: heatMap, metalness: 0.45, roughness: 0.7, normalMap: heatNormal, normalScale: new THREE.Vector2(0.45, 0.45) });
  const steel = new THREE.MeshStandardMaterial({ color: '#53616a', metalness: 0.8, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1b252c', metalness: 0.6, roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: '#dce0dc', metalness: 0.25, roughness: 0.43 });
  const orange = new THREE.MeshStandardMaterial({ color: '#e07835', metalness: 0.38, roughness: 0.42 });
  const ground = new THREE.MeshStandardMaterial({ color: '#718084', map: concreteMap, roughness: 0.92, metalness: 0.08, bumpMap: concreteMap, bumpScale: 0.045 });
  // Match distant ground scattering to the sky instead of a hard fog horizon.
  const scattering = { value: 0.8 };
  ground.userData.scattering = scattering;
  ground.onBeforeCompile = shader => {
    shader.uniforms.uGroundWarm = scattering;
    shader.vertexShader = 'varying vec3 vGroundWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 vGroundWorld; uniform float uGroundWarm;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `#include <fog_fragment>
      vec3 groundRay = normalize(vGroundWorld - cameraPosition);
      float sunset = pow(max(dot(groundRay, normalize(vec3(-.32,.012,-1.))), 0.), 32.);
      vec3 horizonColor = vec3(.017,.027,.04) + vec3(.25,.064,.012) * sunset * uGroundWarm + vec3(.016,.009,.004) * uGroundWarm;
      float distanceHaze = smoothstep(90., 360., distance(vGroundWorld, cameraPosition));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, horizonColor, distanceHaze);`);
  };
  const light = new THREE.MeshStandardMaterial({ color: '#ffbc69', emissive: '#ff922c', emissiveIntensity: 4, roughness: 0.4 });
  const coolLight = new THREE.MeshStandardMaterial({ color: '#b8e8ff', emissive: '#b9e6ff', emissiveIntensity: 4 });
  return { metal, heat, steel, dark, white, orange, ground, light, coolLight };
}

export function decal(text: string, color = '#12202a', width = 512, height = 256, sub = '') {
  return canvasTexture(width, height, ctx => {
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (height > width * 1.5) {
      const letters = text.replaceAll(' ', '').split('');
      ctx.font = `600 ${width * 0.36}px Arial, sans-serif`;
      letters.forEach((letter, index) => ctx.fillText(letter, width / 2, height * (0.16 + index * 0.18)));
    } else {
      ctx.font = `700 ${Math.min(height * 0.42, width / (text.length * 0.65))}px Arial, sans-serif`; ctx.fillText(text, width / 2, height * 0.45);
    }
    if (sub) { ctx.font = `500 ${Math.min(height * 0.085, width / (sub.length * 0.68))}px monospace`; ctx.fillText(sub, width / 2, height * 0.89); }
  });
}

export function smokeTexture() {
  return canvasTexture(128, 128, (ctx, random) => {
    for (let i = 0; i < 34; i++) {
      const x = 64 + (random() - 0.5) * 50, y = 64 + (random() - 0.5) * 50, r = 12 + random() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#eee6d02c'); g.addColorStop(0.5, '#c7c9c21c'); g.addColorStop(1, '#ffffff00'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    }
  });
}
