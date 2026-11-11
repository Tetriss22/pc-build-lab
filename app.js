import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (s) => document.querySelector(s);
const hero = $('#hero'), stage = $('#stage');
const mobile = matchMedia('(max-width:860px)').matches;
const lite = mobile || /[?&]lite/.test(location.search);
const ACCENT = 0x2f4bd0;

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('#load').textContent = 'This lab needs WebGL. Try another browser.'; throw e; }
renderer.setPixelRatio(/[?&]lite/.test(location.search) ? 1 : Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const BG = new THREE.Color(0xe9e1d1);
scene.background = BG; scene.fog = new THREE.Fog(BG, 130, 280);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(31, 1, 1, 600);
camera.position.set(31, 46, 54);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 4.5, 4); controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.enablePan = false; controls.minDistance = 14; controls.maxDistance = 135; controls.maxPolarAngle = 1.46;
stage.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation(); }, { capture: true, passive: true });

const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
key.position.set(-30, 60, 25); key.castShadow = true;
key.shadow.mapSize.set(lite ? 2048 : 4096, lite ? 2048 : 4096); key.shadow.radius = 9; key.shadow.blurSamples = 16; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.05;
Object.assign(key.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 200 });
scene.add(key, new THREE.HemisphereLight(0xfff8ee, 0xb9ad98, 0.55));
const rim = new THREE.DirectionalLight(0xdfe8ff, 0.7); rim.position.set(40, 30, -40); scene.add(rim);

// ---------------------------------------------------------------- helpers
const M = (o) => new THREE.MeshStandardMaterial(o);
const rgbMats = [];
const RGB = (k) => { const m = M({ color: 0xd9defa, emissive: 0x3d5cff, emissiveIntensity: 0, roughness: 0.35 }); m.userData.k = k * 1.7; rgbMats.push(m); return m; };
const mat = {
  gun: M({ color: 0x2c2f35, metalness: 0.85, roughness: 0.36 }), gunL: M({ color: 0x4a4e56, metalness: 0.9, roughness: 0.3 }),
  silver: M({ color: 0xcfd2d6, metalness: 1, roughness: 0.22 }), alu: M({ color: 0xb9bcc0, metalness: 0.95, roughness: 0.38 }),
  black: M({ color: 0x101113, roughness: 0.5, metalness: 0.1 }), blackG: M({ color: 0x0c0d0f, roughness: 0.18, metalness: 0.3 }),
  slot: M({ color: 0x1b1c20, roughness: 0.42 }), slotL: M({ color: 0x3d4046, roughness: 0.45 }), gold: M({ color: 0xd6aa48, metalness: 1, roughness: 0.28 }),
  copper: M({ color: 0xc27a4a, metalness: 1, roughness: 0.25 }), white: M({ color: 0xece8de, roughness: 0.55 }),
  accent: M({ color: ACCENT, roughness: 0.45 }), rubber: M({ color: 0x18191b, roughness: 0.85 }), cable: M({ color: 0x131416, roughness: 0.78 }),
};
function add(mesh, p) { mesh.castShadow = mesh.receiveShadow = true; (p || scene).add(mesh); return mesh; }
function box(w, h, d, m, x, y, z, p, r = 0) {
  const g = r ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, h / 2 - 0.001, w / 2 - 0.001, d / 2 - 0.001)) : new THREE.BoxGeometry(w, h, d);
  const o = add(new THREE.Mesh(g, m), p); o.position.set(x, y + h / 2, z); return o;
}
function cyl(r, h, m, x, y, z, p, seg = 32, r2) { const o = add(new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, h, seg), m), p); o.position.set(x, y + h / 2, z); return o; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const pose = (x, y, z, rx = 0, ry = 0, rz = 0) => ({ p: V3(x, y, z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')) });
const lift = (ps, dy, extra) => ({ p: ps.p.clone().add(V3(0, dy, 0)), q: extra ? ps.q.clone().multiply(extra) : ps.q.clone() });

// ---------------------------------------------------------------- desk + mat
const desk = add(new THREE.Mesh(new THREE.PlaneGeometry(900, 900), M({ color: 0xe0d7c4, roughness: 0.92 })));
desk.rotation.x = -Math.PI / 2; desk.position.y = -0.3;
const matTex = canvasTex(2400, 1600, (c, w, h) => {
  c.fillStyle = '#7d9585'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 20000; i++) { c.fillStyle = `rgba(${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},${rnd() > .5 ? 255 : 0},.035)`; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
  const u = w / 96;
  for (let i = 3; i <= 93; i++) { c.strokeStyle = `rgba(255,255,255,${i % 5 === 3 ? .34 : .13})`; c.lineWidth = i % 5 === 3 ? 2.5 : 1.2; c.beginPath(); c.moveTo(i * u, 3 * u); c.lineTo(i * u, h - 3 * u); c.stroke(); }
  for (let j = 3; j <= 61; j++) { c.strokeStyle = `rgba(255,255,255,${j % 5 === 3 ? .34 : .13})`; c.lineWidth = j % 5 === 3 ? 2.5 : 1.2; c.beginPath(); c.moveTo(3 * u, j * u); c.lineTo(w - 3 * u, j * u); c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.strokeRect(3 * u, 3 * u, w - 6 * u, h - 6 * u);
  c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 24px monospace';
  for (let i = 8; i <= 93; i += 5) c.fillText(String(i - 3), i * u - 12, 2.4 * u);
  c.font = '600 27px monospace'; c.fillText('ESD-SAFE BUILD MAT  ·  900 × 600 mm', 4 * u, h - 1.2 * u);
});
const pad = add(new THREE.Mesh(new RoundedBoxGeometry(96, 0.3, 64, 4, 0.15), M({ map: matTex, roughness: 0.88 }))); pad.position.set(2, -0.15, 4);

// ---------------------------------------------------------------- motherboard
const mb = new THREE.Group(); scene.add(mb); mb.position.set(0, 0.55, -2);
const T = 0.18, Y0 = -0.55, SX = -3.6, SZ = -5.0;
const pcbTex = canvasTex(2440, 1952, (c, w, h) => {
  c.fillStyle = '#15171b'; c.fillRect(0, 0, w, h); c.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    let x = rnd() * w, y = rnd() * h; c.strokeStyle = `rgba(${70 + rnd() * 30},${80 + rnd() * 30},${95 + rnd() * 30},${.25 + rnd() * .25})`; c.lineWidth = 1.5 + rnd() * 2; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 4; k++) { const d = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1]][Math.floor(rnd() * 6)], l = 30 + rnd() * 170; x += d[0] * l; y += d[1] * l; c.lineTo(x, y); }
    c.stroke(); c.fillStyle = 'rgba(190,170,110,.55)'; c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill();
  }
  c.save(); c.translate(w * .62, h * .55); c.rotate(-.6); c.fillStyle = 'rgba(205,210,220,.11)'; for (let i = 0; i < 7; i++) c.fillRect(-900, i * 46, 1800, 20); c.restore();
  c.fillStyle = 'rgba(235,235,230,.85)'; c.font = '700 64px Inter, sans-serif'; c.fillText('LAB-B650  ATX', w * .50, h * .94);
  c.font = '600 22px monospace'; c.fillStyle = 'rgba(235,235,230,.7)';
  [['CPU_FAN', .36, .06], ['A1  A2  B1  B2', .612, .045], ['PCIEX16_1', .14, .63], ['PCIEX16_2', .14, .875], ['M2_1', .30, .49], ['M2_2', .40, .745], ['ATX_PWR', .925, .14], ['SATA6G', .93, .60], ['F_PANEL', .82, .975], ['BAT', .56, .60], ['CPU', .796, .145], ['DRAM', .833, .145], ['VGA', .878, .145], ['BOOT', .914, .145]].forEach(([t, x, y]) => c.fillText(t, x * w, y * h));
  c.strokeStyle = 'rgba(235,235,230,.45)'; c.lineWidth = 3; c.strokeRect(w * .285, h * .16, w * .22, h * .275);
});
box(30.5, 0.18, 24.4, M({ map: pcbTex, roughness: 0.6, metalness: 0.25 }), 0, 0, 0, mb);
box(31.5, 0.5, 25.4, M({ color: 0x2a2b2e, roughness: 0.95 }), 0, -0.52, 0, mb, 0.2);
box(4.4, 3.4, 11.5, mat.gun, -13.0, T, -6.2, mb, 0.35);
box(0.25, 3.0, 9, RGB(0.9), -10.75, T + 0.2, -6.2, mb);
box(4.2, 2.9, 0.6, mat.silver, -13.0, T, -12.1, mb);
function finBlock(x, z, w, d, h, n, along) {
  box(w, h * 0.45, d, mat.gun, x, T, z, mb, 0.12);
  for (let i = 0; i < n; i++) { const f = (i + .5) / n - .5; along === 'x' ? box(w / n * 0.55, h, d, mat.gunL, x + f * w, T, z, mb, 0.06) : box(w, h, d / n * 0.55, mat.gunL, x, T, z + f * d, mb, 0.06); }
}
finBlock(-9.0, -5.6, 2.4, 9.4, 2.5, 9, 'z'); finBlock(-3.6, -11.0, 9.6, 1.9, 2.1, 12, 'x');
box(6.2, 0.35, 6.2, mat.slot, SX, T, SZ, mb, 0.1); box(5.6, 0.22, 5.6, mat.silver, SX, T + 0.35, SZ, mb, 0.08);
box(4.3, 0.06, 4.3, M({ color: 0x9c7d3a, metalness: 0.9, roughness: 0.55 }), SX, T + 0.4, SZ, mb);
box(0.5, 0.5, 3.2, mat.silver, SX + 3.3, T + 0.4, SZ, mb, 0.1);
for (let i = 0; i < 9; i++) { cyl(0.32, 0.75, mat.black, SX - 3.9 + i * 0.95, T, SZ - 3.9, mb, 16); cyl(0.3, 0.02, mat.alu, SX - 3.9 + i * 0.95, T + 0.75, SZ - 3.9, mb, 16); }
for (let i = 0; i < 7; i++) box(0.75, 0.55, 0.75, M({ color: 0x3a3c40, roughness: 0.5 }), SX - 4.3, T, SZ - 2.8 + i * 0.95, mb, 0.05);
const ramX = [3.6, 4.65, 5.7, 6.75];
ramX.forEach((x, i) => { box(0.72, 0.85, 14.0, i % 2 ? mat.slot : mat.slotL, x, T, SZ, mb, 0.05); box(0.9, 1.15, 0.7, mat.white, x, T, SZ - 7.2, mb, 0.05); box(0.9, 1.15, 0.7, mat.white, x, T, SZ + 7.2, mb, 0.05); });
box(1.1, 1.35, 5.4, mat.black, 14.4, T, -5.5, mb, 0.06);
for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) box(0.3, 0.05, 0.3, mat.gold, 14.15 + j * 0.5, T + 1.33, -7.9 + i * 0.44, mb);
box(2.2, 1.2, 1.0, mat.black, -9.6, T, -11.5, mb, 0.06);
const leds = [0, 1, 2, 3].map(i => box(0.3, 0.14, 0.2, M({ color: 0x555555, roughness: 0.4, emissive: 0x000000 }), 9.4 + i * 1.25, T, -9.6, mb));
const ledLight = new THREE.PointLight(0xff2010, 0, 6, 2); ledLight.position.set(9.4, 1.2, -9.6); mb.add(ledLight);
function pcie(z, len, steel) { box(len, 1.05, 0.75, steel ? mat.silver : mat.slot, -11.6 + len / 2, T, z, mb, 0.05); box(len - 0.5, 0.2, 0.28, mat.black, -11.6 + len / 2, T + 0.9, z, mb); box(0.9, 1.2, 0.9, mat.slot, -11.6 + len + 0.4, T, z, mb, 0.05); }
pcie(3.6, 9.0, true); pcie(9.9, 9.0, false); box(2.5, 1.0, 0.72, mat.slot, -10.3, T, 6.8, mb, 0.05);
{ const x = -4.6, z = 0.6, w = 9.6; box(w, 0.55, 2.3, mat.gun, x, T, z, mb, 0.1); for (let i = 0; i < 5; i++) box(w - 0.6, 0.1, 0.16, mat.gunL, x, T + 0.52, z - 0.8 + i * 0.4, mb); cyl(0.22, 0.6, mat.silver, x + w / 2 - 0.45, T, z, mb, 12); }
box(0.8, 0.5, 2.3, mat.slot, -5.2, T, 7.0, mb, 0.05); cyl(0.28, 0.3, mat.gold, 3.0, T, 7.0, mb, 12); // bare M.2 slot 2
box(7.6, 1.0, 7.4, mat.gun, 9.2, T, 6.6, mb, 0.2);
for (let i = 0; i < 6; i++) { const s = box(9, 0.12, 0.28, mat.gunL, 9.2, T + 1.0, 6.6, mb); s.rotation.y = 0.6; s.position.x += (i - 2.5) * 1.05; s.scale.x = 0.62; }
box(2.6, 0.06, 0.5, RGB(1.2), 7.0, T + 1.0, 9.6, mb);
for (let i = 0; i < 4; i++) box(1.5, 0.75, 1.25, mat.black, 14.2, T, 3.6 + i * 1.5, mb, 0.05);
cyl(1.0, 0.32, mat.silver, 2.2, T + 0.25, 2.9, mb); cyl(1.15, 0.25, mat.black, 2.2, T, 2.9, mb);
for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) cyl(0.05, 0.6, mat.gold, 9.5 + i * 0.26, T, 11.4 + j * 0.26, mb, 6);
box(2.6, 0.5, 0.7, mat.black, 10.5, T, 11.5, mb); box(2.2, 1.1, 0.9, mat.black, 4.5, T, 11.5, mb, 0.05); box(2.2, 1.1, 0.9, mat.black, 0.8, T, 11.5, mb, 0.05);
for (let i = 0; i < 4; i++) cyl(0.3, 0.7, mat.black, -7 + i * 0.9, T, 11.3, mb, 16);

// ---------------------------------------------------------------- parts
const fans = [];
function fan(R, p, group) {
  const g = new THREE.Group(); p.add(g);
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.22, 10, 48), mat.black), g); ring.rotation.x = Math.PI / 2;
  const rot = new THREE.Group(); g.add(rot); fans.push({ rot, group });
  cyl(R * 0.3, 0.9, mat.blackG, 0, -0.45, 0, rot); cyl(R * 0.17, 0.02, mat.accent, 0, 0.46, 0, rot);
  const bm = M({ color: 0x1a1b1e, roughness: 0.35, metalness: 0.2 });
  for (let i = 0; i < 9; i++) { const b = add(new THREE.Mesh(new THREE.BoxGeometry(R * 0.72, 0.05, R * 0.42), bm), rot); const a = i / 9 * Math.PI * 2; b.position.set(Math.cos(a) * R * 0.62, 0, Math.sin(a) * R * 0.62); b.rotation.set(0.42, -a, 0, 'YXZ'); }
  return g;
}
const parts = {};
function part(name, o) { const g = new THREE.Group(); mb.add(g); parts[name] = Object.assign({ g, name, in: false }, o); g.position.copy(o.staged.p); g.quaternion.copy(o.staged.q); return g; }

// CPU
const cpuMat = M({ color: 0xd2d4d8, metalness: 1, roughness: 0.3, emissive: 0xff2400, emissiveIntensity: 0 });
{ const g = part('cpu', { staged: pose(19.5, Y0, 9.5, 0, 0.3), home: pose(SX, T + 0.44, SZ), hover: 4.5, gp: [[-2, 0, -2], [2, 0, -2], [2, 0, 2], [-2, 0, 2]] });
  box(4.3, 0.12, 4.3, M({ color: 0x1f5a3c, roughness: 0.6 }), 0, 0, 0, g); box(4.0, 0.42, 4.0, cpuMat, 0, 0.1, 0, g, 0.12);
  const tri = box(0.35, 0.02, 0.35, mat.gold, -1.9, 0.12, 1.9, g); tri.rotation.y = Math.PI / 4; }
const dot = add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), M({ color: 0xb9babd, roughness: 0.55, metalness: 0.2 })), parts.cpu.g); dot.position.set(0, 0.53, 0); dot.scale.set(0, 0, 0);
const hotLight = new THREE.PointLight(0xff5a1e, 0, 22, 2); hotLight.position.set(SX, 2.6, SZ - 2); mb.add(hotLight);
// cooler
{ const g = part('cooler', { staged: pose(25, Y0, -12.5, 0, 0.5), home: pose(SX, T + 0.98, SZ), hover: 8, gp: [[-2, 0, -2], [2, 0, -2], [2, 0, 2], [-2, 0, 2]] });
  box(4.2, 1.1, 4.2, mat.copper, 0, 0, 0, g, 0.1); box(5.4, 0.3, 1.2, mat.silver, 0, 0.9, 0, g);
  [-3.96, -1.32, 1.32, 3.96].forEach(z => { cyl(0.3, 14.6, mat.copper, -1.3, 0.8, z, g, 16); cyl(0.3, 14.6, mat.copper, 1.3, 0.8, z, g, 16); });
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(4.6, 0.045, 12.2), M({ color: 0xc9ccd0, metalness: 1, roughness: 0.3 }), 48); fins.castShadow = fins.receiveShadow = true; g.add(fins);
  for (let i = 0; i < 48; i++) fins.setMatrixAt(i, new THREE.Matrix4().makeTranslation(0, 3.6 + i * 0.245, 0));
  box(4.8, 0.3, 12.4, mat.gun, 0, 15.35, 0, g, 0.1);
  const cf = new THREE.Group(); g.add(cf); cf.position.set(3.75, 9.6, 0); cf.rotation.z = -Math.PI / 2; fan(5.6, cf, 'cpu');
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(1.2, 2.5, 1.2, mat.black, 0, -1.25, 0, cf, 0.2).position.set(a * 5.4, 0, b * 5.4));
  [-1, 1].forEach(b => [-1, 1].forEach(y => { box(12, 0.5, 0.5, mat.black, 0, 0, 0, cf).position.set(0, y, b * 5.75); box(0.5, 0.5, 12, mat.black, 0, 0, 0, cf).position.set(b * 5.75, y, 0); })); }
// RAM
function ramStick(g) {
  box(0.16, 3.1, 13.3, M({ color: 0x0f1012, roughness: 0.6 }), 0, 0, 0, g); box(0.62, 3.0, 13.5, mat.gun, 0, 0.55, 0, g, 0.12); box(0.66, 1.1, 9.5, mat.gunL, 0, 1.4, 0, g, 0.08);
  box(0.5, 0.42, 13.1, RGB(1.6), 0, 3.5, 0, g, 0.15);
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), mat.gold, 40); g.add(pins); for (let i = 0; i < 40; i++) pins.setMatrixAt(i, new THREE.Matrix4().makeTranslation(0, 0.13, -6.2 + i * 0.318));
}
const ramHome = (i) => pose(ramX[i], T + 0.5, SZ);
ramStick(part('ram1', { staged: pose(23, Y0 + 0.33, 1, 0, 0.12, Math.PI / 2), home: ramHome(1), hover: 5.5, gp: [[0, 0, -6.5], [0, 0, 6.5]] }));
ramStick(part('ram2', { staged: pose(27.5, Y0 + 0.33, 2.2, 0, -0.08, Math.PI / 2), home: ramHome(3), hover: 5.5, gp: [[0, 0, -6.5], [0, 0, 6.5]] }));
// SSD
{ const g = part('ssd', { staged: pose(19, Y0, 15, 0, 0.3), home: pose(-0.9, T + 0.32, 7.0), hover: 2.6, tilt: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.28)), gp: [[-3.8, 0, 0], [3.8, 0, 0]] });
  box(8, 0.1, 2.2, M({ color: 0x15171b, roughness: 0.5 }), 0, 0, 0, g); box(2.2, 0.14, 1.6, mat.black, -1.5, 0.1, 0, g); box(1.2, 0.14, 1.2, mat.black, 1.4, 0.1, 0, g); box(4.6, 0.02, 1.7, M({ color: 0xece8de, roughness: 0.7 }), -0.6, 0.25, 0, g); box(0.4, 0.11, 2.0, mat.gold, -3.9, 0, 0, g); }
// GPU
{ const g = part('gpu', { staged: pose(-5, Y0, 23.5, 0, 0.07), home: pose(0.4, T + 7.3, 2.32, Math.PI / 2), hover: 9, gp: [[-11.5, 1.2, 6.5], [-3.5, 1.2, 6.5]] });
  box(29.5, 4.6, 12.2, mat.gun, 0, 0.25, 0, g, 0.5); box(29.9, 0.25, 12.4, mat.alu, 0, 0, 0, g, 0.1);
  box(29.0, 0.35, 11.6, M({ color: 0x1a1b1f, roughness: 0.42, metalness: 0.5 }), 0, 4.75, 0, g, 0.15);
  [-9.6, 0, 9.6].forEach(x => { cyl(4.75, 0.5, M({ color: 0x090a0b, roughness: 0.7 }), x, 4.72, 0, g, 48); const f = fan(4.35, g, 'gpu'); f.position.set(x, 5.2, 0); });
  [-4.8, 4.8].forEach(x => { const s = box(0.5, 0.2, 9, mat.gunL, x, 5.0, 0, g); s.rotation.y = 0.5; });
  box(0.18, 5.4, 12.6, mat.silver, -15.0, 0, 0.6, g); box(8.6, 0.16, 0.9, mat.gold, -7.5, 1.2, 6.5, g);
  box(6, 0.12, 0.5, RGB(1.4), 9, 5.0, 5.6, g); box(2.2, 1.1, 0.5, mat.black, 9, 2.2, -6.2, g, 0.05); }
// syringe (tool)
const sy = new THREE.Group(); mb.add(sy);
{ cyl(0.75, 6.5, M({ color: 0xdedcd6, roughness: 0.35 }), 0, 0, 0, sy, 20); cyl(1.2, 0.25, mat.white, 0, 6.5, 0, sy, 20); cyl(0.25, 3, mat.white, 0, 6.5, 0, sy, 12); cyl(1.0, 0.25, mat.white, 0, 9.5, 0, sy, 20); cyl(0.3, 1.4, mat.accent, 0, -1.4, 0, sy, 12, 0.6); box(0.02, 3.2, 1.1, M({ color: 0x2a2b2e }), 0.75, 1.5, 0, sy); }
const syStaged = pose(-19, 0.2, 5, 0, 0.9, Math.PI / 2), syUse = pose(SX - 0.67, T + 2.6, SZ, 0, 0, 0.5);
sy.position.copy(syStaged.p); sy.quaternion.copy(syStaged.q);

// PSU + cables
const psu = new THREE.Group(); scene.add(psu);
box(15, 8.6, 16, M({ color: 0x151618, roughness: 0.55, metalness: 0.4 }), 0, 0, 0, psu, 0.25); cyl(6.2, 0.1, M({ color: 0x08090a, roughness: 0.8 }), 0, 8.58, 0, psu, 48);
for (let i = 1; i <= 7; i++) { const t = add(new THREE.Mesh(new THREE.TorusGeometry(i * 0.85, 0.07, 6, 48), mat.silver), psu); t.rotation.x = Math.PI / 2; t.position.y = 8.75; }
box(0.1, 3, 9, mat.white, 7.52, 3, 0, psu); psu.position.set(31, 0, -19); psu.rotation.y = -0.35;
function cableOf(pts, r, plug) {
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p)), false, 'catmullrom', 0.4), 90, r, 10);
  const m = add(new THREE.Mesh(geo, mat.cable), mb); const n = geo.index.count; geo.setDrawRange(0, 0);
  const e = pts[pts.length - 1]; const pl = box(plug[0], plug[1], plug[2], mat.black, e[0], e[1] - plug[1] * 0.35, e[2], mb, 0.06); pl.visible = false;
  return { geo, n, pl, k: 0 };
}
const cables = {
  atx: cableOf([[23.5, 3.5, -17], [20.5, 1.2, -12], [18.5, 1.0, -7.5], [16.6, 3.4, -5.8], [14.4, 3.6, -5.5], [14.4, T + 1.6, -5.5]], 0.5, [1.3, 1.1, 5.4]),
  cpu: cableOf([[23.5, 4, -18.5], [15, 0.2, -16.5], [-1, -0.1, -15.6], [-8.5, 0.8, -14.6], [-9.6, 3.2, -12.4], [-9.6, T + 1.5, -11.5]], 0.34, [2.3, 1.0, 1.1]),
  gpu: cableOf([[23.5, 5, -15.8], [22, 9.5, -8], [17, 15.5, 1.5], [11.6, 17.6, 4.9], [9.4, 16.4, 5.12], [9.4, 14.1, 5.12]], 0.34, [2.3, 1.0, 0.9]),
};
// decor: case, screwdriver, tray
{ const pc = new THREE.Group(); scene.add(pc); box(22, 47, 45, M({ color: 0xf1ede4, roughness: 0.5, metalness: 0.1 }), 0, 0.8, 0, pc, 0.8); box(0.3, 41, 39, M({ color: 0x1b1d21, roughness: 0.08, metalness: 0.6 }), 11.05, 3.8, 0, pc); pc.position.set(-34, 0, -38); pc.rotation.y = 0.5;
  const sd = new THREE.Group(); scene.add(sd); cyl(1.25, 9.5, mat.accent, 0, 0, 0, sd, 12); cyl(1.3, 1.2, mat.rubber, 0, 9.4, 0, sd, 12); cyl(0.6, 1.5, mat.rubber, 0, -1.5, 0, sd, 12, 1.2); cyl(0.24, 10, mat.silver, 0, -11.4, 0, sd, 12); cyl(0.05, 1.0, mat.silver, 0, -12.4, 0, sd, 8, 0.24);
  sd.rotation.order = 'YXZ'; sd.rotation.set(0, 1.25, Math.PI / 2); sd.position.set(24, 1.25, 25);
  const tray = new THREE.Group(); scene.add(tray); cyl(4.2, 0.5, M({ color: 0x25272b, metalness: 0.7, roughness: 0.35 }), 0, 0, 0, tray, 48); cyl(3.7, 0.12, M({ color: 0x15161a, metalness: 0.5, roughness: 0.5 }), 0, 0.45, 0, tray, 48);
  for (let i = 0; i < 16; i++) { const a = rnd() * 7, r = rnd() * 2.9; const s = new THREE.Group(); tray.add(s); cyl(0.3, 0.14, i % 3 ? mat.silver : mat.gold, 0, 0, 0, s, 10); cyl(0.13, 0.7, i % 3 ? mat.silver : mat.gold, 0, -0.7, 0, s, 8); s.position.set(Math.cos(a) * r, 0.75, Math.sin(a) * r); s.rotation.set(Math.PI / 2 + (rnd() - .5) * .3, rnd() * 6, 0); }
  tray.position.set(-22, 0, 14); }
// smoke
const smokeTex = canvasTex(256, 256, (c) => { const g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.5, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
const smoke = []; for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: new THREE.Color().setHSL(0.08, 0.06, 0.62 + rnd() * 0.25), transparent: true, opacity: 0, depthWrite: false })); s.userData = { ph: rnd(), sp: 0.12 + rnd() * 0.1, dx: rnd() - .5, dz: rnd() - .5, o: 0.16 + rnd() * 0.22 }; s.visible = false; mb.add(s); smoke.push(s); }
const guides = new THREE.Group(); mb.add(guides);
const guideMat = new THREE.LineDashedMaterial({ color: 0x1d1b16, dashSize: 0.45, gapSize: 0.35, transparent: true, opacity: 0.7 });

// ---------------------------------------------------------------- tweening
const tweens = []; const eio = (k) => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, eout = (k) => 1 - Math.pow(1 - k, 3), ein = (k) => k * k;
const FX = { fast: false, heat: 0, smoke: 0, power: 0, fanCpu: 0, fanGpu: 0 };
const sp = (ms) => FX.fast ? ms * 0.38 : ms;
function tw(ms, fn, ease = eio) { return new Promise(res => tweens.push({ t: 0, d: Math.max(sp(ms), 1), fn, ease, res })); }
const wait = (ms) => tw(ms, () => { });
function move(obj, to, ms, ease) { const p0 = obj.position.clone(), q0 = obj.quaternion.clone(); return tw(ms, k => { obj.position.lerpVectors(p0, to.p, k); obj.quaternion.slerpQuaternions(q0, to.q, k); }, ease); }
const hoverPose = (P) => lift(P.home, P.hover, P.tilt);
let flyId = 0; controls.addEventListener('start', () => flyId++);
function fly(pos, tg, ms = 1100) {
  const id = ++flyId; const f = mobile ? 1.12 : Math.min(1.5, Math.max(1, 1.7 / camera.aspect)) * 1.3; pos = [tg[0] + (pos[0] - tg[0]) * f, tg[1] + (pos[1] - tg[1]) * f, tg[2] + (pos[2] - tg[2]) * f];
  const p0 = camera.position.clone(), t0 = controls.target.clone(), p1 = V3(...pos), t1 = V3(...tg);
  return tw(ms, k => { if (id !== flyId) return; camera.position.lerpVectors(p0, p1, k); controls.target.lerpVectors(t0, t1, k); });
}
function showGuides(names) {
  guides.clear();
  names.forEach(n => { const P = parts[n], h = hoverPose(P); P.gp.forEach(o => { const a = V3(...o).applyQuaternion(h.q).add(h.p), b = V3(...o).applyQuaternion(P.home.q).add(P.home.p); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), guideMat); l.computeLineDistances(); guides.add(l); }); });
}

// ---------------------------------------------------------------- steps
const steps = [
  { id: 'cpu', k: 'Processor', t: 'Drop in the CPU', p: 'Match the gold triangle to the corner of the socket and lower the chip flat. No force. The lever does the pressing.', parts: ['cpu'], acts: [['Install it', true]], view: [[14, 27, 26], [-3, 3, -6]] },
  { id: 'paste', k: 'Thermal paste', t: 'Add thermal paste', p: 'A pea-size dot in the middle. The cooler spreads it and fills the microscopic air gaps between two pieces of metal.', parts: [], acts: [['Apply a dot', true], ['Skip it', false]], view: [[12, 22, 20], [-3, 2, -6.5]] },
  { id: 'cooler', k: 'Cooling', t: 'Mount the cooler', p: 'Lower the tower straight down onto the chip. Tighten the screws in a cross pattern so the pressure stays even.', parts: ['cooler'], acts: [['Install it', true]], view: [[20, 34, 36], [-2, 7, -5]] },
  { id: 'ram', k: 'Memory', t: 'Seat the RAM', p: 'Two sticks go in slots A2 and B2, never side by side. Push down until both latches click.', parts: ['ram1', 'ram2'], acts: [['A2 + B2', true], ['A1 + A2', false]], view: [[27, 27, 22], [3, 4, -6.5]] },
  { id: 'ssd', k: 'Storage', t: 'Slide in the SSD', p: 'The M.2 drive goes into its slot at an angle, folds flat against the board and takes one tiny screw.', parts: ['ssd'], acts: [['Install it', true]], view: [[9, 24, 30], [-1, 1.5, 4]] },
  { id: 'gpu', k: 'Graphics', t: 'Seat the graphics card', p: 'Top PCIe slot, the one wired straight to the CPU. Push until the latch at the end of the slot snaps shut.', parts: ['gpu'], acts: [['Install it', true]], view: [[24, 33, 48], [0, 7, 3]] },
  { id: 'power', k: 'Power', t: 'Plug the power', p: 'Three cables from the supply: 24-pin for the board, 8-pin for the CPU and one more for the graphics card.', parts: [], acts: [['Plug all three', true], ['Skip the GPU cable', false]], view: [[36, 40, 38], [5, 6, -6]] },
  { id: 'test', k: 'First boot', t: 'Power on', p: 'Moment of truth. The board checks four things in order and lights a debug LED for each: CPU, DRAM, VGA, BOOT.', parts: [], acts: [['Power on', true]], view: [[27, 34, 46], [0, 6, 1]] },
];
const rows = [['CPU', 'Ryzen 5 7600', 199, 0], ['Board', 'B650 ATX', 169, -1], ['Cooler', 'Tower, 120 mm', 35, 2], ['Memory', '32 GB DDR5-6000', 104, 3], ['SSD', '1 TB NVMe', 74, 4], ['GPU', 'RTX 4070 Super', 599, 5], ['PSU', '750 W Gold', 99, 6]];
const TOTAL = rows.reduce((a, r) => a + r[2], 0);
const S = { i: 0, done: [], busy: false, run: 0, exploded: false, labels: false, testing: false };
const stepIdx = (id) => steps.findIndex(s => s.id === id);
const choice = (id) => S.done[stepIdx(id)];

function setCard(tag, cls, title, text, btns) {
  $('#sTag').textContent = tag; $('#sTag').className = 'mono ' + (cls || ''); $('#sTitle').textContent = title; $('#sText').textContent = text;
  const b = $('#sBtns'); b.innerHTML = ''; btns.forEach(([label, fn, ghost]) => { const e = document.createElement('button'); e.className = 'btn' + (ghost ? ' g' : ''); e.textContent = label; e.onclick = fn; b.appendChild(e); });
}
function renderUI() {
  const st = steps[S.i];
  if (!S.testing) setCard(`Step 0${S.i + 1} / 0${steps.length} · ${st.k}`, '', st.t, st.p, st.acts.map(([l, ok], n) => [l, () => install(ok), n > 0]));
  $('#steps').innerHTML = ''; steps.forEach((s, j) => { const e = document.createElement('button'); e.innerHTML = `<b>0${j + 1}</b>${s.t}`; if (j < S.i) { e.className = 'd' + (S.done[j] === false ? ' x' : ''); e.onclick = () => goto(j); e.title = 'Redo this step'; } else if (j === S.i) e.className = 'a'; $('#steps').appendChild(e); });
  let sum = 0, n = 0; $('#rows').innerHTML = rows.map(([k, name, price, si]) => { const inn = si < S.i; if (inn) { sum += price; n++; } return `<div class="row${inn ? ' in' : ''}${si === S.i ? ' act' : ''}"><s>${k}</s><span>${name}</span><u>$${price}</u></div>`; }).join('');
  $('#bHead').textContent = `Your build · ${n} of ${rows.length} placed`; $('#bSum').textContent = '$' + sum.toLocaleString('en-US'); $('#bBar').style.width = (sum / 1500 * 100) + '%';
  document.querySelector('.tot span').textContent = `of $${TOTAL.toLocaleString('en-US')} on the bench`;
}
async function preview() {
  renderUI(); const st = steps[S.i]; fly(...st.view);
  if (S.exploded) return;
  await Promise.all(st.parts.map(n => move(parts[n].g, hoverPose(parts[n]), 750, eout)));
  if (!S.busy && steps[S.i] === st) showGuides(st.parts);
}
async function drop(n) { const P = parts[n]; await move(P.g, P.home, 480, ein); P.in = true; const y = P.g.position.y; await tw(140, k => { P.g.position.y = y - Math.sin(k * Math.PI) * 0.12; }); }
async function growCable(c, on) { c.pl.visible = false; const k0 = c.k; await tw(on ? 900 : 1, k => { c.k = k0 + ((on ? 1 : 0) - k0) * k; c.geo.setDrawRange(0, Math.floor(c.n * c.k / 60) * 60); }); c.pl.visible = on; }
async function install(ok) {
  if (S.busy) return; S.busy = true; const run = S.run, st = steps[S.i]; guides.clear();
  if (S.exploded) await setExploded(false);
  if (st.id === 'paste') { if (ok) { await move(sy, syUse, 650); await tw(450, k => dot.scale.set(k, 0.3 * k, k), eout); await move(sy, syStaged, 650); } }
  else if (st.id === 'ram') { parts.ram2.home = ramHome(ok ? 3 : 0); if (!ok) await move(parts.ram2.g, hoverPose(parts.ram2), 450); await drop('ram1'); await drop('ram2'); }
  else if (st.id === 'power') { await growCable(cables.atx, true); await growCable(cables.cpu, true); if (ok) await growCable(cables.gpu, true); }
  else if (st.id === 'test') { if (run === S.run) { S.busy = false; runTest(); } return; }
  else for (const n of st.parts) await drop(n);
  if (run !== S.run) return;
  S.done[S.i] = ok; S.i++; S.busy = false; await preview();
}
function resetTest() {
  S.testing = false; document.body.classList.remove('test'); FX.heat = FX.smoke = FX.power = FX.fanCpu = FX.fanGpu = 0; callout.style.display = 'none';
  leds.forEach((_, i) => setLed(i, '')); setTemp(null); $('#vF').textContent = '0'; $('#mF').style.width = 0; $('#vP').textContent = '0'; $('#mP').style.width = 0; $('#vL').textContent = 'Standby';
  ['#cT', '#cF', '#cP', '#cL'].forEach(s => $(s).className = 'card'); $('#nF').textContent = 'waiting for power'; $('#nP').textContent = 'from a 750 W supply';
}
async function goto(j, quiet) {
  S.run++; tweens.length = 0; S.busy = false; guides.clear(); resetTest(); S.exploded = false; $('#tEx').classList.remove('on');
  const undo = [];
  for (let k = steps.length - 1; k >= 0; k--) {
    const st = steps[k], keep = k < j;
    st.parts.forEach(n => { const P = parts[n]; P.in = keep; undo.push(move(P.g, keep ? P.home : P.staged, 520)); });
    if (st.id === 'paste') dot.scale.setScalar(0), keep && S.done[k] && dot.scale.set(1, 0.3, 1);
    if (st.id === 'power') { growCable(cables.atx, keep); growCable(cables.cpu, keep); growCable(cables.gpu, keep && S.done[k]); }
  }
  undo.push(move(sy, syStaged, 400));
  S.done.length = j; S.i = j; renderUI(); await Promise.all(undo); if (!quiet) preview();
}
async function setExploded(on) {
  S.exploded = on; $('#tEx').classList.toggle('on', on); const names = Object.keys(parts).filter(n => parts[n].in);
  if (on) { const st = steps[S.i]; st.parts.forEach(n => move(parts[n].g, parts[n].staged, 500)); guides.clear(); }
  await Promise.all(names.map(n => move(parts[n].g, on ? hoverPose(parts[n]) : parts[n].home, 700)));
  if (on) showGuides(names); else { guides.clear(); if (!S.testing && !S.busy) preview(); }
}

// ---------------------------------------------------------------- power-on test
const LEDC = { r: 0xff2a10, w: 0xffffff, g: 0x40d070 };
function setLed(i, s) { leds[i].material.emissive.setHex(s ? LEDC[s] : 0); leds[i].material.emissiveIntensity = s ? 5 : 0; $('#dots').children[i].className = s; if (i === 0) { ledLight.intensity = s === 'r' ? 14 : 0; } }
function setTemp(t) { $('#vT').textContent = t == null ? '--' : Math.round(t); $('#mT').style.left = (t == null ? 0 : Math.min(99, Math.max(0, (t - 20) / 90 * 100))) + '%'; $('#cT').className = 'card' + (t > 95 ? ' bad' : ''); }
function setFan(rpm) { $('#vF').textContent = Math.round(rpm).toLocaleString('en-US'); $('#mF').style.width = (rpm / 2150 * 100) + '%'; FX.fanCpu = rpm / 2150; }
function setPow(w) { $('#vP').textContent = Math.round(w); $('#mP').style.width = Math.min(100, w / 300 * 100) + '%'; }
async function runTest() {
  const run = ++S.run; S.busy = true; S.testing = true; guides.clear(); const live = () => run === S.run;
  if (S.exploded) { S.exploded = false; $('#tEx').classList.remove('on'); Object.values(parts).filter(P => P.in).forEach(P => move(P.g, P.home, 500)); }
  document.body.classList.add('test'); setCard('Power-on test · running', '', 'Booting…', 'Watch the four debug LEDs. Each one lights while its check runs and goes green when it passes.', []);
  fly(...steps[7].view); await wait(700); if (!live()) return;
  const paste = choice('paste'), gcab = choice('power'), ramOK = choice('ram');
  FX.power = 1; FX.fanGpu = gcab ? 0.5 : 0; $('#nF').textContent = 'spinning up'; $('#vL').textContent = 'Checking CPU'; setLed(0, 'w');
  tw(900, k => { setFan(900 * k); setPow(52 * k); }); tw(900, k => setTemp(24 + 10 * k));
  await wait(1100); if (!live()) return;
  if (!paste) {
    $('#nF').textContent = '100% and still losing';
    await tw(4200, k => { const t = 34 + 70 * eout(k); setTemp(t); setFan(900 + 1250 * Math.min(1, k * 1.6)); setPow(52 + 46 * k); FX.heat = Math.max(0, (t - 60) / 44); if (t > 95) { setLed(0, 'r'); $('#vL').textContent = 'CPU fault'; $('#cL').className = 'card bad'; } }, (k) => k);
    if (!live()) return; FX.power = 0; FX.fanGpu = 0; rgbPower(0); tw(1200, k => { setFan(2150 * (1 - k)); setPow(98 * (1 - k)); }); $('#nP').textContent = 'cut by the board'; $('#nF').textContent = 'shut down';
    await wait(500); if (!live()) return;
    growCable(cables.gpu, false); move(parts.gpu.g, parts.gpu.staged, 1100); fly([15, 21, 22], [-2.5, 4.2, -4], 1500); tw(1200, k => FX.smoke = k);
    await move(parts.cooler.g, pose(SX - 4.5, T + 5.2, SZ - 3, 0.12, 0, 0.5), 1300); if (!live()) return;
    showCallout([SX + 1.4, 1.2, SZ + 1.4], 'Bare heat spreader. No paste.');
    setCard('Power-on test · failed', 'bad', 'You cooked the CPU', 'Dry metal on dry metal barely moves heat. The chip shot past its 95 °C limit and the board cut the power to save it. A real chip survives this. Your evening does not.', [['Redo step 02', () => goto(1)], ['Start over', () => goto(0), 1]]);
    S.busy = false; return;
  }
  tw(2600, k => setTemp(34 + 7 * k)); setLed(0, 'g'); setLed(1, 'w'); $('#vL').textContent = 'Checking memory'; await wait(800); if (!live()) return;
  setLed(1, 'g'); setLed(2, 'w'); $('#vL').textContent = 'Checking graphics'; await wait(900); if (!live()) return;
  if (!gcab) {
    $('#vL').textContent = 'No display'; $('#cL').className = 'card bad'; $('#nP').textContent = 'the card is not drawing any'; fly([20, 30, 44], [2, 8, 3], 1300);
    showCallout([9.4, 13.4, 5.1], 'Empty power socket on the card', true);
    setCard('Power-on test · failed', 'bad', 'Black screen', 'Fans spin, lights glow, no picture. The slot alone can feed a card 75 W and this one needs about 220 W. The board stops at the VGA check and waits.', [['Redo step 07', () => goto(6)], ['Start over', () => goto(0), 1]]);
    S.busy = false; return;
  }
  setLed(2, 'g'); setLed(3, 'w'); $('#vL').textContent = 'Finding boot drive'; tw(800, k => setPow(52 + 18 * k)); await wait(800); if (!live()) return;
  setLed(3, 'g'); $('#nF').textContent = 'quiet, about 40% speed'; $('#nP').textContent = 'idle, from a 750 W supply';
  if (!ramOK) {
    $('#vL').textContent = 'Posts, 1 channel'; $('#cL').className = 'card warn'; fly([8, 38, 3], [4.5, 0, -4.5], 1300); showCallout([ramX[0], 4.6, SZ + 5.5], 'A1 + A2 share one channel', true);
    setCard('Power-on test · passed, sort of', 'warn', 'It boots. Slower than it should.', 'Both sticks sit on the same memory channel, so the CPU reaches them over one lane instead of two. Nothing warns you. Games just lose frames. Move one stick to B2.', [['Redo step 04', () => goto(3)], ['Start over', () => goto(0), 1]]);
  } else {
    $('#vL').textContent = 'It posts'; $('#cL').className = 'card ok';
    setCard('Power-on test · passed', 'ok', 'It posts.', 'Four checks, four passes. This build idles around 41 °C and sips about 70 W. Now go back and break it on purpose: that is what the lab is for.', [['Skip the paste this time', () => kill('paste')], ['Start over', () => goto(0), 1]]);
  }
  S.busy = false;
}
function rgbPower(k) { rgbMats.forEach(m => m.emissiveIntensity = m.userData.k * k); }
async function kill(id) {
  if (S.busy) return; hero.scrollIntoView({ behavior: 'smooth' }); await goto(0, true); const run = S.run; FX.fast = true;
  for (const st of steps) { if (run !== S.run) break; renderUI(); if (st.id === 'test') { FX.fast = false; await install(true); break; } await install(st.id !== id); }
  FX.fast = false;
}

// ---------------------------------------------------------------- pins + lesson
const PINS = [
  ['CPU socket', 'AM5, a grid of 1,718 spring contacts. The chip has flat pads and no pins to bend. Never touch the contacts.', SX, 1.2, SZ + 2.6],
  ['VRM heatsinks', 'Underneath sit the voltage regulators that turn 12 V from the supply into the roughly 1.2 V the CPU runs on.', -9, 3.0, -5.6],
  ['Memory slots', 'Four slots, two channels. A1 and A2 are channel A, B1 and B2 are channel B. Two sticks go in A2 and B2.', 5.2, 1.5, SZ + 5.5],
  ['24-pin ATX power', 'Main power for the whole board. The widest plug in the build, and it only fits one way.', 14.4, 1.9, -5.5],
  ['CPU power, 8-pin', 'A separate 12 V feed just for the processor. Forget it and the board will not start at all.', -9.6, 1.7, -11.5],
  ['PCIe x16 slot', 'The steel-wrapped top slot has a direct line to the CPU. The graphics card goes here, not in the lower one.', -7, 1.5, 3.6],
  ['M.2 slot', 'Where the SSD lives. No cables: the drive plugs straight into the board and is held by one screw.', -5.2, 1.0, 7],
  ['Chipset', 'The traffic controller for USB, SATA and the slower slots. It hides under this flat heatsink.', 9.2, 1.5, 6.6],
  ['Debug LEDs', 'Four tiny lights: CPU, DRAM, VGA, BOOT. If the PC will not start, the one that stays lit names the part to check.', 11.3, 0.6, -9.6],
  ['Rear I/O', 'USB, network, audio and display ports. This edge pokes out through the back of the case.', -13, 3.8, -6.2],
  ['CMOS battery', 'A coin cell that keeps the clock and the BIOS settings alive while the PC is unplugged.', 2.2, 0.9, 2.9],
  ['SATA ports', 'For older 2.5-inch SSDs and hard drives. A modern build can leave all of them empty.', 14.2, 1.1, 5.8],
].map(([name, text, x, y, z], i) => {
  const d = document.createElement('div'); d.className = 'pin'; d.innerHTML = `<b>${i + 1}</b><span><strong>${name}</strong>${text}</span>`; $('#pins').appendChild(d);
  const P = { d, v: V3(x, y, z), name, i }; d.onclick = (e) => { e.stopPropagation(); selectPin(P); };
  const b = document.createElement('button'); b.innerHTML = `<em>${i + 1}</em><div><h3>${name}</h3><p>${text}</p></div>`; b.onclick = () => { hero.scrollIntoView({ behavior: 'smooth' }); setLabels(true); selectPin(P, true); }; $('#parts').appendChild(b);
  return P;
});
let activePin = null;
function selectPin(P, force) { const was = activePin === P && !force; PINS.forEach(q => q.d.classList.remove('on')); activePin = was ? null : P; if (!was) { P.d.classList.add('on'); const w = P.v.clone().add(mb.position); fly([w.x + 9, w.y + 15, w.z + 17], [w.x, w.y, w.z], 1000); } }
function setLabels(on) { S.labels = on; $('#tLb').classList.toggle('on', on); if (!on) { activePin = null; PINS.forEach(q => q.d.classList.remove('on')); } }
const callout = document.createElement('div'); callout.className = 'pin callout'; callout.style.display = 'none'; callout.innerHTML = '<b>!</b><span></span>'; $('#pins').appendChild(callout); let calloutV = V3();
function showCallout(v, text, flip) { calloutV.set(...v); callout.querySelector('span').textContent = text; callout.classList.toggle('flip', !!flip); callout.style.display = ''; }
const tmp = V3();
function place(el, v) { tmp.copy(v).add(mb.position).project(camera); const w = hero.clientWidth, h = hero.clientHeight, x = (tmp.x * .5 + .5) * w, y = (-tmp.y * .5 + .5) * h; el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; return x; }

// ---------------------------------------------------------------- UI wiring
const VIEWS = { q: [[27, 39, 46], [0, 4.5, 4]], top: [[0, 82, 7], [0, 0, 4]], side: [[0, 12, 72], [0, 6, 2]] };
document.querySelectorAll('.bottom [data-v]').forEach(b => b.onclick = () => { document.querySelectorAll('.bottom [data-v]').forEach(x => x.classList.toggle('on', x === b)); fly(...VIEWS[b.dataset.v]); });
$('#tEx').onclick = () => { if (!S.busy) setExploded(!S.exploded); };
$('#tLb').onclick = () => setLabels(!S.labels);
document.querySelectorAll('[data-kill]').forEach(b => b.onclick = () => kill(b.dataset.kill));
if (mobile) { const a = document.querySelector('nav a[href="#lesson"]'); a.style.display = 'block'; $('.hint').textContent = ''; } else $('.hint').textContent = 'Drag to orbit · Ctrl + scroll to zoom';

// ---------------------------------------------------------------- render loop
let composer = null, bokeh = null; const WARP = +(/[?&]warp=(\d+)/.exec(location.search) || [])[1] / 1000 || 0;
if (!lite) {
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera)); bokeh = new BokehPass(scene, camera, { focus: 60, aperture: 0.00016, maxblur: 0.006 }); composer.addPass(bokeh); composer.addPass(new OutputPass());
}
function resize() {
  const w = hero.clientWidth, h = hero.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 50 : w / h < 1.3 ? 40 : 31;
  if (mobile) camera.setViewOffset(w, h, 0, h * 0.13, w, h); camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
addEventListener('resize', resize); resize();
let visible = true; new IntersectionObserver(e => visible = e[0].isIntersecting).observe(hero);
const clock = new THREE.Clock(); let first = true, rgbK = 0, time = 0;
function frame() {
  requestAnimationFrame(frame); if (!visible && !first) return;
  const dt = WARP || Math.min(clock.getDelta(), 0.05); time += dt;
  for (let i = tweens.length - 1; i >= 0; i--) { const t = tweens[i]; t.t += dt * 1000; const k = Math.min(t.t / t.d, 1); t.fn(t.ease(k)); if (k >= 1) { const j = tweens.indexOf(t); if (j >= 0) tweens.splice(j, 1); t.res(); } }
  controls.update();
  fans.forEach(f => f.rot.rotation.y -= dt * 34 * (f.group === 'cpu' ? FX.fanCpu : FX.fanGpu));
  rgbK += ((FX.power ? 1 : 0) - rgbK) * Math.min(1, dt * 5); rgbPower(rgbK);
  cpuMat.emissiveIntensity = 1.15 * FX.heat; cpuMat.color.setRGB(0.82 + 0.18 * FX.heat, 0.83 - 0.45 * FX.heat, 0.85 - 0.7 * FX.heat); cpuMat.metalness = 1 - 0.6 * FX.heat; hotLight.intensity = 220 * FX.heat * (parts.cooler.g.position.y > 3 ? 1 : 0.15);
  smoke.forEach(s => { const u = s.userData, k = (time * u.sp + u.ph) % 1; s.visible = FX.smoke > 0.01; s.position.set(SX + u.dx * (1.5 + k * 5) + k * 2.5, T + 1.4 + k * 13, SZ + u.dz * (1.5 + k * 4)); const sc = 2.2 + k * 8; s.scale.set(sc, sc * 1.25, 1); s.material.opacity = u.o * FX.smoke * Math.sin(k * Math.PI); });
  if (bokeh) { bokeh.uniforms.focus.value = camera.position.distanceTo(controls.target); composer.render(dt); } else renderer.render(scene, camera);
  const showPins = S.labels && !S.testing; const w = hero.clientWidth;
  PINS.forEach(P => { P.d.style.display = showPins ? '' : 'none'; if (showPins) { const x = place(P.d, P.v); P.d.classList.toggle('flip', x > w * 0.58); } });
  if (callout.style.display !== 'none') place(callout, calloutV);
  if (first) { first = false; $('#load').classList.add('off'); window.READY = true; }
}
setLabels(false); renderUI(); preview(); frame();
window.__lab = { S, goto, install, kill, fly, tweens, FX };
