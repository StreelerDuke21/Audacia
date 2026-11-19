const CONFIG = {
  // Pose – por defecto ligero (Pi / rendimiento). En PC potente sube a Thunder + 1280x720
  videoWidth: 640,
  videoHeight: 480,
  modelType: 'SinglePose.Lightning',
  poseEveryNFrames: 2, // detectar cada N frames

  openArmsWristDistance: 0.42,
  closedArmsWristDistance: 0.20,
  maxWristHeightDiff: 0.15,
  leanShoulderDiff: 0.08,
  maxLeanForFullTurn: 0.45,
  turnSpeedMinFactor: 0.25,

  flapMovementThreshold: 0.04,
  flapMovementMax: 0.16, // aleteo amplio = elevación máxima
  flapHistorySize: 10,

  glideSpeed: 0.115,       // ~28% más lento
  ascendForce: 0.030,       // impulso base por frame al aletear
  ascendPower: 1.55,        // >1 = aleteo suave eleva poco; fuerte sí sube
  ascendMinMul: 0.08,       // mínimo % de ascendForce en aleteo apenas detectable
  ascendMaxClimbMin: 0.035, // techo de vy con aleteo mínimo
  ascendMaxClimbRange: 0.15, // techo extra de vy con aleteo máximo (~0.25)

  diveForce: 0.055,
  turnSpeed: 0.021,
  gravity: 0.009,
  glideGravityFactor: 0.28,
  maxFallSpeed: 0.28,
  drag: 0.985,

  groundY: 1.6,
  walkSpeed: 0.040,
  takeoffForce: 0.042,
  takeoffDuration: 55,
  flapsNeededToTakeoff: 3,
  flapCooldownFrames: 12,
  pauseFistCount: 3,
  pauseFistWindowMs: 2500,
  pauseFistCooldownMs: 280,

  treeCollisionRadius: 1.8,
  treeCollisionRadiusGround: 0.7,
  collisionPushBack: 1.4,

  ringCount: 12,
  ringRadius: 3.2,
  ringTube: 0.28,
  ringSpacing: 28,

  cameraDistance: 12,
  cameraHeight: 3.5,
  cameraLookAhead: 2.8,
  cameraLerp: 0.055,     // cámara un poco más suave

  worldSize: 320,

  // Render
  pixelRatioMax: 1,
  enableShadows: false, // sin sombras (más FPS)
  billboardMaxDist: 140, // árboles/nubes más lejos no se dibujan

  // El loop de pose corre desacoplado del render loop (ver main.js), a este
  // intervalo en ms. poseEveryNFrames se mantiene solo como referencia de
  // la frecuencia deseada (asumiendo 60fps de render): N=2 -> ~30Hz.
  poseIntervalMs: Math.round((1000 / 60) * 2),
};
