/**
 * Mundo decorado + aros + puntuación
 *
 * Optimizado para Raspberry Pi 4 a 60fps mínimo, sin reducir la cantidad
 * de entidades del entorno:
 *  - Vegetación/decoración con InstancedMesh (mismas cantidades, muchos
 *    menos draw calls) conservando la variación de color por instancia.
 *  - MeshLambertMaterial en vez de MeshStandardMaterial para el decorado
 *    estático (mucho más barato por fragmento; el brillo PBR no se nota
 *    en pasto/rocas/follaje a la distancia de cámara del juego).
 *  - Objetos estáticos "congelados" (matrixAutoUpdate = false).
 *  - Sin sombras.
 *  - Árboles y nubes como billboards (PNG procedural) de frente al jugador.
 *  - Solo se dibujan billboards en FOV / distancia (frustum + maxDist).
 *  - Loop de detección de pose totalmente desacoplado del loop de
 *    render: antes, el `await poseTracker.update()` dentro de animate()
 *    frenaba el frame de render cada N frames. Ahora corre en su propio
 *    timer y el render loop solo lee el último valor calculado.
 */

let poseTracker;
let bird;
let scene, camera, renderer;
let statusEl, actionEl, debugEl;
let ringScoreEl, lastScoreEl, bestScoreEl, ringScoreTopEl, bestScoreTopEl;
let trees = [];
let treeSprites = [];
let cloudSprites = [];
let rings = [];
let hills = [];
let mountains = [];
let sharedGrassTex = null;
let sharedHillTex = null;

let ringScore = 0;
let lastScore = 0;
let bestScore = Number(localStorage.getItem('birdFlightBest') || 0);
let wasOnGround = false;
let gamePaused = false;
let lastHeadGrabToggle = 0;
let fistCount = 0;
let fistWindowStart = 0;
let lastFistTime = 0;
let pauseOverlayEl = null;

// Última acción calculada por el loop de pose (desacoplado del render).
let currentAction = 'NONE';
let currentLean = 0;
let currentFlapInt = 0;

// Marca como estático un objeto (y sus hijos) para que three.js deje de
// recalcular su matriz local en cada frame. Solo usar en objetos que
// nunca cambian de posición/rotación/escala tras crearse.
function freezeStatic(obj) {
  obj.updateMatrix();
  obj.matrixAutoUpdate = false;
  obj.traverse((child) => {
    child.updateMatrix();
    child.matrixAutoUpdate = false;
  });
}

function createGrassTexture(repeatX = 40, repeatY = 40) {
  if (!sharedGrassTex) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#4a7c3a';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shade = 40 + Math.random() * 50;
      ctx.fillStyle = `rgb(${Math.floor(shade * 0.55)}, ${Math.floor(90 + Math.random() * 70)}, ${Math.floor(shade * 0.4)})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = `rgba(30, 80, 25, ${0.15 + Math.random() * 0.25})`;
      ctx.beginPath();
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 6, y - 4 - Math.random() * 8);
      ctx.stroke();
    }

    sharedGrassTex = new THREE.CanvasTexture(canvas);
    sharedGrassTex.wrapS = sharedGrassTex.wrapT = THREE.RepeatWrapping;
    sharedGrassTex.anisotropy = 4;
  }
  const tex = sharedGrassTex.clone();
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

// Antes: cada una de las 12 colinas clonaba y subía su propia textura a la
// GPU (mismo repeat en todas). Ahora se clona una sola vez y se comparte.
function getHillTexture() {
  if (!sharedHillTex) {
    sharedHillTex = createGrassTexture(6, 6);
  }
  return sharedHillTex;
}

// ---------------------------------------------------------------------
// Texturas procedurales tipo PNG (canvas) para billboards
// ---------------------------------------------------------------------
function makeTreeTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  // tronco (un poco más oscuro)
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(size * 0.42, size * 0.55, size * 0.16, size * 0.42);
  // follaje bastante más oscuro
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
  // sombra suave inferior del follaje
  ctx.fillStyle = 'rgba(0,25,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.58, size * 0.22, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
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

let sharedTreeTex = null;
let sharedCloudTex = null;

function getTreeTexture() {
  if (!sharedTreeTex) sharedTreeTex = makeTreeTexture();
  return sharedTreeTex;
}

function getCloudTexture() {
  if (!sharedCloudTex) sharedCloudTex = makeCloudTexture();
  return sharedCloudTex;
}

// ---------------------------------------------------------------------
// Árboles como billboard (Sprite / PNG procedural): siempre de frente
// al jugador. frustumCulled + distancia máxima para no dibujar fuera
// del campo de visión / lejos.
// ---------------------------------------------------------------------
function createTreesBillboards(positions) {
  const tex = getTreeTexture();
  // Un solo material compartido (más barato)
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.2,
    opacity: 1,
  });
  positions.forEach((p) => {
    const sprite = new THREE.Sprite(mat);
    const h = (3.2 * p.scale) + (4 * p.scale);
    const w = 2.8 * p.scale;
    sprite.scale.set(w, h, 1);
    sprite.position.set(p.x, h * 0.45, p.z);
    sprite.frustumCulled = true;
    scene.add(sprite);
    treeSprites.push(sprite);
    trees.push({
      x: p.x,
      z: p.z,
      radius: 1.1 * p.scale,
      height: h,
      yBase: 0,
    });
  });
}

let sharedCloudMat = null;
function createCloudBillboard(x, y, z, scale = 1) {
  if (!sharedCloudMat) {
    sharedCloudMat = new THREE.SpriteMaterial({
      map: getCloudTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    });
  }
  const sprite = new THREE.Sprite(sharedCloudMat);
  const w = 6 * scale;
  const h = 3.2 * scale;
  sprite.scale.set(w, h, 1);
  sprite.position.set(x, y, z);
  sprite.frustumCulled = true;
  scene.add(sprite);
  cloudSprites.push(sprite);
}

// Actualiza visibilidad por distancia (además del frustum de Three.js).
// THREE.Sprite ya mira siempre a la cámara.
function updateBillboards() {
  if (!camera || !bird) return;
  const maxD = CONFIG.billboardMaxDist || 140;
  const maxD2 = maxD * maxD;
  const cx = camera.position.x;
  const cy = camera.position.y;
  const cz = camera.position.z;
  for (let i = 0; i < treeSprites.length; i++) {
    const s = treeSprites[i];
    const dx = s.position.x - cx;
    const dy = s.position.y - cy;
    const dz = s.position.z - cz;
    s.visible = (dx * dx + dy * dy + dz * dz) < maxD2;
  }
  for (let i = 0; i < cloudSprites.length; i++) {
    const s = cloudSprites[i];
    const dx = s.position.x - cx;
    const dy = s.position.y - cy;
    const dz = s.position.z - cz;
    s.visible = (dx * dx + dy * dy + dz * dz) < maxD2 * 1.4;
  }
}

function createHill(x, z, radius, height) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(radius, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const mat = new THREE.MeshLambertMaterial({
    color: new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.45, 0.32 + Math.random() * 0.08),
    map: getHillTexture(),
  });
  const hill = new THREE.Mesh(geo, mat);
  hill.scale.y = height / radius;
  hill.receiveShadow = false;
  group.add(hill);

  // Pequeñas rocas en la ladera
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = radius * (0.35 + Math.random() * 0.5);
    const rx = Math.cos(a) * d;
    const rz = Math.sin(a) * d;
    const t = d / radius;
    const sy = height * Math.sqrt(Math.max(0, 1 - t * t));
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.4, 0), rockMat);
    rock.position.set(rx, sy + 0.15, rz);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(rock);
  }

  group.position.set(x, 0, z);
  scene.add(group);
  freezeStatic(group);
  hills.push({ x, z, radius, height });
}

// ---------------------------------------------------------------------
// Arbustos instanciados: 1 InstancedMesh en vez de 25 grupos x 4 esferas.
// Conserva el tinte por arbusto con instanceColor.
// ---------------------------------------------------------------------
function createBushesInstanced(count, groundSize) {
  const geo = new THREE.SphereGeometry(1, 6, 4);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, count * 4);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let idx = 0;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * groundSize * 0.8;
    const z = (Math.random() - 0.5) * groundSize * 0.8;
    if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
    col.setHSL(0.3, 0.5, 0.22 + Math.random() * 0.12);
    for (let j = 0; j < 4; j++) {
      const s = 0.5 + Math.random() * 0.6;
      dummy.position.set(
        x + (Math.random() - 0.5) * 0.8,
        s * 0.6,
        z + (Math.random() - 0.5) * 0.8
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.setColorAt(idx, col);
      idx++;
    }
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
}

// ---------------------------------------------------------------------
// Flores instanciadas: 2 InstancedMesh (tallos + cabezas) en vez de
// 40 grupos x 2 meshes con material propio cada uno.
// ---------------------------------------------------------------------
function createFlowersInstanced(count, groundSize) {
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 3);
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  const stemMesh = new THREE.InstancedMesh(stemGeo, stemMat, count);

  const headGeo = new THREE.SphereGeometry(0.12, 5, 4);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, count);

  const colors = [0xe91e63, 0xffeb3b, 0xffffff, 0xff9800, 0x9c27b0, 0xf44336];
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * groundSize * 0.75;
    const z = (Math.random() - 0.5) * groundSize * 0.75;

    dummy.position.set(x, 0.18, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    stemMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, 0.38, z);
    dummy.updateMatrix();
    headMesh.setMatrixAt(i, dummy.matrix);
    col.setHex(colors[(Math.random() * colors.length) | 0]);
    headMesh.setColorAt(i, col);
  }

  stemMesh.instanceMatrix.needsUpdate = true;
  headMesh.instanceMatrix.needsUpdate = true;
  if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;
  stemMesh.matrixAutoUpdate = false;
  headMesh.matrixAutoUpdate = false;
  scene.add(stemMesh, headMesh);
}

function createBoundary() {
  const half = CONFIG.worldSize * 0.48;
  const h = 30;
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffeb3b,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
  });
  const edges = [
    { x: 0, z: -half, w: half * 2, d: 1.2 },
    { x: 0, z: half, w: half * 2, d: 1.2 },
    { x: -half, z: 0, w: 1.2, d: half * 2 },
    { x: half, z: 0, w: 1.2, d: half * 2 },
  ];
  edges.forEach((e) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(e.w, h, e.d), mat);
    wall.position.set(e.x, h * 0.45, e.z);
    scene.add(wall);
    freezeStatic(wall);
  });
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
  freezeStatic(group);
  mountains.push({ x, z, radius: size * 0.55, height: size * 0.95 });
}

function createLake(x, z, radius = 18) {
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 16),
    new THREE.MeshLambertMaterial({
      color: 0x4a9fd4,
      transparent: true,
      opacity: 0.85,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, 0.15, z);
  scene.add(water);
  freezeStatic(water);

  // Orilla
  const shore = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.92, radius * 1.08, 16),
    new THREE.MeshLambertMaterial({ color: 0xc2b280 })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(x, 0.12, z);
  scene.add(shore);
  freezeStatic(shore);
}

// ---------------------------------------------------------------------
// Pasto instanciado: 1 InstancedMesh en vez de 60 grupos x 5 blades
// (300 draw calls -> 1). Es el mayor cuello de botella de draw calls
// de todo el decorado. Conserva el tinte por mata con instanceColor.
// ---------------------------------------------------------------------
function createGrassInstanced(count, groundSize) {
  const bladeGeo = new THREE.PlaneGeometry(1, 1); // unidad, se escala por instancia
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(bladeGeo, mat, count * 5);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let idx = 0;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * groundSize * 0.85;
    const z = (Math.random() - 0.5) * groundSize * 0.85;
    col.setHSL(0.28, 0.5, 0.25 + Math.random() * 0.15);
    for (let b = 0; b < 5; b++) {
      const w = 0.08;
      const h = 0.4 + Math.random() * 0.5;
      dummy.position.set(x + (Math.random() - 0.5) * 0.3, 0.2, z + (Math.random() - 0.5) * 0.3);
      dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
      dummy.scale.set(w, h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.setColorAt(idx, col);
      idx++;
    }
  }
  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
}

// ---------------------------------------------------------------------
// Rocas sueltas instanciadas: 1 InstancedMesh en vez de 20 meshes.
// ---------------------------------------------------------------------
function createRocksInstanced(count, groundSize) {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0x6d6d6d });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * groundSize * 0.8;
    const z = (Math.random() - 0.5) * groundSize * 0.8;
    const s = 0.4 + Math.random() * 0.7;
    dummy.position.set(x, 0.3, z);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.scale.set(s, s * (0.6 + Math.random() * 0.4), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
}

let activeRing = null;
let guideArrow = null;
let guideBeacon = null;

function createGuideArrow() {
  const group = new THREE.Group();

  const mat = new THREE.MeshLambertMaterial({
    color: 0xffeb3b,
    emissive: 0xffc107,
    emissiveIntensity: 0.4,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), mat);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.5;
  group.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 10), mat);
  head.rotation.x = Math.PI / 2;
  head.position.z = 1.45;
  group.add(head);

  group.visible = false;
  scene.add(group);
  guideArrow = group;

  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xffe082,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  guideBeacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 1.2, 40, 12, 1, true),
    beaconMat
  );
  guideBeacon.visible = false;
  scene.add(guideBeacon);
}

function spawnRandomRing() {
  if (activeRing) {
    scene.remove(activeRing.mesh);
    activeRing = null;
  }

  const half = CONFIG.worldSize * 0.35;
  let x, y, z;
  for (let tries = 0; tries < 20; tries++) {
    x = (Math.random() - 0.5) * half * 2;
    z = (Math.random() - 0.5) * half * 2;
    y = 7 + Math.random() * 18;
    if (bird) {
      const d = Math.hypot(x - bird.position.x, z - bird.position.z);
      if (d > 25 && d < 90) break;
    } else if (Math.hypot(x, z) > 20) break;
  }

  let rotY = Math.random() * Math.PI * 2;
  if (bird) {
    rotY = Math.atan2(bird.position.x - x, bird.position.z - z);
  }

  const group = new THREE.Group();
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(CONFIG.ringRadius, CONFIG.ringTube, 8, 24),
    new THREE.MeshLambertMaterial({
      color: 0xffc107,
      emissive: 0xff9800,
      emissiveIntensity: 0.35,
    })
  );
  group.add(torus);

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(CONFIG.ringRadius * 0.92, 0.05, 6, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.55 })
  );
  group.add(inner);

  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(CONFIG.ringRadius + 0.55, 0.06, 6, 20),
    new THREE.MeshBasicMaterial({ color: 0xffecb3, transparent: true, opacity: 0.35 })
  );
  group.add(outer);

  group.position.set(x, y, z);
  group.rotation.y = rotY;
  scene.add(group);
  // El aro se recrea constantemente, así que mantiene matrixAutoUpdate normal.

  activeRing = { mesh: group, x, y, z, rotY, radius: CONFIG.ringRadius };

  if (guideBeacon) {
    guideBeacon.visible = true;
    guideBeacon.position.set(x, y + 18, z);
  }
}

function updateGuideArrow() {
  if (!guideArrow || !activeRing || !bird) {
    if (guideArrow) guideArrow.visible = false;
    return;
  }

  const bp = bird.position;
  const tx = activeRing.x - bp.x;
  const ty = activeRing.y - bp.y;
  const tz = activeRing.z - bp.z;
  const dist = Math.sqrt(tx * tx + ty * ty + tz * tz);

  const forward = new THREE.Vector3(Math.sin(bird.yaw), 0, Math.cos(bird.yaw));
  guideArrow.position.set(
    bp.x + forward.x * 3.5,
    bp.y + 1.8,
    bp.z + forward.z * 3.5
  );
  guideArrow.lookAt(activeRing.x, activeRing.y, activeRing.z);
  guideArrow.visible = dist > 6;

  if (guideBeacon && guideBeacon.visible) {
    const pulse = 0.18 + Math.sin(performance.now() * 0.004) * 0.1;
    guideBeacon.material.opacity = pulse;
  }
}

function checkRings() {
  if (!activeRing || !bird) return;
  const pos = bird.position;
  const ring = activeRing;

  const dx = pos.x - ring.x;
  const dy = pos.y - ring.y;
  const dz = pos.z - ring.z;

  const nx = Math.sin(ring.rotY);
  const nz = Math.cos(ring.rotY);
  const along = dx * nx + dz * nz;
  if (Math.abs(along) > 1.4) return;

  const px = dx - along * nx;
  const pz = dz - along * nz;
  const radial = Math.sqrt(px * px + dy * dy + pz * pz);

  if (radial < CONFIG.ringRadius - 0.25) {
    ringScore++;
    updateScoreUI();
    ring.mesh.children[0].material.color.setHex(0x66bb6a);
    ring.mesh.children[0].material.emissive.setHex(0x2e7d32);
    const oldMesh = ring.mesh;
    activeRing = null;
    setTimeout(() => {
      scene.remove(oldMesh);
      spawnRandomRing();
    }, 280);
  }
}

function resetRingRun() {
  if (ringScore > 0) {
    lastScore = ringScore;
    if (ringScore > bestScore) {
      bestScore = ringScore;
      localStorage.setItem('birdFlightBest', String(bestScore));
    }
  }
  ringScore = 0;
  updateScoreUI();
  if (activeRing) {
    scene.remove(activeRing.mesh);
    activeRing = null;
  }
  spawnRandomRing();
}

function setupRings() {
  createGuideArrow();
  spawnRandomRing();
}

function updateScoreUI() {
  const rs = String(ringScore);
  const bs = String(bestScore);
  const elA = ringScoreEl || document.getElementById('ringScore');
  const elB = bestScoreEl || document.getElementById('bestScore');
  if (elA) elA.textContent = rs;
  if (elB) elB.textContent = bs;
  ringScoreEl = elA;
  bestScoreEl = elB;
}


let poseCanvas, poseCtx;

const POSE_CONNECTIONS = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

function drawPoseOverlay() {
  if (!poseCanvas || !poseCtx || !poseTracker) return;
  const video = document.getElementById('video');
  if (!video || video.readyState < 2) return;

  const w = poseCanvas.width;
  const h = poseCanvas.height;
  poseCtx.save();
  poseCtx.clearRect(0, 0, w, h);
  poseCtx.translate(w, 0);
  poseCtx.scale(-1, 1);
  try {
    poseCtx.drawImage(video, 0, 0, w, h);
  } catch (e) {}

  const kps = poseTracker.lastKeypoints;
  if (kps && kps.length) {
    const vw = video.videoWidth || CONFIG.videoWidth;
    const vh = video.videoHeight || CONFIG.videoHeight;
    const get = (name) => kps.find((k) => k.name === name);

    poseCtx.strokeStyle = '#00e676';
    poseCtx.lineWidth = 3;
    poseCtx.fillStyle = '#ff1744';

    POSE_CONNECTIONS.forEach(([a, b]) => {
      const ka = get(a);
      const kb = get(b);
      if (!ka || !kb || ka.score < 0.18 || kb.score < 0.18) return;
      poseCtx.beginPath();
      poseCtx.moveTo((ka.x / vw) * w, (ka.y / vh) * h);
      poseCtx.lineTo((kb.x / vw) * w, (kb.y / vh) * h);
      poseCtx.stroke();
    });

    kps.forEach((k) => {
      if (k.score < 0.18) return;
      poseCtx.beginPath();
      poseCtx.arc((k.x / vw) * w, (k.y / vh) * h, 4, 0, Math.PI * 2);
      poseCtx.fill();
    });
  }
  poseCtx.restore();
}

// ---------------------------------------------------------------------
// Loop de detección de pose, DESACOPLADO del render loop.
// estimatePoses() con backend WebGL implica una lectura GPU->CPU; hacerla
// con `await` dentro del mismo callback de requestAnimationFrame frena
// (sincroniza) ese frame de render con la inferencia — en un RPi4 eso
// se nota como micro-tirones periódicos. Aquí corre por su cuenta a
// CONFIG.poseIntervalMs y el render loop solo lee el último valor.
// ---------------------------------------------------------------------
let poseLoopRunning = false;
async function poseLoop() {
  if (!poseLoopRunning) return;
  try {
    currentAction = await poseTracker.update();
    currentLean = poseTracker.getLeanFactor ? poseTracker.getLeanFactor() : 0;
    currentFlapInt = poseTracker.getFlapIntensity ? poseTracker.getFlapIntensity() : 0;
    if (poseTracker.consumeHeadGrabPulse && poseTracker.consumeHeadGrabPulse()) {
      const now = performance.now();
      if (now - lastHeadGrabToggle > 900) {
        lastHeadGrabToggle = now;
        togglePause();
      }
    }
  } catch (e) {
    console.error('pose loop error', e);
  }
  setTimeout(poseLoop, CONFIG.poseIntervalMs || 33);
}

async function init() {
  statusEl = document.getElementById('status');
  actionEl = document.getElementById('action');
  debugEl = document.getElementById('debug');
  ringScoreEl = document.getElementById('ringScore');
  lastScoreEl = document.getElementById('lastScore');
  bestScoreEl = document.getElementById('bestScore');
  poseCanvas = document.getElementById('poseCanvas');
  if (poseCanvas) poseCtx = poseCanvas.getContext('2d');
  pauseOverlayEl = document.getElementById('pauseOverlay');
  updateScoreUI();
  if (ringScoreEl) ringScoreEl.textContent = '0';
  if (bestScoreEl) bestScoreEl.textContent = String(bestScore);

  statusEl.textContent = 'Pidiendo permiso de cámara...';

  const video = document.getElementById('video');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: CONFIG.videoWidth },
        height: { ideal: CONFIG.videoHeight },
        facingMode: 'user',
      },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    statusEl.textContent = 'Error de cámara: ' + err.message;
    console.error(err);
    return;
  }

  statusEl.textContent = 'Cargando modelo de pose (MoveNet)...';
  poseTracker = new PoseTracker();
  await poseTracker.init(video);

  statusEl.textContent = 'Creando mundo 3D...';

  const canvas = document.getElementById('c3d');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(CONFIG.pixelRatioMax || 1, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ec8e3);
  scene.fog = new THREE.Fog(0x9fd4e8, 55, 220);

  const hemi = new THREE.HemisphereLight(0xfff8e7, 0x3d5c34, 0.95);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffe7c2, 1.15);
  dir.position.set(45, 70, 30);
  dir.castShadow = false;
  dir.shadow.mapSize.set(512, 512);
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 200;
  dir.shadow.camera.left = -80;
  dir.shadow.camera.right = 80;
  dir.shadow.camera.top = 80;
  dir.shadow.camera.bottom = -80;
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xa0c4ff, 0.25);
  fill.position.set(-30, 20, -20);
  scene.add(fill);

  // Suelo con textura de pasto
  const groundSize = CONFIG.worldSize;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize, 32, 32),
    new THREE.MeshLambertMaterial({ map: createGrassTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  const posAttr = ground.geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const h =
      Math.sin(x * 0.025) * Math.cos(y * 0.025) * 1.8 +
      Math.sin(x * 0.07 + y * 0.05) * 0.9 +
      Math.sin(x * 0.15) * Math.cos(y * 0.12) * 0.35;
    posAttr.setZ(i, h);
  }
  posAttr.needsUpdate = true;
  ground.geometry.computeVertexNormals();
  scene.add(ground);
  freezeStatic(ground);
  createBoundary();

  // Lagos
  createLake(55, -40, 16);
  createLake(-70, 50, 12);
  createLake(30, 80, 10);

  // Montañas lejanas
  createMountain(120, -100, 48);
  createMountain(-130, -80, 42);
  createMountain(100, 130, 55);
  createMountain(-110, 120, 38);
  createMountain(0, -150, 50);

  // Colinas
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 120;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.abs(x) < 18 && Math.abs(z) < 18) continue;
    createHill(x, z, 5 + Math.random() * 12, 2.2 + Math.random() * 6);
  }

  // Árboles — posiciones calculadas, geometría instanciada (misma cantidad: 40)
  const treePositions = [];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * (groundSize * 0.44);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
    if (Math.hypot(x - 55, z + 40) < 18) continue;
    if (Math.hypot(x + 70, z - 50) < 14) continue;
    treePositions.push({ x, z, scale: 0.65 + Math.random() * 1.0 });
  }
  createTreesBillboards(treePositions);

  // Arbustos, flores, pasto y rocas — mismas cantidades, instanciados
  createBushesInstanced(25, groundSize);
  createFlowersInstanced(40, groundSize);
  createGrassInstanced(60, groundSize);
  createRocksInstanced(20, groundSize);

  // Nubes
  for (let i = 0; i < 12; i++) {
    const x = (Math.random() - 0.5) * groundSize * 0.9;
    const z = (Math.random() - 0.5) * groundSize * 0.9;
    const y = 16 + Math.random() * 26;
    createCloudBillboard(x, y, z, 1.2 + Math.random() * 2.2);
  }

  // Aros objetivo
  setupRings();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.position.set(0, 8, 15);

  bird = new Bird3D(scene);

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKeyDown);

  statusEl.textContent = 'Listo – atraviesa los aros dorados';

  // Arranca el loop de pose por separado del render loop.
  poseLoopRunning = true;
  poseLoop();

  animate();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function togglePause() {
  gamePaused = !gamePaused;
  if (pauseOverlayEl) {
    pauseOverlayEl.classList.toggle('visible', gamePaused);
  }
  if (statusEl) {
    statusEl.textContent = gamePaused
      ? 'PAUSA – Espacio o manos en la cabeza para continuar'
      : 'Juego reanudado';
  }
}

function onKeyDown(e) {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    togglePause();
  }
}

// El render loop YA NO es async ni hace await de nada: lee currentAction /
// currentLean / currentFlapInt, que el poseLoop actualiza en paralelo.
function animate() {
  requestAnimationFrame(animate);

  drawPoseOverlay();
  updateScoreUI();

  if (gamePaused) {
    if (actionEl) actionEl.textContent = 'ACCIÓN: PAUSA';
    renderer.render(scene, camera);
    return;
  }

  const action = currentAction;
  const lean = currentLean;
  bird.update(action, lean, currentFlapInt);
  bird.checkCollisions(trees, hills, mountains);

  if (!bird.onGround && bird.state !== 'GROUNDED') {
    checkRings();
  }
  updateGuideArrow();

  if (bird.onGround || bird.state === 'GROUNDED') {
    if (!wasOnGround) {
      resetRingRun();
    }
    wasOnGround = true;
  } else {
    wasOnGround = false;
  }

  // Cámara
  const targetPos = bird.position.clone();
  const offset = new THREE.Vector3(
    -Math.sin(bird.yaw) * CONFIG.cameraDistance,
    CONFIG.cameraHeight,
    -Math.cos(bird.yaw) * CONFIG.cameraDistance
  );
  camera.position.lerp(targetPos.clone().add(offset), CONFIG.cameraLerp);
  const lookTarget = new THREE.Vector3(
    targetPos.x + Math.sin(bird.yaw) * CONFIG.cameraLookAhead,
    targetPos.y + 1.0,
    targetPos.z + Math.cos(bird.yaw) * CONFIG.cameraLookAhead
  );
  camera.lookAt(lookTarget);

  let stateLabel = '';
  if (bird.state === 'GROUNDED') {
    stateLabel = bird.preparingTakeoff || bird.flapCount > 0
      ? ` (suelo – aleteos ${bird.flapCount}/${CONFIG.flapsNeededToTakeoff})`
      : ' (suelo)';
  } else if (bird.state === 'TAKEOFF') {
    stateLabel = ' (despegue)';
  }
  actionEl.textContent = 'ACCIÓN: ' + action + stateLabel;

  const dbg = poseTracker.getDebug();
  debugEl.innerHTML = Object.entries(dbg)
    .map(([k, v]) => `${k}: ${v}`)
    .join('<br>');

  renderer.render(scene, camera);
}

init().catch((err) => {
  console.error(err);
  document.getElementById('status').textContent = 'Error: ' + err.message;
});