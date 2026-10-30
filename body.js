// Rigged humanoid (~1.75 m design target; 1 unit ≈ 2.5 cm). Modules attach to bones.
// Build pose: arm A raised straight up under the hand. Hero pose: contrapposto, fist inspected at chest height.
export function buildBody(THREE, M, RoundedBoxGeometry, scene) {
  class Helix extends THREE.Curve { constructor(r, h, n) { super(); this.r = r; this.h = h; this.n = n; } getPoint(u, o = new THREE.Vector3()) { const a = u * this.n * Math.PI * 2; return o.set(Math.cos(a) * this.r, (u - .5) * this.h, Math.sin(a) * this.r); } }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const mk = (g, m) => new THREE.Mesh(g, m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const rot = (o, x, y, z) => { o.rotation.set(x, y, z); return o; };
  const grp = (...c) => { const g = new THREE.Group(); c.forEach(o => g.add(o)); return g; };
  const cylX = (r, l, s = 32) => new THREE.CylinderGeometry(r, r, l, s).rotateZ(Math.PI / 2);
  const cylZ = (r, l, s = 32) => new THREE.CylinderGeometry(r, r, l, s).rotateX(Math.PI / 2);
  const cyl = (r1, r2, l, s = 40, open = false) => new THREE.CylinderGeometry(r1, r2, l, s, 1, open);
  const RB = (w, h, d, r = 0.15) => new RoundedBoxGeometry(w, h, d, 3, r);
  const ringX = (r, t, m) => mk(new THREE.TorusGeometry(r, t, 8, 56).rotateY(Math.PI / 2), m);
  const ringY = (r, t, m) => mk(new THREE.TorusGeometry(r, t, 8, 56).rotateX(Math.PI / 2), m);
  const ringZ = (r, t, m) => mk(new THREE.TorusGeometry(r, t, 8, 56), m);
  const DS = m => { const c = m.clone(); c.side = THREE.DoubleSide; return c; };
  const shellDS = DS(M.shell), carbonDS = DS(M.carbon), steelDS = DS(M.steel), darkDS = DS(M.dark);
  const CH = M.chrome || M.dark;
  const disc = (r, w, m = CH) => { const h = w / 2, p = [[0, -h], [r * .55, -h], [r * .6, -h * .8], [r * .92, -h * .8], [r, -h * .5], [r, h * .5], [r * .92, h * .8], [r * .6, h * .8], [r * .55, h], [0, h]];
    const g = new THREE.LatheGeometry(p.map(q => new THREE.Vector2(q[0], q[1])), 64).rotateZ(Math.PI / 2); const o = grp(mk(g, m)); for (const x of [-h * .8, h * .8]) o.add(at(ringX(r * .76, Math.min(.08, r * .03), M.brass), x * 1.02, 0, 0)); return o; };
  const visorMat = new THREE.MeshPhysicalMaterial({ color: '#050506', metalness: .2, roughness: .08, clearcoat: 1, side: THREE.DoubleSide });
  const lathe = (pts, sz = 1, ps = 0, pl = Math.PI * 2, seg = 48) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg, ps, pl).scale(1, 1, sz);
  const FR = [-Math.PI / 2, Math.PI], BK = [Math.PI / 2, Math.PI];
  function panel(w, h, d = .35, bev = .25) { const s = new THREE.Shape(), r = Math.min(w, h) * .3, x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 }).translate(0, 0, -d / 2); }
  function cyclo(R = 0.95, n = 11, amp = 0.07, depth = 0.25) {
    const s = new THREE.Shape(); for (let i = 0; i <= 220; i++) { const a = i / 220 * Math.PI * 2, r = R + amp * Math.cos(n * a); i ? s.lineTo(r * Math.cos(a), r * Math.sin(a)) : s.moveTo(r * Math.cos(a), r * Math.sin(a)); }
    for (let k = 0; k < 6; k++) { const h = new THREE.Path(); const a = k / 6 * Math.PI * 2; h.absarc(Math.cos(a) * R * .55, Math.sin(a) * R * .55, R * .12, 0, Math.PI * 2, true); s.holes.push(h); }
    const h = new THREE.Path(); h.absarc(0, 0, R * .22, 0, Math.PI * 2, true); s.holes.push(h);
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -depth / 2);
  }
  function pinRing(r, n, len) { const im = new THREE.InstancedMesh(cylX(0.08, len, 8), M.steel, n); const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; d.position.set(0, Math.cos(a) * r, Math.sin(a) * r); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } return im; }

  // ---------- rig
  const Bn = () => new THREE.Group();
  const root = Bn(); scene.add(root);
  const chest = Bn(); chest.position.set(0, 5.5, 0); root.add(chest);
  const head = Bn(); head.position.set(0, 17.2, 0); chest.add(head);
  const shA = Bn(); shA.position.set(9.2, 14.5, 0); chest.add(shA);
  const elA = Bn(); elA.position.set(0, -11.5, 0); shA.add(elA);
  const anchor = Bn(); anchor.position.set(0, -10, 0); elA.add(anchor);
  const shB = Bn(); shB.position.set(-9.2, 14.5, 0); chest.add(shB);
  const elB = Bn(); elB.position.set(0, -11.5, 0); shB.add(elB);
  const leg = s => { const th = Bn(); th.position.set(s * 4.4, -2, 0); root.add(th); const k = Bn(); k.position.set(0, -17, 0); th.add(k); const an = Bn(); an.position.set(0, -17, 0); k.add(an); const toe = Bn(); toe.position.set(0, -2.3, 4.1); an.add(toe);
    const mks = [at(new THREE.Object3D(), 0, -3.15, -2.7), at(new THREE.Object3D(), 0, -3.15, 3.9)]; mks.forEach(o => an.add(o)); const tt = at(new THREE.Object3D(), 0, -.85, 2.5); toe.add(tt); mks.push(tt); return { th, k, an, toe, mks }; };
  const LA = leg(1), LB = leg(-1);
  const bones = { root, chest, head, shA, elA, shB, elB, anchor, thA: LA.th, kA: LA.k, anA: LA.an, toeA: LA.toe, thB: LB.th, kB: LB.k, anB: LB.an, toeB: LB.toe };
  const BUILD = { shA: [0, 0, Math.PI] };
  const HERO = { root: [0, .16, -.055], chest: [-.04, .12, .075], head: [.08, .3, -.05], shA: [-.42, -.45, .28], elA: [-1.7, 0, 0], anchor: [0, -.6, 0],
    shB: [.1, 0, -.13], elB: [-.34, 0, 0], thB: [-.05, -.1, .095], kB: [.08, 0, 0], anB: [-.03, .1, -.04], thA: [-.2, .32, .13], kA: [.4, 0, 0], anA: [-.17, .1, -.1], toeA: [.16, 0, 0] };
  const qB = {}, qH = {}; for (const n in bones) { qB[n] = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(BUILD[n] || [0, 0, 0]))); qH[n] = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(HERO[n] || [0, 0, 0]))); }
  const rootB = V(-8, -45.3, 0), rootH = rootB.clone();
  const tmp = new THREE.Vector3();
  const minY = mks => Math.min(...mks.map(o => o.getWorldPosition(tmp).y));
  function applyQ(p) { for (const n in bones) bones[n].quaternion.slerpQuaternions(qB[n], qH[n], p); }
  root.position.copy(rootB); applyQ(0); root.updateMatrixWorld(true);
  const FLOOR = minY(LB.mks);
  applyQ(1); rootH.set(rootB.x - 0.9, rootB.y, 0); root.position.copy(rootH); root.updateMatrixWorld(true);
  rootH.y += FLOOR - minY(LB.mks);
  applyQ(0); root.position.copy(rootB); root.updateMatrixWorld(true);
  // contact shadows
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; { const g = sc.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const shMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false });
  const shadows = [LA, LB].map(L => { const m = mk(new THREE.PlaneGeometry(7, 11), shMat); m.rotation.x = -Math.PI / 2; m.position.y = FLOOR + .03; m.visible = false; scene.add(m); return { m, L }; });
  let settleT = null;
  function setPose(p, time, visible) {
    applyQ(p);
    if (p > 0) { const s = settleT != null ? Math.exp(-(time - settleT) * 3.2) * Math.sin((time - settleT) * 13) : 0;
      chest.rotateX(Math.sin(time * 1.5) * .012 * p + s * .02); root.rotateZ(Math.sin(time * .45) * .008 * p); head.rotateY(Math.sin(time * .33) * .05 * p); elA.rotateX(Math.sin(time * .9) * .015 * p + s * .05); shB.rotateZ(Math.sin(time * 1.5 + 1) * .01 * p); }
    if (p > .995) { if (settleT == null) settleT = time; } else settleT = null;
    root.position.lerpVectors(rootB, rootH, p); root.position.y += Math.sin(time * 1.5) * .05 * p;
    root.updateMatrixWorld(true);
    for (const s of shadows) { s.m.visible = visible; if (visible) { s.L.an.getWorldPosition(tmp); s.m.position.x = tmp.x; s.m.position.z = tmp.z + 1.2; const h = tmp.y - FLOOR; s.m.material.opacity = 1; s.m.scale.setScalar(1 + Math.max(0, h - 3) * .05); } }
  }

  // ---------- modules
  const mods = []; const extra = {};
  function mod(d) { const m = { ...d, parts: [], labels: [], e: 0, a: 0, _v: false }; m.group = { get visible() { return m._v; }, set visible(v) { if (v === m._v) return; m._v = v; m.parts.forEach(p => p.obj.visible = v); } }; mods.push(m); return m; }
  function part(m, bone, obj, pos, inOff = [0, 0, 0], exOff = [0, 0, 0], label) {
    obj.position.set(...pos); obj.visible = false; obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); bone.add(obj);
    m.parts.push({ obj, base: obj.position.clone(), inOff: V(...inOff), exOff: V(...exOff) });
    if (label) m.labels.push({ obj, name: label[0], note: label[1] }); return obj; }
  const paulMat = shellDS.clone(); paulMat.roughness = .5; paulMat.clearcoat = .15; paulMat.clearcoatRoughness = .6;
  const pauldron = () => { const g = grp(mk(new THREE.SphereGeometry(3.6, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), paulMat), ringY(3.6, .07, M.glow)); g.scale.set(.8, .6, .74); return g; };
  const upperCover = () => grp(mk(lathe([[2.2, -10.4], [2.55, -8.2], [2.95, -5.6], [2.95, -4.2], [2.6, -3]], .92), shellDS), at(mk(RB(1.1, 4.6, .3, .1), M.carbon), 0, -7, 2.55), at(ringY(2.25, .06, M.glow), 0, -10.2, 0));
  const shoulderHousing = () => grp(disc(2.6, 2.8), mk(cylX(1.2, 3.2), M.steel), at(disc(1.6, .5), 1.55, 0, 0), at(disc(1.6, .5), -1.55, 0, 0));
  const rollAct = () => grp(mk(cyl(2.45, 2.45, 1.4, 48), M.dark), at(ringY(2.47, .06, M.glow), 0, .4, 0), at(mk(cyclo(1.7).rotateX(Math.PI / 2), M.brass), 0, -.78, 0));
  const forearmShell = (ps, pl, m2) => mk(lathe([[1.45, -9.5], [1.7, -8], [2.05, -5.6], [2.2, -3.6], [2.0, -1.7]], .9, ps, pl), m2);

  // 02 FOREARM (on elA; forearm runs 0 → -10 local, raised in build pose)
  { const m = mod({ id: '02', key: 'FOREARM', title: 'Forearm', sub: 'Actuator bundle and tendon routing', start: 1.2, cam: [15, -5.5, 27], look: [1.2, -8.8, 0],
      specs: [['FINGER DRIVES', 'ball-screw linear actuators'], ['GRIP FORCE', '50 N · design target'], ['POWER / COMMS', '48 V DC · CAN-FD'], ['MASS', '1.6 kg · design target']] });
    part(m, elA, grp(mk(cyl(1.4, 1.4, .5), M.steel), ringY(1.42, .05, M.glow)), [0, -9.75, 0], [0, 0, 6], [0, -1.4, 0], ['6-AXIS FORCE/TORQUE SENSOR', 'strain-gauge bridge · wrist interface']);
    part(m, elA, forearmShell(...FR, carbonDS), [0, 0, 0], [0, 0, 10], [0, 0, 5], ['FOREARM SHELL', 'CFRP half-shell · structural cover']);
    part(m, elA, forearmShell(...BK, shellDS), [0, 0, 0], [0, 0, -10], [0, 0, -5]);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * .8, z = Math.sin(a) * .7;
      const g = grp(at(mk(cyl(.32, .32, 1.5, 20), M.dark), 0, 2.4, 0), at(mk(cyl(.34, .34, .12, 20), M.brass), 0, 1.65, 0), mk(cyl(.08, .08, 3.4, 10), M.steel), mk(new THREE.TubeGeometry(new Helix(.11, 3.2, 24), 200, .022, 4), M.steel), at(mk(cyl(.2, .2, .4, 6), M.brass), 0, -.9, 0));
      part(m, elA, g, [x, -5.4, z], [x * 6, 0, z * 6], [x * 3.6, 0, z * 3.6], i == 0 ? ['LINEAR ACTUATOR', 'BLDC + ball screw · finger flexion'] : null); }
    const bs = new THREE.Group(); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * .8, z = Math.sin(a) * .7;
      bs.add(mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x, -6.6, z), V(x * 1.5, -7.8, z * 1.5), V(x * .6, -9, z * .6), V(x * .2, -9.6, z * .2)]), 30, .05, 6), M.glow)); }
    part(m, elA, bs, [0, 0, 0], [0, 0, 6], [0, -.8, 0], ['TENDON · BOWDEN SHEATH', 'UHMWPE (Dyneema) in PTFE-lined sheath']);
    const db = grp(mk(new THREE.BoxGeometry(1.2, 2.8, .06), M.pcb), at(mk(new THREE.BoxGeometry(.1, .1, .1), M.led), .4, 1.1, .06)); for (let k = 0; k < 3; k++) db.add(at(mk(new THREE.BoxGeometry(.4, .4, .1), M.rubber), 0, -.8 + k * .8, .06));
    part(m, elA, db, [0, -3.2, -1.2], [0, 0, -8], [3.8, 0, -1], ['MOTOR DRIVER BOARD', 'FOC current control · CAN-FD bus']);
    part(m, elA, grp(mk(cyl(1.85, 1.85, 1.1), M.dark), at(ringY(1.87, .05, M.glow), 0, -.3, 0), mk(cyl(.6, .6, 1.3, 20), M.brass)), [0, -2.2, 0], [0, 0, 8], [0, 1.6, 0], ['WRIST PRONATION MOTOR', 'frameless BLDC · forearm roll']);
  }
  // 03 ELBOW (on elA, axis local X; explode toward world +x in build pose = local -x)
  { const m = mod({ id: '03', key: 'ELBOW', title: 'Elbow', sub: 'Harmonic-drive revolute joint', start: 2.2, cam: [11, -10, 36], look: [3.4, -13.8, 0],
      specs: [['JOINT', '1-DOF revolute · pitch'], ['REDUCER', 'harmonic drive 100:1'], ['PEAK TORQUE', '120 N·m · design target'], ['RANGE', '0–145° · design spec']] });
    part(m, elA, grp(disc(2.0, 3.4), at(disc(1.3, .4), 1.85, 0, 0), at(disc(1.3, .4), -1.85, 0, 0)), [0, 0, 0], [0, 0, 8], [0, 0, 0], ['ELBOW REVOLUTE JOINT', '1-DOF pitch · sealed housing']);
    for (const s of [-1, 1]) part(m, elA, mk(RB(.35, 4.4, 3.4, .14), M.dark), [s * 1.85, 1.7, 0], [s * 5, 0, 0], [0, 0, -3.6]);
    part(m, elA, ringX(1.5, .26, M.steel), [-.9, 0, 0], [-6, 0, 0], [-4.2, 0, 0], ['CIRCULAR SPLINE', 'rigid ring · internal teeth']);
    part(m, elA, grp(mk(new THREE.CylinderGeometry(1.25, 1.25, 1, 40, 1, true).rotateZ(Math.PI / 2), steelDS), at(mk(cylX(1.25, .05), M.dark), .5, 0, 0), ringX(1.26, .05, M.brass)), [-.6, 0, 0], [-7, 0, 0], [-6.1, 0, 0], ['FLEXSPLINE', 'thin-wall cup · strain-wave gear']);
    part(m, elA, grp((() => { const o = mk(cylX(1.05, .5), M.dark); o.scale.z = .8; return o; })(), ringX(1.05, .05, M.glow)), [-.4, 0, 0], [-8, 0, 0], [-7.9, 0, 0], ['WAVE GENERATOR', 'elliptical cam + flexible bearing']);
    part(m, elA, ringX(1.75, .15, M.steel), [-1.3, 0, 0], [-9, 0, 0], [-9.7, 0, 0], ['CROSSED-ROLLER BEARING', 'output stage · moment load']);
    const st = grp(mk(cylX(1.5, .9), M.dark), mk(cylX(.55, 1.1), M.steel)); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; st.add(at(mk(new THREE.BoxGeometry(.75, .28, .28), M.brass), 0, Math.cos(a) * 1.1, Math.sin(a) * 1.1)); }
    part(m, elA, st, [.8, 0, 0], [6, 0, 0], [4.2, 0, 0], ['FRAMELESS BLDC MOTOR', 'stator + rotor · joint drive']);
    part(m, elA, grp(mk(cylX(1.15, .07), M.pcb), ringX(1.15, .035, M.glow), at(mk(cylX(.3, .14), M.brass), .08, 0, 0)), [1.3, 0, 0], [7, 0, 0], [6.1, 0, 0], ['ABSOLUTE MAGNETIC ENCODER', '14-bit · output-side angle']);
  }
  // 04 SHOULDER (on shA + pauldron on chest)
  { const m = mod({ id: '04', key: 'SHOULDER', title: 'Upper arm · Shoulder', sub: '3-DOF spherical joint, cycloidal reducers', start: 3.2, cam: [21, -19, 34], look: [4.2, -23.5, 0],
      specs: [['JOINT', '3-DOF spherical · intersecting axes'], ['REDUCER', 'cycloidal 59:1 · design spec'], ['PITCH TORQUE', '150 N·m · design target'], ['BACKDRIVABLE', 'yes · design goal']] });
    part(m, shA, upperCover(), [0, 0, 0], [0, 0, 10], [0, 0, 0], ['HUMERUS LINK', '7075-T6 tube · muscle-form cover']);
    part(m, shA, rollAct(), [0, -3.1, 0], [0, 0, 8], [0, 0, 5], ['UPPER-ARM ROLL ACTUATOR', 'BLDC + cycloidal reducer']);
    part(m, shA, shoulderHousing(), [0, 0, 0], [-6, 0, 0], [-3.4, 0, 0], ['SHOULDER PITCH ACTUATOR', 'frameless BLDC · 59:1 cycloidal']);
    part(m, shA, mk(cyclo(1.7).rotateY(Math.PI / 2), M.brass), [-1.5, 0, 0], [-8, 0, 0], [-6, 0, 0], ['CYCLOIDAL DISC', 'eccentric cam · rolls on ring pins']);
    part(m, shA, grp(pinRing(1.8, 20, .4), ringX(1.92, .1, M.dark)), [-1.5, 0, 0], [-9, 0, 0], [-7.6, 0, 0], ['RING-PIN HOUSING', 'output · low backlash']);
    part(m, chest, pauldron(), [9.2, 15.1, 0], [0, 6, 0], [3, 4, 0], ['3-DOF SPHERICAL SHOULDER', 'pitch / roll / yaw · armored cap']);
  }
  // 05 TORSO (chest + head + arm B)
  { const m = mod({ id: '05', key: 'TORSO', title: 'Torso · Chest', sub: 'Energy, compute, thermal, balance', start: 4.2, cam: [8, -27, 72], look: [-8, -30, 1],
      specs: [['BATTERY', '48 V Li-ion · 2 h runtime target'], ['COMPUTE', 'on-board GPU SoC'], ['THERMAL', 'liquid loop · cold plate'], ['BALANCE', '6-axis IMU']] });
    const chestP = [[5.2, 3.0], [5.8, 4.2], [6.9, 6.2], [8.1, 9], [8.6, 11.6], [8.1, 13.6], [6.2, 15.1], [2.8, 15.8]];
    part(m, chest, grp(mk(lathe(chestP, .62, ...FR), shellDS), at((() => { const r = ringY(8.6, .05, M.glow); r.scale.z = .62; return r; })(), 0, 11.6, 0)), [0, 0, 0], [0, 0, 12], [12, 2.5, 2.5], ['CHEST SHELL', 'CFRP monocoque · front half']);
    part(m, chest, mk(lathe(chestP, .62, ...BK), shellDS), [0, 0, 0], [0, 0, -12], [0, 0, -5]);
    { const rp = []; for (let i = 0; i <= 120; i++) { const y = -2.2 + i / 120 * 5.6, f = (y + 2.2) / 5.6; const w = 4.35 - 0.55 * Math.sin(Math.PI * f) + 0.5 * f * f; rp.push([w + 0.22 * Math.pow(Math.abs(Math.sin(y * 3.4)), 0.6), y]); }
      part(m, chest, mk(lathe(rp, .64, 0, Math.PI * 2, 96), CH), [0, 0, 0], [0, -6, 0], [0, -1.5, 0], ['ABDOMINAL FLEX SPINE', 'stacked chrome vertebrae · 2-DOF']); }
    { const R = y => { let a = chestP[0]; for (const b of chestP) { if (b[1] >= y) { const f = (y - a[1]) / Math.max(1e-3, b[1] - a[1]); return a[0] + (b[0] - a[0]) * f; } a = b; } return a[0]; };
      const sg = new THREE.Group(); const head = lathe([[0, .1], [.12, .08], [.15, .03], [.15, 0]], 1, 0, Math.PI * 2, 20);
      for (const [y, an] of [[5.2, .55], [5.2, -.55], [9.5, .9], [9.5, -.9], [12.6, .35], [12.6, -.35], [7.4, 0], [14.2, .6], [14.2, -.6]]) { const r = R(y) + .02; const o = mk(head, M.brass); o.position.set(Math.sin(an) * r, y, Math.cos(an) * r * .62); o.lookAt(o.position.x * 2, y, o.position.z * 2); o.rotateX(Math.PI / 2); sg.add(o); }
      const sp = []; for (let y = 3.2; y <= 15.6; y += .4) sp.push(V(0, y, R(y) * .62 + .015)); sg.add(mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 60, .025, 5), M.glow));
      part(m, chest, sg, [0, 0, 0], [0, 0, 12], [12, 2.5, 2.5]); }
    part(m, chest, mk(cylX(1.3, 18.4), M.dark), [0, 14.5, 0], [0, 0, -8], [0, 0, 0]);
    part(m, chest, mk(cyl(.8, .8, 14, 20), M.steel), [0, 7, -2.6], [0, 0, -8], [0, 0, 0]);
    const bat = grp(mk(RB(8.4, 5, 4, .9), M.dark), at(mk(new THREE.BoxGeometry(7.4, .08, .08), M.glow), 0, 2.2, 2.05));
    { const im = new THREE.InstancedMesh(cylZ(.4, .2, 16), M.steel, 24); const d = new THREE.Object3D(); let i = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { d.position.set(-3.6 + c * 1.03, -1.3 + r * 1.15, 2.05); d.updateMatrix(); im.setMatrixAt(i++, d.matrix); } bat.add(im); }
    part(m, chest, bat, [0, 4.6, -.3], [0, 0, 8], [0, -2.5, 9], ['LI-ION BATTERY PACK', '18650 cells · BMS monitored']);
    const cm = grp(mk(new THREE.BoxGeometry(6, 3.4, .1), M.pcb), at(mk(new THREE.BoxGeometry(1.5, 1.5, .2), M.rubber), -1.5, 0, .12), at(mk(new THREE.BoxGeometry(.15, .1, .1), M.led), 2.6, 1.4, .1));
    { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.07, 2.8, .7), M.steel, 12); const d = new THREE.Object3D(); for (let i = 0; i < 12; i++) { d.position.set(.1 + i * .22, 0, .4); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } cm.add(im); }
    part(m, chest, cm, [0, 10.3, 1.4], [0, 6, 0], [-3, 3, 10], ['COMPUTE MODULE', 'GPU SoC · perception + planning']);
    const fan = grp(ringZ(.85, .07, M.dark), mk(cylZ(.25, .2), M.steel)); for (let i = 0; i < 6; i++) { const b = mk(new THREE.BoxGeometry(.2, .75, .04), M.dark); b.position.set(Math.cos(i) * .43, Math.sin(i) * .43, 0); b.rotation.set(.4, 0, i + Math.PI / 2); fan.add(b); }
    part(m, chest, grp(fan, mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, .9, 0), V(-.5, 2.2, 0), V(-2, 2.8, 0), V(-3.2, 2.8, 0)]), 30, .08, 6), M.glow)), [4.4, 7.4, 1.9], [6, 0, 0], [7, 0, 8], ['LIQUID COOLING LOOP', 'cold plate · pump · radiator fan']);
    extra.fan = fan;
    part(m, chest, grp(mk(new THREE.BoxGeometry(.8, .8, .35), M.dark), at(mk(new THREE.BoxGeometry(.32, .32, .1), M.led), 0, 0, .2)), [-3.4, 7.4, 2.2], [0, 0, 6], [-7, 0, 10], ['IMU', '6-axis MEMS · balance estimation']);
    const neck = grp(at(mk(cyl(1.3, 1.7, 2.6, 48), M.dark), 0, 1.2, 0)); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; neck.add(at(mk(cyl(.16, .16, 2.8, 16), CH), Math.cos(a) * 1.45, 1.2, Math.sin(a) * 1.2)); }
    for (const s of [-1, 1]) { const pr = mk(cyl(.14, .14, 2.6, 10), M.steel); pr.position.set(s * 1.3, 1.1, 1.1); pr.rotation.z = s * .25; neck.add(pr); }
    part(m, chest, neck, [0, 15.5, 0], [0, 6, 0], [0, 2.5, 5], ['NECK ACTUATOR', '2-DOF pitch / yaw · cycloidal']);
    const egg = [[0, -.95], [.32, -.93], [.55, -.82], [.7, -.6], [.82, -.3], [.92, .05], [.97, .35], [.95, .6], [.85, .8], [.62, .95], [.32, 1.02], [0, 1.04]];
    const helm = grp(at((() => { const o = mk(lathe(egg.map(p => [p[0], p[1]]), 1, 0, Math.PI * 2, 72), M.shell); o.scale.set(3.55, 4.6, 4.05); o.rotation.x = -.12; return o; })(), 0, 4.7, .2));
    { const seam = mk(new THREE.TorusGeometry(1, .012, 6, 96, Math.PI * 1.1), M.glow); seam.scale.set(3.6, 4.2, 4.1); seam.rotation.set(0, Math.PI / 2, Math.PI * .45); seam.position.set(0, 4.6, .3); helm.add(seam); }
    for (const s of [-1, 1]) { const e = disc(1.25, .9); e.position.set(s * 3.45, 4.3, -.3); helm.add(e); }
    helm.add(at(mk(cyl(1.7, 1.9, 1.4, 48), CH), 0, 1.0, 0));
    part(m, head, helm, [0, 0, 0], [0, 8, 0], [0, 4.5, 0], ['STEREO DEPTH CAMERAS', 'behind ceramic faceplate · RGB-D']);
    part(m, chest, pauldron(), [-9.2, 15.1, 0], [-8, 4, 0], [0, 0, 0]);
    // arm B (relaxed side)
    part(m, shB, shoulderHousing(), [0, 0, 0], [-10, 0, 0]); part(m, shB, rollAct(), [0, -3.1, 0], [-10, 0, 0]); part(m, shB, upperCover(), [0, 0, 0], [-10, 0, 0]);
    part(m, elB, grp(disc(2.0, 3.4), at(disc(1.3, .4), 1.85, 0, 0), at(disc(1.3, .4), -1.85, 0, 0)), [0, 0, 0], [-10, 0, 0]);
    part(m, elB, grp(mk(lathe([[1.45, -9.5], [1.7, -8], [2.05, -5.6], [2.2, -3.6], [2.0, -1.7]], .9), carbonDS), at(ringY(1.48, .06, M.glow), 0, -9.4, 0), at(mk(cyl(1.85, 1.85, 1.1), M.dark), 0, -2.2, 0)), [0, 0, 0], [-10, 0, 0]);
    const hb = new THREE.Group(); hb.add(at(mk(cyl(1.3, 1.4, 1.2, 24), M.steel), 0, -.6, 0), at((() => { const o = mk(new THREE.SphereGeometry(1, 48, 32), shellDS); o.scale.set(.95, 2.3, 2.0); return o; })(), 0, -3.4, 0));
    for (let i = 0; i < 4; i++) { let par = new THREE.Group(); par.position.set(0, -5.55, -1.35 + i * .9); hb.add(par); [1.7, 1.25, .95].forEach((L, k) => { const j = new THREE.Group(); j.rotation.z = [.35, .75, .55][k]; par.add(j);
      j.add(at(mk(cylZ(.3, .6, 12), M.steel), 0, 0, 0)); j.add(at(mk(new THREE.CapsuleGeometry(.3, L - .5, 8, 32), CH), 0, -L / 2, 0)); j.add(ringY(.31, .04, M.brass)); const nx = new THREE.Group(); nx.position.y = -L; j.add(nx); par = nx; }); }
    { const t1 = new THREE.Group(); t1.position.set(.3, -2.2, 1.9); t1.rotation.set(-.5, 0, .5); hb.add(t1); t1.add(at(mk(new THREE.CapsuleGeometry(.36, 1.1, 8, 32), CH), 0, -.9, 0)); const t2 = new THREE.Group(); t2.position.y = -1.8; t2.rotation.z = .5; t1.add(t2); t2.add(at(mk(new THREE.CapsuleGeometry(.33, .7, 8, 32), CH), 0, -.65, 0)); }
    part(m, elB, hb, [0, -10, 0], [-10, 0, 0]);
  }
  // 06 PELVIS
  { const m = mod({ id: '06', key: 'PELVIS', title: 'Spine · Pelvis', sub: 'Waist yaw and power distribution', start: 5.2, cam: [26, -36, 72], look: [-8, -46, 1],
      specs: [['WAIST', '1-DOF yaw · planetary 10:1'], ['POWER BUS', '48 V · fused branches'], ['SAFETY', 'hardware e-stop loop'], ['HIP MOUNTS', '2 × 3-DOF']] });
    part(m, root, grp(mk(lathe([[4.4, -4.4], [5.6, -3.1], [6.2, -.9], [6.2, 1.2], [5.6, 3], [4.9, 3.7]], .72), shellDS), at((() => { const r = ringY(6.2, .05, M.glow); r.scale.z = .72; return r; })(), 0, .8, 0)), [0, 0, 0], [0, 0, -10], [0, 0, 0], ['PELVIS FRAME', 'machined aluminum · hip mounts']);
    const wy = grp(mk(cyl(4.6, 4.6, 1.4, 56), M.dark), at(ringY(4.62, .07, M.glow), 0, .4, 0)); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; wy.add(at(mk(cyl(1, 1, .3, 18), M.brass), Math.cos(a) * 2.2, .8, Math.sin(a) * 2.2)); }
    part(m, root, wy, [0, 4.4, 0], [0, 0, 8], [0, 1.8, 7.5], ['WAIST YAW ACTUATOR', 'BLDC + planetary 10:1']);
        const pdu = grp(mk(new THREE.BoxGeometry(4.6, 2.2, .1), M.pcb), at(mk(new THREE.BoxGeometry(4, .06, .06), M.glow), 0, -.9, .08)); for (let i = 0; i < 4; i++) pdu.add(at(mk(new THREE.BoxGeometry(.7, .8, .4), M.rubber), -1.5 + i * 1.0, .2, .22));
    part(m, root, pdu, [0, .3, 3.3], [0, 0, 8], [0, -.6, 7], ['POWER DISTRIBUTION UNIT', '48 V bus · e-stop · fusing']);
    for (const s of [-1, 1]) part(m, root, grp(mk(cyl(2.1, 2.1, 1.6, 32), M.dark), at(ringY(2.12, .05, M.glow), 0, -.5, 0)), [s * 4.4, -.4, 0], [s * 6, 0, 0], [s * 5, -.4, 0], s > 0 ? ['HIP YAW / ROLL ACTUATORS', 'cycloidal · 3-DOF hip'] : null);
  }
  // 07 LEGS
  { const m = mod({ id: '07', key: 'LEGS', title: 'Hip · Legs', sub: 'Quasi-direct-drive and series-elastic actuation', start: 6.2, cam: [-32, -57, 66], look: [-8, -66, 0],
      specs: [['HIP / KNEE', 'QDD actuators · ~9:1 · backdrivable'], ['ANKLE', 'series elastic · 2-DOF'], ['FOOT', '6-axis F/T + pressure sole'], ['WALK SPEED', '1.5 m/s · design target']] });
    for (const [L, s] of [[LA, 1], [LB, -1]]) { const lab = s < 0;
      part(m, L.th, mk(cylX(2.3, 3.8), M.shell), [0, 0, 0], [0, 0, -8]);
      part(m, L.th, grp(disc(2.8, 1.6), at(disc(1.7, .5), s * 1.0, 0, 0)), [s * 2.9, 0, 0], [s * 7, 0, 0], [s * 4.5, 0, 0], lab ? ['QUASI-DIRECT-DRIVE ACTUATOR', 'hip pitch · low ratio, backdrivable'] : null);
      part(m, L.th, grp(mk(lathe([[2.05, -15.6], [2.5, -12.2], [3.15, -7.2], [3.3, -4.6], [2.9, -1.8]], .95), shellDS), at(ringY(2.1, .06, M.glow), 0, -15.3, 0)), [0, 0, 0], [0, 0, 10], [0, 0, 0], lab ? ['FEMUR LINK', 'CFRP tube · muscle-form cover'] : null);
      part(m, L.k, grp(disc(2.15, 4.2), at(disc(1.7, .9), s * 2.4, 0, 0), at((() => { const o = mk(new THREE.SphereGeometry(1.5, 48, 32), shellDS); o.scale.set(.95, 1.1, .5); return o; })(), 0, .3, 1.9)), [0, 0, 0], [0, 0, 8], [0, 0, 4], lab ? ['KNEE QDD ACTUATOR', 'linkage-driven · 1-DOF pitch'] : null);
      part(m, L.k, mk(lathe([[1.35, -15.2], [1.6, -12.2], [2.3, -6.4], [2.55, -4.0], [2.2, -1.7]], .95), carbonDS), [0, 0, 0], [0, 0, 10], [0, 0, 0]);
      part(m, L.k, grp(mk(new THREE.TubeGeometry(new Helix(.42, 3.2, 9), 160, .07, 5), M.steel), at(mk(cyl(.09, .09, 7, 8), M.steel), 0, -.6, 0), at(mk(cyl(.5, .5, 1.4, 18), M.dark), 0, 2.8, 0), at(ringY(.52, .03, M.glow), 0, 2.3, 0)), [0, -8.6, -2.5], [0, 0, -8], [0, 0, -4.2], lab ? ['SERIES ELASTIC ACTUATOR', 'ankle · spring for compliance + torque sensing'] : null);
      part(m, L.an, mk(new THREE.SphereGeometry(1.5, 24, 16), M.steel), [0, 0, 0], [0, 0, 8]);
      const ft = grp(at(mk(RB(4.3, 1.9, 6.6, .7), M.dark), 0, -2.1, .7), at(mk(RB(4.0, 1.5, 2.2, .6), M.shell), 0, -2.3, -2.0), at(mk(RB(4.5, .36, 7.0, .15), M.rubber), 0, -2.98, .6)); for (const z of [-1.8, .4, 2.6]) ft.add(at(mk(new THREE.BoxGeometry(3.6, .05, .25), M.glow), 0, -3.17, z));
      part(m, L.an, ft, [0, 0, 0], [0, 0, 8], [0, .4, 4.5], lab ? ['FOOT F/T + PRESSURE SENSORS', '6-axis F/T · sole pressure array'] : null);
      part(m, L.toe, grp(at(mk(RB(4.2, 1.2, 2.6, .5), M.shell), 0, -.15, 1.3), at(mk(RB(4.3, .3, 2.6, .12), M.rubber), 0, -.7, 1.3)), [0, 0, 0], [0, 0, 8], [0, .4, 7.5], lab ? ['TOE SEGMENT', 'passive hinge · push-off'] : null); }
  }
  mod({ id: '08', key: 'COMPLETE', title: 'The whole machine.', sub: 'All modules integrated · hero stance', start: 7.2, cam: [-73.7, -44.1, 75], look: [-28, -39, -10.4], camT: 7.95, final: true,
    specs: [['MODULES', '8 integrated'], ['DOF', '~30 · design spec'], ['HEIGHT', '1.75 m · design target'], ['STATUS', 'R&D concept · simulation']] });
  mods.forEach(m => { if (m.camT == null) m.camT = m.start + .65; });

  return { mods, extra, rig: { root, bones, anchor, setPose, FLOOR } };
}
