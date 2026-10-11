import { readFileSync, writeFileSync } from 'node:fs';

const report = [];
for (const name of ['ARES-01-launch-complex.glb', 'ARES-01-rocket.glb']) {
  const bytes = readFileSync(new URL(`../artifacts/${name}`, import.meta.url));
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`${name}: invalid GLB 2.0 header`);
  }
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${name}: missing JSON chunk`);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  if (!gltf.nodes?.length || !gltf.meshes?.length || !gltf.materials?.length) throw new Error(`${name}: empty asset`);
  if (!gltf.materials.some(material => material.normalTexture)) throw new Error(`${name}: missing normal textures`);
  if (gltf.images.some(image => !Number.isInteger(image.bufferView) || image.uri)) throw new Error(`${name}: textures must be embedded`);
  if (gltf.buffers.some(buffer => buffer.uri)) throw new Error(`${name}: external binary dependency`);
  for (const view of gltf.bufferViews) {
    if ((view.byteOffset || 0) + view.byteLength > gltf.buffers[view.buffer].byteLength) throw new Error(`${name}: out-of-range buffer view`);
  }
  report.push({ file: name, bytes: bytes.length, nodes: gltf.nodes.length, meshes: gltf.meshes.length, materials: gltf.materials.length, embeddedImages: gltf.images.length, materialsWithNormals: gltf.materials.filter(material => material.normalTexture).length, extensions: gltf.extensionsUsed || [] });
}
writeFileSync(new URL('../artifacts/asset-integrity.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
