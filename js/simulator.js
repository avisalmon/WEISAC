const MEMORY_SIZE = 1024;
const WORD_MASK = 0xFFFFFFFFFFn;
const SIGN_BIT = 1n << 39n;

const OPCODE_NAMES = {
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

let runTimer = null;

export const machine = {
    memory: new Array(MEMORY_SIZE).fill(0n),
    ac: 0n,
    mq: 0n,
    pc: { addr: 0, side: 'left' },
    state: 'off',
    error: null,
    breakpoints: new Set(),
    stepCount: 0
};

export { WORD_MASK };

export function mask40(value) {
    let masked = value & WORD_MASK;
    if ((masked & SIGN_BIT) !== 0n) {
        masked -= 1n << 40n;
    }
    return masked;
}

function toMemAddr(addr) {
    return addr & 0x3FF;
}

function toAddr12(addr) {
    return addr & 0xFFF;
}

function abs40(value) {
    return value < 0n ? -value : value;
}

function formatMnemonic(opcode, operand) {
    const base = OPCODE_NAMES[opcode] || `OP 0x${opcode.toString(16).padStart(2, '0')}`;
    if (opcode === 0x0A || opcode === 0x14 || opcode === 0x15 || opcode === 0x00) {
        return base;
    }
    return base.replace('X', String(operand));
}

export function extractLeft(word) {
    return {
        opcode: Number((word >> 32n) & 0xFFn),
        address: Number((word >> 20n) & 0xFFFn)
    };
}

export function extractRight(word) {
    return {
        opcode: Number((word >> 12n) & 0xFFn),
        address: Number(word & 0xFFFn)
    };
}

function makeTrace(pcBefore, opcode, operand, mnemonic, memRead, memWrite) {
    return {
        pc: { addr: pcBefore.addr, side: pcBefore.side },
        opcode,
        operand,
        mnemonic,
        ac: machine.ac,
        mq: machine.mq,
        memRead,
        memWrite
    };
}

function executeInstruction(opcode, rawAddr) {
    const addr12 = toAddr12(rawAddr);
    const memAddr = toMemAddr(addr12);
    let jumpTaken = false;
    let memRead = null;
    let memWrite = null;

    const readMem = () => {
        const value = machine.memory[memAddr];
        memRead = { addr: memAddr, value };
        return value;
    };

    const writeMem = (value) => {
        const v = mask40(value);
        machine.memory[memAddr] = v;
        memWrite = { addr: memAddr, value: v };
    };

    switch (opcode) {
        case 0x00:
            machine.state = 'halted';
            break;

        case 0x01:
            machine.ac = mask40(readMem());
            break;
        case 0x02:
            machine.ac = mask40(-readMem());
            break;
        case 0x03:
            machine.ac = mask40(abs40(readMem()));
            break;
        case 0x04:
            machine.ac = mask40(-abs40(readMem()));
            break;
        case 0x09:
            machine.mq = mask40(readMem());
            break;
        case 0x0A:
            machine.ac = mask40(machine.mq);
            break;
        case 0x21:
            writeMem(machine.ac);
            break;

        case 0x05:
            machine.ac = mask40(machine.ac + readMem());
            break;
        case 0x06:
            machine.ac = mask40(machine.ac - readMem());
            break;
        case 0x07:
            machine.ac = mask40(machine.ac + abs40(readMem()));
            break;
        case 0x08:
            machine.ac = mask40(machine.ac - abs40(readMem()));
            break;
        case 0x0B: {
            const product = machine.mq * readMem();
            const low = product & WORD_MASK;
            const high = (product >> 40n) & WORD_MASK;
            machine.mq = mask40(low);
            machine.ac = mask40(high);
            break;
        }
        case 0x0C: {
            const divisor = readMem();
            if (divisor === 0n) {
                machine.state = 'error';
                machine.error = `Division by zero at PC=${machine.pc.addr}:${machine.pc.side}`;
                break;
            }
            const quotient = machine.ac / divisor;
            const remainder = machine.ac % divisor;
            machine.mq = mask40(quotient);
            machine.ac = mask40(remainder);
            break;
        }
        case 0x14:
            machine.ac = mask40(machine.ac << 1n);
            break;
        case 0x15:
            machine.ac = mask40(machine.ac >> 1n);
            break;

        case 0x12: {
            const word = machine.memory[memAddr];
            const addrBits = machine.ac & 0xFFFn;
            const cleared = word & ~(0xFFFn << 20n);
            const patched = mask40(cleared | (addrBits << 20n));
            machine.memory[memAddr] = patched;
            memWrite = { addr: memAddr, value: patched };
            memRead = { addr: memAddr, value: word };
            break;
        }
        case 0x13: {
            const word = machine.memory[memAddr];
            const addrBits = machine.ac & 0xFFFn;
            const cleared = word & ~0xFFFn;
            const patched = mask40(cleared | addrBits);
            machine.memory[memAddr] = patched;
            memWrite = { addr: memAddr, value: patched };
            memRead = { addr: memAddr, value: word };
            break;
        }

        case 0x0F:
            machine.pc.addr = toMemAddr(addr12);
            machine.pc.side = 'left';
            jumpTaken = true;
            break;
        case 0x10:
            machine.pc.addr = toMemAddr(addr12);
            machine.pc.side = 'right';
            jumpTaken = true;
            break;
        case 0x0D:
            if (machine.ac >= 0n) {
                machine.pc.addr = toMemAddr(addr12);
                machine.pc.side = 'left';
                jumpTaken = true;
            }
            break;
        case 0x0E:
            if (machine.ac >= 0n) {
                machine.pc.addr = toMemAddr(addr12);
                machine.pc.side = 'right';
                jumpTaken = true;
            }
            break;

        default:
            machine.state = 'error';
            machine.error = `Unknown opcode 0x${opcode.toString(16).padStart(2, '0')} at PC=${machine.pc.addr}:${machine.pc.side}`;
            break;
    }

    return { jumpTaken, memRead, memWrite, addr12 };
}

export function powerOn() {
    if (machine.state === 'ready' || machine.state === 'running' || machine.state === 'halted') {
        return Promise.resolve();
    }

    machine.state = 'booting';
    machine.error = null;

    return new Promise((resolve) => {
        setTimeout(() => {
            if (machine.state === 'booting') {
                machine.state = 'ready';
            }
            resolve();
        }, 2000);
    });
}

export function powerOff() {
    if (runTimer) {
        clearInterval(runTimer);
        runTimer = null;
    }
    machine.memory = new Array(MEMORY_SIZE).fill(0n);
    machine.ac = 0n;
    machine.mq = 0n;
    machine.pc = { addr: 0, side: 'left' };
    machine.state = 'off';
    machine.error = null;
    machine.stepCount = 0;
}

export function reset() {
    if (runTimer) {
        clearInterval(runTimer);
        runTimer = null;
    }

    machine.memory = new Array(MEMORY_SIZE).fill(0n);
    machine.ac = 0n;
    machine.mq = 0n;
    machine.pc = { addr: 0, side: 'left' };
    machine.error = null;
    machine.stepCount = 0;
    machine.state = 'ready';
}

export function step() {
    if (machine.state === 'off' || machine.state === 'booting' || machine.state === 'error') {
        return null;
    }

    if (machine.state === 'halted') {
        return null;
    }

    if (machine.state === 'ready') {
        machine.state = 'running';
    }

    const pcBefore = { addr: machine.pc.addr, side: machine.pc.side };
    const word = machine.memory[machine.pc.addr];
    const instr = machine.pc.side === 'left' ? extractLeft(word) : extractRight(word);

    const { jumpTaken, memRead, memWrite, addr12 } = executeInstruction(instr.opcode, instr.address);

    if (machine.state !== 'error' && machine.state !== 'halted') {
        if (!jumpTaken) {
            if (machine.pc.side === 'left') {
                machine.pc.side = 'right';
            } else {
                machine.pc.side = 'left';
                machine.pc.addr = (machine.pc.addr + 1) & 0x3FF;
            }
        }

        if (machine.breakpoints.has(machine.pc.addr)) {
            machine.state = 'halted';
        }
    }

    machine.stepCount += 1;

    const trace = makeTrace(
        pcBefore,
        instr.opcode,
        addr12,
        formatMnemonic(instr.opcode, addr12),
        memRead,
        memWrite
    );

    if (machine.state === 'running') {
        machine.state = 'ready';
    }

    return trace;
}

export function run(stepsPerFrame = 1) {
    if (machine.state === 'off' || machine.state === 'booting' || machine.state === 'error') {
        return false;
    }

    if (runTimer) {
        clearInterval(runTimer);
    }

    machine.state = 'running';

    runTimer = setInterval(() => {
        for (let i = 0; i < Math.max(1, stepsPerFrame); i++) {
            if (machine.state !== 'running' && machine.state !== 'ready') {
                clearInterval(runTimer);
                runTimer = null;
                return;
            }

            const trace = step();
            if (!trace || machine.state === 'halted' || machine.state === 'error') {
                clearInterval(runTimer);
                runTimer = null;
                return;
            }

            machine.state = 'running';
        }
    }, 16);

    return true;
}

export function stop() {
    if (runTimer) {
        clearInterval(runTimer);
        runTimer = null;
    }
    if (machine.state === 'running' || machine.state === 'ready') {
        machine.state = 'halted';
    }
}

export function loadProgram(words) {
    for (const entry of words) {
        const addr = toMemAddr(Number(entry.addr));
        machine.memory[addr] = mask40(BigInt(entry.value));
    }
}

export function getState() {
    return {
        memory: machine.memory.map((v) => v),
        ac: machine.ac,
        mq: machine.mq,
        pc: { addr: machine.pc.addr, side: machine.pc.side },
        state: machine.state,
        error: machine.error,
        breakpoints: new Set([...machine.breakpoints]),
        stepCount: machine.stepCount
    };
}
