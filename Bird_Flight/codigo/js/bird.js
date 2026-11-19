/**
 * Halcón 3D low-poly – silueta mejorada, animaciones suaves, pocos polígonos
 */

class Bird3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.model = new THREE.Group();
    this.group.add(this.model);

    // Materiales compartidos
    const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.7, metalness: 0 });
    const headMat  = new THREE.MeshStandardMaterial({ color: 0x3a2a1f, roughness: 0.65 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.75 });
    const wingMat  = new THREE.MeshStandardMaterial({ color: 0x2a1f16, roughness: 0.6, side: THREE.DoubleSide });
    const beakMat  = new THREE.MeshStandardMaterial({ color: 0xe8a317, roughness: 0.35, metalness: 0 });
    const darkMat  = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.55 });
    const eyeW     = new THREE.MeshStandardMaterial({ color: 0xfafafa });
    const eyeB     = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const legMat   = new THREE.MeshStandardMaterial({ color: 0xc4a35a, roughness: 0.55 });

    // Cuerpo (bajo poli)
    const bodyGeo = new THREE.SphereGeometry(0.42, 10, 8);
    bodyGeo.scale(0.9, 0.78, 1.7);
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.model.add(this.body);

    // Pecho
    const bellyGeo = new THREE.SphereGeometry(0.34, 8, 6);
    bellyGeo.scale(0.85, 0.65, 1.2);
    this.belly = new THREE.Mesh(bellyGeo, bellyMat);
    this.belly.position.set(0, -0.14, 0.1);
    this.model.add(this.belly);

    // Cabeza
    const headGeo = new THREE.SphereGeometry(0.28, 8, 6);
    headGeo.scale(0.95, 0.9, 1.1);
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 0.14, 0.78);
    this.model.add(this.head);

    // Máscara oscura
    const maskGeo = new THREE.SphereGeometry(0.24, 6, 5);
    maskGeo.scale(1.05, 0.5, 0.9);
    const mask = new THREE.Mesh(maskGeo, darkMat);
    mask.position.set(0, 0.2, 0.82);
    this.model.add(mask);

    // Pico (una sola pieza)
    const beakGeo = new THREE.ConeGeometry(0.09, 0.5, 5);
    this.beak = new THREE.Mesh(beakGeo, beakMat);
    this.beak.rotation.x = Math.PI / 2 + 0.15;
    this.beak.position.set(0, 0.1, 1.18);
    this.model.add(this.beak);

    // Ojos
    const ew = new THREE.SphereGeometry(0.08, 6, 5);
    const eb = new THREE.SphereGeometry(0.045, 5, 4);
    this.eyeL = new THREE.Mesh(ew, eyeW);
    this.eyeL.position.set(0.15, 0.24, 0.92);
    this.model.add(this.eyeL);
    this.pupilL = new THREE.Mesh(eb, eyeB);
    this.pupilL.position.set(0.18, 0.25, 0.98);
    this.model.add(this.pupilL);
    this.eyeR = new THREE.Mesh(ew, eyeW);
    this.eyeR.position.set(-0.15, 0.24, 0.92);
    this.model.add(this.eyeR);
    this.pupilR = new THREE.Mesh(eb, eyeB);
    this.pupilR.position.set(-0.18, 0.25, 0.98);
    this.model.add(this.pupilR);

    // Alas puntiagudas (1 capa, shape simple)
    const makeWing = (side) => {
      const group = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(0.55, 0.18);
      shape.lineTo(2.05, 0.02);
      shape.lineTo(1.85, -0.18);
      shape.lineTo(0.6, -0.28);
      shape.lineTo(0.1, -0.12);
      shape.lineTo(0, 0);
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, wingMat);
      mesh.scale.set(side * 1.15, 1, 1.1);
      group.add(mesh);
      return group;
    };

    this.leftWing = makeWing(1);
    this.leftWing.position.set(0.2, 0.08, 0.05);
    this.model.add(this.leftWing);

    this.rightWing = makeWing(-1);
    this.rightWing.position.set(-0.2, 0.08, 0.05);
    this.model.add(this.rightWing);

    // Cola (3 plumas)
    this.tail = new THREE.Group();
    [-0.12, 0, 0.12].forEach((x, i) => {
      const s = i === 1 ? 1 : 0.82;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(0.07, -1.15 * s);
      shape.lineTo(0, -1.28 * s);
      shape.lineTo(-0.07, -1.15 * s);
      shape.lineTo(0, 0);
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const f = new THREE.Mesh(geo, wingMat);
      f.position.set(x, 0.02, -0.7);
      this.tail.add(f);
    });
    this.model.add(this.tail);

    // Patas
    const legGeo = new THREE.CylinderGeometry(0.03, 0.022, 0.36, 4);
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(0.12, -0.4, 0.1);
    this.model.add(this.leftLeg);
    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(-0.12, -0.4, 0.1);
    this.model.add(this.rightLeg);

    // Estado
    this.position = new THREE.Vector3(0, 8, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.action = 'NONE';
    this.wingFlapPhase = 0;
    this.walkPhase = 0;
    this.state = 'FLYING';
    this.takeoffTimer = 0;
    this.onGround = false;
    this.flapCount = 0;
    this.flapCooldown = 0;
    this.wasAscending = false;
    this.preparingTakeoff = false;
    this.turnIntensity = 0;
    this._wingTX = 0;
    this._wingTZ = 0.2;
    this._wingTY = 0;

    this.group.position.copy(this.position);
  }

  _setWingTargets(x, z, y = 0) {
    this._wingTX = x;
    this._wingTZ = z;
    this._wingTY = y;
  }

  _applyWingLerp(speed = 0.15) {
    this.leftWing.rotation.x = THREE.MathUtils.lerp(this.leftWing.rotation.x, this._wingTX, speed);
    this.rightWing.rotation.x = THREE.MathUtils.lerp(this.rightWing.rotation.x, -this._wingTX, speed);
    this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, this._wingTZ, speed);
    this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, -this._wingTZ, speed);
    this.leftWing.rotation.y = THREE.MathUtils.lerp(this.leftWing.rotation.y, this._wingTY, speed);
    this.rightWing.rotation.y = THREE.MathUtils.lerp(this.rightWing.rotation.y, -this._wingTY, speed);
  }

  checkCollisions(trees, mountains) {
    const px = this.position.x;
    const pz = this.position.z;
    const py = this.position.y;
    const grounded = this.state === 'GROUNDED' || this.onGround;

    for (const t of trees) {
      const dx = px - t.x;
      const dz = pz - t.z;
      const dist = Math.hypot(dx, dz);
      const r = grounded ? CONFIG.treeCollisionRadiusGround : CONFIG.treeCollisionRadius;
      if (dist < r && py < t.height) {
        const push = (r - dist) * CONFIG.collisionPushBack;
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);
        this.position.x += nx * push;
        this.position.z += nz * push;
        this.velocity.x *= 0.2;
        this.velocity.z *= 0.2;
        if (!grounded) {
          this.velocity.y = Math.min(this.velocity.y, 0);
        }
      }
    }

    for (const m of mountains) {
      const dx = px - m.x;
      const dz = pz - m.z;
      const dist = Math.hypot(dx, dz);
      if (dist < m.radius && py < m.height) {
        const push = (m.radius - dist) * 0.8;
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);
        this.position.x += nx * push;
        this.position.z += nz * push;
        this.velocity.x *= 0.3;
        this.velocity.z *= 0.3;
      }
    }
  }

  update(action, leanFactor = 0, flapIntensity = 0.5) {
    this.action = action;
    const dt = 1;

    if (this.flapCooldown > 0) this.flapCooldown--;

    const grounded = this.state === 'GROUNDED' || this.onGround;

    if (grounded) {
      this.velocity.y = 0;
      this.position.y = CONFIG.groundY;

      if (action === 'ASCEND' && this.flapCooldown <= 0) {
        this.flapCount++;
        this.flapCooldown = CONFIG.flapCooldownFrames;
        this.preparingTakeoff = true;
      }

      if (this.flapCount >= CONFIG.flapsNeededToTakeoff) {
        this.state = 'TAKEOFF';
        this.takeoffTimer = CONFIG.takeoffDuration;
        this.velocity.y = CONFIG.takeoffForce;
        this.flapCount = 0;
        this.preparingTakeoff = false;
        this.onGround = false;
      }

      // Caminar
      const walk = action === 'GLIDE' || action === 'TURN_L' || action === 'TURN_R';
      if (walk) {
        const speed = CONFIG.walkSpeed;
        this.velocity.x = Math.sin(this.yaw) * speed;
        this.velocity.z = Math.cos(this.yaw) * speed;
        this.walkPhase += 0.15;
      } else {
        this.velocity.x *= 0.9;
        this.velocity.z *= 0.9;
        this.walkPhase = 0;
      }

      // Giro en suelo
      if (action === 'TURN_L') this.yaw += CONFIG.turnSpeed * 0.6;
      if (action === 'TURN_R') this.yaw -= CONFIG.turnSpeed * 0.6;

      // Animación de aleteo al intentar despegar
      if (this.preparingTakeoff || this.flapCount > 0 || action === 'ASCEND') {
        this.wingFlapPhase += 0.35;
        const flap = Math.sin(this.wingFlapPhase);
        this._setWingTargets(-0.5 + flap * 0.4, 0.3 + flap * 0.3, 0);
        this._applyWingLerp(0.3);
      } else {
        // Alas recogidas en suelo
        this._setWingTargets(0.1, 0.05, 0);
        this._applyWingLerp(0.1);
      }

    } else {
      // En vuelo
      if (this.state === 'TAKEOFF') {
        this.takeoffTimer--;
        if (this.takeoffTimer <= 0) this.state = 'FLYING';
      }

      if (action === 'ASCEND') {
        const fi = Math.max(0, Math.min(1, flapIntensity || 0));
        const power = CONFIG.ascendPower != null ? CONFIG.ascendPower : 1.55;
        const curve = Math.pow(fi, power);
        const minMul = CONFIG.ascendMinMul != null ? CONFIG.ascendMinMul : 0.08;
        const liftMul = minMul + (1 - minMul) * curve;
        this.velocity.y += CONFIG.ascendForce * liftMul;
        const maxClimb = (CONFIG.ascendMaxClimbMin != null ? CONFIG.ascendMaxClimbMin : 0.05)
          + (CONFIG.ascendMaxClimbRange != null ? CONFIG.ascendMaxClimbRange : 0.20) * curve;
        if (this.velocity.y > maxClimb) this.velocity.y = maxClimb;

        this.wingFlapPhase += 0.4;
        const flap = Math.sin(this.wingFlapPhase);
        this._setWingTargets(-0.4 + flap * 0.2, 0.65 + flap * 0.4, 0);
        this._applyWingLerp(0.22);
      } else if (action === 'DIVE') {
        this.velocity.y -= CONFIG.diveForce;
        this._setWingTargets(0.6, 0.1, 0);
        this._applyWingLerp(0.15);
        // Inclinación hacia adelante en picada
        this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -0.4, 0.1);
      } else {
        // Planear o girar
        if (action === 'TURN_L') {
          const intensity = Math.abs(leanFactor);
          this.yaw += CONFIG.turnSpeed * (0.3 + intensity * 0.7);
          this._setWingTargets(0.15, 0.5 + intensity * 0.3, 0.2);
        } else if (action === 'TURN_R') {
          const intensity = Math.abs(leanFactor);
          this.yaw -= CONFIG.turnSpeed * (0.3 + intensity * 0.7);
          this._setWingTargets(0.15, 0.5 + intensity * 0.3, -0.2);
        } else {
          this._setWingTargets(0.05, 0.4, 0);
        }
        this._applyWingLerp(0.12);

        // Solo en picada cae rápido; el resto desciende lento
        if (action === 'DIVE') {
          this.velocity.y -= CONFIG.gravity;
          if (this.velocity.y < -CONFIG.maxFallSpeed) this.velocity.y = -CONFIG.maxFallSpeed;
        } else if (action !== 'ASCEND') {
          this.velocity.y -= CONFIG.gravity * CONFIG.glideGravityFactor;
          const maxGlideFall = CONFIG.maxFallSpeed * 0.35;
          if (this.velocity.y < -maxGlideFall) this.velocity.y = -maxGlideFall;
        }
      }

      // Velocidad horizontal
      const speed = CONFIG.glideSpeed;
      this.velocity.x = Math.sin(this.yaw) * speed;
      this.velocity.z = Math.cos(this.yaw) * speed;

      // Maniobra leve en picada
      if (action === 'DIVE') {
        if (leanFactor > 0.1) this.yaw += CONFIG.turnSpeed * 0.15;
        if (leanFactor < -0.1) this.yaw -= CONFIG.turnSpeed * 0.15;
      }

      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -leanFactor * 0.4, 0.1);
      if (action !== 'DIVE') {
        this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, 0.1);
      }
    }

    // Aplicar velocidad
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Límites del mundo
    const limit = CONFIG.worldSize * 0.45;
    this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
    this.position.z = Math.max(-limit, Math.min(limit, this.position.z));

    // Suelo
    if (this.position.y <= CONFIG.groundY) {
      this.position.y = CONFIG.groundY;
      this.velocity.y = 0;
      if (this.state !== 'GROUNDED') {
        this.state = 'GROUNDED';
        this.onGround = true;
        this.flapCount = 0;
        this.preparingTakeoff = false;
      }
    } else {
      this.onGround = false;
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }
}
