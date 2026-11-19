/**
 * Detección de pose con TensorFlow.js Pose Detection (MoveNet)
 * Traduce los keypoints a las 4 acciones del juego.
 */

class PoseTracker {
  constructor() {
    this.detector = null;
    this.video = null;
    this.currentAction = 'NONE';
    this.debug = {};
    this.wristYHistory = [];
    this.ready = false;
    this.lastKeypoints = null;
    this.leanFactor = 0;
    this.fistPulse = false;
    this._wasClosed = false;
    this.headGrabPulse = false;
    this._wasHeadGrab = false;
    this.flapIntensity = 0;
    this.openArmsGrace = 0; // frames tras salir de picada sin contar aleteo
  }

  async init(videoElement) {
    this.video = videoElement;

    // Backend WebGL
    await tf.setBackend('webgl');
    await tf.ready();

    const model = poseDetection.SupportedModels.MoveNet;
    const detectorConfig = {
      modelType: poseDetection.movenet.modelType[CONFIG.modelType.replace('.', '_').toUpperCase()] 
                 || poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
    };

    this.detector = await poseDetection.createDetector(model, detectorConfig);
    this.ready = true;
    console.log('Pose detector listo (MoveNet)');
  }

  async update() {
    if (!this.ready || !this.video || this.video.readyState < 2) {
      return this.currentAction;
    }

    const poses = await this.detector.estimatePoses(this.video, {
      maxPoses: 1,
      flipHorizontal: true, // espejo natural
    });

    if (poses.length === 0) {
      this.currentAction = 'NONE';
      this.debug = {};
      this.lastKeypoints = null;
      this.leanFactor = 0;
      this.flapIntensity = 0;
      return this.currentAction;
    }

    const keypoints = poses[0].keypoints;
    this.lastKeypoints = keypoints;
    // MoveNet keypoints por nombre
    const get = (name) => keypoints.find(k => k.name === name);

    const leftShoulder  = get('left_shoulder');
    const rightShoulder = get('right_shoulder');
    const leftWrist     = get('left_wrist');
    const rightWrist    = get('right_wrist');
    const leftHip       = get('left_hip');
    const rightHip      = get('right_hip');

    // Más permisivo (poca luz / ropa oscura / piel oscura)
    const minScore = 0.12;
    const shoulderOk = leftShoulder && rightShoulder &&
      leftShoulder.score >= minScore && rightShoulder.score >= minScore;
    const wristsOk = leftWrist && rightWrist &&
      leftWrist.score >= minScore && rightWrist.score >= minScore;

    if (!shoulderOk) {
      this.currentAction = 'NONE';
      this.debug = { note: 'hombros poco visibles' };
      this.leanFactor = 0;
      return this.currentAction;
    }

    const w = this.video.videoWidth || CONFIG.videoWidth;
    const h = this.video.videoHeight || CONFIG.videoHeight;

    const ls = { x: leftShoulder.x / w, y: leftShoulder.y / h };
    const rs = { x: rightShoulder.x / w, y: rightShoulder.y / h };

    let lw, rw, wristDist = 0, wristHeightDiff = 0, avgWristY = 0.5;
    if (wristsOk) {
      lw = { x: leftWrist.x / w, y: leftWrist.y / h };
      rw = { x: rightWrist.x / w, y: rightWrist.y / h };
      wristDist = Math.abs(lw.x - rw.x);
      wristHeightDiff = Math.abs(lw.y - rw.y);
      avgWristY = (lw.y + rw.y) / 2;
    }

    // --- Inclinación mejorada (se actualiza cada frame) ---
    // 1) Diferencia vertical de hombros normalizada por ancho de hombros
    const shoulderWidth = Math.max(0.05, Math.abs(ls.x - rs.x));
    const shoulderTilt = (ls.y - rs.y) / shoulderWidth;

    // 2) Desplazamiento lateral torso (hombros vs cadera), si hay caderas
    let torsoLean = 0;
    if (leftHip && rightHip && leftHip.score >= minScore && rightHip.score >= minScore) {
      const midShX = (ls.x + rs.x) * 0.5;
      const midHipX = ((leftHip.x / w) + (rightHip.x / w)) * 0.5;
      torsoLean = (midShX - midHipX) / shoulderWidth;
    }

    // Combinar señales (invertido por cámara espejada)
    const leanRaw = (shoulderTilt * 0.65 + torsoLean * 0.35); // dirección natural (sin invertir)

    const leanThreshold = CONFIG.leanShoulderDiff || 0.05;
    const maxLean = CONFIG.maxLeanForFullTurn || 0.22;

    let targetLean = 0;
    const absRaw = Math.abs(leanRaw);
    if (absRaw > leanThreshold) {
      let mag = (absRaw - leanThreshold) / Math.max(0.04, maxLean - leanThreshold);
      mag = Math.max(0, Math.min(1, mag));
      // Respuesta más lineal para poder pasar de suave → medio → fuerte
      targetLean = Math.sign(leanRaw) * mag;
    }

    // Suavizado: permite subir/bajar la intensidad frame a frame
    const prev = this.leanFactor || 0;
    this.leanFactor = prev * 0.35 + targetLean * 0.65; // responde más rápido al cambiar inclinación

    // Brazos cerrados / abiertos (antes del historial de aleteo)
    const isClosedEarly = wristsOk && wristDist < CONFIG.closedArmsWristDistance;
    const isOpenEarly = wristsOk && wristDist > CONFIG.openArmsWristDistance * 0.75;

    if (isClosedEarly) {
      this.wristYHistory = [];
      this.flapIntensity = 0;
      this.openArmsGrace = 18;
    } else if (this._wasClosed && isOpenEarly) {
      this.wristYHistory = [];
      this.flapIntensity = 0;
      this.openArmsGrace = 18;
    }
    if (this.openArmsGrace > 0) this.openArmsGrace--;

    let flapMovement = 0;
    if (this.openArmsGrace <= 0 && !isClosedEarly) {
      this.wristYHistory.push(avgWristY);
      if (this.wristYHistory.length > CONFIG.flapHistorySize) {
        this.wristYHistory.shift();
      }
      if (this.wristYHistory.length >= CONFIG.flapHistorySize) {
        flapMovement = Math.max(...this.wristYHistory) - Math.min(...this.wristYHistory);
      }
    }

    const thr = CONFIG.flapMovementThreshold || 0.04;
    const maxFlap = CONFIG.flapMovementMax || 0.16;
    let fi = 0;
    if (this.openArmsGrace <= 0 && flapMovement > thr) {
      fi = (flapMovement - thr) / Math.max(0.02, maxFlap - thr);
      fi = Math.max(0, Math.min(1, fi));
    }
    const alphaUp = 0.45;
    const alphaDown = 0.25;
    const a = fi >= (this.flapIntensity || 0) ? alphaUp : alphaDown;
    this.flapIntensity = (this.flapIntensity || 0) * (1 - a) + fi * a;

    this.debug = {
      wristDist: wristDist.toFixed(3),
      leanRaw: leanRaw.toFixed(3),
      leanFactor: this.leanFactor.toFixed(2),
      flapMov: flapMovement.toFixed(3),
      flapInt: this.flapIntensity.toFixed(2),
      grace: String(this.openArmsGrace),
    };

    const isOpenStrict = wristsOk && wristDist > CONFIG.openArmsWristDistance &&
                         wristHeightDiff < CONFIG.maxWristHeightDiff;
    const isOpenForTurn = wristsOk && wristDist > CONFIG.openArmsWristDistance * 0.8;
    const isClosed = isClosedEarly;
    const ascendTrigger = (CONFIG.flapMovementThreshold || 0.04) * 1.15;
    const isFlapping = this.openArmsGrace <= 0 && flapMovement > ascendTrigger;
    const isLeanLeft  = this.leanFactor > 0.06;
    const isLeanRight = this.leanFactor < -0.06;

    const nose = get('nose');
    const leftEar = get('left_ear');
    const rightEar = get('right_ear');
    let handsOnHead = false;
    if (wristsOk && nose && nose.score >= minScore) {
      const nx = nose.x / w;
      const ny = nose.y / h;
      let hx = nx, hy = ny;
      if (leftEar && rightEar && leftEar.score >= minScore && rightEar.score >= minScore) {
        hx = ((leftEar.x / w) + (rightEar.x / w) + nx) / 3;
        hy = ((leftEar.y / h) + (rightEar.y / h) + ny) / 3;
      }
      const distL = Math.hypot(lw.x - hx, lw.y - hy);
      const distR = Math.hypot(rw.x - hx, rw.y - hy);
      const midShoulderY = (ls.y + rs.y) * 0.5;
      const nearHead = distL < 0.18 && distR < 0.18;
      const aboveShoulders = lw.y < midShoulderY - 0.02 && rw.y < midShoulderY - 0.02;
      handsOnHead = nearHead && aboveShoulders;
    }

    this.headGrabPulse = false;
    if (handsOnHead && !this._wasHeadGrab) {
      this.headGrabPulse = true;
    }
    this._wasHeadGrab = handsOnHead;
    this.debug.handsOnHead = handsOnHead ? '1' : '0';

    let action = 'NONE';
    if (handsOnHead) {
      action = 'NONE';
      this.leanFactor *= 0.3;
    } else if (isClosed) {
      action = 'DIVE';
    } else if (isOpenForTurn && isLeanLeft) {
      action = 'TURN_L';
    } else if (isOpenForTurn && isLeanRight) {
      action = 'TURN_R';
    } else if (isOpenStrict && isFlapping) {
      action = 'ASCEND';
    } else if (isOpenStrict) {
      action = 'GLIDE';
    }

    this._wasClosed = isClosed;
    this.currentAction = action;
    return action;
  }

  getLeanFactor() {
    return this.leanFactor || 0;
  }

  getFlapIntensity() {
    return this.flapIntensity || 0;
  }

  consumeHeadGrabPulse() {
    const v = !!this.headGrabPulse;
    this.headGrabPulse = false;
    return v;
  }

  getDebug() {
    return this.debug;
  }
}
