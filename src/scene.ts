import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createMaterials, decal, seeded, smokeTexture } from './materials';

export type SceneSettings = { exposure: number; atmosphere: number; thrust: number; bloom: boolean; stars: boolean; time: 'twilight' | 'night' | 'sunrise' };
export const defaults: SceneSettings = { exposure: 1.12, atmosphere: 0.45, thrust: 0.65, bloom: true, stars: true, time: 'twilight' };
export const duration = 32;

export class LaunchScene {
  scene = new THREE.Scene();
  assets = new THREE.Group();
  rocket = new THREE.Group();
  pad = new THREE.Group();
  tower = new THREE.Group();
  environment = new THREE.Group();
  effects = new THREE.Group();
  renderer: THREE.WebGLRenderer;
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2500);
  controls: OrbitControls;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  materials = createMaterials();
  settings: SceneSettings;
  elapsed = 0;
  playing = false;
  autoOrbit = false;
  destroyed = false;
  fps = 60;
  onFrame?: (time: number, fps: number) => void;
  private engineLight = new THREE.PointLight('#ff8428', 120, 50, 1.4);
  private key = new THREE.DirectionalLight('#ffcc9d', 2.5);
  private fill = new THREE.DirectionalLight('#99c7ff', 1.4);
  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private stars!: THREE.Points;
  private flames: THREE.Mesh[] = [];
  private smoke: THREE.Sprite[] = [];
  private targetCamera: THREE.Vector3 | null = null;
  private targetLook: THREE.Vector3 | null = null;
  private lastFrame = performance.now();
  private followedHeight = 0;
  private resizeObserver: ResizeObserver;

  constructor(private host: HTMLElement, settings: SceneSettings) {
    this.settings = { ...settings };
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = settings.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label', '可拖动旋转、滚轮缩放的 ARES-01 三维火箭发射场景');
    this.renderer.domElement.setAttribute('role', 'img');
    this.host.append(this.renderer.domElement);
    this.camera.position.set(61, 30, 78);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 20, 0);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.065;
    this.controls.minDistance = 12; this.controls.maxDistance = 190;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.autoRotateSpeed = 0.35;
    this.controls.addEventListener('start', () => { this.targetCamera = null; this.targetLook = null; });
    this.scene.fog = new THREE.FogExp2('#273441', 0.0045);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    room.dispose(); pmrem.dispose();
    this.assets.name = 'ARES_Launch_Complex'; this.rocket.name = 'ARES_01_Rocket'; this.pad.name = 'Launch_Pad'; this.tower.name = 'Service_Tower'; this.environment.name = 'Ground_And_Infrastructure'; this.effects.name = 'Atmosphere_And_Exhaust';
    this.assets.add(this.rocket, this.pad, this.tower, this.environment);
    this.scene.add(this.assets, this.effects);
    this.buildRocket(); this.buildPad(); this.buildTower(); this.buildEnvironment(); this.buildSky(); this.buildEffects();
    this.key.position.set(60, 25, -45); this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -45, right: 45, top: 65, bottom: -35, near: 1, far: 190 });
    this.key.shadow.normalBias = 0.12;
    this.fill.position.set(-35, 40, 65);
    const rim = new THREE.DirectionalLight('#fc9563', 1.8); rim.position.set(30, 12, -60);
    const ambient = new THREE.HemisphereLight('#9ebedb', '#252728', 0.6);
    this.scene.add(this.key, this.fill, rim, ambient, this.engineLight);
    this.engineLight.position.set(0, 5, 1);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.6, 0.85);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host); this.resize(); this.applySettings(); this.animate();
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, name: string, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private box(parent: THREE.Object3D, name: string, dimensions: number[], position: number[], mat = this.materials.steel) {
    return this.mesh(new THREE.BoxGeometry(...dimensions as [number, number, number]), mat, parent, name, ...position as [number, number, number]);
  }
  private cylinder(parent: THREE.Object3D, name: string, radius: number, height: number, y: number, material: THREE.Material, radiusTop = radius, segments = 64) {
    return this.mesh(new THREE.CylinderGeometry(radiusTop, radius, height, segments), material, parent, name, 0, y, 0);
  }
  private beam(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius = 0.09, material: THREE.Material = this.materials.steel) {
    const d = b.clone().sub(a);
    const m = this.mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 8), material, parent, 'Structural_Beam');
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  }
  private ring(parent: THREE.Object3D, name: string, radius: number, thickness: number, y: number, material: THREE.Material) {
    const ring = this.mesh(new THREE.TorusGeometry(radius, thickness, 8, 80), material, parent, name, 0, y, 0); ring.rotation.x = Math.PI / 2; return ring;
  }

  private buildRocket() {
    const m = this.materials;
    this.cylinder(this.rocket, 'Brushed_Steel_Main_Tank', 2.28, 20.8, 22.4, m.metal);
    this.cylinder(this.rocket, 'Ablative_Engine_Skirt', 2.3, 4.7, 9.65, m.heat);
    this.cylinder(this.rocket, 'Carbon_Interstage', 2.29, 1.65, 32.9, m.heat);
    this.cylinder(this.rocket, 'Payload_Fairing', 2.29, 4.0, 35.7, m.white);
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 36; i++) { const t = i / 36; points.push(new THREE.Vector2(2.29 * Math.cos(t * Math.PI / 2), t * 6.8)); }
    this.mesh(new THREE.LatheGeometry(points, 80), m.white, this.rocket, 'Ogive_Nose_Cone', 0, 37.7, 0);
    this.cylinder(this.rocket, 'Nose_Antenna', 0.045, 0.65, 44.6, m.steel, 0.01, 12);
    for (const y of [7.4, 8, 11.8, 13, 17.5, 22, 26.5, 31.6, 33.7, 37.7]) this.ring(this.rocket, 'Tank_Weld_Seam', 2.295, 0.037, y, m.steel);
    for (const y of [12.15, 31.85, 33.9]) this.cylinder(this.rocket, 'Copper_Stage_Band', 2.305, 0.13, y, m.orange);
    // Individual fasteners remain instanced, and are preserved by the GLB exporter.
    const rivets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.041, 6, 4), m.steel, 64 * 7);
    rivets.name = 'Tank_Fasteners'; const dummy = new THREE.Object3D(); let index = 0;
    for (const y of [8.1, 11.7, 13.1, 22.1, 31.5, 34, 37.5]) for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2; dummy.position.set(Math.cos(a) * 2.3, y, Math.sin(a) * 2.3); dummy.updateMatrix(); rivets.setMatrixAt(index++, dummy.matrix);
    }
    this.rocket.add(rivets);
    for (let i = 0; i < 4; i++) {
      const angle = i / 4 * Math.PI * 2 + Math.PI / 4;
      const finGroup = new THREE.Group(); finGroup.name = 'Stabilizer_' + (i + 1); finGroup.rotation.y = angle; this.rocket.add(finGroup);
      const shape = new THREE.Shape(); shape.moveTo(2.2, 7.7); shape.lineTo(4.1, 7.25); shape.lineTo(3.95, 10.4); shape.lineTo(2.2, 14); shape.closePath();
      const fin = this.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.03, bevelSegments: 1, steps: 1 }), m.heat, finGroup, 'Ablative_Fin'); fin.position.z = -0.08;
      this.beam(finGroup, new THREE.Vector3(2.3, 8, 0), new THREE.Vector3(3.7, 8, 0), 0.08, m.orange);
      const flap = this.box(finGroup, 'Grid_Fin_Frame', [1.5, 0.14, 1.05], [2.95, 30.7, 0], m.dark); flap.rotation.z = -0.12;
      for (let n = 0; n < 5; n++) this.box(finGroup, 'Grid_Fin_Lattice', [1.4, 0.15, 0.035], [2.95, 30.75, -0.45 + n * 0.225], m.steel);
      this.box(finGroup, 'External_Cable_Raceway', [0.14, 17.3, 0.11], [2.25, 22, 0], m.steel);
    }
    const engineGroup = new THREE.Group(); engineGroup.name = 'Seven_Engine_Cluster'; this.rocket.add(engineGroup);
    for (let i = 0; i < 7; i++) {
      const a = i / 6 * Math.PI * 2; const r = i === 6 ? 0 : 1.32;
      const engine = new THREE.Group(); engine.name = 'Engine_' + (i + 1); engine.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); engineGroup.add(engine);
      this.cylinder(engine, 'Engine_Bell', 0.61, 1.4, 6.9, m.dark, 0.29, 32);
      this.ring(engine, 'Nozzle_Lip', 0.61, 0.04, 6.2, m.steel);
      this.cylinder(engine, 'Emissive_Combustion_Chamber', 0.52, 0.045, 6.17, m.light);
      for (let y = 6.35; y < 7.55; y += 0.18) this.ring(engine, 'Cooling_Channel', 0.6 - (y - 6.35) * 0.22, 0.018, y, m.steel);
    }
    // Curved, transparent surface decals follow the hull.
    const label = new THREE.MeshBasicMaterial({ map: decal('A R E S', '#17222b', 512, 1024, 'O R B I T A L   S Y S T E M S'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const labelMesh = this.mesh(new THREE.CylinderGeometry(2.31, 2.31, 8, 48, 1, true, -0.55, 1.1), label, this.rocket, 'ARES_Hull_Decal', 0, 25.8, 0);
    labelMesh.rotation.y = 0.6;
    const number = new THREE.MeshBasicMaterial({ map: decal('01', '#27333c', 256, 256, 'FLIGHT VEHICLE'), transparent: true, depthWrite: false });
    const n = this.mesh(new THREE.CylinderGeometry(2.31, 2.31, 2.4, 32, 1, true, -0.42, 0.84), number, this.rocket, 'Vehicle_Number', 0, 35.3, 0); n.rotation.y = 0.6;
    const flag = this.box(this.rocket, 'Mission_Orange_Marker', [0.45, 0.7, 0.035], [1.35, 20.2, 1.87], m.orange); flag.rotation.y = 0.6;
    this.rocket.userData = { description: 'ARES-01 reusable orbital launch vehicle', dimensions: '38.8 m tall; 6.1 m maximum span', materials: ['Brushed steel', 'Ablative ceramic', 'Carbon composite'], units: 'meters' };
  }

  private buildPad() {
    const m = this.materials;
    this.cylinder(this.pad, 'Concrete_Pad_Foundation', 9.5, 0.7, 0.3, m.ground, 9.5, 64);
    const deck = new THREE.Shape(); deck.absarc(0, 0, 5.4, 0, Math.PI * 2, false);
    const exhaustOpening = new THREE.Path(); exhaustOpening.absarc(0, 0, 2.85, 0, Math.PI * 2, true); deck.holes.push(exhaustOpening);
    const table = this.mesh(new THREE.ExtrudeGeometry(deck, { depth: 1, bevelEnabled: false, curveSegments: 48 }), m.dark, this.pad, 'Launch_Table_With_Exhaust_Opening', 0, 4.1, 0);
    table.rotation.x = -Math.PI / 2;
    this.ring(this.pad, 'Launch_Table_Edge', 5.1, 0.15, 5.15, m.steel);
    this.ring(this.pad, 'Launch_Table_Safety_Ring', 5.32, 0.08, 5.2, m.orange);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 4.3, z = Math.sin(a) * 4.3;
      this.box(this.pad, 'Launch_Table_Column', [0.8, 4.1, 0.8], [x, 2.4, z], m.steel);
      this.beam(this.pad, new THREE.Vector3(x, 4.1, z), new THREE.Vector3(x * 1.45, 0.4, z * 1.45), 0.2);
      this.mesh(new THREE.SphereGeometry(0.13, 8, 8), m.light, this.pad, 'Pad_Perimeter_Light', Math.cos(a) * 8.8, 0.9, Math.sin(a) * 8.8);
      const clamp = new THREE.Group(); clamp.rotation.y = a; this.pad.add(clamp);
      this.box(clamp, 'Hold_Down_Clamp', [2, 0.45, 0.45], [3.5, 6.1, 0], m.steel);
      this.box(clamp, 'Clamp_Hinge', [0.5, 1.2, 0.65], [4.3, 5.8, 0], m.orange);
    }
    for (let i = 0; i < 18; i++) this.box(this.pad, 'Access_Stair', [2.6, 0.22, 0.55], [7.5, 0.25 + i * 0.25, 9.3 - i * 0.45], m.steel);
    for (const x of [6.25, 8.75]) {
      this.beam(this.pad, new THREE.Vector3(x, 1.4, 9.6), new THREE.Vector3(x, 5.8, 1.6), 0.05, m.orange);
      for (let i = 0; i < 5; i++) this.beam(this.pad, new THREE.Vector3(x, 0.3 + i * 0.95, 9 - i * 1.7), new THREE.Vector3(x, 1.45 + i * 0.95, 9 - i * 1.7), 0.04, m.orange);
    }
    this.box(this.pad, 'Flame_Trench', [8, 0.3, 20], [0, 0.2, 6], m.dark);
    const lineMat = new THREE.MeshStandardMaterial({ color: '#dbb168', roughness: 0.8 });
    for (const x of [-10.5, 10.5]) this.box(this.pad, 'Safety_Marking', [0.12, 0.015, 25], [x, 0.72, 0], lineMat);
    for (const z of [-12.5, 12.5]) this.box(this.pad, 'Safety_Marking', [21, 0.015, 0.12], [0, 0.72, z], lineMat);
  }

  private buildTower() {
    const m = this.materials;
    const baseX = -9.2, baseZ = -3;
    for (const x of [-2, 2]) for (const z of [-2, 2]) {
      this.box(this.tower, 'Tower_Main_Column', [0.42, 40.5, 0.42], [baseX + x, 20.5, baseZ + z], m.steel);
      this.box(this.tower, 'Tower_Footing', [1.6, 0.6, 1.6], [baseX + x, 0.3, baseZ + z], m.ground);
    }
    for (let level = 0; level < 10; level++) {
      const y = 1.2 + level * 4;
      this.box(this.tower, 'Service_Deck', [4.7, 0.2, 4.7], [baseX, y, baseZ], m.dark);
      for (const z of [-2, 2]) {
        this.beam(this.tower, new THREE.Vector3(baseX - 2, y, baseZ + z), new THREE.Vector3(baseX + 2, y + 4, baseZ + z), 0.075);
        this.beam(this.tower, new THREE.Vector3(baseX + 2, y, baseZ + z), new THREE.Vector3(baseX - 2, y + 4, baseZ + z), 0.075);
        this.beam(this.tower, new THREE.Vector3(baseX - 2.3, y + 1, baseZ + z), new THREE.Vector3(baseX + 2.3, y + 1, baseZ + z), 0.035, m.orange);
      }
      for (const x of [-2, 2]) this.beam(this.tower, new THREE.Vector3(baseX + x, y, baseZ - 2), new THREE.Vector3(baseX + x, y + 4, baseZ + 2), 0.075);
      this.box(this.tower, 'Tower_Work_Light', [1.2, 0.12, 0.12], [baseX + 2.25, y + 0.9, baseZ + 2.35], m.coolLight);
    }
    this.box(this.tower, 'Elevator_Shaft', [1.1, 39, 1.6], [baseX - 0.5, 20, baseZ], m.heat);
    for (const y of [12.8, 24.5, 34.8]) {
      this.box(this.tower, 'Retractable_Umbilical_Arm', [5.8, 0.3, 1.3], [-4.7, y, -3], m.steel);
      this.beam(this.tower, new THREE.Vector3(-7.4, y + 2, -3), new THREE.Vector3(-2.3, y, -3), 0.08);
      this.box(this.tower, 'Umbilical_Coupling', [0.4, 0.7, 1.3], [-2, y, -3], m.orange);
    }
    this.box(this.tower, 'Tower_Crown', [5, 0.3, 5], [baseX, 41, baseZ], m.steel);
    this.beam(this.tower, new THREE.Vector3(baseX, 41, baseZ), new THREE.Vector3(baseX, 48, baseZ), 0.07);
    this.mesh(new THREE.SphereGeometry(0.13, 8, 8), m.light, this.tower, 'Aviation_Light', baseX, 48.1, baseZ);
  }

  private buildEnvironment() {
    const m = this.materials, random = seeded(314);
    const ground = this.mesh(new THREE.PlaneGeometry(1800, 1800), m.ground, this.environment, 'Concrete_Launch_Apron'); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.12; ground.castShadow = false;
    const road = new THREE.MeshStandardMaterial({ color: '#242f33', roughness: 0.95 });
    this.box(this.environment, 'Access_Road', [12, 0.02, 450], [30, -0.09, -40], road);
    for (let i = -20; i < 25; i++) this.box(this.environment, 'Road_Marking', [0.12, 0.012, 3], [30, -0.07, i * 7], m.white);
    for (let i = 0; i < 4; i++) {
      const tank = this.cylinder(this.environment, 'Cryogenic_Storage_Tank', 3.3, 6.5, 3.25, m.white, 3.3); tank.position.x = -27 - i * 8; tank.position.z = -27;
      this.mesh(new THREE.SphereGeometry(3.3, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.white, this.environment, 'Storage_Tank_Dome', tank.position.x, 6.5, -27);
      this.beam(this.environment, new THREE.Vector3(tank.position.x, 0.8, -23), new THREE.Vector3(-10, 0.8, -10), 0.16, m.steel);
    }
    for (let i = 0; i < 10; i++) {
      const x = (i % 2 ? 1 : -1) * (35 + random() * 60), z = -40 - random() * 95;
      this.box(this.environment, 'Distant_Facility', [6 + random() * 14, 2 + random() * 5, 8 + random() * 12], [x, 1.8, z], m.dark);
    }
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, r = 28;
      this.mesh(new THREE.SphereGeometry(0.13, 8, 6), m.coolLight, this.environment, 'Apron_Light', Math.cos(a) * r, 0.2, Math.sin(a) * r);
    }
    for (const pos of [[-25, 0, 17], [26, 0, -16], [-24, 0, -28]]) {
      this.beam(this.environment, new THREE.Vector3(...pos), new THREE.Vector3(pos[0], 21, pos[2]), 0.13, m.steel);
      this.box(this.environment, 'Floodlight_Bar', [2.2, 0.2, 0.3], [pos[0], 21, pos[2]], m.steel);
      for (const dx of [-0.7, 0, 0.7]) this.box(this.environment, 'Floodlight', [0.45, 0.35, 0.22], [pos[0] + dx, 20.8, pos[2] + 0.1], m.coolLight);
    }
    // Low, irregular horizon silhouette adds distance without external assets.
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 180; i++) points.push(new THREE.Vector2(i * 8 - 720, 1 + Math.sin(i * 0.13) * 4 + random() * 4));
    const shape = new THREE.Shape(); shape.moveTo(-720, -20); points.forEach(p => shape.lineTo(p.x, p.y)); shape.lineTo(720, -20); shape.closePath();
    this.mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#1a252b', fog: true }), this.environment, 'Distant_Coastline', 0, 0, -360);
  }

  private buildSky() {
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uWarm: { value: 0.8 }, uSun: { value: new THREE.Vector3(-0.32, 0.012, -1).normalize() } },
      vertexShader: 'varying vec3 vWorld; void main(){vWorld=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 vWorld; uniform float uWarm; uniform vec3 uSun;
        void main(){vec3 d=normalize(vWorld); float h=max(d.y,0.); vec3 top=vec3(.002,.005,.011); vec3 horizon=vec3(.017,.027,.04);
        vec3 color=mix(horizon,top,pow(clamp(h*2.4,0.,1.),.65)); float g=pow(max(dot(d,uSun),0.),32.); float band=exp(-abs(d.y-.012)*10.);
        color+=vec3(.25,.064,.012)*g*band*uWarm; color+=vec3(.016,.009,.004)*band*uWarm;
        float haze=sin(d.x*45.+sin(d.z*16.))*sin(d.z*33.+d.y*25.)*.0015; color+=haze*band;
        gl_FragColor=vec4(color,1.); }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 32), skyMaterial); this.sky.name = 'Atmospheric_Sky'; this.sky.renderOrder = -10; this.scene.add(this.sky);
    const random = seeded(76), positions: number[] = [], colors: number[] = [];
    for (let i = 0; i < 2700; i++) {
      const a = random() * Math.PI * 2, y = 0.09 + random() * 0.91, r = Math.sqrt(1 - y * y);
      positions.push(Math.cos(a) * r * 1000, y * 1000, Math.sin(a) * r * 1000);
      const k = 0.35 + random() * 0.8; colors.push(k * 0.8, k * 0.9, k);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.15, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.8, fog: false, depthWrite: false })); this.stars.name = 'Star_Field'; this.scene.add(this.stars);
  }

  private buildEffects() {
    for (let i = 0; i < 7; i++) {
      const a = i / 6 * Math.PI * 2, r = i === 6 ? 0 : 1.32;
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPower: { value: 0.65 } },
        vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uPower;
          void main(){float y=vUv.y; float ripple=sin(y*90.-uTime*35.)*.12+sin(vUv.x*38.+uTime*17.)*.1;
          float alpha=pow(y,.8)*(0.68+ripple)*uPower; vec3 hot=mix(vec3(1.,.12,.002),vec3(2.,1.15,.34),pow(y,1.8));
          hot=mix(hot,vec3(2.4,2.1,1.6),pow(y,10.)); gl_FragColor=vec4(hot*2.,alpha); }`,
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.48, 5.2, 32, 10, true), mat); flame.rotation.z = Math.PI; flame.position.set(Math.cos(a) * r, 3.6, Math.sin(a) * r); flame.name = 'Animated_Engine_Plume'; this.effects.add(flame); this.flames.push(flame);
    }
    const texture = smokeTexture(), random = seeded(73);
    for (let i = 0; i < 54; i++) {
      const material = new THREE.SpriteMaterial({ map: texture, color: i % 3 ? '#b2bec5' : '#d3a078', transparent: true, opacity: 0.32, depthWrite: false, fog: true, rotation: random() * Math.PI });
      const sprite = new THREE.Sprite(material); sprite.name = 'Ground_Condensation'; sprite.userData = { angle: random() * Math.PI * 2, phase: random(), size: 7 + random() * 9 };
      this.effects.add(sprite); this.smoke.push(sprite);
    }
  }

  applySettings() {
    const s = this.settings;
    this.renderer.toneMappingExposure = s.exposure;
    this.bloom.enabled = s.bloom;
    this.stars.visible = s.stars;
    (this.scene.fog as THREE.FogExp2).density = 0.0015 + s.atmosphere * 0.007;
    this.sky.material.uniforms.uWarm.value = s.time === 'night' ? 0.05 : s.time === 'sunrise' ? 1.65 : 0.8;
    this.materials.ground.userData.scattering.value = this.sky.material.uniforms.uWarm.value;
    this.key.intensity = s.time === 'night' ? 0.5 : s.time === 'sunrise' ? 3.4 : 2.4;
    this.fill.intensity = s.time === 'night' ? 1.1 : 1.5;
    this.scene.environmentIntensity = s.time === 'night' ? 0.2 : 0.35;
  }

  setView(view: string) {
    this.autoOrbit = false; this.controls.autoRotate = false;
    // Consume residual drag deltas before moving to a deterministic preset.
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
    const views: Record<string, number[][]> = {
      hero: [[61, 30, 78], [0, 20, 0]],
      wide: [[95, 48, 118], [0, 17, 0]],
      engine: [[17, 9, 22], [0, 8.5, 0]],
      top: [[24, 78, 36], [0, 12, 0]],
    };
    const data = views[view] || views.hero;
    this.targetCamera = new THREE.Vector3(...data[0]); this.targetLook = new THREE.Vector3(...data[1]);
    this.targetCamera.y += this.followedHeight; this.targetLook.y += this.followedHeight;
  }

  seek(time: number) { this.elapsed = THREE.MathUtils.clamp(time, 0, duration); }

  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); this.composer.setSize(w, h);
  }

  private animate = () => {
    if (this.destroyed) return;
    requestAnimationFrame(this.animate);
    const now = performance.now(), dt = Math.min((now - this.lastFrame) / 1000, 0.05); this.lastFrame = now;
    this.fps = this.fps * 0.97 + (1 / Math.max(dt, 0.001)) * 0.03;
    if (this.playing) { this.elapsed = Math.min(this.elapsed + dt, duration); if (this.elapsed >= duration) this.playing = false; }
    const lift = this.elapsed > 7 ? Math.pow((this.elapsed - 7) / 25, 1.8) * 125 : 0;
    const rise = lift - this.followedHeight;
    if (rise !== 0) {
      this.camera.position.y += rise; this.controls.target.y += rise;
      if (this.targetCamera) this.targetCamera.y += rise;
      if (this.targetLook) this.targetLook.y += rise;
      this.followedHeight = lift;
    }
    this.rocket.position.y = lift;
    const power = this.settings.thrust * (0.72 + Math.min(this.elapsed / 8, 0.6));
    this.flames.forEach((f, i) => {
      const mat = f.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = now / 1000 + i; mat.uniforms.uPower.value = power;
      f.visible = this.rocket.visible && power > 0.01;
      f.position.y = 6.15 + lift - (2.3 + power * 2.4);
      f.scale.set(1 + power * 0.1, 0.85 + power, 1 + power * 0.1);
    });
    this.engineLight.position.y = 4 + lift; this.engineLight.intensity = this.rocket.visible ? power * 170 * (0.95 + Math.sin(now * 0.028) * 0.05) : 0;
    this.smoke.forEach((s, i) => {
      const data = s.userData; const phase = (data.phase + now * 0.000015 * (0.4 + power)) % 1;
      const dist = 2 + phase * 26;
      s.position.set(Math.cos(data.angle) * dist + phase * 6, 0.5 + phase * 3 + Math.sin(i) * 0.6, Math.sin(data.angle) * dist);
      const scale = data.size * (0.35 + phase * 0.9); s.scale.set(scale * 1.6, scale * 0.7, 1);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(phase * Math.PI) * (0.12 + this.settings.atmosphere * 0.25) * power * Math.max(0, 1 - lift / 100);
    });
    if (this.targetCamera && this.targetLook) {
      this.camera.position.lerp(this.targetCamera, 0.055); this.controls.target.lerp(this.targetLook, 0.055);
      if (this.camera.position.distanceTo(this.targetCamera) < 0.03 && this.controls.target.distanceTo(this.targetLook) < 0.03) {
        this.camera.position.copy(this.targetCamera); this.controls.target.copy(this.targetLook);
        this.targetCamera = null; this.targetLook = null;
      }
    }
    this.controls.autoRotate = this.autoOrbit;
    this.controls.update(); this.composer.render(); this.onFrame?.(this.elapsed, this.fps);
  };

  async exportGLB(onlyRocket = false) {
    const source = onlyRocket ? this.rocket : this.assets;
    const root = source.clone(true); root.position.set(0, 0, 0); root.visible = true;
    root.traverse(o => { o.visible = true; });
    root.userData = { ...root.userData, generator: 'ORBITAL Launch Studio', units: 'meters', license: 'User-created procedural assets', note: 'Editable PBR geometry. Atmospheric and animated screen effects are provided in the Three.js source.' };
    const exporter = new GLTFExporter();
    return await exporter.parseAsync(root, { binary: true, onlyVisible: false, maxTextureSize: 2048 }) as ArrayBuffer;
  }

  screenshot() { this.composer.render(); return this.renderer.domElement.toDataURL('image/png'); }

  dispose() { this.destroyed = true; this.resizeObserver.disconnect(); this.controls.dispose(); this.composer.dispose(); this.renderer.dispose(); }
}
