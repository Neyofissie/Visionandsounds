{
const SEV = window.SEV, FIND = window.FIND, CAP = window.CAP, VIEWS = window.VIEWS;
const view = document.getElementById('view'), pinsEl = document.getElementById('pins');
const detail = document.getElementById('detail'), list = document.getElementById('list');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img = n => 'photos/ph' + String(n).padStart(2, '0') + '.jpg';

/* ---------- scene ---------- */
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 400);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 4; controls.maxDistance = 130; controls.maxPolarAngle = 1.62;

scene.add(new THREE.HemisphereLight(0xe3ecf2, 0x4a5046, 0.8));
const sun = new THREE.DirectionalLight(0xfff0d8, 0.85);
sun.position.set(34, 46, -18); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140});
scene.add(sun); sun.target.position.set(-3, 0, 16); scene.add(sun.target);

const shell = [];  // materials that go glassy in "see inside"
const M = (color, opt = {}) => new THREE.MeshStandardMaterial(Object.assign({color, roughness: .85, metalness: 0}, opt));
const shellM = (color, opt) => { const m = M(color, opt); shell.push(m); return m; };
function add(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m;
}
function beam(a, b, t, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = add(new THREE.BoxGeometry(d.length(), t, t), mat, ...A.clone().add(B).multiplyScalar(.5).toArray(), false);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()); return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

/* ground, George Place to the north, car park to the south */
const groundM = M(0x6d7468); groundM.transparent = true;
add(new THREE.PlaneGeometry(220, 220), groundM, 0, -0.02, 10, false).rotation.x = -Math.PI / 2;
const road = add(new THREE.PlaneGeometry(120, 9), M(0x3b4045), 0, 0, -9, false); road.rotation.x = -Math.PI / 2;
const pave = add(new THREE.PlaneGeometry(120, 4), M(0x9a9c98), 0, 0.01, -2.5, false); pave.rotation.x = -Math.PI / 2;
const park = add(new THREE.PlaneGeometry(50, 20), M(0x44494d), -4, 0.01, 45, false); park.rotation.x = -Math.PI / 2;
const lane = add(new THREE.PlaneGeometry(4, 34), M(0x555a5c), 11, 0.01, 16, false); lane.rotation.x = -Math.PI / 2;
const streetLbl = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#ffffffcc'; g.font = '600 38px Barlow, sans-serif'; g.textAlign = 'center'; g.fillText('GEORGE PLACE', w / 2, 46); });
const sl = add(new THREE.PlaneGeometry(14, 1.75), new THREE.MeshBasicMaterial({map: streetLbl, transparent: true}), 14, 0.03, -9, false);
sl.rotation.x = -Math.PI / 2; sl.rotation.z = Math.PI;

/* main auditorium: gable-fronted box, 16m wide, 32m long */
const W = 8, EAVE = 9, RIDGE = 14.4, LEN = 32;
const loader = new THREE.TextureLoader();
function photoTex(name, rep) {
  const t = loader.load('tex/' + name + '.jpg'); t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  return t;
}
const photoM = (name, rep) => { const t = photoTex(name, rep); return shellM(0xffffff, {map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .28}); };
function gableFace(mat, z, flip) {
  const g = new THREE.ShapeGeometry(prof), pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W) / (2 * W), pos.getY(i) / RIDGE);
  const m = add(g, mat, 0, 0, z, false); if (flip) m.rotation.y = Math.PI; return m;
}
const prof = new THREE.Shape(); prof.moveTo(-W, 0); prof.lineTo(W, 0); prof.lineTo(W, EAVE); prof.lineTo(0, RIDGE); prof.lineTo(-W, EAVE); prof.closePath();
const renderM = photoM('render', 1 / 6);
add(new THREE.ExtrudeGeometry(prof, {depth: LEN, bevelEnabled: false}), renderM);

/* walls wrapped with the survey photos, perspective-corrected */
const eastM = photoM('east');
add(new THREE.PlaneGeometry(LEN, EAVE), eastM, W + 0.03, EAVE / 2, LEN / 2, false).rotation.y = Math.PI / 2;

/* front gable (photo 0) and rear gable (photo 7) */
gableFace(photoM('front'), -0.04, true);
gableFace(photoM('rear'), LEN + 0.04, false);
const darkM = shellM(0x26323a, {emissive: 0x3a2a10, emissiveIntensity: .35});
add(new THREE.BoxGeometry(6.4, 2.6, .3), darkM, 0, 1.3, -0.12);
for (const x of [-3.5, 3.5, -1.1, 1.1]) add(new THREE.BoxGeometry(.45, 2.6, .45), shellM(0xe8e2d6), x, 1.3, -0.25);
/* corrugated roof, with failed sheeting at the south-west corner */
const corr = canvasTex(64, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? '#3f4952' : '#5f6b75'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
corr.wrapS = corr.wrapT = THREE.RepeatWrapping; corr.repeat.set(1, 30);
const roofM = shellM(0xffffff, {map: corr, metalness: .3, roughness: .6});
const roofs = [];
const slope = Math.atan2(RIDGE - EAVE, W), SL = Math.hypot(W + .5, RIDGE - EAVE + .25);
function sheet(side, t0, t1, z0, z1, mat = roofM) {
  const len = SL * (t1 - t0), tc = (t0 + t1) / 2;
  const m = add(new THREE.BoxGeometry(len, .12, z1 - z0), mat, side * (W + .5) * tc, RIDGE + .08 - (RIDGE - EAVE + .25) * tc, (z0 + z1) / 2);
  m.rotation.z = -side * slope; roofs.push(m); return m;
}
sheet(1, 0, 1, -.3, LEN + .3);
sheet(-1, 0, 1, -.3, 28.4);
sheet(-1, 0, .45, 28.4, LEN + .3);
const holeM = new THREE.MeshBasicMaterial({color: 0x141a1e}); shell.push(holeM);
const hole = sheet(-1, .45, 1, 28.4, LEN + .3, holeM); hole.position.y -= .1; hole.castShadow = false;
const flap = sheet(-1, .5, .9, 29.2, 31.2); flap.rotation.z += .55; flap.rotation.x = .15; flap.position.y += 1;

/* annex: two-storey brick block to the west, slate roofs with a valley */
const AX0 = -15.2, AX1 = -W - .02, AZ = 22, AH = 6.2;
const annexM = photoM('render', 1 / 6);
add(new THREE.BoxGeometry(AX1 - AX0, AH, AZ), annexM, (AX0 + AX1) / 2, AH / 2, AZ / 2);
const af = add(new THREE.PlaneGeometry(AX1 - AX0, AH), photoM('annex'), (AX0 + AX1) / 2, AH / 2, -0.04, false); af.rotation.y = Math.PI;
add(new THREE.BoxGeometry(1.2, 2.2, .2), darkM, -11.6, 1.1, -0.08);
for (const z of [7, 11, 15]) add(new THREE.BoxGeometry(.1, 1.1, 1), darkM, AX0 - .05, 4.4, z, false);
const slateM = shellM(0x565c52, {roughness: .75});
const tri = (a, b, h) => { const s = new THREE.Shape(); s.moveTo(a, 0); s.lineTo(b, 0); s.lineTo((a + b) / 2, h); s.closePath(); return s; };
const rearRoof = add(new THREE.ExtrudeGeometry(tri(AX0 - .3, AX1 + .1, 2.6), {depth: AZ - 7.6, bevelEnabled: false}), slateM, 0, AH, 7.6); roofs.push(rearRoof);
const frontRoof = add(new THREE.ExtrudeGeometry(tri(-.3, 8.3, 2.9), {depth: AX1 - AX0 + .3, bevelEnabled: false}), slateM, AX1 + .1, AH, 0);
frontRoof.rotation.y = -Math.PI / 2; roofs.push(frontRoof);

/* ---------- inside (seen with "see inside") ---------- */
const steelM = M(0x5d6a73, {metalness: .5, roughness: .5}), rustM = M(0xa4471d, {roughness: .9}), timberM = M(0xb08a5a);
for (let z = 0; z <= LEN; z += 4) {
  beam([W - .3, 0, z], [W - .3, EAVE, z], .35, z >= 8 && z <= 28 ? rustM : steelM);
  beam([-W + .3, 0, z], [-W + .3, EAVE, z], .35, steelM);
}
beam([W - .3, 3, 6], [W - .3, 3, 30], .3, rustM);
for (let z = 2; z <= 30; z += 4) {           // full-span steel trusses
  beam([-W, EAVE, z], [W, EAVE, z], .2, steelM);
  beam([-W, EAVE, z], [0, RIDGE, z], .22, steelM); beam([W, EAVE, z], [0, RIDGE, z], .22, steelM);
  beam([0, EAVE, z], [0, RIDGE, z], .14, steelM);
  for (const s of [-1, 1]) { beam([s * W / 2, EAVE, z], [s * W / 2, EAVE + (RIDGE - EAVE) / 2, z], .12, steelM); beam([s * W / 2, EAVE, z], [0, RIDGE, z], .1, steelM); }
}
for (let i = 1; i <= 5; i++) for (const s of [-1, 1]) {   // timber purlins at close centres
  const t = i / 6, zEnd = s < 0 && t > .45 ? 29.6 : LEN;   // rotted purlin ends at the SW gable
  beam([s * W * t, RIDGE - (RIDGE - EAVE) * t - .2, 0], [s * W * t, RIDGE - (RIDGE - EAVE) * t - .2, zEnd], .16, timberM);
}
const floorM = M(0x8c6b4c), plainM = M(0xc9c3b8);
const rake = add(new THREE.BoxGeometry(2 * W - .6, .2, 20.4), floorM, 0, -.6, 17, false); rake.rotation.x = Math.atan2(1.2, 20);
add(new THREE.BoxGeometry(2 * W - .6, 1.6, 5), floorM, 0, -.4, 29.5);
add(new THREE.BoxGeometry(2 * W - .6, .2, 2.4), plainM, 0, 3.3, 30.8);
const pro = new THREE.Shape(); pro.moveTo(-W + .3, -1); pro.lineTo(W - .3, -1); pro.lineTo(W - .3, EAVE); pro.lineTo(-W + .3, EAVE); pro.closePath();
const ph = new THREE.Path(); ph.moveTo(-5.4, .4); ph.lineTo(5.4, .4); ph.lineTo(5.4, 5); ph.quadraticCurveTo(0, 7.6, -5.4, 5); ph.closePath(); pro.holes.push(ph);
add(new THREE.ExtrudeGeometry(pro, {depth: .35, bevelEnabled: false}), M(0xd8cfbd), 0, 0, 26.8);
const gal = add(new THREE.BoxGeometry(2 * W - .6, .3, 5.5), floorM, 0, 4.6, 8.6); gal.rotation.x = -.18;
add(new THREE.BoxGeometry(2 * W - .6, 1, .15), plainM, 0, 4.6, 11.4);
add(new THREE.BoxGeometry(2 * W - .6, .25, 6.5), plainM, 0, .5, 3.2);
add(new THREE.BoxGeometry(3.4, 2.2, 2.6), M(0x7a8288), 1.5, 7.1, 1.6);
for (const s of [-1, 1]) for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(1.6, .25, .8), plainM, s * 6.2, .7 + i * .7, 1 + i * .8, false);
const baseM = M(0x8d949a, {transparent: true, opacity: .55});
add(new THREE.BoxGeometry(12, 3, 6.4), baseM, 0, -1.55, 3.3, false);
beam([-6, -.3, .3], [6, -.3, .3], .3, rustM);
add(new THREE.BoxGeometry(AX1 - AX0 - .4, .2, AZ - .4), floorM, (AX0 + AX1) / 2, 3.1, AZ / 2);
add(new THREE.BoxGeometry(3, .1, 4), M(0xe8e2c8, {emissive: 0x554c20, emissiveIntensity: .4}), -10.5, 1.2, 19.5, false); // rot zone

/* ---------- see inside / roofs ---------- */
let xray = false, roofOn = true;
const xb = document.getElementById('xray'), rb = document.getElementById('roofs');
function setX(on) {
  xray = on; xb.setAttribute('aria-pressed', on);
  for (const m of shell) { m.transparent = true; m.opacity = on ? .13 : 1; m.depthWrite = !on; m.needsUpdate = true; }
  groundM.opacity = on ? .55 : 1; groundM.depthWrite = !on;
  for (const o of scene.children) if (o.isMesh && shell.includes(o.material)) o.castShadow = !on;
}
function setRoof(on) { roofOn = on; rb.setAttribute('aria-pressed', on); for (const r of roofs) r.visible = on; hole.visible = on; }
xb.onclick = () => setX(!xray); rb.onclick = () => setRoof(!roofOn);

/* ---------- camera flights ---------- */
let fly = null;
function flyTo(cam, tgt) {
  const from = {c: camera.position.clone(), t: controls.target.clone()};
  const to = {c: new THREE.Vector3(...cam), t: new THREE.Vector3(...tgt)};
  if (camera.aspect < 1) to.c.sub(to.t).multiplyScalar(Math.min(1.9, camera.aspect ** -.6)).add(to.t);
  if (reduce) { camera.position.copy(to.c); controls.target.copy(to.t); return; }
  fly = {from, to, t0: performance.now(), d: 1100};
}
for (const b of document.querySelectorAll('[data-v]')) b.onclick = () => { const v = VIEWS[b.dataset.v]; flyTo(v.cam, v.tgt); };
camera.position.set(...VIEWS.overview.cam); controls.target.set(...VIEWS.overview.tgt);

/* ---------- pins, list, filters ---------- */
const on = new Set(Object.keys(SEV));
const pinBtns = FIND.map((f, i) => {
  const b = document.createElement('button'); b.className = 'pin'; b.style.background = SEV[f.s].c;
  b.setAttribute('aria-label', (i + 1) + '. ' + f.t);
  b.innerHTML = (i + 1) + '<span>' + esc(f.t) + '</span>';
  b.onclick = () => select(i); pinsEl.appendChild(b); return b;
});
list.innerHTML = FIND.map((f, i) => `<button data-i="${i}" role="listitem"><span class="n" style="background:${SEV[f.s].c}">${i + 1}</span>${esc(f.t)}</button>`).join('');
const listBtns = [...list.children]; listBtns.forEach(b => b.onclick = () => select(+b.dataset.i));
const keys = document.getElementById('keys');
keys.innerHTML = Object.entries(SEV).map(([k, v]) => `<button class="key" data-k="${k}" aria-pressed="true"><span class="dot" style="background:${v.c}"></span>${v.label}<b>${FIND.filter(f => f.s === k).length}</b></button>`).join('');
for (const b of keys.children) b.onclick = () => {
  const k = b.dataset.k; on.has(k) ? on.delete(k) : on.add(k); b.setAttribute('aria-pressed', on.has(k));
  FIND.forEach((f, i) => { listBtns[i].hidden = !on.has(f.s); });
};

const glow = add(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({transparent: true, opacity: .35, depthTest: false}), 0, 0, 0, false);
glow.visible = false; glow.renderOrder = 9;

let sel = -1, photos = [];
function intro() {
  const n = k => FIND.filter(f => f.s === k).length;
  detail.innerHTML = `<h3>Generally sound, but water is getting in</h3>
  <p class="loc">${FIND.length} findings, 52 survey photographs</p>
  <p>The steel frame, trusses, floors and foundations are broadly sound, with no settlement or loss of tying. The damage comes from water ingress and condensation in a closed-up building: an open roof over the stage, a leaking Annex with active dry rot, and corroding steel in the outside walls.</p>
  <p>${n('imm')} immediate item, ${n('urg')} urgent repairs, ${n('inv')} items to investigate, ${n('mnt')} maintenance items and ${n('good')} areas in good condition.</p>
  <div class="nav"><button id="go">Start with the most urgent</button></div>`;
  document.getElementById('go').onclick = () => select(0);
}
function select(i) {
  sel = i; const f = FIND[i], s = SEV[f.s];
  pinBtns.forEach((b, j) => b.classList.toggle('sel', j === i));
  listBtns.forEach((b, j) => b.classList.toggle('sel', j === i));
  listBtns[i].scrollIntoView({block: 'nearest', behavior: reduce ? 'auto' : 'smooth'});
  if (f.x && !xray) setX(true); if (!f.x && xray) setX(false);
  if (!roofOn && !f.x) setRoof(true);
  flyTo(f.cam, f.pos);
  glow.visible = true; glow.position.set(...f.pos); glow.material.color.set(s.c);
  photos = f.ph;
  detail.innerHTML = `<span class="chip" style="background:${s.c}">${s.label}</span>
  <h3>${i + 1}. ${esc(f.t)}</h3><p class="loc">${esc(f.loc)}</p>
  <h4>What the survey found</h4><p>${esc(f.says)}</p>
  <h4>What it recommends</h4><p>${esc(f.todo)}</p>
  ${f.ph.length ? `<h4>Photos from the report</h4><div class="strip">${f.ph.map((n, k) => `<button data-k="${k}"><img src="${img(n)}" alt="${esc(CAP[n] || '')}" loading="lazy">Photo ${n || 'cover'}</button>`).join('')}</div>` : '<h4>Photos</h4><p class="loc">Not photographed: these could not be seen during the survey.</p>'}
  <div class="nav"><button id="prev">‹ Previous</button><button id="next">Next ›</button></div>`;
  for (const b of detail.querySelectorAll('.strip button')) b.onclick = () => openLb(+b.dataset.k);
  document.getElementById('prev').onclick = () => step(-1);
  document.getElementById('next').onclick = () => step(1);
}
function step(d) { let j = sel; do { j = (j + d + FIND.length) % FIND.length; } while (!on.has(FIND[j].s) && j !== sel); select(j); }

/* ---------- lightbox ---------- */
const lb = document.getElementById('lb'), lbImg = document.getElementById('lbImg'), lbCap = document.getElementById('lbCap');
let lbk = 0;
function showLb() { const n = photos[lbk]; lbImg.src = img(n); lbImg.alt = CAP[n] || ''; lbCap.textContent = (n ? 'Photo ' + n + ': ' : 'Cover photo: ') + (CAP[n] || ''); }
function openLb(k) { lbk = k; showLb(); try { lb.showModal(); } catch (e) { lb.setAttribute('open', ''); } }
document.getElementById('lbPrev').onclick = () => { lbk = (lbk - 1 + photos.length) % photos.length; showLb(); };
document.getElementById('lbNext').onclick = () => { lbk = (lbk + 1) % photos.length; showLb(); };
document.getElementById('lbClose').onclick = () => lb.close();
lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
addEventListener('keydown', e => {
  if (lb.open) { if (e.key === 'ArrowLeft') document.getElementById('lbPrev').click(); if (e.key === 'ArrowRight') document.getElementById('lbNext').click(); return; }
  if (sel >= 0 && document.activeElement?.closest('aside') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); step(e.key === 'ArrowDown' ? 1 : -1); }
});

/* ---------- loop ---------- */
const ro = new ResizeObserver(() => { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); });
ro.observe(view);
const v3 = new THREE.Vector3(), ray = new THREE.Raycaster();
const occluders = scene.children.filter(o => o.isMesh && (shell.includes(o.material) || roofs.includes(o)) && o.material !== holeM);
const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
function frame(now) {
  if (fly) {
    const t = Math.min(1, (now - fly.t0) / fly.d), e = ease(t);
    camera.position.lerpVectors(fly.from.c, fly.to.c, e); controls.target.lerpVectors(fly.from.t, fly.to.t, e);
    if (t === 1) fly = null;
  }
  controls.update();
  if (glow.visible) glow.scale.setScalar(reduce ? 1.2 : 1 + .35 * Math.sin(now / 300));
  const w = view.clientWidth, h = view.clientHeight;
  FIND.forEach((f, i) => {
    v3.set(...f.pos).project(camera);
    const vis = on.has(f.s) && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
    const b = pinBtns[i]; b.style.display = vis ? '' : 'none';
    if (vis) {
      let hid = false;
      if (!xray && i !== sel) {
        const p = new THREE.Vector3(...f.pos), d = p.clone().sub(camera.position), dist = d.length();
        ray.set(camera.position, d.normalize()); ray.far = dist - .6;
        hid = ray.intersectObjects(occluders.filter(o => o.visible), false).length > 0;
      }
      b.classList.toggle('behind', hid);
      const r = i === sel ? 20 : hid ? 11 : 15; b.style.transform = `translate(${(v3.x + 1) / 2 * w - r}px,${(1 - v3.y) / 2 * h - r}px)`;
    }
  });
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
intro();
requestAnimationFrame(frame);
}
