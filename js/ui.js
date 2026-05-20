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

export function initSimulatorUI() {
    const memRows = document.getElementById('sim-memory-rows');
    const logRows = document.getElementById('sim-log-rows');

    if (!memRows || !logRows) {
        return;
    }

    let uiPollTimer = null;

    const pushLog = (line) => {
        const row = document.createElement('div');
        row.className = 'sim-log-row';
        row.textContent = line;
        logRows.prepend(row);

        while (logRows.children.length > 80) {
            logRows.removeChild(logRows.lastChild);
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

    const renderMemory = (state) => {
        memRows.innerHTML = '';
        const rowsToRender = 64;

        for (let addr = 0; addr < rowsToRender; addr += 1) {
            const word = state.memory[addr];
            const left = extractLeft(word);
            const right = extractRight(word);

            const row = document.createElement('div');
            row.className = 'sim-memory-row';
            if (state.pc.addr === addr) {
                row.classList.add(state.pc.side === 'left' ? 'pc-left' : 'pc-right');
            }

            const a = document.createElement('span');
            a.textContent = String(addr).padStart(3, '0');
            const hex = document.createElement('code');
            hex.textContent = toHex40(word);
            const leftTxt = document.createElement('span');
            leftTxt.textContent = opcodeLabel(left.opcode, left.address);
            const rightTxt = document.createElement('span');
            rightTxt.textContent = opcodeLabel(right.opcode, right.address);

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
        }
        if (machine.state === 'error' && machine.error) {
            pushLog(`ERROR: ${machine.error}`);
        }
    };

    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', fn);
        }
    };

    bind('sim-btn-power', async () => {
        if (machine.state === 'off') {
            pushLog('POWER ON: warming up');
            await powerOn();
            pushLog('READY');
        } else {
            powerOff();
            pushLog('POWER OFF');
            if (uiPollTimer) {
                clearInterval(uiPollTimer);
                uiPollTimer = null;
            }
        }
        renderAll();
    });

    bind('sim-btn-load', () => {
        if (machine.state === 'off') {
            return;
        }
        reset();
        loadProgram(buildSampleProgram());
        pushLog('Program loaded: Add Two Numbers');
        renderAll();
    });

    bind('sim-btn-step', () => {
        if (machine.state === 'off') {
            return;
        }
        doStep();
    });

    bind('sim-btn-run', () => {
        if (machine.state === 'off') {
            return;
        }
        run(1);
        pushLog('RUN');

        if (uiPollTimer) {
            clearInterval(uiPollTimer);
        }

        uiPollTimer = setInterval(() => {
            renderAll();
            if (machine.state === 'halted' || machine.state === 'error' || machine.state === 'off') {
                clearInterval(uiPollTimer);
                uiPollTimer = null;
                pushLog(`STOP: state=${machine.state}`);
            }
        }, 100);
    });

    bind('sim-btn-stop', () => {
        stop();
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
        reset();
        pushLog('RESET');
        renderAll();
    });

    pushLog('Simulator UI initialized');
    renderAll();
}
