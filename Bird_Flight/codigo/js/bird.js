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
    // Targets de animación de alas (lerp suave)
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

  _applyWingLerp(t = 0.18) {
    // left wing
    this.leftWing.rotation.x = THREE.MathUtils.lerp(this.leftWing.rotation.x, this._wingTX, t);
    this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, this._wingTZ, t);
    this.leftWing.rotation.y = THREE.MathUtils.lerp(this.leftWing.rotation.y, this._wingTY, t);
    // right (espejo en z/y)
    this.rightWing.rotation.x = THREE.MathUtils.lerp(this.rightWing.rotation.x, this._wingTX, t);
    this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, -this._wingTZ, t);
    this.rightWing.rotation.y = THREE.MathUtils.lerp(this.rightWing.rotation.y, -this._wingTY, t);
  }

  checkCollisions(trees, hills, mountains) {
    const radius = this.onGround || this.state === 'GROUNDED'
      ? CONFIG.treeCollisionRadiusGround
      : CONFIG.treeCollisionRadius;

    if (trees && trees.length) {
      for (const tree of trees) {
        const dx = this.position.x - tree.x;
        const dz = this.position.z - tree.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = radius + (tree.radius || 1.2);

        if (dist < minDist && this.position.y < tree.height + 1.5) {
          const nx = dx / (dist || 0.001);
          const nz = dz / (dist || 0.001);
          this.position.x += nx * CONFIG.collisionPushBack;
          this.position.z += nz * CONFIG.collisionPushBack;
          this.velocity.x = nx * 0.08;
          this.velocity.z = nz * 0.08;
          if (this.velocity.y < 0.05) this.velocity.y = 0.06;
        }
      }
    }

    if (hills && hills.length) {
      for (const hill of hills) {
        const dx = this.position.x - hill.x;
        const dz = this.position.z - hill.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist >= hill.radius) continue;
        const t = dist / hill.radius;
        const surfaceY = hill.height * Math.sqrt(Math.max(0, 1 - t * t));
        if (this.position.y < surfaceY + 0.9) {
          if (dist < 0.15) {
            this.position.y = Math.max(this.position.y, surfaceY + 1.0);
          } else {
            const nx = dx / dist;
            const nz = dz / dist;
            this.position.y = Math.max(this.position.y, surfaceY + 0.85);
            if (this.position.y < surfaceY + 1.2) {
              this.position.x += nx * 0.15;
              this.position.z += nz * 0.15;
            }
          }
          if (this.velocity.y < 0) this.velocity.y *= -0.25;
          if (this.position.y < surfaceY + 1.5) {
            this.velocity.x *= 0.7;
            this.velocity.z *= 0.7;
          }
        }
      }
    }

    if (mountains && mountains.length) {
      for (const mtn of mountains) {
        const dx = this.position.x - mtn.x;
        const dz = this.position.z - mtn.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist >= mtn.radius) continue;
        const t = dist / mtn.radius;
        const surfaceY = mtn.height * Math.max(0, 1 - t);
        if (this.position.y < surfaceY + 1.2) {
          if (dist < 0.2) {
            this.position.y = Math.max(this.position.y, surfaceY + 1.2);
          } else {
            const nx = dx / dist;
            const nz = dz / dist;
            this.position.y = Math.max(this.position.y, surfaceY + 1.0);
            this.position.x += nx * 0.25;
            this.position.z += nz * 0.25;
          }
          if (this.velocity.y < 0) this.velocity.y *= -0.2;
          this.velocity.x *= 0.65;
          this.velocity.z *= 0.65;
        }
      }
    }
  }

  update(action, leanFactor = 0, flapIntensity = 0.5) {
    this.action = action;
    const minF = CONFIG.turnSpeedMinFactor != null ? CONFIG.turnSpeedMinFactor : 0.35;
    const absLean = Math.min(1, Math.abs(leanFactor || 0));
    this.turnIntensity = absLean > 0 ? (minF + (1 - minF) * absLean) : 0;
    this.wingFlapPhase += 0.32;
    this.walkPhase += 0.18;
    const flap = Math.sin(this.wingFlapPhase);

    const nearGround = this.position.y <= CONFIG.groundY + 0.15;
    if (this.flapCooldown > 0) this.flapCooldown--;

    if (nearGround && this.velocity.y <= 0.02 && this.state !== 'TAKEOFF') {
      this.onGround = true;
      this.position.y = CONFIG.groundY;
      this.velocity.y = 0;
      this.state = 'GROUNDED';

      if (action === 'ASCEND' && !this.wasAscending && this.flapCooldown <= 0) {
        this.flapCount++;
        this.flapCooldown = CONFIG.flapCooldownFrames;
        this.preparingTakeoff = true;
      }
      this.wasAscending = (action === 'ASCEND');

      if (this.flapCount >= CONFIG.flapsNeededToTakeoff) {
        this.state = 'TAKEOFF';
        this.takeoffTimer = CONFIG.takeoffDuration;
        this.velocity.y = CONFIG.takeoffForce;
        this.onGround = false;
        this.flapCount = 0;
        this.preparingTakeoff = false;
      }
    } else if (!nearGround) {
      this.onGround = false;
      this.flapCount = 0;
      this.preparingTakeoff = false;
      if (this.state !== 'TAKEOFF') this.state = 'FLYING';
    } else {
      this.wasAscending = (action === 'ASCEND');
    }

    if (this.state === 'TAKEOFF') {
      this.takeoffTimer--;
      this.leftWing.scale.set(1, 1, 1);
      this.rightWing.scale.set(1, 1, 1);
      this._setWingTargets(-0.35 + flap * 0.4, 0.7 + flap * 0.25, 0);
      this._applyWingLerp(0.25);
      this.velocity.y += CONFIG.ascendForce * 0.22;
      if (this.takeoffTimer <= 0) this.state = 'FLYING';
    }
    else if (this.state === 'GROUNDED') {
      const tryingTakeoff = (action === 'ASCEND') || this.preparingTakeoff || this.flapCount > 0;

      if (tryingTakeoff) {
        this.leftWing.scale.set(
          THREE.MathUtils.lerp(this.leftWing.scale.x, 1, 0.2), 1,
          THREE.MathUtils.lerp(this.leftWing.scale.z, 1, 0.2)
        );
        this.rightWing.scale.set(
          THREE.MathUtils.lerp(this.rightWing.scale.x, 1, 0.2), 1,
          THREE.MathUtils.lerp(this.rightWing.scale.z, 1, 0.2)
        );
        this._setWingTargets(-0.25 + flap * 0.4, 0.55 + flap * 0.35, 0.05);
        this._applyWingLerp(0.22);
      } else {
        this.leftWing.scale.set(
          THREE.MathUtils.lerp(this.leftWing.scale.x, 0.28, 0.2), 1,
          THREE.MathUtils.lerp(this.leftWing.scale.z, 0.55, 0.2)
        );
        this.rightWing.scale.set(
          THREE.MathUtils.lerp(this.rightWing.scale.x, 0.28, 0.2), 1,
          THREE.MathUtils.lerp(this.rightWing.scale.z, 0.55, 0.2)
        );
        this._setWingTargets(0.2, 0.12, 0.3);
        this._applyWingLerp(0.18);
      }

      const walking = action === 'GLIDE' || action === 'TURN_L' || action === 'TURN_R' ||
                      (action === 'ASCEND' && this.flapCount < CONFIG.flapsNeededToTakeoff);
      if (walking) {
        const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        this.velocity.x = forward.x * CONFIG.walkSpeed;
        this.velocity.z = forward.z * CONFIG.walkSpeed;
        this.leftLeg.rotation.x  = 0.3 + Math.sin(this.walkPhase) * 0.45;
        this.rightLeg.rotation.x = 0.3 + Math.sin(this.walkPhase + Math.PI) * 0.45;
        this.model.rotation.z = Math.sin(this.walkPhase) * 0.06;
        this.model.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.04;
      } else {
        this.velocity.x *= 0.85;
        this.velocity.z *= 0.85;
        this.leftLeg.rotation.x  = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0.35, 0.15);
        this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0.35, 0.15);
        this.model.rotation.z = THREE.MathUtils.lerp(this.model.rotation.z, 0, 0.1);
        this.model.position.y = THREE.MathUtils.lerp(this.model.position.y, 0, 0.1);
      }

      if (action === 'TURN_L') this.yaw += CONFIG.turnSpeed * 0.7 * (this.turnIntensity || 1);
      if (action === 'TURN_R') this.yaw -= CONFIG.turnSpeed * 0.7 * (this.turnIntensity || 1);
    }
    else {
      this.leftLeg.rotation.x  = 0.5;
      this.rightLeg.rotation.x = 0.5;
      this.model.position.y = 0;
      this.model.rotation.z = 0;

      this.leftWing.scale.set(
        THREE.MathUtils.lerp(this.leftWing.scale.x, 1, 0.25), 1,
        THREE.MathUtils.lerp(this.leftWing.scale.z, 1, 0.25)
      );
      this.rightWing.scale.set(
        THREE.MathUtils.lerp(this.rightWing.scale.x, 1, 0.25), 1,
        THREE.MathUtils.lerp(this.rightWing.scale.z, 1, 0.25)
      );
      // Restaurar anclaje de alas (salen de la picada)
      if (action !== 'DIVE') {
        this.leftWing.position.x = THREE.MathUtils.lerp(this.leftWing.position.x, 0.2, 0.15);
        this.rightWing.position.x = THREE.MathUtils.lerp(this.rightWing.position.x, -0.2, 0.15);
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
        this._setWingTargets(-0.4 + flap * 0.2, 0.65 + flap * 0.4, 0);
        this._applyWingLerp(0.22);
      } else if (action === 'DIVE') {
        this.velocity.y -= CONFIG.diveForce;
        // Maniobra leve en picada según inclinación del cuerpo
        const diveTurn = (this.turnIntensity || 0) * CONFIG.turnSpeed * 0.35;
        if (leanFactor > 0.05) this.yaw += diveTurn;
        else if (leanFactor < -0.05) this.yaw -= diveTurn;

        // Picada de halcón: alas muy plegadas y pegadas al cuerpo
        this.leftWing.scale.set(
          THREE.MathUtils.lerp(this.leftWing.scale.x, 0.18, 0.22), 1,
          THREE.MathUtils.lerp(this.leftWing.scale.z, 0.4, 0.22)
        );
        this.rightWing.scale.set(
          THREE.MathUtils.lerp(this.rightWing.scale.x, 0.18, 0.22), 1,
          THREE.MathUtils.lerp(this.rightWing.scale.z, 0.4, 0.22)
        );
        this.leftWing.rotation.x = THREE.MathUtils.lerp(this.leftWing.rotation.x, 0.85, 0.2);
        this.rightWing.rotation.x = THREE.MathUtils.lerp(this.rightWing.rotation.x, 0.85, 0.2);
        this.leftWing.rotation.y = THREE.MathUtils.lerp(this.leftWing.rotation.y, 0.55, 0.2);
        this.rightWing.rotation.y = THREE.MathUtils.lerp(this.rightWing.rotation.y, -0.55, 0.2);
        this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, 0.05, 0.2);
        this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, -0.05, 0.2);
        this.leftWing.position.x = THREE.MathUtils.lerp(this.leftWing.position.x, 0.12, 0.15);
        this.rightWing.position.x = THREE.MathUtils.lerp(this.rightWing.position.x, -0.12, 0.15);
      } else if (action === 'GLIDE') {
        this.velocity.y *= 0.94;
        this._setWingTargets(0.02 + flap * 0.03, 0.22 + flap * 0.03, 0);
        this._applyWingLerp(0.15);
      } else if (action === 'TURN_L') {
        const ti = this.turnIntensity || 1;
        this.yaw += CONFIG.turnSpeed * ti;
        this.velocity.y *= 0.94;
        // animación invertida (cámara espejada), proporcional
        this.leftWing.rotation.x = THREE.MathUtils.lerp(this.leftWing.rotation.x, 0.05, 0.15);
        this.rightWing.rotation.x = THREE.MathUtils.lerp(this.rightWing.rotation.x, 0.05, 0.15);
        this.leftWing.rotation.y = THREE.MathUtils.lerp(this.leftWing.rotation.y, 0, 0.15);
        this.rightWing.rotation.y = THREE.MathUtils.lerp(this.rightWing.rotation.y, 0, 0.15);
        this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, 0.05 * ti, 0.15);
        this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, -0.15 - 0.55 * ti, 0.15);
      } else if (action === 'TURN_R') {
        const ti = this.turnIntensity || 1;
        this.yaw -= CONFIG.turnSpeed * ti;
        this.velocity.y *= 0.94;
        this.leftWing.rotation.x = THREE.MathUtils.lerp(this.leftWing.rotation.x, 0.05, 0.15);
        this.rightWing.rotation.x = THREE.MathUtils.lerp(this.rightWing.rotation.x, 0.05, 0.15);
        this.leftWing.rotation.y = THREE.MathUtils.lerp(this.leftWing.rotation.y, 0, 0.15);
        this.rightWing.rotation.y = THREE.MathUtils.lerp(this.rightWing.rotation.y, 0, 0.15);
        this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, 0.15 + 0.55 * ti, 0.15);
        this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, -0.05 * ti, 0.15);
      } else {
        this._setWingTargets(0.15, 0.18 + flap * 0.18, 0);
        this._applyWingLerp(0.15);
      }

      // Solo en picada cae rápido; el resto desciende lento
      if (action === 'DIVE') {
        this.velocity.y -= CONFIG.gravity;
        if (this.velocity.y < -CONFIG.maxFallSpeed) this.velocity.y = -CONFIG.maxFallSpeed;
      } else if (action !== 'ASCEND') {
        this.velocity.y -= CONFIG.gravity * CONFIG.glideGravityFactor;
        const maxGlideFall = CONFIG.maxFallSpeed * 0.35;
        if (this.velocity.y < -maxGlideFall) this.velocity.y = -maxGlideFall;
      }

      const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const targetSpeed = (action === 'GLIDE' || action === 'ASCEND' || action === 'TURN_L' || action === 'TURN_R')
        ? CONFIG.glideSpeed : CONFIG.glideSpeed * 0.35;
      this.velocity.x += (forward.x * targetSpeed - this.velocity.x) * 0.09;
      this.velocity.z += (forward.z * targetSpeed - this.velocity.z) * 0.09;
    }

    this.tail.rotation.y = Math.sin(this.wingFlapPhase * 0.55) * 0.1;
    this.tail.rotation.x = (action === 'DIVE') ? 0.35 : Math.sin(this.wingFlapPhase * 0.3) * 0.05;
    this.tail.scale.z = (action === 'DIVE') ? THREE.MathUtils.lerp(this.tail.scale.z || 1, 0.75, 0.15) : THREE.MathUtils.lerp(this.tail.scale.z || 1, 1, 0.15);

    this.velocity.x *= CONFIG.drag;
    this.velocity.z *= CONFIG.drag;
    this.position.add(this.velocity);

    if (this.position.y < CONFIG.groundY) {
      this.position.y = CONFIG.groundY;
      this.velocity.y = Math.max(0, this.velocity.y);
    }
    if (this.position.y > 55) {
      this.position.y = 55;
      this.velocity.y = Math.min(0, this.velocity.y);
    }

    const half = CONFIG.worldSize * 0.48;
    if (this.position.x > half) {
      this.position.x = half;
      this.velocity.x = Math.min(0, this.velocity.x) * -0.2;
    } else if (this.position.x < -half) {
      this.position.x = -half;
      this.velocity.x = Math.max(0, this.velocity.x) * -0.2;
    }
    if (this.position.z > half) {
      this.position.z = half;
      this.velocity.z = Math.min(0, this.velocity.z) * -0.2;
    } else if (this.position.z < -half) {
      this.position.z = -half;
      this.velocity.z = Math.max(0, this.velocity.z) * -0.2;
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;

    if (this.state === 'FLYING' || this.state === 'TAKEOFF') {
      const ti = this.turnIntensity || 0;
      if (action === 'TURN_L') {
        this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -0.35 * ti, 0.12);
      } else if (action === 'TURN_R') {
        this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0.35 * ti, 0.12);
      } else if (action === 'DIVE') {
        this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0.85, 0.14); // inclinación fuerte hacia adelante
        // Alabeo muy leve al maniobrar en picada
        const bank = (leanFactor || 0) * 0.12;
        this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, bank, 0.1);
      } else {
        this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0, 0.08);
        this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, 0.08);
      }
    } else {
      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 0, 0.1);
      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, 0.1);
    }
  }
}
