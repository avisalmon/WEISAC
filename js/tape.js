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

function halfToBits(halfWord) {
    const bits = [];
    for (let i = 19; i >= 0; i -= 1) {
        bits.push((halfWord >> BigInt(i)) & 1n ? 1 : 0);
function halfToByteRows(halfWord) {
    const padded = (halfWord & 0xFFFFFn) << 4n;
    const rows = [];

    for (let row = 0; row < 3; row += 1) {
        const bits = [];
        const byteShift = BigInt((2 - row) * 8);
        const byteValue = Number((padded >> byteShift) & 0xFFn);
        for (let bit = 7; bit >= 0; bit -= 1) {
            bits.push((byteValue >> bit) & 1 ? 1 : 0);
        }
        rows.push(bits);
    }

    return rows;
    const address = Number(halfWord & 0xFFFn);
    const base = OPCODE_NAMES[opcode] || `OP 0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
function createTapeRow(bits, decodeText, showHelp) {
        ? base
        : base.replace('X', String(address));
    if (showHelp) {
        row.title = `${decodeText} (simplified visualization)`;
    }
}

function createTapeRow(bits, decodeText) {
    const row = document.createElement('div');
        if (showHelp) {
            cell.title = `${decodeText} (simplified visualization)`;
        }
    row.className = 'tape-row';
    row.title = `${decodeText} (simplified visualization)`;

    bits.forEach((bit) => {
        const cell = document.createElement('span');
        cell.className = bit ? 'tape-bit on' : 'tape-bit off';
export function renderTape(words, options = {}) {
    });

    return row;

    const showHelp = options.showHelp !== false;
}

export function renderTape(words) {
    if (!tapeContainer) {
        return;
    }

    tapeContainer.innerHTML = '';

    words.forEach((entry) => {
        const value = BigInt(entry.value);
        const leftRows = halfToByteRows(leftHalf).map((bits) => createTapeRow(bits, decodeHalf(leftHalf), showHelp));
        const rightHalf = value & 0xFFFFFn;

        const rightRows = halfToByteRows(rightHalf).map((bits) => createTapeRow(bits, decodeHalf(rightHalf), showHelp));
        block.className = 'tape-word';
        leftRows.forEach((row) => block.appendChild(row));
        block.appendChild(sprocket);
        rightRows.forEach((row) => block.appendChild(row));
        const leftRow = createTapeRow(halfToBits(leftHalf), decodeHalf(leftHalf));
        const sprocket = document.createElement('div');
        sprocket.className = 'tape-sprocket';
        const rightRow = createTapeRow(halfToBits(rightHalf), decodeHalf(rightHalf));

    const { skip = false, onPunch = null, onFeed = null, showHelp = true } = options;
    renderTape(words, { showHelp });
    });
}

export async function animatePunch(onPulse) {
    if (!tapeContainer) {
        return;
    }

    const holes = Array.from(tapeContainer.querySelectorAll('.tape-bit.on'));
    if (holes.length === 0) {
        return;
    }

    const stepDelay = Math.max(6, Math.floor(1000 / holes.length));

    for (let i = 0; i < holes.length; i += 1) {
        holes[i].classList.add('punched');
        if (onPulse && i % 3 === 0) {
            onPulse();
        }
        await delay(stepDelay);
    }
}

export async function animateFeed(onPulse) {
    if (!tapeContainer) {
        return;
    }

    tapeContainer.classList.add('feeding');
    const pulses = 10;
    for (let i = 0; i < pulses; i += 1) {
        if (onPulse) {
            onPulse();
        }
        await delay(90);
    }
    tapeContainer.classList.remove('feeding');
}

export async function runTapeLoadSequence(words, options = {}) {
    const { skip = false, onPunch = null, onFeed = null } = options;
    renderTape(words);

    if (skip) {
        const holes = tapeContainer ? tapeContainer.querySelectorAll('.tape-bit.on') : [];
        holes.forEach((hole) => hole.classList.add('punched'));
        return;
    }

    await animatePunch(onPunch);
    await animateFeed(onFeed);
}
