/**
 * Mundo decorado + aros + puntuación
 *
 * Optimizado para rendimiento:
 * - Árboles y nubes como billboards (sprites)
 * - Instancing de vegetación
 * - Sin sombras
 * - Fog para recortar detalle lejano
 */

let scene, camera, renderer, bird, poseTracker;
let trees = [];
let mountains = [];
let rings = [];
let treeSprites = [];
let cloudSprites = [];
let ringScore = 0;
let bestScore = 0;
let paused = false;

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 220);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 10, -12);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.pixelRatioMax || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = CONFIG.enableShadows || false;
  document.getElementById('c3d').appendChild(renderer.domElement);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff5e0, 0.9);
  sun.position.set(50, 80, 30);
  scene.add(sun);

  // Ground
  createGround();

  // Trees (billboards)
  createTreesBillboards();

  // Clouds (billboards)
  createCloudsBillboards();

  // Mountains (3D)
  createMountains();

  // Lakes
  createLakes();

  // Grass (instanced)
  createGrass();

  // Rings
  createRings();

  // Bird
  bird = new Bird3D(scene);

  // Pose
  poseTracker = new PoseTracker();

  // Load score
  bestScore = parseInt(localStorage.getItem('birdFlightBest') || '0', 10);
  updateScoreboard();

  // Events
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKey);

  // Start
  initPose();
  animate();
}

function createGround() {
  const size = CONFIG.worldSize || 320;
  const geo = new THREE.PlaneGeometry(size, size, 32, 32);
  const mat = new THREE.MeshLambertMaterial({ color: 0x4a7c23 });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  scene.add(ground);

  // Textura simple de pasto (canvas)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a7c23';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(${60 + Math.random()*40}, ${100 + Math.random()*40}, ${30 + Math.random()*20}, 0.6)`;
    ctx.fillRect(Math.random()*256, Math.random()*256, 2, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(size / 20, size / 20);
  ground.material.map = tex;
  ground.material.needsUpdate = true;
}

function makeTreeTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  // tronco oscuro
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(size * 0.42, size * 0.55, size * 0.16, size * 0.42);
  // follaje oscuro
  const greens = ['#06240a', '#0a3210', '#0d3d14', '#114a18'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = greens[i % greens.length];
    ctx.beginPath();
    const cy = size * (0.42 - i * 0.12);
    const r = size * (0.28 - i * 0.04);
    ctx.moveTo(size * 0.5, cy - r * 0.9);
    ctx.lineTo(size * 0.5 + r, cy + r * 0.55);
    ctx.lineTo(size * 0.5 - r, cy + r * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,25,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.58, size * 0.22, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

let sharedTreeTex = null;
let sharedTreeMat = null;

function createTreesBillboards() {
  if (!sharedTreeTex) sharedTreeTex = makeTreeTexture();
  if (!sharedTreeMat) {
    sharedTreeMat = new THREE.SpriteMaterial({
      map: sharedTreeTex,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.2,
      opacity: 1,
    });
  }
  const count = 40;
  const size = CONFIG.worldSize || 320;
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * size * 0.8;
    const z = (Math.random() - 0.5) * size * 0.8;
    const h = 6 + Math.random() * 4;
    const sprite = new THREE.Sprite(sharedTreeMat);
    sprite.scale.set(h * 0.8, h, 1);
    sprite.position.set(x, h * 0.45, z);
    sprite.frustumCulled = true;
    scene.add(sprite);
    treeSprites.push(sprite);
    trees.push({ x, z, height: h, radius: 1.2 });
  }
}

function makeCloudTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const blobs = [
    [0.35, 0.55, 0.28], [0.55, 0.5, 0.32], [0.7, 0.55, 0.24],
    [0.45, 0.4, 0.22], [0.6, 0.42, 0.2],
  ];
  blobs.forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(size * x, size * y, 0, size * x, size * y, size * r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(size * x, size * y, size * r, 0, Math.PI * 2);
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

let sharedCloudTex = null;
let sharedCloudMat = null;

function createCloudsBillboards() {
  if (!sharedCloudTex) sharedCloudTex = makeCloudTexture();
  if (!sharedCloudMat) {
    sharedCloudMat = new THREE.SpriteMaterial({
      map: sharedCloudTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
  }
  const count = 15;
  const size = CONFIG.worldSize || 320;
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * size * 0.9;
    const z = (Math.random() - 0.5) * size * 0.9;
    const y = 25 + Math.random() * 20;
    const s = 12 + Math.random() * 8;
    const sprite = new THREE.Sprite(sharedCloudMat);
    sprite.scale.set(s, s * 0.6, 1);
    sprite.position.set(x, y, z);
    scene.add(sprite);
    cloudSprites.push(sprite);
  }
}

function createMountains() {
  const positions = [
    [120, -100, 48], [-130, -80, 42], [100, 130, 55],
    [-110, 120, 38], [0, -150, 50]
  ];
  positions.forEach(([x, z, size]) => createMountain(x, z, size));
}

function createMountain(x, z, size = 40) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x6b7b5e });
  const snow = new THREE.MeshLambertMaterial({ color: 0xeceff1 });
  const peak = new THREE.Mesh(new THREE.ConeGeometry(size * 0.55, size, 5), mat);
  peak.position.y = size * 0.45;
  group.add(peak);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(size * 0.22, size * 0.28, 5), snow);
  cap.position.y = size * 0.85;
  group.add(cap);
  for (let i = 0; i < 2; i++) {
    const s = size * (0.45 + Math.random() * 0.25);
    const side = new THREE.Mesh(new THREE.ConeGeometry(s * 0.5, s, 5), mat);
    side.position.set((i === 0 ? -1 : 1) * size * 0.4, s * 0.4, size * 0.15);
    group.add(side);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  mountains.push({ x, z, radius: size * 0.55, height: size * 0.95 });
}

function createLakes() {
  const lakes = [[40, 60, 18], [-70, -40, 14], [80, -90, 12]];
  lakes.forEach(([x, z, r]) => {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(r, 16),
      new THREE.MeshLambertMaterial({ color: 0x4a9fd4, transparent: true, opacity: 0.85 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.15, z);
    scene.add(water);
    const shore = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.92, r * 1.08, 16),
      new THREE.MeshLambertMaterial({ color: 0xc2b280 })
    );
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(x, 0.12, z);
    scene.add(shore);
  });
}

function createGrass() {
  const count = 60;
  const size = CONFIG.worldSize || 320;
  const bladeGeo = new THREE.PlaneGeometry(0.3, 1.2);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(bladeGeo, mat, count * 5);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let idx = 0;
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * size * 0.85;
    const z = (Math.random() - 0.5) * size * 0.85;
    col.setHSL(0.28, 0.5, 0.25 + Math.random() * 0.15);
    for (let b = 0; b < 5; b++) {
      dummy.position.set(x + (Math.random()-0.5)*1.5, 0.6, z + (Math.random()-0.5)*1.5);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.set(0.8 + Math.random()*0.4, 0.7 + Math.random()*0.6, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.setColorAt(idx, col);
      idx++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
}

function createRings() {
  for (let i = 0; i < CONFIG.ringCount; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(CONFIG.ringRadius, CONFIG.ringTube, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd54f })
    );
    const x = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 200;
    const y = 8 + Math.random() * 20;
    ring.position.set(x, y, z);
    ring.rotation.x = Math.random() * 0.5;
    scene.add(ring);
    rings.push({ mesh: ring, active: true });
  }
}

function updateBillboards() {
  if (!bird) return;
  const cx = bird.position.x;
  const cy = bird.position.y;
  const cz = bird.position.z;
  const maxD2 = (CONFIG.billboardMaxDist || 140) ** 2;
  for (const s of treeSprites) {
    const dx = s.position.x - cx;
    const dy = s.position.y - cy;
    const dz = s.position.z - cz;
    s.visible = (dx*dx + dy*dy + dz*dz) < maxD2;
  }
  const maxC2 = maxD2 * 1.4;
  for (const s of cloudSprites) {
    const dx = s.position.x - cx;
    const dy = s.position.y - cy;
    const dz = s.position.z - cz;
    s.visible = (dx*dx + dy*dy + dz*dz) < maxC2;
  }
}

function updateRings() {
  if (!bird) return;
  for (const r of rings) {
    if (!r.active) continue;
    const dx = bird.position.x - r.mesh.position.x;
    const dy = bird.position.y - r.mesh.position.y;
    const dz = bird.position.z - r.mesh.position.z;
    if (Math.hypot(dx, dy, dz) < CONFIG.ringRadius * 1.2) {
      r.active = false;
      r.mesh.visible = false;
      ringScore++;
      updateScoreboard();
      // Respawn
      setTimeout(() => {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        const y = 8 + Math.random() * 20;
        r.mesh.position.set(x, y, z);
        r.mesh.visible = true;
        r.active = true;
      }, 2000);
    }
  }
}

function updateScoreboard() {
  document.getElementById('ringScore').textContent = ringScore;
  document.getElementById('bestScore').textContent = bestScore;
}

function onGroundTouch() {
  if (ringScore > bestScore) {
    bestScore = ringScore;
    localStorage.setItem('birdFlightBest', bestScore);
  }
  ringScore = 0;
  updateScoreboard();
}

async function initPose() {
  const video = document.getElementById('video');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    await video.play();
    await poseTracker.init(video);
    document.getElementById('status').textContent = 'Cámara lista';
  } catch (e) {
    document.getElementById('status').textContent = 'Error de cámara: ' + e.message;
    console.error(e);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKey(e) {
  if (e.code === 'Space') {
    paused = !paused;
    document.getElementById('pauseOverlay').classList.toggle('visible', paused);
  }
}

let lastPoseTime = 0;
function animate() {
  requestAnimationFrame(animate);
  if (paused) return;

  const now = performance.now();
  if (now - lastPoseTime > (CONFIG.poseIntervalMs || 33)) {
    lastPoseTime = now;
    if (poseTracker && poseTracker.ready) {
      poseTracker.update();
    }
  }

  if (bird && poseTracker) {
    const action = poseTracker.currentAction;
    const lean = poseTracker.getLeanFactor();
    const flap = poseTracker.getFlapIntensity();
    bird.update(action, lean, flap);
    bird.checkCollisions(trees, mountains);

    // Cámara 3ra persona
    const dist = CONFIG.cameraDistance || 12;
    const height = CONFIG.cameraHeight || 3.5;
    const look = CONFIG.cameraLookAhead || 2.8;
    const tx = bird.position.x - Math.sin(bird.yaw) * dist;
    const tz = bird.position.z - Math.cos(bird.yaw) * dist;
    const ty = bird.position.y + height;
    camera.position.lerp(new THREE.Vector3(tx, ty, tz), CONFIG.cameraLerp || 0.055);
    const lx = bird.position.x + Math.sin(bird.yaw) * look;
    const lz = bird.position.z + Math.cos(bird.yaw) * look;
    camera.lookAt(lx, bird.position.y + 1, lz);

    // Suelo
    if (bird.onGround && bird.state === 'GROUNDED') {
      onGroundTouch();
    }

    updateRings();
    updateBillboards();

    // UI
    document.getElementById('action').textContent = 'ACCIÓN: ' + action;
    const dbg = poseTracker.getDebug();
    document.getElementById('debug').textContent =
      `lean: ${dbg.leanFactor || 0} | flap: ${dbg.flapInt || 0} | grace: ${dbg.grace || 0}`;
  }

  renderer.render(scene, camera);
}

init();
