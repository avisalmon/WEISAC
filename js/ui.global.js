(function () {
    function toHex40(value) {
        const masked = value & 0xFFFFFFFFFFn;
        return masked.toString(16).toUpperCase().padStart(10, '0');
    }

    function toBin40(value) {
        const masked = value & 0xFFFFFFFFFFn;
        return masked.toString(2).padStart(40, '0');
    }

    function toSigned40(value) {
        const masked = value & 0xFFFFFFFFFFn;
        if (masked >= (1n << 39n)) {
            return (masked - (1n << 40n)).toString();
        }
        return masked.toString();
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

    function initSimulatorUI() {
        const sim = window.VEIZACSimulator;
        const audio = window.VEIZACAudio;
        const tape = window.VEIZACTape;

        if (!sim || !audio) {
            return;
        }

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

        if (tapeStrip && tape && typeof tape.setTapeContainer === 'function') {
            tape.setTapeContainer(tapeStrip);
        }

        let uiPollTimer = null;
        let runAborted = false;
        let authenticMode = true;

        try {
            const savedAuthentic = localStorage.getItem('veizac.authenticMode');
            authenticMode = savedAuthentic === null ? true : savedAuthentic === '1';
        } catch (e) {
            authenticMode = true;
        }

        const syncMuteButton = () => {
            const muteBtn = document.getElementById('sim-btn-mute');
            if (!muteBtn) {
                return;
            }
            const muted = audio.isMuted();
            muteBtn.classList.toggle('muted', muted);
            muteBtn.textContent = muted ? 'UNMUTE' : 'MUTE';
        };

        const activateAudio = async () => {
            try {
                await audio.ensureAudioReady();
                return true;
            } catch (e) {
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

            while (logRows.children.length > 1000) {
                logRows.removeChild(logRows.lastChild);
            }
        };

        const formatTraceLine = (trace) => {
            const pc = `[${String(trace.pc.addr).padStart(3, '0')} ${trace.pc.side === 'left' ? 'L' : 'R'}]`;
            const mnem = trace.mnemonic.padEnd(18);
            const acHex = trace.ac.toString(16).toUpperCase().padStart(10, '0');
            const mqHex = trace.mq.toString(16).toUpperCase().padStart(10, '0');
            return `${pc}\t${mnem}\tAC=${acHex}\tMQ=${mqHex}`;
        };

        const scrollToAddress = (addr) => {
            const rowHeight = 24;
            memRows.scrollTop = Math.max(0, addr * rowHeight - memRows.clientHeight / 2);
        };

        const renderRegisters = (state) => {
            const ac = document.getElementById('sim-reg-ac');
            const mq = document.getElementById('sim-reg-mq');
            const pc = document.getElementById('sim-reg-pc');
            const regState = document.getElementById('sim-reg-state');
            const acDec = document.getElementById('sim-reg-ac-dec');
            const mqDec = document.getElementById('sim-reg-mq-dec');
            if (!ac || !mq || !pc || !regState) {
                return;
            }

            ac.textContent = toHex40(state.ac);
            ac.title = toBin40(state.ac);
            mq.textContent = toHex40(state.mq);
            mq.title = toBin40(state.mq);
            pc.textContent = formatPc(state.pc);
            regState.textContent = state.state;
            if (acDec) { acDec.textContent = toSigned40(state.ac); }
            if (mqDec) { mqDec.textContent = toSigned40(state.mq); }
        };

        const renderLights = (state) => {
            const set = (id, on, blink = false) => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.toggle('on', on);
                    el.classList.toggle('blink', blink);
                }
            };

            set('light-power', state.state !== 'off');
            set('light-halt', state.state === 'halted');
            set('light-error', state.state === 'error');
            set('light-left', state.pc.side === 'left');
            set('light-right', state.pc.side === 'right');
        };

        let loadFlashAddr = null;
        let builderTargetAddr = null;
        const breakpoints = new Set();

        // Speed dial: 5 positions
        const SPEED_SETTINGS = [
            { label: 'OBSERVE', delay: 200 },
            { label: '1955 FEEL', delay: 50 },
            { label: '10x', delay: 5 },
            { label: '100x', delay: 0.5 },
            { label: 'MAX', delay: 0 }
        ];
        let speedIndex = 1;
        const getSpeedDelay = () => SPEED_SETTINGS[speedIndex].delay;

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
            } catch (e) {
                // Ignore persistence failures in restricted contexts.
            }
        };

        const renderMemory = (state) => {
            const scrollTop = memRows.scrollTop;
            const rowHeight = 24;
            const containerHeight = memRows.clientHeight || 400;
            const visibleCount = Math.ceil(containerHeight / rowHeight) + 4;
            const startAddr = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
            const endAddr = Math.min(1024, startAddr + visibleCount);

            // Spacer for full scroll height
            let spacer = memRows.querySelector('.mem-spacer');
            if (!spacer) {
                spacer = document.createElement('div');
                spacer.className = 'mem-spacer';
                spacer.style.height = `${1024 * rowHeight}px`;
                spacer.style.position = 'relative';
                memRows.appendChild(spacer);
            }
            spacer.querySelectorAll('.sim-memory-row').forEach((r) => r.remove());

            for (let addr = startAddr; addr < endAddr; addr += 1) {
                const word = state.memory[addr];
                const left = sim.extractLeft(word);
                const right = sim.extractRight(word);

                const row = document.createElement('div');
                row.className = 'sim-memory-row';
                row.dataset.addr = String(addr);
                row.style.position = 'absolute';
                row.style.top = `${addr * rowHeight}px`;
                row.style.left = '0';
                row.style.right = '0';
                row.style.height = `${rowHeight}px`;

                if (state.pc.addr === addr) {
                    row.classList.add(state.pc.side === 'left' ? 'pc-left' : 'pc-right');
                }
                if (loadFlashAddr === addr) {
                    row.classList.add('load-flash');
                }
                if (builderTargetAddr === addr) {
                    row.classList.add('builder-target');
                }
                if (breakpoints.has(addr)) {
                    row.classList.add('breakpoint');
                }

                row.addEventListener('click', (e) => {
                    if (e.shiftKey) {
                        if (breakpoints.has(addr)) { breakpoints.delete(addr); }
                        else { breakpoints.add(addr); }
                        renderMemory(sim.getState());
                        return;
                    }
                    builderTargetAddr = addr;
                    renderMemory(sim.getState());
                    document.dispatchEvent(new CustomEvent('veizac:builder-target', { detail: addr }));
                });

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
                spacer.appendChild(row);
            }
        };

        const renderAll = () => {
            const state = sim.getState();
            renderRegisters(state);
            renderLights(state);
            renderMemory(state);
        };

        const doStep = () => {
            const trace = sim.step();
            renderAll();
            if (trace) {
                pushLog(formatTraceLine(trace));
                audio.playStepClick();
                if (trace.memWrite) {
                    audio.playMemoryTick();
                }
            }
            if (sim.machine.state === 'error' && sim.machine.error) {
                audio.playErrorBuzzer();
                pushLog(`ERROR: ${sim.machine.error}`);
            }
        };

        const performLoadSequence = async (words, label, skipAnimation) => {
            if (sim.machine.state === 'off') {
                pushLog('LOAD blocked: power is off');
                return false;
            }

            if (skipAnimation) {
                pushLog('LOAD: skipping tape animation');
            } else {
                pushLog('LOAD: punch and feed tape');
            }

            if (tape && typeof tape.runTapeLoadSequence === 'function') {
                await tape.runTapeLoadSequence(words, {
                    skip: skipAnimation,
                    onPunch: audio.playTapePunch,
                    onFeed: audio.playTapeRead,
                    showHelp: !authenticMode
                });
            } else {
                audio.playTapePunch();
                audio.playTapeRead();
            }

            sim.reset();
            if (skipAnimation) {
                sim.loadProgram(words);
                renderAll();
            } else {
                for (const word of words) {
                    sim.machine.memory[word.addr & 0x3FF] = BigInt(word.value);
                    loadFlashAddr = word.addr & 0x3FF;
                    audio.playMemoryTick();
                    renderAll();
                    await delay(120);
                }
                loadFlashAddr = null;
                audio.playButtonClick();
            }
            pushLog(`Program loaded: ${label}`);
            audio.startIdleHum();
            renderAll();
            return true;
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
            audio.playButtonClick();
            await activateAudio();
            const powerBtn = document.getElementById('sim-btn-power');
            if (sim.machine.state === 'off') {
                pushLog('POWER ON: warming up');
                if (powerBtn) { powerBtn.classList.add('powered'); }
                // Flicker lights sequentially
                const lights = ['light-power', 'light-halt', 'light-left', 'light-right'];
                for (const id of lights) {
                    const el = document.getElementById(id);
                    if (el) { el.classList.add('on'); }
                    await delay(250);
                    if (el && id !== 'light-power') { el.classList.remove('on'); }
                }
                await sim.powerOn();
                audio.playPowerOnStartup();
                audio.startIdleHum();
                pushLog('READY');
            } else {
                sim.powerOff();
                if (powerBtn) { powerBtn.classList.remove('powered'); }
                audio.stopRunClicks();
                audio.stopIdleHum();
                audio.playPowerOffSound();
                if (tape && tape.renderTapeFromMemory) { tape.renderTapeFromMemory(sim.machine.memory); }
                pushLog('POWER OFF');
                if (uiPollTimer) {
                    clearInterval(uiPollTimer);
                    uiPollTimer = null;
                }
            }
            renderAll();
        });

        let lastLoadClick = 0;
        bind('sim-btn-load', async () => {
            if (sim.machine.state === 'off') {
                return;
            }
            audio.playButtonClick();
            runAborted = false;

            const now = Date.now();
            const isDoubleClick = (now - lastLoadClick) < 400;
            lastLoadClick = now;

            if (isDoubleClick) {
                pushLog('TAPE LOADED (skip)');
                renderAll();
                return;
            }

            // Animate tape feed (data already in memory from Builder pokes)
            pushLog('LOADING TAPE...');
            audio.startRunClicks(20);
            if (tape && tape.animateLoad) {
                await tape.animateLoad([], () => {
                    if (!runAborted) {
                        audio.playMemoryTick();
                    }
                });
            }
            audio.stopRunClicks();

            if (!runAborted) {
                pushLog('TAPE LOADED');
                audio.playButtonClick();
            }
            renderAll();
        });

        bind('sim-btn-step', () => {
            if (sim.machine.state === 'off') {
                return;
            }
            audio.playButtonClick();
            doStep();
        });

        bind('sim-btn-run', async () => {
            if (sim.machine.state === 'off') {
                return;
            }
            audio.playButtonClick();
            runAborted = false;

            // Jump to address 0 and execute at speed-dial rate
            sim.machine.pc = { addr: 0, side: 'left' };
            sim.machine.state = 'ready';
            sim.machine.error = null;
            renderAll();
            pushLog('RUN');
            audio.startRunClicks(20);
            const execDelay = (ms) => ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();

            while (!runAborted && sim.machine.state !== 'halted' && sim.machine.state !== 'error' && sim.machine.state !== 'off') {
                const trace = sim.step();
                const currentDelay = getSpeedDelay();
                if (currentDelay >= 5) { renderAll(); }
                if (trace) {
                    pushLog(formatTraceLine(trace));
                    if (breakpoints.has(trace.pc.addr)) {
                        pushLog(`BREAKPOINT at ${String(trace.pc.addr).padStart(3, '0')}`);
                        runAborted = true;
                        break;
                    }
                }
                if (sim.machine.state === 'error' && sim.machine.error) {
                    audio.playErrorBuzzer();
                    pushLog(`ERROR: ${sim.machine.error}`);
                    break;
                }
                await execDelay(currentDelay);
            }

            audio.stopRunClicks();
            if (sim.machine.state === 'halted') {
                audio.playHaltSound();
                audio.stopIdleHum();
                pushLog('HALT');
            } else if (runAborted) {
                pushLog('STOP (user)');
            }
            renderAll();
        });

        bind('sim-btn-stop', () => {
            audio.playButtonClick();
            runAborted = true;
            sim.stop();
            audio.stopRunClicks();
            audio.playHaltSound();
            audio.stopIdleHum();
            if (uiPollTimer) {
                clearInterval(uiPollTimer);
                uiPollTimer = null;
            }
            pushLog('STOP');
            renderAll();
        });

        bind('sim-btn-reset', () => {
            if (sim.machine.state === 'off') {
                return;
            }
            audio.playButtonClick();
            // Reset only zeroes PC, memory preserved
            sim.machine.pc = { addr: 0, side: 'left' };
            sim.machine.state = 'ready';
            sim.machine.error = null;
            sim.machine.ac = 0n;
            sim.machine.mq = 0n;
            audio.startIdleHum();
            pushLog('RESET (PC=0, memory preserved)');
            renderAll();
        });

        bind('sim-btn-clear', () => {
            if (sim.machine.state === 'off') {
                return;
            }
            audio.playButtonClick();
            for (let i = 0; i < sim.machine.memory.length; i += 1) {
                sim.machine.memory[i] = 0n;
            }
            sim.machine.pc = { addr: 0, side: 'left' };
            sim.machine.state = 'ready';
            sim.machine.error = null;
            sim.machine.ac = 0n;
            sim.machine.mq = 0n;
            if (tape && tape.renderTapeFromMemory) { tape.renderTapeFromMemory(sim.machine.memory); }
            pushLog('MEMORY CLEARED');
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
                audio.setMasterVolume(volumeSlider.value);
            });
            audio.setMasterVolume(volumeSlider.value);
        }

        bind('sim-btn-mute', async () => {
            await activateAudio();
            audio.playButtonClick();
            audio.toggleMute();
            syncMuteButton();
        });

        if (authenticButton) {
            authenticButton.addEventListener('click', () => {
                audio.playButtonClick();
                authenticMode = !authenticMode;
                applyAuthenticMode();
                renderAll();
                pushLog(authenticMode ? 'AUTHENTIC MODE ON' : 'AUTHENTIC MODE OFF');
            });
        }

        document.addEventListener('veizac:load-program', async (event) => {
            const detail = event.detail || {};
            const words = Array.isArray(detail.words) ? detail.words : null;
            const label = typeof detail.label === 'string' && detail.label.trim() ? detail.label.trim() : 'Custom Program';
            if (!words || words.length === 0) {
                pushLog('LOAD blocked: no program words supplied');
                return;
            }
            await performLoadSequence(words, label, true);
        });

        window.VEIZACPanelAPI = {
            loadCustomProgram: async (words, label) => performLoadSequence(words, label || 'Custom Program', true),
            getMachineState: () => sim.getState(),
            setBuilderTarget: (addr) => {
                builderTargetAddr = addr === null ? null : (addr & 0x3FF);
                renderAll();
                if (builderTargetAddr !== null) {
                    scrollToAddress(builderTargetAddr);
                }
            },
            getBuilderTarget: () => builderTargetAddr,
            pokeHalf: (addr, side, opcode, address) => {
                const a = addr & 0x3FF;
                const half = (BigInt(opcode & 0xFF) << 12n) | BigInt(address & 0xFFF);
                if (side === 'left') {
                    sim.machine.memory[a] = (sim.machine.memory[a] & 0xFFFFFn) | (half << 20n);
                } else {
                    sim.machine.memory[a] = (sim.machine.memory[a] & 0xFFFFF00000n) | half;
                }
                loadFlashAddr = a;
                renderAll();
                scrollToAddress(a);
                if (tape && tape.renderTapeFromMemory) { tape.renderTapeFromMemory(sim.machine.memory); }
                setTimeout(() => { loadFlashAddr = null; renderAll(); }, 400);
            },
            pokeWord: (addr, value) => {
                const a = addr & 0x3FF;
                sim.machine.memory[a] = BigInt(value) & 0xFFFFFFFFFFn;
                loadFlashAddr = a;
                renderAll();
                scrollToAddress(a);
                if (tape && tape.renderTapeFromMemory) { tape.renderTapeFromMemory(sim.machine.memory); }
                setTimeout(() => { loadFlashAddr = null; renderAll(); }, 400);
            }
        };

        document.addEventListener('keydown', (event) => {
            const key = (event.key || '').toLowerCase();
            const tag = (document.activeElement || {}).tagName || '';
            const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            if (key === 'm' && !inInput) {
                audio.toggleMute();
                syncMuteButton();
                return;
            }
            if (inInput) { return; }

            if (key === 't') {
                const overlay = document.getElementById('sim-tools-overlay');
                if (overlay) { overlay.classList.toggle('collapsed'); }
            } else if (key === ' ') {
                event.preventDefault();
                if (sim.machine.state === 'running') {
                    document.getElementById('sim-btn-stop')?.click();
                } else {
                    document.getElementById('sim-btn-step')?.click();
                }
            } else if (key === 'enter') {
                event.preventDefault();
                document.getElementById('sim-btn-run')?.click();
            } else if (key === 'r') {
                document.getElementById('sim-btn-reset')?.click();
            } else if (key === 'b') {
                if (builderTargetAddr !== null) {
                    if (breakpoints.has(builderTargetAddr)) { breakpoints.delete(builderTargetAddr); }
                    else { breakpoints.add(builderTargetAddr); }
                    renderAll();
                }
            } else if (key === 'arrowup') {
                event.preventDefault();
                memRows.scrollTop = Math.max(0, memRows.scrollTop - 24);
            } else if (key === 'arrowdown') {
                event.preventDefault();
                memRows.scrollTop += 24;
            } else if (key === 'escape') {
                const overlay = document.getElementById('sim-tools-overlay');
                if (overlay && !overlay.classList.contains('collapsed')) {
                    overlay.classList.add('collapsed');
                }
            }
        });

        // Speed dial
        const speedKnob = document.getElementById('sim-speed-knob');
        const speedLabel = document.getElementById('sim-speed-label');
        if (speedKnob) {
            speedKnob.addEventListener('input', () => {
                speedIndex = Number(speedKnob.value);
                if (speedLabel) { speedLabel.textContent = SPEED_SETTINGS[speedIndex].label; }
            });
        }

        // Virtual scroll for memory
        memRows.addEventListener('scroll', () => {
            renderMemory(sim.getState());
        });

        syncMuteButton();
        applyAuthenticMode();

        pushLog('Simulator UI initialized');
        renderAll();
    }

    window.VEIZACUI = {
        initSimulatorUI
    };
})();
