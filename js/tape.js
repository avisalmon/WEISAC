let tapeContainer = null;

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

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function setTapeContainer(element) {
    tapeContainer = element;
}

function halfToBits20(halfWord) {
    const val = Number(halfWord & 0xFFFFFn);
    const bits = [];
    for (let i = 19; i >= 0; i -= 1) {
        bits.push((val >> i) & 1);
    }
    return bits;
}

function decodeHalf(halfWord) {
    const opcode = Number((halfWord >> 12n) & 0xFFn);
    const address = Number(halfWord & 0xFFFn);
    const base = OPCODE_NAMES[opcode] || `OP 0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
    return (opcode === 0x00 || opcode === 0x0A || opcode === 0x14 || opcode === 0x15)
        ? base
        : base.replace('X', String(address));
}

function createTapeRow(bits, decodeText, showHelp) {
    const row = document.createElement('div');
    row.className = 'tape-row';
    if (showHelp) {
        row.title = `${decodeText}`;
    }
    bits.forEach((bit) => {
        const cell = document.createElement('span');
        cell.className = bit ? 'tape-bit on punched' : 'tape-bit off';
        row.appendChild(cell);
    });
    return row;
}

export function renderTape(words, options = {}) {
    if (!tapeContainer) {
        return;
    }
    const showHelp = options.showHelp !== false;
    const strip = tapeContainer.closest('.sim-tape-strip') || tapeContainer;
    strip.classList.add('feeding');
    tapeContainer.innerHTML = '';

    words.forEach((entry) => {
        const value = BigInt(entry.value);
        const leftHalf = (value >> 20n) & 0xFFFFFn;
        const rightHalf = value & 0xFFFFFn;

        const block = document.createElement('div');
        block.className = 'tape-word tape-entering';
        block.dataset.addr = String(entry.addr);

        const leftBits = halfToBits20(leftHalf);
        block.appendChild(createTapeRow(leftBits, decodeHalf(leftHalf), showHelp));

        const sprocket = document.createElement('div');
        sprocket.className = 'tape-sprocket';
        block.appendChild(sprocket);

        const rightBits = halfToBits20(rightHalf);
        block.appendChild(createTapeRow(rightBits, decodeHalf(rightHalf), showHelp));

        tapeContainer.appendChild(block);
    });
}

export function renderTapeFromMemory(memory) {
    let lastNonZero = -1;
    for (let i = memory.length - 1; i >= 0; i -= 1) {
        if (memory[i] !== 0n) {
            lastNonZero = i;
            break;
        }
    }
    if (lastNonZero < 0) {
        if (tapeContainer) {
            tapeContainer.innerHTML = '';
            const strip = tapeContainer.closest('.sim-tape-strip') || tapeContainer;
            strip.classList.remove('feeding');
        }
        return;
    }
    const words = [];
    for (let addr = 0; addr <= lastNonZero; addr += 1) {
        words.push({ addr, value: memory[addr] });
    }
    renderTape(words, { showHelp: true });
}

export async function animateLoad(words, onWord) {
    if (!tapeContainer) {
        return;
    }
    const strip = tapeContainer.closest('.sim-tape-strip') || tapeContainer;
    strip.classList.add('feeding');
    const blocks = tapeContainer.querySelectorAll('.tape-word');
    for (let i = 0; i < blocks.length; i += 1) {
        blocks[i].classList.add('tape-consumed');
        if (onWord) {
            onWord(words[i], i);
        }
        await delay(50);
    }
    strip.classList.remove('feeding');
}
}

export async function runTapeLoadSequence(words, options = {}) {
    const { skip = false, onPunch = null, onFeed = null, showHelp = true } = options;
    renderTape(words, { showHelp });

    if (skip) {
        return;
    }

    if (onPunch) {
        onPunch();
    }
    await animateLoad(words, null);
    if (onFeed) {
        onFeed();
    }
}
