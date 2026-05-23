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

        // Rich machine hum: 50Hz fundamental + harmonics + slight LFO modulation
        const freqs =  [50,   100,  150,  200,  300,  600 ];
        const gains =  [0.04, 0.02, 0.012, 0.008, 0.004, 0.002];
        const types =  ['sine','triangle','sine','triangle','sine','sine'];

        freqs.forEach((f, i) => {
            const osc = audioContext.createOscillator();
            const amp = audioContext.createGain();
            osc.type = types[i];
            osc.frequency.setValueAtTime(f, now());
            amp.gain.value = gains[i];
            osc.connect(amp);
            amp.connect(humBus);
            osc.start();
            humOscillators.push(osc);
        });

        // LFO for subtle amplitude wobble (transformer vibration feel)
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.3; // slow wobble
        lfoGain.gain.value = 0.15; // modulation depth
        lfo.connect(lfoGain);
        lfoGain.connect(humBus.gain);
        lfo.start();
        humOscillators.push(lfo);

        humBus.gain.cancelScheduledValues(now());
        humBus.gain.setTargetAtTime(0.85, now(), 0.4);
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

    /**
     * Power-on startup: big electric machine starting up.
     * 1. Relay clunk (low thud)
     * 2. Transformer inrush whine (rising pitch)
     * 3. Capacitor charging rumble
     * 4. Crossfade into steady idle hum
     */
    function playPowerOnStartup() {
        if (!audioContext || !masterGain) return;

        const t0 = now();

        // 1. Relay clunk — heavy mechanical thud
        const clunkOsc = audioContext.createOscillator();
        const clunkGain = audioContext.createGain();
        const clunkFilter = audioContext.createBiquadFilter();
        clunkOsc.type = 'sawtooth';
        clunkOsc.frequency.setValueAtTime(45, t0);
        clunkOsc.frequency.exponentialRampToValueAtTime(20, t0 + 0.15);
        clunkFilter.type = 'lowpass';
        clunkFilter.frequency.value = 120;
        clunkGain.gain.setValueAtTime(0.0001, t0);
        clunkGain.gain.linearRampToValueAtTime(0.4, t0 + 0.01);
        clunkGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
        clunkOsc.connect(clunkFilter);
        clunkFilter.connect(clunkGain);
        clunkGain.connect(masterGain);
        clunkOsc.start(t0);
        clunkOsc.stop(t0 + 0.3);

        // 2. Transformer inrush whine — rising from ~80Hz to ~200Hz over 1.5s
        const whineOsc = audioContext.createOscillator();
        const whineGain = audioContext.createGain();
        whineOsc.type = 'sawtooth';
        whineOsc.frequency.setValueAtTime(60, t0 + 0.1);
        whineOsc.frequency.exponentialRampToValueAtTime(180, t0 + 1.2);
        whineOsc.frequency.exponentialRampToValueAtTime(120, t0 + 2.0);
        whineGain.gain.setValueAtTime(0.0001, t0 + 0.1);
        whineGain.gain.linearRampToValueAtTime(0.12, t0 + 0.5);
        whineGain.gain.setValueAtTime(0.12, t0 + 1.2);
        whineGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5);
        whineOsc.connect(whineGain);
        whineGain.connect(masterGain);
        whineOsc.start(t0 + 0.1);
        whineOsc.stop(t0 + 2.6);

        // 3. Capacitor charge rumble — deep growl building up
        const rumbleOsc = audioContext.createOscillator();
        const rumbleOsc2 = audioContext.createOscillator();
        const rumbleGain = audioContext.createGain();
        const rumbleFilter = audioContext.createBiquadFilter();
        rumbleOsc.type = 'triangle';
        rumbleOsc.frequency.setValueAtTime(30, t0 + 0.05);
        rumbleOsc.frequency.linearRampToValueAtTime(50, t0 + 1.5);
        rumbleOsc2.type = 'sine';
        rumbleOsc2.frequency.setValueAtTime(100, t0 + 0.05);
        rumbleOsc2.frequency.linearRampToValueAtTime(100, t0 + 2.0);
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 200;
        rumbleGain.gain.setValueAtTime(0.0001, t0 + 0.05);
        rumbleGain.gain.linearRampToValueAtTime(0.18, t0 + 0.8);
        rumbleGain.gain.setValueAtTime(0.18, t0 + 1.5);
        rumbleGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
        rumbleOsc.connect(rumbleFilter);
        rumbleOsc2.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(masterGain);
        rumbleOsc.start(t0 + 0.05);
        rumbleOsc2.start(t0 + 0.05);
        rumbleOsc.stop(t0 + 3.0);
        rumbleOsc2.stop(t0 + 3.0);

        // 4. Second relay click at ~0.4s (contactors engaging)
        const click2Osc = audioContext.createOscillator();
        const click2Gain = audioContext.createGain();
        click2Osc.type = 'square';
        click2Osc.frequency.setValueAtTime(90, t0 + 0.4);
        click2Osc.frequency.exponentialRampToValueAtTime(30, t0 + 0.5);
        click2Gain.gain.setValueAtTime(0.0001, t0 + 0.4);
        click2Gain.gain.linearRampToValueAtTime(0.2, t0 + 0.41);
        click2Gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
        click2Osc.connect(click2Gain);
        click2Gain.connect(masterGain);
        click2Osc.start(t0 + 0.4);
        click2Osc.stop(t0 + 0.6);

        // 5. High-voltage whine — thin electrical sizzle
        const sizzleOsc = audioContext.createOscillator();
        const sizzleGain = audioContext.createGain();
        sizzleOsc.type = 'sawtooth';
        sizzleOsc.frequency.setValueAtTime(2400, t0 + 0.8);
        sizzleOsc.frequency.exponentialRampToValueAtTime(4200, t0 + 1.5);
        sizzleOsc.frequency.exponentialRampToValueAtTime(3600, t0 + 2.5);
        sizzleGain.gain.setValueAtTime(0.0001, t0 + 0.8);
        sizzleGain.gain.linearRampToValueAtTime(0.015, t0 + 1.5);
        sizzleGain.gain.setValueAtTime(0.015, t0 + 2.0);
        sizzleGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.0);
        sizzleOsc.connect(sizzleGain);
        sizzleGain.connect(masterGain);
        sizzleOsc.start(t0 + 0.8);
        sizzleOsc.stop(t0 + 3.1);
    }

    /**
     * Power-off wind-down: machine powering off.
     */
    function playPowerOffSound() {
        if (!audioContext || !masterGain) return;

        const t0 = now();

        // Descending whine
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t0);
        osc.frequency.exponentialRampToValueAtTime(30, t0 + 1.2);
        gain.gain.setValueAtTime(0.1, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t0);
        osc.stop(t0 + 1.6);

        // Final relay clunk
        const clk = audioContext.createOscillator();
        const clkG = audioContext.createGain();
        clk.type = 'square';
        clk.frequency.setValueAtTime(60, t0 + 0.3);
        clk.frequency.exponentialRampToValueAtTime(20, t0 + 0.45);
        clkG.gain.setValueAtTime(0.0001, t0 + 0.3);
        clkG.gain.linearRampToValueAtTime(0.25, t0 + 0.31);
        clkG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        clk.connect(clkG);
        clkG.connect(masterGain);
        clk.start(t0 + 0.3);
        clk.stop(t0 + 0.55);
    }

    window.VEIZACAudio = {
        ensureAudioReady,
        setMasterVolume,
        toggleMute,
        isMuted,
        startIdleHum,
        stopIdleHum,
        playPowerOnStartup,
        playPowerOffSound,
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
