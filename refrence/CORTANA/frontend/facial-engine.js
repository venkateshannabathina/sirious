(function attachCortanaFacialEngine(global) {
    'use strict';

    const C = Object.freeze({
        browInnerUp: 'A01_Brow_Inner_Up',
        browDownL: 'A02_Brow_Down_Left',
        browDownR: 'A03_Brow_Down_Right',
        browOuterUpL: 'A04_Brow_Outer_Up_Left',
        browOuterUpR: 'A05_Brow_Outer_Up_Right',
        lookUpL: 'A06_Eye_Look_Up_Left',
        lookUpR: 'A07_Eye_Look_Up_Right',
        lookDownL: 'A08_Eye_Look_Down_Left',
        lookDownR: 'A09_Eye_Look_Down_Right',
        lookOutL: 'A10_Eye_Look_Out_Left',
        lookInL: 'A11_Eye_Look_In_Left',
        lookInR: 'A12_Eye_Look_In_Right',
        lookOutR: 'A13_Eye_Look_Out_Right',
        blinkL: 'A14_Eye_Blink_Left',
        blinkR: 'A15_Eye_Blink_Right',
        squintL: 'A16_Eye_Squint_Left',
        squintR: 'A17_Eye_Squint_Right',
        wideL: 'A18_Eye_Wide_Left',
        wideR: 'A19_Eye_Wide_Right',
        cheekPuff: 'A20_Cheek_Puff',
        cheekSquintL: 'A21_Cheek_Squint_Left',
        cheekSquintR: 'A22_Cheek_Squint_Right',
        noseSneerL: 'A23_Nose_Sneer_Left',
        noseSneerR: 'A24_Nose_Sneer_Right',
        jawOpen: 'A25_Jaw_Open',
        jawForward: 'A26_Jaw_Forward',
        jawLeft: 'A27_Jaw_Left',
        jawRight: 'A28_Jaw_Right',
        funnel: 'A29_Mouth_Funnel',
        pucker: 'A30_Mouth_Pucker',
        mouthLeft: 'A31_Mouth_Left',
        mouthRight: 'A32_Mouth_Right',
        rollUpper: 'A33_Mouth_Roll_Upper',
        rollLower: 'A34_Mouth_Roll_Lower',
        shrugUpper: 'A35_Mouth_Shrug_Upper',
        shrugLower: 'A36_Mouth_Shrug_Lower',
        mouthClose: 'A37_Mouth_Close',
        smileL: 'A38_Mouth_Smile_Left',
        smileR: 'A39_Mouth_Smile_Right',
        frownL: 'A40_Mouth_Frown_Left',
        frownR: 'A41_Mouth_Frown_Right',
        dimpleL: 'A42_Mouth_Dimple_Left',
        dimpleR: 'A43_Mouth_Dimple_Right',
        upperUpL: 'A44_Mouth_Upper_Up_Left',
        upperUpR: 'A45_Mouth_Upper_Up_Right',
        lowerDownL: 'A46_Mouth_Lower_Down_Left',
        lowerDownR: 'A47_Mouth_Lower_Down_Right',
        pressL: 'A48_Mouth_Press_Left',
        pressR: 'A49_Mouth_Press_Right',
        stretchL: 'A50_Mouth_Stretch_Left',
        stretchR: 'A51_Mouth_Stretch_Right',
        noseScrunch: 'Nose_Scrunch',
        nostrilFlare: 'Nose_Nostrils_Flare',
        lipBite: 'Mouth_Bottom_Lip_Bite',
        lipsTight: 'Mouth_Lips_Tight',
        lipsPart: 'Mouth_Lips_Part',
        chinTension: 'Mouth_Bottom_Lip_Trans',
        vOpen: 'V_Open',
        vExplosive: 'V_Explosive',
        vDentalLip: 'V_Dental_Lip',
        vTightO: 'V_Tight_O',
        vTight: 'V_Tight',
        vWide: 'V_Wide',
        vAffricate: 'V_Affricate',
        vLipOpen: 'V_Lip_Open'
    });

    const MOTIFS = Object.freeze({
        softEyes: { [C.squintL]: 0.08, [C.squintR]: 0.1 },
        eyeSmile: {
            [C.squintL]: 0.22, [C.squintR]: 0.25,
            [C.cheekSquintL]: 0.28, [C.cheekSquintR]: 0.3
        },
        wideEyes: { [C.wideL]: 0.55, [C.wideR]: 0.58 },
        narrowEyes: { [C.squintL]: 0.38, [C.squintR]: 0.4 },
        innerBrow: { [C.browInnerUp]: 0.52 },
        browRaise: {
            [C.browInnerUp]: 0.34, [C.browOuterUpL]: 0.4, [C.browOuterUpR]: 0.42
        },
        browHigh: {
            [C.browInnerUp]: 0.64, [C.browOuterUpL]: 0.68, [C.browOuterUpR]: 0.7
        },
        browFurrow: { [C.browDownL]: 0.5, [C.browDownR]: 0.52 },
        oneBrowL: { [C.browOuterUpL]: 0.58, [C.browDownR]: 0.16 },
        oneBrowR: { [C.browOuterUpR]: 0.58, [C.browDownL]: 0.16 },
        softSmile: { [C.smileL]: 0.28, [C.smileR]: 0.31 },
        warmSmile: {
            [C.smileL]: 0.55, [C.smileR]: 0.59,
            [C.cheekSquintL]: 0.2, [C.cheekSquintR]: 0.23
        },
        fullSmile: {
            [C.smileL]: 0.78, [C.smileR]: 0.82,
            [C.cheekSquintL]: 0.4, [C.cheekSquintR]: 0.44,
            [C.squintL]: 0.19, [C.squintR]: 0.22
        },
        grinL: { [C.smileL]: 0.75, [C.smileR]: 0.35, [C.dimpleL]: 0.24 },
        grinR: { [C.smileL]: 0.35, [C.smileR]: 0.75, [C.dimpleR]: 0.24 },
        frown: { [C.frownL]: 0.52, [C.frownR]: 0.55, [C.chinTension]: 0.12 },
        deepFrown: {
            [C.frownL]: 0.78, [C.frownR]: 0.8,
            [C.chinTension]: 0.34, [C.browInnerUp]: 0.62
        },
        lipPress: { [C.pressL]: 0.54, [C.pressR]: 0.56, [C.mouthClose]: 0.36 },
        tightMouth: { [C.lipsTight]: 0.48, [C.pressL]: 0.32, [C.pressR]: 0.34 },
        lipsApart: { [C.lipsPart]: 0.25, [C.jawOpen]: 0.1 },
        openMouth: { [C.jawOpen]: 0.48, [C.lipsPart]: 0.4 },
        jawDrop: { [C.jawOpen]: 0.85, [C.lipsPart]: 0.54, [C.lowerDownL]: 0.18, [C.lowerDownR]: 0.18 },
        pucker: { [C.pucker]: 0.48, [C.funnel]: 0.24 },
        disgust: {
            [C.noseSneerL]: 0.44, [C.noseSneerR]: 0.48,
            [C.upperUpL]: 0.3, [C.upperUpR]: 0.34
        }
    });

    function mergeMorphs(parts, overrides = {}) {
        const result = {};
        for (const part of parts) {
            const values = typeof part === 'string' ? MOTIFS[part] : part;
            if (!values) continue;
            for (const [channel, value] of Object.entries(values)) {
                result[channel] = Math.max(result[channel] || 0, value);
            }
        }
        return Object.assign(result, overrides);
    }

    const definitions = [];
    function define(id, label, category, motifs, options = {}) {
        definitions.push(Object.freeze({
            id,
            label,
            category,
            morphs: Object.freeze(mergeMorphs(motifs, options.morphs)),
            duration: options.duration ?? (category === 'Micro' ? 0.18 : 2.4),
            head: Object.freeze(options.head || {}),
            gaze: Object.freeze(options.gaze || {}),
            blinkRate: options.blinkRate ?? 1,
            micro: category === 'Micro',
            priority: options.priority ?? (category === 'Micro' ? 2 : 1)
        }));
    }

    // Positive and social signals.
    define('soft_smile', 'Soft Smile', 'Positive', ['softEyes', 'softSmile'], { duration: 2.4, head: { roll: 0.05 } });
    define('genuine_smile', 'Genuine Smile', 'Positive', ['fullSmile'], { duration: 3.2, head: { pitch: 0.025 } });
    define('polite_smile', 'Polite Smile', 'Positive', ['softSmile'], { duration: 4 });
    define('playful_grin', 'Playful Grin', 'Positive', ['grinL', 'oneBrowL'], { duration: 1.4, head: { roll: 0.1 }, gaze: { x: -0.3 } });
    define('smirk', 'Smirk', 'Positive', ['grinR', 'narrowEyes', 'oneBrowR'], { duration: 1.5, head: { yaw: -0.04 } });
    define('proud', 'Proud', 'Positive', ['softSmile', 'browRaise'], { duration: 3, head: { pitch: -0.08 } });
    define('relief', 'Relief', 'Positive', ['softSmile', 'softEyes'], { duration: 1.6, head: { pitch: 0.09 }, morphs: { [C.blinkL]: 0.35, [C.blinkR]: 0.38 } });
    define('delight', 'Delight', 'Positive', ['fullSmile', 'wideEyes', 'browRaise', 'lipsApart'], { duration: 2.6, head: { pitch: 0.03 } });
    define('excitement', 'Excitement', 'Positive', ['fullSmile', 'wideEyes', 'browHigh', 'openMouth'], { duration: 2.2, head: { bob: 0.05 }, blinkRate: 1.35 });
    define('laugh', 'Laugh', 'Positive', ['fullSmile', 'openMouth'], { duration: 2, head: { bob: 0.08, pitch: 0.06 }, morphs: { [C.blinkL]: 0.28, [C.blinkR]: 0.32 } });

    // Thinking and attention.
    define('curious', 'Curious', 'Thinking', ['oneBrowL', 'lipsApart'], { head: { roll: 0.11 }, gaze: { x: 0.18 } });
    define('interested', 'Interested', 'Thinking', ['softEyes'], { duration: 3.5, head: { pitch: 0.045 }, blinkRate: 0.65 });
    define('fascinated', 'Fascinated', 'Thinking', ['wideEyes', 'browRaise', 'lipsApart'], { duration: 3, head: { pitch: 0.06 }, blinkRate: 0.45 });
    define('analytical', 'Analytical', 'Thinking', ['browFurrow', 'lipPress'], { duration: 3.2, gaze: { x: 0.22 }, blinkRate: 0.55 });
    define('concentrating', 'Concentrating', 'Thinking', ['browFurrow', 'tightMouth'], { duration: 3.2, head: { pitch: 0.05 }, blinkRate: 0.35 });
    define('remembering', 'Remembering', 'Thinking', ['softEyes'], { duration: 2.6, head: { roll: 0.045 }, gaze: { x: 0.28, y: -0.45 }, blinkRate: 0.5 });
    define('calculating', 'Calculating', 'Thinking', ['browFurrow', 'lipPress'], { duration: 2.4, head: { bob: 0.025 }, gaze: { x: -0.25 }, blinkRate: 0.45 });
    define('confused', 'Confused', 'Thinking', ['innerBrow', 'lipsApart'], { duration: 2.2, head: { roll: -0.12 }, gaze: { x: -0.2 }, blinkRate: 1.25 });
    define('questioning', 'Questioning', 'Thinking', ['oneBrowR'], { duration: 2.2, head: { roll: 0.1 } });
    define('skeptical', 'Skeptical', 'Thinking', ['narrowEyes', 'oneBrowL', 'tightMouth'], { duration: 2, head: { pitch: -0.04, roll: -0.05 } });
    define('realization', 'Realization', 'Thinking', ['wideEyes', 'browRaise', 'lipsApart'], { duration: 1.1, head: { bob: 0.045 } });
    define('listening', 'Listening', 'Thinking', ['softEyes'], { duration: 4, head: { pitch: 0.035 }, blinkRate: 0.7 });

    // Sadness, empathy, and care.
    define('concern', 'Concern', 'Empathy', ['innerBrow', 'frown', 'softEyes'], { head: { roll: 0.06 } });
    define('sympathy', 'Sympathy', 'Empathy', ['innerBrow', 'softSmile', 'softEyes'], { head: { pitch: 0.04 } });
    define('compassion', 'Compassion', 'Empathy', ['innerBrow', 'warmSmile', 'softEyes'], { head: { roll: -0.06, pitch: 0.03 } });
    define('reassurance', 'Reassurance', 'Empathy', ['softSmile', 'softEyes'], { duration: 3, head: { bob: 0.035, roll: 0.045 } });
    define('disappointed', 'Disappointed', 'Empathy', ['frown', 'browFurrow'], { head: { pitch: 0.09 }, gaze: { y: 0.32 } });
    define('regret', 'Regret', 'Empathy', ['innerBrow', 'lipPress'], { head: { pitch: 0.1 }, gaze: { x: 0.35, y: 0.25 } });
    define('lonely', 'Lonely', 'Empathy', ['frown', 'softEyes'], { duration: 3.5, head: { pitch: 0.09 }, gaze: { x: -0.45 } });
    define('heartbroken', 'Heartbroken', 'Empathy', ['deepFrown', 'innerBrow'], { duration: 3.2, head: { pitch: 0.14 }, morphs: { [C.chinTension]: 0.5 } });
    define('worry', 'Worry', 'Empathy', ['innerBrow', 'tightMouth'], { duration: 2.3, head: { pitch: 0.045 }, gaze: { x: 0.4 }, blinkRate: 1.45 });
    define('comforting', 'Comforting', 'Empathy', ['warmSmile', 'softEyes'], { duration: 3.2, head: { bob: 0.035, roll: -0.055 } });

    // Anger and resolve.
    define('irritated', 'Irritated', 'Anger', ['narrowEyes', 'browFurrow', 'tightMouth'], { duration: 1.8, head: { pitch: -0.035 } });
    define('frustrated', 'Frustrated', 'Anger', ['browFurrow', 'lipPress', 'narrowEyes'], { duration: 2.2, head: { shake: 0.035 }, morphs: { [C.chinTension]: 0.28 } });
    define('annoyed', 'Annoyed', 'Anger', ['oneBrowR', 'tightMouth'], { duration: 2, head: { roll: 0.07 }, gaze: { x: -0.45 } });
    define('disapproval', 'Disapproval', 'Anger', ['browFurrow', 'frown'], { duration: 2.4, head: { pitch: -0.07 } });
    define('stern', 'Stern', 'Anger', ['browFurrow', 'lipPress'], { duration: 3 });
    define('determined', 'Determined', 'Anger', ['browFurrow', 'tightMouth'], { duration: 3, head: { pitch: 0.035 } });
    define('controlled_anger', 'Controlled Anger', 'Anger', ['browFurrow', 'narrowEyes', 'lipPress'], { duration: 3.2, morphs: { [C.jawForward]: 0.18 } });
    define('outrage', 'Outrage', 'Anger', ['browHigh', 'wideEyes', 'openMouth', 'disgust'], { duration: 1.8, head: { shake: 0.055 } });

    // Fear and uncertainty.
    define('nervous', 'Nervous', 'Fear', ['innerBrow'], { duration: 2.2, gaze: { x: 0.5 }, blinkRate: 1.7, morphs: { [C.lipBite]: 0.34 } });
    define('startled', 'Startled', 'Fear', ['wideEyes', 'browHigh', 'openMouth'], { duration: 0.8, head: { pitch: -0.05 } });
    define('shock', 'Shock', 'Fear', ['wideEyes', 'browHigh', 'jawDrop'], { duration: 1.6, head: { freeze: 1 }, blinkRate: 0.2 });
    define('alarm', 'Alarm', 'Fear', ['wideEyes', 'browRaise', 'openMouth'], { duration: 1.8, gaze: { x: 0.48 }, blinkRate: 1.3 });
    define('anxiety', 'Anxiety', 'Fear', ['innerBrow', 'lipPress'], { duration: 2.8, head: { pitch: 0.08 }, gaze: { x: -0.4 }, blinkRate: 1.6 });
    define('uneasy', 'Uneasy', 'Fear', ['innerBrow', 'tightMouth'], { duration: 2.4, head: { roll: -0.07 }, gaze: { x: 0.42 } });
    define('panic', 'Panic', 'Fear', ['wideEyes', 'browHigh', 'openMouth'], { duration: 1.5, gaze: { x: 0.6 }, blinkRate: 2 });
    define('suspicious', 'Suspicious', 'Fear', ['narrowEyes', 'oneBrowL', 'tightMouth'], { duration: 2.3, head: { roll: 0.06 }, gaze: { x: -0.34 } });
    define('reluctant', 'Reluctant', 'Fear', ['softEyes'], { duration: 2.4, head: { pitch: -0.03 }, gaze: { x: 0.42 }, morphs: { [C.frownL]: 0.18, [C.frownR]: 0.2 } });

    // Neutral and social conversation states.
    define('calm', 'Calm', 'Neutral', ['softEyes'], { duration: 5, blinkRate: 0.85 });
    define('professional', 'Professional', 'Neutral', ['softSmile'], { duration: 5 });
    define('confident', 'Confident', 'Neutral', ['softSmile'], { duration: 4, head: { pitch: -0.055 }, blinkRate: 0.8 });
    define('composed', 'Composed', 'Neutral', [], { duration: 5, blinkRate: 0.8 });
    define('waiting', 'Waiting', 'Neutral', ['softEyes'], { duration: 5, gaze: { x: 0.12 } });
    define('greeting', 'Greeting', 'Social', ['warmSmile', 'browRaise'], { duration: 1.8, head: { bob: 0.055 } });
    define('encouraging', 'Encouraging', 'Social', ['warmSmile', 'softEyes'], { duration: 2.8, head: { bob: 0.035, pitch: 0.025 } });
    define('flirty', 'Flirty', 'Social', ['grinR', 'oneBrowR', 'softEyes'], { duration: 2.6, head: { roll: -0.1 }, blinkRate: 0.65 });
    define('affectionate', 'Affectionate', 'Social', ['warmSmile', 'softEyes'], { duration: 3.2, head: { roll: 0.075, pitch: 0.025 } });
    define('respectful', 'Respectful', 'Social', ['softSmile'], { duration: 2.2, head: { bob: 0.04 } });
    define('shy', 'Shy', 'Social', ['softSmile', 'innerBrow'], { duration: 2.5, head: { pitch: 0.09 }, gaze: { x: -0.25, y: 0.3 } });
    define('embarrassed', 'Embarrassed', 'Social', ['softSmile', 'innerBrow', 'lipPress'], { duration: 2.4, head: { pitch: 0.1 }, gaze: { x: 0.35, y: 0.28 } });

    // Short involuntary signals from the supplied 40-300 ms sheet.
    define('eyebrow_twitch', 'Eyebrow Twitch', 'Micro', ['oneBrowL'], { duration: 0.12 });
    define('brow_flash', 'Brow Flash', 'Micro', ['browHigh'], { duration: 0.2 });
    define('lip_twitch', 'Lip Twitch', 'Micro', ['grinR'], { duration: 0.12 });
    define('lip_press', 'Lip Press', 'Micro', ['lipPress'], { duration: 0.22 });
    define('smile_leak', 'Smile Leak', 'Micro', ['warmSmile'], { duration: 0.28 });
    define('nose_wrinkle', 'Nose Wrinkle', 'Micro', ['disgust'], { duration: 0.18, morphs: { [C.noseScrunch]: 0.52 } });
    define('eye_widen', 'Eye Widen', 'Micro', ['wideEyes'], { duration: 0.16 });
    define('squint', 'Squint', 'Micro', ['narrowEyes'], { duration: 0.18 });
    define('chin_tension', 'Chin Tension', 'Micro', [], { duration: 0.2, morphs: { [C.chinTension]: 0.55 } });
    define('jaw_clench', 'Jaw Clench', 'Micro', ['lipPress'], { duration: 0.22, morphs: { [C.jawForward]: 0.22 } });
    define('cheek_twitch', 'Cheek Twitch', 'Micro', [], { duration: 0.14, morphs: { [C.cheekSquintL]: 0.48 } });
    define('nostril_flare', 'Nostril Flare', 'Micro', [], { duration: 0.2, morphs: { [C.nostrilFlare]: 0.58 } });
    define('lip_purse', 'Lip Purse', 'Micro', ['pucker'], { duration: 0.22 });
    define('lower_lip_bite', 'Lower Lip Bite', 'Micro', [], { duration: 0.28, morphs: { [C.lipBite]: 0.55 } });
    define('micro_frown', 'Micro Frown', 'Micro', ['frown'], { duration: 0.2 });
    define('eye_dart', 'Eye Dart', 'Micro', [], { duration: 0.14, gaze: { x: 0.7 } });
    define('tiny_inhale', 'Tiny Inhale', 'Micro', ['lipsApart'], { duration: 0.24, head: { pitch: -0.015 } });
    define('tiny_swallow', 'Tiny Swallow', 'Micro', ['lipPress'], { duration: 0.24, head: { pitch: 0.018 } });
    define('forehead_wrinkle', 'Forehead Wrinkle', 'Micro', ['browRaise'], { duration: 0.2 });
    define('head_freeze', 'Head Freeze', 'Micro', [], { duration: 0.22, head: { freeze: 1 } });

    const CATALOG = Object.freeze(definitions);
    const CATALOG_BY_ID = new Map(CATALOG.map((recipe) => [recipe.id, recipe]));
    const CATALOG_BY_LABEL = new Map(CATALOG.map((recipe) => [
        recipe.label.toLowerCase().replace(/[\s-]+/g, '_'),
        recipe
    ]));
    const ALIASES = Object.freeze({
        neutral: 'calm',
        happy: 'genuine_smile',
        excited: 'excitement',
        sad: 'disappointed',
        empathetic: 'compassion',
        curious: 'curious',
        confident: 'confident',
        serious: 'stern',
        surprised: 'startled',
        smile: 'genuine_smile',
        blink: 'brow_flash',
        reassurance: 'reassurance',
        gentle_smile: 'soft_smile',
        serious: 'stern',
        surprise: 'startled',
        sadness: 'disappointed',
        anger: 'controlled_anger',
        fear: 'nervous',
        empathy: 'compassion',
        thoughtful: 'analytical'
    });
    const MOUTH_CHANNELS = new Set([
        C.jawOpen, C.jawForward, C.jawLeft, C.jawRight, C.funnel, C.pucker,
        C.mouthLeft, C.mouthRight, C.rollUpper, C.rollLower, C.shrugUpper,
        C.shrugLower, C.mouthClose, C.frownL, C.frownR, C.dimpleL, C.dimpleR,
        C.upperUpL, C.upperUpR, C.lowerDownL, C.lowerDownR, C.pressL, C.pressR,
        C.stretchL, C.stretchR, C.lipBite, C.lipsTight, C.lipsPart,
        C.chinTension
    ]);

    function clamp01(value) {
        return Math.max(0, Math.min(1, Number(value) || 0));
    }

    function smoothEnvelope(progress, attack = 0.18, release = 0.28) {
        if (progress <= 0 || progress >= 1) return 0;
        if (progress < attack) {
            const t = progress / attack;
            return t * t * (3 - 2 * t);
        }
        if (progress > 1 - release) {
            const t = (1 - progress) / release;
            return t * t * (3 - 2 * t);
        }
        return 1;
    }

    class CortanaFacialEngine {
        constructor(options = {}) {
            this.applyChannel = options.applyChannel || (() => {});
            this.hasChannel = options.hasChannel || (() => false);
            this.now = options.now || (() => performance.now() / 1000);
            this.active = null;
            this.transients = [];
            this.current = new Map();
            this.speech = {};
            this.gaze = { x: 0, y: 0, strength: 0 };
            this.headCurrent = { pitch: 0, yaw: 0, roll: 0 };
            this.headTarget = { pitch: 0, yaw: 0, roll: 0 };
            this.autoEnabled = true;
            this.loop = false;
            this.blink = { elapsed: 0, duration: 0.14, next: 3.2, sideOffset: 0.018, active: false };
            this.idleMicroTimer = 2.8;
            this.lastStatusAt = 0;
            this.statusListener = null;
            this.lastPlayed = 'calm';
            this.play('calm', { duration: 5, source: 'idle' });
        }

        resolveRecipe(name) {
            if (!name) return null;
            const normalized = String(name).trim().toLowerCase().replace(/[\s-]+/g, '_');
            return CATALOG_BY_ID.get(normalized)
                || CATALOG_BY_LABEL.get(normalized)
                || CATALOG_BY_ID.get(ALIASES[normalized])
                || null;
        }

        play(name, options = {}) {
            const recipe = this.resolveRecipe(name);
            if (!recipe) return { ok: false, reason: 'unknown-expression', name };
            const state = {
                recipe,
                elapsed: 0,
                duration: Math.max(0.08, Number(options.duration) || recipe.duration),
                intensity: clamp01(options.intensity ?? 1),
                loop: options.loop ?? this.loop,
                source: options.source || 'manual'
            };
            this.lastPlayed = recipe.id;
            if (recipe.micro || options.transient) {
                this.transients.push(state);
            } else {
                this.active = state;
            }
            this.emitStatus(true);
            return {
                ok: true,
                id: recipe.id,
                mapped: this.getMappedChannels(recipe),
                missing: this.getMissingChannels(recipe)
            };
        }

        stop(options = {}) {
            this.transients.length = 0;
            if (options.keepBase === false) {
                this.active = null;
            } else {
                this.play('calm', { intensity: 0.45, duration: 4, source: 'idle' });
            }
            this.emitStatus(true);
        }

        reset() {
            this.active = null;
            this.transients.length = 0;
            this.current.clear();
            this.speech = {};
            this.headCurrent = { pitch: 0, yaw: 0, roll: 0 };
            for (const channel of Object.values(C)) this.applyChannel(channel, 0);
            if (this.autoEnabled) this.play('calm', { intensity: 0.45, duration: 5, source: 'idle' });
            this.emitStatus(true);
        }

        setAutoEnabled(enabled) {
            this.autoEnabled = Boolean(enabled);
            this.idleMicroTimer = 1.5 + Math.random() * 2;
            this.emitStatus(true);
        }

        setLoop(enabled) {
            this.loop = Boolean(enabled);
            if (this.active) this.active.loop = this.loop;
            this.emitStatus(true);
        }

        setSpeechFrame(weights = {}) {
            this.speech = weights;
        }

        setGaze(x, y, strength = 1) {
            this.gaze.x = Math.max(-1, Math.min(1, Number(x) || 0));
            this.gaze.y = Math.max(-1, Math.min(1, Number(y) || 0));
            this.gaze.strength = clamp01(strength);
        }

        getMappedChannels(recipe) {
            return Object.keys(recipe?.morphs || {}).filter((channel) => this.hasChannel(channel));
        }

        getMissingChannels(recipe) {
            return Object.keys(recipe?.morphs || {}).filter((channel) => !this.hasChannel(channel));
        }

        getHeadPose() {
            return { ...this.headCurrent };
        }

        getState() {
            const recipe = this.active?.recipe || null;
            const activeWeights = [...this.current.entries()]
                .filter(([, value]) => value > 0.015)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 16)
                .map(([channel, value]) => ({ channel, value: Number(value.toFixed(3)) }));
            return {
                ready: true,
                active: recipe?.id || null,
                label: recipe?.label || null,
                category: recipe?.category || null,
                source: this.active?.source || null,
                progress: this.active
                    ? Number(Math.min(1, this.active.elapsed / this.active.duration).toFixed(3))
                    : 0,
                intensity: this.active?.intensity ?? 0,
                loop: Boolean(this.active?.loop),
                auto: this.autoEnabled,
                transients: this.transients.map((item) => item.recipe.id),
                mappedChannels: recipe ? this.getMappedChannels(recipe).length : 0,
                missingChannels: recipe ? this.getMissingChannels(recipe) : [],
                activeWeights,
                catalogSize: CATALOG.length
            };
        }

        setStatusListener(listener) {
            this.statusListener = typeof listener === 'function' ? listener : null;
            this.emitStatus(true);
        }

        emitStatus(force = false) {
            if (!this.statusListener) return;
            const now = this.now();
            if (!force && now - this.lastStatusAt < 0.12) return;
            this.lastStatusAt = now;
            this.statusListener(this.getState());
        }

        addWeights(target, morphs, scale, speechActive) {
            for (const [channel, rawValue] of Object.entries(morphs || {})) {
                const mouthScale = speechActive && MOUTH_CHANNELS.has(channel) ? 0.38 : 1;
                const value = clamp01(rawValue * scale * mouthScale);
                target[channel] = Math.max(target[channel] || 0, value);
            }
        }

        addGazeWeights(target, gaze, scale = 1) {
            const x = Math.max(-1, Math.min(1, gaze?.x || 0)) * scale;
            const y = Math.max(-1, Math.min(1, gaze?.y || 0)) * scale;
            if (x > 0) {
                target[C.lookOutL] = Math.max(target[C.lookOutL] || 0, x * 0.5);
                target[C.lookInR] = Math.max(target[C.lookInR] || 0, x * 0.5);
            } else if (x < 0) {
                target[C.lookInL] = Math.max(target[C.lookInL] || 0, -x * 0.5);
                target[C.lookOutR] = Math.max(target[C.lookOutR] || 0, -x * 0.5);
            }
            if (y > 0) {
                target[C.lookDownL] = Math.max(target[C.lookDownL] || 0, y * 0.45);
                target[C.lookDownR] = Math.max(target[C.lookDownR] || 0, y * 0.45);
            } else if (y < 0) {
                target[C.lookUpL] = Math.max(target[C.lookUpL] || 0, -y * 0.45);
                target[C.lookUpR] = Math.max(target[C.lookUpR] || 0, -y * 0.45);
            }
        }

        updateBlink(delta, target, blinkRate) {
            this.blink.next -= delta * blinkRate;
            if (!this.blink.active && this.blink.next <= 0) {
                this.blink.active = true;
                this.blink.elapsed = 0;
                this.blink.duration = 0.11 + Math.random() * 0.07;
                this.blink.sideOffset = (Math.random() - 0.5) * 0.025;
            }
            if (!this.blink.active) return;
            this.blink.elapsed += delta;
            const progress = this.blink.elapsed / this.blink.duration;
            const blinkValue = progress < 0.42
                ? Math.sin((progress / 0.42) * Math.PI * 0.5)
                : Math.cos(((progress - 0.42) / 0.58) * Math.PI * 0.5);
            target[C.blinkL] = clamp01(blinkValue + this.blink.sideOffset);
            target[C.blinkR] = clamp01(blinkValue - this.blink.sideOffset);
            if (progress >= 1) {
                this.blink.active = false;
                this.blink.next = 2.2 + Math.random() * 3.4;
            }
        }

        updateAutoBehavior(delta) {
            if (!this.autoEnabled) return;
            this.idleMicroTimer -= delta;
            if (this.idleMicroTimer <= 0 && this.transients.length < 2) {
                const pool = ['eye_dart', 'eyebrow_twitch', 'tiny_swallow', 'lip_twitch'];
                const id = pool[Math.floor(Math.random() * pool.length)];
                this.play(id, { intensity: 0.25 + Math.random() * 0.25, source: 'auto' });
                this.idleMicroTimer = 2.4 + Math.random() * 4.8;
            }
            if (!this.active) {
                this.play('calm', { intensity: 0.35, duration: 5, source: 'idle' });
            }
        }

        update(delta) {
            const dt = Math.min(Math.max(Number(delta) || 0, 0), 0.1);
            this.updateAutoBehavior(dt);
            const target = {};
            const speechActive = Object.values(this.speech).some((value) => value > 0.01);
            let blinkRate = 1;
            let headWeight = 0;
            const head = { pitch: 0, yaw: 0, roll: 0 };

            if (this.active) {
                const state = this.active;
                state.elapsed += dt;
                let progress = state.elapsed / state.duration;
                if (state.loop && progress >= 1) {
                    state.elapsed %= state.duration;
                    progress = state.elapsed / state.duration;
                }
                const envelope = smoothEnvelope(progress) * state.intensity;
                this.addWeights(target, state.recipe.morphs, envelope, speechActive);
                this.addGazeWeights(target, state.recipe.gaze, envelope);
                blinkRate = state.recipe.blinkRate;
                headWeight = envelope;
                head.pitch += (state.recipe.head.pitch || 0) * envelope;
                head.yaw += (state.recipe.head.yaw || 0) * envelope;
                head.roll += (state.recipe.head.roll || 0) * envelope;
                if (state.recipe.head.bob) {
                    head.pitch += Math.sin(state.elapsed * Math.PI * 2.4) * state.recipe.head.bob * envelope;
                }
                if (state.recipe.head.shake) {
                    head.yaw += Math.sin(state.elapsed * Math.PI * 4.2) * state.recipe.head.shake * envelope;
                }
                if (progress >= 1 && !state.loop) this.active = null;
            }

            for (let i = this.transients.length - 1; i >= 0; i--) {
                const state = this.transients[i];
                state.elapsed += dt;
                const progress = state.elapsed / state.duration;
                const envelope = smoothEnvelope(progress, 0.35, 0.35) * state.intensity;
                this.addWeights(target, state.recipe.morphs, envelope, speechActive);
                this.addGazeWeights(target, state.recipe.gaze, envelope);
                head.pitch += (state.recipe.head.pitch || 0) * envelope;
                head.yaw += (state.recipe.head.yaw || 0) * envelope;
                head.roll += (state.recipe.head.roll || 0) * envelope;
                headWeight = Math.max(headWeight, envelope);
                if (progress >= 1) this.transients.splice(i, 1);
            }

            this.addGazeWeights(target, this.gaze, this.gaze.strength);
            this.updateBlink(dt, target, blinkRate);
            for (const [channel, value] of Object.entries(this.speech)) {
                target[channel] = Math.max(target[channel] || 0, clamp01(value));
            }

            const channels = new Set([...this.current.keys(), ...Object.keys(target)]);
            for (const channel of channels) {
                const current = this.current.get(channel) || 0;
                const desired = target[channel] || 0;
                const response = channel === C.blinkL || channel === C.blinkR ? 38 : (speechActive ? 22 : 12);
                const alpha = 1 - Math.exp(-response * dt);
                const next = current + (desired - current) * alpha;
                this.current.set(channel, Math.abs(next) < 0.001 ? 0 : next);
                this.applyChannel(channel, next);
            }

            this.headTarget.pitch = head.pitch;
            this.headTarget.yaw = head.yaw;
            this.headTarget.roll = head.roll;
            const headAlpha = 1 - Math.exp(-(headWeight > 0 ? 9 : 6) * dt);
            for (const axis of ['pitch', 'yaw', 'roll']) {
                this.headCurrent[axis] += (this.headTarget[axis] - this.headCurrent[axis]) * headAlpha;
            }
            this.speech = {};
            this.emitStatus();
        }
    }

    global.CortanaFacialEngine = CortanaFacialEngine;
    global.CORTANA_EXPRESSION_CATALOG = CATALOG;
    global.CORTANA_FACE_CHANNELS = C;
})(typeof window !== 'undefined' ? window : globalThis);
