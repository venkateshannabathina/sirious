// ============================================================
//  CORTANA 3D Companion Chatbot - Three.js Application
//  - Raw Mixamo idle-animation preview
//  - No character model is loaded in this first pass
//  - Audio/chat integration remains available for later model work
// ============================================================

'use strict';

let scene, camera, renderer, clock, orbitControls;
let cc3Model = null;
let animationRoot = null;
let idleRig = null;
let idleSkeleton = null;
let mixer = null;
let currentAction = null;
let debugFrameCounter = 0;
let hemiLight = null;
let keyLight = null;
let fillLight = null;
let floor = null;
let currentShadeKey = 'natural';
let usesCC3Rig = false;
let editorGroup = null;
let editorSelectionHelper = null;
let worldDocument = null;
let savedWorldDocument = null;
let worldDocumentDirty = false;
let selectedWorldObjectId = null;
let selectedSceneNodeUuid = null;
const collapsedSceneNodeUuids = new Set();
let sceneViewMode = 'all';
let worldEditorActive = false;
let editorDragState = null;
let editorPreviousLocoEnabled = false;
let studioEditorMode = 'photo';
let photoBoothRecorder = null;
let photoBoothRecordingChunks = [];
let photoBoothGazeTargetIds = new Set();
let photoBoothMouthTargetIds = new Set();
const photoBoothMouthState = { vowel: '', intensity: 0 };
const photoBoothEyeDirection = { x: 0, y: 0, manual: false };
const photoBoothEyeRestQuaternions = new Map();
const photoBoothEyeOffset = new THREE.Quaternion();
const expressionRigValues = new Map();
const expressionRigTargetIds = new Set();
const expressionRigBoneState = {
    eyeScreenLeft: { x: 0, y: 0 },
    eyeScreenRight: { x: 0, y: 0 },
    jawOpen: 0,
    jawForward: 0,
    tongueRoot: { x: 0, y: 0 },
    tongueTip: { x: 0, y: 0 },
    tongueOut: 0,
    teethUpper: 0,
    teethLower: 0
};
const expressionRigBoneOffset = new THREE.Quaternion();
const expressionRigBoneRestQuaternions = new Map();
const expressionRigBoneRestPositions = new Map();
const expressionRigBoneDeltas = Object.create(null);
let expressionRigSelectedControl = '';
let expressionRigStrength = 1;
let expressionRigDrag = null;
let studioReturnFocus = null;
let editorUndoStack = [];
let editorRedoStack = [];
let editorColorChangePending = false;
let editorEnvironmentChangePending = false;
let worldEditorSetupComplete = false;
let photoBoothActiveTab = 'animations';
const studioCategoryByMode = {
    photo: 'character',
    world: 'environment'
};
let worldResetArmedUntil = 0;
let worldResetArmTimer = 0;
let axisOrbitDragState = null;
let axisOrbitSuppressClick = false;
const actions = {};
const cc3Bones = {};
const faceChannels = new Map();
const faceCurrentWeights = Object.create(null);
const faceLayers = {
    expression: Object.create(null),
    speech: Object.create(null),
    blink: Object.create(null),
    gaze: Object.create(null)
};
const expressionTargetWeights = Object.create(null);
const allFaceMorphTargets = [];
const faceMorphTargetIds = new Set();
const manualFaceInfluences = new Map();

let pmremGenerator = null;
let hdriTexture = null;

let world;
let physicsBodies = [];
let sky, sun;
let skyClouds = null;

const downRay = new THREE.Raycaster();
const wallRay = new THREE.Raycaster();
const editorRay = new THREE.Raycaster();
const editorPointer = new THREE.Vector2();
const editorDragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const editorDragPoint = new THREE.Vector3();
const downVector = new THREE.Vector3(0, -1, 0);

// ── Fast collision structures (built once at load) ─────────────
let collisionBoxes = [];     // Array of THREE.Box3 for wall/object AABB collision
let floorMeshes = [];        // Subset of colliders that are roughly horizontal (floors)

// The render floor and the physics floor use the same top surface.  Keep a
// tiny visual gap so animation precision never z-fights with the floor.
const GROUND_Y = 0;
const GROUND_THICKNESS = 0.4;
const GROUND_CLEARANCE = 0.015;

// Keep the player on a golden-ratio composition line instead of centering a close-up.
// The lower focus point gives the ground enough screen space to read as a world.
const GOLDEN_RATIO = 1.61803398875;
const WORLD_VIEW = Object.freeze({
    cameraFov: 52,
    portraitCameraFov: 78,
    chatFov: 40,
    sprintFov: 59,
    initialCharacterHeight: 1.75,
    initialDistanceHeightRatio: 1.8,
    initialCameraHeightRatio: 0.75,
    initialFocusHeightRatio: 0.60,
    movementDistanceHeightRatio: 1.6,
    chatDistanceHeightRatio: 1.42,
    chatSideHeightRatio: -0.34,
    chatLiftHeightRatio: 0.17,
    chatFocusHeightRatio: 0.63,
    followResponsiveness: 9
});

let isSpeaking = false;
let audioContext = null;
let analyser = null;
let analyserReady = false;
let audioFrequencyData = null;
let ttsSource = null;
let lastTalkingActionKey = null;
let blinkCooldown = randomBetween(2, 5);
let blinkProgress = 0;
let blinkIsClosing = false;
let blinkDuration = 0.14;
let lipSyncTimeline = { version: 1, source: 'none', duration: 0, cues: [] };
let lipSyncPreviewStartedAt = 0;
let lipSyncPreviewActive = false;
let webAudioPlaybackStartedAt = 0;
let expressionResponseSeconds = 0.18;
let expressionReturnAt = 0;
let currentEmotion = 'Neutral';
let facialEngine = null;

const audioEl = document.getElementById('tts-audio');
const SPEECH_VISEMES = Object.freeze([
    'V_Open',
    'V_Explosive',
    'V_Dental_Lip',
    'V_Tight_O',
    'V_Tight',
    'V_Wide',
    'V_Affricate',
    'V_Lip_Open'
]);
const SPEECH_TONGUE_SHAPES = Object.freeze([
    'V_Tongue_up',
    'V_Tongue_Raise',
    'V_Tongue_Out',
    'V_Tongue_Narrow',
    'V_Tongue_Lower',
    'V_Tongue_Curl_U',
    'V_Tongue_Curl_D'
]);
const SPEECH_JAW_OPEN = Object.freeze({
    V_Open: 0.92,
    V_Explosive: 0.08,
    V_Dental_Lip: 0.24,
    V_Tight_O: 0.52,
    V_Tight: 0.38,
    V_Wide: 0.42,
    V_Affricate: 0.22,
    V_Lip_Open: 0.46
});
const PHOTO_BOOTH_VOWEL_RECIPES = Object.freeze({
    A: Object.freeze({
        V_Open: 1,
        V_Lip_Open: 0.82,
        A25_Jaw_Open: 0.72,
        Mouth_Open: 0.62,
        Mouth_Lips_Part: 0.72
    }),
    I: Object.freeze({
        V_Wide: 1,
        V_Tight: 0.28,
        Mouth_Widen: 0.72,
        Mouth_Widen_Sides: 0.58,
        A38_Mouth_Smile_Left: 0.22,
        A39_Mouth_Smile_Right: 0.22
    }),
    U: Object.freeze({
        V_Tight_O: 1,
        Mouth_Pucker: 0.76,
        A29_Mouth_Funnel: 0.62,
        A30_Mouth_Pucker: 0.72
    }),
    E: Object.freeze({
        V_Tight: 0.74,
        V_Wide: 0.86,
        Mouth_Widen: 0.56,
        A38_Mouth_Smile_Left: 0.16,
        A39_Mouth_Smile_Right: 0.16
    }),
    O: Object.freeze({
        V_Lip_Open: 0.92,
        V_Tight_O: 0.72,
        A25_Jaw_Open: 0.46,
        A29_Mouth_Funnel: 0.78,
        Mouth_Pucker_Open: 0.66
    })
});

// ── Head-follow-cursor system ──────────────────────────────────
const mouseNDC = { x: 0, y: 0 };           // normalised device coords (−1 … 1)
const headTarget = { yaw: 0, pitch: 0 };    // target rotation (radians)
const headCurrent = { yaw: 0, pitch: 0 };   // smoothed rotation (radians)
const HEAD_YAW_LIMIT   = 0.75;              // max left/right base (scales up to 1.5 rad ≈ 85°)
const HEAD_PITCH_LIMIT  = 0.60;             // max up/down base (scales up to 1.2 rad ≈ 68°)
const NECK_RATIO        = 0.35;             // how much of the turn the neck shares
const HEAD_SMOOTHING    = 0.045;            // lower = more damped / spring-like
let   headBoneRef  = null;                  // resolved after loading
let   neckBoneRef  = null;

const CC3_ANIMATION_BASE = '/model/cc3/animations/';
const CC3_CHARACTER_PATH = '/model/cc3/cc3_master.glb';
const CC3_BAKED_IDLE_PATH = CC3_ANIMATION_BASE + 'idle_baked.glb?v=foot-contact-v4';
// The original talking FBXs are not present in this checkout. Keep speech
// animation disabled until CC3-baked clips are supplied rather than issuing
// failing network requests or binding incompatible Mixamo tracks.
const TALKING_ANIMATIONS = Object.freeze([]);

// ── Female Locomotion Pack animations ─────────────────────────
const LOCOMOTION_ANIMATIONS = Object.freeze([
    { key: 'loco_walk', path: 'walk_baked.glb', clip: 'CC3_Loco_Walk_Baked', nominalSpeed: 1.4 },
    { key: 'loco_run', path: 'run_baked.glb', clip: 'CC3_Loco_Run_Baked', nominalSpeed: 3.2 },
    { key: 'loco_jump', path: 'jump_baked.glb', clip: 'CC3_Loco_Jump_Baked', nominalSpeed: 0 },
    { key: 'loco_left_walk', path: 'left_walk_baked.glb', clip: 'CC3_Loco_Left_Walk_Baked', nominalSpeed: 1.4 },
    { key: 'loco_right_walk', path: 'right_walk_baked.glb', clip: 'CC3_Loco_Right_Walk_Baked', nominalSpeed: 1.4 },
    { key: 'loco_left_run', path: 'left_run_baked.glb', clip: 'CC3_Loco_Left_Run_Baked', nominalSpeed: 3.2 },
    { key: 'loco_right_run', path: 'right_run_baked.glb', clip: 'CC3_Loco_Right_Run_Baked', nominalSpeed: 3.2 },
    { key: 'loco_left_turn', path: 'left_turn_baked.glb', clip: 'CC3_Loco_Left_Turn_Baked', nominalSpeed: 0 },
    { key: 'loco_right_turn', path: 'right_turn_baked.glb', clip: 'CC3_Loco_Right_Turn_Baked', nominalSpeed: 0 },
]);

// ── Locomotion state ───────────────────────────────────────────
const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
let locoCurrentKey = 'idle';
let locoJumping = false;
let locoGrounded = true;
let locoGroundRootY = 0;
let locoVerticalVelocity = 0;
let locoSpeed = 0;
let locoPreviousSpeed = 0;
let locoForwardInput = 0;
let locoSideInput = 0;
let locoGait = 'idle';
let locoDirection = 'idle';
let LOCO_WALK_SPEED = 1.4;
let LOCO_BACKWARD_SPEED = 1.0;
let LOCO_RUN_SPEED = 3.2;
const locomotionClipSpeeds = {};
const LOCO_ACCELERATION = 10.5;
const LOCO_DECELERATION = 13.0;
const LOCO_AIR_CONTROL = 2.2;
const LOCO_ROTATE_RESPONSE = 11.0;
const LOCO_JUMP_IMPULSE = 9.2;
const LOCO_GRAVITY = 25.0;
const _locoDir  = new THREE.Vector3();
const _locoTargetVelocity = new THREE.Vector3();
const _locoVelocity = new THREE.Vector3();
const _locoFacingDirection = new THREE.Vector3();
const _locoEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _cameraForward = new THREE.Vector3();
const _cameraRight = new THREE.Vector3();
const _characterForward = new THREE.Vector3();
const _characterRight = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const MODEL_FORWARD = new THREE.Vector3(0, 0, 1);

// Camera follow state
const _camTarget   = new THREE.Vector3();
const _cameraDesiredTarget = new THREE.Vector3();
const _cameraDesiredPosition = new THREE.Vector3();
const _cameraFollowDelta = new THREE.Vector3();
const _cameraDistanceVector = new THREE.Vector3();
const _cameraViewRight = new THREE.Vector3();
const _cameraMotionOffset = new THREE.Vector3();
const CAMERA_SCROLL_ZOOM = Object.freeze({
    speed: 0.0025,
    minHeightRatio: 0.65,
    maxHeightRatio: 12
});
const CAMERA_VIEW_STORAGE_KEY = 'cortana.camera.customView.v1';
const CAMERA_VIEW_PRESETS = Object.freeze({
    portrait: { yaw: -14, pitch: 12, distance: 1.42, targetHeight: 0.63, fov: 40 },
    face: { yaw: -7, pitch: 5, distance: 0.48, targetHeight: 0.86, fov: 32 },
    body: { yaw: -8, pitch: 6, distance: 2.35, targetHeight: 0.52, fov: 43 },
    hero: { yaw: -28, pitch: 9, distance: 1.58, targetHeight: 0.61, fov: 38 },
    front: { yaw: 0, pitch: 4, distance: 1.48, targetHeight: 0.61, fov: 40 },
    profile: { yaw: -90, pitch: 4, distance: 1.55, targetHeight: 0.61, fov: 42 },
    right: { yaw: 90, pitch: 4, distance: 1.55, targetHeight: 0.61, fov: 42 },
    rear: { yaw: 180, pitch: 5, distance: 1.75, targetHeight: 0.58, fov: 42 },
    top: { yaw: 0, pitch: 72, distance: 2.1, targetHeight: 0.46, fov: 46 },
    wide: { yaw: -25, pitch: 14, distance: 3.35, targetHeight: 0.46, fov: 50 }
});
let cameraMode = 'chat';
let cameraViewMode = 'portrait';
let cameraControlMode = 'orbit';
let cameraTransition = null;
let cameraMovementBaseDistance = 0;
let cameraBobPhase = 0;
let cameraRoll = 0;
let cameraLandingShake = 0;
let cameraLandingPhase = 0;
let customCameraView = null;
let   locoEnabled  = false; // set true once loco animations are loaded
let animationRigBindPose = null;

const EXPRESSION_PRESETS = Object.freeze({
    Neutral: Object.freeze({}),
    Happy: Object.freeze({
        A38_Mouth_Smile_Left: 0.62,
        A39_Mouth_Smile_Right: 0.62,
        A21_Cheek_Squint_Left: 0.30,
        A22_Cheek_Squint_Right: 0.30
    }),
    Excited: Object.freeze({
        A38_Mouth_Smile_Left: 0.78,
        A39_Mouth_Smile_Right: 0.78,
        A21_Cheek_Squint_Left: 0.40,
        A22_Cheek_Squint_Right: 0.40,
        A01_Brow_Inner_Up: 0.26,
        A04_Brow_Outer_Up_Left: 0.30,
        A05_Brow_Outer_Up_Right: 0.30,
        A18_Eye_Wide_Left: 0.14,
        A19_Eye_Wide_Right: 0.14
    }),
    Calm: Object.freeze({
        A38_Mouth_Smile_Left: 0.18,
        A39_Mouth_Smile_Right: 0.18,
        A16_Eye_Squint_Left: 0.08,
        A17_Eye_Squint_Right: 0.08
    }),
    Sad: Object.freeze({
        A01_Brow_Inner_Up: 0.58,
        A40_Mouth_Frown_Left: 0.48,
        A41_Mouth_Frown_Right: 0.48,
        A02_Brow_Down_Left: 0.10,
        A03_Brow_Down_Right: 0.10
    }),
    Empathetic: Object.freeze({
        A01_Brow_Inner_Up: 0.36,
        A38_Mouth_Smile_Left: 0.14,
        A39_Mouth_Smile_Right: 0.14,
        A21_Cheek_Squint_Left: 0.08,
        A22_Cheek_Squint_Right: 0.08
    }),
    Curious: Object.freeze({
        A01_Brow_Inner_Up: 0.24,
        A04_Brow_Outer_Up_Left: 0.54,
        A03_Brow_Down_Right: 0.12,
        A38_Mouth_Smile_Left: 0.12
    }),
    Confident: Object.freeze({
        A38_Mouth_Smile_Left: 0.28,
        A39_Mouth_Smile_Right: 0.42,
        A16_Eye_Squint_Left: 0.12,
        A17_Eye_Squint_Right: 0.12,
        A02_Brow_Down_Left: 0.10,
        A03_Brow_Down_Right: 0.10
    }),
    Serious: Object.freeze({
        A02_Brow_Down_Left: 0.48,
        A03_Brow_Down_Right: 0.48,
        A48_Mouth_Press_Left: 0.22,
        A49_Mouth_Press_Right: 0.22,
        A23_Nose_Sneer_Left: 0.08,
        A24_Nose_Sneer_Right: 0.08
    }),
    Surprised: Object.freeze({
        A01_Brow_Inner_Up: 0.55,
        A04_Brow_Outer_Up_Left: 0.46,
        A05_Brow_Outer_Up_Right: 0.46,
        A18_Eye_Wide_Left: 0.48,
        A19_Eye_Wide_Right: 0.48,
        A25_Jaw_Open: 0.28
    })
});

const MIXAMO_TO_CC3 = {
    'mixamorig:Hips': 'CC_Base_Hip',
    'mixamorig:Spine': 'CC_Base_Pelvis',
    'mixamorig:Spine1': 'CC_Base_Waist',
    'mixamorig:Spine2': 'CC_Base_Spine01',
    'mixamorig:Neck': 'CC_Base_NeckTwist01',
    'mixamorig:Head': 'CC_Base_Head',

    'mixamorig:LeftShoulder': 'CC_Base_L_Clavicle',
    'mixamorig:LeftArm': 'CC_Base_L_Upperarm',
    'mixamorig:LeftForeArm': 'CC_Base_L_Forearm',
    'mixamorig:LeftHand': 'CC_Base_L_Hand',
    'mixamorig:LeftHandThumb1': 'CC_Base_L_Thumb1',
    'mixamorig:LeftHandThumb2': 'CC_Base_L_Thumb2',
    'mixamorig:LeftHandThumb3': 'CC_Base_L_Thumb3',
    'mixamorig:LeftHandIndex1': 'CC_Base_L_Index1',
    'mixamorig:LeftHandIndex2': 'CC_Base_L_Index2',
    'mixamorig:LeftHandIndex3': 'CC_Base_L_Index3',
    'mixamorig:LeftHandMiddle1': 'CC_Base_L_Mid1',
    'mixamorig:LeftHandMiddle2': 'CC_Base_L_Mid2',
    'mixamorig:LeftHandMiddle3': 'CC_Base_L_Mid3',
    'mixamorig:LeftHandRing1': 'CC_Base_L_Ring1',
    'mixamorig:LeftHandRing2': 'CC_Base_L_Ring2',
    'mixamorig:LeftHandRing3': 'CC_Base_L_Ring3',
    'mixamorig:LeftHandPinky1': 'CC_Base_L_Pinky1',
    'mixamorig:LeftHandPinky2': 'CC_Base_L_Pinky2',
    'mixamorig:LeftHandPinky3': 'CC_Base_L_Pinky3',

    'mixamorig:RightShoulder': 'CC_Base_R_Clavicle',
    'mixamorig:RightArm': 'CC_Base_R_Upperarm',
    'mixamorig:RightForeArm': 'CC_Base_R_Forearm',
    'mixamorig:RightHand': 'CC_Base_R_Hand',
    'mixamorig:RightHandThumb1': 'CC_Base_R_Thumb1',
    'mixamorig:RightHandThumb2': 'CC_Base_R_Thumb2',
    'mixamorig:RightHandThumb3': 'CC_Base_R_Thumb3',
    'mixamorig:RightHandIndex1': 'CC_Base_R_Index1',
    'mixamorig:RightHandIndex2': 'CC_Base_R_Index2',
    'mixamorig:RightHandIndex3': 'CC_Base_R_Index3',
    'mixamorig:RightHandMiddle1': 'CC_Base_R_Mid1',
    'mixamorig:RightHandMiddle2': 'CC_Base_R_Mid2',
    'mixamorig:RightHandMiddle3': 'CC_Base_R_Mid3',
    'mixamorig:RightHandRing1': 'CC_Base_R_Ring1',
    'mixamorig:RightHandRing2': 'CC_Base_R_Ring2',
    'mixamorig:RightHandRing3': 'CC_Base_R_Ring3',
    'mixamorig:RightHandPinky1': 'CC_Base_R_Pinky1',
    'mixamorig:RightHandPinky2': 'CC_Base_R_Pinky2',
    'mixamorig:RightHandPinky3': 'CC_Base_R_Pinky3',

    'mixamorig:LeftUpLeg': 'CC_Base_L_Thigh',
    'mixamorig:LeftLeg': 'CC_Base_L_Calf',
    'mixamorig:LeftFoot': 'CC_Base_L_Foot',
    'mixamorig:LeftToeBase': 'CC_Base_L_ToeBase',
    'mixamorig:RightUpLeg': 'CC_Base_R_Thigh',
    'mixamorig:RightLeg': 'CC_Base_R_Calf',
    'mixamorig:RightFoot': 'CC_Base_R_Foot',
    'mixamorig:RightToeBase': 'CC_Base_R_ToeBase',
};

const CC3_BONE_ALIASES = {
    CC_Base_Waist: ['CC_Base_Waist', 'CC_Base_Spine01', 'CC_Base_Pelvis'],
    CC_Base_Spine01: ['CC_Base_Spine01', 'CC_Base_Spine02', 'CC_Base_Waist'],
    CC_Base_NeckTwist01: ['CC_Base_NeckTwist01', 'CC_Base_NeckTwist02'],
};

const SHADE_PRESETS = {
    natural: {
        background: 0xffffff,
        exposure: 1.05,
        hemi: [0xffffff, 0xd9e3ff, 1.15],
        key: [0xfff7ed, 1.6],
        fill: [0xe7efff, 0.75],
        floorOpacity: 0.08,
        materials: {
            skin: 0xd6a38a,
            hair: 0x2f2523,
            eye: 0xf7f7f7,
            teeth: 0xf8f1e5,
            tongue: 0xb65a6a,
            cloth: 0x343840,
            default: 0xd8c9bd
        }
    },
    warm: {
        background: 0xfffbf6,
        exposure: 1.08,
        hemi: [0xfff5e6, 0xf1d4bd, 1.2],
        key: [0xffd0a1, 1.75],
        fill: [0xffead9, 0.65],
        floorOpacity: 0.1,
        materials: {
            skin: 0xe2aa87,
            hair: 0x3a2420,
            eye: 0xfff8ef,
            teeth: 0xfff3e3,
            tongue: 0xc76272,
            cloth: 0x4b3e45,
            default: 0xdfb99a
        }
    },
    cool: {
        background: 0xf7fbff,
        exposure: 1.04,
        hemi: [0xf4fbff, 0xbfd3ee, 1.25],
        key: [0xddeeff, 1.55],
        fill: [0xbcd7ff, 0.9],
        floorOpacity: 0.09,
        materials: {
            skin: 0xc7d1da,
            hair: 0x24313b,
            eye: 0xf2fbff,
            teeth: 0xf4f8ff,
            tongue: 0x9f6677,
            cloth: 0x263a4d,
            default: 0xc2d0df
        }
    },
    clay: {
        background: 0xf8f6f2,
        exposure: 1.0,
        hemi: [0xffffff, 0xd8d2ca, 1.05],
        key: [0xfff2df, 1.35],
        fill: [0xe0ded8, 0.55],
        floorOpacity: 0.12,
        materials: {
            skin: 0xb9aa99,
            hair: 0x8f8276,
            eye: 0xcfc6ba,
            teeth: 0xcfc6ba,
            tongue: 0xb9aa99,
            cloth: 0x9c9084,
            default: 0xb9aa99
        }
    },
    graphite: {
        background: 0xf4f4f4,
        exposure: 0.96,
        hemi: [0xffffff, 0xc8c8c8, 1.0],
        key: [0xffffff, 1.3],
        fill: [0xd8d8d8, 0.55],
        floorOpacity: 0.14,
        materials: {
            skin: 0x8f8f8f,
            hair: 0x242424,
            eye: 0xd8d8d8,
            teeth: 0xd0d0d0,
            tongue: 0x777777,
            cloth: 0x3a3a3a,
            default: 0x8a8a8a
        }
    },
    xray: {
        background: 0xf7fbff,
        exposure: 1.16,
        hemi: [0xe9f7ff, 0x92bde4, 1.35],
        key: [0xb7e4ff, 1.75],
        fill: [0x80c6ff, 1.05],
        floorOpacity: 0.05,
        opacity: 0.48,
        roleOpacity: {
            eye: 0.72,
            teeth: 0.65,
            tongue: 0.55,
            cloth: 0.36,
            hair: 0.42
        },
        materials: {
            skin: 0x72c9ff,
            hair: 0x2c5f82,
            eye: 0xe8fbff,
            teeth: 0xd9fbff,
            tongue: 0x65a7cf,
            cloth: 0x255476,
            default: 0x72c9ff
        }
    },
    material_preview: {
        background: 0x333333,
        exposure: 1.0,
        useHDRI: true,
        hemi: [0xffffff, 0xffffff, 0.4],
        key: [0xffffff, 1.2],
        fill: [0xffffff, 0.5],
        floorOpacity: 0.1,
        materials: {
            skin: 0xd6a38a,
            hair: 0x2f2523,
            eye: 0xf7f7f7,
            teeth: 0xf8f1e5,
            tongue: 0xb65a6a,
            cloth: 0x343840,
            default: 0xd8c9bd
        }
    }
};

function init() {
    clock = new THREE.Clock();
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0c0e);

    camera = new THREE.PerspectiveCamera(WORLD_VIEW.cameraFov, window.innerWidth / window.innerHeight, 0.1, 1400);
    updateResponsiveCameraFov();
    applyWorldCameraFraming(WORLD_VIEW.initialCharacterHeight);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // ── Orbit Controls ─────────────────────────────────────────
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.18;
    orbitControls.rotateSpeed = 0.95;
    orbitControls.zoomSpeed = 1.05;
    orbitControls.enablePan = false;
    orbitControls.minDistance = 1.5;
    orbitControls.maxDistance = 45;
    orbitControls.maxPolarAngle = Math.PI * 0.85;   // don't flip under floor
    orbitControls.minPolarAngle = Math.PI * 0.1;    // don't go fully overhead
    orbitControls.target.copy(_camTarget);
    orbitControls.update();
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.title = 'Drag to orbit around the character. Scroll to zoom.';
    window.addEventListener('wheel', handleCameraWheelZoom, { passive: false });

    hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.25);
    scene.add(hemiLight);

    keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(5, 15, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    scene.add(keyLight);

    fillLight = new THREE.DirectionalLight(0xe7efff, 0.9);
    fillLight.position.set(-8, 10, -6);
    scene.add(fillLight);

    initPhysics();
    createWhiteTileWorld();

    setupShadeControls();
    applyShadePreset(currentShadeKey);
    window.addEventListener('resize', onResize);

    // Track mouse for head-follow
    window.addEventListener('mousemove', (e) => {
        mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;   // −1 (left) … +1 (right)
        mouseNDC.y = -((e.clientY / window.innerHeight) * 2 - 1); // −1 (bottom) … +1 (top)
    });
}

function createWhiteTileWorld() {
    if (floor) {
        scene.remove(floor);
        floor.geometry?.dispose?.();
        if (floor.material?.map) floor.material.map.dispose();
        floor.material?.dispose?.();
        floor = null;
    }

    collisionBoxes = [];
    floorMeshes = [];

    const worldSize = 120;
    const groundGeometry = new THREE.PlaneGeometry(worldSize, worldSize, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: createGroundTexture(),
        roughness: 0.78,
        metalness: 0.02
    });

    floor = new THREE.Mesh(groundGeometry, groundMaterial);
    floor.name = 'White_Tile_Ground';
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = GROUND_Y;
    floor.receiveShadow = true;
    floor.updateMatrixWorld(true);
    scene.add(floor);
    floorMeshes.push(floor);

    scene.background = new THREE.Color(0xffffff);
    if (hemiLight) {
        hemiLight.color.set(0xffffff);
        hemiLight.groundColor.set(0xffffff);
        hemiLight.intensity = 1.65;
    }
    if (keyLight) keyLight.intensity = 1.35;
    if (fillLight) fillLight.intensity = 1.15;

    if (animationRoot) {
        animationRoot.position.set(0, GROUND_Y + GROUND_CLEARANCE, 0);
        locoGroundRootY = GROUND_Y + GROUND_CLEARANCE;
        locoGrounded = true;
        applyWorldCameraFraming(Math.max(getCharacterFrame()?.size.y || 0, WORLD_VIEW.initialCharacterHeight));
        if (orbitControls) {
            orbitControls.target.copy(_camTarget);
            orbitControls.update();
        }
    }

    console.log('[World] White tiled world created.');
}

function initSky() {
    // Sky disabled for the clean white tile world.
}

function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 12;
    world.solver.tolerance = 0.001;
    world.allowSleep = true;
    world.defaultContactMaterial.friction = 0.72;
    world.defaultContactMaterial.restitution = 0.04;

    const groundShape = new CANNON.Plane();
    const groundMaterial = new CANNON.Material('open-world-ground');
    const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
    groundBody.addShape(groundShape);
    groundBody.position.y = GROUND_Y;
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

function applyWorldCameraFraming(characterHeight) {
    const distance = Math.max(18, characterHeight * WORLD_VIEW.initialDistanceHeightRatio);

    camera.position.set(
        0,
        Math.max(5.8, characterHeight * WORLD_VIEW.initialCameraHeightRatio),
        distance
    );
    _camTarget.set(
        0,
        characterHeight * 0.45,
        0
    );
    camera.lookAt(_camTarget);
}

function createGroundTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 512;
    textureCanvas.height = 512;
    const context = textureCanvas.getContext('2d');
    const squareSize = 64;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            context.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#f4f4f1';
            context.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
            context.strokeStyle = 'rgba(180, 184, 188, 0.46)';
            context.lineWidth = 2;
            context.strokeRect(x * squareSize, y * squareSize, squareSize, squareSize);
        }
    }

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(30, 30);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

function createDefaultWorldDocument() {
    return {
        version: 1,
        environment: {
            background: '#ffffff',
            ground_color: '#ffffff',
            tile_scale: 30
        },
        objects: []
    };
}

function cloneWorldDocument(document) {
    return JSON.parse(JSON.stringify(document || createDefaultWorldDocument()));
}

function createWorldObjectId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `world-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeWorldDocument(document) {
    const normalized = cloneWorldDocument(document);
    normalized.version = 1;
    normalized.environment = {
        ...createDefaultWorldDocument().environment,
        ...(normalized.environment || {})
    };
    normalized.objects = Array.isArray(normalized.objects) ? normalized.objects : [];
    return normalized;
}

async function loadWorldDocument() {
    try {
        const response = await fetch('/api/world', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const document = normalizeWorldDocument(await response.json());
        savedWorldDocument = cloneWorldDocument(document);
        applyWorldDocument(document);
        worldDocumentDirty = false;
        setWorldEditorStatus('All changes saved');
    } catch (error) {
        console.error('[World Editor] Failed to load the saved world:', error);
        const fallback = createDefaultWorldDocument();
        savedWorldDocument = cloneWorldDocument(fallback);
        applyWorldDocument(fallback);
        setWorldEditorStatus('Using the default world', 'error');
    }
}

function applyWorldDocument(document, preferredSelectionId = selectedWorldObjectId) {
    worldDocument = normalizeWorldDocument(document);

    if (editorSelectionHelper) {
        scene.remove(editorSelectionHelper);
        editorSelectionHelper.geometry?.dispose?.();
        editorSelectionHelper.material?.dispose?.();
        editorSelectionHelper = null;
    }

    if (editorGroup) {
        editorGroup.traverse((child) => {
            child.geometry?.dispose?.();
            if (Array.isArray(child.material)) {
                child.material.forEach((material) => material?.dispose?.());
            } else {
                child.material?.dispose?.();
            }
        });
        scene.remove(editorGroup);
    }

    editorGroup = new THREE.Group();
    editorGroup.name = 'Saved_World_Objects';
    scene.add(editorGroup);

    worldDocument.objects.forEach((worldObject) => {
        editorGroup.add(createWorldObjectMesh(worldObject));
    });

    applyWorldEnvironment();
    rebuildWorldObjectCollisions();
    selectedWorldObjectId = worldDocument.objects.some((item) => item.id === preferredSelectionId)
        ? preferredSelectionId
        : null;
    refreshWorldEditor();
    updateEditorSelectionHelper();
}

function createWorldObjectMesh(worldObject) {
    let geometry;
    if (worldObject.type === 'sphere') {
        geometry = new THREE.SphereGeometry(0.5, 32, 20);
    } else if (worldObject.type === 'cylinder') {
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    } else {
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(worldObject.color || '#4f7cff'),
        roughness: 0.55,
        metalness: 0.04
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = worldObject.name;
    mesh.userData.worldObjectId = worldObject.id;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    updateWorldObjectMesh(mesh, worldObject);
    return mesh;
}

function updateWorldObjectMesh(mesh, worldObject) {
    const transform = worldObject.transform;
    mesh.name = worldObject.name;
    mesh.visible = worldObject.visible !== false;
    mesh.position.fromArray(transform.position);
    mesh.rotation.set(...transform.rotation);
    mesh.scale.fromArray(transform.scale);
    mesh.material.color.set(worldObject.color || '#4f7cff');
    mesh.updateMatrixWorld(true);
}

function getWorldObject(id = selectedWorldObjectId) {
    return worldDocument?.objects?.find((worldObject) => worldObject.id === id) || null;
}

function getWorldObjectMesh(id = selectedWorldObjectId) {
    return editorGroup?.children?.find((child) => child.userData.worldObjectId === id) || null;
}

function applyWorldEnvironment() {
    if (!worldDocument || !scene) return;
    const environment = worldDocument.environment;
    scene.background = new THREE.Color(environment.background);
    if (floor?.material) {
        floor.material.color.set(environment.ground_color);
        if (floor.material.map) {
            const density = THREE.MathUtils.clamp(Number(environment.tile_scale) || 30, 4, 60);
            floor.material.map.repeat.set(density, density);
            floor.material.map.needsUpdate = true;
        }
        floor.material.needsUpdate = true;
    }
}

function rebuildWorldObjectCollisions() {
    collisionBoxes = [];
    if (!editorGroup || !worldDocument) return;
    worldDocument.objects.forEach((worldObject) => {
        const mesh = getWorldObjectMesh(worldObject.id);
        if (!mesh || !mesh.visible || !worldObject.collision) return;
        mesh.updateMatrixWorld(true);
        collisionBoxes.push(new THREE.Box3().setFromObject(mesh));
    });
}

function refreshWorldEditor() {
    renderWorldObjectList();
    renderSceneHierarchyList();
    renderEditorFaceControls();
    syncWorldObjectInspector();
    syncWorldEnvironmentControls();
    updateWorldEditorCommands();
}

function getMorphTargetValue(target) {
    return target?.mesh?.morphTargetInfluences?.[target.index] || 0;
}

function getFaceMorphCategory(name) {
    if (/viseme|mouth|jaw|lip|tongue|aa|ih|ou|eh|oh/i.test(name)) return 'Mouth';
    if (/eye|blink|lid|squint|wink|look/i.test(name)) return 'Eyes';
    if (/brow|forehead/i.test(name)) return 'Brows';
    if (/smile|sad|frown|cheek|nose|happy|angry|surprise|serious/i.test(name)) return 'Expression';
    return 'Shapes';
}

function getLogicalMorphKey(mesh, index) {
    for (const [name, entries] of faceChannels.entries()) {
        if (entries.some((entry) => entry.mesh === mesh && entry.index === index)) return name;
    }
    return '';
}

function registerFaceMorphTarget(mesh, name, index) {
    const id = `${mesh.uuid}:${index}`;
    if (faceMorphTargetIds.has(id)) return;
    faceMorphTargetIds.add(id);
    const target = {
        id,
        name,
        mesh,
        index,
        meshName: mesh.name || 'Unnamed mesh',
        category: getFaceMorphCategory(name),
        logicalKey: name
    };
    allFaceMorphTargets.push(target);
    if (!faceChannels.has(name)) faceChannels.set(name, []);
    faceChannels.get(name).push(target);
}

function setFaceMorphTargetValue(target, value, manual = false) {
    if (!target?.mesh?.morphTargetInfluences) return;
    const clamped = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
    target.mesh.morphTargetInfluences[target.index] = clamped;
    if (manual) manualFaceInfluences.set(target.id, clamped);
    syncFaceMorphRow(target, clamped);
}

function syncFaceMorphRow(target, value = getMorphTargetValue(target)) {
    const row = document.querySelector(`[data-face-row="${target.id}"]`);
    if (!row) return;
    const slider = row.querySelector('[data-face-slider]');
    const output = row.querySelector('[data-face-value]');
    const percent = Math.round(value * 100);
    if (slider && document.activeElement !== slider) slider.value = String(percent);
    if (output) output.textContent = `${percent}%`;
}

function syncFaceEditorSliders() {
    if (!worldEditorActive || debugFrameCounter % 10 !== 0) return;
    allFaceMorphTargets.forEach((target) => syncFaceMorphRow(target));
}

function renderEditorFaceControls() {
    const list = document.getElementById('editor-face-list');
    const count = document.getElementById('editor-face-count');
    const summary = document.getElementById('editor-face-summary');
    const reset = document.getElementById('editor-face-reset');
    if (!list) return;

    const targets = [...allFaceMorphTargets].sort((a, b) => {
        const category = a.category.localeCompare(b.category);
        return category || a.name.localeCompare(b.name);
    });

    list.replaceChildren();
    if (count) count.textContent = String(targets.length);
    const photoCount = document.getElementById('photo-face-key-count');
    if (photoCount) photoCount.textContent = String(targets.length);
    if (summary) {
        const meshCount = new Set(targets.map((target) => target.mesh.uuid)).size;
        summary.textContent = targets.length
            ? `${targets.length} keys · ${faceChannels.size} synced channels · ${meshCount} meshes`
            : 'No face keys loaded';
    }
    if (reset) reset.disabled = targets.length === 0;

    let activeCategory = '';
    targets.forEach((target) => {
        if (target.category !== activeCategory) {
            activeCategory = target.category;
            const heading = document.createElement('div');
            heading.className = 'face-editor-category';
            heading.textContent = activeCategory;
            list.appendChild(heading);
        }

        const row = document.createElement('label');
        row.className = 'face-editor-row';
        row.dataset.faceRow = target.id;

        const header = document.createElement('span');
        header.className = 'face-editor-row-head';

        const name = document.createElement('strong');
        name.textContent = target.name;

        const value = document.createElement('output');
        value.dataset.faceValue = '';
        value.textContent = `${Math.round(getMorphTargetValue(target) * 100)}%`;

        const mesh = document.createElement('small');
        mesh.textContent = target.logicalKey
            ? `${target.meshName} · ${target.logicalKey}`
            : target.meshName;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.step = '1';
        slider.value = String(Math.round(getMorphTargetValue(target) * 100));
        slider.dataset.faceSlider = target.id;

        header.append(name, value);
        row.append(header, mesh, slider);
        list.appendChild(row);
    });
}

const STUDIO_CATEGORIES = Object.freeze({
    photo: Object.freeze(['character', 'appearance', 'outfit', 'hair', 'face', 'animation', 'voice', 'ai']),
    world: Object.freeze(['environment', 'camera', 'lighting', 'objects', 'materials', 'physics', 'world-settings'])
});

const STUDIO_CATEGORY_LABELS = Object.freeze({
    character: 'Character',
    appearance: 'Appearance',
    outfit: 'Outfit',
    hair: 'Hair',
    face: 'Face',
    animation: 'Animation',
    voice: 'Voice',
    ai: 'AI',
    environment: 'Environment',
    camera: 'Camera',
    lighting: 'Lighting',
    objects: 'Objects',
    materials: 'Materials',
    physics: 'Physics',
    'world-settings': 'World Settings'
});

const STUDIO_CATEGORY_CAMERA = Object.freeze({
    character: 'hero',
    appearance: 'portrait',
    outfit: 'body',
    hair: 'hero',
    face: 'face',
    animation: 'body',
    voice: 'portrait',
    ai: 'portrait',
    environment: 'wide',
    lighting: 'portrait',
    objects: 'wide',
    materials: 'body',
    physics: 'body'
});

function setStudioLiveStatus(message, contextMessage = '') {
    const liveStatus = document.getElementById('studio-live-status');
    const contextStatus = document.getElementById('studio-context-status');
    if (liveStatus) liveStatus.textContent = message;
    if (contextStatus) {
        const dot = contextStatus.querySelector('i');
        contextStatus.replaceChildren();
        if (dot) contextStatus.appendChild(dot);
        contextStatus.append(document.createTextNode(contextMessage || message));
    }
}

function updateStudioRootButtons() {
    const root = studioEditorMode === 'world' ? 'world' : 'character';
    const characterButton = document.getElementById('character-mode-button');
    const worldButton = document.getElementById('world-mode-button');
    const cameraButton = document.getElementById('camera-view-button');
    const settingsButton = document.getElementById('settings-button');

    [
        [characterButton, root === 'character'],
        [worldButton, root === 'world']
    ].forEach(([button, activeRoot]) => {
        if (!button) return;
        const active = worldEditorActive && activeRoot;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
        button.setAttribute('aria-expanded', String(active));
    });
    if (cameraButton) {
        cameraButton.classList.toggle('is-active', worldEditorActive && studioEditorMode === 'world' && studioCategoryByMode.world === 'camera');
        cameraButton.setAttribute('aria-expanded', String(worldEditorActive && studioEditorMode === 'world' && studioCategoryByMode.world === 'camera'));
    }
    if (settingsButton) {
        settingsButton.classList.toggle('is-active', worldEditorActive && studioEditorMode === 'photo' && studioCategoryByMode.photo === 'ai');
        settingsButton.setAttribute('aria-expanded', String(worldEditorActive && studioEditorMode === 'photo' && studioCategoryByMode.photo === 'ai'));
    }
}

function setStudioCategory(category, { frameCamera = true } = {}) {
    const allowed = STUDIO_CATEGORIES[studioEditorMode];
    const fallback = studioEditorMode === 'world' ? 'environment' : 'character';
    const nextCategory = allowed.includes(category) ? category : fallback;
    const editor = document.getElementById('world-editor');
    if (!editor) return;

    studioCategoryByMode[studioEditorMode] = nextCategory;
    const root = studioEditorMode === 'world' ? 'world' : 'character';
    const label = STUDIO_CATEGORY_LABELS[nextCategory] || nextCategory;
    editor.dataset.root = root;
    editor.dataset.category = nextCategory;
    document.body.dataset.studioRoot = root;
    document.body.dataset.studioCategory = nextCategory;

    document.getElementById('character-category-nav')?.classList.toggle('hidden', studioEditorMode !== 'photo');
    document.getElementById('world-category-nav')?.classList.toggle('hidden', studioEditorMode !== 'world');

    document.querySelectorAll('[data-studio-category]').forEach((button) => {
        const active = button.dataset.studioCategory === nextCategory;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
    });

    const title = document.getElementById('studio-editor-title');
    const kicker = document.getElementById('studio-editor-kicker');
    const modeLabel = document.getElementById('editor-mode-label');
    if (title) title.textContent = label;
    if (kicker) kicker.textContent = `${root === 'character' ? 'Character' : 'World'} · ${label === 'Character' ? 'Overview' : label}`;
    if (modeLabel) modeLabel.textContent = label;

    if (studioEditorMode === 'photo') {
        document.querySelectorAll('[data-character-category]').forEach((panel) => {
            panel.classList.toggle('hidden', panel.dataset.characterCategory !== nextCategory);
        });
        if (nextCategory === 'animation') {
            setPhotoBoothTab('animations');
        } else if (nextCategory === 'face') {
            setPhotoBoothTab(photoBoothActiveTab === 'creator' ? 'creator' : 'facial');
        } else {
            document.getElementById('photo-booth-animations')?.classList.add('hidden');
            document.getElementById('photo-booth-facial')?.classList.add('hidden');
            document.getElementById('photo-booth-creator')?.classList.add('hidden');
        }
    } else {
        document.querySelectorAll('[data-world-categories]').forEach((section) => {
            const categories = (section.dataset.worldCategories || '').split(/\s+/).filter(Boolean);
            section.classList.toggle('hidden', !categories.includes(nextCategory));
        });
    }

    const showCaptureFooter = studioEditorMode === 'photo' && ['animation', 'face'].includes(nextCategory);
    document.getElementById('photo-booth-footer')?.classList.toggle('hidden', !showCaptureFooter);
    document.getElementById('world-editor-footer')?.classList.toggle('hidden', studioEditorMode !== 'world');

    const editorScroll = editor.querySelector('.editor-scroll');
    if (editorScroll) editorScroll.scrollTop = 0;

    const view = STUDIO_CATEGORY_CAMERA[nextCategory];
    if (frameCamera && worldEditorActive && view && nextCategory !== 'camera') {
        requestAnimationFrame(() => {
            if (!worldEditorActive || studioCategoryByMode[studioEditorMode] !== nextCategory) return;
            transitionToCameraView(view, 0.46);
            setStudioLiveStatus('Ready', `${label} view`);
        });
    } else {
        setStudioLiveStatus('Ready', label);
    }

    updateStudioRootButtons();
    requestAnimationFrame(onResize);
}

function setStudioEditorMode(mode = 'photo') {
    studioEditorMode = mode === 'world' ? 'world' : 'photo';
    const editor = document.getElementById('world-editor');
    const photoWorkspace = document.getElementById('photo-booth');
    const worldWorkspace = document.getElementById('world-editor-workspace');

    editor?.classList.toggle('is-photo-mode', studioEditorMode === 'photo');
    editor?.classList.toggle('is-world-mode', studioEditorMode === 'world');
    photoWorkspace?.classList.toggle('hidden', studioEditorMode !== 'photo');
    worldWorkspace?.classList.toggle('hidden', studioEditorMode !== 'world');

    document.querySelectorAll('[data-studio-mode]').forEach((button) => {
        const active = button.dataset.studioMode === studioEditorMode;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
    });

    if (studioEditorMode !== 'photo') {
        clearExpressionRigTargets();
        releaseExpressionRigBonePose();
    } else if (photoBoothActiveTab === 'creator') {
        applyExpressionRigValues();
    }

    setStudioCategory(studioCategoryByMode[studioEditorMode], { frameCamera: worldEditorActive });
}

function setPhotoBoothTab(tab = 'animations') {
    const activeTab = ['animations', 'facial', 'creator'].includes(tab) ? tab : 'animations';
    photoBoothActiveTab = activeTab;
    document.querySelectorAll('[data-photo-tab]').forEach((button) => {
        const active = button.dataset.photoTab === activeTab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
    });
    document.getElementById('photo-booth-animations')?.classList.toggle('hidden', activeTab !== 'animations');
    document.getElementById('photo-booth-facial')?.classList.toggle('hidden', activeTab !== 'facial');
    document.getElementById('photo-booth-creator')?.classList.toggle('hidden', activeTab !== 'creator');
    const editorScroll = document.querySelector('#world-editor .editor-scroll');
    if (editorScroll) editorScroll.scrollTop = 0;
    if (activeTab === 'creator') {
        applyExpressionRigValues();
        setPhotoBoothCamera('face');
        setPhotoBoothStatus('Expression Creator · drag a facial rig point');
    } else {
        clearExpressionRigTargets();
        releaseExpressionRigBonePose();
    }
}

function isExpressionCreatorVisible() {
    return Boolean(
        worldEditorActive
        && studioEditorMode === 'photo'
        && photoBoothActiveTab === 'creator'
        && !document.getElementById('world-editor')?.classList.contains('hidden')
    );
}

function setSettingsPanelOpen(open, section = '') {
    const controls = document.getElementById('render-controls');
    const button = document.getElementById('settings-button');
    if (!controls || !button) return;
    controls.classList.toggle('hidden', !open);
    button.classList.toggle('is-active', open);
    button.setAttribute('aria-expanded', String(open));
    if (!open) return;
    if (section === 'camera') {
        const cameraSection = controls.querySelector('.camera-section');
        controls.scrollTop = Math.max(0, (cameraSection?.offsetTop || 0) - 12);
    } else {
        controls.scrollTop = 0;
    }
}

function setPhotoBoothStatus(message) {
    const status = document.getElementById('photo-booth-status');
    if (status) status.textContent = message;
    if (worldEditorActive && studioEditorMode === 'photo') {
        setStudioLiveStatus('Ready', message);
    }
}

function previewPhotoBoothAnimation(key) {
    const animationKey = actions[key] ? key : 'idle';
    if (!actions[animationKey]) {
        setPhotoBoothStatus('Animation is still loading');
        return;
    }

    clearMovementInput();
    fadeToAction(animationKey, 0.24);
    locoCurrentKey = animationKey;
    currentAction?.setEffectiveTimeScale(1);
    setPhotoBoothStatus(animationKey === 'idle' ? 'Standard pose' : `Playing ${animationKey.replace(/^loco_/, '').replaceAll('_', ' ')}`);

    if (animationKey === 'loco_jump' && currentAction) {
        const action = currentAction;
        const durationMs = Math.max(400, action.getClip().duration * 1000);
        window.setTimeout(() => {
            if (worldEditorActive && studioEditorMode === 'photo' && currentAction === action) {
                fadeToAction('idle', 0.28);
                locoCurrentKey = 'idle';
                const select = document.getElementById('photo-animation-select');
                if (select) select.value = 'idle';
                setPhotoBoothStatus('Standard pose');
            }
        }, durationMs);
    }
}

function setPhotoBoothCamera(view) {
    if (!['body', 'portrait', 'face'].includes(view)) return;
    cameraViewMode = view;
    setCameraMode('chat');
    transitionToCameraView(view, 0.5);
    document.querySelectorAll('[data-photo-camera]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.photoCamera === view);
    });
    document.querySelectorAll('[data-camera-view]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.cameraView === view);
    });
    setPhotoBoothStatus(`${view === 'body' ? 'Full body' : view[0].toUpperCase() + view.slice(1)} framing`);
}

function setManualFaceChannel(channelName, value) {
    const targets = faceChannels.get(channelName) || [];
    targets.forEach((target) => setFaceMorphTargetValue(target, value, true));
}

function setManualFacePattern(patternText, value) {
    const pattern = new RegExp(patternText, 'i');
    allFaceMorphTargets.forEach((target) => {
        if (pattern.test(target.name)) setFaceMorphTargetValue(target, value, true);
    });
}

const EXPRESSION_RIG_BONES = Object.freeze([
    'CC_Base_R_Eye',
    'CC_Base_L_Eye',
    'CC_Base_JawRoot',
    'CC_Base_Tongue01',
    'CC_Base_Tongue02',
    'CC_Base_Tongue03',
    'CC_Base_Teeth01',
    'CC_Base_Teeth02'
]);

const EXPRESSION_RIG_CONTROLS = Object.freeze([
    { id: 'brow-outer-screen-left', label: 'Screen-left outer brow', kind: 'morph', axis: 'y', home: [142, 124], anchor: [151, 163], range: 22, partner: 'brow-outer-screen-right', targets: 'A05 outer-up · A03 brow-down' },
    { id: 'brow-inner-screen-left', label: 'Screen-left inner brow', kind: 'morph', axis: 'y', home: [199, 147], anchor: [210, 190], range: 22, partner: 'brow-inner-screen-right', targets: 'A01 inner-up · A03 brow-down' },
    { id: 'brow-center', label: 'Inner brow pair', kind: 'morph', axis: 'y', home: [240, 143], anchor: [240, 187], range: 22, targets: 'A01 Brow Inner Up' },
    { id: 'brow-inner-screen-right', label: 'Screen-right inner brow', kind: 'morph', axis: 'y', home: [281, 147], anchor: [270, 190], range: 22, partner: 'brow-inner-screen-left', targets: 'A01 inner-up · A02 brow-down' },
    { id: 'brow-outer-screen-right', label: 'Screen-right outer brow', kind: 'morph', axis: 'y', home: [338, 124], anchor: [329, 163], range: 22, partner: 'brow-outer-screen-left', targets: 'A04 outer-up · A02 brow-down' },

    { id: 'lid-screen-left', label: 'Screen-left eyelid', kind: 'morph', axis: 'y', home: [151, 214], anchor: [151, 246], range: 18, partner: 'lid-screen-right', targets: 'A15 Blink · A19 Wide' },
    { id: 'gaze-screen-left', label: 'Screen-left eye gaze', kind: 'bone', axis: 'xy', home: [181, 214], range: 23, partner: 'gaze-screen-right', targets: 'CC_Base_R_Eye · A07/A09/A12/A13' },
    { id: 'squint-screen-left', label: 'Screen-left eye squint', kind: 'morph', axis: 'y', home: [211, 214], anchor: [211, 246], range: 18, partner: 'squint-screen-right', limits: { minY: -1, maxY: 0 }, targets: 'A17 Eye Squint Right' },
    { id: 'squint-screen-right', label: 'Screen-right eye squint', kind: 'morph', axis: 'y', home: [269, 214], anchor: [269, 246], range: 18, partner: 'squint-screen-left', limits: { minY: -1, maxY: 0 }, targets: 'A16 Eye Squint Left' },
    { id: 'gaze-screen-right', label: 'Screen-right eye gaze', kind: 'bone', axis: 'xy', home: [299, 214], range: 23, partner: 'gaze-screen-left', targets: 'CC_Base_L_Eye · A06/A08/A10/A11' },
    { id: 'lid-screen-right', label: 'Screen-right eyelid', kind: 'morph', axis: 'y', home: [329, 214], anchor: [329, 246], range: 18, partner: 'lid-screen-left', targets: 'A14 Blink · A18 Wide' },

    { id: 'cheek-screen-left', label: 'Screen-left cheek', kind: 'morph', axis: 'y', home: [128, 304], anchor: [166, 289], range: 20, partner: 'cheek-screen-right', targets: 'A22 squint · Cheek Blow/Raise R' },
    { id: 'nose-screen-left', label: 'Screen-left nose', kind: 'morph', axis: 'y', home: [211, 308], anchor: [221, 282], range: 17, partner: 'nose-screen-right', targets: 'A24 Nose Sneer Right' },
    { id: 'nose-screen-right', label: 'Screen-right nose', kind: 'morph', axis: 'y', home: [269, 308], anchor: [259, 282], range: 17, partner: 'nose-screen-left', targets: 'A23 Nose Sneer Left' },
    { id: 'cheek-screen-right', label: 'Screen-right cheek', kind: 'morph', axis: 'y', home: [352, 304], anchor: [314, 289], range: 20, partner: 'cheek-screen-left', targets: 'A21 squint · Cheek Blow/Raise L' },

    { id: 'mouth-corner-screen-left', label: 'Screen-left mouth corner', kind: 'morph', axis: 'xy', home: [184, 378], anchor: [209, 372], range: 21, partner: 'mouth-corner-screen-right', mirrorPartnerX: true, targets: 'A39/A41 smile-frown · A43/A51 dimple-stretch' },
    { id: 'upper-lip-screen-left', label: 'Screen-left upper lip', kind: 'morph', axis: 'y', home: [210, 354], anchor: [218, 378], range: 16, partner: 'upper-lip-screen-right', targets: 'A45 Upper Up Right · A49 Press Right' },
    { id: 'upper-lip-center', label: 'Upper lip center', kind: 'morph', axis: 'y', home: [240, 350], anchor: [240, 378], range: 17, targets: 'A35 Shrug Upper · A33 Roll Upper' },
    { id: 'upper-lip-screen-right', label: 'Screen-right upper lip', kind: 'morph', axis: 'y', home: [270, 354], anchor: [262, 378], range: 16, partner: 'upper-lip-screen-left', targets: 'A44 Upper Up Left · A48 Press Left' },
    { id: 'mouth-corner-screen-right', label: 'Screen-right mouth corner', kind: 'morph', axis: 'xy', home: [296, 378], anchor: [271, 372], range: 21, partner: 'mouth-corner-screen-left', mirrorPartnerX: true, targets: 'A38/A40 smile-frown · A42/A50 dimple-stretch' },
    { id: 'lower-lip-screen-left', label: 'Screen-left lower lip', kind: 'morph', axis: 'y', home: [210, 407], anchor: [218, 384], range: 16, partner: 'lower-lip-screen-right', targets: 'A47 Lower Down Right · A49 Press Right' },
    { id: 'lower-lip-center', label: 'Lower lip center', kind: 'morph', axis: 'y', home: [240, 414], anchor: [240, 385], range: 17, targets: 'A36 Shrug Lower · A34 Roll Lower' },
    { id: 'lower-lip-screen-right', label: 'Screen-right lower lip', kind: 'morph', axis: 'y', home: [270, 407], anchor: [262, 384], range: 16, partner: 'lower-lip-screen-left', targets: 'A46 Lower Down Left · A48 Press Left' },
    { id: 'mouth-shift', label: 'Whole mouth shift', kind: 'morph', axis: 'x', home: [240, 384], range: 24, targets: 'A31 Mouth Left · A32 Mouth Right' },

    { id: 'cheek-puff', label: 'Cheek puff / suck', kind: 'morph', axis: 'x', home: [53, 356], range: 28, targets: 'A20 Cheek Puff · Cheeks Suck' },
    { id: 'pucker', label: 'Mouth pucker', kind: 'morph', axis: 'y', home: [29, 448], anchor: [29, 470], range: 20, limits: { minY: -1, maxY: 0 }, targets: 'A30 Mouth Pucker' },
    { id: 'funnel', label: 'Mouth funnel', kind: 'morph', axis: 'y', home: [77, 448], anchor: [77, 470], range: 20, limits: { minY: -1, maxY: 0 }, targets: 'A29 Mouth Funnel' },
    { id: 'bite', label: 'Bottom lip bite', kind: 'morph', axis: 'y', home: [29, 542], anchor: [29, 565], range: 20, limits: { minY: -1, maxY: 0 }, targets: 'Mouth_Bottom_Lip_Bite' },
    { id: 'press', label: 'Lip press pair', kind: 'morph', axis: 'y', home: [77, 542], anchor: [77, 565], range: 20, limits: { minY: -1, maxY: 0 }, targets: 'A48/A49 Mouth Press' },

    { id: 'teeth-upper', label: 'Upper teeth offset', kind: 'bone', axis: 'y', home: [402, 154], anchor: [402, 184], range: 22, targets: 'CC_Base_Teeth01 position' },
    { id: 'teeth-lower', label: 'Lower teeth offset', kind: 'bone', axis: 'y', home: [450, 160], anchor: [450, 130], range: 22, targets: 'CC_Base_Teeth02 position' },
    { id: 'lip-roll-upper', label: 'Upper lip roll', kind: 'morph', axis: 'y', home: [402, 260], anchor: [402, 296], range: 22, limits: { minY: -1, maxY: 0 }, targets: 'A33 Mouth Roll Upper' },
    { id: 'lip-roll-lower', label: 'Lower lip roll', kind: 'morph', axis: 'y', home: [450, 278], anchor: [450, 242], range: 22, limits: { minY: 0, maxY: 1 }, targets: 'A34 Mouth Roll Lower' },
    { id: 'stretch-screen-left', label: 'Screen-left lip stretch', kind: 'morph', axis: 'x', home: [397, 370], anchor: [419, 370], range: 18, limits: { minX: -1, maxX: 0 }, partner: 'stretch-screen-right', mirrorPartnerX: true, targets: 'A51 Mouth Stretch Right' },
    { id: 'lips-close', label: 'Lips together', kind: 'morph', axis: 'y', home: [426, 384], anchor: [426, 410], range: 18, limits: { minY: -1, maxY: 0 }, targets: 'A37 Mouth Close · Mouth Lips Tight' },
    { id: 'stretch-screen-right', label: 'Screen-right lip stretch', kind: 'morph', axis: 'x', home: [455, 370], anchor: [433, 370], range: 18, limits: { minX: 0, maxX: 1 }, partner: 'stretch-screen-left', mirrorPartnerX: true, targets: 'A50 Mouth Stretch Left' },
    { id: 'jaw-forward', label: 'Jaw forward', kind: 'bone', axis: 'y', home: [426, 427], anchor: [426, 408], range: 15, limits: { minY: 0, maxY: 1 }, targets: 'A26 Jaw Forward · CC_Base_JawRoot position' },

    { id: 'tongue-root', label: 'Tongue root bend', kind: 'tongue', axis: 'xy', home: [382, 510], range: 20, targets: 'Tongue01/02 · T01/T02/T03/T04' },
    { id: 'tongue-tip', label: 'Tongue tip', kind: 'tongue', axis: 'xy', home: [444, 510], range: 20, targets: 'Tongue03 · T06/T07/T10/T11' },
    { id: 'tongue-out', label: 'Tongue out', kind: 'tongue', axis: 'y', home: [382, 558], anchor: [382, 536], range: 18, limits: { minY: 0, maxY: 1 }, targets: 'A52 Tongue Out · V_Tongue_Out' },
    { id: 'tongue-roll', label: 'Tongue roll / width', kind: 'tongue', axis: 'xy', home: [444, 558], range: 18, targets: 'T05 Roll · T08 Width · T09 Thickness' },

    { id: 'jaw', label: 'Jaw open / side', kind: 'bone', axis: 'xy', home: [240, 622], anchor: [240, 592], range: 28, limits: { minY: 0, maxY: 1 }, targets: 'CC_Base_JawRoot local-Z · A25/A27/A28' }
]);

const expressionRigControlMap = new Map(EXPRESSION_RIG_CONTROLS.map((control) => [control.id, control]));

function addExpressionRigWeight(weights, channel, value) {
    const amount = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
    if (amount <= 0.001) return;
    weights[channel] = Math.max(weights[channel] || 0, amount);
}

function clearExpressionRigTargets() {
    expressionRigTargetIds.forEach((id) => {
        const target = allFaceMorphTargets.find((item) => item.id === id);
        if (!target) return;
        manualFaceInfluences.delete(id);
        setFaceMorphTargetValue(target, 0);
    });
    expressionRigTargetIds.clear();
}

function applyExpressionRigValues() {
    clearExpressionRigTargets();
    const weights = Object.create(null);
    const bone = expressionRigBoneState;
    bone.eyeScreenLeft.x = 0;
    bone.eyeScreenLeft.y = 0;
    bone.eyeScreenRight.x = 0;
    bone.eyeScreenRight.y = 0;
    bone.jawOpen = 0;
    bone.jawForward = 0;
    bone.tongueRoot.x = 0;
    bone.tongueRoot.y = 0;
    bone.tongueTip.x = 0;
    bone.tongueTip.y = 0;
    bone.tongueOut = 0;
    bone.teethUpper = 0;
    bone.teethLower = 0;

    expressionRigValues.forEach(({ x = 0, y = 0 }, control) => {
        switch (control) {
            case 'brow-outer-screen-left':
                addExpressionRigWeight(weights, 'A05_Brow_Outer_Up_Right', -y);
                addExpressionRigWeight(weights, 'A03_Brow_Down_Right', y);
                break;
            case 'brow-inner-screen-left':
                addExpressionRigWeight(weights, 'A01_Brow_Inner_Up', -y);
                addExpressionRigWeight(weights, 'A03_Brow_Down_Right', y);
                break;
            case 'brow-center':
                addExpressionRigWeight(weights, 'A01_Brow_Inner_Up', -y);
                break;
            case 'brow-inner-screen-right':
                addExpressionRigWeight(weights, 'A01_Brow_Inner_Up', -y);
                addExpressionRigWeight(weights, 'A02_Brow_Down_Left', y);
                break;
            case 'brow-outer-screen-right':
                addExpressionRigWeight(weights, 'A04_Brow_Outer_Up_Left', -y);
                addExpressionRigWeight(weights, 'A02_Brow_Down_Left', y);
                break;

            case 'gaze-screen-left':
                bone.eyeScreenLeft.x = x;
                bone.eyeScreenLeft.y = y;
                addExpressionRigWeight(weights, 'A12_Eye_Look_In_Right', x);
                addExpressionRigWeight(weights, 'A13_Eye_Look_Out_Right', -x);
                addExpressionRigWeight(weights, 'A07_Eye_Look_Up_Right', -y);
                addExpressionRigWeight(weights, 'A09_Eye_Look_Down_Right', y);
                break;
            case 'gaze-screen-right':
                bone.eyeScreenRight.x = x;
                bone.eyeScreenRight.y = y;
                addExpressionRigWeight(weights, 'A10_Eye_Look_Out_Left', x);
                addExpressionRigWeight(weights, 'A11_Eye_Look_In_Left', -x);
                addExpressionRigWeight(weights, 'A06_Eye_Look_Up_Left', -y);
                addExpressionRigWeight(weights, 'A08_Eye_Look_Down_Left', y);
                break;
            case 'lid-screen-left':
                addExpressionRigWeight(weights, 'A15_Eye_Blink_Right', y);
                addExpressionRigWeight(weights, 'A19_Eye_Wide_Right', -y);
                break;
            case 'lid-screen-right':
                addExpressionRigWeight(weights, 'A14_Eye_Blink_Left', y);
                addExpressionRigWeight(weights, 'A18_Eye_Wide_Left', -y);
                break;
            case 'squint-screen-left':
                addExpressionRigWeight(weights, 'A17_Eye_Squint_Right', -y);
                break;
            case 'squint-screen-right':
                addExpressionRigWeight(weights, 'A16_Eye_Squint_Left', -y);
                break;

            case 'cheek-screen-left':
                addExpressionRigWeight(weights, 'A22_Cheek_Squint_Right', -y);
                addExpressionRigWeight(weights, 'Cheek_Raise_R', -y);
                addExpressionRigWeight(weights, 'Cheek_Blow_R', y);
                break;
            case 'cheek-screen-right':
                addExpressionRigWeight(weights, 'A21_Cheek_Squint_Left', -y);
                addExpressionRigWeight(weights, 'Cheek_Raise_L', -y);
                addExpressionRigWeight(weights, 'Cheek_Blow_L', y);
                break;
            case 'nose-screen-left':
                addExpressionRigWeight(weights, 'A24_Nose_Sneer_Right', -y);
                addExpressionRigWeight(weights, 'Nose_Flank_Raise_R', y);
                break;
            case 'nose-screen-right':
                addExpressionRigWeight(weights, 'A23_Nose_Sneer_Left', -y);
                addExpressionRigWeight(weights, 'Nose_Flank_Raise_L', y);
                break;

            case 'mouth-corner-screen-left':
                addExpressionRigWeight(weights, 'A39_Mouth_Smile_Right', -y);
                addExpressionRigWeight(weights, 'A41_Mouth_Frown_Right', y);
                addExpressionRigWeight(weights, 'A51_Mouth_Stretch_Right', -x);
                addExpressionRigWeight(weights, 'A43_Mouth_Dimple_Right', x);
                break;
            case 'mouth-corner-screen-right':
                addExpressionRigWeight(weights, 'A38_Mouth_Smile_Left', -y);
                addExpressionRigWeight(weights, 'A40_Mouth_Frown_Left', y);
                addExpressionRigWeight(weights, 'A50_Mouth_Stretch_Left', x);
                addExpressionRigWeight(weights, 'A42_Mouth_Dimple_Left', -x);
                break;
            case 'upper-lip-screen-left':
                addExpressionRigWeight(weights, 'A45_Mouth_Upper_Up_Right', -y);
                addExpressionRigWeight(weights, 'A49_Mouth_Press_Right', y);
                break;
            case 'upper-lip-center':
                addExpressionRigWeight(weights, 'A35_Mouth_Shrug_Upper', -y);
                addExpressionRigWeight(weights, 'A33_Mouth_Roll_Upper', y);
                break;
            case 'upper-lip-screen-right':
                addExpressionRigWeight(weights, 'A44_Mouth_Upper_Up_Left', -y);
                addExpressionRigWeight(weights, 'A48_Mouth_Press_Left', y);
                break;
            case 'lower-lip-screen-left':
                addExpressionRigWeight(weights, 'A47_Mouth_Lower_Down_Right', y);
                addExpressionRigWeight(weights, 'A49_Mouth_Press_Right', -y);
                break;
            case 'lower-lip-center':
                addExpressionRigWeight(weights, 'A36_Mouth_Shrug_Lower', y);
                addExpressionRigWeight(weights, 'A34_Mouth_Roll_Lower', -y);
                break;
            case 'lower-lip-screen-right':
                addExpressionRigWeight(weights, 'A46_Mouth_Lower_Down_Left', y);
                addExpressionRigWeight(weights, 'A48_Mouth_Press_Left', -y);
                break;
            case 'mouth-shift':
                addExpressionRigWeight(weights, 'A31_Mouth_Left', x);
                addExpressionRigWeight(weights, 'A32_Mouth_Right', -x);
                break;

            case 'cheek-puff':
                addExpressionRigWeight(weights, 'A20_Cheek_Puff', x);
                addExpressionRigWeight(weights, 'Cheeks_Suck', -x);
                break;
            case 'pucker':
                addExpressionRigWeight(weights, 'A30_Mouth_Pucker', -y);
                break;
            case 'funnel':
                addExpressionRigWeight(weights, 'A29_Mouth_Funnel', -y);
                break;
            case 'bite':
                addExpressionRigWeight(weights, 'Mouth_Bottom_Lip_Bite', -y);
                break;
            case 'press':
                addExpressionRigWeight(weights, 'A48_Mouth_Press_Left', -y);
                addExpressionRigWeight(weights, 'A49_Mouth_Press_Right', -y);
                break;
            case 'lip-roll-upper':
                addExpressionRigWeight(weights, 'A33_Mouth_Roll_Upper', -y);
                break;
            case 'lip-roll-lower':
                addExpressionRigWeight(weights, 'A34_Mouth_Roll_Lower', y);
                break;
            case 'teeth-upper':
                bone.teethUpper = y;
                break;
            case 'teeth-lower':
                bone.teethLower = y;
                break;
            case 'stretch-screen-left':
                addExpressionRigWeight(weights, 'A51_Mouth_Stretch_Right', -x);
                break;
            case 'stretch-screen-right':
                addExpressionRigWeight(weights, 'A50_Mouth_Stretch_Left', x);
                break;
            case 'lips-close':
                addExpressionRigWeight(weights, 'A37_Mouth_Close', -y);
                addExpressionRigWeight(weights, 'Mouth_Lips_Tight', -y);
                break;
            case 'jaw-forward':
                addExpressionRigWeight(weights, 'A26_Jaw_Forward', y * 0.78);
                bone.jawForward = y;
                break;
            case 'jaw':
                addExpressionRigWeight(weights, 'A25_Jaw_Open', y * 0.62);
                addExpressionRigWeight(weights, 'A27_Jaw_Left', x);
                addExpressionRigWeight(weights, 'A28_Jaw_Right', -x);
                bone.jawOpen = y;
                break;

            case 'tongue-root':
                addExpressionRigWeight(weights, 'T03_Tongue_Left', -x);
                addExpressionRigWeight(weights, 'T04_Tongue_Right', x);
                addExpressionRigWeight(weights, 'T01_Tongue_Up', -y);
                addExpressionRigWeight(weights, 'T02_Tongue_Down', y);
                bone.tongueRoot.x = x;
                bone.tongueRoot.y = y;
                break;
            case 'tongue-tip':
                addExpressionRigWeight(weights, 'T10_Tongue_Bulge_Left', -x);
                addExpressionRigWeight(weights, 'T11_Tongue_Bulge_Right', x);
                addExpressionRigWeight(weights, 'T06_Tongue_Tip_Up', -y);
                addExpressionRigWeight(weights, 'T07_Tongue_Tip_Down', y);
                bone.tongueTip.x = x;
                bone.tongueTip.y = y;
                break;
            case 'tongue-out':
                addExpressionRigWeight(weights, 'A52_Tongue_Out', y);
                addExpressionRigWeight(weights, 'V_Tongue_Out', y * 0.75);
                bone.tongueOut = y;
                break;
            case 'tongue-roll':
                addExpressionRigWeight(weights, 'T05_Tongue_Roll', -y);
                addExpressionRigWeight(weights, 'T08_Tongue_Width', x);
                addExpressionRigWeight(weights, 'T09_Tongue_Thickness', -x);
                break;
            default:
                break;
        }
    });

    Object.entries(weights).forEach(([channel, value]) => {
        (faceChannels.get(channel) || []).forEach((target) => {
            expressionRigTargetIds.add(target.id);
            setFaceMorphTargetValue(target, value * expressionRigStrength, true);
        });
    });

    const activeCount = [...expressionRigValues.values()]
        .filter(({ x, y }) => Math.abs(x) > 0.01 || Math.abs(y) > 0.01).length;
    const badge = document.getElementById('expression-creator-active');
    if (badge) {
        badge.textContent = activeCount ? `${activeCount} control${activeCount === 1 ? '' : 's'} active` : 'Neutral';
        badge.classList.toggle('is-active', activeCount > 0);
    }
    updateExpressionRigInspector();
}

function clampExpressionRigValue(definition, x, y) {
    const limits = definition?.limits || {};
    let nextX = THREE.MathUtils.clamp(Number(x) || 0, limits.minX ?? -1, limits.maxX ?? 1);
    let nextY = THREE.MathUtils.clamp(Number(y) || 0, limits.minY ?? -1, limits.maxY ?? 1);
    if (definition?.axis === 'x') nextY = 0;
    if (definition?.axis === 'y') nextX = 0;
    return { x: nextX, y: nextY };
}

function setExpressionRigHandlePosition(handle, x, y) {
    const definition = expressionRigControlMap.get(handle.dataset.rigControl);
    if (!definition) return;
    const [homeX, homeY] = definition.home;
    const range = definition.range || 20;
    const endX = homeX + x * range;
    const endY = homeY + y * range;
    handle.setAttribute('transform', `translate(${endX} ${endY})`);
    handle.setAttribute('aria-valuetext', `${Math.round(x * 100)} horizontal, ${Math.round(y * 100)} vertical`);
    const link = document.querySelector(`[data-rig-link="${definition.id}"]`);
    if (link) {
        link.setAttribute('x2', String(endX));
        link.setAttribute('y2', String(endY));
    }
}

function setExpressionRigControl(control, x, y, mirrorPartner = true) {
    const definition = expressionRigControlMap.get(control);
    if (!definition) return;
    const normalized = clampExpressionRigValue(definition, x, y);
    expressionRigValues.set(control, normalized);
    const handle = document.querySelector(`[data-rig-control="${control}"]`);
    if (handle) setExpressionRigHandlePosition(handle, normalized.x, normalized.y);
    const symmetryEnabled = document.getElementById('expression-rig-symmetry')?.getAttribute('aria-pressed') === 'true';
    if (mirrorPartner && symmetryEnabled && definition.partner) {
        const partnerX = definition.mirrorPartnerX ? -normalized.x : normalized.x;
        setExpressionRigControl(definition.partner, partnerX, normalized.y, false);
    }
    expressionRigSelectedControl = control;
    applyExpressionRigValues();
}

function resetExpressionRigControl(control) {
    if (!expressionRigControlMap.has(control)) return;
    expressionRigValues.delete(control);
    const handle = document.querySelector(`[data-rig-control="${control}"]`);
    if (handle) setExpressionRigHandlePosition(handle, 0, 0);
    applyExpressionRigValues();
}

function resetExpressionCreator() {
    expressionRigValues.clear();
    document.querySelectorAll('[data-rig-control]').forEach((handle) => {
        setExpressionRigHandlePosition(handle, 0, 0);
    });
    expressionRigSelectedControl = '';
    applyExpressionRigValues();
    setPhotoBoothStatus('Expression Creator reset to neutral');
}

function updateExpressionRigInspector() {
    const definition = expressionRigControlMap.get(expressionRigSelectedControl);
    const kind = document.getElementById('expression-rig-selected-kind');
    const name = document.getElementById('expression-rig-selected-name');
    const target = document.getElementById('expression-rig-selected-target');
    const output = document.getElementById('expression-rig-selected-value');
    const reset = document.getElementById('expression-rig-reset-selected');
    if (!definition) {
        if (kind) {
            kind.textContent = 'Hybrid';
            kind.className = 'is-bone';
        }
        if (name) name.textContent = 'Select a control';
        if (target) target.textContent = 'Drag a rig point to inspect its exact CC3 target.';
        if (output) output.textContent = '0%';
        if (reset) reset.disabled = true;
        return;
    }
    const value = expressionRigValues.get(definition.id) || { x: 0, y: 0 };
    const amount = Math.max(Math.abs(value.x), Math.abs(value.y));
    if (kind) {
        kind.textContent = definition.kind === 'bone' ? 'Bone' : definition.kind === 'tongue' ? 'Tongue' : 'Morph';
        kind.className = `is-${definition.kind}`;
    }
    if (name) name.textContent = definition.label;
    if (target) target.textContent = definition.targets;
    if (output) output.textContent = `${Math.round(amount * 100)}%`;
    if (reset) reset.disabled = amount <= 0.001;
    document.querySelectorAll('[data-rig-control]').forEach((handle) => {
        handle.classList.toggle('is-selected', handle.dataset.rigControl === definition.id);
    });
}

function updateExpressionRigConnectivity() {
    const boneCount = EXPRESSION_RIG_BONES.filter((name) => Boolean(cc3Bones[name])).length;
    const morphCount = [...faceChannels.keys()].filter((name) => /^(A\d\d|T\d\d)_/.test(name)).length;
    const status = document.getElementById('expression-rig-connectivity');
    if (status) {
        status.textContent = `${boneCount}/8 bones · ${morphCount}/63 shapes`;
        status.classList.toggle('is-ready', boneCount === 8 && morphCount >= 63);
    }
}

function createExpressionRigControls() {
    const links = document.getElementById('expression-rig-links');
    const controls = document.getElementById('expression-rig-controls');
    if (!links || !controls || controls.childElementCount) return;
    const svgNamespace = 'http://www.w3.org/2000/svg';
    EXPRESSION_RIG_CONTROLS.forEach((definition) => {
        const [homeX, homeY] = definition.home;
        const range = definition.range || 20;
        const limits = definition.limits || {};

        const rail = document.createElementNS(svgNamespace, definition.axis === 'xy' ? 'rect' : 'line');
        rail.classList.add('rig-control-rail', `is-${definition.kind}`);
        if (definition.axis === 'xy') {
            rail.setAttribute('x', String(homeX - range));
            rail.setAttribute('y', String(homeY - range));
            rail.setAttribute('width', String(range * 2));
            rail.setAttribute('height', String(range * 2));
            rail.setAttribute('rx', '3');
        } else if (definition.axis === 'x') {
            rail.setAttribute('x1', String(homeX + (limits.minX ?? -1) * range));
            rail.setAttribute('y1', String(homeY));
            rail.setAttribute('x2', String(homeX + (limits.maxX ?? 1) * range));
            rail.setAttribute('y2', String(homeY));
        } else {
            rail.setAttribute('x1', String(homeX));
            rail.setAttribute('y1', String(homeY + (limits.minY ?? -1) * range));
            rail.setAttribute('x2', String(homeX));
            rail.setAttribute('y2', String(homeY + (limits.maxY ?? 1) * range));
        }
        links.appendChild(rail);

        if (definition.anchor) {
            const link = document.createElementNS(svgNamespace, 'line');
            link.classList.add('rig-driver-link', `is-${definition.kind}`);
            link.dataset.rigLink = definition.id;
            link.setAttribute('x1', String(definition.anchor[0]));
            link.setAttribute('y1', String(definition.anchor[1]));
            link.setAttribute('x2', String(homeX));
            link.setAttribute('y2', String(homeY));
            links.appendChild(link);
        }

        const handle = document.createElementNS(svgNamespace, 'g');
        handle.classList.add('rig-handle', `is-${definition.kind}`);
        if (definition.axis === 'xy') handle.classList.add('is-xy');
        handle.dataset.rigControl = definition.id;
        handle.dataset.rigAxis = definition.axis;
        handle.setAttribute('tabindex', '0');
        handle.setAttribute('role', 'slider');
        handle.setAttribute('aria-label', definition.label);
        handle.setAttribute('aria-valuemin', '-100');
        handle.setAttribute('aria-valuemax', '100');

        if (definition.axis === 'xy' && definition.kind === 'bone') {
            const plate = document.createElementNS(svgNamespace, 'rect');
            plate.setAttribute('x', '-11');
            plate.setAttribute('y', '-9');
            plate.setAttribute('width', '22');
            plate.setAttribute('height', '18');
            plate.setAttribute('rx', '3');
            handle.appendChild(plate);
        }
        const dot = document.createElementNS(svgNamespace, 'circle');
        dot.setAttribute('r', definition.kind === 'bone' || definition.kind === 'tongue' ? '6.5' : '5.5');
        handle.appendChild(dot);
        controls.appendChild(handle);
        setExpressionRigHandlePosition(handle, 0, 0);
    });
}

function getExpressionRigPointer(svg, event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
}

function setupExpressionCreator() {
    const svg = document.getElementById('expression-rig-map');
    if (!svg) return;
    createExpressionRigControls();
    updateExpressionRigConnectivity();
    document.querySelectorAll('[data-rig-control]').forEach((handle) => {
        setExpressionRigHandlePosition(handle, 0, 0);
        handle.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            const point = getExpressionRigPointer(svg, event);
            const definition = expressionRigControlMap.get(handle.dataset.rigControl);
            expressionRigDrag = {
                handle,
                control: handle.dataset.rigControl,
                definition,
                pointerId: event.pointerId,
                startX: point.x,
                startY: point.y,
                value: expressionRigValues.get(handle.dataset.rigControl) || { x: 0, y: 0 }
            };
            expressionRigSelectedControl = handle.dataset.rigControl;
            updateExpressionRigInspector();
            handle.classList.add('is-dragging');
            svg.setPointerCapture?.(event.pointerId);
        });
        handle.addEventListener('dblclick', (event) => {
            event.preventDefault();
            event.stopPropagation();
            resetExpressionRigControl(handle.dataset.rigControl);
        });
        handle.addEventListener('focus', () => {
            expressionRigSelectedControl = handle.dataset.rigControl;
            updateExpressionRigInspector();
        });
        handle.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            const value = expressionRigValues.get(handle.dataset.rigControl) || { x: 0, y: 0 };
            const step = event.shiftKey ? 0.025 : 0.1;
            const next = { ...value };
            if (event.key === 'ArrowLeft') next.x -= step;
            if (event.key === 'ArrowRight') next.x += step;
            if (event.key === 'ArrowUp') next.y -= step;
            if (event.key === 'ArrowDown') next.y += step;
            if (event.key === 'Home') {
                next.x = 0;
                next.y = 0;
            }
            setExpressionRigControl(handle.dataset.rigControl, next.x, next.y);
        });
        handle.addEventListener('keyup', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
        });
    });
    svg.addEventListener('pointermove', (event) => {
        if (!expressionRigDrag || event.pointerId !== expressionRigDrag.pointerId) return;
        const point = getExpressionRigPointer(svg, event);
        const range = expressionRigDrag.definition?.range || 20;
        setExpressionRigControl(
            expressionRigDrag.control,
            expressionRigDrag.value.x + (point.x - expressionRigDrag.startX) / range,
            expressionRigDrag.value.y + (point.y - expressionRigDrag.startY) / range
        );
    });
    const endDrag = (event) => {
        if (!expressionRigDrag || event.pointerId !== expressionRigDrag.pointerId) return;
        expressionRigDrag.handle.classList.remove('is-dragging');
        svg.releasePointerCapture?.(event.pointerId);
        expressionRigDrag = null;
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    document.getElementById('expression-creator-reset')?.addEventListener('click', resetExpressionCreator);
    document.getElementById('expression-rig-reset-selected')?.addEventListener('click', () => {
        resetExpressionRigControl(expressionRigSelectedControl);
    });
    document.getElementById('expression-rig-symmetry')?.addEventListener('click', (event) => {
        const active = event.currentTarget.getAttribute('aria-pressed') !== 'true';
        event.currentTarget.setAttribute('aria-pressed', String(active));
        event.currentTarget.classList.toggle('is-active', active);
        setPhotoBoothStatus(active ? 'Expression rig symmetry enabled' : 'Expression rig symmetry disabled');
    });
    const strength = document.getElementById('expression-rig-strength');
    strength?.addEventListener('input', () => {
        expressionRigStrength = Number(strength.value) / 100;
        const output = document.getElementById('expression-rig-strength-value');
        if (output) output.textContent = `${strength.value}%`;
        applyExpressionRigValues();
    });
}

function setPhotoBoothVowel(vowel, intensity) {
    const normalizedVowel = String(vowel || '').toUpperCase();
    const recipe = PHOTO_BOOTH_VOWEL_RECIPES[normalizedVowel];
    const amount = THREE.MathUtils.clamp(Number(intensity) || 0, 0, 1);

    photoBoothMouthTargetIds.forEach((id) => {
        const target = allFaceMorphTargets.find((item) => item.id === id);
        if (!target) return;
        manualFaceInfluences.delete(target.id);
        setFaceMorphTargetValue(target, 0);
    });
    photoBoothMouthTargetIds.clear();

    if (!recipe || amount <= 0) {
        photoBoothMouthState.vowel = '';
        photoBoothMouthState.intensity = 0;
        return;
    }

    Object.entries(recipe).forEach(([channel, weight]) => {
        const targets = faceChannels.get(channel) || [];
        targets.forEach((target) => {
            photoBoothMouthTargetIds.add(target.id);
            setFaceMorphTargetValue(target, weight * amount, true);
        });
    });
    photoBoothMouthState.vowel = normalizedVowel;
    photoBoothMouthState.intensity = amount;
}

function resetPhotoBoothQuickSliders() {
    document.querySelectorAll('#photo-quick-face-controls input[type="range"]').forEach((input) => {
        input.value = input.dataset.photoEmotion === 'Neutral' ? '100' : '0';
    });
    setPhotoBoothVowel('', 0);
}

function applyPhotoBoothEyeDirection(normalizedX, normalizedY, manual = true) {
    const x = THREE.MathUtils.clamp(normalizedX, -1, 1);
    const y = THREE.MathUtils.clamp(normalizedY, -1, 1);
    photoBoothEyeDirection.x = x;
    photoBoothEyeDirection.y = y;
    photoBoothEyeDirection.manual = Boolean(manual);
    const dot = document.getElementById('photo-eye-dot');
    if (dot) {
        dot.style.left = `${(x + 1) * 50}%`;
        dot.style.top = `${(y + 1) * 50}%`;
    }

    photoBoothGazeTargetIds.forEach((id) => {
        const target = allFaceMorphTargets.find((item) => item.id === id);
        if (target) setFaceMorphTargetValue(target, 0, true);
    });
    photoBoothGazeTargetIds.clear();

    const gazeValues = [
        [/Eye_Look_(Out_Left|In_Right)|Eyeball_Look_L/i, Math.max(0, x)],
        [/Eye_Look_(In_Left|Out_Right)|Eyeball_Look_R/i, Math.max(0, -x)],
        [/Eye_Look_Up|Eyeball_Look_Up/i, Math.max(0, -y)],
        [/Eye_Look_Down|Eyeball_Look_Down/i, Math.max(0, y)]
    ];
    gazeValues.forEach(([pattern, amount]) => {
        allFaceMorphTargets.forEach((target) => {
            if (!pattern.test(target.name)) return;
            photoBoothGazeTargetIds.add(target.id);
            setFaceMorphTargetValue(target, amount * 0.72, true);
        });
    });
}

function updatePhotoBoothEyeBones() {
    const creatorRigVisible = isExpressionCreatorVisible();
    const individualEyes = [
        [cc3Bones.CC_Base_R_Eye, expressionRigBoneState.eyeScreenLeft],
        [cc3Bones.CC_Base_L_Eye, expressionRigBoneState.eyeScreenRight]
    ].filter(([bone]) => Boolean(bone))
        .map(([bone, direction]) => [
            bone,
            creatorRigVisible ? direction : { x: 0, y: 0 }
        ]);
    if (individualEyes.length === 0) return;

    const creatorGazeActive = individualEyes.some(([, direction]) => (
        Math.abs(direction.x) > 0.001 || Math.abs(direction.y) > 0.001
    ));
    if (!photoBoothEyeDirection.manual && !creatorGazeActive && !creatorRigVisible) {
        individualEyes.forEach(([bone]) => {
            expressionRigBoneDeltas[bone.name] = { angleDegrees: 0, positionDelta: 0 };
        });
        return;
    }

    individualEyes.forEach(([bone, direction]) => {
        if (!photoBoothEyeRestQuaternions.has(bone.uuid)) {
            photoBoothEyeRestQuaternions.set(bone.uuid, bone.quaternion.clone());
        }
        const rest = photoBoothEyeRestQuaternions.get(bone.uuid);
        bone.quaternion.copy(rest);
        expressionRigBoneDeltas[bone.name] = { angleDegrees: 0, positionDelta: 0 };

        if (photoBoothEyeDirection.manual) {
            photoBoothEyeOffset.setFromEuler(new THREE.Euler(
                -photoBoothEyeDirection.y * 0.38,
                0,
                -photoBoothEyeDirection.x * 0.52,
                'XYZ'
            ));
            bone.quaternion.multiply(photoBoothEyeOffset);
        }
        if (direction.x || direction.y) {
            expressionRigBoneOffset.setFromEuler(new THREE.Euler(
                -direction.y * 0.38 * expressionRigStrength,
                0,
                -direction.x * 0.52 * expressionRigStrength,
                'XYZ'
            ));
            bone.quaternion.multiply(expressionRigBoneOffset);
        }
        expressionRigBoneDeltas[bone.name] = {
            angleDegrees: Number(THREE.MathUtils.radToDeg(bone.quaternion.angleTo(rest)).toFixed(3)),
            positionDelta: 0
        };
    });
}

function releaseExpressionRigBonePose() {
    [
        cc3Bones.CC_Base_JawRoot,
        cc3Bones.CC_Base_Teeth01,
        cc3Bones.CC_Base_Teeth02,
        cc3Bones.CC_Base_Tongue01,
        cc3Bones.CC_Base_Tongue02,
        cc3Bones.CC_Base_Tongue03
    ].filter(Boolean).forEach((bone) => {
        const restQuaternion = expressionRigBoneRestQuaternions.get(bone.uuid);
        const restPosition = expressionRigBoneRestPositions.get(bone.uuid);
        if (restQuaternion) bone.quaternion.copy(restQuaternion);
        if (restPosition) bone.position.copy(restPosition);
        expressionRigBoneDeltas[bone.name] = { angleDegrees: 0, positionDelta: 0 };
    });
    [cc3Bones.CC_Base_R_Eye, cc3Bones.CC_Base_L_Eye].filter(Boolean).forEach((bone) => {
        const restQuaternion = photoBoothEyeRestQuaternions.get(bone.uuid);
        if (restQuaternion) bone.quaternion.copy(restQuaternion);
        expressionRigBoneDeltas[bone.name] = { angleDegrees: 0, positionDelta: 0 };
    });
}

function updateExpressionRigBones() {
    const state = expressionRigBoneState;
    const creatorRigVisible = isExpressionCreatorVisible();
    const rigBones = [
        cc3Bones.CC_Base_JawRoot,
        cc3Bones.CC_Base_Teeth01,
        cc3Bones.CC_Base_Teeth02,
        cc3Bones.CC_Base_Tongue01,
        cc3Bones.CC_Base_Tongue02,
        cc3Bones.CC_Base_Tongue03
    ].filter(Boolean);
    rigBones.forEach((bone) => {
        if (!expressionRigBoneRestQuaternions.has(bone.uuid)) {
            expressionRigBoneRestQuaternions.set(bone.uuid, bone.quaternion.clone());
        }
        if (!expressionRigBoneRestPositions.has(bone.uuid)) {
            expressionRigBoneRestPositions.set(bone.uuid, bone.position.clone());
        }
        if (creatorRigVisible) {
            bone.quaternion.copy(expressionRigBoneRestQuaternions.get(bone.uuid));
            bone.position.copy(expressionRigBoneRestPositions.get(bone.uuid));
        }
        expressionRigBoneDeltas[bone.name] = { angleDegrees: 0, positionDelta: 0 };
    });
    if (!creatorRigVisible) return;

    const applyLocalOffset = (bone, pitch = 0, yaw = 0, roll = 0) => {
        if (!bone || (!pitch && !yaw && !roll)) return;
        const rest = expressionRigBoneRestQuaternions.get(bone.uuid);
        bone.quaternion.copy(rest);
        expressionRigBoneOffset.setFromEuler(new THREE.Euler(pitch, yaw, roll, 'XYZ'));
        bone.quaternion.multiply(expressionRigBoneOffset);
        expressionRigBoneDeltas[bone.name] = {
            angleDegrees: Number(THREE.MathUtils.radToDeg(bone.quaternion.angleTo(rest)).toFixed(3)),
            positionDelta: Number(bone.position.distanceTo(expressionRigBoneRestPositions.get(bone.uuid)).toFixed(4))
        };
    };

    const translateBone = (bone, axis, amount) => {
        if (!bone) return;
        const restPosition = expressionRigBoneRestPositions.get(bone.uuid);
        if (!restPosition) return;
        bone.position.copy(restPosition);
        if (amount) bone.position[axis] += amount;
        const restQuaternion = expressionRigBoneRestQuaternions.get(bone.uuid);
        expressionRigBoneDeltas[bone.name] = {
            angleDegrees: expressionRigBoneDeltas[bone.name]?.angleDegrees || 0,
            positionDelta: Number(bone.position.distanceTo(restPosition).toFixed(4))
        };
    };

    const jaw = cc3Bones.CC_Base_JawRoot;
    if (state.jawOpen > 0.001) {
        applyLocalOffset(jaw, 0, 0, state.jawOpen * 0.26 * expressionRigStrength);
    }
    translateBone(jaw, 'x', state.jawForward * 0.38 * expressionRigStrength);

    translateBone(cc3Bones.CC_Base_Teeth01, 'y', state.teethUpper * 0.16 * expressionRigStrength);
    translateBone(cc3Bones.CC_Base_Teeth02, 'y', state.teethLower * 0.18 * expressionRigStrength);

    const rootX = state.tongueRoot.x * expressionRigStrength;
    const rootY = state.tongueRoot.y * expressionRigStrength;
    const tipX = state.tongueTip.x * expressionRigStrength;
    const tipY = state.tongueTip.y * expressionRigStrength;
    if (rootX || rootY || tipX || tipY) {
        applyLocalOffset(cc3Bones.CC_Base_Tongue01, 0, -rootX * 0.18, -rootY * 0.22);
        applyLocalOffset(cc3Bones.CC_Base_Tongue02, 0, -(rootX * 0.24 + tipX * 0.08), -(rootY * 0.27 + tipY * 0.1));
        applyLocalOffset(cc3Bones.CC_Base_Tongue03, 0, -(rootX * 0.14 + tipX * 0.3), -(rootY * 0.12 + tipY * 0.34));
    }
    translateBone(cc3Bones.CC_Base_Tongue01, 'x', state.tongueOut * 0.48 * expressionRigStrength);
}

function downloadPhotoBoothBlob(blob, extension, prefix) {
    if (!blob) return;
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\..+$/, '');
    link.download = `${prefix}-${timestamp}.${extension}`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function capturePhotoBoothImage() {
    if (!renderer?.domElement) return;
    try {
        renderer.render(scene, camera);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\..+$/, '');
        link.download = `cortana-photo-${timestamp}.png`;
        link.href = renderer.domElement.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        link.remove();
        setPhotoBoothStatus('Photo saved as PNG');
    } catch (error) {
        console.error('[Photo Booth] Capture failed:', error);
        setPhotoBoothStatus('Photo capture failed');
    }
}

function togglePhotoBoothRecording() {
    const button = document.getElementById('photo-record-button');
    if (photoBoothRecorder?.state === 'recording') {
        photoBoothRecorder.stop();
        return;
    }
    if (!renderer?.domElement?.captureStream || typeof MediaRecorder === 'undefined') {
        setPhotoBoothStatus('Video recording is not supported in this browser');
        return;
    }

    const stream = renderer.domElement.captureStream(30);
    const preferredType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        .find((type) => MediaRecorder.isTypeSupported(type));
    photoBoothRecordingChunks = [];
    photoBoothRecorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
    photoBoothRecorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) photoBoothRecordingChunks.push(event.data);
    });
    photoBoothRecorder.addEventListener('stop', () => {
        const blob = new Blob(photoBoothRecordingChunks, { type: photoBoothRecorder.mimeType || 'video/webm' });
        downloadPhotoBoothBlob(blob, 'webm', 'cortana-video');
        stream.getTracks().forEach((track) => track.stop());
        button?.classList.remove('is-recording');
        button?.setAttribute('aria-label', 'Start video recording');
        setPhotoBoothStatus('Video saved as WebM');
        photoBoothRecorder = null;
        photoBoothRecordingChunks = [];
    });
    photoBoothRecorder.start(250);
    button?.classList.add('is-recording');
    button?.setAttribute('aria-label', 'Stop video recording');
    setPhotoBoothStatus('Recording video — press again to stop');
}

function resetFaceMorphTargets() {
    manualFaceInfluences.clear();
    for (const layer of Object.values(faceLayers)) clearFaceWeights(layer);
    clearFaceWeights(expressionTargetWeights);
    clearFaceWeights(faceCurrentWeights);
    currentEmotion = 'Neutral';
    allFaceMorphTargets.forEach((target) => setFaceMorphTargetValue(target, 0));
    updateFaceEditorStatus();
    renderEditorFaceControls();
    resetPhotoBoothQuickSliders();
    applyPhotoBoothEyeDirection(0, 0, false);
    resetExpressionCreator();
    facialEngine?.reset();
}

function updateFaceEditorStatus() {
    const status = document.getElementById('editor-face-active');
    const preview = document.getElementById('editor-lipsync-preview');
    if (status) {
        const speechStatus = lipSyncPreviewActive
            ? '8-shape preview'
            : (lipSyncTimeline.cues.length
                ? `${lipSyncTimeline.cues.length} timed cues`
                : 'waiting for speech');
        status.textContent = `${currentEmotion} · ${speechStatus}`;
    }
    if (preview) {
        preview.classList.toggle('is-playing', lipSyncPreviewActive);
        preview.textContent = lipSyncPreviewActive
            ? 'Playing speech-shape preview'
            : 'Preview all 8 speech shapes';
    }
    document.querySelectorAll('[data-face-expression]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.faceExpression === currentEmotion);
    });
}

function ensureFacialEngine() {
    if (facialEngine || !window.CortanaFacialEngine) return facialEngine;
    facialEngine = new window.CortanaFacialEngine({
        applyChannel(name, value) {
            setFaceLayerWeight('expression', name, value);
        },
        hasChannel(name) {
            return faceChannels.has(name);
        }
    });
    facialEngine.setStatusListener(renderExpressionLabStatus);
    renderExpressionLab();
    return facialEngine;
}

function renderExpressionLab() {
    const catalog = window.CORTANA_EXPRESSION_CATALOG || [];
    const list = document.getElementById('expression-test-list');
    const categorySelect = document.getElementById('expression-category');
    const count = document.getElementById('expression-catalog-count');
    if (!list || !categorySelect) return;

    if (categorySelect.options.length <= 1) {
        [...new Set(catalog.map((recipe) => recipe.category))].forEach((category) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    const query = document.getElementById('expression-search')?.value.trim().toLowerCase() || '';
    const category = categorySelect.value;
    const matches = catalog.filter((recipe) => {
        const categoryMatch = !category || recipe.category === category;
        const queryMatch = !query || `${recipe.label} ${recipe.category}`.toLowerCase().includes(query);
        return categoryMatch && queryMatch;
    });

    list.replaceChildren();
    for (const recipe of matches) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.expressionRecipe = recipe.id;
        button.className = 'expression-test-button';
        button.classList.toggle('is-micro', recipe.micro);

        const label = document.createElement('strong');
        label.textContent = recipe.label;
        const meta = document.createElement('small');
        meta.textContent = recipe.micro ? `${Math.round(recipe.duration * 1000)} ms` : recipe.category;
        button.append(label, meta);
        list.appendChild(button);
    }

    if (count) count.textContent = `${matches.length}/${catalog.length}`;
    syncExpressionLabControls();
}

function syncExpressionLabControls() {
    const state = facialEngine?.getState();
    document.querySelectorAll('[data-expression-recipe]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.expressionRecipe === state?.active);
    });
}

function renderExpressionLabStatus(state) {
    const badge = document.getElementById('expression-runtime-status');
    const name = document.getElementById('expression-active-name');
    const progress = document.getElementById('expression-progress');
    const mapped = document.getElementById('expression-mapped-count');
    const layer = document.getElementById('expression-layer-state');
    const healthy = state.ready && state.missingChannels.length === 0;
    if (badge) {
        badge.dataset.state = healthy ? 'pass' : 'warn';
        badge.textContent = healthy ? 'PASS' : 'CHECK';
    }
    if (name) name.textContent = state.label || 'Calm';
    if (progress) progress.style.setProperty('--expression-progress', `${Math.round(state.progress * 100)}%`);
    if (mapped) mapped.textContent = `${state.mappedChannels} mapped`;
    if (layer) layer.textContent = state.transients.length
        ? `${state.transients.length} micro active`
        : (state.source || 'idle');
    syncExpressionLabControls();
}

function playExpressionFromLab(expressionId = '') {
    const id = expressionId || facialEngine?.lastPlayed || 'genuine_smile';
    const intensity = Number(document.getElementById('expression-intensity')?.value || 75) / 100;
    const duration = Number(document.getElementById('expression-duration')?.value || 240) / 100;
    const loop = document.getElementById('expression-loop')?.checked ?? false;
    const result = facialEngine?.play(id, { intensity, duration, loop, source: 'lab' });
    if (!result?.ok) return;
    currentEmotion = facialEngine.resolveRecipe(id)?.label || currentEmotion;
    updateFaceEditorStatus();
    document.querySelectorAll('[data-expression-recipe]').forEach((button) => {
        button.classList.toggle('is-selected', button.dataset.expressionRecipe === result.id);
    });
}

function startLipSyncPreview() {
    audioEl.pause();
    stopWebAudioTts();
    stopSpeaking(0.15);

    const cueLength = 0.34;
    const cueGap = 0.035;
    const cues = SPEECH_VISEMES.map((viseme, index) => {
        const start = 0.12 + index * (cueLength + cueGap);
        return {
            start,
            end: start + cueLength,
            viseme,
            strength: 0.92,
            tongue: viseme === 'V_Lip_Open' ? 'V_Tongue_Raise' : ''
        };
    });
    setLipSyncTimeline({
        version: 1,
        source: 'editor-preview',
        duration: cues.at(-1).end,
        cues
    });
    lipSyncPreviewStartedAt = performance.now() * 0.001;
    lipSyncPreviewActive = true;
    startSpeaking();
    updateFaceEditorStatus();
}

function renderWorldObjectList() {
    const list = document.getElementById('editor-object-list');
    const count = document.getElementById('editor-object-count');
    if (!list || !worldDocument) return;
    list.replaceChildren();
    if (count) count.textContent = String(worldDocument.objects.length);

    worldDocument.objects.forEach((worldObject) => {
        const button = document.createElement('button');
        button.className = 'editor-object-row';
        button.type = 'button';
        button.classList.toggle('is-selected', worldObject.id === selectedWorldObjectId);
        button.dataset.objectId = worldObject.id;

        const icon = document.createElement('span');
        icon.className = 'object-type-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = worldObject.type === 'sphere' ? '●' : worldObject.type === 'cylinder' ? '◉' : '◆';

        const name = document.createElement('strong');
        name.textContent = worldObject.name;
        const type = document.createElement('small');
        type.textContent = worldObject.type;

        button.append(icon, name, type);
        button.addEventListener('click', () => selectWorldObject(worldObject.id));
        list.appendChild(button);
    });
}

function getSceneNodeType(object) {
    if (!object) return 'Object';
    if (object.isSkinnedMesh) return 'Skinned Mesh';
    if (object.isMesh) return 'Mesh';
    if (object.isBone) return 'Bone';
    if (object.isSkeletonHelper) return 'Armature Helper';
    if (object.isLight) return 'Light';
    if (object.isCamera) return 'Camera';
    return object.type || 'Object';
}

function getSceneNodeIcon(object) {
    if (!object) return '•';
    if (object.isScene) return '▣';
    if (object.isBone) return '⚯';
    if (object.isSkinnedMesh) return '▿';
    if (object.isMesh) return '◆';
    if (object.isLight) return '◉';
    if (object.isSkeletonHelper) return '⌁';
    if (object.isGroup) return '▤';
    return '□';
}

function getSceneNodeLabel(object) {
    if (!object) return 'Unknown';
    return object.name || getSceneNodeType(object);
}

function walkSceneHierarchy(root, rows, depth = 0) {
    if (!root) return;
    rows.push({ object: root, depth });
    root.children.forEach((child) => walkSceneHierarchy(child, rows, depth + 1));
}

function traverseScene(callback) {
    if (!scene) return;
    scene.traverse(callback);
}

function getSceneBaseVisible(object) {
    if (!object) return true;
    if (typeof object.userData.editorBaseVisible !== 'boolean') {
        object.userData.editorBaseVisible = object.visible;
    }
    return object.userData.editorBaseVisible;
}

function setSceneBaseVisible(object, visible) {
    if (!object || object.isScene) return;
    object.userData.editorBaseVisible = Boolean(visible);
}

function captureSceneEditorVisibility() {
    traverseScene((object) => {
        object.userData.editorOriginalVisible = object.visible;
        object.userData.editorBaseVisible = object.visible;
    });
}

function restoreSceneEditorVisibility() {
    traverseScene((object) => {
        if (typeof object.userData.editorOriginalVisible === 'boolean') {
            object.visible = object.userData.editorOriginalVisible;
            object.userData.editorBaseVisible = object.userData.editorOriginalVisible;
        }
    });
    sceneViewMode = 'all';
    updateSceneViewModeControls();
}

function isDescendantOf(object, ancestor) {
    let current = object;
    while (current) {
        if (current === ancestor) return true;
        current = current.parent;
    }
    return false;
}

function isAncestorOf(object, descendant) {
    return isDescendantOf(descendant, object);
}

function containsObjectMatching(root, predicate) {
    let found = false;
    root.traverse((child) => {
        if (!found && predicate(child)) found = true;
    });
    return found;
}

function setSceneViewMode(mode) {
    sceneViewMode = ['all', 'isolate', 'armature', 'mesh'].includes(mode) ? mode : 'all';
    applySceneViewMode();
    updateSceneViewModeControls();
    renderSceneHierarchyList();
}

function applySceneViewMode() {
    if (!scene) return;
    const selectedNode = findSceneNodeByUuid(selectedSceneNodeUuid);

    traverseScene((object) => {
        if (object.isScene) {
            object.visible = true;
            return;
        }

        const baseVisible = getSceneBaseVisible(object);
        let nextVisible = baseVisible;

        if (sceneViewMode === 'isolate') {
            nextVisible = selectedNode
                ? (isDescendantOf(object, selectedNode) || isAncestorOf(object, selectedNode))
                : baseVisible;
        } else if (sceneViewMode === 'armature') {
            nextVisible = object.isBone
                || object.isSkeletonHelper
                || containsObjectMatching(object, (child) => child.isBone || child.isSkeletonHelper);
        } else if (sceneViewMode === 'mesh') {
            nextVisible = (object.isMesh || object.isSkinnedMesh)
                || containsObjectMatching(object, (child) => child.isMesh || child.isSkinnedMesh);
        }

        object.visible = nextVisible;
    });

    if (sceneViewMode === 'armature' && idleSkeleton) {
        setSceneBaseVisible(idleSkeleton, true);
        idleSkeleton.visible = true;
    }
}

function updateSceneViewModeControls() {
    document.querySelectorAll('[data-scene-view]').forEach((button) => {
        const active = button.dataset.sceneView === sceneViewMode;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function walkVisibleSceneHierarchy(root, rows, searchTerm, depth = 0) {
    if (!root) return false;
    const label = getSceneNodeLabel(root).toLowerCase();
    const type = getSceneNodeType(root).toLowerCase();
    const selfMatches = !searchTerm || label.includes(searchTerm) || type.includes(searchTerm);
    const childRows = [];
    let childMatches = false;

    if (!collapsedSceneNodeUuids.has(root.uuid) || searchTerm) {
        root.children.forEach((child) => {
            childMatches = walkVisibleSceneHierarchy(child, childRows, searchTerm, depth + 1) || childMatches;
        });
    }

    if (selfMatches || childMatches) {
        rows.push({ object: root, depth });
        rows.push(...childRows);
        return true;
    }

    return false;
}

function summarizeSceneHierarchy(rows) {
    return rows.reduce((stats, row) => {
        const object = row.object;
        if (object.isSkinnedMesh) stats.skinned += 1;
        else if (object.isMesh) stats.meshes += 1;
        if (object.isBone) stats.bones += 1;
        if (object.isLight) stats.lights += 1;
        if (object.isGroup) stats.groups += 1;
        return stats;
    }, { meshes: 0, skinned: 0, bones: 0, lights: 0, groups: 0 });
}

function renderSceneHierarchyList() {
    const list = document.getElementById('scene-hierarchy-list');
    const count = document.getElementById('scene-node-count');
    const statsStrip = document.getElementById('scene-stat-strip');
    if (!list || !scene) return;

    const allRows = [];
    walkSceneHierarchy(scene, allRows);
    if (!allRows.some((row) => row.object.uuid === selectedSceneNodeUuid)) {
        selectedSceneNodeUuid = null;
    }
    const searchTerm = (document.getElementById('scene-search-input')?.value || '').trim().toLowerCase();
    const rows = [];
    walkVisibleSceneHierarchy(scene, rows, searchTerm);

    list.replaceChildren();
    if (count) count.textContent = String(allRows.length);

    const stats = summarizeSceneHierarchy(allRows);
    if (statsStrip) {
        statsStrip.replaceChildren(
            createSceneStat('Skinned', stats.skinned),
            createSceneStat('Meshes', stats.meshes),
            createSceneStat('Bones', stats.bones),
            createSceneStat('Lights', stats.lights),
            createSceneStat('Groups', stats.groups)
        );
    }

    rows.forEach(({ object, depth }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'scene-node-row';
        button.setAttribute('role', 'treeitem');
        button.classList.toggle('is-selected', object.uuid === selectedSceneNodeUuid);
        button.classList.toggle('is-muted', !object.visible);
        button.style.setProperty('--depth', String(Math.min(depth, 5)));

        const expander = document.createElement('span');
        expander.className = 'scene-node-expander';
        expander.textContent = object.children.length ? (collapsedSceneNodeUuids.has(object.uuid) && !searchTerm ? '›' : '⌄') : '';
        expander.setAttribute('aria-hidden', 'true');

        const icon = document.createElement('span');
        icon.className = 'scene-node-icon';
        icon.textContent = getSceneNodeIcon(object);
        icon.setAttribute('aria-hidden', 'true');

        const label = document.createElement('strong');
        label.textContent = getSceneNodeLabel(object);

        const type = document.createElement('small');
        type.textContent = getSceneNodeType(object);

        const view = document.createElement('span');
        view.className = 'scene-node-column scene-node-eye';
        view.textContent = getSceneBaseVisible(object) ? '◉' : '○';
        view.title = getSceneBaseVisible(object) ? 'Hide element' : 'Show element';
        view.setAttribute('aria-label', view.title);

        const isolate = document.createElement('span');
        isolate.className = 'scene-node-column scene-node-solo';
        isolate.textContent = object.uuid === selectedSceneNodeUuid && sceneViewMode === 'isolate' ? '●' : '◎';
        isolate.title = 'View this branch separately';
        isolate.setAttribute('aria-label', isolate.title);

        button.append(expander, icon, label, type, view, isolate);
        button.addEventListener('click', (event) => {
            if (event.target === expander && object.children.length) {
                if (collapsedSceneNodeUuids.has(object.uuid)) collapsedSceneNodeUuids.delete(object.uuid);
                else collapsedSceneNodeUuids.add(object.uuid);
                renderSceneHierarchyList();
                return;
            }
            if (event.target === view) {
                setSceneBaseVisible(object, !getSceneBaseVisible(object));
                applySceneViewMode();
                renderSceneHierarchyList();
                return;
            }
            if (event.target === isolate) {
                selectedSceneNodeUuid = object.uuid;
                setSceneViewMode(sceneViewMode === 'isolate' ? 'all' : 'isolate');
                return;
            }
            selectSceneNode(object.uuid);
        });
        button.addEventListener('dblclick', () => {
            if (!object.children.length) return;
            if (collapsedSceneNodeUuids.has(object.uuid)) collapsedSceneNodeUuids.delete(object.uuid);
            else collapsedSceneNodeUuids.add(object.uuid);
            renderSceneHierarchyList();
        });
        list.appendChild(button);
    });

    renderSceneNodeDetails();
}

function createSceneStat(label, value) {
    const item = document.createElement('span');
    item.className = 'scene-stat';
    item.textContent = `${label} ${value}`;
    return item;
}

function findSceneNodeByUuid(uuid) {
    if (!uuid || !scene) return null;
    let found = null;
    scene.traverse((object) => {
        if (!found && object.uuid === uuid) found = object;
    });
    return found;
}

function selectSceneNode(uuid) {
    selectedSceneNodeUuid = uuid;
    if (sceneViewMode === 'isolate') applySceneViewMode();
    renderSceneHierarchyList();
}

function formatVector3(vector) {
    return `${vector.x.toFixed(3)}, ${vector.y.toFixed(3)}, ${vector.z.toFixed(3)}`;
}

function renderSceneNodeDetails() {
    const details = document.getElementById('scene-node-details');
    if (!details) return;
    const object = findSceneNodeByUuid(selectedSceneNodeUuid);
    details.replaceChildren();

    if (!object) {
        details.classList.add('is-empty');
        details.textContent = 'Select a loaded element';
        return;
    }

    details.classList.remove('is-empty');
    object.updateMatrixWorld(true);
    const worldPosition = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
    const lines = [
        ['Name', getSceneNodeLabel(object)],
        ['Type', getSceneNodeType(object)],
        ['Visible', object.visible ? 'Yes' : 'No'],
        ['Children', String(object.children.length)],
        ['Position', formatVector3(object.position)],
        ['World', formatVector3(worldPosition)]
    ];

    if (object.isSkinnedMesh && object.skeleton) {
        lines.push(['Bones', String(object.skeleton.bones.length)]);
    }
    if (object.geometry) {
        const attributes = Object.keys(object.geometry.attributes || {}).join(', ') || 'None';
        lines.push(['Geometry', object.geometry.type || 'BufferGeometry']);
        lines.push(['Attrs', attributes]);
    }
    if (object.morphTargetDictionary) {
        lines.push(['Morphs', String(Object.keys(object.morphTargetDictionary).length)]);
    }
    if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        lines.push(['Materials', materials.map((material) => material?.name || material?.type || 'Material').join(', ')]);
    }

    lines.forEach(([label, value]) => {
        const row = document.createElement('div');
        const key = document.createElement('span');
        const val = document.createElement('strong');
        key.textContent = label;
        val.textContent = value;
        row.append(key, val);
        details.appendChild(row);
    });
}

function syncWorldObjectInspector() {
    const inspector = document.getElementById('editor-inspector');
    const worldObject = getWorldObject();
    if (!inspector) return;
    inspector.classList.toggle('is-empty', !worldObject);
    if (!worldObject) return;

    document.getElementById('editor-name').value = worldObject.name;
    document.getElementById('editor-type-badge').textContent =
        worldObject.type.charAt(0).toUpperCase() + worldObject.type.slice(1);
    document.getElementById('editor-color').value = worldObject.color;
    document.getElementById('editor-collision').checked = worldObject.collision;
    document.getElementById('editor-visible').checked = worldObject.visible;

    inspector.querySelectorAll('[data-transform]').forEach((input) => {
        const transformName = input.dataset.transform;
        const axisIndex = { x: 0, y: 1, z: 2 }[input.dataset.axis];
        let value = worldObject.transform[transformName][axisIndex];
        if (transformName === 'rotation') value = THREE.MathUtils.radToDeg(value);
        input.value = Number(value.toFixed(3));
    });
}

function syncWorldEnvironmentControls() {
    if (!worldDocument) return;
    const environment = worldDocument.environment;
    const background = document.getElementById('editor-background');
    const groundColor = document.getElementById('editor-ground-color');
    const tileScale = document.getElementById('editor-tile-scale');
    const tileValue = document.getElementById('editor-tile-value');
    if (background) background.value = environment.background;
    if (groundColor) groundColor.value = environment.ground_color;
    if (tileScale) tileScale.value = String(environment.tile_scale);
    if (tileValue) tileValue.value = String(environment.tile_scale);
}

function selectWorldObject(id) {
    selectedWorldObjectId = getWorldObject(id) ? id : null;
    renderWorldObjectList();
    syncWorldObjectInspector();
    updateEditorSelectionHelper();
    updateWorldEditorCommands();
}

function updateEditorSelectionHelper() {
    if (editorSelectionHelper) {
        scene.remove(editorSelectionHelper);
        editorSelectionHelper.geometry?.dispose?.();
        editorSelectionHelper.material?.dispose?.();
        editorSelectionHelper = null;
    }
    const mesh = getWorldObjectMesh();
    if (!mesh || !mesh.visible || !worldEditorActive) return;
    editorSelectionHelper = new THREE.BoxHelper(mesh, 0x2463eb);
    editorSelectionHelper.name = 'World_Editor_Selection';
    editorSelectionHelper.material.depthTest = false;
    editorSelectionHelper.material.transparent = true;
    editorSelectionHelper.material.opacity = 0.92;
    editorSelectionHelper.renderOrder = 999;
    scene.add(editorSelectionHelper);
}

function recordWorldEditorHistory() {
    if (!worldDocument) return;
    editorUndoStack.push(cloneWorldDocument(worldDocument));
    if (editorUndoStack.length > 50) editorUndoStack.shift();
    editorRedoStack = [];
    updateWorldEditorCommands();
}

function markWorldDocumentDirty() {
    worldDocumentDirty = true;
    setWorldEditorStatus('Unsaved changes', 'dirty');
}

function setWorldEditorStatus(message, state = '') {
    const status = document.getElementById('editor-save-status');
    if (status) {
        status.textContent = message;
        status.classList.toggle('is-dirty', state === 'dirty');
        status.classList.toggle('is-error', state === 'error');
    }
    if (worldEditorActive && studioEditorMode === 'world') {
        setStudioLiveStatus(
            state === 'dirty' ? 'Editing' : (state === 'error' ? 'Needs attention' : 'Ready'),
            message
        );
    }
}

function updateWorldEditorCommands() {
    const hasSelection = Boolean(getWorldObject());
    const undo = document.getElementById('editor-undo');
    const redo = document.getElementById('editor-redo');
    const duplicate = document.getElementById('editor-duplicate');
    const remove = document.getElementById('editor-delete');
    if (undo) undo.disabled = editorUndoStack.length === 0;
    if (redo) redo.disabled = editorRedoStack.length === 0;
    if (duplicate) duplicate.disabled = !hasSelection;
    if (remove) remove.disabled = !hasSelection;
}

function addWorldObject(type) {
    const counts = worldDocument.objects.reduce((total, item) => total + (item.type === type ? 1 : 0), 0);
    const height = type === 'sphere' ? 0.65 : 0.5;
    const worldObject = {
        id: createWorldObjectId(),
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${counts + 1}`,
        type,
        color: type === 'sphere' ? '#f05b72' : type === 'cylinder' ? '#22a06b' : '#4f7cff',
        visible: true,
        collision: true,
        transform: {
            position: [2 + (worldDocument.objects.length % 3) * 1.35, height, -1.5],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
        }
    };
    recordWorldEditorHistory();
    worldDocument.objects.push(worldObject);
    editorGroup.add(createWorldObjectMesh(worldObject));
    selectedWorldObjectId = worldObject.id;
    rebuildWorldObjectCollisions();
    refreshWorldEditor();
    updateEditorSelectionHelper();
    markWorldDocumentDirty();
}

function duplicateSelectedWorldObject() {
    const source = getWorldObject();
    if (!source) return;
    recordWorldEditorHistory();
    const duplicate = cloneWorldDocument(source);
    duplicate.id = createWorldObjectId();
    duplicate.name = `${source.name} Copy`;
    duplicate.transform.position[0] += 0.75;
    duplicate.transform.position[2] += 0.75;
    worldDocument.objects.push(duplicate);
    editorGroup.add(createWorldObjectMesh(duplicate));
    selectedWorldObjectId = duplicate.id;
    rebuildWorldObjectCollisions();
    refreshWorldEditor();
    updateEditorSelectionHelper();
    markWorldDocumentDirty();
}

function deleteSelectedWorldObject() {
    const index = worldDocument.objects.findIndex((worldObject) => worldObject.id === selectedWorldObjectId);
    if (index < 0) return;
    recordWorldEditorHistory();
    const mesh = getWorldObjectMesh();
    if (mesh) {
        editorGroup.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
    }
    worldDocument.objects.splice(index, 1);
    selectedWorldObjectId = null;
    rebuildWorldObjectCollisions();
    refreshWorldEditor();
    updateEditorSelectionHelper();
    markWorldDocumentDirty();
}

function undoWorldEditorChange() {
    const previous = editorUndoStack.pop();
    if (!previous) return;
    editorRedoStack.push(cloneWorldDocument(worldDocument));
    applyWorldDocument(previous);
    markWorldDocumentDirty();
}

function redoWorldEditorChange() {
    const next = editorRedoStack.pop();
    if (!next) return;
    editorUndoStack.push(cloneWorldDocument(worldDocument));
    applyWorldDocument(next);
    markWorldDocumentDirty();
}

async function saveWorldDocument() {
    const saveButton = document.getElementById('editor-save');
    if (!worldDocument || !saveButton) return;
    saveButton.disabled = true;
    setWorldEditorStatus('Saving...');
    try {
        const response = await fetch('/api/world', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(worldDocument)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        worldDocument = normalizeWorldDocument(result.world);
        savedWorldDocument = cloneWorldDocument(worldDocument);
        worldDocumentDirty = false;
        editorUndoStack = [];
        editorRedoStack = [];
        setWorldEditorStatus('World published');
        updateWorldEditorCommands();
    } catch (error) {
        console.error('[World Editor] Save failed:', error);
        setWorldEditorStatus('Save failed', 'error');
    } finally {
        saveButton.disabled = false;
    }
}

function resetWorldEditorDraft() {
    const resetButton = document.getElementById('editor-reset');
    const now = Date.now();
    if (now > worldResetArmedUntil) {
        worldResetArmedUntil = now + 5000;
        if (resetButton) {
            resetButton.classList.add('is-armed');
            resetButton.textContent = 'Click again to reset';
        }
        setWorldEditorStatus('Reset is armed for 5 seconds');
        window.clearTimeout(worldResetArmTimer);
        worldResetArmTimer = window.setTimeout(() => {
            worldResetArmedUntil = 0;
            if (resetButton) {
                resetButton.classList.remove('is-armed');
                resetButton.textContent = 'Reset world draft';
            }
            if (worldEditorActive) setWorldEditorStatus(worldDocumentDirty ? 'Unsaved changes' : 'All changes saved', worldDocumentDirty ? 'dirty' : '');
        }, 5100);
        return;
    }

    worldResetArmedUntil = 0;
    window.clearTimeout(worldResetArmTimer);
    if (resetButton) {
        resetButton.classList.remove('is-armed');
        resetButton.textContent = 'Reset world draft';
    }
    recordWorldEditorHistory();
    selectedWorldObjectId = null;
    applyWorldDocument(createDefaultWorldDocument(), null);
    markWorldDocumentDirty();
    setWorldEditorStatus('World draft reset · Undo is available', 'dirty');
}

function openWorldEditor() {
    if (!worldDocument) return;
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    studioReturnFocus = activeElement?.closest('#render-controls')
        ? document.getElementById('settings-button')
        : activeElement;
    captureSceneEditorVisibility();
    worldEditorActive = true;
    editorPreviousLocoEnabled = locoEnabled;
    locoEnabled = false;
    Object.keys(keys).forEach((key) => { keys[key] = false; });
    document.body.classList.add('is-world-editing');
    document.getElementById('world-editor')?.classList.remove('hidden');
    document.getElementById('editor-mode-pill')?.classList.remove('hidden');
    document.getElementById('studio-scrim')?.classList.remove('hidden');
    setStudioEditorMode(studioEditorMode);
    renderSceneHierarchyList();
    renderEditorFaceControls();
    updateEditorSelectionHelper();
    updateStudioRootButtons();
    setStudioLiveStatus('Ready', STUDIO_CATEGORY_LABELS[studioCategoryByMode[studioEditorMode]]);
    window.setTimeout(() => document.getElementById('close-world-editor')?.focus(), 80);
    requestAnimationFrame(onResize);
}

function closeWorldEditor() {
    if (photoBoothRecorder?.state === 'recording') photoBoothRecorder.stop();
    fadeToAction('idle', 0.28);
    locoCurrentKey = 'idle';
    worldEditorActive = false;
    editorDragState = null;
    selectedWorldObjectId = null;
    if (worldDocumentDirty && savedWorldDocument) {
        applyWorldDocument(savedWorldDocument, null);
        worldDocumentDirty = false;
        editorUndoStack = [];
        editorRedoStack = [];
        setWorldEditorStatus('All changes saved');
    }
    restoreSceneEditorVisibility();
    clearExpressionRigTargets();
    releaseExpressionRigBonePose();
    locoEnabled = editorPreviousLocoEnabled;
    document.body.classList.remove('is-world-editing');
    document.getElementById('world-editor')?.classList.add('hidden');
    document.getElementById('editor-mode-pill')?.classList.add('hidden');
    document.getElementById('studio-scrim')?.classList.add('hidden');
    document.getElementById('axis-orbit-menu')?.classList.add('hidden');
    document.getElementById('axis-orbit-button')?.setAttribute('aria-expanded', 'false');
    delete document.body.dataset.studioRoot;
    delete document.body.dataset.studioCategory;
    worldResetArmedUntil = 0;
    window.clearTimeout(worldResetArmTimer);
    const resetButton = document.getElementById('editor-reset');
    if (resetButton) {
        resetButton.classList.remove('is-armed');
        resetButton.textContent = 'Reset world draft';
    }
    updateEditorSelectionHelper();
    updateStudioRootButtons();
    setStudioLiveStatus('Ready');
    const returnFocus = studioReturnFocus;
    studioReturnFocus = null;
    requestAnimationFrame(() => returnFocus?.focus?.());
    requestAnimationFrame(onResize);
}

function updateEditorRayFromEvent(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    editorPointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    editorPointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    editorRay.setFromCamera(editorPointer, camera);
}

function handleWorldEditorPointerDown(event) {
    if (!worldEditorActive || event.button !== 0) return;
    updateEditorRayFromEvent(event);
    const intersections = editorRay.intersectObjects(editorGroup?.children || [], false)
        .filter((hit) => hit.object.visible);
    if (intersections.length === 0) {
        selectWorldObject(null);
        return;
    }

    const mesh = intersections[0].object;
    const id = mesh.userData.worldObjectId;
    selectWorldObject(id);
    recordWorldEditorHistory();
    editorDragPlane.constant = -mesh.position.y;
    if (!editorRay.ray.intersectPlane(editorDragPlane, editorDragPoint)) return;
    editorDragState = {
        id,
        offsetX: mesh.position.x - editorDragPoint.x,
        offsetZ: mesh.position.z - editorDragPoint.z,
        moved: false
    };
    orbitControls.enabled = false;
    renderer.domElement.classList.add('is-object-dragging');
    renderer.domElement.setPointerCapture?.(event.pointerId);
}

function handleWorldEditorPointerMove(event) {
    if (!worldEditorActive) return;
    updateEditorRayFromEvent(event);
    if (editorDragState) {
        if (!editorRay.ray.intersectPlane(editorDragPlane, editorDragPoint)) return;
        const worldObject = getWorldObject(editorDragState.id);
        const mesh = getWorldObjectMesh(editorDragState.id);
        if (!worldObject || !mesh) return;
        worldObject.transform.position[0] = Number((editorDragPoint.x + editorDragState.offsetX).toFixed(3));
        worldObject.transform.position[2] = Number((editorDragPoint.z + editorDragState.offsetZ).toFixed(3));
        updateWorldObjectMesh(mesh, worldObject);
        editorSelectionHelper?.update?.();
        syncWorldObjectInspector();
        editorDragState.moved = true;
        markWorldDocumentDirty();
        return;
    }
    const hovered = editorRay.intersectObjects(editorGroup?.children || [], false)
        .some((hit) => hit.object.visible);
    renderer.domElement.classList.toggle('is-object-hovered', hovered);
}

function handleWorldEditorPointerUp(event) {
    if (!editorDragState) return;
    if (!editorDragState.moved) {
        editorUndoStack.pop();
        updateWorldEditorCommands();
    }
    editorDragState = null;
    rebuildWorldObjectCollisions();
    renderer.domElement.classList.remove('is-object-dragging');
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    const camLock = document.getElementById('cam-lock-toggle');
    orbitControls.enabled = !(camLock?.checked);
}

function setupWorldEditor() {
    if (worldEditorSetupComplete) return;
    worldEditorSetupComplete = true;

    document.getElementById('open-world-editor')?.addEventListener('click', (event) => {
        event.stopPropagation();
        openWorldEditor();
    });
    document.getElementById('close-world-editor')?.addEventListener('click', closeWorldEditor);
    document.getElementById('studio-scrim')?.addEventListener('click', closeWorldEditor);
    const studioModeButtons = [...document.querySelectorAll('[data-studio-mode]')];
    studioModeButtons.forEach((button) => {
        button.addEventListener('click', () => setStudioEditorMode(button.dataset.studioMode));
        button.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const index = studioModeButtons.indexOf(button);
            const next = studioModeButtons[(index + direction + studioModeButtons.length) % studioModeButtons.length];
            next.focus();
            next.click();
        });
    });
    const photoTabButtons = [...document.querySelectorAll('[data-photo-tab]')];
    photoTabButtons.forEach((button) => {
        button.addEventListener('click', () => setPhotoBoothTab(button.dataset.photoTab));
        button.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const index = photoTabButtons.indexOf(button);
            const next = photoTabButtons[(index + direction + photoTabButtons.length) % photoTabButtons.length];
            next.focus();
            next.click();
        });
    });
    setupExpressionCreator();
    document.getElementById('photo-animation-play')?.addEventListener('click', () => {
        previewPhotoBoothAnimation(document.getElementById('photo-animation-select')?.value || 'idle');
    });
    document.getElementById('photo-animation-select')?.addEventListener('change', (event) => {
        previewPhotoBoothAnimation(event.target.value);
    });
    document.getElementById('photo-animation-stop')?.addEventListener('click', () => {
        const select = document.getElementById('photo-animation-select');
        if (select) select.value = 'idle';
        previewPhotoBoothAnimation('idle');
    });
    document.querySelectorAll('[data-photo-camera]').forEach((button) => {
        button.addEventListener('click', () => setPhotoBoothCamera(button.dataset.photoCamera));
    });
    document.getElementById('photo-capture-button')?.addEventListener('click', capturePhotoBoothImage);
    document.getElementById('photo-record-button')?.addEventListener('click', togglePhotoBoothRecording);

    const overwriteFace = document.getElementById('photo-overwrite-face');
    overwriteFace?.addEventListener('change', () => {
        document.getElementById('photo-quick-face-controls')?.classList.toggle('is-disabled', !overwriteFace.checked);
        if (!overwriteFace.checked) resetFaceMorphTargets();
        setPhotoBoothStatus(overwriteFace.checked ? 'Manual facial controls enabled' : 'Animation facial expressions preserved');
    });

    const lookCamera = document.getElementById('photo-look-camera');
    lookCamera?.addEventListener('change', () => {
        const headTracking = document.getElementById('head-tracking-toggle');
        if (headTracking) headTracking.checked = lookCamera.checked;
        if (lookCamera.checked) applyPhotoBoothEyeDirection(0, 0, false);
        setPhotoBoothStatus(lookCamera.checked ? 'Eyes looking at camera' : 'Manual eye direction enabled');
    });

    document.querySelectorAll('[data-photo-emotion]').forEach((input) => {
        input.addEventListener('input', () => {
            if (!overwriteFace?.checked) return;
            document.querySelectorAll('[data-photo-emotion]').forEach((other) => {
                if (other !== input) other.value = '0';
            });
            const strength = Number(input.value) / 100;
            applyEmotion(strength > 0 ? input.dataset.photoEmotion : 'Neutral', strength || 1, [], 120);
            setPhotoBoothStatus(`${input.dataset.photoEmotion} ${Math.round(strength * 100)}%`);
        });
    });
    document.querySelectorAll('[data-photo-channel]').forEach((input) => {
        input.addEventListener('input', () => {
            if (!overwriteFace?.checked) return;
            const value = Number(input.value) / 100;
            input.dataset.photoChannel.split(',').forEach((channel) => setManualFaceChannel(channel, value));
            setPhotoBoothStatus(`${input.closest('label')?.firstChild?.textContent?.trim() || 'Face control'} ${input.value}%`);
        });
    });
    document.querySelectorAll('[data-photo-vowel]').forEach((input) => {
        input.addEventListener('input', () => {
            if (!overwriteFace?.checked) return;
            document.querySelectorAll('[data-photo-vowel]').forEach((other) => {
                if (other !== input) other.value = '0';
            });
            const intensity = Number(input.value) / 100;
            setPhotoBoothVowel(input.dataset.photoVowel, intensity);
            setPhotoBoothStatus(`${input.dataset.photoVowel} mouth shape ${input.value}%`);
        });
    });
    document.querySelectorAll('[data-photo-pattern]').forEach((input) => {
        input.addEventListener('input', () => {
            if (!overwriteFace?.checked) return;
            setManualFacePattern(input.dataset.photoPattern, Number(input.value) / 100);
        });
    });

    const eyePad = document.getElementById('photo-eye-pad');
    let eyePadDragging = false;
    const updateEyePad = (event) => {
        if (!eyePad || !eyePadDragging) return;
        const bounds = eyePad.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
        if (lookCamera) {
            lookCamera.checked = false;
            lookCamera.dispatchEvent(new Event('change'));
        }
        applyPhotoBoothEyeDirection(x, y);
    };
    eyePad?.addEventListener('pointerdown', (event) => {
        eyePadDragging = true;
        eyePad.setPointerCapture?.(event.pointerId);
        updateEyePad(event);
    });
    eyePad?.addEventListener('pointermove', updateEyePad);
    eyePad?.addEventListener('pointerup', (event) => {
        eyePadDragging = false;
        eyePad.releasePointerCapture?.(event.pointerId);
    });
    eyePad?.addEventListener('pointercancel', () => { eyePadDragging = false; });
    eyePad?.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 0.25 : 0.1;
        let { x, y } = photoBoothEyeDirection;
        if (event.key === 'ArrowLeft') x -= step;
        else if (event.key === 'ArrowRight') x += step;
        else if (event.key === 'ArrowUp') y -= step;
        else if (event.key === 'ArrowDown') y += step;
        else if (event.key === 'Home') {
            x = 0;
            y = 0;
        } else {
            return;
        }
        event.preventDefault();
        if (lookCamera?.checked) {
            lookCamera.checked = false;
            lookCamera.dispatchEvent(new Event('change'));
        }
        applyPhotoBoothEyeDirection(x, y);
    });

    document.getElementById('editor-save')?.addEventListener('click', saveWorldDocument);
    document.getElementById('editor-reset')?.addEventListener('click', resetWorldEditorDraft);
    document.getElementById('editor-undo')?.addEventListener('click', undoWorldEditorChange);
    document.getElementById('editor-redo')?.addEventListener('click', redoWorldEditorChange);
    document.getElementById('editor-duplicate')?.addEventListener('click', duplicateSelectedWorldObject);
    document.getElementById('editor-delete')?.addEventListener('click', deleteSelectedWorldObject);
    document.getElementById('editor-refresh-scene')?.addEventListener('click', renderSceneHierarchyList);
    document.querySelectorAll('[data-scene-view]').forEach((button) => {
        button.addEventListener('click', () => setSceneViewMode(button.dataset.sceneView));
    });
    const sceneSearchInput = document.getElementById('scene-search-input');
    sceneSearchInput?.addEventListener('input', renderSceneHierarchyList);
    sceneSearchInput?.addEventListener('search', renderSceneHierarchyList);
    sceneSearchInput?.addEventListener('change', renderSceneHierarchyList);
    document.getElementById('editor-toggle-skeleton')?.addEventListener('click', () => {
        if (!idleSkeleton) return;
        idleSkeleton.visible = !idleSkeleton.visible;
        renderSceneHierarchyList();
    });
    document.getElementById('editor-face-reset')?.addEventListener('click', resetFaceMorphTargets);
    document.getElementById('editor-lipsync-preview')?.addEventListener('click', startLipSyncPreview);
    document.querySelectorAll('[data-face-expression]').forEach((button) => {
        button.addEventListener('click', () => {
            applyEmotion(button.dataset.faceExpression, 1, [], 360);
        });
    });
    document.getElementById('expression-search')?.addEventListener('input', renderExpressionLab);
    document.getElementById('expression-category')?.addEventListener('change', renderExpressionLab);
    document.getElementById('expression-test-list')?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-expression-recipe]');
        if (!button) return;
        playExpressionFromLab(button.dataset.expressionRecipe);
    });
    document.getElementById('expression-play')?.addEventListener('click', () => playExpressionFromLab());
    document.getElementById('expression-stop')?.addEventListener('click', () => facialEngine?.stop());
    document.getElementById('expression-random')?.addEventListener('click', () => {
        const catalog = (window.CORTANA_EXPRESSION_CATALOG || []).filter((recipe) => !recipe.micro);
        if (!catalog.length) return;
        playExpressionFromLab(catalog[Math.floor(Math.random() * catalog.length)].id);
    });
    document.getElementById('expression-auto')?.addEventListener('change', (event) => {
        facialEngine?.setAutoEnabled(event.target.checked);
    });
    document.getElementById('expression-loop')?.addEventListener('change', (event) => {
        facialEngine?.setLoop(event.target.checked);
    });
    document.getElementById('expression-intensity')?.addEventListener('input', (event) => {
        const output = document.getElementById('expression-intensity-value');
        if (output) output.textContent = `${event.target.value}%`;
    });
    document.getElementById('expression-duration')?.addEventListener('input', (event) => {
        const output = document.getElementById('expression-duration-value');
        if (output) output.textContent = `${(Number(event.target.value) / 100).toFixed(1)} s`;
    });
    document.getElementById('editor-face-list')?.addEventListener('input', (event) => {
        const targetId = event.target?.dataset?.faceSlider;
        if (!targetId) return;
        const target = allFaceMorphTargets.find((item) => item.id === targetId);
        if (!target) return;
        setFaceMorphTargetValue(target, Number(event.target.value) / 100, true);
    });
    document.querySelectorAll('[data-add-object]').forEach((button) => {
        button.addEventListener('click', () => addWorldObject(button.dataset.addObject));
    });

    setStudioEditorMode('photo');
    setPhotoBoothTab('animations');

    document.getElementById('editor-name')?.addEventListener('change', (event) => {
        const worldObject = getWorldObject();
        if (!worldObject) return;
        const value = event.target.value.trim() || worldObject.name;
        if (value === worldObject.name) return;
        recordWorldEditorHistory();
        worldObject.name = value;
        const mesh = getWorldObjectMesh();
        if (mesh) mesh.name = value;
        refreshWorldEditor();
        markWorldDocumentDirty();
    });

    document.querySelectorAll('[data-transform]').forEach((input) => {
        input.addEventListener('change', () => {
            const worldObject = getWorldObject();
            const mesh = getWorldObjectMesh();
            if (!worldObject || !mesh) return;
            const transformName = input.dataset.transform;
            const axisIndex = { x: 0, y: 1, z: 2 }[input.dataset.axis];
            let value = Number(input.value);
            if (!Number.isFinite(value)) {
                syncWorldObjectInspector();
                return;
            }
            if (transformName === 'scale') value = Math.max(0.1, value);
            if (transformName === 'rotation') value = THREE.MathUtils.degToRad(value);
            if (Math.abs(worldObject.transform[transformName][axisIndex] - value) < 0.0001) return;
            recordWorldEditorHistory();
            worldObject.transform[transformName][axisIndex] = value;
            updateWorldObjectMesh(mesh, worldObject);
            rebuildWorldObjectCollisions();
            updateEditorSelectionHelper();
            syncWorldObjectInspector();
            markWorldDocumentDirty();
        });
    });

    const colorInput = document.getElementById('editor-color');
    colorInput?.addEventListener('input', () => {
        const worldObject = getWorldObject();
        const mesh = getWorldObjectMesh();
        if (!worldObject || !mesh) return;
        if (!editorColorChangePending) {
            recordWorldEditorHistory();
            editorColorChangePending = true;
        }
        worldObject.color = colorInput.value;
        mesh.material.color.set(colorInput.value);
        markWorldDocumentDirty();
    });
    colorInput?.addEventListener('change', () => {
        editorColorChangePending = false;
    });

    document.getElementById('editor-collision')?.addEventListener('change', (event) => {
        const worldObject = getWorldObject();
        if (!worldObject) return;
        recordWorldEditorHistory();
        worldObject.collision = event.target.checked;
        rebuildWorldObjectCollisions();
        markWorldDocumentDirty();
    });
    document.getElementById('editor-visible')?.addEventListener('change', (event) => {
        const worldObject = getWorldObject();
        const mesh = getWorldObjectMesh();
        if (!worldObject || !mesh) return;
        recordWorldEditorHistory();
        worldObject.visible = event.target.checked;
        mesh.visible = worldObject.visible;
        rebuildWorldObjectCollisions();
        updateEditorSelectionHelper();
        markWorldDocumentDirty();
    });

    ['editor-background', 'editor-ground-color', 'editor-tile-scale'].forEach((id) => {
        const input = document.getElementById(id);
        input?.addEventListener('input', () => {
            if (!editorEnvironmentChangePending) {
                recordWorldEditorHistory();
                editorEnvironmentChangePending = true;
            }
            if (id === 'editor-background') worldDocument.environment.background = input.value;
            if (id === 'editor-ground-color') worldDocument.environment.ground_color = input.value;
            if (id === 'editor-tile-scale') {
                worldDocument.environment.tile_scale = Number(input.value);
                document.getElementById('editor-tile-value').value = input.value;
            }
            applyWorldEnvironment();
            markWorldDocumentDirty();
        });
        input?.addEventListener('change', () => {
            editorEnvironmentChangePending = false;
        });
    });

    renderer.domElement.addEventListener('pointerdown', handleWorldEditorPointerDown);
    renderer.domElement.addEventListener('pointermove', handleWorldEditorPointerMove);
    renderer.domElement.addEventListener('pointerup', handleWorldEditorPointerUp);
    renderer.domElement.addEventListener('pointercancel', handleWorldEditorPointerUp);
    document.addEventListener('keydown', (event) => {
        if (!worldEditorActive || /input|select|textarea/i.test(event.target.tagName)) return;
        if (event.key === 'Delete' || event.key === 'Backspace') deleteSelectedWorldObject();
        if (event.key === 'Escape') selectWorldObject(null);
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (event.shiftKey) redoWorldEditorChange();
            else undoWorldEditorChange();
        }
    });
    updateWorldEditorCommands();
}

function addCloudLayer() {
    if (skyClouds) return;

    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 1024;
    cloudCanvas.height = 512;
    const context = cloudCanvas.getContext('2d');

    const skyGradient = context.createLinearGradient(0, 0, 0, cloudCanvas.height);
    skyGradient.addColorStop(0, '#2d6fae');
    skyGradient.addColorStop(0.38, '#5e9fd0');
    skyGradient.addColorStop(0.58, '#81b9de');
    skyGradient.addColorStop(1, '#2d6fae');
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, cloudCanvas.width, cloudCanvas.height);

    const cloudPuffs = [
        [170, 258, 74], [242, 234, 98], [336, 250, 82], [432, 216, 110],
        [624, 254, 96], [714, 232, 120], [816, 262, 84], [896, 228, 72]
    ];

    for (const [x, y, radius] of cloudPuffs) {
        const puff = context.createRadialGradient(x, y, radius * 0.12, x, y, radius);
        puff.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        puff.addColorStop(0.58, 'rgba(239, 248, 255, 0.62)');
        puff.addColorStop(1, 'rgba(245, 250, 255, 0)');
        context.fillStyle = puff;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }

    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
    cloudTexture.encoding = THREE.sRGBEncoding;
    cloudTexture.wrapS = THREE.RepeatWrapping;
    const cloudMaterial = new THREE.MeshBasicMaterial({
        map: cloudTexture,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false
    });
    skyClouds = new THREE.Mesh(new THREE.SphereGeometry(650, 48, 32), cloudMaterial);
    skyClouds.renderOrder = -2;
    if (sky) sky.visible = false;
    scene.add(skyClouds);
}

function spawnFallingBoxes() {
    const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x2a8af6, roughness: 0.5 });
    
    for (let i = 0; i < 10; i++) {
        const mesh = new THREE.Mesh(boxGeo, boxMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        
        const shape = new CANNON.Box(new CANNON.Vec3(0.75, 0.75, 0.75));
        const body = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3((Math.random() - 0.5) * 10, 20 + Math.random() * 30, (Math.random() - 0.5) * 10)
        });
        body.addShape(shape);
        world.addBody(body);
        
        physicsBodies.push({ mesh, body });
    }
}

function onResize() {
    const container = document.getElementById('canvas-container');
    const width = container?.clientWidth || window.innerWidth;
    const height = container?.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    updateResponsiveCameraFov();
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function updateResponsiveCameraFov() {
    if (!camera) return;
    const portraitBlend = THREE.MathUtils.clamp((0.9 - camera.aspect) / 0.5, 0, 1);
    camera.fov = THREE.MathUtils.lerp(WORLD_VIEW.cameraFov, WORLD_VIEW.portraitCameraFov, portraitBlend);
}

function initAudioAnalyser() {
    if (analyserReady) return;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioContext = new Ctx();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.62;
        const src = audioContext.createMediaElementSource(audioEl);
        src.connect(analyser);
        analyser.connect(audioContext.destination);
        analyserReady = true;
        console.log('[Audio] Analyser ready');
    } catch (e) {
        console.warn('[Audio] Analyser creation failed:', e);
    }
}

function getTalkingActionKeys() {
    return TALKING_ANIMATIONS
        .map(({ key }) => key)
        .filter((key) => actions[key]);
}

function playNextTalkingAnimation(fadeDuration = 0.25) {
    const available = getTalkingActionKeys();
    if (available.length === 0) {
        fadeToAction('idle', fadeDuration);
        return;
    }

    // Avoid replaying the same gesture when both clips are available. This makes
    // longer responses naturally alternate between Talking1 and Talking2.
    const choices = available.length > 1
        ? available.filter((key) => key !== lastTalkingActionKey)
        : available;
    const key = choices[Math.floor(Math.random() * choices.length)];
    lastTalkingActionKey = key;
    fadeToAction(key, fadeDuration);
}

function startSpeaking() {
    isSpeaking = true;
    expressionReturnAt = 0;
    updateFaceEditorStatus();
    // Temporarily disabled: playNextTalkingAnimation();
}

function stopSpeaking(fadeDuration = 0.5) {
    isSpeaking = false;
    clearFaceWeights(faceLayers.speech);
    expressionReturnAt = performance.now() + 1200;
    fadeToAction('idle', fadeDuration);
    updateFaceEditorStatus();
}

function stopWebAudioTts() {
    if (!ttsSource) return;
    ttsSource.onended = null;
    try {
        ttsSource.stop();
    } catch (_) {
        // The source may already have finished naturally.
    }
    ttsSource.disconnect();
    ttsSource = null;
}

async function playWebAudioTts(audioUrl) {
    if (!audioContext || !analyser) {
        throw new Error('Audio context is not ready');
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
    const encoded = await response.arrayBuffer();
    const buffer = await audioContext.decodeAudioData(encoded);

    stopWebAudioTts();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    source.onended = () => {
        if (ttsSource !== source) return;
        ttsSource = null;
        stopSpeaking();
    };
    ttsSource = source;
    webAudioPlaybackStartedAt = audioContext.currentTime;
    source.start(0);
    startSpeaking();
}

document.addEventListener('click', initAudioAnalyser, { once: true });
document.getElementById('chat-form').addEventListener('submit', initAudioAnalyser);

function convertToStandardMaterial(model) {
    model.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
            if (child.material) {
                const materials = (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean);
                for (let i = 0; i < materials.length; i++) {
                    let mat = materials[i];
                    if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) {
                        const stdMat = new THREE.MeshStandardMaterial({
                            color: mat.color,
                            map: mat.map,
                            normalMap: mat.normalMap,
                            side: THREE.DoubleSide,
                            roughness: 0.4,
                            metalness: 0.1,
                            skinning: true,
                            morphTargets: true
                        });
                        stdMat.name = mat.name;
                        stdMat.userData = mat.userData;
                        materials[i] = stdMat;
                    } else {
                        mat.skinning = true;
                        mat.morphTargets = true;
                    }
                }
                child.material = Array.isArray(child.material) ? materials : materials[0];
            }
        }
    });
}

function prepareMixamoCharacter(model) {
    model.traverse((child) => {
        if (child.isBone && child.name) {
            cc3Bones[child.name] = child;
        }
        if (!child.isMesh && !child.isSkinnedMesh) return;

        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
        const materials = (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean);
        for (const material of materials) {
            material.side = THREE.DoubleSide;
            if (material.map) material.map.encoding = THREE.sRGBEncoding;
            material.needsUpdate = true;
        }
    });
}

function loadIdleAnimation() {
    const overlay = Object.assign(document.createElement('div'), { id: 'loading-overlay' });
    Object.assign(overlay.style, {
        position: 'absolute', inset: '0',
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        zIndex: '100', fontSize: '16px', color: '#555',
        fontFamily: 'Inter, sans-serif', gap: '14px'
    });
    overlay.innerHTML = `
        <div id="loading-label">Loading character...</div>
        <div id="loading-bar-track" style="width:260px;height:4px;background:#eee;border-radius:2px;">
            <div id="loading-bar" style="height:100%;width:0%;background:#000;border-radius:2px;transition:width .2s;"></div>
        </div>`;
    document.body.appendChild(overlay);

    function setProgress(pct, text) {
        document.getElementById('loading-bar').style.width = String(pct) + '%';
        if (text) document.getElementById('loading-label').textContent = text;
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
        CC3_CHARACTER_PATH,
        (gltf) => {
            idleRig = gltf.scene;
            idleRig.name = 'CC3_Character_Master';
            cc3Model = idleRig;
            usesCC3Rig = true;
            prepareCC3Model(idleRig);
            scene.add(idleRig);
            if (!frameAnimationRig(idleRig)) {
                scene.remove(idleRig);
                overlay.innerHTML = '<div style="color:red;padding:20px;text-align:center;">Character model contains no usable skeleton.</div>';
                return;
            }

            // The character asset has a skinned mesh, so keep the debug skeleton
            // hidden during normal play.
            idleSkeleton = new THREE.SkeletonHelper(idleRig);
            idleSkeleton.material.linewidth = 2;
            idleSkeleton.visible = false;
            scene.add(idleSkeleton);

            animationRoot = idleRig;
            locoGroundRootY = animationRoot.position.y;
            mixer = new THREE.AnimationMixer(idleRig);
            mixer.addEventListener('loop', (event) => {
                if (!isSpeaking || event.action !== currentAction) return;
                if (!getTalkingActionKeys().some((key) => actions[key] === event.action)) return;
                // Temporarily disabled: playNextTalkingAnimation(0.18);
            });
            window.__idleRig = idleRig;
            window.__idleSkeleton = idleSkeleton;
            window.__cc3Scene = scene;
            window.__cc3Camera = camera;
            if (worldEditorActive) renderSceneHierarchyList();

            setProgress(82, 'Loading baked CC3 idle...');
            loadBakedCC3Idle(setProgress, overlay);
        },
        (xhr) => {
            if (xhr.total > 0) {
                setProgress(Math.round((xhr.loaded / xhr.total) * 80), 'Loading CC3 master model...');
            }
        },
        (err) => {
            console.error('[Character] Load error:', err);
            overlay.innerHTML = '<div style="color:red;padding:20px;text-align:center;">Character model failed to load.<br><small>' + String(err.message || err) + '</small></div>';
        }
    );
}

function remapBakedCC3Clip(sourceClip, runtimeName = 'CC3_Baked_Runtime') {
    const tracks = [];
    for (const sourceTrack of sourceClip.tracks) {
        const separator = sourceTrack.name.lastIndexOf('.');
        if (separator < 1) continue;

        const boneName = sourceTrack.name.slice(0, separator);
        const property = sourceTrack.name.slice(separator + 1);
        const targetBone = cc3Bones[boneName];
        // The master rig owns all bind transforms. The only translated bone we
        // retain is the CC3 hip, whose baked motion restores the source clip's
        // weight shift and vertical grounding without changing bone lengths.
        const isBakedHipTranslation = (
            boneName === 'CC_Base_Hip' && property === 'position'
        );
        if (!targetBone || (property !== 'quaternion' && !isBakedHipTranslation)) continue;

        const track = sourceTrack.clone();
        track.name = `${targetBone.uuid}.${property}`;
        tracks.push(track);
    }

    if (tracks.length === 0) return null;
    return new THREE.AnimationClip(runtimeName, sourceClip.duration, tracks);
}

function loadBakedCC3Idle(setProgress, overlay) {
    new THREE.GLTFLoader().load(
        CC3_BAKED_IDLE_PATH,
        (gltf) => {
            const sourceClip = gltf.animations.find((clip) => clip.name === 'CC3_Idle_Baked');
            const idleClip = sourceClip
                ? remapBakedCC3Clip(sourceClip, 'CC3_Idle_Baked_Runtime')
                : null;
            const idleAction = idleClip ? mixer.clipAction(idleClip) : buildProceduralIdle();
            if (!idleAction) {
                overlay.innerHTML = '<div style="color:red;padding:20px;text-align:center;">CC3 idle animation could not be bound to the character.</div>';
                return;
            }

            idleAction.setLoop(THREE.LoopRepeat, Infinity);
            actions.idle = idleAction;
            console.log(`[Anim] CC3 baked idle ready: ${idleClip?.tracks.length || 0} tracks`);
            setProgress(90, 'Loading speaking animations...');
            loadTalkingAnimations(new THREE.FBXLoader(), setProgress, overlay);
        },
        (xhr) => {
            if (xhr.total > 0) {
                setProgress(82 + Math.round((xhr.loaded / xhr.total) * 8), 'Loading baked CC3 idle...');
            }
        },
        (err) => {
            console.error('[Anim] Baked CC3 idle failed to load:', err);
            const idleAction = buildProceduralIdle();
            if (!idleAction) {
                overlay.innerHTML = '<div style="color:red;padding:20px;text-align:center;">CC3 idle animation failed to load.</div>';
                return;
            }
            idleAction.setLoop(THREE.LoopRepeat, Infinity);
            actions.idle = idleAction;
            loadTalkingAnimations(new THREE.FBXLoader(), setProgress, overlay);
        }
    );
}

function loadTalkingAnimations(loader, setProgress, overlay) {
    if (TALKING_ANIMATIONS.length === 0) {
        setProgress(100, 'Preparing CC3 scene...');
        onAllLoaded(overlay);
        return;
    }

    let completed = 0;

    const finish = () => {
        completed++;
        setProgress(90 + Math.round((completed / TALKING_ANIMATIONS.length) * 10),
            completed === TALKING_ANIMATIONS.length ? 'Preparing animations...' : 'Loading talking animations...');
        if (completed === TALKING_ANIMATIONS.length) onAllLoaded(overlay);
    };

    for (const { key, path } of TALKING_ANIMATIONS) {
        loader.load(
            path,
            (fbx) => {
                const clip = fbx.animations?.[0];
                if (!clip) {
                    console.warn(`[Anim] ${key} contains no animation clip`);
                    finish();
                    return;
                }

                const safeClip = usesCC3Rig
                    ? retargetMixamoToCC3(fbx, clip, key)
                    : retargetClipToAnimationRig(fbx, clip, key);
                if (!safeClip) {
                    console.warn(`[Anim] ${key} could not be retargeted`);
                    finish();
                    return;
                }
                const action = mixer.clipAction(safeClip);
                action.setLoop(THREE.LoopRepeat, Infinity);
                action.clampWhenFinished = false;
                actions[key] = action;
                console.log(`[Anim] ${key} ready: ${safeClip.tracks.length} safe rotation tracks`);
                finish();
            },
            undefined,
            (err) => {
                console.error(`[Anim] Failed to load ${key}:`, err);
                finish();
            }
        );
    }
}

function frameAnimationRig(rig) {
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    rig.scale.set(1, 1, 1);
    rig.updateMatrixWorld(true);

    // CC3's exported armature already owns the centimeter-to-meter scale on
    // its internal root. Scaling the scene root from skinned bounds applies it
    // a second time and turns the character into a giant.
    if (usesCC3Rig) {
        rig.position.set(0, GROUND_Y + GROUND_CLEARANCE, 0);
        rig.updateMatrixWorld(true);
        applyWorldCameraFraming(WORLD_VIEW.initialCharacterHeight);
        if (orbitControls) {
            orbitControls.target.copy(_camTarget);
            orbitControls.update();
        }
        return true;
    }

    const box = getGroundingBounds(rig);
    if (box.isEmpty()) return false;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetHeight = 1.75;
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    rig.scale.multiplyScalar(scale);
    rig.position.x -= center.x * scale;
    rig.position.z -= center.z * scale;
    rig.position.y = GROUND_Y + GROUND_CLEARANCE - box.min.y * scale;
    keepCharacterGrounded(true, rig);

    applyWorldCameraFraming(targetHeight);
    camera.updateProjectionMatrix();
    if (orbitControls) {
        orbitControls.target.copy(_camTarget);
        orbitControls.update();
    }
    return true;
}

function prepareCC3Model(model) {
    model.position.set(0, 0, 0);
    Object.keys(cc3Bones).forEach((name) => { delete cc3Bones[name]; });
    photoBoothEyeRestQuaternions.clear();
    expressionRigBoneRestQuaternions.clear();
    expressionRigBoneRestPositions.clear();
    faceChannels.clear();
    clearFaceWeights(faceCurrentWeights);
    clearFaceWeights(expressionTargetWeights);
    for (const layer of Object.values(faceLayers)) clearFaceWeights(layer);
    allFaceMorphTargets.length = 0;
    faceMorphTargetIds.clear();
    manualFaceInfluences.clear();
    model.traverse((child) => {
        if (child.isBone && child.name) cc3Bones[child.name] = child;
        if (child.isSkinnedMesh || child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
            if (child.material) {
                const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
                const materials = sourceMaterials.map((mat) => prepareRuntimeCC3Material(mat, child.name));
                child.material = Array.isArray(child.material) ? materials : materials[0];
            }
            if (child.morphTargetDictionary) buildMorphMap(child);
        }
    });

    model.traverse((child) => {
        if (!child.isSkinnedMesh || !child.skeleton) return;
        for (const bone of child.skeleton.bones) {
            if (bone.name && !cc3Bones[bone.name]) cc3Bones[bone.name] = bone;
        }
    });

    renderEditorFaceControls();
    updateExpressionRigConnectivity();
    ensureFacialEngine();
    renderExpressionLab();
}

function prepareRuntimeCC3Material(sourceMat, meshName) {
    const role = getMaterialRole(meshName, sourceMat?.name || '');
    const mat = role === 'skin' && THREE.MeshPhysicalMaterial
        ? createSkinPhysicalMaterial(sourceMat)
        : sourceMat;
    applyReadableMaterialFallback(mat, meshName, role);
    return mat;
}

function createSkinPhysicalMaterial(sourceMat) {
    const mat = new THREE.MeshPhysicalMaterial({
        name: sourceMat.name,
        color: sourceMat.color ? sourceMat.color.getHex() : 0xffffff,
        map: sourceMat.map || null,
        normalMap: sourceMat.normalMap || null,
        aoMap: sourceMat.aoMap || null,
        alphaMap: sourceMat.alphaMap || null,
        emissiveMap: sourceMat.emissiveMap || null,
        transparent: sourceMat.transparent,
        opacity: sourceMat.opacity ?? 1,
        alphaTest: sourceMat.alphaTest || 0,
        side: THREE.DoubleSide,
        skinning: true,
        morphTargets: true,
        metalness: 0,
        roughness: 0.66,
        envMapIntensity: 0.32
    });
    mat.userData = { ...(sourceMat.userData || {}) };
    if (sourceMat.normalScale) mat.normalScale.copy(sourceMat.normalScale).multiplyScalar(0.42);
    return mat;
}

function tuneTextureForCloseup(texture, colorTexture = false) {
    if (!texture) return;
    if (colorTexture) texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = Math.max(texture.anisotropy || 1, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
}

function applyReadableMaterialFallback(mat, meshName, role = getMaterialRole(meshName, mat.name || '')) {
    mat.userData.cc3Role = role;
    mat.userData.cc3SourceMaterial = true;
    tuneTextureForCloseup(mat.map, true);
    tuneTextureForCloseup(mat.emissiveMap, true);
    tuneTextureForCloseup(mat.normalMap);
    tuneTextureForCloseup(mat.roughnessMap);
    tuneTextureForCloseup(mat.metalnessMap);
    tuneTextureForCloseup(mat.aoMap);
    tuneCC3Material(mat, role);
}

function tuneCC3Material(mat, role) {
    mat.side = THREE.DoubleSide;
    mat.metalness = 0;
    mat.envMapIntensity = role === 'eye' ? 1.45 : 0.55;

    if (role === 'skin') {
        mat.color.setRGB(1.0, 0.965, 0.93);
        mat.roughness = 0.66;
        mat.envMapIntensity = 0.28;
        if (mat.normalScale) mat.normalScale.set(0.42, 0.42);
        if (mat.emissive) mat.emissive.setRGB(0.018, 0.010, 0.007);
        // Three.js r128 stores sheen as a Color uniform, not a scalar.
        if (mat.sheen?.isColor) mat.sheen.setRGB(0.18, 0.08, 0.055);
        if ('sheenRoughness' in mat) mat.sheenRoughness = 0.82;
        if ('specularIntensity' in mat) mat.specularIntensity = 0.26;
        if ('specularColor' in mat) mat.specularColor.setRGB(1.0, 0.78, 0.68);
    } else if (role === 'eye') {
        mat.roughness = 0.08;
    } else if (role === 'teeth') {
        mat.roughness = 0.24;
    } else if (role === 'tongue') {
        mat.roughness = 0.42;
    } else if (role === 'hair') {
        mat.roughness = 0.36;
        mat.alphaTest = Math.max(mat.alphaTest || 0, 0.08);
    }

    const transparentSurface = /tearline|occlusion|eyelash|transparency/i.test(mat.name || '');
    if (transparentSurface) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.alphaTest = Math.max(mat.alphaTest || 0, 0.02);
    }
    mat.needsUpdate = true;
}

function getMaterialRole(meshName, materialName) {
    const label = `${meshName} ${materialName}`.toLowerCase();
    if (label.includes('skin')) return 'skin';
    if (label.includes('hair') || label.includes('hairstyle')) return 'hair';
    if (label.includes('eye') || label.includes('tearline')) return 'eye';
    if (label.includes('teeth')) return 'teeth';
    if (label.includes('tongue')) return 'tongue';
    if (label.includes('bra') || label.includes('underwear')) return 'cloth';
    return 'default';
}

function applyShadeToMaterial(mat, preset) {
    if (mat.userData.cc3SourceMaterial) {
        mat.wireframe = false;
        return;
    }
    const role = mat.userData.cc3Role || 'default';
    const color = preset.materials[role] ?? preset.materials.default;
    const opacity = preset.roleOpacity?.[role] ?? preset.opacity ?? 1;

    if (mat.map && (currentShadeKey === 'natural' || currentShadeKey === 'material_preview')) {
        mat.color.setHex(0xffffff);
    } else {
        mat.color.setHex(color);
    }
    mat.opacity = opacity;
    mat.transparent = opacity < 0.99;
    mat.depthWrite = opacity >= 0.75;
    mat.wireframe = !!preset.wireframe;
    if (mat.emissive) mat.emissive.setHex(preset.emissive ?? 0x070707);
    mat.needsUpdate = true;
}

function setupShadeControls() {
    document.querySelectorAll('[data-shade]').forEach((button) => {
        button.addEventListener('click', () => applyShadePreset(button.dataset.shade));
    });
    updateShadeControls();
}

function applyShadePreset(key) {
    const preset = SHADE_PRESETS[key];
    if (!preset || !scene) return;

    currentShadeKey = key;
    scene.background = new THREE.Color(preset.background ?? 0xffffff);
    renderer.toneMappingExposure = preset.exposure;

    if (preset.useHDRI) {
        if (!pmremGenerator) {
            pmremGenerator = new THREE.PMREMGenerator(renderer);
            pmremGenerator.compileEquirectangularShader();
        }
        if (!hdriTexture) {
            new THREE.RGBELoader()
                .setDataType(THREE.UnsignedByteType)
                .load('img/royal_esplanade_1k.hdr', (texture) => {
                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                    scene.environment = envMap;
                    hdriTexture = envMap;
                    texture.dispose();
                });
        } else {
            scene.environment = hdriTexture;
        }
    } else {
        scene.environment = null;
    }

    if (hemiLight) {
        hemiLight.color.setHex(preset.hemi[0]);
        hemiLight.groundColor.setHex(preset.hemi[1]);
        hemiLight.intensity = preset.hemi[2];
    }
    if (keyLight) {
        keyLight.color.setHex(preset.key[0]);
        keyLight.intensity = preset.key[1];
    }
    if (fillLight) {
        fillLight.color.setHex(preset.fill[0]);
        fillLight.intensity = preset.fill[1];
    }
    if (floor?.material) {
        // This world keeps a solid ground surface even when the character preview changes shade.
        floor.material.opacity = 1;
        floor.material.transparent = false;
        floor.material.needsUpdate = true;
    }

    if (cc3Model) {
        cc3Model.traverse((child) => {
            if (!child.material) return;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => applyShadeToMaterial(mat, preset));
        });
    }
    if (worldDocument) applyWorldEnvironment();
    updateShadeControls();
    updateLightingControls();
}

function updateShadeControls() {
    document.querySelectorAll('[data-shade]').forEach((button) => {
        const isSelected = button.dataset.shade === currentShadeKey;
        button.classList.toggle('is-active', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
    });
    const status = document.getElementById('appearance-shade-status');
    if (status) {
        const label = currentShadeKey.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
        status.textContent = label;
    }
}

function frameModel(model) {
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    if (MODEL_UP_AXIS === 'z') {
        model.rotation.x = -Math.PI / 2;
    }
    model.scale.set(1, 1, 1);
    model.updateMatrixWorld(true);
    const box = getCharacterFramingBounds(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetHeight = 1.75;
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    model.scale.multiplyScalar(scale);
    model.position.x -= center.x * scale;
    model.position.z -= center.z * scale;
    model.position.y = GROUND_Y + GROUND_CLEARANCE - box.min.y * scale;
    keepCharacterGrounded(true, model);

    applyWorldCameraFraming(targetHeight);
    camera.updateProjectionMatrix();
    if (orbitControls) {
        orbitControls.target.copy(_camTarget);
        orbitControls.update();
    }
}

function getVisibleMeshBounds(model) {
    const box = new THREE.Box3();
    let hasMesh = false;
    model.traverse((child) => {
        if ((!child.isMesh && !child.isSkinnedMesh) || !child.visible) return;
        child.updateMatrixWorld(true);
        const childBox = new THREE.Box3().setFromObject(child);
        if (!Number.isFinite(childBox.min.x) || !Number.isFinite(childBox.max.x)) return;
        box.union(childBox);
        hasMesh = true;
    });
    return hasMesh ? box : new THREE.Box3().setFromObject(model);
}

function getGroundingBounds(model) {
    const meshBounds = getVisibleMeshBounds(model);
    if (!meshBounds.isEmpty()) return meshBounds;

    // Animation-only FBX files may contain bones without a mesh.  Fall back to
    // those bone positions so the preview still stands on the same floor.
    const boneBounds = new THREE.Box3();
    const position = new THREE.Vector3();
    model.traverse((child) => {
        if (!child.isBone) return;
        child.getWorldPosition(position);
        boneBounds.expandByPoint(position);
    });
    return boneBounds;
}

function keepCharacterGrounded(force = false, root = animationRoot) {
    if (!root || (!force && locoJumping)) return;

    root.updateMatrixWorld(true);
    const bounds = getGroundingBounds(root);
    if (bounds.isEmpty() || !Number.isFinite(bounds.min.y)) return;

    const offset = GROUND_Y + GROUND_CLEARANCE - bounds.min.y;
    if (force || Math.abs(offset) > 0.0001) {
        root.position.y += offset;
        root.updateMatrixWorld(true);
    }
}

function getCharacterFramingBounds(model) {
    const preferredNames = ['CC_Base_Body', 'Female_Angled'];
    for (const name of preferredNames) {
        const mesh = model.getObjectByName(name);
        if (!mesh || (!mesh.isMesh && !mesh.isSkinnedMesh)) continue;
        mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        if (Number.isFinite(size.y) && size.y > 0.001) return box;
    }
    return getVisibleMeshBounds(model);
}

function findAnimationRoot(model) {
    let root = null;
    let bestVolume = -1;
    model.traverse((child) => {
        if (!child.visible || !child.isSkinnedMesh || !child.skeleton?.bones?.length) return;
        child.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(child);
        const size = box.getSize(new THREE.Vector3());
        const volume = size.x * size.y * size.z;
        if (volume > bestVolume) {
            bestVolume = volume;
            root = child;
        }
    });
    return root;
}

function preferAnimationRootBones(root) {
    if (!root?.skeleton?.bones) return;
    for (const bone of root.skeleton.bones) {
        if (bone.name) cc3Bones[bone.name] = bone;
    }
}

function applyStaticIdlePose() {
    const adjustments = [
        ['CC_Base_L_Clavicle', 0, 0, -0.08],
        ['CC_Base_R_Clavicle', 0, 0, 0.08],
        ['CC_Base_L_Upperarm', 0, 0, -1.05],
        ['CC_Base_R_Upperarm', 0, 0, 1.05],
        ['CC_Base_L_Forearm', 0, 0, -0.2],
        ['CC_Base_R_Forearm', 0, 0, 0.2],
        ['CC_Base_L_Hand', 0, 0, -0.08],
        ['CC_Base_R_Hand', 0, 0, 0.08],
        ['CC_Base_Head', -0.04, 0, 0],
    ];

    for (const [name, x, y, z] of adjustments) {
        const bone = cc3Bones[name];
        if (!bone) continue;
        const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
        bone.quaternion.multiply(offset).normalize();
    }
    cc3Model?.updateMatrixWorld(true);
}

function loadAnimations(loader, setProgress, overlay) {
    let loaded = 0;
    for (const { key, path } of ANIMATIONS) {
        loader.load(path, (fbx) => {
            const clip = fbx.animations?.[0];
            if (clip) {
                const retargeted = retargetMixamoToCC3(fbx, clip, key);
                if (retargeted.tracks.length > 0) {
                    const action = mixer.clipAction(retargeted);
                    action.setLoop(THREE.LoopRepeat);
                    actions[key] = action;
                    console.log(`[Anim] ${key} ready: ${retargeted.tracks.length} tracks, ${retargeted.duration.toFixed(2)}s`);
                } else {
                    console.warn(`[Anim] ${key} retargeted to 0 tracks`);
                }
            }
            loaded++;
            setProgress(45 + (loaded / ANIMATIONS.length) * 50, `Loaded ${key}...`);
            if (loaded === ANIMATIONS.length) onAllLoaded(overlay);
        }, undefined, (err) => {
            console.error(`[Anim] Failed to load ${key}:`, err);
            loaded++;
            if (loaded === ANIMATIONS.length) onAllLoaded(overlay);
        });
    }
}

function normalizeMixamoBoneName(name) {
    if (name.startsWith('mixamorig:')) return name;
    if (name.startsWith('mixamorig')) return `mixamorig:${name.slice('mixamorig'.length)}`;
    return name.includes(':') ? name : `mixamorig:${name}`;
}

function resolveCC3BoneName(name) {
    if (cc3Bones[name]) return name;
    const aliases = CC3_BONE_ALIASES[name] || [];
    return aliases.find(alias => cc3Bones[alias]) || null;
}

function parseTrackName(trackName) {
    const dot = trackName.lastIndexOf('.');
    if (dot === -1) return { boneName: trackName, property: '' };
    return {
        boneName: trackName.slice(0, dot),
        property: trackName.slice(dot + 1)
    };
}

function findSourceBone(fbxBones, mixamoName) {
    const normalized = normalizeMixamoBoneName(mixamoName);
    const noColon = normalized.replace(':', '');
    const local = normalized.replace('mixamorig:', '');
    return fbxBones[normalized] || fbxBones[noColon] || fbxBones[local] || null;
}

function retargetMixamoToCC3(fbx, sourceClip, clipName) {
    const fbxBones = {};
    fbx.traverse((child) => {
        if (child.isBone && child.name) fbxBones[child.name] = child;
    });

    const tracks = [];
    let matched = 0;
    let moving = 0;
    let maxMotion = 0;

    for (const sourceTrack of sourceClip.tracks) {
        const parsed = parseTrackName(sourceTrack.name);
        const sourceName = normalizeMixamoBoneName(parsed.boneName);
        const cc3Name = resolveCC3BoneName(MIXAMO_TO_CC3[sourceName] || '');
        if (!cc3Name) continue;

        const targetBone = cc3Bones[cc3Name];
        if (!targetBone) continue;

        if (parsed.property === 'quaternion') {
            const values = makeRetargetedQuaternionValues(sourceTrack.values, targetBone.quaternion);
            const motion = trackMotionAmount(values, 4);
            maxMotion = Math.max(maxMotion, motion);
            matched++;
            if (motion > 0.0001) moving++;
            tracks.push(new THREE.QuaternionKeyframeTrack(
                `${targetBone.uuid}.quaternion`,
                ensureTrackStartsAtZero(sourceTrack),
                ensureValuesStartAtFirst(sourceTrack, 4, values)
            ));
        }

        if (parsed.property === 'position' && sourceName === 'mixamorig:Hips') {
            const sourceHip = findSourceBone(fbxBones, sourceName);
            const scale = estimateHipMotionScale(sourceHip, targetBone);
            const values = makeHipPositionValues(sourceTrack.values, targetBone.position, scale);
            tracks.push(new THREE.VectorKeyframeTrack(
                `${targetBone.uuid}.position`,
                ensureTrackStartsAtZero(sourceTrack),
                ensureValuesStartAtFirst(sourceTrack, 3, values)
            ));
        }
    }

    const clip = new THREE.AnimationClip(`${clipName}_cc3_retargeted`, sourceClip.duration, tracks);
    clip.userData = {
        source: sourceClip.name,
        matchedQuaternionTracks: matched,
        movingQuaternionTracks: moving,
        maxQuaternionMotion: Number(maxMotion.toFixed(6))
    };
    console.log(`[Retarget] ${clipName}: ${moving}/${matched} moving quaternion tracks, maxMotion=${maxMotion.toFixed(4)}`);
    return clip;
}

function makeRetargetedQuaternionValues(sourceValues, targetRestQuaternion) {
    const out = new Float32Array(sourceValues.length);
    const sourceRest = new THREE.Quaternion().fromArray(sourceValues, 0).normalize();
    const sourceRestInv = sourceRest.clone().invert();
    const source = new THREE.Quaternion();
    const delta = new THREE.Quaternion();
    const result = new THREE.Quaternion();

    for (let i = 0; i < sourceValues.length; i += 4) {
        source.fromArray(sourceValues, i).normalize();
        delta.multiplyQuaternions(source, sourceRestInv);
        result.multiplyQuaternions(delta, targetRestQuaternion).normalize();
        result.toArray(out, i);
    }

    return out;
}

function estimateHipMotionScale(sourceHip, targetHip) {
    if (!sourceHip || !targetHip || Math.abs(sourceHip.position.y) < 0.0001) return 1;
    return Math.min(2, Math.max(0.2, Math.abs(targetHip.position.y / sourceHip.position.y)));
}

function makeHipPositionValues(sourceValues, targetRestPosition, scale) {
    const out = new Float32Array(sourceValues.length);
    const refX = sourceValues[0];
    const refY = sourceValues[1];
    const refZ = sourceValues[2];
    for (let i = 0; i < sourceValues.length; i += 3) {
        out[i] = targetRestPosition.x + (sourceValues[i] - refX) * scale;
        out[i + 1] = targetRestPosition.y + (sourceValues[i + 1] - refY) * scale;
        out[i + 2] = targetRestPosition.z + (sourceValues[i + 2] - refZ) * scale;
    }
    return out;
}

function ensureTrackStartsAtZero(track) {
    if (track.times.length === 0 || track.times[0] === 0) return track.times;
    const times = new Float32Array(track.times.length + 1);
    times[0] = 0;
    times.set(track.times, 1);
    return times;
}

function ensureValuesStartAtFirst(track, stride, values) {
    if (track.times.length === 0 || track.times[0] === 0) return values;
    const out = new Float32Array(values.length + stride);
    for (let i = 0; i < stride; i++) out[i] = values[i];
    out.set(values, stride);
    return out;
}

function trackMotionAmount(values, stride) {
    if (values.length <= stride) return 0;
    let max = 0;
    for (let i = stride; i < values.length; i += stride) {
        let diff = 0;
        for (let j = 0; j < stride; j++) diff += Math.abs(values[i + j] - values[j]);
        max = Math.max(max, diff);
    }
    return max;
}

function onAllLoaded(overlay) {
    document.getElementById('loading-label').textContent = 'Ready!';
    document.getElementById('loading-bar').style.width = '100%';
    setTimeout(() => overlay.remove(), 400);

    if (actions.idle) {
        actions.idle.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        currentAction = actions.idle;
        console.log('[Anim] Idle animation playing');
    }

    // Load locomotion pack on top of the already-running mixer
    loadLocomotionAnimations();

    exposeDebugHooks();
    setCameraMode('chat', true);
    animate();
}

function buildProceduralIdle() {
    const tracks = [];
    const duration = 4;
    const frames = 120;

    function makeSwayTrack(boneName, axis, amplitude, phaseOffset = 0) {
        const bone = cc3Bones[boneName];
        if (!bone) return null;
        const times = [];
        const values = [];
        const rest = bone.quaternion.clone();
        const q = new THREE.Quaternion();
        const delta = new THREE.Quaternion();
        for (let f = 0; f <= frames; f++) {
            const t = (f / frames) * duration;
            times.push(t);
            const angle = Math.sin((t / duration) * Math.PI * 2 + phaseOffset) * amplitude;
            if (axis === 'x') delta.setFromEuler(new THREE.Euler(angle, 0, 0));
            if (axis === 'y') delta.setFromEuler(new THREE.Euler(0, angle, 0));
            if (axis === 'z') delta.setFromEuler(new THREE.Euler(0, 0, angle));
            q.multiplyQuaternions(delta, rest).normalize();
            values.push(q.x, q.y, q.z, q.w);
        }
        return new THREE.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values);
    }

    [
        makeSwayTrack('CC_Base_Pelvis', 'x', 0.012, 0),
        makeSwayTrack(resolveCC3BoneName('CC_Base_Waist'), 'x', 0.01, 0.2),
        makeSwayTrack(resolveCC3BoneName('CC_Base_NeckTwist01'), 'x', 0.016, 0.4),
        makeSwayTrack('CC_Base_Head', 'z', 0.008, 0.6),
        makeSwayTrack('CC_Base_L_Clavicle', 'z', 0.014, Math.PI),
        makeSwayTrack('CC_Base_R_Clavicle', 'z', 0.014, 0),
    ].forEach(track => { if (track) tracks.push(track); });

    if (tracks.length === 0) return null;
    const clip = new THREE.AnimationClip('procedural_cc3_idle', duration, tracks);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat);
    return action;
}

function fadeToAction(name, duration = 0.35) {
    const next = actions[name];
    if (!next || next === currentAction) return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
    if (currentAction) currentAction.fadeOut(duration);
    currentAction = next;
}

function collectMixamoBones(root) {
    const bones = {};
    root?.traverse((child) => {
        if (!child.isBone || !child.name) return;
        const key = normalizeMixamoBoneName(child.name);
        // Some character FBXs contain a second, identity-only skeleton for a
        // joints mesh. PropertyBinding resolves the first matching node, so the
        // retargeter must use that same primary bone rather than overwriting it.
        if (!bones[key]) bones[key] = child;
    });
    return bones;
}

function createBindPoseMap(bones) {
    const pose = {};

    for (const bone of bones) {
        if (!bone?.isBone || !bone.name) continue;
        const key = normalizeMixamoBoneName(bone.name);
        if (pose[key]) continue;
        pose[key] = {
            bone,
            key,
            parentKey: null,
            localPosition: bone.position.clone(),
            localQuaternion: bone.quaternion.clone().normalize(),
            worldQuaternion: null
        };
    }

    for (const entry of Object.values(pose)) {
        const parent = entry.bone.parent;
        if (!parent?.isBone || !parent.name) continue;
        const parentKey = normalizeMixamoBoneName(parent.name);
        if (parentKey !== entry.key && pose[parentKey]) entry.parentKey = parentKey;
    }

    const resolving = new Set();
    const resolveWorldQuaternion = (key) => {
        const entry = pose[key];
        if (!entry) return null;
        if (entry.worldQuaternion) return entry.worldQuaternion;
        if (resolving.has(key)) return entry.localQuaternion;

        resolving.add(key);
        const parentWorld = entry.parentKey ? resolveWorldQuaternion(entry.parentKey) : null;
        entry.worldQuaternion = parentWorld
            ? parentWorld.clone().multiply(entry.localQuaternion).normalize()
            : entry.localQuaternion.clone();
        resolving.delete(key);
        return entry.worldQuaternion;
    };

    for (const key of Object.keys(pose)) resolveWorldQuaternion(key);
    return pose;
}

function capturePrimaryAnimationBindPose(root) {
    let primarySkeleton = null;
    root?.traverse((child) => {
        if (primarySkeleton || !child.isSkinnedMesh || !child.skeleton?.bones?.length) return;
        primarySkeleton = child.skeleton;
    });
    if (!primarySkeleton) return null;
    return createBindPoseMap(primarySkeleton.bones);
}

function getRigMotionScale(sourceBindPose) {
    const segmentNames = [
        'mixamorig:LeftLeg', 'mixamorig:LeftFoot',
        'mixamorig:RightLeg', 'mixamorig:RightFoot'
    ];
    const ratios = [];
    const targetScale = Math.abs(animationRoot?.scale.y || 1);

    for (const name of segmentNames) {
        const sourceLength = sourceBindPose[name]?.localPosition.length() || 0;
        const targetLength = animationRigBindPose[name]?.localPosition.length() || 0;
        if (sourceLength > 0.0001 && targetLength > 0.0001) {
            ratios.push((targetLength * targetScale) / sourceLength);
        }
    }

    if (ratios.length === 0) return 1;
    ratios.sort((a, b) => a - b);
    const middle = Math.floor(ratios.length / 2);
    return ratios.length % 2
        ? ratios[middle]
        : (ratios[middle - 1] + ratios[middle]) * 0.5;
}

function getClipRootMotionSpeed(sourceClip, sourceBindPose) {
    const hipPositionTrack = sourceClip.tracks.find((track) => {
        const { boneName, property } = parseTrackName(track.name);
        return property === 'position' && normalizeMixamoBoneName(boneName) === 'mixamorig:Hips';
    });
    if (!hipPositionTrack || sourceClip.duration <= 0) return 0;

    const stride = hipPositionTrack.getValueSize();
    const lastIndex = hipPositionTrack.values.length - stride;
    const distance = Math.hypot(
        hipPositionTrack.values[lastIndex] - hipPositionTrack.values[0],
        hipPositionTrack.values[lastIndex + 2] - hipPositionTrack.values[2]
    );
    if (distance < 0.001) return 0;
    return (distance / sourceClip.duration) * getRigMotionScale(sourceBindPose);
}

function applyLocomotionSpeedCalibration() {
    const walkSpeed = locomotionClipSpeeds.loco_walk;
    const runSpeed = locomotionClipSpeeds.loco_run;
    if (Number.isFinite(walkSpeed) && walkSpeed > 0) LOCO_WALK_SPEED = walkSpeed;
    if (Number.isFinite(runSpeed) && runSpeed > LOCO_WALK_SPEED) LOCO_RUN_SPEED = runSpeed;
    LOCO_BACKWARD_SPEED = LOCO_WALK_SPEED * 0.78;
    console.log(
        `[Loco] Calibrated movement speeds: walk=${LOCO_WALK_SPEED.toFixed(2)}, ` +
        `run=${LOCO_RUN_SPEED.toFixed(2)}, backward=${LOCO_BACKWARD_SPEED.toFixed(2)}`
    );
}

function getDirectionalMovementSpeed(wantsRun) {
    const forwardKey = wantsRun ? 'loco_run' : 'loco_walk';
    const sideKey = locoSideInput >= 0
        ? (wantsRun ? 'loco_right_run' : 'loco_right_walk')
        : (wantsRun ? 'loco_left_run' : 'loco_left_walk');
    const forwardSpeed = locomotionClipSpeeds[forwardKey] || (wantsRun ? LOCO_RUN_SPEED : LOCO_WALK_SPEED);
    const sideSpeed = locomotionClipSpeeds[sideKey] || forwardSpeed;
    const inputTotal = Math.abs(locoForwardInput) + Math.abs(locoSideInput);
    const sideBlend = inputTotal > 0 ? Math.abs(locoSideInput) / inputTotal : 0;
    return THREE.MathUtils.lerp(forwardSpeed, sideSpeed, sideBlend);
}

function retargetClipToAnimationRig(sourceFbx, sourceClip, key) {
    if (!animationRoot || !animationRigBindPose || !sourceClip) return null;

    const sourceBones = collectMixamoBones(sourceFbx);
    const sourceBindPose = createBindPoseMap(Object.values(sourceBones));
    const nominalSpeed = getClipRootMotionSpeed(sourceClip, sourceBindPose);
    const sourceTracks = {};
    const sourceInterpolants = {};
    const tracks = [];

    for (const sourceTrack of sourceClip.tracks) {
        const { boneName, property } = parseTrackName(sourceTrack.name);
        if (property !== 'quaternion') continue;
        const canonicalName = normalizeMixamoBoneName(boneName);
        if (!sourceBindPose[canonicalName] || !animationRigBindPose[canonicalName]) continue;
        sourceTracks[canonicalName] = sourceTrack;
        sourceInterpolants[canonicalName] = sourceTrack.createInterpolant(new Float32Array(4));
    }

    const frameCache = new Map();
    const sampleFrame = (time) => {
        if (frameCache.has(time)) return frameCache.get(time);

        const sourceWorld = {};
        const targetWorld = {};
        const targetLocal = {};

        const sampleSourceLocal = (boneKey) => {
            const interpolant = sourceInterpolants[boneKey];
            if (!interpolant) return sourceBindPose[boneKey].localQuaternion.clone();
            const value = interpolant.evaluate(time);
            return new THREE.Quaternion(value[0], value[1], value[2], value[3]).normalize();
        };

        const resolveSourceWorld = (boneKey) => {
            if (sourceWorld[boneKey]) return sourceWorld[boneKey];
            const entry = sourceBindPose[boneKey];
            if (!entry) return null;
            const local = sampleSourceLocal(boneKey);
            const parentWorld = entry.parentKey ? resolveSourceWorld(entry.parentKey) : null;
            sourceWorld[boneKey] = parentWorld
                ? parentWorld.clone().multiply(local).normalize()
                : local;
            return sourceWorld[boneKey];
        };

        const resolveTargetWorld = (boneKey) => {
            if (targetWorld[boneKey]) return targetWorld[boneKey];
            const sourceEntry = sourceBindPose[boneKey];
            const targetEntry = animationRigBindPose[boneKey];
            if (!sourceEntry || !targetEntry) return null;

            const animatedSourceWorld = resolveSourceWorld(boneKey);
            const sourceBindInverse = sourceEntry.worldQuaternion.clone().invert();
            const worldDelta = animatedSourceWorld.clone().multiply(sourceBindInverse).normalize();
            targetWorld[boneKey] = worldDelta.multiply(targetEntry.worldQuaternion).normalize();
            return targetWorld[boneKey];
        };

        const resolveTargetLocal = (boneKey) => {
            if (targetLocal[boneKey]) return targetLocal[boneKey];
            const targetEntry = animationRigBindPose[boneKey];
            const world = resolveTargetWorld(boneKey);
            if (!targetEntry || !world) return null;

            const parentWorld = targetEntry.parentKey ? resolveTargetWorld(targetEntry.parentKey) : null;
            targetLocal[boneKey] = parentWorld
                ? parentWorld.clone().invert().multiply(world).normalize()
                : world.clone();
            return targetLocal[boneKey];
        };

        const frame = { resolveTargetLocal };
        frameCache.set(time, frame);
        return frame;
    };

    for (const [canonicalName, sourceTrack] of Object.entries(sourceTracks)) {
        const targetEntry = animationRigBindPose[canonicalName];
        const values = new Float32Array(sourceTrack.times.length * 4);
        let previous = null;

        for (let frameIndex = 0; frameIndex < sourceTrack.times.length; frameIndex++) {
            const time = sourceTrack.times[frameIndex];
            const quaternion = sampleFrame(time).resolveTargetLocal(canonicalName).clone();
            if (previous && previous.dot(quaternion) < 0) {
                quaternion.set(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w);
            }
            quaternion.toArray(values, frameIndex * 4);
            previous = quaternion;
        }

        tracks.push(new THREE.QuaternionKeyframeTrack(
            `${targetEntry.bone.uuid}.quaternion`,
            ensureTrackStartsAtZero(sourceTrack),
            ensureValuesStartAtFirst(sourceTrack, 4, values)
        ));
    }

    if (tracks.length === 0) return null;
    const clip = new THREE.AnimationClip(`${key}_grounded`, sourceClip.duration, tracks);
    clip.userData = {
        source: sourceClip.name,
        retargeted: true,
        retargetMode: 'bind-world',
        nominalSpeed: Number(nominalSpeed.toFixed(4)),
        tracks: tracks.length
    };
    return clip;
}

// ── Locomotion animation loader ────────────────────────────────
function loadLocomotionAnimations() {
    if (!mixer || !animationRoot) {
        console.warn('[Loco] Mixer or rig not ready, skipping locomotion load');
        return;
    }
    const loader = new THREE.GLTFLoader();
    let loaded = 0;
    const total = LOCOMOTION_ANIMATIONS.length;
    const finishLocomotionSetup = () => {
        console.log('[Loco] All locomotion animations loaded');
        applyLocomotionSpeedCalibration();
        // Keep the character's native idle pose until the player moves. The
        // locomotion clips are blended in only for actual movement.
        locoCurrentKey = 'idle';
        setupLocomotionInput();
        locoEnabled = true;
    };

    for (const { key, path, clip: clipName, nominalSpeed } of LOCOMOTION_ANIMATIONS) {
        loader.load(
            `${CC3_ANIMATION_BASE}${path}?v=cc3-foot-contact-v3`,
            (gltf) => {
                const sourceClip = gltf.animations.find((clip) => clip.name === clipName);
                if (!sourceClip) {
                    console.warn(`[Loco] No clip in ${key}`);
                } else {
                    const safeClip = remapBakedCC3Clip(sourceClip, `${key}_cc3_baked`);
                    if (!safeClip) {
                        console.warn(`[Loco] ${key} could not bind to the CC3 rig`);
                        loaded++;
                        if (loaded === total) finishLocomotionSetup();
                        return;
                    }
                    safeClip.userData = {
                        source: sourceClip.name,
                        retargeted: true,
                        retargetMode: 'offline-cc3-bake',
                        nominalSpeed
                    };
                    const action = mixer.clipAction(safeClip);
                    action.setLoop(key === 'loco_jump' ? THREE.LoopOnce : THREE.LoopRepeat);
                    action.clampWhenFinished = (key === 'loco_jump');
                    actions[key] = action;
                    if (nominalSpeed > 0) {
                        locomotionClipSpeeds[key] = nominalSpeed;
                    }
                    console.log(`[Loco] ${key} ready (${safeClip.tracks.length} baked CC3 rotation tracks, ${safeClip.duration.toFixed(2)}s)`);
                }
                loaded++;
                if (loaded === total) finishLocomotionSetup();
            },
            undefined,
            (err) => {
                console.error(`[Loco] Failed to load ${key}:`, err);
                loaded++;
                if (loaded === total) finishLocomotionSetup();
            }
        );
    }
}

// ── Keyboard input setup ───────────────────────────────────────
function setupLocomotionInput() {
    window.addEventListener('keydown', (e) => {
        const interactiveTarget = e.target?.closest?.(
            'input, textarea, select, button, summary, [contenteditable="true"], [role="slider"], [role="application"]'
        );
        if (interactiveTarget || worldEditorActive) return;

        const isMovementKey = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code);
        if (isMovementKey) {
            e.preventDefault();
            if (cameraControlMode === 'lock') return;
            setCameraControlMode('wasd');
        }

        switch (e.code) {
            case 'KeyW': case 'ArrowUp':    keys.w = true; break;
            case 'KeyS': case 'ArrowDown':  keys.s = true; break;
            case 'KeyA': case 'ArrowLeft':  keys.a = true; break;
            case 'KeyD': case 'ArrowRight': keys.d = true; break;
            case 'ShiftLeft': case 'ShiftRight': keys.shift = true; break;
            case 'Space':
                e.preventDefault();
                if (!locoJumping && locoEnabled) triggerJump();
                break;
            case 'KeyR':
                if (cameraMode === 'movement' && !e.repeat) startCameraTransition('movement', 0.55);
                break;
            case 'Escape':
                setCameraControlMode('orbit');
                transitionToCameraView(cameraViewMode, 0.45);
                break;
        }
    });
    window.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp':    keys.w = false; break;
            case 'KeyS': case 'ArrowDown':  keys.s = false; break;
            case 'KeyA': case 'ArrowLeft':  keys.a = false; break;
            case 'KeyD': case 'ArrowRight': keys.d = false; break;
            case 'ShiftLeft': case 'ShiftRight': keys.shift = false; break;
        }
    });
    window.addEventListener('blur', clearMovementInput);
}

function clearMovementInput() {
    keys.w = false;
    keys.a = false;
    keys.s = false;
    keys.d = false;
    keys.shift = false;
    keys.space = false;
}

function triggerJump() {
    if (!actions.loco_jump || !locoGrounded) return;
    setCameraMode('movement');
    locoGroundRootY = animationRoot.position.y;
    locoGrounded = false;
    locoJumping = true;
    locoVerticalVelocity = LOCO_JUMP_IMPULSE;
    const prev = currentAction;
    const jumpAction = actions.loco_jump;
    jumpAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.15).play();
    if (prev) prev.fadeOut(0.15);
    currentAction = jumpAction;
    locoCurrentKey = 'loco_jump';
    // When jump finishes, mixer fires 'finished' event — handled in updateLocomotion
}

function getCharacterFrame() {
    if (!animationRoot) return null;
    animationRoot.updateMatrixWorld(true);

    if (usesCC3Rig) {
        const minY = animationRoot.position.y;
        const size = new THREE.Vector3(0.65, WORLD_VIEW.initialCharacterHeight, 0.32);
        const center = new THREE.Vector3(animationRoot.position.x, minY + size.y * 0.5, animationRoot.position.z);
        const bounds = new THREE.Box3(
            new THREE.Vector3(center.x - size.x * 0.5, minY, center.z - size.z * 0.5),
            new THREE.Vector3(center.x + size.x * 0.5, minY + size.y, center.z + size.z * 0.5)
        );
        const forward = MODEL_FORWARD.clone().applyQuaternion(animationRoot.quaternion).setY(0).normalize();
        return { bounds, size, center, forward };
    }

    const bounds = getGroundingBounds(animationRoot);
    if (bounds.isEmpty()) return null;

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const forward = MODEL_FORWARD.clone().applyQuaternion(animationRoot.quaternion).setY(0).normalize();
    return { bounds, size, center, forward };
}

function getCameraPose(mode) {
    const frame = getCharacterFrame();
    if (!frame) return null;
    const height = Math.max(frame.size.y, WORLD_VIEW.initialCharacterHeight);
    const target = frame.center.clone();

    if (mode === 'chat') {
        return getCameraViewPose(cameraViewMode, frame);
    }

    target.y = frame.bounds.min.y + height * 0.52;
    const position = target.clone()
        .addScaledVector(frame.forward, -height * WORLD_VIEW.movementDistanceHeightRatio)
        .addScaledVector(_worldUp, height * 0.20);
    return { position, target, fov: WORLD_VIEW.cameraFov };
}

function getCameraViewSettings(view = cameraViewMode) {
    if (view === 'custom' && customCameraView) return customCameraView;
    if (CAMERA_VIEW_PRESETS[view]) return CAMERA_VIEW_PRESETS[view];
    return CAMERA_VIEW_PRESETS.portrait;
}

function getCameraViewPose(view = cameraViewMode, frame = getCharacterFrame()) {
    if (!frame) return null;
    const settings = getCameraViewSettings(view);
    const height = Math.max(frame.size.y, WORLD_VIEW.initialCharacterHeight);
    const target = frame.center.clone();
    target.y = frame.bounds.min.y + height * settings.targetHeight;

    const yaw = THREE.MathUtils.degToRad(settings.yaw);
    const pitch = THREE.MathUtils.degToRad(settings.pitch);
    const horizontalDistance = Math.cos(pitch) * height * settings.distance;
    const verticalDistance = Math.sin(pitch) * height * settings.distance;
    const direction = frame.forward.clone().applyAxisAngle(_worldUp, yaw).normalize();
    const position = target.clone()
        .addScaledVector(direction, horizontalDistance)
        .addScaledVector(_worldUp, verticalDistance);

    return { position, target, fov: settings.fov };
}

function captureCurrentCameraView() {
    if (!camera || !orbitControls) return null;
    const frame = getCharacterFrame();
    if (!frame) return null;
    camera.position.sub(_cameraMotionOffset);
    _cameraMotionOffset.set(0, 0, 0);

    const height = Math.max(frame.size.y, WORLD_VIEW.initialCharacterHeight);
    const offset = camera.position.clone().sub(orbitControls.target);
    const distance = Math.max(offset.length() / height, 0.01);
    const flatOffset = offset.clone().setY(0);
    const flatLength = flatOffset.length();
    const base = frame.forward.clone().setY(0).normalize();
    const yaw = flatLength > 0.001
        ? THREE.MathUtils.radToDeg(Math.atan2(
            base.x * flatOffset.z - base.z * flatOffset.x,
            base.x * flatOffset.x + base.z * flatOffset.z
        ))
        : 0;
    const pitch = THREE.MathUtils.radToDeg(Math.atan2(offset.y, Math.max(flatLength, 0.001)));
    const targetHeight = (orbitControls.target.y - frame.bounds.min.y) / height;

    return {
        yaw: Number(THREE.MathUtils.clamp(yaw, -180, 180).toFixed(2)),
        pitch: Number(THREE.MathUtils.clamp(pitch, -80, 80).toFixed(2)),
        distance: Number(distance.toFixed(3)),
        targetHeight: Number(THREE.MathUtils.clamp(targetHeight, 0.15, 0.95).toFixed(3)),
        fov: Number(THREE.MathUtils.clamp(camera.fov, 20, 85).toFixed(2))
    };
}

function transitionToCameraView(view = cameraViewMode, duration = 0.55) {
    if (!camera || !orbitControls || !animationRoot) return;
    cameraViewMode = view;
    cameraMode = 'chat';
    updateCameraControlUI();
    camera.position.sub(_cameraMotionOffset);
    _cameraMotionOffset.set(0, 0, 0);
    cameraRoll = 0;
    const pose = getCameraViewPose(view);
    if (!pose) return;
    cameraTransition = {
        elapsed: 0,
        duration,
        startPosition: camera.position.clone(),
        startTarget: orbitControls.target.clone(),
        startFov: camera.fov,
        endPosition: pose.position,
        endTarget: pose.target,
        endFov: pose.fov
    };
    orbitControls.enabled = cameraControlMode !== 'lock';
}

function setCameraMode(mode, instant = false) {
    const modeChanged = cameraMode !== mode;
    cameraMode = mode;
    const chatContainer = document.getElementById('chat-container');
    const chatInputElement = document.getElementById('chat-input');
    const zoomButton = document.getElementById('zoom-button');

    chatContainer?.classList.toggle('is-hidden', mode === 'movement');
    document.body.dataset.cameraMode = mode;

    if (mode === 'movement') {
        chatInputElement?.blur();
    } else {
        clearMovementInput();
        _locoVelocity.set(0, 0, 0);
        _locoTargetVelocity.set(0, 0, 0);
        locoSpeed = 0;
        locoGait = 'idle';
        locoDirection = 'idle';
        cameraLandingShake = 0;
        cameraRoll = 0;
    }

    if (zoomButton) {
        zoomButton.setAttribute('aria-pressed', String(mode === 'chat'));
        zoomButton.title = mode === 'movement' ? 'Return to chat view' : 'Chat view';
    }

    updateCameraControlUI();
    if (modeChanged || instant) startCameraTransition(mode, instant ? 0 : 0.8);
}

function startCameraTransition(mode, duration = 0.8) {
    if (!camera || !orbitControls || !animationRoot) return;
    camera.position.sub(_cameraMotionOffset);
    _cameraMotionOffset.set(0, 0, 0);
    cameraRoll = 0;
    const pose = getCameraPose(mode);
    if (!pose) return;
    if (mode === 'movement') cameraMovementBaseDistance = pose.position.distanceTo(pose.target);

    if (duration <= 0) {
        camera.position.copy(pose.position);
        orbitControls.target.copy(pose.target);
        camera.fov = pose.fov;
        camera.updateProjectionMatrix();
        orbitControls.enabled = cameraControlMode !== 'lock';
        orbitControls.update();
        cameraTransition = null;
        return;
    }

    cameraTransition = {
        elapsed: 0,
        duration,
        startPosition: camera.position.clone(),
        startTarget: orbitControls.target.clone(),
        startFov: camera.fov,
        endPosition: pose.position,
        endTarget: pose.target,
        endFov: pose.fov
    };
    orbitControls.enabled = false;
}

function dampValue(current, target, response, delta) {
    return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-response * delta));
}

function loadCustomCameraView() {
    try {
        const raw = localStorage.getItem(CAMERA_VIEW_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Number.isFinite(parsed?.yaw) || !Number.isFinite(parsed?.pitch) || !Number.isFinite(parsed?.distance) || !Number.isFinite(parsed?.fov)) {
            return null;
        }
        customCameraView = {
            yaw: Number(parsed.yaw),
            pitch: Number(parsed.pitch),
            distance: Number(parsed.distance),
            targetHeight: Number.isFinite(parsed.targetHeight) ? Number(parsed.targetHeight) : CAMERA_VIEW_PRESETS.portrait.targetHeight,
            fov: Number(parsed.fov)
        };
        return customCameraView;
    } catch (err) {
        console.warn('[Camera] Failed to load custom view:', err);
        return null;
    }
}

function saveCustomCameraView(view) {
    if (!view) return;
    customCameraView = view;
    try {
        localStorage.setItem(CAMERA_VIEW_STORAGE_KEY, JSON.stringify(view));
    } catch (err) {
        console.warn('[Camera] Failed to save custom view:', err);
    }
}

function setCameraControlMode(mode) {
    cameraControlMode = mode;
    const lockToggle = document.getElementById('cam-lock-toggle');
    if (lockToggle) lockToggle.checked = mode === 'lock';
    if (mode === 'wasd') {
        setCameraMode('movement');
        if (orbitControls) orbitControls.enabled = true;
    } else if (mode === 'lock') {
        cameraTransition = null;
        clearMovementInput();
        if (orbitControls) orbitControls.enabled = false;
    } else {
        if (cameraMode !== 'chat') setCameraMode('chat');
        if (orbitControls) orbitControls.enabled = true;
    }
    updateCameraControlUI();
}

function getSliderNumber(id, fallback) {
    const input = document.getElementById(id);
    const value = Number(input?.value);
    return Number.isFinite(value) ? value : fallback;
}

function readCameraSliders() {
    const base = getCameraViewSettings(cameraViewMode);
    return {
        yaw: getSliderNumber('camera-yaw-slider', base.yaw),
        pitch: getSliderNumber('camera-pitch-slider', base.pitch),
        distance: getSliderNumber('camera-distance-slider', base.distance),
        targetHeight: base.targetHeight,
        fov: getSliderNumber('camera-fov-slider', base.fov)
    };
}

function setCameraSliders(settings) {
    const bindings = [
        ['camera-yaw-slider', 'camera-yaw-value', settings.yaw, 0],
        ['camera-pitch-slider', 'camera-pitch-value', settings.pitch, 0],
        ['camera-distance-slider', 'camera-distance-value', settings.distance, 2],
        ['camera-fov-slider', 'camera-fov-value', settings.fov, 0]
    ];
    for (const [inputId, outputId, value, digits] of bindings) {
        const input = document.getElementById(inputId);
        const output = document.getElementById(outputId);
        if (input) input.value = String(value);
        if (output) output.textContent = Number(value).toFixed(digits);
    }
}

function applyCameraSliderView(duration = 0.12) {
    const view = readCameraSliders();
    saveCustomCameraView(view);
    transitionToCameraView('custom', duration);
}

function updateCameraControlUI() {
    document.querySelectorAll('[data-camera-view]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.cameraView === cameraViewMode);
    });
    document.querySelectorAll('[data-camera-control]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.cameraControl === cameraControlMode);
    });
    const current = getCameraViewSettings(cameraViewMode);
    setCameraSliders(current);
}

function setupCameraControls() {
    loadCustomCameraView();
    updateCameraControlUI();

    document.querySelectorAll('[data-camera-view]').forEach((button) => {
        button.addEventListener('click', () => {
            const view = button.dataset.cameraView;
            if (view === 'custom' && !customCameraView) saveCustomCameraView(captureCurrentCameraView() || CAMERA_VIEW_PRESETS.portrait);
            cameraViewMode = view;
            setCameraControlMode('orbit');
            transitionToCameraView(view, 0.55);
            updateCameraControlUI();
        });
    });

    document.querySelectorAll('[data-camera-control]').forEach((button) => {
        button.addEventListener('click', () => setCameraControlMode(button.dataset.cameraControl));
    });

    ['camera-yaw-slider', 'camera-pitch-slider', 'camera-distance-slider', 'camera-fov-slider'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', () => {
            cameraControlMode = 'orbit';
            applyCameraSliderView(0);
        });
    });

    document.getElementById('camera-apply-view')?.addEventListener('click', () => {
        applyCameraSliderView(0.35);
    });

    document.getElementById('camera-save-view')?.addEventListener('click', () => {
        const captured = captureCurrentCameraView();
        if (!captured) return;
        saveCustomCameraView(captured);
        cameraViewMode = 'custom';
        setCameraSliders(captured);
        updateCameraControlUI();
    });
}

function openStudioAt(mode, category = '') {
    const nextMode = mode === 'world' ? 'world' : 'photo';
    const nextCategory = category || studioCategoryByMode[nextMode];
    const sameDestination = worldEditorActive
        && studioEditorMode === nextMode
        && studioCategoryByMode[nextMode] === nextCategory;

    if (sameDestination) {
        closeWorldEditor();
        return;
    }

    studioEditorMode = nextMode;
    if (STUDIO_CATEGORIES[nextMode].includes(nextCategory)) {
        studioCategoryByMode[nextMode] = nextCategory;
    }

    if (!worldDocument) {
        console.warn('[Studio] World document is not ready yet.');
        setStudioLiveStatus('Loading…');
        return;
    }

    if (!worldEditorActive) {
        openWorldEditor();
    } else {
        setStudioEditorMode(nextMode);
        setStudioCategory(studioCategoryByMode[nextMode]);
    }
}

function setupStudioIsland() {
    const characterButton = document.getElementById('character-mode-button');
    const worldButton = document.getElementById('world-mode-button');
    const cameraButton = document.getElementById('camera-view-button');
    const settingsButton = document.getElementById('settings-button');

    characterButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        openStudioAt('photo');
    });
    worldButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        openStudioAt('world');
    });
    cameraButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        openStudioAt('world', 'camera');
    });
    settingsButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        openStudioAt('photo', 'ai');
    });

    const categoryButtons = [...document.querySelectorAll('[data-studio-category]')];
    categoryButtons.forEach((button) => {
        button.addEventListener('click', () => setStudioCategory(button.dataset.studioCategory));
        button.addEventListener('keydown', (event) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            const visibleButtons = categoryButtons.filter((candidate) => candidate.offsetParent !== null);
            if (visibleButtons.length < 2) return;
            event.preventDefault();
            const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
            const index = visibleButtons.indexOf(button);
            const next = visibleButtons[(index + direction + visibleButtons.length) % visibleButtons.length];
            next.focus();
            next.click();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !worldEditorActive) return;
        if (/input|select|textarea/i.test(event.target?.tagName || '')) return;
        event.preventDefault();
        closeWorldEditor();
    });

    updateStudioRootButtons();
}

function isCharacterPartMesh(child, part) {
    if (!child?.isMesh) return false;
    const materialNames = (Array.isArray(child.material) ? child.material : [child.material])
        .filter(Boolean)
        .map((material) => material.name || '')
        .join(' ');
    const label = `${child.name || ''} ${materialNames}`.toLowerCase();
    if (part === 'hair') return /hair|female_angled/.test(label);
    if (part === 'outfit') return /bra|underwear/.test(label);
    return false;
}

function setCharacterPartVisibility(part, visible) {
    if (!cc3Model) return;
    cc3Model.traverse((child) => {
        if (isCharacterPartMesh(child, part)) child.visible = visible;
    });
}

function applyCharacterPartTint(part, value) {
    if (!cc3Model || !value) return;
    cc3Model.traverse((child) => {
        if (!isCharacterPartMesh(child, part) || !child.material) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
            if (!material?.color) return;
            material.color.set(value);
            material.needsUpdate = true;
        });
    });
}

function setHairSheen(value) {
    if (!cc3Model) return;
    const normalized = THREE.MathUtils.clamp(Number(value) / 100, 0, 1);
    cc3Model.traverse((child) => {
        if (!isCharacterPartMesh(child, 'hair') || !child.material) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
            if (!('roughness' in material)) return;
            material.roughness = THREE.MathUtils.lerp(0.78, 0.18, normalized);
            material.needsUpdate = true;
        });
    });
}

function setupCharacterPresentationControls() {
    const outfitToggle = document.getElementById('outfit-visible-toggle');
    const hairToggle = document.getElementById('hair-visible-toggle');
    const outfitTint = document.getElementById('outfit-tint-input');
    const hairTint = document.getElementById('hair-tint-input');
    const hairSheen = document.getElementById('hair-sheen-slider');
    const hairSheenValue = document.getElementById('hair-sheen-value');
    const sensitivity = document.getElementById('head-sensitivity-slider');
    const sensitivityValue = document.getElementById('head-sensitivity-value');

    outfitToggle?.addEventListener('change', () => {
        setCharacterPartVisibility('outfit', outfitToggle.checked);
        setStudioLiveStatus('Ready', outfitToggle.checked ? 'Outfit visible' : 'Outfit hidden');
    });
    hairToggle?.addEventListener('change', () => {
        setCharacterPartVisibility('hair', hairToggle.checked);
        setStudioLiveStatus('Ready', hairToggle.checked ? 'Hair visible' : 'Hair hidden');
    });
    outfitTint?.addEventListener('input', () => {
        applyCharacterPartTint('outfit', outfitTint.value);
        setStudioLiveStatus('Ready', 'Outfit tint');
    });
    hairTint?.addEventListener('input', () => {
        applyCharacterPartTint('hair', hairTint.value);
        setStudioLiveStatus('Ready', 'Hair tint');
    });
    hairSheen?.addEventListener('input', () => {
        if (hairSheenValue) hairSheenValue.textContent = `${hairSheen.value}%`;
        setHairSheen(hairSheen.value);
    });
    sensitivity?.addEventListener('input', () => {
        if (sensitivityValue) sensitivityValue.textContent = `${sensitivity.value}%`;
    });
}

function updateLightingControls() {
    const bindings = [
        ['light-key-slider', 'light-key-value', keyLight?.intensity],
        ['light-fill-slider', 'light-fill-value', fillLight?.intensity],
        ['light-ambient-slider', 'light-ambient-value', hemiLight?.intensity]
    ];
    bindings.forEach(([inputId, outputId, intensity]) => {
        if (!Number.isFinite(intensity)) return;
        const percent = Math.round(intensity * 100);
        const input = document.getElementById(inputId);
        const output = document.getElementById(outputId);
        if (input) input.value = String(percent);
        if (output) output.textContent = `${percent}%`;
    });
}

function setupLightingControls() {
    const bindings = [
        ['light-key-slider', 'light-key-value', () => keyLight],
        ['light-fill-slider', 'light-fill-value', () => fillLight],
        ['light-ambient-slider', 'light-ambient-value', () => hemiLight]
    ];
    bindings.forEach(([inputId, outputId, getLight]) => {
        const input = document.getElementById(inputId);
        const output = document.getElementById(outputId);
        input?.addEventListener('input', () => {
            const light = getLight();
            if (light) light.intensity = Number(input.value) / 100;
            if (output) output.textContent = `${input.value}%`;
            setStudioLiveStatus('Ready', 'Lighting preview');
        });
    });

    document.getElementById('light-tone-select')?.addEventListener('change', (event) => {
        const tone = {
            warm: 0xfff2e3,
            neutral: 0xffffff,
            cool: 0xe7f1ff
        }[event.target.value] || 0xffffff;
        keyLight?.color.setHex(tone);
        setStudioLiveStatus('Ready', 'Key tone updated');
    });
    updateLightingControls();
}

function setupWorldRuntimeControls() {
    const gravity = document.getElementById('world-gravity-slider');
    const gravityValue = document.getElementById('world-gravity-value');
    gravity?.addEventListener('input', () => {
        const magnitude = Number(gravity.value);
        if (world) world.gravity.set(0, -magnitude, 0);
        if (gravityValue) gravityValue.textContent = `${magnitude.toFixed(2)} m/s²`;
        setStudioLiveStatus('Ready', 'Gravity preview');
    });

    document.getElementById('renderer-quality-select')?.addEventListener('change', (event) => {
        if (!renderer) return;
        const deviceRatio = window.devicePixelRatio || 1;
        const ratio = {
            performance: Math.min(deviceRatio, 1),
            balanced: Math.min(deviceRatio, 1.5),
            quality: Math.min(deviceRatio, 2)
        }[event.target.value] || Math.min(deviceRatio, 1.5);
        renderer.setPixelRatio(ratio);
        onResize();
        setStudioLiveStatus('Ready', `${event.target.selectedOptions[0]?.textContent || 'Viewport'} mode`);
    });
}

function closeAxisOrbitMenu() {
    const menu = document.getElementById('axis-orbit-menu');
    const button = document.getElementById('axis-orbit-button');
    menu?.classList.add('hidden');
    button?.setAttribute('aria-expanded', 'false');
}

function toggleAxisOrbitMenu() {
    const menu = document.getElementById('axis-orbit-menu');
    const button = document.getElementById('axis-orbit-button');
    if (!menu || !button) return;
    const open = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !open);
    button.setAttribute('aria-expanded', String(open));
}

function snapCameraToAxisView(view) {
    if (!CAMERA_VIEW_PRESETS[view]) return;
    setCameraControlMode('orbit');
    transitionToCameraView(view, 0.3);
    closeAxisOrbitMenu();
    setStudioLiveStatus('Ready', `${view === 'hero' ? '3/4' : view[0].toUpperCase() + view.slice(1)} view`);
}

function restoreAxisOrbitStart() {
    if (!axisOrbitDragState || !camera || !orbitControls) return;
    camera.position.copy(axisOrbitDragState.startPosition);
    orbitControls.target.copy(axisOrbitDragState.startTarget);
    camera.fov = axisOrbitDragState.startFov;
    camera.updateProjectionMatrix();
    orbitControls.update();
}

function setupAxisOrbitControl() {
    const control = document.getElementById('axis-orbit-control');
    const button = document.getElementById('axis-orbit-button');
    if (!control || !button) return;
    button.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || !camera || !orbitControls) return;
        event.preventDefault();
        event.stopPropagation();
        cameraTransition = null;
        camera.position.sub(_cameraMotionOffset);
        _cameraMotionOffset.set(0, 0, 0);
        setCameraControlMode('orbit');
        axisOrbitDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startPosition: camera.position.clone(),
            startTarget: orbitControls.target.clone(),
            startFov: camera.fov,
            moved: false
        };
        button.setPointerCapture?.(event.pointerId);
        control.classList.add('is-dragging');
    });

    button.addEventListener('pointermove', (event) => {
        if (!axisOrbitDragState || event.pointerId !== axisOrbitDragState.pointerId) return;
        const dx = event.clientX - axisOrbitDragState.startX;
        const dy = event.clientY - axisOrbitDragState.startY;
        if (Math.hypot(dx, dy) > 4) axisOrbitDragState.moved = true;
        if (!axisOrbitDragState.moved) return;
        closeAxisOrbitMenu();

        const offset = axisOrbitDragState.startPosition.clone().sub(axisOrbitDragState.startTarget);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta -= dx * 0.008;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy * 0.008, 0.16, Math.PI - 0.16);
        offset.setFromSpherical(spherical);
        camera.position.copy(axisOrbitDragState.startTarget).add(offset);
        orbitControls.target.copy(axisOrbitDragState.startTarget);
        camera.lookAt(orbitControls.target);
        orbitControls.update();
        cameraViewMode = 'custom';
        setStudioLiveStatus('Orbiting', 'Free orbit');
    });

    const finishDrag = (event, cancelled = false) => {
        if (!axisOrbitDragState) return;
        if (event.pointerId !== undefined && event.pointerId !== axisOrbitDragState.pointerId) return;
        const pointerId = axisOrbitDragState.pointerId;
        const moved = axisOrbitDragState.moved;
        if (cancelled && moved) restoreAxisOrbitStart();
        button.releasePointerCapture?.(pointerId);
        control.classList.remove('is-dragging');
        axisOrbitDragState = null;
        axisOrbitSuppressClick = moved;
        if (moved && !cancelled) {
            const captured = captureCurrentCameraView();
            if (captured) saveCustomCameraView(captured);
        }
        setStudioLiveStatus('Ready', moved ? (cancelled ? 'Orbit cancelled' : 'Free view') : 'Axis views');
    };

    button.addEventListener('pointerup', (event) => finishDrag(event, false));
    button.addEventListener('pointercancel', (event) => finishDrag(event, true));
    window.addEventListener('pointerup', (event) => finishDrag(event, false));
    window.addEventListener('mouseup', () => finishDrag({}, false));
    window.addEventListener('blur', () => finishDrag({}, true));
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (axisOrbitSuppressClick) {
            axisOrbitSuppressClick = false;
            event.preventDefault();
            return;
        }
        toggleAxisOrbitMenu();
    });

    document.querySelectorAll('[data-axis-view]').forEach((axisButton) => {
        axisButton.addEventListener('click', (event) => {
            event.stopPropagation();
            snapCameraToAxisView(axisButton.dataset.axisView);
        });
    });

    document.addEventListener('click', (event) => {
        if (!control.contains(event.target)) closeAxisOrbitMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && axisOrbitDragState) {
            event.preventDefault();
            restoreAxisOrbitStart();
            control.classList.remove('is-dragging');
            axisOrbitDragState = null;
            axisOrbitSuppressClick = true;
            setStudioLiveStatus('Ready', 'Orbit cancelled');
            return;
        }
        if (/input|select|textarea/i.test(event.target?.tagName || '')) return;
        const view = {
            Numpad1: 'front',
            Numpad3: 'right',
            Numpad7: 'top'
        }[event.code];
        if (view) {
            event.preventDefault();
            snapCameraToAxisView(view);
        }
    });
}

function handleCameraWheelZoom(event) {
    if (!camera || !orbitControls) return;
    const interactiveTarget = event.target?.closest?.(
        '#world-editor, #settings-container, #chat-container, input, textarea, select, button, [contenteditable="true"]'
    );
    if (interactiveTarget) return;

    _cameraDistanceVector.copy(camera.position).sub(orbitControls.target);
    const currentDistance = _cameraDistanceVector.length();
    if (currentDistance <= 0.001) return;

    event.preventDefault();
    cameraTransition = null;
    if (cameraControlMode === 'lock') return;
    orbitControls.enabled = true;

    camera.position.sub(_cameraMotionOffset);
    _cameraMotionOffset.set(0, 0, 0);

    const characterHeight = Math.max(getCharacterFrame()?.size.y || 0, WORLD_VIEW.initialCharacterHeight);
    const minDistance = Math.max(1.15, characterHeight * CAMERA_SCROLL_ZOOM.minHeightRatio);
    const maxDistance = Math.max(minDistance + 1, characterHeight * CAMERA_SCROLL_ZOOM.maxHeightRatio);
    const zoomScale = 1 + event.deltaY * CAMERA_SCROLL_ZOOM.speed;
    const nextDistance = THREE.MathUtils.clamp(currentDistance * zoomScale, minDistance, maxDistance);

    camera.position.copy(orbitControls.target)
        .addScaledVector(_cameraDistanceVector.normalize(), nextDistance);
    orbitControls.update();

    if (cameraMode === 'movement') {
        cameraMovementBaseDistance = nextDistance;
    }
}

function getRunBlend() {
    return THREE.MathUtils.clamp(
        (locoSpeed - LOCO_WALK_SPEED) / (LOCO_RUN_SPEED - LOCO_WALK_SPEED),
        0,
        1
    );
}

function applyMovementCameraEffects(delta, runBlend) {
    if (!camera || !orbitControls || cameraMode !== 'movement') return;

    // Pull back slightly at running speed while preserving the player's orbit
    // direction and any walking-distance zoom adjustment.
    _cameraDistanceVector.copy(camera.position).sub(orbitControls.target);
    const currentDistance = _cameraDistanceVector.length();
    if (currentDistance > 0.001) {
        if (cameraMovementBaseDistance <= 0) cameraMovementBaseDistance = currentDistance;
        if (runBlend < 0.05) {
            cameraMovementBaseDistance = dampValue(cameraMovementBaseDistance, currentDistance, 5, delta);
        }
        const characterHeight = Math.max(getCharacterFrame()?.size.y || 0, WORLD_VIEW.initialCharacterHeight);
        const desiredDistance = cameraMovementBaseDistance + characterHeight * 0.18 * runBlend;
        const nextDistance = dampValue(currentDistance, desiredDistance, 5, delta);
        camera.position.copy(orbitControls.target)
            .addScaledVector(_cameraDistanceVector.normalize(), nextDistance);
    }

    // Distance-driven phase keeps the bob synchronized with actual movement,
    // not frame rate. Amplitudes stay intentionally subtle for comfort.
    const movingBlend = THREE.MathUtils.clamp(locoSpeed / LOCO_WALK_SPEED, 0, 1);
    const phaseRate = THREE.MathUtils.lerp(7.2, 11.0, runBlend);
    cameraBobPhase += delta * phaseRate * movingBlend;
    const bobAmplitude = locoGrounded
        ? THREE.MathUtils.lerp(0.025, 0.065, runBlend) * movingBlend
        : 0;
    const bobY = Math.sin(cameraBobPhase * 2) * bobAmplitude;
    const bobX = Math.sin(cameraBobPhase) * bobAmplitude * 0.32;

    cameraLandingShake = dampValue(cameraLandingShake, 0, 9, delta);
    cameraLandingPhase += delta * 28;
    const landingY = Math.sin(cameraLandingPhase) * cameraLandingShake;

    camera.updateMatrixWorld(true);
    _cameraViewRight.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    _cameraMotionOffset.copy(_worldUp).multiplyScalar(bobY + landingY)
        .addScaledVector(_cameraViewRight, bobX);
    camera.position.add(_cameraMotionOffset);

    const targetRoll = locoGrounded
        ? THREE.MathUtils.clamp(-locoSideInput * 0.018, -0.028, 0.028)
        : 0;
    cameraRoll = dampValue(cameraRoll, targetRoll, 7, delta);
    camera.rotateZ(cameraRoll);
}

function updateCameraDynamics(delta) {
    if (!camera || !orbitControls || !animationRoot) return;

    // Effects are added after OrbitControls. Remove the previous frame's
    // positional offset before calculating the new stable camera base.
    camera.position.sub(_cameraMotionOffset);
    _cameraMotionOffset.set(0, 0, 0);

    if (cameraTransition) {
        cameraTransition.elapsed += delta;
        const progress = THREE.MathUtils.clamp(cameraTransition.elapsed / cameraTransition.duration, 0, 1);
        const eased = progress * progress * (3 - 2 * progress);
        camera.position.lerpVectors(cameraTransition.startPosition, cameraTransition.endPosition, eased);
        orbitControls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.endTarget, eased);
        camera.fov = THREE.MathUtils.lerp(cameraTransition.startFov, cameraTransition.endFov, eased);
        camera.updateProjectionMatrix();
        orbitControls.update();

        if (progress >= 1) {
            cameraTransition = null;
            orbitControls.enabled = cameraControlMode !== 'lock';
        }
        return;
    }

    if (cameraControlMode === 'lock') {
        orbitControls.enabled = false;
        orbitControls.update();
        return;
    }

    let runBlend = 0;
    if (cameraMode === 'movement') {
        const frame = getCharacterFrame();
        if (frame) {
            _cameraDesiredTarget.copy(frame.center);
            _cameraDesiredTarget.y = frame.bounds.min.y + Math.max(frame.size.y, WORLD_VIEW.initialCharacterHeight) * 0.52;
            const followAlpha = 1 - Math.exp(-WORLD_VIEW.followResponsiveness * delta);
            _cameraFollowDelta.copy(_cameraDesiredTarget).sub(orbitControls.target).multiplyScalar(followAlpha);
            orbitControls.target.add(_cameraFollowDelta);

            // Translate the camera slightly less than the target while
            // accelerating to create controlled, subtle follow lag.
            const acceleration = Math.abs(locoSpeed - locoPreviousSpeed) / Math.max(delta, 0.001);
            const lagScale = THREE.MathUtils.lerp(0.90, 0.99, THREE.MathUtils.clamp(acceleration / 18, 0, 1));
            camera.position.addScaledVector(_cameraFollowDelta, lagScale);
        }

        runBlend = getRunBlend();
        const desiredFov = THREE.MathUtils.lerp(WORLD_VIEW.cameraFov, WORLD_VIEW.sprintFov, runBlend);
        camera.fov = dampValue(camera.fov, desiredFov, 7, delta);
        camera.updateProjectionMatrix();
    } else {
        camera.fov = dampValue(camera.fov, getCameraViewSettings(cameraViewMode).fov, 7, delta);
        camera.updateProjectionMatrix();
    }

    orbitControls.update();
    applyMovementCameraEffects(delta, runBlend);
}

// ── Per-frame locomotion update ────────────────────────────────
function updateLocomotion(delta) {
    if (!locoEnabled || !animationRoot) return;

    locoPreviousSpeed = locoSpeed;
    if (locoGrounded) locoGroundRootY = animationRoot.position.y;

    // Camera-relative forward/right axes (ignore Y)
    if (cameraTransition && cameraMode === 'movement') {
        _cameraForward.copy(MODEL_FORWARD).applyQuaternion(animationRoot.quaternion);
    } else {
        camera.getWorldDirection(_cameraForward);
    }
    _cameraForward.y = 0;
    _cameraForward.normalize();
    _cameraRight.crossVectors(_cameraForward, _worldUp).normalize();

    locoForwardInput = Number(keys.w) - Number(keys.s);
    locoSideInput = Number(keys.d) - Number(keys.a);
    _locoDir.set(0, 0, 0);
    _locoDir.addScaledVector(_cameraForward, locoForwardInput);
    _locoDir.addScaledVector(_cameraRight, locoSideInput);

    const hasInput = _locoDir.lengthSq() > 0.001;
    if (hasInput) _locoDir.normalize();

    // W/A/S/D is always the walk gait. Shift is the explicit run modifier.
    // Backpedalling stays at a controlled walk because there is no backwards
    // run clip in the supplied locomotion pack.
    const wantsRun = hasInput && keys.shift && locoForwardInput >= 0;
    const walkingBackward = hasInput && !wantsRun && locoForwardInput < -0.1;
    let targetSpeed = getDirectionalMovementSpeed(wantsRun);
    if (locoForwardInput < 0) targetSpeed = LOCO_BACKWARD_SPEED;
    if (!hasInput) {
        locoGait = 'idle';
        locoDirection = 'idle';
    } else {
        locoGait = wantsRun
            ? (locoSpeed < LOCO_RUN_SPEED * 0.72 ? 'jog' : 'sprint')
            : 'walk';
        const vertical = locoForwardInput > 0 ? 'forward' : (locoForwardInput < 0 ? 'backward' : '');
        const horizontal = locoSideInput > 0 ? 'right' : (locoSideInput < 0 ? 'left' : '');
        locoDirection = vertical && horizontal ? `${vertical}-${horizontal}` : (vertical || horizontal);
    }
    _locoTargetVelocity.copy(_locoDir).multiplyScalar(hasInput ? targetSpeed : 0);

    const response = locoGrounded
        ? (hasInput ? LOCO_ACCELERATION : LOCO_DECELERATION)
        : LOCO_AIR_CONTROL;
    const velocityAlpha = 1 - Math.exp(-response * delta);
    _locoVelocity.lerp(_locoTargetVelocity, velocityAlpha);
    if (!hasInput && _locoVelocity.lengthSq() < 0.0025) _locoVelocity.set(0, 0, 0);
    locoSpeed = _locoVelocity.length();

    // --- AABB Box Collision (fast, no raycasting) ---
    // Build character capsule as a box and resolve overlaps against prebuilt AABBs
    const CAPSULE_RADIUS = 0.3;
    const CAPSULE_HEIGHT_MIN = 0.05;
    const CAPSULE_HEIGHT_MAX = 1.5;

    // --- Move character ---
    animationRoot.position.addScaledVector(_locoVelocity, delta);

    // --- Resolve collision against prebuilt AABB boxes ---
    if (collisionBoxes.length > 0) {
        const pos = animationRoot.position;
        const charBox = new THREE.Box3(
            new THREE.Vector3(pos.x - CAPSULE_RADIUS, pos.y + CAPSULE_HEIGHT_MIN, pos.z - CAPSULE_RADIUS),
            new THREE.Vector3(pos.x + CAPSULE_RADIUS, pos.y + CAPSULE_HEIGHT_MAX, pos.z + CAPSULE_RADIUS)
        );

        for (let i = 0; i < collisionBoxes.length; i++) {
            const wallBox = collisionBoxes[i];
            if (!charBox.intersectsBox(wallBox)) continue;

            // Skip boxes that are purely floor-like (thin in Y, below character knee)
            const wallSizeY = wallBox.max.y - wallBox.min.y;
            if (wallSizeY < 0.15 && wallBox.max.y < pos.y + 0.3) continue;

            // Compute overlap on X and Z axes, push out along the smallest
            const overlapXmin = charBox.max.x - wallBox.min.x;
            const overlapXmax = wallBox.max.x - charBox.min.x;
            const overlapZmin = charBox.max.z - wallBox.min.z;
            const overlapZmax = wallBox.max.z - charBox.min.z;

            const pushX = overlapXmin < overlapXmax ? -overlapXmin : overlapXmax;
            const pushZ = overlapZmin < overlapZmax ? -overlapZmin : overlapZmax;

            if (Math.abs(pushX) < Math.abs(pushZ)) {
                pos.x += pushX;
                if (pushX > 0 && _locoVelocity.x < 0) _locoVelocity.x = 0;
                if (pushX < 0 && _locoVelocity.x > 0) _locoVelocity.x = 0;
            } else {
                pos.z += pushZ;
                if (pushZ > 0 && _locoVelocity.z < 0) _locoVelocity.z = 0;
                if (pushZ < 0 && _locoVelocity.z > 0) _locoVelocity.z = 0;
            }

            // Update charBox after push for next iteration
            charBox.min.set(pos.x - CAPSULE_RADIUS, pos.y + CAPSULE_HEIGHT_MIN, pos.z - CAPSULE_RADIUS);
            charBox.max.set(pos.x + CAPSULE_RADIUS, pos.y + CAPSULE_HEIGHT_MAX, pos.z + CAPSULE_RADIUS);
        }
    }

    // --- Floor Grounding ---
    if (floorMeshes.length > 0 && !locoJumping) {
        downRay.set(
            new THREE.Vector3(animationRoot.position.x, animationRoot.position.y + 2.0, animationRoot.position.z),
            downVector
        );
        downRay.far = 5;
        const floorHits = downRay.intersectObjects(floorMeshes, true);
        if (floorHits.length > 0) {
            const detectedFloorY = floorHits[0].point.y + GROUND_CLEARANCE;
            locoGroundRootY = detectedFloorY;
            animationRoot.position.y = detectedFloorY;
            locoGrounded = true;
        }
    }

    // --- Rotate character toward movement direction ---
    let turnDelta = 0;
    if (locoSpeed > 0.08) {
        const pureStrafe = Math.abs(locoSideInput) > 0.1 && Math.abs(locoForwardInput) < 0.1;
        const backpedalling = walkingBackward;
        _locoFacingDirection.copy(pureStrafe || backpedalling ? _cameraForward : _locoVelocity).setY(0).normalize();
        const targetAngle = Math.atan2(_locoFacingDirection.x, _locoFacingDirection.z);
        _locoEuler.setFromQuaternion(animationRoot.quaternion, 'YXZ');
        let currentAngle = _locoEuler.y;
        turnDelta = targetAngle - currentAngle;
        while (turnDelta >  Math.PI) turnDelta -= 2 * Math.PI;
        while (turnDelta < -Math.PI) turnDelta += 2 * Math.PI;
        const rotationAlpha = 1 - Math.exp(-LOCO_ROTATE_RESPONSE * delta);
        currentAngle += turnDelta * rotationAlpha;
        animationRoot.rotation.y = currentAngle;
    }

    // Subtle whole-body weight shift while accelerating and changing direction.
    _characterRight.set(1, 0, 0).applyQuaternion(animationRoot.quaternion);
    const lateralSpeed = _locoVelocity.dot(_characterRight);
    const acceleration = (locoSpeed - locoPreviousSpeed) / Math.max(delta, 0.001);
    const targetPitch = THREE.MathUtils.clamp(-acceleration * 0.004, -0.055, 0.055);
    const targetRoll = THREE.MathUtils.clamp(-lateralSpeed * 0.006, -0.05, 0.05);
    animationRoot.rotation.x = dampValue(animationRoot.rotation.x, targetPitch, 8, delta);
    animationRoot.rotation.z = dampValue(animationRoot.rotation.z, targetRoll, 8, delta);

    if (!locoGrounded) {
        locoVerticalVelocity -= LOCO_GRAVITY * delta;
        animationRoot.position.y += locoVerticalVelocity * delta;
        if (animationRoot.position.y <= locoGroundRootY && locoVerticalVelocity <= 0) {
            const landingSpeed = Math.abs(locoVerticalVelocity);
            cameraLandingShake = Math.max(
                cameraLandingShake,
                THREE.MathUtils.clamp((landingSpeed - 3) * 0.018, 0, 0.18)
            );
            cameraLandingPhase = 0;
            animationRoot.position.y = locoGroundRootY;
            locoVerticalVelocity = 0;
            locoGrounded = true;
            locoJumping = false;
            locoCurrentKey = '';
        }
    }

    // --- Pick animation ---
    let desiredKey;
    if (!locoGrounded) {
        desiredKey = 'loco_jump';
    } else if (locoSpeed < 0.15) {
        desiredKey = 'idle';
    } else if (Math.abs(turnDelta) > 1.15 && locoSpeed < 1.6) {
        desiredKey = turnDelta > 0 ? 'loco_left_turn' : 'loco_right_turn';
    } else {
        const useRunClip = wantsRun;
        // Backward diagonals use the matching strafe-walk clip in reverse;
        // straight S uses the forward walk clip in reverse.
        const sideDominant = (walkingBackward && Math.abs(locoSideInput) > 0.1)
            || Math.abs(locoSideInput) > Math.abs(locoForwardInput) * 1.15;
        if (!sideDominant) {
            desiredKey = useRunClip ? 'loco_run' : 'loco_walk';
        } else if (locoSideInput > 0) {
            desiredKey = useRunClip ? 'loco_right_run' : 'loco_right_walk';
        } else {
            desiredKey = useRunClip ? 'loco_left_run' : 'loco_left_walk';
        }
    }

    // Fallback if that key didn't load
    if (!actions[desiredKey]) desiredKey = locoSpeed > 0.15 ? (wantsRun ? 'loco_run' : 'loco_walk') : 'idle';
    if (!actions[desiredKey]) desiredKey = 'idle'; // ultimate fallback to original idle
    const reverseWalkPlayback = walkingBackward && desiredKey.endsWith('_walk');

    if (desiredKey !== locoCurrentKey) {
        const gaitTransition = desiredKey.includes('run') !== locoCurrentKey.includes('run');
        fadeToAction(desiredKey, desiredKey === 'idle' ? 0.32 : (gaitTransition ? 0.24 : 0.18));
        if (reverseWalkPlayback && currentAction) {
            currentAction.time = currentAction.getClip().duration;
        }
        locoCurrentKey = desiredKey;
    }

    if (currentAction && desiredKey !== 'idle' && desiredKey !== 'loco_jump') {
        const referenceSpeed = locomotionClipSpeeds[desiredKey]
            || (desiredKey.includes('run') ? LOCO_RUN_SPEED : LOCO_WALK_SPEED);
        const playbackScale = THREE.MathUtils.clamp(
            locoSpeed / referenceSpeed,
            reverseWalkPlayback ? 0.6 : 0.72,
            1.35
        );
        currentAction.setEffectiveTimeScale(reverseWalkPlayback ? -playbackScale : playbackScale);
    }
}

function buildMorphMap(mesh) {
    for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
        registerFaceMorphTarget(mesh, name, index);
    }
}

function clearFaceWeights(weights) {
    Object.keys(weights).forEach((name) => delete weights[name]);
}

function setFaceLayerWeight(layerName, morphName, value) {
    const layer = faceLayers[layerName];
    if (!layer || !morphName) return;
    const clamped = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
    if (clamped <= 0.0001) {
        delete layer[morphName];
    } else {
        layer[morphName] = clamped;
    }
}

function addExpressionWeight(target, name, value) {
    target[name] = Math.max(target[name] || 0, THREE.MathUtils.clamp(value, 0, 1));
}

function applyExpressionDirective(target, directive, intensity) {
    const name = String(directive || '').toLowerCase();
    if (name.includes('blink')) {
        blinkCooldown = 0;
        return;
    }
    if (name.includes('smile') || name.includes('happy')) {
        addExpressionWeight(target, 'A38_Mouth_Smile_Left', 0.72 * intensity);
        addExpressionWeight(target, 'A39_Mouth_Smile_Right', 0.72 * intensity);
        addExpressionWeight(target, 'A21_Cheek_Squint_Left', 0.24 * intensity);
        addExpressionWeight(target, 'A22_Cheek_Squint_Right', 0.24 * intensity);
    } else if (name.includes('sad') || name.includes('frown')) {
        addExpressionWeight(target, 'A01_Brow_Inner_Up', 0.52 * intensity);
        addExpressionWeight(target, 'A40_Mouth_Frown_Left', 0.48 * intensity);
        addExpressionWeight(target, 'A41_Mouth_Frown_Right', 0.48 * intensity);
    } else if (name.includes('serious') || name.includes('angry')) {
        addExpressionWeight(target, 'A02_Brow_Down_Left', 0.52 * intensity);
        addExpressionWeight(target, 'A03_Brow_Down_Right', 0.52 * intensity);
        addExpressionWeight(target, 'A48_Mouth_Press_Left', 0.20 * intensity);
        addExpressionWeight(target, 'A49_Mouth_Press_Right', 0.20 * intensity);
    } else if (name.includes('surprise')) {
        addExpressionWeight(target, 'A01_Brow_Inner_Up', 0.55 * intensity);
        addExpressionWeight(target, 'A18_Eye_Wide_Left', 0.45 * intensity);
        addExpressionWeight(target, 'A19_Eye_Wide_Right', 0.45 * intensity);
    }
}

function applyEmotion(emotion, intensity = 0.8, directives = [], transitionDurationMs = 500) {
    const engine = ensureFacialEngine();
    if (engine) {
        const primary = Array.isArray(directives)
            ? directives.find((directive) => directive?.expression && !engine.resolveRecipe(directive.expression)?.micro)
            : null;
        const primaryName = primary?.expression || emotion || 'calm';
        const primaryIntensity = primary?.intensity ?? intensity;
        const result = engine.play(primaryName, {
            intensity: primaryIntensity,
            duration: primary?.duration_ms ? primary.duration_ms / 1000 : 3.2,
            source: 'chat'
        });
        if (!result.ok) {
            engine.play(emotion || 'calm', {
                intensity,
                duration: 3.2,
                source: 'chat'
            });
        }
        for (const directive of Array.isArray(directives) ? directives : []) {
            const recipe = engine.resolveRecipe(directive?.expression);
            if (!recipe?.micro) continue;
            const playMicro = () => engine.play(recipe.id, {
                intensity: directive.intensity ?? 0.5,
                duration: directive.duration_ms ? directive.duration_ms / 1000 : recipe.duration,
                transient: true,
                source: 'chat'
            });
            if (directive.delay_ms > 0) {
                window.setTimeout(playMicro, Math.min(directive.delay_ms, 5000));
            } else {
                playMicro();
            }
        }
        currentEmotion = engine.resolveRecipe(primaryName)?.label || String(emotion || 'Calm');
        updateFaceEditorStatus();
        return;
    }

    const normalizedEmotion = EXPRESSION_PRESETS[emotion] ? emotion : 'Neutral';
    const normalizedIntensity = THREE.MathUtils.clamp(Number(intensity) || 0.8, 0, 1);
    clearFaceWeights(expressionTargetWeights);
    for (const [name, value] of Object.entries(EXPRESSION_PRESETS[normalizedEmotion])) {
        expressionTargetWeights[name] = value * normalizedIntensity;
    }
    for (const directive of Array.isArray(directives) ? directives : []) {
        const directiveIntensity = THREE.MathUtils.clamp(
            Number(directive?.intensity) || normalizedIntensity,
            0,
            1
        );
        applyExpressionDirective(expressionTargetWeights, directive?.expression, directiveIntensity);
    }
    expressionResponseSeconds = THREE.MathUtils.clamp(
        (Number(transitionDurationMs) || 500) / 3000,
        0.06,
        0.5
    );
    currentEmotion = normalizedEmotion;
    updateFaceEditorStatus();
}

function updateExpressionLayer(delta) {
    if (expressionReturnAt && performance.now() >= expressionReturnAt) {
        expressionReturnAt = 0;
        applyEmotion('Neutral', 1, [], 700);
    }
    const names = new Set([
        ...Object.keys(faceLayers.expression),
        ...Object.keys(expressionTargetWeights)
    ]);
    const alpha = 1 - Math.exp(-delta / expressionResponseSeconds);
    for (const name of names) {
        const current = faceLayers.expression[name] || 0;
        const target = expressionTargetWeights[name] || 0;
        const next = THREE.MathUtils.lerp(current, target, alpha);
        if (next <= 0.0005 && target === 0) {
            delete faceLayers.expression[name];
        } else {
            faceLayers.expression[name] = next;
        }
    }
}

function updateBlink(delta) {
    blinkCooldown -= delta;
    if (blinkCooldown <= 0 && !blinkIsClosing) {
        blinkIsClosing = true;
        blinkProgress = 0;
        blinkDuration = randomBetween(0.12, 0.17);
    }

    let amount = 0;
    if (blinkIsClosing) {
        blinkProgress += delta / blinkDuration;
        if (blinkProgress >= 1) {
            blinkProgress = 1;
            blinkIsClosing = false;
            blinkCooldown = randomBetween(isSpeaking ? 2.4 : 2.0, isSpeaking ? 5.8 : 5.0);
        }
        const phase = blinkProgress < 0.42
            ? blinkProgress / 0.42
            : (1 - blinkProgress) / 0.58;
        amount = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(phase, 0, 1), 0, 1);
    }

    setFaceLayerWeight('blink', 'A14_Eye_Blink_Left', amount);
    setFaceLayerWeight('blink', 'A15_Eye_Blink_Right', amount * 0.96);
}

function setLipSyncTimeline(timeline) {
    const cues = Array.isArray(timeline?.cues)
        ? timeline.cues
            .map((cue) => ({
                start: Math.max(0, Number(cue.start) || 0),
                end: Math.max(0, Number(cue.end) || 0),
                viseme: String(cue.viseme || ''),
                tongue: cue.tongue ? String(cue.tongue) : '',
                strength: THREE.MathUtils.clamp(Number(cue.strength) || 1, 0, 1)
            }))
            .filter((cue) => cue.end > cue.start && SPEECH_VISEMES.includes(cue.viseme))
        : [];
    lipSyncTimeline = {
        version: Number(timeline?.version) || 1,
        source: String(timeline?.source || (cues.length ? 'timed' : 'none')),
        duration: Math.max(Number(timeline?.duration) || 0, cues.at(-1)?.end || 0),
        cues
    };
    updateFaceEditorStatus();
}

function getLipSyncPlaybackTime() {
    if (lipSyncPreviewActive) {
        return performance.now() * 0.001 - lipSyncPreviewStartedAt;
    }
    if (ttsSource && audioContext) {
        return Math.max(0, audioContext.currentTime - webAudioPlaybackStartedAt);
    }
    return Math.max(0, Number(audioEl.currentTime) || 0);
}

function getSpeechAmplitude() {
    if (!analyserReady || !analyser) return 0.62;
    if (!audioFrequencyData || audioFrequencyData.length !== analyser.frequencyBinCount) {
        audioFrequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    analyser.getByteFrequencyData(audioFrequencyData);
    const sampleCount = Math.min(48, audioFrequencyData.length);
    let sum = 0;
    for (let index = 2; index < sampleCount; index++) sum += audioFrequencyData[index];
    return THREE.MathUtils.clamp(sum / Math.max(1, sampleCount - 2) / 150, 0, 1);
}

function updateLipSync() {
    clearFaceWeights(faceLayers.speech);
    if (!isSpeaking) return;

    const playbackTime = getLipSyncPlaybackTime();
    if (lipSyncPreviewActive && playbackTime > lipSyncTimeline.duration + 0.18) {
        lipSyncPreviewActive = false;
        stopSpeaking(0.2);
        updateFaceEditorStatus();
        return;
    }

    const amplitude = getSpeechAmplitude();
    const intensity = THREE.MathUtils.clamp(0.64 + amplitude * 0.52, 0.58, 1);
    let cueWeightTotal = 0;
    let jawWeight = 0;
    for (const cue of lipSyncTimeline.cues) {
        const attack = 0.055;
        const release = 0.085;
        if (playbackTime < cue.start - attack || playbackTime > cue.end + release) continue;

        let envelope = 1;
        if (playbackTime < cue.start) {
            envelope = THREE.MathUtils.smoothstep(playbackTime, cue.start - attack, cue.start);
        } else if (playbackTime > cue.end) {
            envelope = 1 - THREE.MathUtils.smoothstep(playbackTime, cue.end, cue.end + release);
        }
        const weight = envelope * cue.strength * intensity;
        faceLayers.speech[cue.viseme] = Math.max(faceLayers.speech[cue.viseme] || 0, weight);
        jawWeight = Math.max(
            jawWeight,
            weight * (SPEECH_JAW_OPEN[cue.viseme] || 0.34)
        );
        if (cue.tongue && SPEECH_TONGUE_SHAPES.includes(cue.tongue)) {
            faceLayers.speech[cue.tongue] = Math.max(
                faceLayers.speech[cue.tongue] || 0,
                weight * 0.56
            );
        }
        cueWeightTotal += weight;
    }

    if (lipSyncTimeline.cues.length === 0 && cueWeightTotal === 0) {
        setFaceLayerWeight('speech', 'V_Open', amplitude * 0.62);
        setFaceLayerWeight('speech', 'V_Lip_Open', amplitude * 0.30);
        jawWeight = amplitude * 0.72;
    }
    setFaceLayerWeight('speech', 'A25_Jaw_Open', jawWeight);
}

function getExpressionChannelWeight(name) {
    const value = faceLayers.expression[name] || 0;
    if (!isSpeaking) return value;
    if (/Jaw_Open|Mouth_Close|Mouth_Funnel|Mouth_Pucker/i.test(name)) return value * 0.12;
    if (/Mouth_(Smile|Frown|Dimple)|Cheek/i.test(name)) return value * 0.68;
    return value;
}

function getComposedFaceWeight(name) {
    const weights = [
        getExpressionChannelWeight(name),
        faceLayers.speech[name] || 0,
        faceLayers.blink[name] || 0,
        faceLayers.gaze[name] || 0
    ];
    let inverse = 1;
    for (const value of weights) inverse *= 1 - THREE.MathUtils.clamp(value, 0, 1);
    return 1 - inverse;
}

function updateMorphLerp(delta) {
    if (facialEngine) {
        facialEngine.update(delta);
    } else {
        updateExpressionLayer(delta);
    }
    for (const [name, targets] of faceChannels.entries()) {
        const targetWeight = getComposedFaceWeight(name);
        const currentWeight = faceCurrentWeights[name] || 0;
        let responseSeconds = 0.12;
        if (SPEECH_VISEMES.includes(name) || SPEECH_TONGUE_SHAPES.includes(name)) {
            responseSeconds = targetWeight > currentWeight ? 0.026 : 0.068;
        } else if (/A1[45]_Eye_Blink/i.test(name)) {
            responseSeconds = targetWeight > currentWeight ? 0.012 : 0.028;
        } else if (/Eye_Look|Eyeball_Look/i.test(name)) {
            responseSeconds = 0.055;
        }
        const alpha = 1 - Math.exp(-delta / responseSeconds);
        const nextWeight = THREE.MathUtils.lerp(currentWeight, targetWeight, alpha);
        faceCurrentWeights[name] = nextWeight;

        for (const target of targets) {
            if (manualFaceInfluences.has(target.id)) {
                target.mesh.morphTargetInfluences[target.index] = manualFaceInfluences.get(target.id);
            } else {
                target.mesh.morphTargetInfluences[target.index] = nextWeight;
            }
        }
    }
}

// ── Head-follow-cursor: resolve bone references ───────────────
function resolveHeadBones() {
    if (headBoneRef) return;  // already resolved

    // The idle rig uses raw Mixamo bone names
    if (animationRoot) {
        animationRoot.traverse((child) => {
            if (!child.isBone) return;
            if (/head/i.test(child.name) && !headBoneRef) headBoneRef = child;
            if (/neck/i.test(child.name) && !neckBoneRef) neckBoneRef = child;
        });
    }
    if (!headBoneRef && cc3Bones['CC_Base_Head']) headBoneRef = cc3Bones['CC_Base_Head'];
    if (!neckBoneRef) {
        neckBoneRef = cc3Bones['CC_Base_NeckTwist01'] || cc3Bones['CC_Base_NeckTwist02'] || null;
    }
}

// ── Head-follow-camera: per-frame update (called AFTER mixer) ─
const _headOffsetQ = new THREE.Quaternion();
const _neckOffsetQ = new THREE.Quaternion();
const _camDir = new THREE.Vector3();
const _headWorldPos = new THREE.Vector3();
const _parentWorldQuat = new THREE.Quaternion();
const _expressionHeadQ = new THREE.Quaternion();

function updateHeadTracking() {
    const isTrackingEnabled = document.getElementById('head-tracking-toggle')?.checked ?? true;
    const sensitivitySlider = document.getElementById('head-sensitivity-slider');
    clearFaceWeights(faceLayers.gaze);

    const sensitivityContainer = document.getElementById('head-sensitivity-container');
    if (sensitivityContainer) {
        sensitivityContainer.style.display = isTrackingEnabled ? 'block' : 'none';
    }

    resolveHeadBones();
    if (!headBoneRef || !camera || !isTrackingEnabled) return;

    const sensitivity = sensitivitySlider ? parseInt(sensitivitySlider.value, 10) : 50;
    const scale = sensitivity / 50;
    const movementBlend = cameraMode === 'movement' ? 0.28 : 1.0;
    const dynamicYawLimit = HEAD_YAW_LIMIT * scale * movementBlend;
    const dynamicPitchLimit = HEAD_PITCH_LIMIT * scale * movementBlend;

    headBoneRef.getWorldPosition(_headWorldPos);
    _camDir.copy(camera.position).sub(_headWorldPos).normalize();

    const parent = headBoneRef.parent;
    if (parent) {
        parent.getWorldQuaternion(_parentWorldQuat);
        _camDir.applyQuaternion(_parentWorldQuat.invert());
    }

    const rawYaw = Math.atan2(_camDir.x, _camDir.z);
    const rawPitch = -Math.atan2(_camDir.y, Math.sqrt(_camDir.x * _camDir.x + _camDir.z * _camDir.z));
    const clampedYaw = THREE.MathUtils.clamp(rawYaw, -dynamicYawLimit, dynamicYawLimit);
    const clampedPitch = THREE.MathUtils.clamp(rawPitch, -dynamicPitchLimit, dynamicPitchLimit);

    const blendStrength = Math.min(1.0, 0.95 * scale) * movementBlend;
    const headYaw = clampedYaw * (1 - NECK_RATIO) * blendStrength;
    const headPitch = clampedPitch * (1 - NECK_RATIO) * blendStrength;
    const neckYaw = clampedYaw * NECK_RATIO * blendStrength;
    const neckPitch = clampedPitch * NECK_RATIO * blendStrength;

    _headOffsetQ.setFromEuler(new THREE.Euler(headPitch, headYaw, 0, 'YXZ'));
    _neckOffsetQ.setFromEuler(new THREE.Euler(neckPitch, neckYaw, 0, 'YXZ'));
    const expressionPose = facialEngine?.getHeadPose?.() || { pitch: 0, yaw: 0, roll: 0 };
    _expressionHeadQ.setFromEuler(new THREE.Euler(
        expressionPose.pitch || 0,
        expressionPose.yaw || 0,
        expressionPose.roll || 0,
        'YXZ'
    ));
    _headOffsetQ.multiply(_expressionHeadQ);

    if (neckBoneRef) neckBoneRef.quaternion.multiply(_neckOffsetQ);
    headBoneRef.quaternion.multiply(_headOffsetQ);
    updateCameraEyeMorphs(clampedYaw / Math.max(dynamicYawLimit, 0.001), clampedPitch / Math.max(dynamicPitchLimit, 0.001), blendStrength);
}

function setFaceMorphByName(pattern, value) {
    for (const name of faceChannels.keys()) {
        if (!pattern.test(name)) continue;
        setFaceLayerWeight('gaze', name, value);
    }
}

function updateCameraEyeMorphs(normalizedYaw, normalizedPitch, strength) {
    const eyeAmount = THREE.MathUtils.clamp(Math.abs(strength) * 0.42, 0, 0.42);
    const left = THREE.MathUtils.clamp(normalizedYaw, 0, 1) * eyeAmount;
    const right = THREE.MathUtils.clamp(-normalizedYaw, 0, 1) * eyeAmount;
    const up = THREE.MathUtils.clamp(-normalizedPitch, 0, 1) * eyeAmount;
    const down = THREE.MathUtils.clamp(normalizedPitch, 0, 1) * eyeAmount;

    setFaceMorphByName(/Eye_Look_(Out_Left|In_Right)|Eyeball_Look_L/i, left);
    setFaceMorphByName(/Eye_Look_(In_Left|Out_Right)|Eyeball_Look_R/i, right);
    setFaceMorphByName(/Eye_Look_Up|Eyeball_Look_Up/i, up);
    setFaceMorphByName(/Eye_Look_Down|Eyeball_Look_Down/i, down);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (world) {
        world.step(1 / 60, Math.min(delta, 0.1), 3);
        for (const pb of physicsBodies) {
            pb.mesh.position.copy(pb.body.position);
            pb.mesh.quaternion.copy(pb.body.quaternion);
        }
    }

    if (mixer) mixer.update(delta);
    updateLocomotion(delta);       // WASD / Shift / Space movement & animation
    keepCharacterGrounded();       // resolve foot contact after the animated pose
    updateCameraDynamics(delta);   // movement follow or front-facing chat camera
    updateHeadTracking();          // apply AFTER mixer so it layers on top
    updatePhotoBoothEyeBones();    // visible eyeballs are driven by CC3 eye bones
    updateExpressionRigBones();    // jaw, teeth and tongue creator controls layer after animation
    updateLipSync();
    if (facialEngine) {
        clearFaceWeights(faceLayers.blink);
    } else {
        updateBlink(delta);
    }
    updateMorphLerp(delta);
    syncFaceEditorSliders();
    updateDebugState();
    renderer.render(scene, camera);
}

function exposeDebugHooks() {
    document.body.dataset.cc3DebugReady = '1';
    window.__cc3Debug = {
        getState: getDebugState,
        play(name) {
            fadeToAction(name, 0.15);
        },
        setExpression(name, intensity = 1) {
            applyEmotion(name, intensity, [], 260);
        },
        playExpression(name, options = {}) {
            return facialEngine?.play(name, options) || { ok: false, reason: 'engine-not-ready' };
        },
        stopExpression() {
            facialEngine?.stop();
        },
        getExpressionCatalog() {
            return (window.CORTANA_EXPRESSION_CATALOG || []).map((recipe) => ({
                id: recipe.id,
                label: recipe.label,
                category: recipe.category,
                duration: recipe.duration,
                micro: recipe.micro
            }));
        },
        setRigTestMode(enabled = true) {
            if (facialEngine) {
                facialEngine.setAutoEnabled(!enabled);
                if (enabled) facialEngine.stop({ keepBase: false });
            }
            if (enabled) {
                clearFaceWeights(expressionTargetWeights);
                clearFaceWeights(faceLayers.expression);
            }
            return { enabled: Boolean(enabled), channels: faceChannels.size };
        },
        setRigChannel(name, value) {
            const channel = String(name || '');
            const amount = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
            const targets = faceChannels.get(channel) || [];
            targets.forEach((target) => setFaceMorphTargetValue(target, amount, true));
            return { channel, value: amount, targets: targets.length };
        },
        getRigChannel(name) {
            const channel = String(name || '');
            const targets = faceChannels.get(channel) || [];
            return {
                channel,
                targets: targets.length,
                values: targets.map((target) =>
                    Number(target?.mesh?.morphTargetInfluences?.[target.index] || 0)
                )
            };
        },
        setRigControl(control, x = 0, y = 0) {
            const name = String(control || '');
            if (!expressionRigControlMap.has(name)) {
                return { ok: false, control: name };
            }
            setExpressionRigControl(name, Number(x) || 0, Number(y) || 0, false);
            return {
                ok: true,
                control: name,
                value: expressionRigValues.get(name)
            };
        },
        resetRigTest() {
            facialEngine?.setAutoEnabled(false);
            facialEngine?.stop({ keepBase: false });
            resetExpressionCreator();
            manualFaceInfluences.clear();
            clearFaceWeights(expressionTargetWeights);
            for (const layer of Object.values(faceLayers)) clearFaceWeights(layer);
            clearFaceWeights(faceCurrentWeights);
            allFaceMorphTargets.forEach((target) => setFaceMorphTargetValue(target, 0));
            return {
                channels: faceChannels.size,
                targets: allFaceMorphTargets.length,
                bones: EXPRESSION_RIG_BONES.filter((name) => Boolean(cc3Bones[name])).length
            };
        },
        previewLipSync() {
            startLipSyncPreview();
        },
        setMovementInput(input = {}) {
            keys.w = Boolean(input.w);
            keys.a = Boolean(input.a);
            keys.s = Boolean(input.s);
            keys.d = Boolean(input.d);
            keys.shift = Boolean(input.shift);
            keys.space = Boolean(input.space);
            if (keys.w || keys.a || keys.s || keys.d) {
                setCameraMode('movement');
            }
        }
    };
    updateDebugState(true);
}

function getDebugState() {
    const sampleNames = [
        'CC_Base_Hip', 'CC_Base_Pelvis', resolveCC3BoneName('CC_Base_Waist'),
        resolveCC3BoneName('CC_Base_NeckTwist01'), 'CC_Base_Head',
        'CC_Base_L_Upperarm', 'CC_Base_L_Forearm',
        'CC_Base_R_Upperarm', 'CC_Base_R_Forearm',
        'CC_Base_L_Eye', 'CC_Base_R_Eye'
    ].filter(Boolean);
    const bones = {};
    for (const name of sampleNames) {
        const bone = cc3Bones[name];
        if (!bone) continue;
        bones[name] = {
            position: bone.position.toArray().map(v => Number(v.toFixed(5))),
            quaternion: bone.quaternion.toArray().map(v => Number(v.toFixed(5)))
        };
    }

    const modelStats = cc3Model ? getModelDebugStats(cc3Model) : null;

    return {
        activeClip: currentAction?._clip?.name || null,
        activeTime: currentAction ? Number(currentAction.time.toFixed(4)) : null,
        activeRunning: currentAction ? currentAction.isRunning() : false,
        idleMode: 'animated-rig-preview',
        model: modelStats,
        camera: camera ? {
            position: camera.position.toArray().map(v => Number(v.toFixed(4))),
            target: orbitControls?.target.toArray().map(v => Number(v.toFixed(4))) || null,
            direction: camera.getWorldDirection(new THREE.Vector3()).toArray().map(v => Number(v.toFixed(4))),
            fov: camera.fov,
            near: camera.near,
            far: camera.far
        } : null,
        physics: world ? {
            enabled: true,
            gravity: [world.gravity.x, world.gravity.y, world.gravity.z],
            bodies: world.bodies.length
        } : { enabled: false },
        locomotion: {
            enabled: locoEnabled,
            cameraMode,
            gait: locoGait,
            direction: locoDirection,
            speed: Number(locoSpeed.toFixed(4)),
            configuredSpeeds: {
                walk: LOCO_WALK_SPEED,
                backward: LOCO_BACKWARD_SPEED,
                run: LOCO_RUN_SPEED,
                clips: { ...locomotionClipSpeeds }
            },
            velocity: _locoVelocity.toArray().map(v => Number(v.toFixed(4))),
            grounded: locoGrounded,
            jumping: locoJumping,
            cameraEffects: {
                runBlend: Number(getRunBlend().toFixed(4)),
                roll: Number(cameraRoll.toFixed(4)),
                landingShake: Number(cameraLandingShake.toFixed(4))
            },
            input: { ...keys },
            currentAction: locoCurrentKey
        },
        face: {
            channels: faceChannels.size,
            targets: allFaceMorphTargets.length,
            meshes: new Set(allFaceMorphTargets.map((target) => target.mesh.uuid)).size,
            emotion: currentEmotion,
            speaking: isSpeaking,
            lipSyncSource: lipSyncTimeline.source,
            cueCount: lipSyncTimeline.cues.length,
            playbackTime: isSpeaking ? Number(getLipSyncPlaybackTime().toFixed(4)) : 0,
            eyeDirection: {
                x: Number(photoBoothEyeDirection.x.toFixed(3)),
                y: Number(photoBoothEyeDirection.y.toFixed(3)),
                manual: photoBoothEyeDirection.manual,
                boneCount: Number(Boolean(cc3Bones.CC_Base_L_Eye)) + Number(Boolean(cc3Bones.CC_Base_R_Eye))
            },
            mouthShape: {
                vowel: photoBoothMouthState.vowel,
                intensity: Number(photoBoothMouthState.intensity.toFixed(3)),
                targetCount: photoBoothMouthTargetIds.size
            },
            expressionRig: {
                activeControls: [...expressionRigValues.entries()]
                    .filter(([, value]) => Math.abs(value.x) > 0.01 || Math.abs(value.y) > 0.01)
                    .map(([name, value]) => ({
                        name,
                        x: Number(value.x.toFixed(3)),
                        y: Number(value.y.toFixed(3))
                    })),
                targetCount: expressionRigTargetIds.size,
                boneCount: EXPRESSION_RIG_BONES.filter((name) => Boolean(cc3Bones[name])).length,
                morphCount: [...faceChannels.keys()].filter((name) => /^(A\d\d|T\d\d)_/.test(name)).length,
                strength: Number(expressionRigStrength.toFixed(3)),
                boneDeltas: { ...expressionRigBoneDeltas }
            },
            activeSpeechWeights: Object.fromEntries(
                Object.entries(faceLayers.speech)
                    .filter(([, value]) => value > 0.01)
                    .map(([name, value]) => [name, Number(value.toFixed(3))])
            ),
            behavior: facialEngine?.getState?.() || {
                ready: false,
                catalogSize: window.CORTANA_EXPRESSION_CATALOG?.length || 0
            }
        },
        actionKeys: Object.keys(actions),
        actions: Object.fromEntries(Object.entries(actions).map(([key, action]) => [
            key,
            {
                clip: action?._clip?.name || null,
                stats: action?._clip?.userData || {},
                tracks: action?._clip?.tracks?.length || 0,
                time: Number((action?.time || 0).toFixed(4)),
                timeScale: Number((action?.getEffectiveTimeScale?.() || 0).toFixed(4)),
                running: action ? action.isRunning() : false
            }
        ])),
        bones
    };
}

function getModelDebugStats(model) {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    let meshCount = 0;
    const sampleMeshes = [];
    model.traverse((child) => {
        if (!child.isMesh && !child.isSkinnedMesh) return;
        meshCount++;
        if (sampleMeshes.length >= 12) return;
        child.updateMatrixWorld(true);
        const childBox = new THREE.Box3().setFromObject(child);
        const childSize = childBox.getSize(new THREE.Vector3());
        const childCenter = childBox.getCenter(new THREE.Vector3());
        const materials = (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean);
        sampleMeshes.push({
            name: child.name,
            skinned: !!child.isSkinnedMesh,
            visible: child.visible,
            frustumCulled: child.frustumCulled,
            center: childCenter.toArray().map(v => Number(v.toFixed(4))),
            size: childSize.toArray().map(v => Number(v.toFixed(4))),
            materials: materials.slice(0, 3).map(mat => ({
                name: mat.name,
                type: mat.type,
                opacity: mat.opacity,
                transparent: mat.transparent,
                color: mat.color ? `#${mat.color.getHexString()}` : null,
                hasMap: !!mat.map
            }))
        });
    });
    return {
        visible: model.visible,
        position: model.position.toArray().map(v => Number(v.toFixed(4))),
        scale: model.scale.toArray().map(v => Number(v.toFixed(6))),
        bboxMin: box.min.toArray().map(v => Number(v.toFixed(4))),
        bboxMax: box.max.toArray().map(v => Number(v.toFixed(4))),
        size: size.toArray().map(v => Number(v.toFixed(4))),
        center: center.toArray().map(v => Number(v.toFixed(4))),
        meshCount,
        sampleMeshes
    };
}

function updateDebugState(force = false) {
    if (!document.body.dataset.cc3DebugReady) return;
    debugFrameCounter++;
    if (!force && debugFrameCounter % 10 !== 0) return;
    document.body.dataset.cc3DebugState = JSON.stringify(getDebugState());
}

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');

audioEl.addEventListener('play', () => {
    startSpeaking();
    setStudioLiveStatus('Speaking', currentEmotion);
});

audioEl.addEventListener('ended', () => {
    stopSpeaking();
    setStudioLiveStatus('Ready');
});

audioEl.addEventListener('pause', () => {
    if (!lipSyncPreviewActive) stopSpeaking();
    if (!lipSyncPreviewActive) setStudioLiveStatus('Ready');
});

audioEl.addEventListener('error', () => {
    stopSpeaking();
    setStudioLiveStatus('Ready');
});
audioEl.addEventListener('abort', () => {
    stopSpeaking();
    setStudioLiveStatus('Ready');
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    initAudioAnalyser();
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = '...';
    setStudioLiveStatus('Thinking', 'Preparing response');
    audioEl.pause();
    stopWebAudioTts();
    stopSpeaking(0.2);
    lipSyncPreviewActive = false;
    setLipSyncTimeline(null);

    try {
        const provider = document.getElementById('provider-select')?.value || 'groq';
        const apiKey = document.getElementById('api-key-input')?.value || '';
        const resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                voice_name: document.getElementById('voice-name-select')?.value || 'en-US-EmmaNeural',
                provider,
                api_key: apiKey
            })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        console.log('[Chat] Response:', data);
        setLipSyncTimeline(data.lip_sync);
        applyEmotion(
            data.emotion || 'Neutral',
            data.emotion_intensity,
            data.facial_expressions,
            data.transition_duration_ms
        );
        if (data.audio_url) {
            audioEl.src = data.audio_url;
            if (data.volume !== undefined) audioEl.volume = Math.max(0, Math.min(1, data.volume));
            audioEl.load();
            try {
                await audioEl.play();
            } catch (playErr) {
                console.warn('[Audio] Autoplay blocked:', playErr);
                try {
                    // The user gesture may expire while /api/chat is running.
                    // Decode the same MP3 through the already-resumed Web Audio graph.
                    await playWebAudioTts(data.audio_url);
                } catch (fallbackErr) {
                    console.error('[Audio] Web Audio fallback failed:', fallbackErr);
                    stopSpeaking();
                    applyEmotion('Neutral', 1, [], 500);
                }
            }
        }
    } catch (err) {
        console.error('[Chat] Error:', err);
        applyEmotion('Sad', 0.8, [], 420);
        stopSpeaking();
        setStudioLiveStatus('Needs attention', 'Conversation request failed');
    } finally {
        chatInput.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
        chatInput.focus();
        if (!isSpeaking) setStudioLiveStatus('Ready');
    }
});

function randomBetween(a, b) {
    return a + Math.random() * (b - a);
}

window.addEventListener('load', () => {
    init();
    setupWorldEditor();
    setupCameraControls();
    setupStudioIsland();
    setupAxisOrbitControl();
    setupCharacterPresentationControls();
    setupLightingControls();
    setupWorldRuntimeControls();
    loadWorldDocument();
    // Load the production CC3 character, baked idle, and locomotion library.
    loadIdleAnimation();

    const camLockToggle = document.getElementById('cam-lock-toggle');
    if (camLockToggle) {
        camLockToggle.addEventListener('change', (e) => {
            setCameraControlMode(e.target.checked ? 'lock' : 'orbit');
        });
    }

    const zoomButton = document.getElementById('zoom-button');
    if (zoomButton) {
        zoomButton.addEventListener('click', (e) => {
            e.stopPropagation();
            setCameraMode('chat');
            transitionToCameraView(studioEditorMode === 'photo' ? (STUDIO_CATEGORY_CAMERA[studioCategoryByMode.photo] || 'portrait') : 'portrait', 0.45);
            setStudioLiveStatus('Ready', 'Reframed');
        });
    }

    const providerSelect = document.getElementById('provider-select');
    const apiKeySection = document.getElementById('api-key-section');
    if (providerSelect && apiKeySection) {
        apiKeySection.style.display = providerSelect.value === 'openai' ? 'flex' : 'none';
        providerSelect.addEventListener('change', (e) => {
            if (e.target.value === 'openai') {
                apiKeySection.style.display = 'flex';
            } else {
                apiKeySection.style.display = 'none';
            }
        });
    }
});
sendButton.disabled = false;
sendButton.textContent = 'Send';
