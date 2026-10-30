import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildBody } from './body.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const Q = new URLSearchParams(location.search);
const FIXED = Q.has('t') ? parseFloat(Q.get('t')) : null;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
let PR = Math.min(devicePixelRatio, 2); renderer.setPixelRatio(PR);
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const scene = new THREE.Scene();
// HDR-like equirect "gallery room": tall mullioned window upper-left, cream walls, dark floor + flags for chrome contrast
function galleryEnv() {
  const W = 1024, H = 512, d = new Uint16Array(W * H * 4); const HF = THREE.DataUtils.toHalfFloat;
  const win = (az, el, a0, a1, e0, e1) => az > a0 && az < a1 && el > e0 && el < e1;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + .5) / W, v = (j + .5) / H, A = (u - .5) * Math.PI * 2, E = (v - .5) * Math.PI;
    const x = Math.cos(A) * Math.cos(E), z = Math.sin(A) * Math.cos(E), y = Math.sin(E);
    const az = Math.atan2(z, x) * 180 / Math.PI, el = E * 180 / Math.PI;
    // base: warm cream walls, brighter ceiling, dark warm floor with soft horizon falloff
    const up = Math.max(0, y), dn = Math.max(0, -y);
    let r = .85 + .6 * up, g = .76 + .52 * up, b = .62 + .42 * up;
    const fl = Math.min(1, Math.max(0, dn - .25) * 2.2); r = r * (1 - fl) + .16 * fl; g = g * (1 - fl) + .13 * fl; b = b * (1 - fl) + .1 * fl;
    // dark flags (give mirror chrome its black bands)
    for (const [c, w] of [[80, 4.5], [104, 2.5], [62, 2], [8, 20], [-172, 22], [-50, 8], [-110, 5]]) { const da = Math.abs(((az - c + 540) % 360) - 180); if (da < w && el > -30 && el < 70) { const k = Math.min(1, (w - da) / 2.5); r += (.025 - r) * k; g += (.022 - g) * k; b += (.02 - b) * k; } }
    if (Math.abs(el + 4) < 3.5) { const k = 1 - Math.abs(el + 4) / 3.5; r *= 1 - .9 * k; g *= 1 - .9 * k; b *= 1 - .9 * k; }
    // the window: upper-left-front, 4 panes with mullions + transom
    const wa = 140, ww = 26; if (win(az, el, wa - ww, wa + ww, -14, 58)) { const lx = (az - (wa - ww)) / (2 * ww) * 4, ly = (el + 14) / 72 * 3; const mull = Math.abs(lx - Math.round(lx)) < .05 || Math.abs(ly - Math.round(ly)) < .045;
      if (!mull) { const k = 16 * (0.8 + 0.2 * (el + 14) / 72); r = k; g = k * .93; b = k * .8; } else { r = g = b = .03; } }
    // soft overhead bounce + a narrow warm strip camera-right for a rim highlight
    if (el > 72) { const k = 2.2 * (el - 72) / 18; r += k; g += k * .95; b += k * .86; }
    if (win(az, el, 38, 56, 10, 48)) { const m2 = Math.abs(az - 47) < .8; r = m2 ? .05 : 7; g = m2 ? .05 : 6.5; b = m2 ? .05 : 5.6; }
    const o = (j * W + i) * 4; d[o] = HF(r); d[o + 1] = HF(g); d[o + 2] = HF(b); d[o + 3] = HF(1);
  }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.HalfFloatType); t.mapping = THREE.EquirectangularReflectionMapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromEquirectangular(galleryEnv()).texture;
scene.environmentIntensity = 1.0;
if (Q.has('envbg')) scene.background = scene.environment;
if (Q.has('sph')) { const sp = new THREE.Mesh(new THREE.SphereGeometry(2.5, 64, 32), new THREE.MeshPhysicalMaterial({ color: '#f2f0ec', metalness: 1, roughness: 0.035 })); sp.position.set(-5, 2, 3); scene.add(sp); }

const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 600);
camera.position.set(0, 3.2, 21);

// ---------- lights: soft window key from upper-left, warm bounce
scene.add(new THREE.HemisphereLight('#fff4e4', '#8a7c68', 0.22));
const key = new THREE.DirectionalLight('#fff0db', 2.6);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 22; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
{ const c = key.shadow.camera; c.near = 0.5; c.far = 220; c.left = c.bottom = -10; c.right = c.top = 10; }
scene.add(key);
const rim = new THREE.DirectionalLight('#dfe7f0', 0.35); rim.position.set(9, 6, -8); scene.add(rim);
const rim2 = new THREE.DirectionalLight('#eef1f5', 0.25); rim2.position.set(-6, -3, 8); scene.add(rim2);
const under = new THREE.PointLight('#fff', 0), fill = new THREE.PointLight('#fff', 0);
// the canvas wall + floor only receive shadows; the linen itself is CSS behind the transparent canvas
const wall = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ color: '#3a2c1e', opacity: 0.34 }));
wall.receiveShadow = true; wall.position.z = -3.2; scene.add(wall);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ color: '#3a2c1e', opacity: 0.12 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -6.2; floor.receiveShadow = true; floor.visible = false; scene.add(floor);
const ring = new THREE.Mesh(), ring2 = new THREE.Mesh(); ring.material = new THREE.MeshBasicMaterial(); const shafts = []; const dust = new THREE.Object3D();
const bloom = {}, fx = { uniforms: { uTime: {}, uCA: {} } };

// ---------- materials
function pcbTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#1d2621'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#7d6a3e'; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { let x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { Math.random() < .5 ? x += (Math.random() - .5) * 120 : y += (Math.random() - .5) * 120; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = '#c9a35a'; for (let i = 0; i < 80; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const chrome = new THREE.MeshPhysicalMaterial({ color: '#f2f0ec', metalness: 1, roughness: 0.035 });
const satin = new THREE.MeshPhysicalMaterial({ color: '#b9b8b4', metalness: 1, roughness: 0.16 });
const brushed = new THREE.MeshPhysicalMaterial({ color: '#a4a3a0', metalness: 1, roughness: 0.2, anisotropy: 0.6 });
const ceramic = new THREE.MeshPhysicalMaterial({ color: '#ddd1bc', metalness: 0, roughness: 0.4, clearcoat: 0.9, clearcoatRoughness: 0.07, envMapIntensity: 0.38 });
const ceramic2 = ceramic.clone(); ceramic2.color = new THREE.Color('#e7dccb');
const braid = new THREE.MeshStandardMaterial({ color: '#191715', roughness: 0.55, metalness: 0.1 });
const M = {
  dark: satin, shell: chrome, steel: brushed,
  brass: new THREE.MeshPhysicalMaterial({ color: '#d9ae5c', metalness: 1, roughness: 0.12 }),
  carbon: brushed,
  rubber: new THREE.MeshStandardMaterial({ color: '#2b2825', roughness: 0.72, metalness: 0 }),
  pcb: new THREE.MeshStandardMaterial({ map: pcbTex(), roughness: 0.5, metalness: 0.3 }),
  cable: braid,
  led: new THREE.MeshStandardMaterial({ color: '#3a2a1a', emissive: '#ffb070', emissiveIntensity: 0.4 }),
  glow: braid,
};
const MB = { ...M, chrome, shell: ceramic, carbon: ceramic2, dark: satin, glow: new THREE.MeshStandardMaterial({ color: '#4a443d', roughness: 0.45, metalness: 0.2 }), rubber: new THREE.MeshPhysicalMaterial({ color: '#3a3631', roughness: 0.5, metalness: 0.3 }) };

// ---------- explode system
const parts = []; // {obj, base:Vector3, off:Vector3}
function P(obj, off, parent) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  parent.add(obj); parts.push({ obj, base: obj.position.clone(), off: new THREE.Vector3(...off) }); return obj;
}
const labels = []; // {obj, name, id}
function L(obj, name, note) { labels.push({ obj, name, note }); }
const mesh = (g, m) => new THREE.Mesh(g, m);
const cylX = (r, l, s = 20) => new THREE.CylinderGeometry(r, r, l, s).rotateZ(Math.PI / 2);

const hand = new THREE.Group(); scene.add(hand);
const handInner = new THREE.Group(); hand.add(handInner);
handInner.position.y = -2.4;
const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
const sstep = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
// ---------- palm: sculpted anatomical shell (superellipsoid warped along the hand)
const PW = 3.3, PH = 3.9, PD = 0.9;
function palmGeo(dorsal, inset = 0) {
  const g = new THREE.SphereGeometry(1, 96, 64, dorsal ? 0 : Math.PI, Math.PI); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const u = (y + 1) / 2; const hw = (1.16 + 0.4 * sstep(0, 0.8, u) - 0.04 * sstep(.85, 1, u)) - inset;
    const X = Math.sign(x) * Math.pow(Math.abs(x), 0.42) * hw;
    const Y = -0.2 + (Math.sign(y) * Math.pow(Math.abs(y), 0.5) + 1) / 2 * (PH + 0.2) + 0.12 * Math.cos(X * 0.9) - 0.12;
    const az = Math.pow(Math.abs(z), dorsal ? 0.72 : 0.6);
    let Z = dorsal ? az * (0.35 + 0.08 * Math.sin(Math.PI * Math.min(1, u * 1.1))) - 0.22 * (X * X) / (hw * hw) * az + 0.16 + 0.035 * sstep(.45, .95, u) * Math.cos(X * 7.9) * az : -az * 0.32 + 0.16;
    p.setXYZ(i, X, Y, Z - inset * 0.5 * Math.sign(Z - 0.16)); }
  g.computeVertexNormals(); return g;
}
const palmG = new THREE.Group(); handInner.add(palmG); const palm = palmG;
const chassis = P(mesh(palmGeo(false), M.dark), [0, 0, -1.2], palmG);
L(chassis, 'METACARPAL FRAME', '7075-T6 aluminum · satin finish');
// dorsal shell (mirror chrome) with seam + screw heads
const backPlate = new THREE.Group();
backPlate.add(mesh(palmGeo(true), M.shell));
{ const screw = lathe([[0, .05], [.06, .045], [.075, .02], [.075, 0]], 24); const slot = new THREE.BoxGeometry(.11, .018, .02);
  for (const [x, y] of [[-1.05, .35], [1.05, .35], [-1.35, 3.1], [1.4, 3.05]]) { const s = new THREE.Group(); s.add(mesh(screw, M.brass)); const sl = mesh(slot, M.dark); sl.position.y = .05; sl.rotation.y = x; s.add(sl); s.position.set(x, y, 0.52 - Math.abs(x) * 0.12); s.rotation.x = Math.PI / 2; s.lookAt(s.position.clone().add(new THREE.Vector3(x * .25, 0, 1))); s.rotateX(Math.PI / 2); backPlate.add(s); } }
P(backPlate, [0, 0, 3.6], palmG); L(backPlate, 'DORSAL SHELL', 'mirror-polished 316L · hand-finished');
// internals (revealed on explode)
const pcb = new THREE.Group(); pcb.position.set(0, PH / 2, 0.42);
pcb.add(mesh(new RoundedBoxGeometry(2.0, 1.9, 0.04, 2, 0.015), M.pcb));
for (let i = 0; i < 4; i++) { const ch = mesh(new RoundedBoxGeometry(0.34, 0.3, 0.06, 2, .02), M.rubber); ch.position.set(-0.6 + i * 0.4, (i % 2 - .5) * 0.6, 0.04); pcb.add(ch); }
P(pcb, [0, 0, 2.4], palmG); L(pcb, 'MOTOR DRIVER BOARD', 'FOC current control · CAN-FD bus');
const FX = [-1.06, -0.355, 0.355, 1.06], FY = [-0.08, 0.1, 0.04, -0.24];
const pistons = [];
const can = lathe([[0, -.32], [.17, -.32], [.2, -.29], [.2, .26], [.17, .3], [.07, .3], [.07, .36], [0, .36]], 32);
FX.forEach((x, i) => {
  const s = new THREE.Group(); s.add(mesh(can, M.steel)); const bandR = new THREE.Mesh(new THREE.TorusGeometry(.2, .02, 8, 32).rotateX(Math.PI / 2), M.brass); bandR.position.y = .2; s.add(bandR);
  s.position.set(x * 0.85, 1.25, 0.2); P(s, [x * 0.5, -0.4, 1.5], palmG); if (i == 2) L(s, 'BLDC SERVO + HARMONIC DRIVE 100:1', 'frameless motor · strain-wave gear');
  const pg = new THREE.Group(); pg.position.set(x * 0.85, 1.7, 0.02);
  { const q = mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 20), M.dark); q.position.y = 0.55; pg.add(q); }
  { const q = mesh(new THREE.TorusGeometry(.09, .02, 8, 24).rotateX(Math.PI / 2), M.brass); q.position.y = 1.1; pg.add(q); }
  const rod = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 12), M.steel); rod.position.y = 1.5; pg.add(rod);
  P(pg, [x * 0.5, 0, -2.2], palmG); pistons.push(rod); if (i == 1) L(pg, 'LINEAR ACTUATOR', 'ball screw · finger flexion');
});
// harmonic drive ring gear (circular spline with bolt circle) inside the palm base
function gearGeo(R, n, h, holes) { const s = new THREE.Shape(); const N = n * 8; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, k = (i % 8) / 8; const r = R + (k > .2 && k < .7 ? h : 0) * (1 - Math.abs(k - .45) * 1.2); i ? s.lineTo(r * Math.cos(a), r * Math.sin(a)) : s.moveTo(r * Math.cos(a), r * Math.sin(a)); }
  const hi = new THREE.Path(); hi.absarc(0, 0, R * 0.62, 0, Math.PI * 2, true); s.holes.push(hi);
  for (let k = 0; k < holes; k++) { const a = k / holes * Math.PI * 2, hp = new THREE.Path(); hp.absarc(Math.cos(a) * R * .8, Math.sin(a) * R * .8, R * .055, 0, Math.PI * 2, true); s.holes.push(hp); }
  return new THREE.ExtrudeGeometry(s, { depth: .14, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 2, curveSegments: 24 }).translate(0, 0, -.07); }
const hd = new THREE.Group(); hd.add(mesh(gearGeo(0.62, 56, 0.05, 10), M.steel));
{ const fs = mesh(new THREE.CylinderGeometry(.36, .36, .2, 48, 1, true).rotateX(Math.PI / 2), M.shell); fs.material = M.shell; hd.add(fs); }
hd.position.set(0.25, 0.55, 0.22); P(hd, [3.3, 2.2, 1.2], palmG); const hdA = new THREE.Object3D(); hdA.position.set(0.5, 0.42, 0); hd.add(hdA); L(hdA, 'HARMONIC DRIVE', 'CSD-14 · 2 arc-min backlash · design target');
// bearing stack in the wrist
const bstack = new THREE.Group();
{ const race = lathe([[.16, -.08], [.3, -.08], [.33, -.05], [.33, .05], [.3, .08], [.16, .08], [.14, .05], [.14, -.05], [.16, -.08]], 40);
  for (let i = 0; i < 4; i++) { const r = mesh(race, M.steel); r.position.y = -i * 0.24; bstack.add(r); }
  const ball = new THREE.SphereGeometry(.085, 24, 16); for (let i = 0; i < 3; i++) { const b = mesh(ball, M.shell); b.position.set(.5 + i * .22, -.1 - i * .12, 0); bstack.add(b); } }
bstack.position.set(0, -0.6, 0.1); P(bstack, [0.2, 2.3, 1.6], palmG); L(bstack, 'STEEL BALL BEARINGS', '440C stainless · ABEC-5 precision');
// palm tactile skin (conformal, dark)
const pad = mesh(palmGeo(false, 0.22), M.rubber); pad.scale.set(0.95, 0.86, 1.06); pad.position.set(0, 0.28, -0.02);
P(pad, [0, 0, -3.6], palmG); L(pad, 'CAPACITIVE TACTILE SKIN', 'palm pressure array');
// wrist cuff: lathe with chamfers, groove and brass inlay
const wrist = new THREE.Group(); wrist.position.set(0, -0.15, 0.12);
const cuffP = [[1.0, -1.25], [1.08, -1.23], [1.12, -1.16], [1.12, -0.86], [1.08, -0.83], [1.04, -0.8], [1.04, -0.74], [1.1, -0.71], [1.16, -0.66], [1.18, -0.28], [1.15, -0.17], [1.08, -0.09], [0.96, 0.02], [0.88, 0.04]];
const wbody = mesh(lathe(cuffP, 72), M.shell); wbody.scale.z = 0.62; wrist.add(wbody);
{ const inl = mesh(new THREE.TorusGeometry(1.07, 0.028, 10, 72).rotateX(Math.PI / 2), M.brass); inl.position.y = -0.77; inl.scale.z = .62; wrist.add(inl);
  for (const s of [-1, 1]) { const sc = mesh(lathe([[0, .05], [.07, .045], [.085, .02], [.085, 0]], 24), M.brass); sc.rotation.z = -s * Math.PI / 2; sc.position.set(s * 1.17, -0.45, 0); wrist.add(sc); } }
var forearm = mesh(lathe([[1.0, -6.2], [1.04, -4.5], [1.08, -2.6], [1.05, -1.9]], 64), M.dark); forearm.scale.z = 0.66; wrist.add(forearm);
P(wrist, [0, -2.4, 0], palmG); L(wbody, 'WRIST FLEX/DEVIATION ACTUATOR', '2-DOF · BLDC + harmonic drive');
// tendon bundle (black braided Dyneema)
const cables = new THREE.Group();
for (let i = 0; i < 5; i++) { const x0 = (i - 2) * 0.16, fx = FX[Math.min(3, i)] * 0.85;
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, -3, -0.05), new THREE.Vector3(x0 * 1.1, -0.8, -0.02), new THREE.Vector3(fx * 0.7, 1.2, -0.02), new THREE.Vector3(fx, 3.4, 0.0)]);
  cables.add(mesh(new THREE.TubeGeometry(curve, 64, 0.032, 8), M.cable)); }
P(cables, [-1.9, 1.2, 0.6], palmG); L(cables, 'TENDON, DYNEEMA', 'black braided UHMWPE');

// ---------- fingers: lathe-turned chrome phalanges with brass-banded knuckles
function phalanxGeo(len, r, tip) { const pts = []; const y0 = 0.15, y1 = tip ? len : len - 0.15;
  pts.push([0, y0 - 0.02], [r * 0.7, y0], [r * 0.9, y0 + 0.05], [r * 0.98, y0 + 0.16]);
  for (let k = 1; k <= 6; k++) { const f = k / 7, y = y0 + 0.16 + f * (y1 - y0 - 0.5); pts.push([r * (0.99 - 0.06 * Math.sin(Math.PI * f) - 0.04 * f), y]); }
  if (tip) { const c = y1 - r * 0.95; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; pts.push([r * 0.92 * Math.cos(a), c + r * 0.95 * Math.sin(a)]); } }
  else pts.push([r * 0.97, y1 - 0.18], [r * 0.9, y1 - 0.05], [r * 0.7, y1], [0, y1 + 0.02]);
  const g = lathe(pts, 72); g.scale(1, 1, 0.9); return g; }
function collarGeo(r) { return lathe([[r * 0.8, -0.16], [r * 0.93, -0.15], [r * 0.96, -0.12], [r * 0.96, -0.05], [r * 0.86, -0.04], [r * 0.86, 0.04], [r * 0.96, 0.05], [r * 0.96, 0.12], [r * 0.93, 0.15], [r * 0.8, 0.16]], 64).scale(1, 1, 0.9); }
const pinGeo = (r) => lathe([[0, -r - .1], [.06, -r - .1], [.075, -r - .08], [.075, -r - .02], [.04, -r], [.04, r], [.075, r + .02], [.075, r + .08], [.06, r + .1], [0, r + .1]], 24).rotateZ(Math.PI / 2);
function segment(len, r, idx, tip, names) {
  const joint = new THREE.Group();
  const hub = new THREE.Group(); hub.add(mesh(collarGeo(r), M.dark));
  for (const y of [-0.085, 0.085]) { const b = mesh(new THREE.TorusGeometry(r * 0.955, 0.022, 10, 64).rotateX(Math.PI / 2), M.brass); b.position.y = y; b.scale.z = .9; hub.add(b); }
  const gro = mesh(new THREE.CylinderGeometry(r * 0.87, r * 0.87, 0.075, 64, 1, true), M.cable); gro.scale.z = .9; hub.add(gro);
  P(hub, [0, 0, 0], joint);
  const race = lathe([[.07, -.05], [.15, -.05], [.17, -.03], [.17, .03], [.15, .05], [.07, .05], [.06, 0], [.07, -.05]], 32).rotateZ(Math.PI / 2);
  const bl = mesh(race, M.steel); bl.position.x = -r * 0.9; const br = mesh(race, M.steel); br.position.x = r * 0.9;
  P(bl, [-0.9, 0, 0.2], joint); P(br, [0.9, 0, 0.2], joint);
  const pin = mesh(pinGeo(r * 0.92), M.brass); P(pin, [1.9, 0, 0.3], joint);
  const sh = mesh(phalanxGeo(len, r, tip), M.shell); P(sh, [0, 0, 0], joint);
  const ten = mesh(new THREE.CylinderGeometry(0.026, 0.026, len - 0.2, 8), M.cable); ten.position.set(0, len / 2, -r * 0.83);
  P(ten, [0, 0, -0.8], joint);
  if (names && names[0]) L(sh, names[0], names[1]);
  if (names && names[2]) L(bl, 'FINGER MCP JOINT', '2-DOF · deep-groove ball bearing');
  if (names && names[3]) L(ten, 'TENDON CABLE GUIDE', 'low-friction PTFE liner');
  if (names && names[4]) L(hub, 'ABSOLUTE MAGNETIC ENCODER', '14-bit · joint angle');
  if (names && names[5]) L(pin, 'BRASS PINS', 'C268 brass · precision machined');
  joint.userData = { sh, hub };
  return joint;
}
const fingers = [], fingerRoots = [];
const FL = [[1.95, 1.3, 1.05], [2.15, 1.4, 1.1], [2.05, 1.35, 1.05], [1.6, 1.05, 0.9]];
const FR = [0.29, 0.3, 0.29, 0.255];
FL.forEach((ls, i) => {
  const root = new THREE.Group(); root.position.set(FX[i], PH + FY[i], 0.16); root.rotation.z = (FX[i]) * -0.05; palmG.add(root);
  const js = []; let parent = root; let lenPrev = 0;
  ls.forEach((len, k) => {
    const nm = i == 1 ? [['PROXIMAL PHALANX', 'Mirror-polished chrome', 1, 0, 0, 1], ['MIDDLE PHALANX', 'Mirror-polished chrome', 0, 0, 1], ['DISTAL PHALANX', 'Mirror-polished chrome · FSR tip', 0, 1]][k] : null;
    const j = segment(len, FR[i] * (1 - k * 0.06), k, k == 2, nm);
    const holder = new THREE.Group(); holder.position.y = lenPrev; parent.add(holder); holder.add(j);
    parts.push({ obj: holder, base: holder.position.clone(), off: new THREE.Vector3(0, k == 0 ? 1.4 : 0.85, 0) });
    js.push(j); parent = j; lenPrev = len;
  });
  fingers.push(js); fingerRoots.push(root);
});
// thumb
const thumbBase = new THREE.Group(); thumbBase.position.set(-1.26, 1.35, 0.1); palmG.add(thumbBase);
const thumbYaw = new THREE.Group(); thumbBase.add(thumbYaw);
{ const mount = new THREE.Group(); mount.add(mesh(lathe([[0, -.45], [.3, -.42], [.42, -.25], [.45, 0], [.42, .22], [.34, .34], [0, .38]], 48), M.steel));
  const rg = mesh(new THREE.TorusGeometry(.44, .025, 10, 48).rotateX(Math.PI / 2), M.brass); mount.add(rg);
  P(mount, [-0.8, 0, 0], thumbBase); L(mount, 'CMC SADDLE JOINT', 'carpometacarpal · thumb opposition, 2-DOF'); }
const thumb = []; { let parent = thumbYaw, lp = 0.3; [1.5, 1.1, 0.9].forEach((len, k) => { const j = segment(len, 0.37 - k * 0.025, k, k == 2, null); const h = new THREE.Group(); h.position.y = lp; parent.add(h); h.add(j); parts.push({ obj: h, base: h.position.clone(), off: new THREE.Vector3(0, 0.9, 0) }); thumb.push(j); parent = j; lp = len; }); }
parts.push({ obj: thumbBase, base: thumbBase.position.clone(), off: new THREE.Vector3(-2.6, -0.4, 0.6) });
parts.forEach(p => p.obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }));
const isIn = (o, a) => { for (let q = o; q; q = q.parent) if (q === a) return true; return false; };
const KEEP = [hd, bstack, cables];
for (const p of parts) if (fingers[1].some(j => p.obj === j.parent)) p.off.y = p.obj === fingers[1][0].parent ? 0.75 : 0.55;
for (const p of parts) { p.keep = isIn(p.obj, fingerRoots[1]) || KEEP.includes(p.obj); if (p.keep && isIn(p.obj, fingerRoots[1])) p.off.multiplyScalar(p.obj.parent && p.obj.parent.isGroup && p.obj.children.length && p.off.y > 0 ? 1.1 : 1.25); }
for (const l of labels) l.keep = isIn(l.obj, fingerRoots[1]) || KEEP.some(k => isIn(l.obj, k));
const BODY = buildBody(THREE, MB, RoundedBoxGeometry, scene); const MODS = BODY.mods;
BODY.rig.setPose(0, 0, false);
const HOFF = BODY.rig.anchor.matrixWorld.clone().invert().multiply(new THREE.Matrix4().compose(new THREE.Vector3(1.2, 0.6, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 2.6, 0)), new THREE.Vector3(1, 1, 1)));
const _hm = new THREE.Matrix4(); const _qr = new THREE.Quaternion(), _ax = new THREE.Vector3(); const focus = new THREE.Vector3(), F0 = new THREE.Vector3(), _w = new THREE.Vector3(), _pq = new THREE.Quaternion();
const SPEC = [[null, 3.6, -0.7, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.45, 0))], [null, 1.3, -3.5, new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, -0.5))], [null, -1.7, -2.6, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.25))]];
scene.add(key.target);
const bodyLight = new THREE.DirectionalLight('#fff2e2', 0); bodyLight.position.set(-30, 20, 40); scene.add(bodyLight);
const T3 = 8.2; let TMAX = 8.2; // T3 = end of the 3D sequence; TMAX grows to include the R&D layer
const PXU = 833; // px of R&D layer per timeline unit (matches wheel: 0.0012/px)
// ---------- post: GTAO for crevice depth + a very gentle warm film grade (alpha preserved for the CSS linen)
let composer = null, gtao = null;
{ const rt = new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt); composer.setPixelRatio(PR); composer.setSize(innerWidth, innerHeight);
  const rp = new RenderPass(scene, camera); rp.clearAlpha = 0; composer.addPass(rp);
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 0.85;
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  composer.addPass(gtao); composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 g = c.rgb; float l = dot(g, vec3(.299,.587,.114)); g = mix(vec3(l), g, 0.94); g *= vec3(1.015, 1.0, 0.965); g = g * 0.97 + 0.015; gl_FragColor = vec4(g, c.a); }' }));
}
// adaptive quality: drop AO, then pixel ratio + shadow size on slow frames
let slowAcc = 0, slowN = 0, tier = 0;
function adapt(dt) { slowAcc += dt; slowN++; if (slowN < 90) return; const ms = slowAcc / slowN * 1000; slowAcc = 0; slowN = 0;
  if (FIXED != null) return;
  if (ms > 24 && tier < 3) { tier++; if (tier == 1) gtao.enabled = false; if (tier == 2) { PR = Math.max(1, PR * 0.75); renderer.setPixelRatio(PR); composer.setPixelRatio(PR); } if (tier == 3) { key.shadow.mapSize.set(1024, 1024); key.shadow.map?.dispose(); key.shadow.map = null; } }
}
// ---------- input: virtual timeline  t∈[-1 (exploded) .. 0 (open) .. 1 (fist)]
let tTarget = FIXED ?? -1, tS = tTarget, t = tTarget, mx = 0, my = 0, smx = 0, smy = 0;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
addEventListener('wheel', e => { e.preventDefault(); tTarget = clamp(tTarget + e.deltaY * 0.0012, -1, TMAX); hideHint(); }, { passive: false });
let ty = null;
addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => { if (ty == null) return; const y = e.touches[0].clientY; tTarget = clamp(tTarget + (ty - y) * 0.005, -1, TMAX); ty = y; hideHint(); e.preventDefault(); }, { passive: false });
addEventListener('keydown', e => { const st = { ArrowDown: .1, ArrowUp: -.1, PageDown: .8, PageUp: -.8, ' ': .8, End: 99, Home: -99 }[e.key]; if (st != null) { e.preventDefault(); tTarget = clamp(tTarget + st, -1, TMAX); hideHint(); } });
addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; });
const hint = document.getElementById('hint'); function hideHint() { hint.style.opacity = 0; }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer && composer.setSize(innerWidth, innerHeight); });

// ---------- labels DOM
const svg = document.getElementById('leaders'), labWrap = document.getElementById('labels');
const ACR = ['CMC', 'MCP', 'PIP', 'DIP', 'BLDC', 'FOC', 'CAN-FD', 'IMU', 'QDD', 'F/T', 'UHMWPE', 'PTFE', 'GPU', 'SoC', 'RGB-D', 'CFRP', 'BMS', 'DOF', 'FSR'];
function nice(n) { let s = n.toLowerCase().replace(/(^|[\s(·\/+-])([a-z])/, (m, a, b) => a + b.toUpperCase()); s = s.charAt(0).toUpperCase() + s.slice(1);
  for (const a of ACR) s = s.replace(new RegExp('(^|[^A-Za-z])' + a.replace(/[\/+-]/g, '\\$&') + '(?=$|[^A-Za-z])', 'ig'), (m, p) => p + a);
  return s.replace('6-axis', '6-axis').replace('Li-ion', 'Li-ion').replace('li-ion', 'Li-ion').replace('dyneema', 'Dyneema'); }
function mkLabel(l) {
  l.el = document.createElement('div'); l.el.className = 'lab'; l.el.innerHTML = `<b>${nice(l.name)}</b><i>${l.note || ''}</i>`; labWrap.appendChild(l.el);
  l.line = document.createElementNS('http://www.w3.org/2000/svg', 'path'); l.line.setAttribute('fill', 'none'); l.line.setAttribute('stroke', 'rgba(52,47,41,.72)'); l.line.setAttribute('stroke-width', '0.8'); l.line.setAttribute('stroke-linecap', 'round'); svg.appendChild(l.line);
  l.dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); l.dot.setAttribute('r', '1.6'); l.dot.setAttribute('fill', 'rgba(52,47,41,.8)'); svg.appendChild(l.dot);
  l.jit = [Math.random() - .5, Math.random() - .5, Math.random() - .5];
}
labels.forEach(mkLabel); MODS.forEach(m => m.labels.forEach(mkLabel));
function hideLabels(list) { for (const l of list) { if (l.vis === false) continue; l.vis = false; l.el.style.opacity = 0; l.line.setAttribute('opacity', 0); l.dot.setAttribute('opacity', 0); } }
function layoutLabels(list, show) {
  if (show < 0.02) return hideLabels(list);
  const W = innerWidth, H = innerHeight, c = new THREE.Vector3();
  const pts = list.map(l => { l.obj.getWorldPosition(c); c.project(camera); return { l, x: (c.x + 1) / 2 * W, y: (1 - c.y) / 2 * H }; }).sort((a, b) => a.x - b.x);
  const half = Math.ceil(pts.length / 2);
  [[pts.slice(0, half), -1], [pts.slice(half), 1]].forEach(([g, side]) => {
    if (!g.length) return; g.sort((a, b) => a.y - b.y);
    const xs = g.map(p => p.x); const colX = side > 0 ? Math.min(W - 430, Math.max(...xs) + 70) : Math.max(250, Math.min(...xs) - 70);
    const top = 70, bot = side > 0 ? H - 250 : H - 120, gap = 46;
    let y0 = top; g.forEach(p => { p.ly = Math.max(p.y, y0); y0 = p.ly + gap; });
    const over = y0 - gap - bot; if (over > 0) { g.forEach(p => p.ly -= over); let y1 = top; g.forEach(p => { p.ly = Math.max(p.ly, y1); y1 = p.ly + gap; }); }
    g.forEach(p => { const l = p.l; l.vis = true;
      const end = colX - side * 4, mx2 = (p.x + end) / 2 + l.jit[0] * 10, my2 = (p.y + p.ly) / 2 + l.jit[1] * 8;
      l.line.setAttribute('d', `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${mx2.toFixed(1)},${(my2 + (p.ly - p.y) * .25).toFixed(1)} ${end.toFixed(1)},${(p.ly + l.jit[2] * 1.5).toFixed(1)}`); l.line.setAttribute('opacity', show);
      l.dot.setAttribute('cx', p.x); l.dot.setAttribute('cy', p.y); l.dot.setAttribute('opacity', show);
      l.el.style.opacity = show; l.el.style.top = p.ly + 'px'; l.el.style.textAlign = side < 0 ? 'right' : 'left';
      l.el.style.left = (side > 0 ? colX + 6 : colX - 6 - l.el.offsetWidth) + 'px'; });
  });
}
// faint graphite construction marks for the disassembly plate (axis, arcs, registration ticks)
const marks = document.createElementNS('http://www.w3.org/2000/svg', 'path'); marks.setAttribute('fill', 'none'); marks.setAttribute('stroke', 'rgba(60,52,44,.32)'); marks.setAttribute('stroke-width', '0.6'); marks.setAttribute('stroke-dasharray', '5 4 1 4'); svg.appendChild(marks);
const marks2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); marks2.setAttribute('fill', 'none'); marks2.setAttribute('stroke', 'rgba(60,52,44,.22)'); marks2.setAttribute('stroke-width', '0.55'); svg.appendChild(marks2);
const scr = (o, out) => { o.getWorldPosition(out); out.project(camera); out.x = (out.x + 1) / 2 * innerWidth; out.y = (1 - out.y) / 2 * innerHeight; return out; };
const jit = (k) => Math.sin(k * 12.9898) * 1.2;
function drawMarks(show) {
  if (show < 0.02) { marks.setAttribute('opacity', 0); marks2.setAttribute('opacity', 0); return; }
  const a = scr(fingers[1][0], new THREE.Vector3()), b = scr(fingers[1][2], new THREE.Vector3()); const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
  let d = ''; const ext = 0.55; for (let i = 0; i <= 8; i++) { const f = -ext + i / 8 * (1 + 2 * ext); d += (i ? 'L' : 'M') + (a.x + dx * f + jit(i) * -dy / n).toFixed(1) + ',' + (a.y + dy * f + jit(i) * dx / n).toFixed(1); }
  marks.setAttribute('d', d); marks.setAttribute('opacity', show);
  const g = scr(hd, new THREE.Vector3()), q = scr(bstack, new THREE.Vector3());
  const arc = (c, r, a0, a1) => { let p = ''; for (let i = 0; i <= 24; i++) { const t = a0 + (a1 - a0) * i / 24, rr = r + jit(i + r) * 0.8; p += (i ? 'L' : 'M') + (c.x + Math.cos(t) * rr).toFixed(1) + ',' + (c.y + Math.sin(t) * rr).toFixed(1); } return p; };
  const tick = (c, r) => `M${(c.x - r).toFixed(1)},${c.y.toFixed(1)}L${(c.x - r + 9).toFixed(1)},${c.y.toFixed(1)}M${c.x.toFixed(1)},${(c.y - r).toFixed(1)}L${c.x.toFixed(1)},${(c.y - r + 9).toFixed(1)}`;
  marks2.setAttribute('d', arc(g, 118, -2.6, 1.9) + arc(g, 132, -1.2, 0.4) + tick(g, 140) + arc(q, 70, 1.2, 4.6) + arc(a, 46, 2.2, 5.4) + `M${(g.x - 150).toFixed(1)},${g.y.toFixed(1)}L${(g.x + 150).toFixed(1)},${(g.y + 2).toFixed(1)}`); marks2.setAttribute('opacity', show);
}
// ---------- rail + chapter panel
const STUDY = {
  '02': ['The Forearm', 'Where intention becomes tension: four ball screws drawing tendons toward the hand.', 'Satin chrome, brushed steel, Dyneema'],
  '03': ['The Elbow', 'A single hinge and a hundredfold reduction: strength without backlash.', 'Polished steel, strain-wave gearing, C268 brass'],
  '04': ['The Shoulder', 'Three axes meeting at one point, carried on rolling cycloidal teeth.', 'Ivory ceramic, chrome cycloidal stack'],
  '05': ['The Torso', 'Energy, thought and balance, held inside one ceramic shell.', 'Ivory ceramic, Li-ion cells, liquid-cooled compute'],
  '06': ['The Pelvis', 'The quiet centre: a yaw axis and the branching of power.', 'Ivory ceramic, satin chrome, copper bus'],
  '07': ['The Legs', 'Backdrivable strength, sprung at the ankle, listening through the feet.', 'Ivory ceramic, chrome actuators, steel springs'],
  '08': ['The Whole Machine', 'An exploration of integrated form, function, and harmony in the complete system.', 'Ivory ceramic, mirror chrome, C268 brass'] };
const RAIL = [{ id: '01', key: 'The Hand, disassembled', t: -1 }, { id: '01', key: 'The Hand', t: 0 }, { id: '01', key: 'The Hand, closed', t: 1 }, ...MODS.map(m => ({ id: m.id, key: STUDY[m.id][0], t: m.camT }))];
const rdEl = document.getElementById('rd');
const RDCH = [['09', 'The Mind', 'rd-09'], ['10', 'Research Program', 'rd-10'], ['11', 'Roadmap', 'rd-11'], ['12', 'Tokenized R&D', 'rd-12'], ['13', 'Morph', 'rd-13']];
RDCH.forEach(([id, key, el]) => RAIL.push({ id, key, t: T3 + 1, rd: el }));
const railEl = document.getElementById('rail'); const tpos = tt => tt <= T3 ? (tt + 1) / (T3 + 1) * 66 : 66 + (tt - T3) / Math.max(0.01, TMAX - T3) * 34;
function layoutRD() { const H = innerHeight; TMAX = T3 + Math.max(1, (rdEl.offsetHeight - H * 0.0) / PXU); tTarget = clamp(tTarget, -1, TMAX);
  RAIL.forEach(r => { if (r.rd) { const a = document.getElementById(r.rd); r.t = Math.min(TMAX, T3 + (a.offsetTop + H * 0.92) / PXU); } if (r.el) r.el.style.top = tpos(r.t) + '%'; }); }
RAIL.forEach(r => { const d = document.createElement('div'); d.className = 'ri'; d.style.top = tpos(r.t) + '%'; d.innerHTML = `<span>${r.id}</span>${r.key}`; d.onclick = () => { tTarget = r.t; hideHint(); }; r.el = d; railEl.appendChild(d); });
const knobEl = document.createElement('div'); knobEl.className = 'rk'; railEl.appendChild(knobEl);
function railSync() { const tt = tS; knobEl.style.top = tpos(tt) + '%'; let near = RAIL[0]; RAIL.forEach(r => { if (Math.abs(r.t - tt) < Math.abs(near.t - tt)) near = r; }); RAIL.forEach(r => r.el.classList.toggle('on', r === near)); }
layoutRD(); addEventListener('resize', layoutRD); addEventListener('load', layoutRD); document.fonts && document.fonts.ready.then(layoutRD);
const chap = document.getElementById('chap'); let chapCur = null;
const sent = x => x.charAt(0) + x.slice(1).toLowerCase().replace(/(dof|bldc|imu|qdd|can-fd|f\/t|gpu|soc|li-ion|v dc|n·m|m\/s)/g, z => ({ 'li-ion': 'Li-ion', 'v dc': 'V DC', 'n·m': 'N·m', 'm/s': 'm/s', 'soc': 'SoC' }[z] || z.toUpperCase()));
function setChap(m) { if (m === chapCur) return; chapCur = m; if (!m) return; const S = STUDY[m.id];
  chap.className = 'chap' + (m.final ? ' final' : '');
  chap.innerHTML = m.final ? `<h2>Module 08 — ${S[0]}</h2><hr><p>${S[1]}</p>` : `<div class="cap">Study No. ${m.id} / ${S[0]}</div><p>${S[1]}</p>`; }
function plateFor(m) { const S = STUDY[m.id];
  return `<div class="pk">${m.final ? 'Module' : 'Study No.'} ${m.id}</div><div class="pt">${S[0]}</div><div class="pm">${S[2]}</div>` + m.specs.map(x => `<div class="ps"><span>${sent(x[0])}</span><em>${x[1].replace(' · design target', '').replace(' · design spec', '')}</em></div>`).join('') + `<div class="pn">Figures are design targets, not measured results.</div>`; }
// camera keyframes beyond the fist
const KF = [{ t: 1.0, pos: [0, 2.6, 17.5], look: [1.0, 0.8, 0] }, { t: 1.15, pos: [0, 2.6, 17.5], look: [1.0, 0.8, 0] }, ...MODS.map(m => ({ t: m.camT, pos: m.cam, look: m.look }))];
const kp = new THREE.Vector3(), kl = new THREE.Vector3();
function camAt(tt) { let i = 0; while (i < KF.length - 2 && tt > KF[i + 1].t) i++; const A = KF[i], B = KF[i + 1]; const k = clamp((tt - A.t) / (B.t - A.t), 0, 1); const e = k * k * (3 - 2 * k);
  kp.set(...A.pos).lerp(new THREE.Vector3(...B.pos), e); kl.set(...A.look).lerp(new THREE.Vector3(...B.look), e); }

// ---------- animation helpers
const ss = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const hud = document.getElementById('hud'), knob = document.getElementById('knob'), modeEl = document.getElementById('mode'), fpsEl = document.getElementById('fps'), clockEl = document.getElementById('clock');
const MAXA = [1.45, 1.75, 1.25]; // MCP, PIP, DIP flexion (rad)
const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, fpsShown = 60, msShown = 16;
const v = new THREE.Vector3(), c3 = new THREE.Vector3();
const deg = r => (r * 180 / Math.PI).toFixed(1).padStart(6, ' ');
let frameN = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime; frameN++;
  if (FIXED == null) tS += (tTarget - tS) * (1 - Math.exp(-dt * 7)); else tS = FIXED;
  t = Math.min(tS, T3);
  // ---- Part II handoff: past T3 the R&D layer rises over the linen and the machine recedes
  const rr = Math.max(0, tS - T3), H = innerHeight, k = ss(0, 1.1, rr);
  rdEl.style.transform = `translate3d(0,${(H - rr * PXU).toFixed(1)}px,0)`; rdEl.classList.toggle('live', rr > 0.05);
  document.body.classList.toggle('in-rd', rr > 0.06);
  canvas.style.opacity = (1 - 0.93 * k).toFixed(3); canvas.style.transform = k > 0 ? `translateY(${(-6 * k).toFixed(2)}vh) scale(${(1 - 0.08 * k).toFixed(4)})` : '';
  svg.style.opacity = labWrap.style.opacity = (1 - k).toFixed(3);
  if (rr > 1.25) { if (frameN % 3 == 0) railSync(); requestAnimationFrame(frame); return; } // fully in R&D: pause WebGL
  const grip = clamp(t, 0, 1), ex = ss(0, 1, -t), bm = ss(1.0, 1.3, t);
  // finger curl with stagger: pinky first -> index; joints proximal -> distal
  const lock = ss(0.9, 1, grip);
  const twitch = () => 0; // fingers held perfectly steady at rest
  const jointA = [];
  fingers.forEach((js, i) => {
    const d = (3 - i) * 0.05; const row = [];
    js.forEach((j, k) => {
      const a = ss(d + k * 0.06, d + k * 0.06 + 0.72, grip) * MAXA[k] + 0.12 + twitch(i, k) - lock * 0.03 * Math.sin(lock * Math.PI);
      j.rotation.x = -a * (1 - ex * 0.9); row.push(-j.rotation.x);
    });
    js[0].parent.parent.rotation.z = (FX[i]) * -0.1 * (1 - grip) + (FX[i]) * 0.035 * ex;
    jointA.push(row);
  });
  // thumb: swing across palm and wrap over fingers after they've curled
  const tg = ss(0.35, 0.95, grip);
  thumbBase.rotation.set(-tg * 0.95, -0.25 - tg * 0.25, 0.55 - tg * 0.2);
  thumb[0].rotation.set(-0.15 - tg * 0.2, 0, -tg * 0.9);
  thumb[1].rotation.set(-0.1 - tg * 0.5, 0, -tg * 0.5);
  thumb[2].rotation.set(-0.1 - tg * 0.55, 0, -tg * 0.3);
  thumbYaw.rotation.y = 0;
  // pistons compress
  pistons.forEach((r, i) => { r.position.y = 1.9 - jointA[i][0] / MAXA[0] * 0.55; });
  // explode
  const fly = ss(0.1, 0.75, ex);
  hd.scale.setScalar(1 + ex * 0.3); { const f = 1 + 0.45 * ss(0.2, 1, ex); for (const j of fingers[1]) { j.userData.sh.scale.set(f, 1, f); j.userData.hub.scale.set(f, 1, f); } }
  for (const p of parts) { p.obj.position.copy(p.base).addScaledVector(p.off, p.keep ? ex : ex + fly * 2.5); if (!p.keep) { const sc = Math.max(0.001, 1 - fly); p.obj.scale.setScalar(sc); p.obj.visible = sc > 0.01; } }
  // LEDs pulse
  M.led.emissiveIntensity = 0.35 + Math.sin(time * 2) * 0.1;
  // hand orientation + parallax
  smx += (mx - smx) * (1 - Math.exp(-dt * 3)); smy += (my - smy) * (1 - Math.exp(-dt * 3));
  hand.rotation.y = -0.2 + ss(0, 1, grip) * 2.8 - ss(0, 1, ex) * 0.75 + smx * 0.28 + Math.sin(time * 0.4) * 0.03;
  hand.rotation.x = 0.08 + smy * 0.14 + ex * 0.05 + ss(0, 1, grip) * 0.52 + Math.sin(time * 0.6) * 0.015;
  if (Q.has('yaw')) hand.rotation.y = parseFloat(Q.get('yaw')); if (Q.has('pitch')) hand.rotation.x = parseFloat(Q.get('pitch'));
  hand.rotation.z = -0.04 + Math.sin(time * 0.5) * 0.01 + 2.35 * (1 - ss(0, 1, grip)) * (1 - ss(0, 1, ex));
  hand.rotation.x *= 1 - bm; hand.rotation.z *= 1 - bm; hand.rotation.y = hand.rotation.y * (1 - bm) + 2.6 * bm;
  if (ex > 0) hand.quaternion.premultiply(_qr.setFromAxisAngle(_ax.set(0, 0, 1), -0.55 * ss(0, 1, ex)));
  hand.position.y = Math.sin(time * 0.8) * 0.06 * (1 - bm) + grip * 0.6 - ex * 1.6;
  cables.visible = ex > 0.01; forearm.visible = t > 0.6 && t < 1.2; forearm.scale.y = ss(0.6, 1.0, t) + 0.001;
  BODY.rig.setPose(ss(7.25, 7.9, t), time, t > 1.08);
  if (bm >= 1) { _hm.multiplyMatrices(BODY.rig.anchor.matrixWorld, HOFF); _hm.decompose(hand.position, hand.quaternion, hand.scale); }
  hand.position.x = 1.2;
  // camera: hand stage, then R&D keyframes down the body
  const shake = lock * Math.max(0, Math.sin(time * 40)) * 0.012 * (1 - ss(1, 1.12, t));
  const exs = ss(0, 1, ex);
  if (t <= 1.0 && exs > 0) { hand.updateMatrixWorld(true); fingers[1][1].getWorldPosition(focus); F0.copy(focus); focus.x += 0.9; focus.y -= 1.0; }
  if (t <= 1.0) { camera.position.set(smx * 0.6 + shake, 2.6 - smy * 0.4 + ex * 2.5, 19.5 - grip * 2); camera.lookAt(-1.7 + grip * 2.7, -0.7 + grip * 1.2, 0); kl.set(1, .8, 0);
    if (exs > 0) { const cp = new THREE.Vector3(focus.x + smx * 0.4, focus.y + 0.8 - smy * 0.3, focus.z + 15); camera.position.lerp(cp, exs); const lk = new THREE.Vector3(-1.7, -0.7, 0).lerp(focus, exs); camera.lookAt(lk); kl.copy(lk); } }
  else { camAt(t); const d = kp.distanceTo(kl) / 20; camera.position.set(kp.x + smx * 0.6 * d + shake, kp.y - smy * 0.4 * d, kp.z); if (Q.has('cam')) { camera.position.set(...Q.get('cam').split(',').map(Number)); kl.set(...Q.get('look').split(',').map(Number)); } camera.lookAt(kl); }
  // body modules: attach (slide in + lock), peek (explode), reassemble
  let active = null;
  for (const m of MODS) { const u = t - m.start; if (u <= 0) { if (m.group.visible) m.group.visible = false; m.e = 0; continue; }
    m.group.visible = true; active = m; const a = ss(0, .35, u), e = ss(.4, .58, u) * (1 - ss(.78, .95, u)); m.e = e; m.a = a;
    if (u > 1.2 && m.done) continue; m.done = u > 1.2;
    for (const p of m.parts) p.obj.position.copy(p.base).addScaledVector(p.inOff, 1 - a).addScaledVector(p.exOff, e); }
  if (BODY.extra.fan) BODY.extra.fan.rotation.z += dt * 9;
  if (t <= 1.0 && exs > 0) { const k = ss(0.15, 1, ex); [hd, bstack, cables].forEach((o, i) => { const S = SPEC[i]; if (!S.base) { S.base = o.position.clone(); S.q0 = o.quaternion.clone(); }
      _w.set(F0.x + S[1], F0.y + S[2], F0.z); o.parent.worldToLocal(_w); o.position.lerpVectors(S.base, _w, k);
      o.parent.getWorldQuaternion(_pq); _pq.invert().multiply(S[3]); o.quaternion.slerpQuaternions(S.q0, _pq, k); });
    cables.scale.setScalar(1 - 0.45 * k); }
  const fin = ss(7.2, 7.8, t);
  bodyLight.intensity = bm * 0.25; key.intensity = 2.6 * (1 - 0.3 * bm);
  const kf = 1 + 0.9 * bm + 2.4 * fin;
  key.target.position.copy(kl); key.position.set(kl.x - 11 * kf, kl.y + 13 * kf, kl.z + 15 * kf);
  { const sh = 8 + 12 * bm + 24 * fin, c = key.shadow.camera; if (Math.abs(c.right - sh) > 0.05) { c.left = c.bottom = -sh; c.right = c.top = sh; c.far = 80 * kf; c.updateProjectionMatrix(); } }
  wall.material.opacity = 0.36 * (1 - 0.5 * ex) * (1 - 0.35 * bm);
  wall.position.set(kl.x, kl.y, t > 1.08 ? -12 + fin * 2 : -3.0 - 2.6 * ex);
  floor.visible = false; floor.position.y = BODY.rig.FLOOR - 0.02;
  if (composer && Q.get('ao') !== '0') composer.render(); else renderer.render(scene, camera);
  adapt(dt);

  // labels
  layoutLabels(labels.filter(l => l.keep), ex > 0.45 ? ss(0.45, 0.9, ex) : 0); hideLabels(labels.filter(l => !l.keep)); drawMarks(ex > 0.45 ? ss(0.5, 0.95, ex) * 0.9 : 0); document.body.classList.toggle('fin', t > 7.5 && tS < T3 + 0.25); document.body.classList.toggle('labs', ex > 0.3 || (active && active.e > 0.25));
  for (const m of MODS) layoutLabels(m.labels, m === active ? ss(.3, .8, m.e) : 0);
  const tag = document.querySelector('.tag'); tag.style.opacity = 1 - bm;
  setChap(t > 1.1 ? active : null); chap.style.opacity = active && t > 1.1 ? ss(active.start - .05, active.start + .15, t) * (1 - ss(.35, .7, active.e) * .6) : 0;
  hand.updateMatrixWorld();
  // HUD
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fpsShown = fpsN / fpsAcc; msShown = fpsAcc / fpsN * 1000; fpsAcc = 0; fpsN = 0; }
  if (frameN % 3 == 0) {
    const sumA = jointA.flat().reduce((a, b) => a + b, 0); const gripPct = grip * 100;
    const load = 4.2 + 168 * Math.pow(grip, 2.2) + lock * 46; // simulated actuator load (N)
    const torque = jointA.map(r => (r[0] * 0.9 + r[1] * 0.6 + r[2] * 0.3) * (1 + grip * 2.2));
    const mode = ex > 0.02 ? (ex > 0.98 ? 'EXPLODED' : 'DISASSEMBLY') : grip > 0.985 ? 'LOCKED' : grip > 0.02 ? 'CLENCH' : 'NEUTRAL';
    modeEl.textContent = mode; fpsEl.textContent = fpsShown.toFixed(0);
    const plate = document.getElementById('hud'); let html;
    if (t <= 1.1) { const r = jointA[0];
      html = `<div class="pk">Study No. 01</div><div class="pt">The Hand</div><div class="pm">Mirror-polished chrome, C268 brass pins, Dyneema tendons</div>`
        + `<div class="ps"><span>Grip</span><em>${gripPct.toFixed(0)}%</em></div>`
        + `<div class="ps"><span>Index MCP · PIP · DIP</span><em>${(r[0] * 57.3).toFixed(0)}° · ${(r[1] * 57.3).toFixed(0)}° · ${(r[2] * 57.3).toFixed(0)}°</em></div>`
        + `<div class="ps"><span>Tendon tension</span><em>${load.toFixed(0)} N</em></div>`
        + `<div class="pn">Kinematic model, not sensor data.</div>`;
    } else html = active ? plateFor(active) : '';
    if (html !== plate._h) { plate.innerHTML = html; plate._h = html; }
    const mode2 = t > 1.1 && active ? `Study No. ${active.id}` : (ex > .5 ? 'Disassembled' : grip > .98 ? 'Closed' : 'At rest');
    modeEl.textContent = mode2; fpsEl.textContent = fpsShown.toFixed(0);
    const tagT = ex > .5 ? 'Study No. 01 / The Hand, disassembled' : grip > .9 ? 'Study No. 01 / The Hand, closed' : 'Study No. 01 / The Hand';
    const tg2 = document.getElementById('tagt'); if (tg2.textContent !== tagT) tg2.textContent = tagT;
    railSync();

  }
  requestAnimationFrame(frame);
}
frame();
window.__ready = true;
window.__dbg = () => { const r = {}; const w = new THREE.Vector3(); for (const [k, b] of Object.entries(BODY.rig.bones)) { b.getWorldPosition(w); r[k] = w.toArray().map(v => +v.toFixed(1)); } r.FLOOR = BODY.rig.FLOOR; r.hand = hand.position.toArray().map(v => +v.toFixed(1)); return r; };

window.__rd = () => ({ TMAX, tS, rail: RAIL.map(r => [r.id, r.key, +r.t.toFixed(3)]) });
