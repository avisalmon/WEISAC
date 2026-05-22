import {
    machine,
    powerOn,
    powerOff,
    reset,
    step,
    run,
    stop,
    loadProgram,
    getState,
    extractLeft,
    extractRight
} from './simulator.js';
import {
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
} from './audio.js';
import { setTapeContainer, runTapeLoadSequence } from './tape.js';

function toHex40(value) {
    const masked = value & 0xFFFFFFFFFFn;
    return masked.toString(16).toUpperCase().padStart(10, '0');
}

function formatPc(pc) {
    return `${String(pc.addr).padStart(3, '0')} ${pc.side === 'left' ? 'L' : 'R'}`;
}

function opcodeLabel(opcode, address) {
    const names = {
        0x00: 'HALT',
        0x01: 'LOAD M(X)',
        0x02: 'LOAD -M(X)',
        0x03: 'LOAD |M(X)|',
        0x04: 'LOAD -|M(X)|',
        0x05: 'ADD M(X)',
        0x06: 'SUB M(X)',
        0x07: 'ADD |M(X)|',
        0x08: 'SUB |M(X)|',
        0x09: 'LOAD MQ,M(X)',
        0x0A: 'LOAD MQ',
        0x0B: 'MUL M(X)',
        0x0C: 'DIV M(X)',
        0x0D: 'JUMP+ M(X,0:19)',
        0x0E: 'JUMP+ M(X,20:39)',
        0x0F: 'JUMP M(X,0:19)',
        0x10: 'JUMP M(X,20:39)',
        0x12: 'STOR M(X,8:19)',
        0x13: 'STOR M(X,28:39)',
        0x14: 'LSH',
        0x15: 'RSH',
        0x21: 'STOR M(X)'
    };

    const base = names[opcode] || `OP 0x${opcode.toString(16).padStart(2, '0')}`;
    if (opcode === 0x00 || opcode === 0x0A || opcode === 0x14 || opcode === 0x15) {
        return base;
    }
    return base.replace('X', String(address));
}

function instructionReferencesMemory(opcode) {
    return [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0B, 0x0C, 0x12, 0x13, 0x21].includes(opcode);
}

function instructionHoverText(opcode, address, state) {
    if (!instructionReferencesMemory(opcode)) {
        return '';
    }
    const addr = address & 0x3FF;
    const value = state.memory[addr];
    return `M(${addr}) = ${toHex40(value)} (${value.toString()})`;
}

function buildSampleProgram() {
    const pack = (lOp, lAddr, rOp, rAddr) => (
        (BigInt(lOp & 0xFF) << 32n) |
        (BigInt(lAddr & 0xFFF) << 20n) |
        (BigInt(rOp & 0xFF) << 12n) |
        BigInt(rAddr & 0xFFF)
    );

    return [
        { addr: 0, value: pack(0x01, 100, 0x05, 101) },
        { addr: 1, value: pack(0x21, 102, 0x00, 0) },
        { addr: 100, value: 25n },
        { addr: 101, value: 17n },
        { addr: 102, value: 0n }
    ];
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initSimulatorUI() {
    const memRows = document.getElementById('sim-memory-rows');
    const logRows = document.getElementById('sim-log-rows');
    const tapeStrip = document.getElementById('sim-tape-strip');
    const jumpInput = document.getElementById('sim-memory-jump');
    const jumpButton = document.getElementById('sim-memory-jump-btn');
    const authenticButton = document.getElementById('sim-btn-authentic');
    const simulatorShell = document.querySelector('#tab-simulator .simulator-shell');

    if (!memRows || !logRows) {
        return;
    }

    if (tapeStrip) {
        setTapeContainer(tapeStrip);
    }

    let uiPollTimer = null;
    let authenticMode = true;

    try {
        const savedAuthentic = localStorage.getItem('veizac.authenticMode');
        authenticMode = savedAuthentic === null ? true : savedAuthentic === '1';
    } catch {
        authenticMode = true;
    }

    const syncMuteButton = () => {
        const muteBtn = document.getElementById('sim-btn-mute');
        if (!muteBtn) {
            return;
        }
        const muted = isMuted();
        muteBtn.classList.toggle('muted', muted);
        muteBtn.textContent = muted ? 'UNMUTE' : 'MUTE';
    };

    const activateAudio = async () => {
        try {
            await ensureAudioReady();
            return true;
        } catch {
            return false;
        }
    };

    const pushLog = (line) => {
        if (authenticMode) {
            const compactLine = /^(POWER ON|POWER OFF|READY|RUN|STOP|RESET|ERROR|\[\d{3} [LR]\])/;
            if (!compactLine.test(line)) {
                return;
            }
        }

        const row = document.createElement('div');
        row.className = 'sim-log-row';
        row.textContent = line;
        logRows.prepend(row);

        while (logRows.children.length > 80) {
            logRows.removeChild(logRows.lastChild);
        }
    };

    const scrollToAddress = (addr) => {
        const target = memRows.querySelector(`[data-addr="${addr}"]`);
        if (target) {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    };

    const renderRegisters = (state) => {
        const ac = document.getElementById('sim-reg-ac');
        const mq = document.getElementById('sim-reg-mq');
        const pc = document.getElementById('sim-reg-pc');
        const regState = document.getElementById('sim-reg-state');
        if (!ac || !mq || !pc || !regState) {
            return;
        }

        ac.textContent = toHex40(state.ac);
        mq.textContent = toHex40(state.mq);
        pc.textContent = formatPc(state.pc);
        regState.textContent = state.state;
    };

    const renderLights = (state) => {
        const set = (id, on) => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.toggle('on', on);
            }
        };

        set('light-power', state.state !== 'off');
        set('light-halt', state.state === 'halted');
        set('light-error', state.state === 'error');
        set('light-left', state.pc.side === 'left');
        set('light-right', state.pc.side === 'right');
        set('light-fetch', state.state === 'running' || state.state === 'ready');
        set('light-exec', state.state === 'running' || state.state === 'ready');
        set('light-store', false);
    };

    let loadFlashAddr = null;

    const applyAuthenticMode = () => {
        if (simulatorShell) {
            simulatorShell.classList.toggle('authentic-mode', authenticMode);
        }
        if (authenticButton) {
            authenticButton.textContent = authenticMode ? 'AUTHENTIC: ON' : 'AUTHENTIC: OFF';
            authenticButton.classList.toggle('active', authenticMode);
        }
        try {
            localStorage.setItem('veizac.authenticMode', authenticMode ? '1' : '0');
        } catch {
            // Ignore persistence failures in restricted contexts.
        }
    };

    const renderMemory = (state) => {
        memRows.innerHTML = '';
        const rowsToRender = 128;

        for (let addr = 0; addr < rowsToRender; addr += 1) {
            const word = state.memory[addr];
            const left = extractLeft(word);
            const right = extractRight(word);

            const row = document.createElement('div');
            row.className = 'sim-memory-row';
            row.dataset.addr = String(addr);
            if (state.pc.addr === addr) {
                row.classList.add(state.pc.side === 'left' ? 'pc-left' : 'pc-right');
            }
            if (loadFlashAddr === addr) {
                row.classList.add('load-flash');
            }

            const a = document.createElement('span');
            a.textContent = String(addr).padStart(3, '0');
            const hex = document.createElement('code');
            hex.textContent = toHex40(word);
            const leftTxt = document.createElement('span');
            leftTxt.textContent = opcodeLabel(left.opcode, left.address);
            const leftHover = instructionHoverText(left.opcode, left.address, state);
            if (!authenticMode && leftHover) {
                leftTxt.title = leftHover;
                leftTxt.classList.add('sim-instr-ref');
            }
            const rightTxt = document.createElement('span');
            rightTxt.textContent = opcodeLabel(right.opcode, right.address);
            const rightHover = instructionHoverText(right.opcode, right.address, state);
            if (!authenticMode && rightHover) {
                rightTxt.title = rightHover;
                rightTxt.classList.add('sim-instr-ref');
            }

            row.append(a, hex, leftTxt, rightTxt);
            memRows.appendChild(row);
        }
    };

    const renderAll = () => {
        const state = getState();
        renderRegisters(state);
        renderLights(state);
        renderMemory(state);
    };

    const doStep = () => {
        const trace = step();
        renderAll();
        if (trace) {
            pushLog(`[${String(trace.pc.addr).padStart(3, '0')} ${trace.pc.side === 'left' ? 'L' : 'R'}] ${trace.mnemonic}`);
            playStepClick();
            if (trace.memWrite) {
                playMemoryTick();
            }
        }
        if (machine.state === 'error' && machine.error) {
            playErrorBuzzer();
            pushLog(`ERROR: ${machine.error}`);
        }
    };

    const jumpToMemoryAddress = () => {
        if (!jumpInput) {
            return;
        }
        const parsed = Number.parseInt(jumpInput.value, 10);
        if (Number.isNaN(parsed)) {
            pushLog('Jump: enter address 0-1023');
            return;
        }
        const addr = Math.max(0, Math.min(1023, parsed));
        jumpInput.value = String(addr);
        loadFlashAddr = addr;
        renderAll();
        scrollToAddress(addr);
        pushLog(`Jumped to memory ${String(addr).padStart(3, '0')}`);
        setTimeout(() => {
            loadFlashAddr = null;
            renderAll();
        }, 650);
    };

    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', fn);
        }
    };

    bind('sim-btn-power', async () => {
        playButtonClick();
        await activateAudio();
        if (machine.state === 'off') {
            pushLog('POWER ON: warming up');
            await powerOn();
            startIdleHum();
            pushLog('READY');
        } else {
            powerOff();
            stopRunClicks();
            stopIdleHum();
            pushLog('POWER OFF');
            if (uiPollTimer) {
                clearInterval(uiPollTimer);
                uiPollTimer = null;
            }
        }
        renderAll();
    });

    bind('sim-btn-load', async (event) => {
        if (machine.state === 'off') {
            return;
        }
        playButtonClick();
        const words = buildSampleProgram();
        const skipAnimation = event && event.detail > 1;
        if (skipAnimation) {
            pushLog('LOAD: skipping tape animation');
        } else {
            pushLog('LOAD: punch and feed tape');
        }
        await runTapeLoadSequence(words, {
            skip: skipAnimation,
            onPunch: playTapePunch,
            onFeed: playTapeRead,
            showHelp: !authenticMode
        });

        reset();
        if (skipAnimation) {
            loadProgram(words);
            renderAll();
        } else {
            for (const word of words) {
                machine.memory[word.addr & 0x3FF] = BigInt(word.value);
                loadFlashAddr = word.addr & 0x3FF;
                playMemoryTick();
                renderAll();
                await delay(120);
            }
            loadFlashAddr = null;
            playButtonClick();
        }
        pushLog('Program loaded: Add Two Numbers');
        startIdleHum();
        renderAll();
    });

    bind('sim-btn-step', () => {
        if (machine.state === 'off') {
            return;
        }
        playButtonClick();
        doStep();
    });

    bind('sim-btn-run', () => {
        if (machine.state === 'off') {
            return;
        }
        playButtonClick();
        run(1);
        startRunClicks(20);
        pushLog('RUN');

        if (uiPollTimer) {
            clearInterval(uiPollTimer);
        }

        uiPollTimer = setInterval(() => {
            renderAll();
            if (machine.state === 'halted' || machine.state === 'error' || machine.state === 'off') {
                clearInterval(uiPollTimer);
                uiPollTimer = null;
                stopRunClicks();
                if (machine.state === 'halted') {
                    playHaltSound();
                    stopIdleHum();
                }
                if (machine.state === 'error') {
                    playErrorBuzzer();
                    stopIdleHum();
                }
                pushLog(`STOP: state=${machine.state}`);
            }
        }, 100);
    });

    bind('sim-btn-stop', () => {
        playButtonClick();
        stop();
        stopRunClicks();
        playHaltSound();
        stopIdleHum();
        if (uiPollTimer) {
            clearInterval(uiPollTimer);
            uiPollTimer = null;
        }
        pushLog('STOP');
        renderAll();
    });

    bind('sim-btn-reset', () => {
        if (machine.state === 'off') {
            return;
        }
        playButtonClick();
        reset();
        startIdleHum();
        pushLog('RESET');
        renderAll();
    });

    if (jumpButton) {
        jumpButton.addEventListener('click', jumpToMemoryAddress);
    }
    if (jumpInput) {
        jumpInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                jumpToMemoryAddress();
            }
        });
    }

    const volumeSlider = document.getElementById('sim-audio-volume');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', async () => {
            await activateAudio();
            setMasterVolume(volumeSlider.value);
        });
        setMasterVolume(volumeSlider.value);
    }

    bind('sim-btn-mute', async () => {
        await activateAudio();
        playButtonClick();
        toggleMute();
        syncMuteButton();
    });

    if (authenticButton) {
        authenticButton.addEventListener('click', () => {
            playButtonClick();
            authenticMode = !authenticMode;
            applyAuthenticMode();
            renderAll();
            pushLog(authenticMode ? 'AUTHENTIC MODE ON' : 'AUTHENTIC MODE OFF');
        });
    }

    document.addEventListener('keydown', (event) => {
        if ((event.key || '').toLowerCase() === 'm') {
            toggleMute();
            syncMuteButton();
        }
    });

    syncMuteButton();
    applyAuthenticMode();

    pushLog('Simulator UI initialized');
    renderAll();
}
