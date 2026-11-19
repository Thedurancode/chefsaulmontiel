/* Chef Saúl Montiel — 3D timeline.
   The camera flies past each photo of his life as you scroll. A thread stitches
   the stops together; year labels hang above each photo.
   Without WebGL, or with reduced motion, the section stays a plain list. */
import * as THREE from 'three';

const section = document.querySelector('.journey');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function yearText(stop) {
  return (document.documentElement.lang === 'es' && stop.dataset.yearEs) || stop.dataset.year;
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}

if (section && !reduce && hasWebGL()) {
  // run after the whole module has loaded, so the scene builders below exist
  queueMicrotask(() => {
    try { init(); } catch (err) { console.error(err); section.classList.remove('is-3d'); }
  });
}

function init() {
  const stage = section.querySelector('.journey-stage');
  const canvas = section.querySelector('.journey-canvas');
  const stops = [...section.querySelectorAll('.stop')];
  const N = stops.length;
  const isPhone = () => innerWidth <= 760;

  section.style.setProperty('--stops', N);
  section.classList.add('is-3d');

  const yearsEl = section.querySelector('.journey-years');
  const yearItems = stops.map((s, i) => {
    const li = document.createElement('li');
    li.textContent = yearText(s);
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => scrollToStop(i));
    yearsEl.appendChild(li);
    return li;
  });

  /* ── renderer, scene, camera ── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isPhone() ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const bg = new THREE.Color('#0A261D');
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 18, 52);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220);

  // one mood colour per stop, eased between as you travel
  const moods = ['#0A261D', '#0E2236', '#0A261D', '#24130A', '#2C0F10', '#0E2236', '#2A1A05', '#0A261D']
    .map(c => new THREE.Color(c));

  const GAP = 17, SWAY = 3.3, H = 5;
  const anchors = stops.map((_, i) => new THREE.Vector3(i % 2 ? SWAY : -SWAY, Math.sin(i * 1.3) * 0.9, -i * GAP));

  /* ── photo planes: rounded corners, cover-cropped, bend with scroll speed ── */
  const plane = new THREE.PlaneGeometry(1, 1, 24, 1);
  const vert = `
    uniform float uBend; varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 p = position;
      p.z += sin(uv.x * 3.14159) * uBend;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;
  const frag = `
    uniform sampler2D uMap; uniform float uOpacity; uniform vec2 uSize; uniform float uRadius;
    uniform vec2 uCover; uniform vec2 uShift; uniform float uZoom; uniform float uReady;
    varying vec2 vUv;
    float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main() {
      vec2 uv = (vUv - 0.5) * uCover / uZoom + 0.5 + uShift;
      vec3 col = mix(vec3(0.06, 0.2, 0.15), texture2D(uMap, uv).rgb, uReady);
      float d = box((vUv - 0.5) * uSize, uSize * 0.5, uRadius);
      float a = 1.0 - smoothstep(-0.015, 0.015, d);
      gl_FragColor = vec4(col, a * uOpacity);
      #include <colorspace_fragment>
    }`;

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();
  const photos = stops.map((stop, i) => {
    const img = stop.querySelector('img');
    const still = img.classList.contains('still');
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
      uniforms: {
        uMap: { value: null }, uOpacity: { value: 0 }, uSize: { value: new THREE.Vector2(1, 1) },
        uRadius: { value: 0.28 }, uCover: { value: new THREE.Vector2(1, 1) }, uShift: { value: new THREE.Vector2(0, 0) },
        uZoom: { value: 1 }, uBend: { value: 0 }, uReady: { value: 0 }
      }
    });
    const mesh = new THREE.Mesh(plane, mat);
    mesh.position.copy(anchors[i]);
    mesh.rotation.y = i % 2 ? -0.2 : 0.2;
    mesh.rotation.z = i % 2 ? 0.025 : -0.025;
    scene.add(mesh);
    const item = { mesh, mat, aspect: (+img.getAttribute('width') || 4) / (+img.getAttribute('height') || 3), still, w: H, ready: 0 };
    // stops with no photo of him get a small rendered scene instead
    const kind = stop.dataset.scene;
    if (kind && DIORAMAS[kind]) {
      const small = isPhone();
      item.diorama = DIORAMAS[kind]();
      item.diorama.rt = new THREE.WebGLRenderTarget(small ? 640 : 960, small ? 800 : 1200, { samples: 4, colorSpace: THREE.SRGBColorSpace });
      mat.uniforms.uMap.value = item.diorama.rt.texture;
      item.aspect = 0.8; item.still = false; item.ready = 1;
      return item;
    }
    loader.load(img.getAttribute('src'), tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      mat.uniforms.uMap.value = tex;
      item.aspect = tex.image.width / tex.image.height;
      item.ready = 1;
      layout();
    });
    return item;
  });

  /* ── year labels drawn with the page font ── */
  const labels = stops.map(() => {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    scene.add(mesh);
    return { mesh, mat, ratio: 3 };
  });
  function drawLabels() {
    stops.forEach((stop, i) => {
      const text = yearText(stop);
      const c = document.createElement('canvas'), ctx = c.getContext('2d');
      const font = '800 200px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.font = font;
      const w = Math.ceil(ctx.measureText(text).width) + 40;
      c.width = w; c.height = 240;
      ctx.font = font;
      ctx.fillStyle = '#DCEBA0';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, 10, 190);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      if (labels[i].mat.map) labels[i].mat.map.dispose();
      labels[i].mat.map = tex;
      labels[i].mat.needsUpdate = true;
      labels[i].ratio = w / 240;
    });
    layout();
  }
  // the language toggle redraws the labels (Age 16 becomes 16 años)
  addEventListener('langchange', () => {
    yearItems.forEach((li, i) => { li.textContent = yearText(stops[i]); });
    drawLabels();
  });
  (document.fonts && document.fonts.load ? document.fonts.load('800 200px "Bricolage Grotesque"') : Promise.resolve())
    .then(drawLabels, drawLabels);

  /* ── the thread, with a bead at every stop ── */
  const threadPts = [new THREE.Vector3(anchors[0].x, anchors[0].y - 3.4, 16)]
    .concat(anchors.map(a => new THREE.Vector3(a.x * 0.55, a.y - 3.4, a.z)));
  const threadCurve = new THREE.CatmullRomCurve3(threadPts, false, 'catmullrom', 0.4);
  const threadGeo = new THREE.TubeGeometry(threadCurve, 600, 0.045, 8, false);
  const thread = new THREE.Mesh(threadGeo, new THREE.MeshBasicMaterial({ color: '#F3B93A' }));
  scene.add(thread);
  const threadCount = threadGeo.index.count;
  const beadGeo = new THREE.SphereGeometry(0.16, 20, 12);
  const beads = anchors.map((a, i) => {
    const m = new THREE.Mesh(beadGeo, new THREE.MeshBasicMaterial({ color: '#F3B93A' }));
    m.position.copy(threadPts[i + 1]);
    scene.add(m);
    return m;
  });

  /* ── floating seals, the same shape as the Book Saúl badge ── */
  const sealShape = new THREE.Shape();
  for (let k = 0; k <= 32; k++) {
    const r = k % 2 ? 0.92 : 1, a = (k / 32) * Math.PI * 2;
    k ? sealShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sealShape.moveTo(r, 0);
  }
  const sealGeo = new THREE.ShapeGeometry(sealShape);
  const sealColors = ['#F3B93A', '#F04E23', '#DCEBA0'];
  const seals = [];
  const sealCount = isPhone() ? 9 : 16;
  for (let k = 0; k < sealCount; k++) {
    const m = new THREE.Mesh(sealGeo, new THREE.MeshBasicMaterial({ color: sealColors[k % 3], side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    const side = k % 2 ? 1 : -1;
    m.position.set(side * (8 + Math.random() * 7), (Math.random() - 0.5) * 9, 8 - Math.random() * (N * GAP + 10));
    const s = 0.5 + Math.random() * 1.1;
    m.scale.set(s, s, s);
    m.rotation.set(Math.random(), Math.random(), Math.random());
    m.userData.spin = (Math.random() - 0.5) * 0.6;
    scene.add(m);
    seals.push(m);
  }

  /* ── confetti dust ── */
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = dotCanvas.height = 64;
  const dctx = dotCanvas.getContext('2d');
  dctx.beginPath(); dctx.arc(32, 32, 28, 0, Math.PI * 2); dctx.fillStyle = '#fff'; dctx.fill();
  const dotTex = new THREE.CanvasTexture(dotCanvas);
  const DOTS = isPhone() ? 260 : 700;
  const pos = new Float32Array(DOTS * 3), col = new Float32Array(DOTS * 3);
  const dotColors = ['#F3B93A', '#F04E23', '#DCEBA0', '#FCF0EC'].map(c => new THREE.Color(c));
  for (let k = 0; k < DOTS; k++) {
    pos[k * 3] = (Math.random() - 0.5) * 34;
    pos[k * 3 + 1] = (Math.random() - 0.5) * 18;
    pos[k * 3 + 2] = 14 - Math.random() * (N * GAP + 24);
    const c = dotColors[k % 4];
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dotGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ size: 0.12, map: dotTex, vertexColors: true, transparent: true, alphaTest: 0.3, opacity: 0.85 }));
  scene.add(dots);

  /* ── layout: plane sizes and the camera path depend on screen shape ── */
  let posCurve, lookCurve;
  function layout() {
    const w = canvas.clientWidth || stage.clientWidth, h = canvas.clientHeight || stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = isPhone() ? 52 : 42;
    camera.updateProjectionMatrix();
    const phone = isPhone();
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    const camPts = [], lookPts = [];
    photos.forEach((p, i) => {
      const maxA = phone ? 1.0 : 1.5, minA = phone ? 0.68 : 0.72;
      const planeA = THREE.MathUtils.clamp(p.aspect, minA, maxA);
      const pw = H * planeA;
      p.w = pw;
      p.mesh.scale.set(pw, H, 1);
      p.mat.uniforms.uSize.value.set(pw, H);
      // cover-crop the texture into the plane
      const cover = p.mat.uniforms.uCover.value;
      if (p.aspect > planeA) cover.set(planeA / p.aspect, 1); else cover.set(1, p.aspect / planeA);
      const shift = p.mat.uniforms.uShift.value;
      shift.set(0, 0);
      if (p.still) { cover.multiplyScalar(0.82); shift.set(0, 0.08); } // video stills: crop the channel logo off the bottom
      else if (p.aspect < planeA) shift.set(0, (1 - cover.y) * 0.32); // portraits: keep faces in frame

      const a = anchors[i];
      // where the photo sits on screen: right of the card on desktop, above it on phones
      const sx = phone ? 0 : -(Math.min(2.6, pw * 0.36));
      const sy = phone ? -1.25 : 0.45;
      const dH = H / ((phone ? 0.42 : 0.56) * 2 * tanH);
      const dW = (pw / 2 + Math.abs(sx)) / ((phone ? 0.9 : 0.74) * tanH * camera.aspect);
      const d = Math.max(dH, dW);
      camPts.push(new THREE.Vector3(a.x + sx, a.y + sy, a.z + d));
      lookPts.push(new THREE.Vector3(a.x + sx * 1.0, a.y + sy, a.z));

      const lab = labels[i], lh = phone ? 1.15 : 1.45, lw = lh * lab.ratio;
      lab.mesh.scale.set(lw, lh, 1);
      lab.mesh.position.set(a.x - pw / 2 + lw / 2 - 0.05, a.y + H / 2 + lh * 0.58, a.z - 0.4);
      lab.mesh.rotation.copy(p.mesh.rotation);
    });
    // an opening shot, pulled back and above the first stop
    const intro = camPts[0].clone().add(new THREE.Vector3(0, 2.4, 16));
    const introLook = lookPts[0].clone().add(new THREE.Vector3(0, 0.6, 0));
    posCurve = new THREE.CatmullRomCurve3([intro].concat(camPts), false, 'catmullrom', 0.35);
    lookCurve = new THREE.CatmullRomCurve3([introLook].concat(lookPts), false, 'catmullrom', 0.35);
  }
  layout();
  new ResizeObserver(() => layout()).observe(canvas);

  /* ── scroll → progress ── */
  function progress() {
    const r = section.getBoundingClientRect();
    const run = section.offsetHeight - stage.clientHeight;
    return THREE.MathUtils.clamp(-r.top / run, 0, 1);
  }
  const SEGS = N + 0.35; // a little extra so the last stop gets a pause
  function scrollToStop(i) {
    const top = section.getBoundingClientRect().top + scrollY;
    const run = section.offsetHeight - stage.clientHeight;
    const y = top + run * ((i + 1) / SEGS);
    if (window.__lenis) window.__lenis.scrollTo(y); else scrollTo({ top: y, behavior: 'smooth' });
  }
  // hold at each photo, then glide to the next
  function dwell(seg) {
    const i = Math.floor(seg), f = seg - i;
    const t = THREE.MathUtils.clamp((f - 0.22) / 0.62, 0, 1);
    return i + t * t * (3 - 2 * t);
  }

  const pointer = new THREE.Vector2();
  addEventListener('pointermove', e => { pointer.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); }, { passive: true });

  let seg = 0, active = -2, visible = false, last = performance.now();
  const tmpColor = new THREE.Color();
  const look = new THREE.Vector3();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    requestAnimationFrame(frame);

    const p = progress();
    section.classList.toggle('has-scrolled', p > 0.01);
    const target = Math.min(N, p * SEGS);
    const prev = seg;
    seg += (target - seg) * (1 - Math.exp(-dt * 5));
    const vel = (seg - prev) / Math.max(dt, 1e-3);
    const u = dwell(seg) / N;

    camera.position.copy(posCurve.getPoint(u));
    look.copy(lookCurve.getPoint(u));
    if (!isPhone()) { camera.position.x += pointer.x * 0.7; camera.position.y -= pointer.y * 0.45; }
    camera.lookAt(look);
    camera.rotation.z += THREE.MathUtils.clamp(-vel * 0.03, -0.06, 0.06);

    // background mood
    const m = THREE.MathUtils.clamp(dwell(seg) - 1, 0, N - 1);
    const mi = Math.floor(m), mf = m - mi;
    tmpColor.copy(moods[mi % moods.length]).lerp(moods[Math.min(mi + 1, N - 1) % moods.length], mf);
    bg.copy(tmpColor); scene.fog.color.copy(tmpColor);

    // which card is up
    const now_ = seg < 0.55 ? -1 : THREE.MathUtils.clamp(Math.round(seg) - 1, 0, N - 1);
    if (now_ !== active) {
      active = now_;
      stops.forEach((s, k) => s.classList.toggle('is-active', k === active));
      yearItems.forEach((li, k) => li.classList.toggle('is-active', k === active));
    }

    photos.forEach((ph, i) => {
      const dz = camera.position.z - anchors[i].z;
      const near = THREE.MathUtils.smoothstep(dz, 1.5, 5.5);
      const far = 1 - THREE.MathUtils.smoothstep(dz, GAP * 1.4, GAP * 2.6);
      const op = near * far;
      ph.mat.uniforms.uOpacity.value = op;
      ph.mat.uniforms.uReady.value += (ph.ready - ph.mat.uniforms.uReady.value) * 0.08;
      ph.mat.uniforms.uBend.value = THREE.MathUtils.clamp(vel * 0.35, -0.9, 0.9);
      const z = i === active ? 1.06 : 1.0;
      ph.mat.uniforms.uZoom.value += (z - ph.mat.uniforms.uZoom.value) * 0.05;
      labels[i].mat.opacity = op * 0.95;
      const b = beads[i];
      const s = i === active ? 1.9 : 1;
      b.scale.setScalar(b.scale.x + (s - b.scale.x) * 0.1);
      b.material.color.set(i === active ? '#F04E23' : '#F3B93A');
      // live scenes only render while they can be seen
      if (ph.diorama && op > 0.01) {
        ph.diorama.update(now / 1000, pointer);
        renderer.setRenderTarget(ph.diorama.rt);
        renderer.render(ph.diorama.scene, ph.diorama.camera);
        renderer.setRenderTarget(null);
      }
    });

    // thread stitches itself as you go
    const reach = THREE.MathUtils.clamp((dwell(seg) + 0.35) / N, 0.02, 1);
    threadGeo.setDrawRange(0, Math.floor(threadCount * reach / 3) * 3);

    seals.forEach(s => { s.rotation.z += s.userData.spin * dt; s.rotation.y += s.userData.spin * 0.4 * dt; });
    dots.rotation.z += dt * 0.015;

    renderer.render(scene, camera);
  }

  new IntersectionObserver(es => {
    const was = visible;
    visible = es[0].isIntersecting;
    if (visible && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }, { rootMargin: '200px 0px' }).observe(section);

  dispatchEvent(new Event('journey:ready'));
}

/* ───────────────────────── rendered scenes ─────────────────────────
   Two small worlds for the years with no photographs of him. */

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function skyPlane(top, bottom, w = 80, h = 50, z = -30) {
  const tex = canvasTexture(8, 256, (g, W, Hh) => {
    const gr = g.createLinearGradient(0, 0, 0, Hh);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, depthWrite: false }));
  m.position.set(0, h * 0.3, z);
  return m;
}
function ridge(color, z, base, amp, seed, width = 60) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, base - 20);
  const n = 34;
  for (let k = 0; k <= n; k++) {
    const x = -width / 2 + (width * k) / n;
    const y = base + Math.sin(k * 0.9 + seed) * amp * 0.5 + Math.sin(k * 0.37 + seed * 2) * amp + Math.sin(k * 2.3 + seed) * amp * 0.18;
    s.lineTo(x, y);
  }
  s.lineTo(width / 2, base - 20);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color }));
  m.position.z = z;
  return m;
}
function disc(color, r, x, y, z) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

const DIORAMAS = {
  /* Atotonilco el Grande at dawn: mountains, adobe houses, the family fonda,
     papel picado over the street and marigolds in the foreground. */
  hidalgo() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 0.8, 0.1, 100);
    scene.add(skyPlane('#F6B75A', '#F7A08A'));
    scene.add(disc('#FFF0C8', 2.2, 2.6, 6.6, -26));
    scene.add(ridge('#C9786E', -20, 3.2, 1.6, 1.2));
    scene.add(ridge('#9A4F63', -14, 1.8, 1.3, 3.1));
    scene.add(ridge('#3F6F4C', -9, 0.6, 0.8, 5.4));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ color: '#D99A63' }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.6, -2);
    scene.add(ground);

    const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
    scene.add(new THREE.HemisphereLight('#FFF4DC', '#A8604A', 1.6));
    const sun = new THREE.DirectionalLight('#FFE2B0', 1.6);
    sun.position.set(4, 6, 6); scene.add(sun);

    // a row of adobe houses
    const colors = ['#F3B93A', '#E9A6C1', '#5AB0C9', '#DCEBA0', '#F04E23', '#FCF0EC', '#8FC7A0'];
    let x = -6.4;
    for (let k = 0; k < 8; k++) {
      const w = 1.3 + ((k * 37) % 7) / 6, hgt = 1.4 + ((k * 53) % 5) / 4;
      const house = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 1.4), lam(colors[k % colors.length]));
      house.position.set(x + w / 2, -0.6 + hgt / 2, -4.2 - (k % 2) * 0.5);
      scene.add(house);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.12, 1.6), lam('#7A3B2E'));
      roof.position.set(house.position.x, -0.6 + hgt + 0.06, house.position.z);
      scene.add(roof);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.7), new THREE.MeshBasicMaterial({ color: '#4A2A22' }));
      door.position.set(house.position.x - w * 0.18, -0.25, house.position.z + 0.71);
      scene.add(door);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: '#FFE6A8' }));
      win.position.set(house.position.x + w * 0.22, -0.6 + hgt * 0.62, house.position.z + 0.71);
      scene.add(win);
      x += w + 0.08;
    }
    // church dome on the hill
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.9), lam('#FCE3C4'));
    tower.position.set(4.6, 1.0, -7.5); scene.add(tower);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam('#F3B93A'));
    dome.position.set(4.6, 2.3, -7.5); scene.add(dome);

    // the fonda, front and centre
    const fonda = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 1.6), lam('#F04E23'));
    fonda.position.set(-0.4, 0.5, -1.6); scene.add(fonda);
    const awnTex = canvasTexture(256, 32, (g, W, Hh) => {
      for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#FCF0EC' : '#10382B'; g.fillRect(k * 16, 0, 16, Hh); }
    });
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.7), new THREE.MeshLambertMaterial({ map: awnTex, side: THREE.DoubleSide }));
    awning.position.set(-0.4, 1.0, -0.55); awning.rotation.x = -0.9; scene.add(awning);
    const signTex = canvasTexture(512, 128, (g, W, Hh) => {
      g.fillStyle = '#FCF0EC'; g.fillRect(0, 0, W, Hh);
      g.fillStyle = '#10382B'; g.font = '800 92px "Bricolage Grotesque", system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Fonda', W / 2, Hh / 2 + 6);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(-0.4, 1.36, -0.79); scene.add(sign);
    const doorF = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshBasicMaterial({ color: '#3B1E14' }));
    doorF.position.set(-0.4, -0.1, -0.79); scene.add(doorF);
    // clay pots on the counter
    for (let k = 0; k < 3; k++) {
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), lam('#B5552E'));
      pot.scale.y = 0.8; pot.position.set(-1.65 + k * 0.42, -0.44, -0.55); scene.add(pot);
    }

    // papel picado strings that sway
    const flags = [];
    const flagTex = canvasTexture(64, 80, (g, W, Hh) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh - 14);
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(k * 13, Hh - 14); g.lineTo(k * 13 + 6.5, Hh); g.lineTo(k * 13 + 13, Hh - 14); g.fill(); }
      g.globalCompositeOperation = 'destination-out';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { g.beginPath(); g.arc(14 + c * 18, 14 + r * 18, 4.5, 0, 7); g.fill(); }
    });
    const flagColors = ['#F04E23', '#F3B93A', '#DCEBA0', '#E9A6C1', '#5AB0C9', '#FCF0EC'];
    [[4.6, -0.6], [4.1, 1.2]].forEach(([y, z], row) => {
      for (let k = 0; k < 11; k++) {
        const fx = -5 + k * 1.0 + row * 0.5;
        const sag = Math.pow((fx) / 5, 2) * 0.45;
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.54),
          new THREE.MeshBasicMaterial({ map: flagTex, color: flagColors[(k + row * 2) % flagColors.length], transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
        f.geometry.translate(0, -0.31, 0);
        f.position.set(fx, y + sag - 0.5, z);
        f.userData.phase = k * 0.6 + row;
        scene.add(f); flags.push(f);
      }
    });
    // marigolds in the foreground
    const mari = new THREE.SphereGeometry(0.16, 12, 8);
    for (let k = 0; k < 46; k++) {
      const m = new THREE.Mesh(mari, lam(k % 3 ? '#F28C28' : '#F6B420'));
      m.position.set(-4 + ((k * 73) % 80) / 10, -0.5 + ((k * 31) % 10) / 40, 1.6 + ((k * 17) % 20) / 10);
      scene.add(m);
    }
    camera.position.set(0, 1.4, 11.5);
    return {
      scene, camera,
      update(t, p) {
        camera.position.x = Math.sin(t * 0.25) * 0.6 + p.x * 0.8;
        camera.position.y = 1.4 + Math.sin(t * 0.18) * 0.15 - p.y * 0.4;
        camera.lookAt(0, 1.7, -3);
        flags.forEach(f => { f.rotation.x = Math.sin(t * 2.2 + f.userData.phase) * 0.35; });
      }
    };
  },

  /* New York at night, the year he arrived: a lit skyline, a stack of dishes
     waiting to be washed, and the twenty dollars he crossed with. */
  newyork() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 0.8, 0.1, 120);
    scene.add(skyPlane('#06102A', '#3B2A6E', 90, 60, -40));
    scene.add(disc('#FCF0EC', 1.3, -4, 9.5, -36));
    // stars
    const sp = new Float32Array(240 * 3);
    for (let k = 0; k < 240; k++) { sp[k * 3] = (Math.random() - 0.5) * 70; sp[k * 3 + 1] = 4 + Math.random() * 22; sp[k * 3 + 2] = -34; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FCF0EC', size: 0.09, transparent: true, opacity: 0.8 }));
    scene.add(stars);

    const winTex = canvasTexture(128, 256, (g, W, Hh) => {
      g.fillStyle = '#121A33'; g.fillRect(0, 0, W, Hh);
      for (let r = 0; r < 32; r++) for (let c = 0; c < 8; c++) {
        const lit = Math.random() < 0.38;
        g.fillStyle = lit ? (Math.random() < 0.8 ? '#FFD27A' : '#FFF3D6') : '#1E2850';
        g.fillRect(c * 16 + 4, r * 8 + 2, 8, 4);
      }
    });
    winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
    const rows = [[-16, 0.55], [-11, 0.8], [-7, 1]];
    rows.forEach(([z, shade], ri) => {
      for (let k = 0; k < 15; k++) {
        const w = 1.1 + ((k * 29 + ri * 7) % 9) / 6, h = 1.6 + ((k * 47 + ri * 13) % 11) * (ri === 0 ? 0.75 : 0.45);
        const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(w / 2, h / 4); t.offset.set(Math.random(), Math.random());
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color().setScalar(shade) }));
        m.position.set(-12 + k * 1.75 + ri * 0.6, -1 + h / 2, z);
        scene.add(m);
      }
    });
    // a tall tower with a spire, lit from below
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), new THREE.MeshBasicMaterial({ map: winTex }));
    tower.position.set(1.4, 5, -13); scene.add(tower);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2, 1.0), new THREE.MeshBasicMaterial({ color: '#F3B93A' }));
    top.position.set(1.4, 12, -13); scene.add(top);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 3, 12), new THREE.MeshBasicMaterial({ color: '#FCF0EC' }));
    spire.position.set(1.4, 14.5, -13); scene.add(spire);

    scene.add(new THREE.HemisphereLight('#9FB4FF', '#2A1E3A', 1.4));
    const key = new THREE.DirectionalLight('#FFD9A0', 1.4); key.position.set(3, 4, 6); scene.add(key);
    // the dish pit: a stack of plates
    const plateGeo = new THREE.CylinderGeometry(0.9, 0.7, 0.1, 40);
    const plateMat = new THREE.MeshLambertMaterial({ color: '#F2F0EA' });
    const plates = new THREE.Group();
    for (let k = 0; k < 14; k++) {
      const pl = new THREE.Mesh(plateGeo, plateMat);
      pl.position.set(Math.sin(k * 1.7) * 0.05, k * 0.12, Math.cos(k * 1.3) * 0.05);
      plates.add(pl);
    }
    plates.position.set(-1.9, -1.2, 2.2); plates.rotation.z = 0.04; scene.add(plates);
    // soap bubbles drifting up
    const bubbleMat = new THREE.MeshLambertMaterial({ color: '#DDF3FF', transparent: true, opacity: 0.55 });
    const bubbles = [];
    for (let k = 0; k < 14; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08 + (k % 4) * 0.04, 16, 10), bubbleMat);
      b.userData = { x: -2.6 + (k % 5) * 0.35, seed: k * 0.73 };
      scene.add(b); bubbles.push(b);
    }
    // the twenty dollar bill
    const billTex = canvasTexture(512, 220, (g, W, Hh) => {
      g.fillStyle = '#C9DBB0'; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#3F6A45'; g.lineWidth = 10; g.strokeRect(12, 12, W - 24, Hh - 24);
      g.fillStyle = '#3F6A45'; g.font = '800 110px "Bricolage Grotesque", system-ui, sans-serif';
      g.textBaseline = 'middle'; g.fillText('20', 34, Hh / 2 + 6);
      g.textAlign = 'right'; g.fillText('20', W - 34, Hh / 2 + 6);
      g.beginPath(); g.ellipse(W / 2, Hh / 2, 54, 70, 0, 0, 7); g.fillStyle = '#A9C48C'; g.fill(); g.stroke();
    });
    const bill = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.82), new THREE.MeshLambertMaterial({ map: billTex, side: THREE.DoubleSide }));
    bill.position.set(1.7, 1.2, 2.6); scene.add(bill);
    // a yellow cab at the curb
    const cab = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1), new THREE.MeshLambertMaterial({ color: '#F3B93A' }));
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.9), new THREE.MeshLambertMaterial({ color: '#F3B93A' }));
    cabin.position.set(-0.1, 0.48, 0);
    const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: '#1A1A1A' });
    [[-0.7, 0.5], [0.7, 0.5], [-0.7, -0.5], [0.7, -0.5]].forEach(([wx, wz]) => {
      const wh = new THREE.Mesh(wheelGeo, wheelMat); wh.rotation.x = Math.PI / 2; wh.position.set(wx, -0.3, wz); cab.add(wh);
    });
    cab.add(body, cabin);
    cab.position.set(1.6, -0.75, -1.5); cab.rotation.y = -0.35; scene.add(cab);
    const street = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshBasicMaterial({ color: '#141729' }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, -1.05, -2); scene.add(street);

    camera.position.set(0, 1.2, 12);
    return {
      scene, camera,
      update(t, p) {
        camera.position.x = Math.sin(t * 0.2) * 0.7 + p.x * 0.8;
        camera.position.y = 1.3 + Math.sin(t * 0.15) * 0.2 - p.y * 0.4;
        camera.lookAt(0, 3.1, -4);
        bill.rotation.y = Math.sin(t * 0.9) * 0.6; bill.rotation.z = Math.sin(t * 0.6) * 0.15;
        bill.position.y = 1.3 + Math.sin(t * 1.1) * 0.15;
        bubbles.forEach(b => {
          const life = (t * 0.35 + b.userData.seed) % 1;
          b.position.set(b.userData.x + Math.sin(t + b.userData.seed * 9) * 0.15, 0.6 + life * 3.2, 2.4);
          b.scale.setScalar(1 - life * 0.4);
        });
        stars.material.opacity = 0.65 + Math.sin(t * 3) * 0.15;
      }
    };
  }
};
