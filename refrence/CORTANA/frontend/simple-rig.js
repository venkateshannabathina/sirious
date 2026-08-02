(function setupSimpleRigPanel() {
    'use strict';

    const groups = [
        {
            name: 'Bones',
            controls: [
                { id: 'jawOpen', label: 'Jaw Open', min: 0, max: 1, step: 0.01, rig: 'jaw' },
                { id: 'jawSide', label: 'Jaw Side', min: -1, max: 1, step: 0.01, rig: 'jaw' },
                { id: 'jawForward', label: 'Jaw Forward', min: 0, max: 1, step: 0.01, rig: 'jaw-forward' },
                { id: 'gazeX', label: 'Eye Gaze X', min: -1, max: 1, step: 0.01, rig: 'gaze' },
                { id: 'gazeY', label: 'Eye Gaze Y', min: -1, max: 1, step: 0.01, rig: 'gaze' },
                { id: 'tongueOut', label: 'Tongue Out', min: 0, max: 1, step: 0.01, rig: 'tongue-out' }
            ]
        },
        {
            name: 'Eyes',
            controls: [
                { id: 'blinkL', label: 'Blink Left', channel: 'A14_Eye_Blink_Left' },
                { id: 'blinkR', label: 'Blink Right', channel: 'A15_Eye_Blink_Right' },
                { id: 'wideL', label: 'Wide Left', channel: 'A18_Eye_Wide_Left' },
                { id: 'wideR', label: 'Wide Right', channel: 'A19_Eye_Wide_Right' },
                { id: 'squintL', label: 'Squint Left', channel: 'A16_Eye_Squint_Left' },
                { id: 'squintR', label: 'Squint Right', channel: 'A17_Eye_Squint_Right' }
            ]
        },
        {
            name: 'Brows',
            controls: [
                { id: 'browInner', label: 'Inner Up', channel: 'A01_Brow_Inner_Up' },
                { id: 'browOuterL', label: 'Outer Up Left', channel: 'A04_Brow_Outer_Up_Left' },
                { id: 'browOuterR', label: 'Outer Up Right', channel: 'A05_Brow_Outer_Up_Right' },
                { id: 'browDownL', label: 'Down Left', channel: 'A02_Brow_Down_Left' },
                { id: 'browDownR', label: 'Down Right', channel: 'A03_Brow_Down_Right' }
            ]
        },
        {
            name: 'Mouth',
            controls: [
                { id: 'smileL', label: 'Smile Left', channel: 'A38_Mouth_Smile_Left' },
                { id: 'smileR', label: 'Smile Right', channel: 'A39_Mouth_Smile_Right' },
                { id: 'frownL', label: 'Frown Left', channel: 'A40_Mouth_Frown_Left' },
                { id: 'frownR', label: 'Frown Right', channel: 'A41_Mouth_Frown_Right' },
                { id: 'pucker', label: 'Pucker', channel: 'A30_Mouth_Pucker' },
                { id: 'funnel', label: 'Funnel', channel: 'A29_Mouth_Funnel' },
                { id: 'mouthClose', label: 'Mouth Close', channel: 'A37_Mouth_Close' },
                { id: 'lipPress', label: 'Lip Press', channels: ['A48_Mouth_Press_Left', 'A49_Mouth_Press_Right'] }
            ]
        },
        {
            name: 'Cheeks + Nose',
            controls: [
                { id: 'cheekPuff', label: 'Cheek Puff', channel: 'A20_Cheek_Puff' },
                { id: 'cheekSquintL', label: 'Cheek Left', channel: 'A21_Cheek_Squint_Left' },
                { id: 'cheekSquintR', label: 'Cheek Right', channel: 'A22_Cheek_Squint_Right' },
                { id: 'noseSneerL', label: 'Nose Left', channel: 'A23_Nose_Sneer_Left' },
                { id: 'noseSneerR', label: 'Nose Right', channel: 'A24_Nose_Sneer_Right' },
                { id: 'nostrilFlare', label: 'Nostril Flare', channel: 'Nose_Nostrils_Flare' }
            ]
        },
        {
            name: 'Speech Shapes',
            controls: [
                { id: 'vOpen', label: 'Open', channel: 'V_Open' },
                { id: 'vExplosive', label: 'Explosive', channel: 'V_Explosive' },
                { id: 'vDental', label: 'Dental Lip', channel: 'V_Dental_Lip' },
                { id: 'vTightO', label: 'Tight O', channel: 'V_Tight_O' },
                { id: 'vTight', label: 'Tight', channel: 'V_Tight' },
                { id: 'vWide', label: 'Wide', channel: 'V_Wide' },
                { id: 'vAffricate', label: 'Affricate', channel: 'V_Affricate' },
                { id: 'vLipOpen', label: 'Lip Open', channel: 'V_Lip_Open' }
            ]
        }
    ];

    const state = Object.create(null);
    const controlMap = new Map();
    const panel = document.getElementById('rig-test-panel');
    const toggle = document.getElementById('rig-test-toggle');
    const close = document.getElementById('rig-test-close');
    const controlsRoot = document.getElementById('rig-test-controls');
    const status = document.getElementById('rig-test-status');
    const light = document.getElementById('rig-test-light');
    let autoTestRunning = false;

    function getApi() {
        return window.__cc3Debug || null;
    }

    function setStatus(message, mode = 'ready') {
        status.textContent = message;
        light.dataset.state = mode;
    }

    function formatValue(value) {
        const number = Number(value) || 0;
        return number.toFixed(2);
    }

    function setOutput(control, value) {
        const output = document.querySelector(`[data-rig-test-output="${control.id}"]`);
        if (output) output.textContent = formatValue(value);
    }

    function applyControl(control, value) {
        const api = getApi();
        if (!api) return false;
        const amount = Number(value) || 0;
        state[control.id] = amount;
        setOutput(control, amount);

        if (control.rig === 'jaw') {
            api.setRigControl('jaw', state.jawSide || 0, state.jawOpen || 0);
        } else if (control.rig === 'jaw-forward') {
            api.setRigControl('jaw-forward', 0, amount);
        } else if (control.rig === 'gaze') {
            const x = state.gazeX || 0;
            const y = state.gazeY || 0;
            api.setRigControl('gaze-screen-left', x, y);
            api.setRigControl('gaze-screen-right', x, y);
        } else if (control.rig === 'tongue-out') {
            api.setRigControl('tongue-out', 0, amount);
        } else {
            const channels = control.channels || [control.channel];
            channels.forEach((channel) => api.setRigChannel(channel, amount));
        }
        return true;
    }

    function createControls() {
        controlsRoot.replaceChildren();
        for (const group of groups) {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'rig-test-group';
            const legend = document.createElement('legend');
            legend.textContent = group.name;
            fieldset.appendChild(legend);

            for (const control of group.controls) {
                control.min ??= 0;
                control.max ??= 1;
                control.step ??= 0.01;
                state[control.id] = 0;
                controlMap.set(control.id, control);

                const row = document.createElement('div');
                row.className = 'rig-test-row';
                row.dataset.rigTestRow = control.id;

                const label = document.createElement('label');
                label.htmlFor = `rig-test-${control.id}`;
                label.textContent = control.label;

                const slider = document.createElement('input');
                slider.id = `rig-test-${control.id}`;
                slider.type = 'range';
                slider.min = String(control.min);
                slider.max = String(control.max);
                slider.step = String(control.step);
                slider.value = '0';
                slider.dataset.rigTestControl = control.id;

                const output = document.createElement('output');
                output.htmlFor = slider.id;
                output.dataset.rigTestOutput = control.id;
                output.textContent = '0.00';

                row.append(label, slider, output);
                fieldset.appendChild(row);
            }
            controlsRoot.appendChild(fieldset);
        }
    }

    function resetUi() {
        autoTestRunning = false;
        getApi()?.resetRigTest();
        for (const control of controlMap.values()) {
            state[control.id] = 0;
            const slider = document.querySelector(`[data-rig-test-control="${control.id}"]`);
            if (slider) slider.value = '0';
            setOutput(control, 0);
            document.querySelector(`[data-rig-test-row="${control.id}"]`)?.classList.remove('is-testing');
        }
        setStatus(`${controlMap.size} controls ready`);
    }

    function setPanelOpen(open) {
        panel.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        if (open) {
            const api = getApi();
            if (api) {
                api.setRigTestMode(true);
                resetUi();
            }
        } else {
            resetUi();
            getApi()?.setRigTestMode(false);
        }
    }

    async function testAll() {
        if (autoTestRunning || !getApi()) return;
        autoTestRunning = true;
        resetUi();
        autoTestRunning = true;
        const allControls = [...controlMap.values()];

        for (let index = 0; index < allControls.length; index++) {
            if (!autoTestRunning) break;
            const control = allControls[index];
            const row = document.querySelector(`[data-rig-test-row="${control.id}"]`);
            const slider = document.querySelector(`[data-rig-test-control="${control.id}"]`);
            const testValue = control.min < 0 ? control.max * 0.7 : 0.78;
            setStatus(`Testing ${index + 1}/${allControls.length}: ${control.label}`);
            row?.classList.add('is-testing');
            if (slider) slider.value = String(testValue);
            applyControl(control, testValue);
            await new Promise((resolve) => window.setTimeout(resolve, 230));
            if (slider) slider.value = '0';
            applyControl(control, 0);
            row?.classList.remove('is-testing');
            await new Promise((resolve) => window.setTimeout(resolve, 60));
        }

        if (autoTestRunning) {
            setStatus(`PASS: ${allControls.length} controls exercised`);
        }
        autoTestRunning = false;
    }

    controlsRoot.addEventListener('input', (event) => {
        const control = controlMap.get(event.target?.dataset?.rigTestControl);
        if (!control) return;
        if (!applyControl(control, event.target.value)) {
            setStatus('Model is not ready', 'error');
        }
    });
    toggle.addEventListener('click', () => setPanelOpen(panel.hidden));
    close.addEventListener('click', () => setPanelOpen(false));
    document.getElementById('rig-test-reset').addEventListener('click', resetUi);
    document.getElementById('rig-test-all').addEventListener('click', testAll);

    createControls();

    const readyTimer = window.setInterval(() => {
        const api = getApi();
        const debug = api?.getState?.();
        if (!api || !debug?.face?.channels) return;
        window.clearInterval(readyTimer);
        setStatus(`${debug.face.channels} face channels linked`);
        toggle.disabled = false;
    }, 200);
    toggle.disabled = true;
})();
