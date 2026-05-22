(function () {
    let audioContext = null;
    let masterGain = null;
    let humBus = null;
    let humOscillators = [];
    let runTickTimer = null;
    let muted = false;
    let masterVolume = 0.35;

    function now() {
        return audioContext ? audioContext.currentTime : 0;
    }

    function applyMasterLevel() {
        if (!masterGain || !audioContext) {
            return;
        }
        const target = muted ? 0 : masterVolume;
        masterGain.gain.cancelScheduledValues(now());
        masterGain.gain.setTargetAtTime(target, now(), 0.03);
    }

    async function ensureAudioReady() {
        if (!audioContext) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) {
                throw new Error('Web Audio API is unavailable');
            }

            audioContext = new Ctx();
            masterGain = audioContext.createGain();
            masterGain.gain.value = masterVolume;
            masterGain.connect(audioContext.destination);

            humBus = audioContext.createGain();
            humBus.gain.value = 0;
            humBus.connect(masterGain);
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        applyMasterLevel();
        return true;
    }

    function oneShot(opts) {
        const options = opts || {};
        const type = options.type || 'sine';
        const frequency = options.frequency || 440;
        const gain = options.gain === undefined ? 0.2 : options.gain;
        const attack = options.attack === undefined ? 0.002 : options.attack;
        const hold = options.hold === undefined ? 0.03 : options.hold;
        const release = options.release === undefined ? 0.06 : options.release;

        if (!audioContext || !masterGain) {
            return;
        }

        const osc = audioContext.createOscillator();
        const amp = audioContext.createGain();
        const t0 = now();
        const t1 = t0 + attack;
        const t2 = t1 + hold;
        const t3 = t2 + release;

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, t0);

        amp.gain.setValueAtTime(0.0001, t0);
        amp.gain.linearRampToValueAtTime(gain, t1);
        amp.gain.linearRampToValueAtTime(gain * 0.5, t2);
        amp.gain.exponentialRampToValueAtTime(0.0001, t3);

        osc.connect(amp);
        amp.connect(masterGain);

        osc.start(t0);
        osc.stop(t3 + 0.01);
    }

    function setMasterVolume(percent) {
        const p = Math.max(0, Math.min(100, Number(percent)));
        masterVolume = p / 100;
        applyMasterLevel();
    }

    function toggleMute(forceMute) {
        muted = typeof forceMute === 'boolean' ? forceMute : !muted;
        applyMasterLevel();
        return muted;
    }

    function isMuted() {
        return muted;
    }

    function startIdleHum() {
        if (!audioContext || !humBus) {
            return;
        }
        if (humOscillators.length > 0) {
            return;
        }

        const freqs = [50, 100, 150];
        const gains = [0.03, 0.015, 0.008];

        freqs.forEach((f, i) => {
            const osc = audioContext.createOscillator();
            const amp = audioContext.createGain();
            osc.type = i === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(f, now());
            amp.gain.value = gains[i];
            osc.connect(amp);
            amp.connect(humBus);
            osc.start();
            humOscillators.push(osc);
        });

        humBus.gain.cancelScheduledValues(now());
        humBus.gain.setTargetAtTime(0.85, now(), 0.2);
    }

    function stopIdleHum() {
        if (!audioContext || !humBus) {
            return;
        }

        humBus.gain.cancelScheduledValues(now());
        humBus.gain.setTargetAtTime(0.0001, now() + 0.2, 0.1);

        const oscillators = humOscillators;
        humOscillators = [];

        setTimeout(() => {
            oscillators.forEach((osc) => {
                try {
                    osc.stop();
                    osc.disconnect();
                } catch (e) {
                    // Ignore stale node stop/disconnect errors.
                }
            });
        }, 700);
    }

    function playStepClick() {
        oneShot({ type: 'square', frequency: 1300, gain: 0.17, hold: 0.02, release: 0.05 });
    }

    function playRunTick(rateHint) {
        const rate = rateHint === undefined ? 20 : rateHint;
        const f = Math.max(900, Math.min(2200, 900 + rate * 12));
        oneShot({ type: 'square', frequency: f, gain: 0.11, hold: 0.012, release: 0.03 });
    }

    function startRunClicks(rateHint) {
        const rate = rateHint === undefined ? 20 : rateHint;
        stopRunClicks();
        const interval = Math.max(25, Math.min(180, Math.round(800 / Math.max(1, rate))));
        runTickTimer = setInterval(() => playRunTick(rate), interval);
    }

    function stopRunClicks() {
        if (runTickTimer) {
            clearInterval(runTickTimer);
            runTickTimer = null;
        }
    }

    function playTapeRead() {
        oneShot({ type: 'triangle', frequency: 1800, gain: 0.08, hold: 0.015, release: 0.03 });
    }

    function playTapePunch() {
        oneShot({ type: 'sawtooth', frequency: 280, gain: 0.14, hold: 0.03, release: 0.06 });
    }

    function playHaltSound() {
        oneShot({ type: 'triangle', frequency: 420, gain: 0.16, hold: 0.05, release: 0.1 });
        setTimeout(() => oneShot({ type: 'triangle', frequency: 260, gain: 0.14, hold: 0.05, release: 0.12 }), 70);
    }

    function playErrorBuzzer() {
        oneShot({ type: 'square', frequency: 180, gain: 0.22, hold: 0.12, release: 0.08 });
    }

    function playButtonClick() {
        oneShot({ type: 'triangle', frequency: 620, gain: 0.08, hold: 0.02, release: 0.03 });
    }

    function playMemoryTick() {
        oneShot({ type: 'sine', frequency: 1050, gain: 0.04, hold: 0.01, release: 0.02 });
    }

    window.VEIZACAudio = {
        ensureAudioReady,
        setMasterVolume,
        toggleMute,
        isMuted,
        startIdleHum,
        stopIdleHum,
        playStepClick,
        startRunClicks,
        stopRunClicks,
        playTapeRead,
        playTapePunch,
        playHaltSound,
        playErrorBuzzer,
        playButtonClick,
        playMemoryTick
    };
})();
