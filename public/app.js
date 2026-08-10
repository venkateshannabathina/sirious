(function () {
  'use strict';

  const DEFAULT_MODEL = '/assets/models/cc3_master.glb';
  const DEFAULT_STANDING_POSE = '/assets/animations/female_standing_baked.glb';
  const ENVIRONMENT = '/assets/environment/studio_1k.hdr';
  const MAX_LOCAL_MODEL_BYTES = 512 * 1024 * 1024;
  const MAIN_INTERFACE_CAMERA = Object.freeze({
    position: [-0.0723844704365821, 1.555924939681181, 0.5614867515643476],
    target: [-0.07032106307009192, 1.5838371864144523, -0.01638891297256201],
  });
  const FILTER_NAMES = Object.freeze([
    'Clean',
    'System Error',
    'Pixel Grid',
    'Red Protocol',
    'Neon Contour',
  ]);
  const ARKIT_GROUPS = Object.freeze([
    { name: 'Brows', channels: ['A01_Brow_Inner_Up', 'A02_Brow_Down_Left', 'A03_Brow_Down_Right', 'A04_Brow_Outer_Up_Left', 'A05_Brow_Outer_Up_Right'] },
    { name: 'Eyes', channels: ['A06_Eye_Look_Up_Left', 'A07_Eye_Look_Up_Right', 'A08_Eye_Look_Down_Left', 'A09_Eye_Look_Down_Right', 'A10_Eye_Look_Out_Left', 'A11_Eye_Look_In_Left', 'A12_Eye_Look_In_Right', 'A13_Eye_Look_Out_Right', 'A14_Eye_Blink_Left', 'A15_Eye_Blink_Right', 'A16_Eye_Squint_Left', 'A17_Eye_Squint_Right', 'A18_Eye_Wide_Left', 'A19_Eye_Wide_Right'] },
    { name: 'Cheeks + Nose', channels: ['A20_Cheek_Puff', 'A21_Cheek_Squint_Left', 'A22_Cheek_Squint_Right', 'A23_Nose_Sneer_Left', 'A24_Nose_Sneer_Right'] },
    { name: 'Jaw', channels: ['A25_Jaw_Open', 'A26_Jaw_Forward', 'A27_Jaw_Left', 'A28_Jaw_Right'] },
    { name: 'Mouth', channels: ['A29_Mouth_Funnel', 'A30_Mouth_Pucker', 'A31_Mouth_Left', 'A32_Mouth_Right', 'A33_Mouth_Roll_Upper', 'A34_Mouth_Roll_Lower', 'A35_Mouth_Shrug_Upper', 'A36_Mouth_Shrug_Lower', 'A37_Mouth_Close', 'A38_Mouth_Smile_Left', 'A39_Mouth_Smile_Right', 'A40_Mouth_Frown_Left', 'A41_Mouth_Frown_Right', 'A42_Mouth_Dimple_Left', 'A43_Mouth_Dimple_Right', 'A44_Mouth_Upper_Up_Left', 'A45_Mouth_Upper_Up_Right', 'A46_Mouth_Lower_Down_Left', 'A47_Mouth_Lower_Down_Right', 'A48_Mouth_Press_Left', 'A49_Mouth_Press_Right', 'A50_Mouth_Stretch_Left', 'A51_Mouth_Stretch_Right'] },
    { name: 'Tongue', channels: ['A52_Tongue_Out'] },
  ]);
  const ARKIT_CHANNELS = Object.freeze(ARKIT_GROUPS.flatMap((group) => group.channels));
  const HEAD_CONTROLS = Object.freeze([
    { id: 'headYaw', label: 'Head yaw', bone: 'head', axis: 'y', min: -30, max: 30 },
    { id: 'headPitch', label: 'Head pitch', bone: 'head', axis: 'x', min: -22, max: 22 },
    { id: 'headRoll', label: 'Head roll', bone: 'head', axis: 'z', min: -22, max: 22 },
    { id: 'neckYaw', label: 'Neck yaw', bone: 'neck', axis: 'y', min: -18, max: 18 },
    { id: 'neckPitch', label: 'Neck pitch', bone: 'neck', axis: 'x', min: -14, max: 14 },
    { id: 'neckRoll', label: 'Neck roll', bone: 'neck', axis: 'z', min: -14, max: 14 },
  ]);
  const EYE_BONE_CONTROLS = Object.freeze([
    { id: 'eyeYaw', label: 'Coordinated gaze left ↔ right', min: -30, max: 30 },
    { id: 'eyePitch', label: 'Eye aim vertical', min: -20, max: 20 },
    { id: 'eyeConvergence', label: 'Near focus', min: 0, max: 12 },
    { id: 'leftEyeYaw', label: 'Left eye horizontal trim', min: -10, max: 10 },
    { id: 'rightEyeYaw', label: 'Right eye horizontal trim', min: -10, max: 10 },
    { id: 'leftEyePitch', label: 'Left eye vertical trim', min: -10, max: 10 },
    { id: 'rightEyePitch', label: 'Right eye vertical trim', min: -10, max: 10 },
  ]);
  const LIVING_IDLE_RECIPES = Object.freeze([
    {
      name: 'soft focus',
      weights: { A16_Eye_Squint_Left: 0.018, A17_Eye_Squint_Right: 0.023, A21_Cheek_Squint_Left: 0.010 },
    },
    {
      name: 'quiet curiosity',
      weights: { A18_Eye_Wide_Left: 0.010, A21_Cheek_Squint_Left: 0.008 },
    },
    {
      name: 'left eye settle',
      weights: { A21_Cheek_Squint_Left: 0.009, A16_Eye_Squint_Left: 0.010 },
    },
    {
      name: 'right eye settle',
      weights: { A22_Cheek_Squint_Right: 0.009, A17_Eye_Squint_Right: 0.010 },
    },
    {
      name: 'thought flicker',
      weights: { A16_Eye_Squint_Left: 0.009, A17_Eye_Squint_Right: 0.006 },
    },
    {
      name: 'facial settle',
      weights: { A17_Eye_Squint_Right: 0.012, A22_Cheek_Squint_Right: 0.007 },
    },
  ]);
  const IDLE_BROW_RECIPES = Object.freeze([
    { name: 'attention lift', weights: { A04_Brow_Outer_Up_Left: 0.024, A05_Brow_Outer_Up_Right: 0.021 } },
    { name: 'soft curiosity', weights: { A01_Brow_Inner_Up: 0.022, A04_Brow_Outer_Up_Left: 0.010, A05_Brow_Outer_Up_Right: 0.013 } },
    { name: 'thought focus', weights: { A02_Brow_Down_Left: 0.014, A03_Brow_Down_Right: 0.016 } },
  ]);
  const IDLE_MOUTH_RECIPES = Object.freeze([
    { name: 'lip press release', weights: { A48_Mouth_Press_Left: 0.014, A49_Mouth_Press_Right: 0.012 } },
    { name: 'left private smile', weights: { A38_Mouth_Smile_Left: 0.024, A42_Mouth_Dimple_Left: 0.012, A21_Cheek_Squint_Left: 0.007 } },
    { name: 'right private smile', weights: { A39_Mouth_Smile_Right: 0.024, A43_Mouth_Dimple_Right: 0.012, A22_Cheek_Squint_Right: 0.007 } },
    { name: 'mouth corner settle', weights: { A40_Mouth_Frown_Left: 0.010, A41_Mouth_Frown_Right: 0.007 } },
    { name: 'suppressed smile', weights: { A38_Mouth_Smile_Left: 0.021, A39_Mouth_Smile_Right: 0.025, A42_Mouth_Dimple_Left: 0.008, A43_Mouth_Dimple_Right: 0.010, A21_Cheek_Squint_Left: 0.006, A22_Cheek_Squint_Right: 0.007 } },
  ]);
  const IDLE_LIP_READJUSTMENT = Object.freeze({
    name: 'lip readjustment',
    weights: { A30_Mouth_Pucker: 0.006, A33_Mouth_Roll_Upper: 0.010, A34_Mouth_Roll_Lower: 0.008 },
  });
  const IDLE_MOUTH_CHANNELS = Object.freeze(Array.from(new Set([
    ...IDLE_MOUTH_RECIPES.flatMap((recipe) => Object.keys(recipe.weights)),
    ...Object.keys(IDLE_LIP_READJUSTMENT.weights),
  ])));
  const IDLE_OWNED_CHANNELS = Object.freeze(Array.from(new Set([
    ...LIVING_IDLE_RECIPES.flatMap((recipe) => Object.keys(recipe.weights)),
    ...IDLE_BROW_RECIPES.flatMap((recipe) => Object.keys(recipe.weights)),
    ...IDLE_MOUTH_CHANNELS,
    'A06_Eye_Look_Up_Left', 'A07_Eye_Look_Up_Right',
    'A08_Eye_Look_Down_Left', 'A09_Eye_Look_Down_Right',
    'A10_Eye_Look_Out_Left', 'A11_Eye_Look_In_Left',
    'A12_Eye_Look_In_Right', 'A13_Eye_Look_Out_Right',
    'A14_Eye_Blink_Left', 'A15_Eye_Blink_Right',
  ])));
  const SPEECH_VISEME_RECIPES = Object.freeze({
    AA: { A25_Jaw_Open: 0.56, A44_Mouth_Upper_Up_Left: 0.15, A45_Mouth_Upper_Up_Right: 0.15, A46_Mouth_Lower_Down_Left: 0.20, A47_Mouth_Lower_Down_Right: 0.20 },
    E: { A25_Jaw_Open: 0.24, A38_Mouth_Smile_Left: 0.11, A39_Mouth_Smile_Right: 0.11, A50_Mouth_Stretch_Left: 0.38, A51_Mouth_Stretch_Right: 0.38 },
    I: { A25_Jaw_Open: 0.19, A38_Mouth_Smile_Left: 0.14, A39_Mouth_Smile_Right: 0.14, A50_Mouth_Stretch_Left: 0.34, A51_Mouth_Stretch_Right: 0.34 },
    O: { A25_Jaw_Open: 0.40, A29_Mouth_Funnel: 0.60, A30_Mouth_Pucker: 0.32 },
    WQ: { A25_Jaw_Open: 0.15, A29_Mouth_Funnel: 0.48, A30_Mouth_Pucker: 0.72 },
    PBM: { A25_Jaw_Open: 0.015, A37_Mouth_Close: 0.92, A48_Mouth_Press_Left: 0.34, A49_Mouth_Press_Right: 0.34 },
    FV: { A25_Jaw_Open: 0.10, A34_Mouth_Roll_Lower: 0.34, A44_Mouth_Upper_Up_Left: 0.10, A45_Mouth_Upper_Up_Right: 0.10 },
    TH: { A25_Jaw_Open: 0.18, A46_Mouth_Lower_Down_Left: 0.10, A47_Mouth_Lower_Down_Right: 0.10, A52_Tongue_Out: 0.10 },
    TD: { A25_Jaw_Open: 0.16, A50_Mouth_Stretch_Left: 0.12, A51_Mouth_Stretch_Right: 0.12 },
    KG: { A25_Jaw_Open: 0.27, A35_Mouth_Shrug_Upper: 0.09 },
    SZ: { A25_Jaw_Open: 0.11, A50_Mouth_Stretch_Left: 0.28, A51_Mouth_Stretch_Right: 0.28 },
    SH: { A25_Jaw_Open: 0.18, A29_Mouth_Funnel: 0.30, A30_Mouth_Pucker: 0.20 },
    R: { A25_Jaw_Open: 0.17, A29_Mouth_Funnel: 0.17, A30_Mouth_Pucker: 0.30 },
    L: { A25_Jaw_Open: 0.25, A50_Mouth_Stretch_Left: 0.10, A51_Mouth_Stretch_Right: 0.10, A52_Tongue_Out: 0.055 },
  });
  const SPEECH_CHANNELS = Object.freeze(Array.from(new Set(
    Object.values(SPEECH_VISEME_RECIPES).flatMap((recipe) => Object.keys(recipe)),
  )));
  const state = {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    model: null,
    mixer: null,
    ground: null,
    quality: 'peak',
    frame: null,
    lastTime: performance.now(),
    fpsSamples: [],
    renderScale: 1,
    modelUrl: DEFAULT_MODEL,
    objectUrl: null,
    loadGeneration: 0,
    cameraLocked: true,
    filterMode: 0,
    post: null,
    arkit: {
      channels: new Map(),
      values: Object.create(null),
      headValues: Object.create(null),
      eyeValues: Object.create(null),
      head: null,
      neck: null,
      jaw: null,
      leftEye: null,
      rightEye: null,
      headBase: null,
      neckBase: null,
      jawBaseQuaternion: null,
      jawBasePosition: null,
      leftEyeBase: null,
      rightEyeBase: null,
      eyebrowMorphs: [],
      panelOpen: false,
      cameraSnapshot: null,
      autoTestRun: 0,
    },
    expression: {
      enabled: true,
      mode: 'idle',
      values: Object.create(null),
      headValues: Object.create(null),
      micro: null,
      brow: null,
      mouth: null,
      blink: null,
      gaze: { x: 0, y: 0, targetX: 0, targetY: 0 },
      body: { bones: Object.create(null), bases: Object.create(null), breath: 0 },
      nextMicroAt: 0,
      nextBrowAt: 0,
      nextMouthAt: 0,
      nextLipReadjustAt: 0,
      nextBlinkAt: 0,
      nextGazeAt: 0,
      lastDiagnosticAt: 0,
    },
    speech: {
      active: false,
      mode: 'idle',
      audio: null,
      cues: [],
      values: Object.create(null),
      currentViseme: 'SIL',
      generation: 0,
      settle: null,
      lastDiagnosticAt: 0,
    },
    clothing: {
      bra: { nodes: [], hidden: false, removed: false },
      underwear: { nodes: [], hidden: false, removed: false },
    },
  };
  // Read-only runtime diagnostics for browser QA and future simulation tooling.
  window.__sirious = state;

  const ui = {
    viewport: document.getElementById('viewport'),
    loadingCard: document.getElementById('loading-card'),
    loadingTitle: document.getElementById('loading-title'),
    loadingDetail: document.getElementById('loading-detail'),
    progressBar: document.getElementById('progress-bar'),
    progressLabel: document.getElementById('progress-label'),
    errorCard: document.getElementById('error-card'),
    errorMessage: document.getElementById('error-message'),
    renderStatus: document.getElementById('render-status'),
    resolution: document.getElementById('resolution-value'),
    renderer: document.getElementById('renderer-value'),
    geometry: document.getElementById('geometry-value'),
    textures: document.getElementById('texture-value'),
    settingsPanel: document.getElementById('settings-panel'),
    settingsToggle: document.getElementById('settings-toggle'),
    settingsClose: document.getElementById('settings-close'),
    qualitySelect: document.getElementById('quality-select'),
    shadowsToggle: document.getElementById('shadows-toggle'),
    exposureRange: document.getElementById('exposure-range'),
    exposureValue: document.getElementById('exposure-value'),
    modelInput: document.getElementById('model-input'),
    cameraLockToggle: document.getElementById('camera-lock-toggle'),
    filterButtons: Array.from(document.querySelectorAll('.filter-button')),
    activeFilterLabel: document.getElementById('active-filter-label'),
    arkitOpen: document.getElementById('arkit-open'),
    arkitClose: document.getElementById('arkit-close'),
    arkitPanel: document.getElementById('arkit-panel'),
    arkitControls: document.getElementById('arkit-controls'),
    arkitStatus: document.getElementById('arkit-status'),
    arkitLaunchStatus: document.getElementById('arkit-launch-status'),
    arkitReset: document.getElementById('arkit-reset'),
    arkitTestAll: document.getElementById('arkit-test-all'),
    expressionToggle: document.getElementById('expression-idle-toggle'),
    expressionStatus: document.getElementById('expression-idle-status'),
    clothing: {
      bra: {
        visibility: document.getElementById('bra-visibility'),
        remove: document.getElementById('bra-remove'),
        state: document.getElementById('bra-state'),
      },
      underwear: {
        visibility: document.getElementById('underwear-visibility'),
        remove: document.getElementById('underwear-remove'),
        state: document.getElementById('underwear-state'),
      },
    },
  };

  function setProgress(percent, detail) {
    const value = Math.max(0, Math.min(100, Math.round(percent || 0)));
    ui.progressBar.style.width = `${value}%`;
    ui.progressLabel.textContent = `${value}%`;
    if (detail) ui.loadingDetail.textContent = detail;
  }

  function setViewerState(value, detail) {
    document.body.dataset.viewerState = value;
    document.body.dataset.viewerDetail = detail || '';
  }

  function showError(error) {
    const message = error && error.message ? error.message : String(error);
    console.error('[Sirious] Viewer error:', error);
    setViewerState('error', message);
    ui.loadingCard.classList.add('is-complete');
    ui.errorMessage.textContent = message;
    ui.errorCard.hidden = false;
    ui.renderStatus.textContent = 'Load failed';
  }

  function initRenderer() {
    if (!window.WebGLRenderingContext || !THREE) {
      throw new Error('This browser does not provide the WebGL features required by the viewer.');
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
      stencil: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', 'Sirious interactive CC3 character');
    ui.viewport.appendChild(renderer.domElement);
    state.renderer = renderer;

    const gl = renderer.getContext();
    const rendererName = gl.getParameter(gl.RENDERER) || 'WebGL';
    ui.renderer.textContent = rendererName.replace(/^ANGLE \(/, '').replace(/\)$/, '');
    applyQuality('peak');
  }

  function createCodeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.font = '22px ui-monospace, SFMono-Regular, Menlo, monospace';
    const lines = [
      'fatal system error 0xF1534',
      'creating memory grid and topology',
      'stop error while rendering frame',
      'hardware or software exception',
      'select recovery options then continue',
      'data stack 0000 00A1 FF3E',
      'another component failed verification',
      'kernel trace 4F 7A 19 00 CE',
      'manual override unavailable',
      'render protocol interrupted',
      'reconstructing visual signal',
      'warning: entity map incomplete',
    ];
    for (let y = 28, row = 0; y < canvas.height + 30; y += 34, row += 1) {
      const line = lines[row % lines.length];
      const offset = row % 3 === 0 ? -120 : row % 3 === 1 ? 15 : 110;
      context.fillText(line, offset, y);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  function initPostProcessing() {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    });
    const uniforms = {
      tDiffuse: { value: target.texture },
      tCode: { value: createCodeTexture() },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMode: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tDiffuse;
        uniform sampler2D tCode;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uMode;
        varying vec2 vUv;

        float luminance(vec3 color) {
          return dot(color, vec3(0.2126, 0.7152, 0.0722));
        }

        float hash21(vec2 point) {
          point = fract(point * vec2(123.34, 456.21));
          point += dot(point, point + 45.32);
          return fract(point.x * point.y);
        }

        float edgeStrength(vec2 uv) {
          vec2 pixel = 1.0 / uResolution;
          float tl = luminance(texture2D(tDiffuse, uv + pixel * vec2(-1.0, 1.0)).rgb);
          float tc = luminance(texture2D(tDiffuse, uv + pixel * vec2(0.0, 1.0)).rgb);
          float tr = luminance(texture2D(tDiffuse, uv + pixel * vec2(1.0, 1.0)).rgb);
          float ml = luminance(texture2D(tDiffuse, uv + pixel * vec2(-1.0, 0.0)).rgb);
          float mr = luminance(texture2D(tDiffuse, uv + pixel * vec2(1.0, 0.0)).rgb);
          float bl = luminance(texture2D(tDiffuse, uv + pixel * vec2(-1.0, -1.0)).rgb);
          float bc = luminance(texture2D(tDiffuse, uv + pixel * vec2(0.0, -1.0)).rgb);
          float br = luminance(texture2D(tDiffuse, uv + pixel * vec2(1.0, -1.0)).rgb);
          float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
          float gy = tl + 2.0 * tc + tr - bl - 2.0 * bc - br;
          return clamp(length(vec2(gx, gy)) * 1.7, 0.0, 1.0);
        }

        vec3 systemError(vec2 uv, vec3 source) {
          float light = luminance(source);
          float subject = smoothstep(0.045, 0.18, light);
          vec3 background = vec3(0.055, 0.095, 0.07) + vec3(light * 0.23, light * 0.36, light * 0.24);
          vec3 blueFigure = vec3(0.015, 0.005, 0.72) * (0.78 + light * 0.45);
          vec2 codeUv = vec2(uv.x * 1.08, uv.y * 1.75 - uTime * 0.025);
          float code = texture2D(tCode, codeUv).r;
          float scan = 0.96 + 0.04 * sin(gl_FragCoord.y * 2.1);
          vec3 result = mix(background, blueFigure, subject);
          result += vec3(0.95) * code * subject * 0.92;
          return result * scan;
        }

        vec3 pixelGrid(vec2 uv) {
          float cellSize = 11.0;
          vec2 pixelPosition = uv * uResolution;
          vec2 cell = floor(pixelPosition / cellSize);
          vec2 sampleUv = (cell * cellSize + cellSize * 0.5) / uResolution;
          vec3 source = texture2D(tDiffuse, sampleUv).rgb;
          source = floor(source * 6.0) / 6.0;
          float light = luminance(source);
          vec3 pink = source * vec3(1.22, 0.75, 0.78) + vec3(0.035, 0.008, 0.025);
          pink = mix(vec3(light * 0.78, light * 0.42, light * 0.48), pink, 0.62);
          vec2 inside = fract(pixelPosition / cellSize);
          float grid = step(0.105, inside.x) * step(0.105, inside.y);
          grid *= step(inside.x, 0.895) * step(inside.y, 0.895);
          return pink * mix(0.09, 1.0, grid);
        }

        vec3 redProtocol(vec2 uv, vec3 source) {
          float light = luminance(source);
          float subject = smoothstep(0.035, 0.16, light);
          float edge = edgeStrength(uv);
          vec2 codeUv = vec2(uv.x * 1.7, uv.y * 2.2 - uTime * 0.035);
          float code = texture2D(tCode, codeUv).r;
          vec2 microCell = floor(gl_FragCoord.xy / 3.0);
          float stipple = step(0.48, hash21(microCell));
          vec3 figure = vec3(1.0, 0.74, 0.72) * subject * (0.20 + 0.72 * max(code, stipple * light));
          vec3 redStructure = vec3(0.93, 0.0, 0.025) * (edge * 1.45 + code * (1.0 - subject) * 0.50);

          vec2 ratio = vec2(uResolution.x / uResolution.y, 1.0);
          vec2 center = (uv - vec2(0.5, 0.18)) * ratio;
          float radius = length(center);
          float ring = 1.0 - smoothstep(0.155, 0.165, abs(radius - 0.17));
          float angle = atan(center.y, center.x);
          float rays = step(0.72, sin(angle * 54.0 + radius * 130.0)) * smoothstep(0.29, 0.17, radius);
          vec3 glyph = vec3(0.82, 0.0, 0.015) * (ring + rays * 0.32) * (1.0 - subject * 0.6);
          return figure + redStructure + glyph;
        }

        vec3 neonContour(vec2 uv) {
          float jitter = sin(uv.y * 96.0 + uTime * 1.8) * 0.0018;
          jitter += (hash21(vec2(floor(uv.y * 180.0), floor(uTime * 8.0))) - 0.5) * 0.0012;
          vec2 displacedUv = uv + vec2(jitter, 0.0);
          vec3 source = texture2D(tDiffuse, displacedUv).rgb;
          float light = luminance(source);
          float subject = smoothstep(0.025, 0.15, light);
          float edge = edgeStrength(displacedUv);
          float terrain = sin(
            displacedUv.y * 155.0
            + sin(displacedUv.x * 29.0) * 4.0
            + light * 24.0
          );
          float contour = smoothstep(0.74, 0.96, terrain) * subject;
          float fineDots = step(0.78, hash21(floor(gl_FragCoord.xy / 4.0))) * subject * 0.38;
          float scan = 0.88 + 0.12 * sin(gl_FragCoord.y * 1.35 + uTime * 3.0);
          vec3 magentaFog = vec3(0.44, 0.015, 0.36) * (0.22 + 0.30 * (1.0 - uv.y));
          magentaFog *= 1.0 - smoothstep(0.0, 0.75, distance(uv, vec2(0.50, 0.48)));
          vec3 blueBody = vec3(0.015, 0.06, 0.56) * subject * (0.52 + light);
          vec3 cyanLines = vec3(0.73, 0.98, 1.0) * (edge * 1.8 + contour * 1.35 + fineDots);
          vec3 glow = vec3(0.05, 0.30, 1.0) * edge * 0.75;
          return (magentaFog + blueBody + cyanLines + glow) * scan;
        }

        void main() {
          vec3 source = texture2D(tDiffuse, vUv).rgb;
          vec3 result = source;
          if (uMode > 0.5 && uMode < 1.5) result = systemError(vUv, source);
          else if (uMode > 1.5 && uMode < 2.5) result = pixelGrid(vUv);
          else if (uMode > 2.5 && uMode < 3.5) result = redProtocol(vUv, source);
          else if (uMode > 3.5) result = neonContour(vUv);

          float grain = (hash21(gl_FragCoord.xy + uTime * 43.0) - 0.5) * 0.025;
          float vignette = smoothstep(0.95, 0.24, distance(vUv, vec2(0.5)));
          result = max(vec3(0.0), result + grain);
          result *= mix(0.72, 1.0, vignette);
          gl_FragColor = vec4(result, 1.0);
        }
      `,
    });
    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    postScene.add(quad);
    state.post = { target, uniforms, material, scene: postScene, camera: postCamera, quad };
    resizePostTarget();
  }

  function resizePostTarget() {
    if (!state.post || !state.renderer) return;
    const size = new THREE.Vector2();
    state.renderer.getDrawingBufferSize(size);
    state.post.target.setSize(Math.max(1, Math.round(size.x)), Math.max(1, Math.round(size.y)));
    state.post.uniforms.uResolution.value.copy(size);
  }

  function initScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070b, 0.022);
    state.scene = scene;

    const camera = new THREE.PerspectiveCamera(31, window.innerWidth / window.innerHeight, 0.01, 500);
    camera.position.set(0.85, 1.25, 3.2);
    state.camera = camera;

    const controls = new THREE.OrbitControls(camera, state.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.75;
    controls.panSpeed = 0.45;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.74;
    controls.screenSpacePanning = true;
    controls.target.set(0, 1.05, 0);
    state.controls = controls;

    scene.add(new THREE.HemisphereLight(0xa9c7e5, 0x141018, 0.52));

    const key = new THREE.DirectionalLight(0xffe8d8, 3.15);
    key.name = 'Key_Light';
    key.position.set(2.8, 4.6, 3.7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 16;
    key.shadow.camera.left = -2.2;
    key.shadow.camera.right = 2.2;
    key.shadow.camera.top = 3.2;
    key.shadow.camera.bottom = -0.5;
    key.shadow.bias = -0.00015;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x78b8ff, 1.1);
    fill.name = 'Fill_Light';
    fill.position.set(-3.4, 2.4, 2.0);
    scene.add(fill);

    const rim = new THREE.SpotLight(0x8bd7ff, 3.4, 10, Math.PI * 0.22, 0.68, 1.4);
    rim.name = 'Rim_Light';
    rim.position.set(-2.4, 3.4, -2.8);
    rim.target.position.set(0, 1.1, 0);
    scene.add(rim, rim.target);

    const warmRim = new THREE.SpotLight(0xffb48e, 1.5, 9, Math.PI * 0.2, 0.75, 1.5);
    warmRim.position.set(2.8, 2.2, -2.0);
    warmRim.target.position.set(0, 1.0, 0);
    scene.add(warmRim, warmRim.target);

    const groundMaterial = new THREE.ShadowMaterial({ color: 0x020306, opacity: 0.62 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(3.8, 96), groundMaterial);
    ground.name = 'Shadow_Ground';
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    state.ground = ground;
  }

  function loadEnvironment() {
    return new Promise((resolve) => {
      new THREE.RGBELoader().setDataType(THREE.UnsignedByteType).load(
        ENVIRONMENT,
        (texture) => {
          const pmrem = new THREE.PMREMGenerator(state.renderer);
          pmrem.compileEquirectangularShader();
          const envMap = pmrem.fromEquirectangular(texture).texture;
          state.scene.environment = envMap;
          texture.dispose();
          pmrem.dispose();
          resolve();
        },
        undefined,
        (error) => {
          console.warn('[Sirious] HDR environment unavailable; studio lights remain active.', error);
          resolve();
        },
      );
    });
  }

  function disposeMaterial(material) {
    if (!material) return;
    Object.keys(material).forEach((key) => {
      const value = material[key];
      if (value && value.isTexture) value.dispose();
    });
    material.dispose();
  }

  function disposeModelRoot(root) {
    if (!root) return;
    root.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
      else disposeMaterial(object.material);
    });
  }

  function clearCurrentModel() {
    if (!state.model) return;
    stopSpeech('model-change', true);
    if (state.arkit.panelOpen) setARKitPanel(false);
    resetARKitRig();
    state.arkit.channels.clear();
    state.arkit.head = null;
    state.arkit.neck = null;
    state.arkit.jaw = null;
    state.arkit.leftEye = null;
    state.arkit.rightEye = null;
    state.arkit.headBase = null;
    state.arkit.neckBase = null;
    state.arkit.jawBaseQuaternion = null;
    state.arkit.jawBasePosition = null;
    state.arkit.leftEyeBase = null;
    state.arkit.rightEyeBase = null;
    clearExpressionLayer(true);
    state.expression.body.bones = Object.create(null);
    state.expression.body.bases = Object.create(null);
    updateARKitStatus('Waiting for the CC3 face');
    state.scene.remove(state.model);
    disposeModelRoot(state.model);
    state.model = null;
    state.mixer = null;
  }

  const CLOTHING_RULES = Object.freeze({
    bra: { objectName: 'Bra', materialName: 'Bra' },
    underwear: { objectName: 'Underwear_Bottoms', materialName: 'Underwear_Bottoms' },
  });

  function objectUsesMaterial(object, materialName) {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    return materials.some((material) => material && material.name === materialName);
  }

  function updateClothingDiagnostics() {
    const snapshot = {};
    for (const key of Object.keys(CLOTHING_RULES)) {
      const item = state.clothing[key];
      const controls = ui.clothing[key];
      const available = item.nodes.length > 0 && !item.removed;
      controls.visibility.disabled = !available;
      controls.remove.disabled = !available;
      controls.visibility.textContent = item.hidden ? 'Show' : 'Hide';
      controls.visibility.setAttribute(
        'aria-label',
        `${item.hidden ? 'Show' : 'Hide'} ${key === 'bra' ? 'bra' : 'underwear'}`,
      );
      controls.state.textContent = item.removed
        ? 'Removed until reload'
        : item.hidden
          ? 'Hidden'
          : available
            ? 'Visible'
            : 'Not found';
      snapshot[key] = {
        nodes: item.nodes.length,
        hidden: item.hidden,
        removed: item.removed,
      };
    }
    document.body.dataset.clothingState = JSON.stringify(snapshot);
  }

  function registerClothing(root) {
    for (const [key, rule] of Object.entries(CLOTHING_RULES)) {
      const nodes = [];
      root.traverse((object) => {
        if ((!object.isMesh && !object.isSkinnedMesh) || nodes.includes(object)) return;
        if (object.name === rule.objectName || objectUsesMaterial(object, rule.materialName)) {
          nodes.push(object);
        }
      });
      state.clothing[key] = { nodes, hidden: false, removed: false };
    }
    updateClothingDiagnostics();
  }

  function toggleClothing(key) {
    const item = state.clothing[key];
    if (!item || item.removed || !item.nodes.length) return;
    item.hidden = !item.hidden;
    item.nodes.forEach((object) => { object.visible = !item.hidden; });
    updateClothingDiagnostics();
  }

  function removeClothing(key) {
    const item = state.clothing[key];
    if (!item || item.removed || !item.nodes.length) return;
    const geometries = new Set();
    const materials = new Set();
    item.nodes.forEach((object) => {
      if (object.geometry) geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => { if (material) materials.add(material); });
      object.parent?.remove(object);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach(disposeMaterial);
    item.hidden = false;
    item.removed = true;
    updateClothingDiagnostics();
  }

  function classifyMaterial(material, objectName) {
    const text = `${material.name || ''} ${objectName || ''}`.toLowerCase();
    if (/skin|body|head|arm|leg|nail/.test(text)) return 'skin';
    if (/eye(?!lash)|cornea|tear/.test(text)) return 'eye';
    if (/lash|brow|hair/.test(text)) return 'hair';
    if (/teeth|tongue|mouth/.test(text)) return 'oral';
    return 'default';
  }

  function tuneMaterial(material, objectName) {
    if (!material) return;
    const role = classifyMaterial(material, objectName);
    const maxAnisotropy = state.renderer.capabilities.getMaxAnisotropy();
    const textureSlots = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'emissiveMap'];
    textureSlots.forEach((slot) => {
      const texture = material[slot];
      if (!texture) return;
      texture.anisotropy = maxAnisotropy;
      if (slot === 'map' || slot === 'emissiveMap') texture.encoding = THREE.sRGBEncoding;
      texture.needsUpdate = true;
    });
    material.envMapIntensity = role === 'eye' ? 1.35 : role === 'skin' ? 0.55 : 0.82;
    if (role === 'skin') {
      material.roughness = Math.max(0.46, material.roughness == null ? 0.55 : material.roughness);
      material.metalness = 0;
    } else if (role === 'eye') {
      material.roughness = Math.min(0.18, material.roughness == null ? 0.12 : material.roughness);
      material.metalness = 0;
    } else if (role === 'hair') {
      material.side = THREE.DoubleSide;
      material.alphaTest = Math.max(material.alphaTest || 0, 0.08);
    } else if (role === 'oral') {
      material.roughness = Math.min(0.38, material.roughness == null ? 0.32 : material.roughness);
      material.metalness = 0;
    }
    material.needsUpdate = true;
  }

  function inspectAndTune(root) {
    let meshes = 0;
    let vertices = 0;
    let textureCount = 0;
    const textureSet = new Set();
    root.traverse((object) => {
      if (!object.isMesh && !object.isSkinnedMesh) return;
      meshes += 1;
      // The separate CC3 brow cards sit just above the forehead. Letting them
      // cast a high-resolution shadow produces a second, reddish eyebrow that
      // visibly separates from the real brow during A01-A05 deformation.
      const isEyebrowCard = /^Female_Angled(?:_|$)/.test(object.name || '');
      object.castShadow = !isEyebrowCard;
      object.receiveShadow = true;
      // Three.js computes ordinary frustum bounds from the bind geometry.
      // That can incorrectly cull CC3 skinned/morph meshes during close-ups.
      // Keep skinned pieces renderable; regular static meshes may still cull.
      object.frustumCulled = !object.isSkinnedMesh;
      if (object.geometry && object.geometry.attributes.position) {
        vertices += object.geometry.attributes.position.count;
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        tuneMaterial(material, object.name);
        if (!material) return;
        Object.keys(material).forEach((key) => {
          if (material[key] && material[key].isTexture) textureSet.add(material[key].uuid);
        });
      });
    });
    textureCount = textureSet.size;
    ui.geometry.textContent = `${meshes} meshes · ${(vertices / 1000).toFixed(1)}k verts`;
    ui.textures.textContent = `${textureCount} GPU maps · ${state.renderer.capabilities.getMaxAnisotropy()}× AF`;
    return { meshes, vertices, textures: textureCount };
  }

  function getVisibleSkinnedBounds(root) {
    const box = new THREE.Box3();
    const vertex = new THREE.Vector3();
    let points = 0;
    root.updateMatrixWorld(true);
    root.traverse((object) => {
      if ((!object.isMesh && !object.isSkinnedMesh) || !object.visible || !object.geometry) return;
      const position = object.geometry.attributes && object.geometry.attributes.position;
      if (!position) return;
      if (object.isSkinnedMesh && object.skeleton) object.skeleton.update();
      for (let index = 0; index < position.count; index += 1) {
        vertex.fromBufferAttribute(position, index);
        if (object.isSkinnedMesh && typeof object.boneTransform === 'function') {
          object.boneTransform(index, vertex);
        }
        vertex.applyMatrix4(object.matrixWorld);
        box.expandByPoint(vertex);
        points += 1;
      }
    });
    if (!points || box.isEmpty()) throw new Error('The model loaded, but it contains no visible geometry.');
    return box;
  }

  function frameModel(root) {
    let box = getVisibleSkinnedBounds(root);

    const initialSize = box.getSize(new THREE.Vector3());
    const sourceHeight = Math.max(initialSize.y, 0.001);
    const targetHeight = 1.82;
    if (sourceHeight > 20 || sourceHeight < 0.25) {
      root.scale.multiplyScalar(targetHeight / sourceHeight);
      root.updateMatrixWorld(true);
      box = getVisibleSkinnedBounds(root);
    }

    const center = box.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.y -= box.min.y;
    root.position.z -= center.z;
    root.updateMatrixWorld(true);
    box = getVisibleSkinnedBounds(root);

    const size = box.getSize(new THREE.Vector3());
    const height = Math.max(size.y, 1);
    const width = Math.max(size.x, 0.5);
    const aspect = window.innerWidth / window.innerHeight;
    const verticalDistance = (height * 0.54) / Math.tan(THREE.MathUtils.degToRad(state.camera.fov * 0.5));
    const horizontalDistance = (width * 0.60) / (Math.tan(THREE.MathUtils.degToRad(state.camera.fov * 0.5)) * aspect);
    const distance = Math.max(verticalDistance, horizontalDistance) * 1.04;
    const target = new THREE.Vector3(0, height * 0.51, 0);
    const position = new THREE.Vector3(height * 0.32, height * 0.56, distance);

    state.frame = { position, target, height, distance };
    // Close-up inspection needs a very small near plane. Scaling this from
    // the full-body framing distance sliced through the face/body when the
    // orbit camera moved close to the surface.
    state.camera.near = Math.max(0.001, height / 2000);
    state.camera.far = Math.max(100, distance * 30);
    state.camera.updateProjectionMatrix();
    resetView();
    state.controls.minDistance = Math.max(height * 0.16, 0.18);
    state.controls.maxDistance = Math.max(height * 5.2, 7);
    state.controls.maxPan = height;
    state.ground.scale.setScalar(Math.max(height * 0.8, 1));
  }

  function resetView() {
    if (!state.frame) return;
    state.camera.position.copy(state.frame.position);
    state.controls.target.copy(state.frame.target);
    state.controls.update();
  }

  function setCameraLocked(locked) {
    state.cameraLocked = Boolean(locked);
    if (state.controls) state.controls.enabled = !state.cameraLocked;
    if (state.renderer) {
      state.renderer.domElement.classList.toggle('is-camera-locked', state.cameraLocked);
      state.renderer.domElement.title = state.cameraLocked
        ? 'Camera locked. Unlock it in Render settings to orbit, zoom, or pan.'
        : 'Drag to orbit. Scroll to zoom. Shift and drag to pan.';
    }
    if (ui.cameraLockToggle) {
      ui.cameraLockToggle.classList.toggle('is-locked', state.cameraLocked);
      ui.cameraLockToggle.setAttribute('aria-pressed', String(state.cameraLocked));
      const label = ui.cameraLockToggle.querySelector('.lock-label');
      if (label) label.textContent = state.cameraLocked ? 'Locked' : 'Unlocked';
    }
    document.body.dataset.cameraLocked = String(state.cameraLocked);
  }

  function applyMainInterfaceCamera() {
    if (!state.frame) return;
    state.frame.position.set(...MAIN_INTERFACE_CAMERA.position);
    state.frame.target.set(...MAIN_INTERFACE_CAMERA.target);
    resetView();
    setCameraLocked(true);
  }

  function updateRenderStatus() {
    const quality = state.quality === 'peak' ? 'Peak' : 'Balanced';
    const filter = FILTER_NAMES[state.filterMode] || FILTER_NAMES[0];
    ui.renderStatus.textContent = state.filterMode === 0
      ? `${quality} · model ready`
      : `${quality} · ${filter}`;
  }

  function setScreenFilter(mode) {
    const nextMode = Math.max(0, Math.min(FILTER_NAMES.length - 1, Number(mode) || 0));
    state.filterMode = nextMode;
    if (state.post) state.post.uniforms.uMode.value = nextMode;
    ui.filterButtons.forEach((button) => {
      const active = Number(button.dataset.filter) === nextMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    ui.activeFilterLabel.textContent = FILTER_NAMES[nextMode];
    document.body.dataset.screenFilter = FILTER_NAMES[nextMode];
    if (document.body.dataset.viewerState === 'ready') updateRenderStatus();
    const stats = document.body.dataset.modelStats;
    if (stats) {
      try {
        const parsed = JSON.parse(stats);
        parsed.screenFilter = FILTER_NAMES[nextMode];
        document.body.dataset.modelStats = JSON.stringify(parsed);
      } catch (_) { /* diagnostics only */ }
    }
  }

  function arkitDisplayName(channel) {
    const words = channel.replace(/^A\d+_/, '').split('_');
    return words.map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
  }

  function createARKitControl(config, kind) {
    const row = document.createElement('div');
    row.className = 'arkit-control';
    row.dataset.rigControl = kind === 'morph' ? config : config.id;

    const label = document.createElement('label');
    const input = document.createElement('input');
    const output = document.createElement('output');
    const id = kind === 'morph' ? `arkit-${config}` : `arkit-${config.id}`;
    input.id = id;
    input.type = 'range';
    input.step = kind === 'morph' ? '0.01' : '1';
    input.min = kind === 'morph' ? '0' : String(config.min);
    input.max = kind === 'morph' ? '1' : String(config.max);
    input.value = '0';
    label.htmlFor = id;
    output.htmlFor = id;
    output.textContent = kind === 'morph' ? '0.00' : '0°';

    if (kind === 'morph') {
      label.textContent = arkitDisplayName(config);
      const code = document.createElement('small');
      code.textContent = config.split('_')[0];
      label.appendChild(code);
      input.dataset.arkitChannel = config;
      state.arkit.values[config] = 0;
    } else if (kind === 'eye') {
      label.textContent = config.label;
      const code = document.createElement('small');
      code.textContent = 'CC_Base_L_Eye + CC_Base_R_Eye';
      label.appendChild(code);
      input.dataset.eyeControl = config.id;
      state.arkit.eyeValues[config.id] = 0;
    } else {
      label.textContent = config.label;
      const code = document.createElement('small');
      code.textContent = config.bone === 'head' ? 'CC_Base_Head' : 'CC_Base_NeckTwist01';
      label.appendChild(code);
      input.dataset.headControl = config.id;
      state.arkit.headValues[config.id] = 0;
    }

    row.append(label, input, output);
    return row;
  }

  function buildARKitControls() {
    ui.arkitControls.replaceChildren();
    const headGroup = document.createElement('details');
    headGroup.className = 'arkit-group';
    headGroup.open = true;
    const headSummary = document.createElement('summary');
    headSummary.append('Head + Neck');
    const headCount = document.createElement('span');
    headCount.className = 'arkit-group-count';
    headCount.textContent = `${HEAD_CONTROLS.length} controls`;
    headSummary.appendChild(headCount);
    const headBody = document.createElement('div');
    headBody.className = 'arkit-group-body';
    HEAD_CONTROLS.forEach((control) => headBody.appendChild(createARKitControl(control, 'head')));
    headGroup.append(headSummary, headBody);
    ui.arkitControls.appendChild(headGroup);

    const eyeGroup = document.createElement('details');
    eyeGroup.className = 'arkit-group';
    eyeGroup.open = true;
    const eyeSummary = document.createElement('summary');
    eyeSummary.append('Eye Bones · Iris Aim');
    const eyeCount = document.createElement('span');
    eyeCount.className = 'arkit-group-count';
    eyeCount.textContent = `${EYE_BONE_CONTROLS.length} controls`;
    eyeSummary.appendChild(eyeCount);
    const eyeBody = document.createElement('div');
    eyeBody.className = 'arkit-group-body';
    EYE_BONE_CONTROLS.forEach((control) => eyeBody.appendChild(createARKitControl(control, 'eye')));
    const gazeActions = document.createElement('div');
    gazeActions.className = 'eye-gaze-actions';
    [
      { label: 'Look left', value: -22 },
      { label: 'Center eyes', value: 0 },
      { label: 'Look right', value: 22 },
    ].forEach(({ label, value }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.eyeGaze = String(value);
      gazeActions.appendChild(button);
    });
    eyeBody.prepend(gazeActions);
    eyeGroup.append(eyeSummary, eyeBody);
    ui.arkitControls.appendChild(eyeGroup);

    ARKIT_GROUPS.forEach((group, index) => {
      const details = document.createElement('details');
      details.className = 'arkit-group';
      details.open = index === 0;
      const summary = document.createElement('summary');
      summary.append(group.name);
      const count = document.createElement('span');
      count.className = 'arkit-group-count';
      count.textContent = `${group.channels.length} values`;
      summary.appendChild(count);
      const body = document.createElement('div');
      body.className = 'arkit-group-body';
      group.channels.forEach((channel) => body.appendChild(createARKitControl(channel, 'morph')));
      details.append(summary, body);
      ui.arkitControls.appendChild(details);
    });
  }

  function updateARKitStatus(message) {
    const mapped = ARKIT_CHANNELS.filter((channel) => (state.arkit.channels.get(channel) || []).length).length;
    const bones = Number(Boolean(state.arkit.head))
      + Number(Boolean(state.arkit.neck))
      + Number(Boolean(state.arkit.leftEye))
      + Number(Boolean(state.arkit.rightEye));
    const ready = mapped === ARKIT_CHANNELS.length && bones === 4;
    const status = message || `${mapped}/${ARKIT_CHANNELS.length} ARKit values · ${bones}/4 rotation bones`;
    ui.arkitStatus.innerHTML = '<i aria-hidden="true"></i>';
    ui.arkitStatus.append(document.createTextNode(status));
    ui.arkitLaunchStatus.textContent = status;
    ui.arkitOpen.disabled = !ready;
    ui.arkitTestAll.disabled = !ready;
    document.body.dataset.arkitRig = JSON.stringify({ mapped, expected: ARKIT_CHANNELS.length, bones, ready });
  }

  function registerARKitRig(root) {
    state.arkit.channels.clear();
    state.arkit.eyebrowMorphs = [];
    ARKIT_CHANNELS.forEach((channel) => state.arkit.channels.set(channel, []));
    root.traverse((object) => {
      if (!object.morphTargetDictionary || !object.morphTargetInfluences) return;
      Object.entries(object.morphTargetDictionary).forEach(([name, index]) => {
        if (!state.arkit.channels.has(name)) return;
        state.arkit.channels.get(name).push({ mesh: object, index });
        object.morphTargetInfluences[index] = 0;
      });
      if (/^Female_Angled(?:_|$)/.test(object.name || '')) {
        const position = object.geometry?.attributes?.position;
        const normal = object.geometry?.attributes?.normal;
        const morphPositions = object.geometry?.morphAttributes?.position || [];
        const morphNormals = object.geometry?.morphAttributes?.normal || [];
        if (position && morphPositions.length) {
          const targets = new Map();
          ARKIT_CHANNELS.forEach((channel) => {
            const index = object.morphTargetDictionary[channel];
            if (index == null || !morphPositions[index]) return;
            targets.set(channel, {
              position: morphPositions[index],
              normal: morphNormals[index] || null,
            });
          });
          state.arkit.eyebrowMorphs.push({
            mesh: object,
            position,
            normal,
            basePosition: Float32Array.from(position.array),
            baseNormal: normal ? Float32Array.from(normal.array) : null,
            targets,
          });
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (!material) return;
            material.morphTargets = false;
            material.morphNormals = false;
            material.needsUpdate = true;
          });
        }
      }
    });
    const browBindings = Object.fromEntries(
      ARKIT_GROUPS[0].channels.map((channel) => [
        channel,
        (state.arkit.channels.get(channel) || []).map(({ mesh, index }) => ({
          mesh: mesh.name,
          index,
          materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => ({
            name: material?.name || '',
            morphTargets: Boolean(material?.morphTargets),
            morphNormals: Boolean(material?.morphNormals),
          })),
        })),
      ]),
    );
    document.body.dataset.arkitBrowBindings = JSON.stringify(browBindings);
    state.arkit.head = root.getObjectByName('CC_Base_Head') || null;
    state.arkit.neck = root.getObjectByName('CC_Base_NeckTwist01') || null;
    state.arkit.jaw = root.getObjectByName('CC_Base_JawRoot') || null;
    state.arkit.leftEye = root.getObjectByName('CC_Base_L_Eye') || null;
    state.arkit.rightEye = root.getObjectByName('CC_Base_R_Eye') || null;
    state.arkit.headBase = state.arkit.head ? state.arkit.head.quaternion.clone() : null;
    state.arkit.neckBase = state.arkit.neck ? state.arkit.neck.quaternion.clone() : null;
    state.arkit.jawBaseQuaternion = state.arkit.jaw ? state.arkit.jaw.quaternion.clone() : null;
    state.arkit.jawBasePosition = state.arkit.jaw ? state.arkit.jaw.position.clone() : null;
    state.arkit.leftEyeBase = state.arkit.leftEye ? state.arkit.leftEye.quaternion.clone() : null;
    state.arkit.rightEyeBase = state.arkit.rightEye ? state.arkit.rightEye.quaternion.clone() : null;
    ui.arkitControls.querySelectorAll('[data-arkit-channel]').forEach((input) => {
      input.disabled = !(state.arkit.channels.get(input.dataset.arkitChannel) || []).length;
    });
    ui.arkitControls.querySelectorAll('[data-head-control]').forEach((input) => {
      const control = HEAD_CONTROLS.find((item) => item.id === input.dataset.headControl);
      input.disabled = !state.arkit[control.bone];
    });
    ui.arkitControls.querySelectorAll('[data-eye-control]').forEach((input) => {
      input.disabled = !state.arkit.leftEye || !state.arkit.rightEye;
    });
    updateARKitStatus();
    registerLivingBody(root);
    resetLivingIdle(performance.now() / 1000);
  }

  function registerLivingBody(root) {
    const boneNames = [
      'CC_Base_Spine01',
      'CC_Base_Spine02',
      'CC_Base_L_Clavicle',
      'CC_Base_R_Clavicle',
    ];
    state.expression.body.bones = Object.create(null);
    state.expression.body.bases = Object.create(null);
    boneNames.forEach((name) => {
      const bone = root.getObjectByName(name);
      if (!bone) return;
      state.expression.body.bones[name] = bone;
      state.expression.body.bases[name] = {
        quaternion: bone.quaternion.clone(),
        position: bone.position.clone(),
      };
    });
  }

  function restoreLivingBody() {
    Object.entries(state.expression.body.bones).forEach(([name, bone]) => {
      const base = state.expression.body.bases[name];
      if (!bone || !base) return;
      bone.quaternion.copy(base.quaternion);
      bone.position.copy(base.position);
    });
    state.expression.body.breath = 0;
  }

  function applyLivingBody(nowSeconds) {
    const body = state.expression.body;
    const spine01 = body.bones.CC_Base_Spine01;
    const spine02 = body.bones.CC_Base_Spine02;
    const leftClavicle = body.bones.CC_Base_L_Clavicle;
    const rightClavicle = body.bones.CC_Base_R_Clavicle;
    if (!spine01 || !spine02) return;

    // A relaxed 4.7-second breath with a faint secondary harmonic avoids a
    // perfectly mechanical sine wave. All rotations remain below one degree.
    const phase = nowSeconds * ((Math.PI * 2) / 4.7);
    const breath = ((Math.sin(phase - (Math.PI * 0.5)) + 1) * 0.5);
    const breathShape = THREE.MathUtils.clamp(breath + (Math.sin((phase * 2) + 0.7) * 0.035), 0, 1);
    const sway = Math.sin(nowSeconds * 0.41 + 0.8);
    const counterSway = Math.sin(nowSeconds * 0.27 + 2.1);
    body.breath = breathShape;

    const applyBoneDelta = (bone, name, pitch, yaw, roll) => {
      const base = body.bases[name];
      if (!bone || !base) return;
      const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(pitch),
        THREE.MathUtils.degToRad(yaw),
        THREE.MathUtils.degToRad(roll),
        'YXZ',
      ));
      bone.quaternion.copy(base.quaternion).multiply(delta);
      bone.position.copy(base.position);
    };

    applyBoneDelta(
      spine01,
      'CC_Base_Spine01',
      (breathShape - 0.5) * 0.34,
      sway * 0.13,
      counterSway * 0.16,
    );
    applyBoneDelta(
      spine02,
      'CC_Base_Spine02',
      (breathShape - 0.5) * 0.48,
      sway * 0.09,
      counterSway * -0.10,
    );

    const shoulderLift = breathShape * 0.00105;
    if (leftClavicle && body.bases.CC_Base_L_Clavicle) {
      leftClavicle.quaternion.copy(body.bases.CC_Base_L_Clavicle.quaternion);
      leftClavicle.position.copy(body.bases.CC_Base_L_Clavicle.position);
      leftClavicle.position.y += shoulderLift * 0.94;
    }
    if (rightClavicle && body.bases.CC_Base_R_Clavicle) {
      rightClavicle.quaternion.copy(body.bases.CC_Base_R_Clavicle.quaternion);
      rightClavicle.position.copy(body.bases.CC_Base_R_Clavicle.position);
      rightClavicle.position.y += shoulderLift * 1.06;
    }
  }

  function randomBetween(min, max) {
    return min + (Math.random() * (max - min));
  }

  function smooth01(value) {
    const amount = THREE.MathUtils.clamp(value, 0, 1);
    return amount * amount * (3 - (2 * amount));
  }

  function getComposedARKitValue(channel) {
    const manual = Number(state.arkit.values[channel]) || 0;
    if (state.arkit.panelOpen) {
      return THREE.MathUtils.clamp(manual, 0, 1);
    }
    const idle = state.expression.enabled ? Number(state.expression.values[channel]) || 0 : 0;
    const speech = Number(state.speech.values[channel]) || 0;
    const idleContribution = state.speech.active && SPEECH_CHANNELS.includes(channel)
      ? idle * 0.08
      : idle;
    return THREE.MathUtils.clamp(manual + idleContribution + speech, 0, 1);
  }

  function publishSpeechDiagnostics(force = false) {
    const diagnosticNow = performance.now();
    if (!force && diagnosticNow - state.speech.lastDiagnosticAt < 80) return;
    state.speech.lastDiagnosticAt = diagnosticNow;
    const audio = state.speech.audio;
    document.body.dataset.lipSync = JSON.stringify({
      active: state.speech.active,
      mode: state.speech.mode,
      clock: audio ? 'audio.currentTime' : 'stopped',
      time: Number((audio?.currentTime || 0).toFixed(3)),
      duration: Number((audio?.duration || 0).toFixed(3)) || null,
      viseme: state.speech.currentViseme,
      cues: state.speech.cues.length,
      activeChannels: SPEECH_CHANNELS
        .filter((channel) => (state.speech.values[channel] || 0) > 0.005)
        .map((channel) => ({ channel, value: Number(state.speech.values[channel].toFixed(3)) })),
    });
  }

  function finishSpeech(reason = 'ended', error = null) {
    const settle = state.speech.settle;
    state.speech.settle = null;
    state.speech.active = false;
    state.speech.mode = 'release';
    state.speech.currentViseme = 'SIL';
    state.expression.mode = 'speech-release';
    if (state.speech.audio && reason !== 'ended') state.speech.audio.pause();
    state.speech.audio = null;
    if (settle) {
      if (error) settle.reject(error);
      else settle.resolve({ reason });
    }
    publishSpeechDiagnostics(true);
  }

  function stopSpeech(reason = 'stopped', immediate = false) {
    state.speech.generation += 1;
    finishSpeech(reason);
    if (immediate) {
      SPEECH_CHANNELS.forEach((channel) => { state.speech.values[channel] = 0; });
      state.speech.mode = 'idle';
      state.expression.mode = 'idle';
    }
  }

  function playSpeech({ audioUrl, cues }) {
    stopSpeech('replaced', true);
    const generation = state.speech.generation + 1;
    state.speech.generation = generation;
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    state.speech.audio = audio;
    state.speech.cues = Array.isArray(cues)
      ? cues.filter((cue) => cue && SPEECH_VISEME_RECIPES[cue.viseme]
        && Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start)
      : [];
    state.speech.active = true;
    state.speech.mode = 'speaking';
    state.expression.mode = 'speaking';
    state.expression.mouth = null;
    publishSpeechDiagnostics(true);

    return new Promise((resolve, reject) => {
      state.speech.settle = { resolve, reject };
      audio.addEventListener('ended', () => {
        if (generation === state.speech.generation) finishSpeech('ended');
      }, { once: true });
      audio.addEventListener('error', () => {
        if (generation === state.speech.generation) {
          finishSpeech('error', new Error('The generated speech audio could not be played.'));
        }
      }, { once: true });
      audio.play().catch((error) => {
        if (generation === state.speech.generation) finishSpeech('blocked', error);
      });
    });
  }

  function updateSpeech(delta) {
    const desired = Object.create(null);
    const audio = state.speech.audio;
    const now = audio?.currentTime || 0;
    let strongestCue = null;
    let strongestEnvelope = 0;

    if (state.speech.active && audio) {
      state.speech.cues.forEach((cue) => {
        const cueDuration = cue.end - cue.start;
        const anticipation = Math.min(0.11, Math.max(0.065, cueDuration * 0.55));
        const release = Math.min(0.12, Math.max(0.070, cueDuration * 0.60));
        const innerAttack = Math.min(0.09, Math.max(0.035, cueDuration * 0.42));
        const innerRelease = Math.min(0.10, Math.max(0.040, cueDuration * 0.46));
        let envelope = 0;
        if (now >= cue.start && now <= cue.end) {
          const attackEnvelope = 0.62 + (smooth01((now - cue.start) / innerAttack) * 0.38);
          const releaseEnvelope = 0.62 + (smooth01((cue.end - now) / innerRelease) * 0.38);
          envelope = Math.min(attackEnvelope, releaseEnvelope);
        } else if (now < cue.start && cue.start - now <= anticipation) {
          envelope = smooth01(1 - ((cue.start - now) / anticipation)) * 0.62;
        } else if (now > cue.end && now - cue.end <= release) {
          envelope = (1 - smooth01((now - cue.end) / release)) * 0.62;
        }
        if (!envelope) return;
        if (envelope > strongestEnvelope) {
          strongestEnvelope = envelope;
          strongestCue = cue;
        }
        Object.entries(SPEECH_VISEME_RECIPES[cue.viseme]).forEach(([channel, weight]) => {
          desired[channel] = Math.max(desired[channel] || 0, weight * envelope);
        });
      });
    }

    state.speech.currentViseme = strongestCue?.viseme || 'SIL';
    let moving = false;
    const smoothingDelta = Math.min(Math.max(delta, 0), 1 / 30);
    SPEECH_CHANNELS.forEach((channel) => {
      const target = THREE.MathUtils.clamp(desired[channel] || 0, 0, 1);
      const current = Number(state.speech.values[channel]) || 0;
      const attackSpeed = channel === 'A37_Mouth_Close' ? 20 : channel === 'A25_Jaw_Open' ? 12 : 14;
      const releaseSpeed = channel === 'A25_Jaw_Open' ? 9 : 11;
      const response = 1 - Math.exp(-smoothingDelta * (target > current ? attackSpeed : releaseSpeed));
      let value = THREE.MathUtils.lerp(current, target, response);
      if (channel === 'A25_Jaw_Open') {
        const maximumJawStep = smoothingDelta * 1.8;
        value = THREE.MathUtils.clamp(value, current - maximumJawStep, current + maximumJawStep);
      }
      state.speech.values[channel] = value < 0.0005 ? 0 : value;
      moving = moving || state.speech.values[channel] > 0.002;
    });
    if (!state.speech.active && !moving && state.speech.mode === 'release') {
      state.speech.mode = 'idle';
      state.expression.mode = 'idle';
      state.expression.nextMouthAt = performance.now() / 1000 + randomBetween(3.5, 6.5);
    }
    publishSpeechDiagnostics();
  }

  function clearExpressionLayer(immediate = false) {
    state.expression.micro = null;
    state.expression.brow = null;
    state.expression.mouth = null;
    state.expression.blink = null;
    state.expression.gaze.targetX = 0;
    state.expression.gaze.targetY = 0;
    if (immediate) {
      state.expression.gaze.x = 0;
      state.expression.gaze.y = 0;
    }
    IDLE_OWNED_CHANNELS.forEach((channel) => {
      if (immediate) state.expression.values[channel] = 0;
    });
    Object.keys(state.expression.headValues).forEach((key) => {
      state.expression.headValues[key] = 0;
    });
    if (immediate) restoreLivingBody();
    if (immediate && state.model) {
      applyARKitMorphs();
      applyEyebrowMorphs();
      applyJawRig();
      applyHeadRig();
      applyEyeRig();
    }
  }

  function resetLivingIdle(nowSeconds) {
    clearExpressionLayer(true);
    state.expression.nextMicroAt = nowSeconds + randomBetween(0.65, 1.10);
    state.expression.nextBrowAt = nowSeconds + randomBetween(5.0, 9.0);
    state.expression.nextMouthAt = nowSeconds + randomBetween(3.5, 7.0);
    state.expression.nextLipReadjustAt = nowSeconds + randomBetween(15.0, 24.0);
    state.expression.nextBlinkAt = nowSeconds + randomBetween(1.05, 1.65);
    state.expression.nextGazeAt = nowSeconds + randomBetween(0.45, 0.90);
    updateExpressionDiagnostics(nowSeconds, true);
  }

  function scheduleMicroExpression(nowSeconds) {
    const recipe = LIVING_IDLE_RECIPES[Math.floor(Math.random() * LIVING_IDLE_RECIPES.length)];
    state.expression.micro = {
      name: recipe.name,
      weights: recipe.weights,
      start: nowSeconds,
      attack: randomBetween(0.18, 0.38),
      hold: randomBetween(0.16, 0.62),
      release: randomBetween(0.55, 1.05),
    };
  }

  function sampleMicroExpression(nowSeconds, desired) {
    const event = state.expression.micro;
    if (!event) return;
    const elapsed = nowSeconds - event.start;
    let envelope = 0;
    if (elapsed < event.attack) {
      envelope = smooth01(elapsed / event.attack);
    } else if (elapsed < event.attack + event.hold) {
      envelope = 1;
    } else if (elapsed < event.attack + event.hold + event.release) {
      envelope = 1 - smooth01((elapsed - event.attack - event.hold) / event.release);
    } else {
      state.expression.micro = null;
      state.expression.nextMicroAt = nowSeconds + randomBetween(1.15, 3.25);
      return;
    }
    Object.entries(event.weights).forEach(([channel, weight]) => {
      desired[channel] = (desired[channel] || 0) + (weight * envelope);
    });
  }

  function scheduleIdleBrow(nowSeconds) {
    const gazeMagnitude = Math.abs(state.expression.gaze.x) + Math.abs(state.expression.gaze.y);
    const recipeIndex = gazeMagnitude > 0.045
      ? 0
      : Math.floor(Math.random() * IDLE_BROW_RECIPES.length);
    const recipe = IDLE_BROW_RECIPES[recipeIndex];
    const sideBias = randomBetween(0.86, 1.14);
    const weights = Object.fromEntries(Object.entries(recipe.weights).map(([channel, weight]) => {
      const leftSide = /_(Left|Up_Left)$/.test(channel);
      const asymmetry = leftSide ? sideBias : (2 - sideBias);
      return [channel, Math.min(0.035, weight * asymmetry)];
    }));
    state.expression.brow = {
      name: recipe.name,
      weights,
      start: nowSeconds,
      attack: randomBetween(0.35, 0.70),
      hold: randomBetween(0.08, 0.25),
      release: randomBetween(0.60, 1.20),
    };
  }

  function sampleIdleBrow(nowSeconds, desired) {
    if (!state.expression.brow && nowSeconds >= state.expression.nextBrowAt) {
      scheduleIdleBrow(nowSeconds);
    }
    const event = state.expression.brow;
    if (!event) return;
    const elapsed = nowSeconds - event.start;
    let envelope = 0;
    if (elapsed < event.attack) {
      envelope = smooth01(elapsed / event.attack);
    } else if (elapsed < event.attack + event.hold) {
      envelope = 1;
    } else if (elapsed < event.attack + event.hold + event.release) {
      envelope = 1 - smooth01((elapsed - event.attack - event.hold) / event.release);
    } else {
      state.expression.brow = null;
      state.expression.nextBrowAt = nowSeconds + randomBetween(6.0, 14.0);
      return;
    }
    Object.entries(event.weights).forEach(([channel, weight]) => {
      desired[channel] = (desired[channel] || 0) + (weight * envelope);
    });
  }

  function scheduleIdleMouth(nowSeconds, readjustment = false) {
    const recipe = readjustment
      ? IDLE_LIP_READJUSTMENT
      : IDLE_MOUTH_RECIPES[Math.floor(Math.random() * IDLE_MOUTH_RECIPES.length)];
    state.expression.mouth = {
      name: recipe.name,
      weights: recipe.weights,
      readjustment,
      start: nowSeconds,
      attack: readjustment ? randomBetween(0.35, 0.65) : randomBetween(0.25, 0.60),
      hold: randomBetween(0.08, 0.35),
      release: randomBetween(0.50, 1.40),
    };
  }

  function sampleIdleMouth(nowSeconds, desired) {
    if (state.expression.mode !== 'idle') {
      state.expression.mouth = null;
      return;
    }
    if (!state.expression.mouth) {
      if (nowSeconds >= state.expression.nextLipReadjustAt) {
        scheduleIdleMouth(nowSeconds, true);
      } else if (nowSeconds >= state.expression.nextMouthAt) {
        scheduleIdleMouth(nowSeconds, false);
      }
    }
    const event = state.expression.mouth;
    if (!event) return;
    const elapsed = nowSeconds - event.start;
    let envelope = 0;
    if (elapsed < event.attack) {
      envelope = smooth01(elapsed / event.attack);
    } else if (elapsed < event.attack + event.hold) {
      envelope = 1;
    } else if (elapsed < event.attack + event.hold + event.release) {
      envelope = 1 - smooth01((elapsed - event.attack - event.hold) / event.release);
    } else {
      state.expression.mouth = null;
      if (event.readjustment) {
        state.expression.nextLipReadjustAt = nowSeconds + randomBetween(15.0, 30.0);
        state.expression.nextMouthAt = Math.max(state.expression.nextMouthAt, nowSeconds + 4.0);
      } else {
        state.expression.nextMouthAt = nowSeconds + randomBetween(5.0, 12.0);
      }
      return;
    }
    Object.entries(event.weights).forEach(([channel, weight]) => {
      desired[channel] = (desired[channel] || 0) + (Math.min(0.035, weight) * envelope);
    });
  }

  function blinkPulse(nowSeconds, start, duration) {
    const elapsed = nowSeconds - start;
    if (elapsed < 0 || elapsed > duration) return 0;
    const closeEnd = duration * 0.34;
    const holdEnd = duration * 0.49;
    if (elapsed < closeEnd) return smooth01(elapsed / closeEnd);
    if (elapsed < holdEnd) return 1;
    return 1 - smooth01((elapsed - holdEnd) / (duration - holdEnd));
  }

  function sampleBlink(nowSeconds, desired) {
    if (!state.expression.blink && nowSeconds >= state.expression.nextBlinkAt) {
      const duration = randomBetween(0.135, 0.205);
      state.expression.blink = {
        start: nowSeconds,
        duration,
        secondStart: Math.random() < 0.13 ? nowSeconds + duration + randomBetween(0.09, 0.16) : null,
      };
    }
    const blink = state.expression.blink;
    if (!blink) return;
    const firstLeft = blinkPulse(nowSeconds, blink.start, blink.duration);
    const firstRight = blinkPulse(nowSeconds, blink.start + 0.009, blink.duration);
    const secondLeft = blink.secondStart == null ? 0 : blinkPulse(nowSeconds, blink.secondStart, blink.duration * 0.92);
    const secondRight = blink.secondStart == null ? 0 : blinkPulse(nowSeconds, blink.secondStart + 0.008, blink.duration * 0.92);
    desired.A14_Eye_Blink_Left = Math.max(firstLeft, secondLeft);
    desired.A15_Eye_Blink_Right = Math.max(firstRight, secondRight);
    const end = blink.secondStart == null ? blink.start + blink.duration : blink.secondStart + blink.duration;
    if (nowSeconds > end) {
      state.expression.blink = null;
      state.expression.nextBlinkAt = nowSeconds + randomBetween(2.35, 5.20);
    }
  }

  function sampleGaze(nowSeconds, delta, desired) {
    const gaze = state.expression.gaze;
    if (nowSeconds >= state.expression.nextGazeAt) {
      gaze.targetX = randomBetween(-0.050, 0.050);
      gaze.targetY = randomBetween(-0.026, 0.030);
      if (Math.random() < 0.32) {
        gaze.targetX *= 0.28;
        gaze.targetY *= 0.28;
      }
      state.expression.nextGazeAt = nowSeconds + randomBetween(1.20, 3.60);
    }
    const response = 1 - Math.exp(-Math.max(delta, 0) * 13);
    gaze.x = THREE.MathUtils.lerp(gaze.x, gaze.targetX, response);
    gaze.y = THREE.MathUtils.lerp(gaze.y, gaze.targetY, response);
    // One semantic gaze vector feeds both the visible ARKit eye-look shapes
    // and the real eye bones. applyEyeRig reads these composed A06-A13 values,
    // so the rotation is applied exactly once rather than doubled.
    const arkitGazeScale = 145 / 22;
    const right = THREE.MathUtils.clamp(gaze.x * arkitGazeScale, 0, 1);
    const left = THREE.MathUtils.clamp(-gaze.x * arkitGazeScale, 0, 1);
    const up = THREE.MathUtils.clamp(gaze.y * arkitGazeScale, 0, 1);
    const down = THREE.MathUtils.clamp(-gaze.y * arkitGazeScale, 0, 1);
    desired.A06_Eye_Look_Up_Left = up;
    desired.A07_Eye_Look_Up_Right = up;
    desired.A08_Eye_Look_Down_Left = down;
    desired.A09_Eye_Look_Down_Right = down;
    desired.A10_Eye_Look_Out_Left = right;
    desired.A11_Eye_Look_In_Left = left;
    desired.A12_Eye_Look_In_Right = right;
    desired.A13_Eye_Look_Out_Right = left;
  }

  function updateExpressionDiagnostics(nowSeconds, force = false) {
    if (!force && nowSeconds - state.expression.lastDiagnosticAt < 0.12) return;
    state.expression.lastDiagnosticAt = nowSeconds;
    const activeChannels = IDLE_OWNED_CHANNELS
      .filter((channel) => (state.expression.values[channel] || 0) > 0.003)
      .map((channel) => ({ channel, value: Number(state.expression.values[channel].toFixed(3)) }));
    const suspended = state.arkit.panelOpen;
    const snapshot = {
      enabled: state.expression.enabled,
      mode: suspended ? 'manual-rig' : state.expression.mode,
      owner: suspended ? 'manual' : 'living-idle',
      micro: state.expression.micro?.name || 'settled',
      brow: state.expression.brow?.name || 'relaxed',
      mouth: state.expression.mouth?.name || 'relaxed',
      mouthOwner: suspended ? 'manual' : state.expression.mode === 'idle' ? 'idle-mouth' : state.expression.mode,
      blinking: Boolean(state.expression.blink),
      gaze: {
        x: Number(state.expression.gaze.x.toFixed(3)),
        y: Number(state.expression.gaze.y.toFixed(3)),
      },
      body: {
        breathing: !suspended && state.expression.enabled,
        breath: Number(state.expression.body.breath.toFixed(3)),
        bones: Object.keys(state.expression.body.bones).length,
      },
      activeChannels,
    };
    document.body.dataset.expressionEngine = JSON.stringify(snapshot);
    if (ui.expressionStatus) {
      ui.expressionStatus.textContent = suspended
        ? 'Suspended while rig testing'
        : state.expression.enabled
          ? `Idle · ${state.expression.mouth?.name || state.expression.brow?.name || snapshot.micro}`
          : 'Disabled';
    }
  }

  function updateLivingIdle(nowSeconds, delta) {
    if (!state.model || !state.arkit.channels.size) return;
    if (!state.expression.enabled || state.arkit.panelOpen) {
      if (!state.arkit.panelOpen && state.speech.mode !== 'idle') {
        applyARKitMorphs();
        applyJawRig();
      }
      updateExpressionDiagnostics(nowSeconds);
      return;
    }
    if (!state.expression.micro && nowSeconds >= state.expression.nextMicroAt) {
      scheduleMicroExpression(nowSeconds);
    }
    const desired = Object.create(null);
    const slowPhase = nowSeconds * 0.63;
    desired.A16_Eye_Squint_Left = 0.006 + ((Math.sin(slowPhase) + 1) * 0.0025);
    desired.A17_Eye_Squint_Right = 0.006 + ((Math.sin(slowPhase + 0.72) + 1) * 0.0025);
    const browDrift = nowSeconds * 0.24;
    desired.A04_Brow_Outer_Up_Left = 0.0035 + ((Math.sin(browDrift) + 1) * 0.0012);
    desired.A05_Brow_Outer_Up_Right = 0.0035 + ((Math.sin(browDrift + 0.58) + 1) * 0.0012);
    sampleMicroExpression(nowSeconds, desired);
    sampleGaze(nowSeconds, delta, desired);
    sampleIdleBrow(nowSeconds, desired);
    sampleIdleMouth(nowSeconds, desired);
    sampleBlink(nowSeconds, desired);

    IDLE_OWNED_CHANNELS.forEach((channel) => {
      const target = THREE.MathUtils.clamp(desired[channel] || 0, 0, 1);
      const current = Number(state.expression.values[channel]) || 0;
      const speed = /^A1[45]_/.test(channel)
        ? 44
        : /^A0[1-5]_/.test(channel)
          ? 5.5
          : IDLE_MOUTH_CHANNELS.includes(channel)
            ? 6.2
            : 9;
      const response = 1 - Math.exp(-Math.max(delta, 0) * speed);
      state.expression.values[channel] = THREE.MathUtils.lerp(current, target, response);
    });
    state.expression.headValues.headYaw = Math.sin(nowSeconds * 0.29) * 0.58;
    state.expression.headValues.headPitch = Math.sin(nowSeconds * 0.23 + 1.1) * 0.28;
    state.expression.headValues.headRoll = Math.sin(nowSeconds * 0.19 + 0.4) * 0.20;
    state.expression.headValues.neckYaw = Math.sin(nowSeconds * 0.17 + 2.0) * 0.18;
    state.expression.headValues.neckPitch = Math.sin(nowSeconds * 0.14 + 0.7) * 0.12;
    state.expression.headValues.neckRoll = 0;
    applyARKitMorphs();
    applyEyebrowMorphs();
    applyJawRig();
    applyHeadRig();
    applyEyeRig();
    applyLivingBody(nowSeconds);
    updateExpressionDiagnostics(nowSeconds);
  }

  function setLivingIdleEnabled(enabled) {
    state.expression.enabled = Boolean(enabled);
    if (!state.expression.enabled) clearExpressionLayer(true);
    else resetLivingIdle(performance.now() / 1000);
    if (ui.expressionToggle) {
      ui.expressionToggle.classList.toggle('is-active', state.expression.enabled);
      ui.expressionToggle.setAttribute('aria-pressed', String(state.expression.enabled));
      ui.expressionToggle.textContent = state.expression.enabled ? 'On' : 'Off';
    }
    updateExpressionDiagnostics(performance.now() / 1000, true);
  }

  function applyEyebrowMorphs() {
    state.arkit.eyebrowMorphs.forEach((binding) => {
      binding.position.array.set(binding.basePosition);
      if (binding.normal && binding.baseNormal) binding.normal.array.set(binding.baseNormal);
      binding.targets.forEach((target, channel) => {
        const amount = getComposedARKitValue(channel);
        if (!amount) return;
        for (let vertex = 0; vertex < binding.position.count; vertex += 1) {
          const offset = vertex * binding.position.itemSize;
          binding.position.array[offset] += target.position.getX(vertex) * amount;
          binding.position.array[offset + 1] += target.position.getY(vertex) * amount;
          binding.position.array[offset + 2] += target.position.getZ(vertex) * amount;
          if (binding.normal && binding.baseNormal && target.normal) {
            const normalOffset = vertex * binding.normal.itemSize;
            binding.normal.array[normalOffset] += target.normal.getX(vertex) * amount;
            binding.normal.array[normalOffset + 1] += target.normal.getY(vertex) * amount;
            binding.normal.array[normalOffset + 2] += target.normal.getZ(vertex) * amount;
          }
        }
      });
      binding.position.needsUpdate = true;
      if (binding.normal) binding.normal.needsUpdate = true;
    });
  }

  function applyARKitMorphs() {
    ARKIT_CHANNELS.forEach((channel) => {
      const amount = getComposedARKitValue(channel);
      (state.arkit.channels.get(channel) || []).forEach(({ mesh, index }) => {
        if (mesh.morphTargetInfluences[index] !== amount) {
          mesh.morphTargetInfluences[index] = amount;
        }
      });
    });
  }

  function setARKitMorph(channel, value) {
    const amount = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
    state.arkit.values[channel] = amount;
    applyARKitMorphs();
    applyEyebrowMorphs();
    if (/^A0[1-5]_/.test(channel)) {
      document.body.dataset.arkitBrowReadback = JSON.stringify({
        channel,
        requested: amount,
        bindings: (state.arkit.channels.get(channel) || []).map(({ mesh, index }) => ({
          mesh: mesh.name,
          value: mesh.morphTargetInfluences[index],
        })),
      });
    }
    if (/^A2[5-8]_/.test(channel)) applyJawRig();
    if (/^A(0[6-9]|1[0-3])_Eye_Look_/.test(channel)) applyEyeRig();
  }

  function applyJawRig() {
    const jaw = state.arkit.jaw;
    const baseQuaternion = state.arkit.jawBaseQuaternion;
    const basePosition = state.arkit.jawBasePosition;
    if (!jaw || !baseQuaternion || !basePosition) return;
    const open = getComposedARKitValue('A25_Jaw_Open');
    const forward = getComposedARKitValue('A26_Jaw_Forward');
    const left = getComposedARKitValue('A27_Jaw_Left');
    const right = getComposedARKitValue('A28_Jaw_Right');
    // Match the Blender jaw-control progression: restrained near closed,
    // natural through speech range, and approximately 25 degrees at maximum.
    const openCurve = open * open * (3 - (2 * open));
    const jawOpenRadians = openCurve * THREE.MathUtils.degToRad(25.5);
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      0,
      (right - left) * 0.07,
      jawOpenRadians,
      'XYZ',
    ));
    jaw.quaternion.copy(baseQuaternion).multiply(delta);
    jaw.position.copy(basePosition);
    jaw.position.x += forward * 0.38;
    document.body.dataset.arkitJawReadback = JSON.stringify({
      value: open,
      curve: openCurve,
      degrees: THREE.MathUtils.radToDeg(jawOpenRadians),
    });
  }

  function applyHeadRig() {
    const applyBone = (boneName, bone, base) => {
      if (!bone || !base) return;
      const prefix = boneName === 'head' ? 'head' : 'neck';
      const idleHead = state.arkit.panelOpen || !state.expression.enabled
        ? 0
        : (state.expression.headValues[`${prefix}Pitch`] || 0);
      const idleYaw = state.arkit.panelOpen || !state.expression.enabled
        ? 0
        : (state.expression.headValues[`${prefix}Yaw`] || 0);
      const idleRoll = state.arkit.panelOpen || !state.expression.enabled
        ? 0
        : (state.expression.headValues[`${prefix}Roll`] || 0);
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad((state.arkit.headValues[`${prefix}Pitch`] || 0) + idleHead),
        THREE.MathUtils.degToRad((state.arkit.headValues[`${prefix}Yaw`] || 0) + idleYaw),
        THREE.MathUtils.degToRad((state.arkit.headValues[`${prefix}Roll`] || 0) + idleRoll),
        'YXZ',
      );
      bone.quaternion.copy(base).multiply(new THREE.Quaternion().setFromEuler(euler));
    };
    applyBone('head', state.arkit.head, state.arkit.headBase);
    applyBone('neck', state.arkit.neck, state.arkit.neckBase);
  }

  function applyEyeRig() {
    const leftEye = state.arkit.leftEye;
    const rightEye = state.arkit.rightEye;
    const leftBase = state.arkit.leftEyeBase;
    const rightBase = state.arkit.rightEyeBase;
    if (!leftEye || !rightEye || !leftBase || !rightBase) return;

    const manualYaw = Number(state.arkit.eyeValues.eyeYaw) || 0;
    const manualPitch = Number(state.arkit.eyeValues.eyePitch) || 0;
    const convergence = Number(state.arkit.eyeValues.eyeConvergence) || 0;
    const leftYawTrim = Number(state.arkit.eyeValues.leftEyeYaw) || 0;
    const rightYawTrim = Number(state.arkit.eyeValues.rightEyeYaw) || 0;
    const leftPitchTrim = Number(state.arkit.eyeValues.leftEyePitch) || 0;
    const rightPitchTrim = Number(state.arkit.eyeValues.rightEyePitch) || 0;
    const yaw = manualYaw;
    const pitch = manualPitch;
    const arkitEyeDegrees = 22;
    const arkitLeftYaw = (
      getComposedARKitValue('A10_Eye_Look_Out_Left')
      - getComposedARKitValue('A11_Eye_Look_In_Left')
    ) * arkitEyeDegrees;
    const arkitRightYaw = (
      getComposedARKitValue('A12_Eye_Look_In_Right')
      - getComposedARKitValue('A13_Eye_Look_Out_Right')
    ) * arkitEyeDegrees;
    const arkitLeftPitch = (
      getComposedARKitValue('A06_Eye_Look_Up_Left')
      - getComposedARKitValue('A08_Eye_Look_Down_Left')
    ) * arkitEyeDegrees;
    const arkitRightPitch = (
      getComposedARKitValue('A07_Eye_Look_Up_Right')
      - getComposedARKitValue('A09_Eye_Look_Down_Right')
    ) * arkitEyeDegrees;

    const applyEye = (eye, base, eyeYaw, eyePitch) => {
      eye.parent?.updateWorldMatrix(true, false);
      const parentWorld = eye.parent
        ? eye.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion();
      const baseWorld = parentWorld.clone().multiply(base);
      const worldDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(-eyePitch),
        THREE.MathUtils.degToRad(eyeYaw),
        0,
        'YXZ',
      ));
      // CC3 eye and head bones both use rotated local bases. Compose the aim
      // in world/model axes, then convert the result back to eye-local space.
      eye.quaternion.copy(parentWorld.invert()).multiply(worldDelta).multiply(baseWorld);
    };
    const leftYaw = yaw + leftYawTrim - convergence + arkitLeftYaw;
    const rightYaw = yaw + rightYawTrim + convergence + arkitRightYaw;
    const leftPitch = pitch + leftPitchTrim + arkitLeftPitch;
    const rightPitch = pitch + rightPitchTrim + arkitRightPitch;
    applyEye(leftEye, leftBase, leftYaw, leftPitch);
    applyEye(rightEye, rightBase, rightYaw, rightPitch);
    document.body.dataset.arkitEyeReadback = JSON.stringify({
      source: state.arkit.panelOpen ? 'manual' : 'living-idle',
      yaw: Number(yaw.toFixed(2)),
      pitch: Number(pitch.toFixed(2)),
      convergence: Number(convergence.toFixed(2)),
      leftYaw: Number(leftYaw.toFixed(2)),
      rightYaw: Number(rightYaw.toFixed(2)),
      leftPitch: Number(leftPitch.toFixed(2)),
      rightPitch: Number(rightPitch.toFixed(2)),
      arkit: {
        leftYaw: Number(arkitLeftYaw.toFixed(2)),
        rightYaw: Number(arkitRightYaw.toFixed(2)),
        leftPitch: Number(arkitLeftPitch.toFixed(2)),
        rightPitch: Number(arkitRightPitch.toFixed(2)),
      },
    });
  }

  function setHeadRigValue(controlId, value) {
    state.arkit.headValues[controlId] = Number(value) || 0;
    applyHeadRig();
  }

  function setEyeRigValue(controlId, value) {
    state.arkit.eyeValues[controlId] = Number(value) || 0;
    applyEyeRig();
  }

  function setCoordinatedSideGaze(value) {
    const yaw = THREE.MathUtils.clamp(Number(value) || 0, -22, 22);
    EYE_BONE_CONTROLS.forEach((control) => {
      state.arkit.eyeValues[control.id] = control.id === 'eyeYaw' ? yaw : 0;
      const input = ui.arkitControls.querySelector(`[data-eye-control="${control.id}"]`);
      if (!input) return;
      input.value = String(state.arkit.eyeValues[control.id]);
      const output = input.closest('.arkit-control')?.querySelector('output');
      if (output) output.textContent = `${Math.round(state.arkit.eyeValues[control.id])}°`;
    });
    applyEyeRig();
  }

  function resetARKitRig(abortTest = true) {
    if (abortTest) state.arkit.autoTestRun += 1;
    ARKIT_CHANNELS.forEach((channel) => setARKitMorph(channel, 0));
    HEAD_CONTROLS.forEach((control) => { state.arkit.headValues[control.id] = 0; });
    EYE_BONE_CONTROLS.forEach((control) => { state.arkit.eyeValues[control.id] = 0; });
    applyHeadRig();
    applyEyeRig();
    applyJawRig();
    ui.arkitControls.querySelectorAll('input[type="range"]').forEach((input) => { input.value = '0'; });
    ui.arkitControls.querySelectorAll('.arkit-control').forEach((row) => {
      const input = row.querySelector('input');
      const output = row.querySelector('output');
      if (output) output.textContent = input?.dataset.headControl || input?.dataset.eyeControl ? '0°' : '0.00';
    });
    ui.arkitControls.querySelectorAll('.is-testing').forEach((row) => row.classList.remove('is-testing'));
    updateARKitStatus();
  }

  function setSettingsPanel(open) {
    ui.settingsPanel.classList.toggle('is-open', open);
    ui.settingsPanel.setAttribute('aria-hidden', String(!open));
    ui.settingsToggle.setAttribute('aria-expanded', String(open));
  }

  function setARKitPanel(open) {
    const nextOpen = Boolean(open);
    if (nextOpen === state.arkit.panelOpen) return;
    if (nextOpen) stopSpeech('manual-rig', true);
    state.arkit.panelOpen = nextOpen;
    ui.arkitPanel.classList.toggle('is-open', nextOpen);
    ui.arkitPanel.setAttribute('aria-hidden', String(!nextOpen));
    document.body.classList.toggle('is-arkit-testing', nextOpen);
    if (nextOpen) clearExpressionLayer(true);
    updateExpressionDiagnostics(performance.now() / 1000, true);

    if (nextOpen) {
      setSettingsPanel(false);
      state.arkit.cameraSnapshot = {
        position: state.camera.position.clone(),
        target: state.controls.target.clone(),
        locked: state.cameraLocked,
      };
      if (window.innerWidth <= 700) {
        state.camera.position.z += 0.18;
        state.camera.position.y -= 0.20;
        state.controls.target.y -= 0.20;
      } else {
        const offset = Math.min(0.10, (state.frame?.height || 1.8) * 0.055);
        state.camera.position.z += 0.12;
        state.camera.position.x += offset;
        state.controls.target.x += offset;
      }
      state.controls.update();
      setCameraLocked(true);
      resetARKitRig();
    } else {
      resetARKitRig();
      if (state.expression.enabled) resetLivingIdle(performance.now() / 1000);
      const snapshot = state.arkit.cameraSnapshot;
      if (snapshot) {
        state.camera.position.copy(snapshot.position);
        state.controls.target.copy(snapshot.target);
        state.controls.update();
        setCameraLocked(snapshot.locked);
      }
      state.arkit.cameraSnapshot = null;
    }
  }

  async function testAllARKitControls() {
    if (ui.arkitTestAll.disabled) return;
    const run = state.arkit.autoTestRun + 1;
    state.arkit.autoTestRun = run;
    resetARKitRig(false);
    const inputs = Array.from(ui.arkitControls.querySelectorAll('input[type="range"]:not(:disabled)'));
    for (let index = 0; index < inputs.length; index += 1) {
      if (run !== state.arkit.autoTestRun) return;
      const input = inputs[index];
      const row = input.closest('.arkit-control');
      const isBone = Boolean(input.dataset.headControl || input.dataset.eyeControl);
      const value = isBone ? Math.min(12, Number(input.max)) : 0.72;
      row.classList.add('is-testing');
      input.value = String(value);
      if (input.dataset.headControl) setHeadRigValue(input.dataset.headControl, value);
      else if (input.dataset.eyeControl) setEyeRigValue(input.dataset.eyeControl, value);
      else setARKitMorph(input.dataset.arkitChannel, value);
      row.querySelector('output').textContent = isBone ? `${value}°` : value.toFixed(2);
      updateARKitStatus(`Testing ${index + 1}/${inputs.length}`);
      await new Promise((resolve) => setTimeout(resolve, 135));
      if (input.dataset.headControl) setHeadRigValue(input.dataset.headControl, 0);
      else if (input.dataset.eyeControl) setEyeRigValue(input.dataset.eyeControl, 0);
      else setARKitMorph(input.dataset.arkitChannel, 0);
      input.value = '0';
      row.querySelector('output').textContent = isBone ? '0°' : '0.00';
      row.classList.remove('is-testing');
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    if (run === state.arkit.autoTestRun) updateARKitStatus(`PASS · ${inputs.length} controls exercised`);
  }

  function remapBakedCC3Clip(sourceClip, root, runtimeName) {
    const bones = {};
    root.traverse((object) => {
      if (object.isBone && object.name && !bones[object.name]) bones[object.name] = object;
    });
    const tracks = [];
    for (const sourceTrack of sourceClip.tracks) {
      const separator = sourceTrack.name.lastIndexOf('.');
      if (separator < 1) continue;
      const boneName = sourceTrack.name.slice(0, separator);
      const property = sourceTrack.name.slice(separator + 1);
      const targetBone = bones[boneName];
      const keepHipPosition = boneName === 'CC_Base_Hip' && property === 'position';
      if (!targetBone || (property !== 'quaternion' && !keepHipPosition)) continue;
      const track = sourceTrack.clone();
      track.name = `${targetBone.uuid}.${property}`;
      tracks.push(track);
    }
    if (!tracks.length) return null;
    const clip = new THREE.AnimationClip(runtimeName, sourceClip.duration, tracks);
    clip.userData = {
      source: sourceClip.name,
      retargetMode: 'offline-cc3-world-bake',
      tracks: tracks.length,
    };
    return clip;
  }

  function applyStandingPose(root) {
    if (!root.getObjectByName('CC_Base_Hip')) {
      return Promise.resolve({ applied: false, tracks: 0, reason: 'non-CC3 model', mixer: null });
    }
    return new Promise((resolve, reject) => {
      new THREE.GLTFLoader().load(
        DEFAULT_STANDING_POSE,
        (gltf) => {
          const sourceClip = gltf.animations.find(
            (clip) => clip.name === 'CC3_Female_Standing_Baked',
          ) || gltf.animations[0];
          const clip = sourceClip
            ? remapBakedCC3Clip(sourceClip, root, 'CC3_Female_Standing_Runtime')
            : null;
          if (!clip) {
            reject(new Error('The baked standing pose contains no compatible CC3 tracks.'));
            return;
          }
          const mixer = new THREE.AnimationMixer(root);
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          mixer.setTime(0);
          action.paused = true;
          root.updateMatrixWorld(true);
          resolve({ applied: true, tracks: clip.tracks.length, clip: clip.name, mixer });
        },
        undefined,
        reject,
      );
    });
  }

  function installModel(root, animations, label, generation) {
    if (generation !== state.loadGeneration) {
      disposeModelRoot(root);
      return;
    }
    clearCurrentModel();
    state.model = root;
    root.name = root.name || 'Sirious_Model';
    state.scene.add(root);
    registerClothing(root);
    const metrics = inspectAndTune(root);
    frameModel(root);

    // Preserve every embedded clip for the later animation system. The default
    // visible pose is loaded from the audited offline CC3 bake below.
    root.userData.siriousAnimations = animations || [];
    state.mixer = null;
    setProgress(95, 'Applying audited 52-bone standing pose');
    applyStandingPose(root)
      .then((pose) => {
        if (generation !== state.loadGeneration || state.model !== root) {
          if (pose.mixer) pose.mixer.stopAllAction();
          return;
        }
        state.mixer = pose.mixer || null;
        frameModel(root);
        registerARKitRig(root);
        if (pose.applied) applyMainInterfaceCamera();
        else setCameraLocked(false);
        const debugState = {
          status: 'ready',
          model: label,
          meshes: metrics.meshes,
          vertices: metrics.vertices,
          textures: metrics.textures,
          animations: animations ? animations.length : 0,
          pose: pose.applied ? 'female-standing' : 'source-rest',
          poseTracks: pose.tracks,
          cameraLocked: state.cameraLocked,
          clothing: JSON.parse(document.body.dataset.clothingState || '{}'),
          screenFilter: FILTER_NAMES[state.filterMode],
          arkit: JSON.parse(document.body.dataset.arkitRig || '{}'),
          quality: state.quality,
        };
        document.body.dataset.modelStats = JSON.stringify(debugState);
        setViewerState('ready', label);
        updateRenderStatus();
        ui.loadingTitle.textContent = 'High-fidelity model ready';
        setProgress(
          100,
          pose.applied
            ? `${pose.tracks} CC3 pose tracks bound without runtime retargeting`
            : `${metrics.meshes} meshes prepared for real-time viewing`,
        );
        requestAnimationFrame(() => setTimeout(() => ui.loadingCard.classList.add('is-complete'), 240));
        console.info('[Sirious] Model ready', debugState);
      })
      .catch((error) => {
        if (generation === state.loadGeneration && state.model === root) showError(error);
      });
  }

  function loaderFor(url) {
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.fbx')) return { type: 'fbx', loader: new THREE.FBXLoader() };
    if (cleanUrl.endsWith('.glb') || cleanUrl.endsWith('.gltf')) return { type: 'gltf', loader: new THREE.GLTFLoader() };
    throw new Error('Unsupported model type. Use a GLB, glTF, or FBX file.');
  }

  function loadModel(url, label) {
    const generation = ++state.loadGeneration;
    ui.errorCard.hidden = true;
    ui.loadingCard.classList.remove('is-complete');
    ui.loadingTitle.textContent = `Loading ${label || 'model'}`;
    setProgress(2, 'Streaming geometry and source textures');
    setViewerState('loading', label || url);
    state.modelUrl = url;

    let descriptor;
    try {
      descriptor = loaderFor(url);
    } catch (error) {
      showError(error);
      return;
    }

    descriptor.loader.load(
      url,
      (result) => {
        const root = descriptor.type === 'gltf' ? result.scene : result;
        const animations = descriptor.type === 'gltf' ? result.animations : result.animations || [];
        if (generation !== state.loadGeneration) {
          disposeModelRoot(root);
          return;
        }
        installModel(root, animations, label || url.split('/').pop(), generation);
      },
      (event) => {
        if (generation !== state.loadGeneration) return;
        if (event.lengthComputable && event.total > 0) {
          const percent = (event.loaded / event.total) * 92;
          const loaded = (event.loaded / 1048576).toFixed(1);
          const total = (event.total / 1048576).toFixed(1);
          setProgress(percent, `Streaming ${loaded} of ${total} MB`);
        } else {
          setProgress(18, `${(event.loaded / 1048576).toFixed(1)} MB received`);
        }
      },
      (error) => {
        if (generation === state.loadGeneration) showError(error);
      },
    );
  }

  function maximumSafePixelRatio(requested) {
    const gl = state.renderer.getContext();
    const maxBuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096;
    const largestCssDimension = Math.max(window.innerWidth, window.innerHeight, 1);
    return Math.max(1, Math.min(requested, maxBuffer / largestCssDimension));
  }

  function applyQuality(profile) {
    state.quality = profile;
    const requested = profile === 'peak'
      ? Math.min(window.devicePixelRatio || 1, 2.5)
      : Math.min(window.devicePixelRatio || 1, 1.5);
    state.renderScale = maximumSafePixelRatio(requested);
    state.renderer.setPixelRatio(state.renderScale);
    state.renderer.setSize(window.innerWidth, window.innerHeight, false);
    resizePostTarget();
    const shadowSize = profile === 'peak' ? 2048 : 1024;
    state.scene && state.scene.traverse((object) => {
      if (object.isLight && object.shadow && object.shadow.mapSize) {
        object.shadow.mapSize.set(shadowSize, shadowSize);
        if (object.shadow.map) {
          object.shadow.map.dispose();
          object.shadow.map = null;
        }
      }
    });
    updateResolutionLabel();
    if (document.body.dataset.viewerState === 'ready') {
      updateRenderStatus();
    }
    const stats = document.body.dataset.modelStats;
    if (stats) {
      try {
        const parsed = JSON.parse(stats);
        parsed.quality = profile;
        document.body.dataset.modelStats = JSON.stringify(parsed);
      } catch (_) { /* diagnostics only */ }
    }
  }

  function updateResolutionLabel() {
    if (!state.renderer) return;
    const size = new THREE.Vector2();
    state.renderer.getDrawingBufferSize(size);
    ui.resolution.textContent = `${Math.round(size.x)}×${Math.round(size.y)} · ${state.renderScale.toFixed(2)}×`;
  }

  function onResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    applyQuality(state.quality);
  }

  function animate(now) {
    state.frameRequest = requestAnimationFrame(animate);
    const delta = Math.min((now - state.lastTime) / 1000, 0.05);
    state.lastTime = now;
    if (state.mixer) state.mixer.update(delta);
    updateSpeech(delta);
    updateLivingIdle(now / 1000, delta);
    if (state.arkit.panelOpen) {
      // Keep the ARKit state authoritative after animation evaluation. Several
      // CC3 facial layers own the same channel (body, brows, tear line, and eye
      // occlusion), so every layer must receive the identical value each frame.
      applyARKitMorphs();
      applyHeadRig();
      applyJawRig();
    }
    state.controls.update();
    if (state.filterMode === 0 || !state.post) {
      state.renderer.setRenderTarget(null);
      state.renderer.render(state.scene, state.camera);
    } else {
      state.post.uniforms.uTime.value = now / 1000;
      state.renderer.setRenderTarget(state.post.target);
      state.renderer.render(state.scene, state.camera);
      state.renderer.setRenderTarget(null);
      state.renderer.render(state.post.scene, state.post.camera);
    }
  }

  function wireInterface() {
    ui.settingsToggle.addEventListener('click', () => {
      if (state.arkit.panelOpen) setARKitPanel(false);
      setSettingsPanel(!ui.settingsPanel.classList.contains('is-open'));
    });
    window.addEventListener('sirious:open-settings', () => {
      if (state.arkit.panelOpen) setARKitPanel(false);
      setSettingsPanel(true);
      ui.settingsClose.focus();
    });
    window.addEventListener('sirious:reset-view', () => {
      resetView();
    });
    ui.settingsClose.addEventListener('click', () => setSettingsPanel(false));
    ui.qualitySelect.addEventListener('change', () => applyQuality(ui.qualitySelect.value));
    ui.shadowsToggle.addEventListener('change', () => {
      state.renderer.shadowMap.enabled = ui.shadowsToggle.checked;
      state.renderer.shadowMap.needsUpdate = true;
    });
    ui.cameraLockToggle.addEventListener('click', () => {
      setCameraLocked(!state.cameraLocked);
    });
    ui.clothing.bra.visibility.addEventListener('click', () => toggleClothing('bra'));
    ui.clothing.bra.remove.addEventListener('click', () => removeClothing('bra'));
    ui.clothing.underwear.visibility.addEventListener('click', () => toggleClothing('underwear'));
    ui.clothing.underwear.remove.addEventListener('click', () => removeClothing('underwear'));
    ui.filterButtons.forEach((button) => {
      button.addEventListener('click', () => setScreenFilter(button.dataset.filter));
    });
    ui.arkitOpen.addEventListener('click', () => setARKitPanel(true));
    ui.arkitClose.addEventListener('click', () => setARKitPanel(false));
    ui.arkitReset.addEventListener('click', () => resetARKitRig());
    ui.arkitTestAll.addEventListener('click', testAllARKitControls);
    ui.expressionToggle.addEventListener('click', () => {
      setLivingIdleEnabled(!state.expression.enabled);
    });
    ui.arkitControls.addEventListener('input', (event) => {
      const input = event.target;
      if (!input || input.type !== 'range') return;
      const value = Number(input.value) || 0;
      if (input.dataset.arkitChannel) setARKitMorph(input.dataset.arkitChannel, value);
      else if (input.dataset.headControl) setHeadRigValue(input.dataset.headControl, value);
      else if (input.dataset.eyeControl) setEyeRigValue(input.dataset.eyeControl, value);
      const output = input.closest('.arkit-control')?.querySelector('output');
      if (output) output.textContent = input.dataset.headControl || input.dataset.eyeControl
        ? `${Math.round(value)}°`
        : value.toFixed(2);
    });
    ui.arkitControls.addEventListener('click', (event) => {
      const button = event.target.closest('[data-eye-gaze]');
      if (!button) return;
      setCoordinatedSideGaze(button.dataset.eyeGaze);
    });
    ui.exposureRange.addEventListener('input', () => {
      const exposure = Number(ui.exposureRange.value);
      state.renderer.toneMappingExposure = exposure;
      ui.exposureValue.textContent = exposure.toFixed(2);
    });
    document.getElementById('reset-view').addEventListener('click', resetView);
    document.getElementById('retry-button').addEventListener('click', () => loadModel(state.modelUrl, 'CC3 master'));
    ui.modelInput.addEventListener('change', () => {
      const file = ui.modelInput.files && ui.modelInput.files[0];
      if (!file) return;
      if (file.size > MAX_LOCAL_MODEL_BYTES) {
        showError(new Error('That model is larger than the 512 MB local safety limit.'));
        ui.modelInput.value = '';
        return;
      }
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = URL.createObjectURL(file);
      loadModel(state.objectUrl, file.name);
      setSettingsPanel(false);
    });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pagehide', () => {
      if (!state.objectUrl) return;
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }, { once: true });
  }

  async function boot() {
    try {
      initRenderer();
      initScene();
      initPostProcessing();
      buildARKitControls();
      updateARKitStatus('Waiting for the CC3 face');
      applyQuality('peak');
      setScreenFilter(0);
      wireInterface();
      window.SiriousChat.mount(document.getElementById('chat-panel'));
      animate(performance.now());
      setProgress(5, 'Building image-based studio lighting');
      await loadEnvironment();
      loadModel(DEFAULT_MODEL, 'CC3 master');
    } catch (error) {
      showError(error);
    }
  }

  window.SiriousFaceSpeech = Object.freeze({
    play: playSpeech,
    stop: () => stopSpeech('external-stop', false),
    getState: () => JSON.parse(document.body.dataset.lipSync || '{}'),
  });

  boot();
}());
