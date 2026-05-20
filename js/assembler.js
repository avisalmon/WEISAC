const WORD_MASK = 0xFFFFFFFFFFn;
const SIGN_BIT = 1n << 39n;

const OPCODE_BY_MNEMONIC = {
    'HALT': { opcode: 0x00, needsAddress: false, text: 'HALT' },
    'LOAD M(X)': { opcode: 0x01, needsAddress: true, text: 'LOAD M(X)' },
    'LOAD -M(X)': { opcode: 0x02, needsAddress: true, text: 'LOAD -M(X)' },
    'LOAD |M(X)|': { opcode: 0x03, needsAddress: true, text: 'LOAD |M(X)|' },
    'LOAD -|M(X)|': { opcode: 0x04, needsAddress: true, text: 'LOAD -|M(X)|' },
    'ADD M(X)': { opcode: 0x05, needsAddress: true, text: 'ADD M(X)' },
    'SUB M(X)': { opcode: 0x06, needsAddress: true, text: 'SUB M(X)' },
    'ADD |M(X)|': { opcode: 0x07, needsAddress: true, text: 'ADD |M(X)|' },
    'SUB |M(X)|': { opcode: 0x08, needsAddress: true, text: 'SUB |M(X)|' },
    'LOAD MQ,M(X)': { opcode: 0x09, needsAddress: true, text: 'LOAD MQ,M(X)' },
    'LOAD MQ': { opcode: 0x0A, needsAddress: false, text: 'LOAD MQ' },
    'MUL M(X)': { opcode: 0x0B, needsAddress: true, text: 'MUL M(X)' },
    'DIV M(X)': { opcode: 0x0C, needsAddress: true, text: 'DIV M(X)' },
    'JUMP+ M(X,0:19)': { opcode: 0x0D, needsAddress: true, text: 'JUMP+ M(X,0:19)', side: 'left' },
    'JUMP+ M(X,20:39)': { opcode: 0x0E, needsAddress: true, text: 'JUMP+ M(X,20:39)', side: 'right' },
    'JUMP M(X,0:19)': { opcode: 0x0F, needsAddress: true, text: 'JUMP M(X,0:19)', side: 'left' },
    'JUMP M(X,20:39)': { opcode: 0x10, needsAddress: true, text: 'JUMP M(X,20:39)', side: 'right' },
    'STOR M(X,8:19)': { opcode: 0x12, needsAddress: true, text: 'STOR M(X,8:19)' },
    'STOR M(X,28:39)': { opcode: 0x13, needsAddress: true, text: 'STOR M(X,28:39)' },
    'LSH': { opcode: 0x14, needsAddress: false, text: 'LSH' },
    'RSH': { opcode: 0x15, needsAddress: false, text: 'RSH' },
    'STOR M(X)': { opcode: 0x21, needsAddress: true, text: 'STOR M(X)' }
};

const MNEMONIC_BY_OPCODE = {
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

const SMART_JUMP_CODES = {
    JUMP: { left: 0x0F, right: 0x10 },
    'JUMP+': { left: 0x0D, right: 0x0E }
};

function mask40(value) {
    let masked = value & WORD_MASK;
    if ((masked & SIGN_BIT) !== 0n) {
        masked -= 1n << 40n;
    }
    return masked;
}

function normalizeLine(line) {
    return line.replace(/\s+/g, ' ').trim();
}

function parseNumber(token) {
    if (!token) {
        return null;
    }

    const raw = token.trim();
    if (/^[-+]?0x[0-9a-f]+$/i.test(raw)) {
        return Number(BigInt(raw));
    }
    if (/^[-+]?\d+$/.test(raw)) {
        return Number(raw);
    }
    return null;
}

function parseLine(rawLine, lineNumber) {
    const noComment = rawLine.replace(/;.*/, '');
    if (!noComment.trim()) {
        return [];
    }

    const entries = [];
    let rest = noComment.trim();

    while (true) {
        const labelMatch = rest.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
        if (!labelMatch) {
            break;
        }
        entries.push({ type: 'label', name: labelMatch[1], line: lineNumber });
        rest = rest.slice(labelMatch[0].length).trim();
        if (!rest) {
            return entries;
        }
    }

    const orgMatch = rest.match(/^ORG\s+(.+)$/i);
    if (orgMatch) {
        entries.push({ type: 'org', value: orgMatch[1].trim(), line: lineNumber });
        return entries;
    }

    const dataMatch = rest.match(/^DATA\s+(.+)$/i);
    if (dataMatch) {
        entries.push({ type: 'data', value: dataMatch[1].trim(), line: lineNumber });
        return entries;
    }

    entries.push({ type: 'instruction', text: normalizeLine(rest), line: lineNumber });
    return entries;
}

function parseSource(sourceText) {
    const items = [];
    const lines = sourceText.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
        const parsed = parseLine(lines[i], i + 1);
        for (const item of parsed) {
            items.push(item);
        }
    }

    return items;
}

function encodeHalf(opcode, address) {
    const op = BigInt(opcode & 0xFF);
    const addr = BigInt(address & 0xFFF);
    return (op << 12n) | addr;
}

function packWord(leftOpcode, leftAddr, rightOpcode, rightAddr) {
    return (
        (BigInt(leftOpcode & 0xFF) << 32n) |
        (BigInt(leftAddr & 0xFFF) << 20n) |
        (BigInt(rightOpcode & 0xFF) << 12n) |
        BigInt(rightAddr & 0xFFF)
    );
}

function validateAddress(value) {
    return Number.isInteger(value) && value >= 0 && value <= 0xFFF;
}

function resolveAddressToken(token, labels) {
    const numeric = parseNumber(token);
    if (numeric !== null) {
        return { ok: true, value: numeric };
    }

    const label = labels[token];
    if (!label) {
        return { ok: false, message: `Undefined label: ${token}` };
    }

    return { ok: true, value: label.addr, label };
}

function decodeHalf(half) {
    return {
        opcode: Number((half >> 12n) & 0xFFn),
        address: Number(half & 0xFFFn)
    };
}

function formatDecoded(opcode, address) {
    const mnemonic = MNEMONIC_BY_OPCODE[opcode] || `OP 0x${opcode.toString(16).padStart(2, '0').toUpperCase()}`;
    if (mnemonic === 'HALT' || mnemonic === 'LOAD MQ' || mnemonic === 'LSH' || mnemonic === 'RSH') {
        return mnemonic;
    }
    return mnemonic.replace('X', String(address));
}

function parseInstruction(text, labels, warnings, line, errors) {
    const normalized = text.replace(/\s+/g, ' ').trim();

    const plainNoAddr = normalized.toUpperCase();
    if (plainNoAddr === 'HALT' || plainNoAddr === 'LOAD MQ' || plainNoAddr === 'LSH' || plainNoAddr === 'RSH') {
        const key = plainNoAddr === 'LOAD MQ' ? 'LOAD MQ' : plainNoAddr;
        const entry = OPCODE_BY_MNEMONIC[key];
        return { opcode: entry.opcode, address: 0 };
    }

    const smartJumpMatch = normalized.match(/^(JUMP\+?|JUMP)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
    if (smartJumpMatch) {
        const jumpKind = smartJumpMatch[1].toUpperCase();
        const targetName = smartJumpMatch[2];
        const label = labels[targetName];
        if (!label) {
            errors.push({ line, message: `Undefined label: ${targetName}` });
            return null;
        }

        const side = label.side;
        const opcode = SMART_JUMP_CODES[jumpKind][side];
        return { opcode, address: label.addr };
    }

    const mArg = normalized.match(/^([A-Za-z+\- |]+)\s+M\(([^)]+)\)$/i);
    if (mArg) {
        const opStem = normalizeLine(mArg[1].toUpperCase());
        const arg = normalizeLine(mArg[2]);

        const jumpSideMatch = arg.match(/^([^,]+)\s*,\s*(0:19|20:39)$/i);
        if (opStem === 'JUMP' || opStem === 'JUMP+') {
            if (!jumpSideMatch) {
                errors.push({ line, message: `Invalid jump syntax: ${text}` });
                return null;
            }

            const token = jumpSideMatch[1].trim();
            const explicitSide = jumpSideMatch[2] === '0:19' ? 'left' : 'right';
            const resolved = resolveAddressToken(token, labels);
            if (!resolved.ok) {
                errors.push({ line, message: resolved.message });
                return null;
            }

            if (!validateAddress(resolved.value)) {
                errors.push({ line, message: `Invalid address: ${resolved.value}` });
                return null;
            }

            if (resolved.label && resolved.label.side !== explicitSide) {
                warnings.push({
                    line,
                    message: `Label '${token}' is on ${resolved.label.side} side but jump targets ${explicitSide} side`
                });
            }

            const key = `${opStem} M(X,${explicitSide === 'left' ? '0:19' : '20:39'})`;
            return { opcode: OPCODE_BY_MNEMONIC[key].opcode, address: resolved.value };
        }

        const keyBase = `${opStem} M(X)`;
        if (OPCODE_BY_MNEMONIC[keyBase]) {
            const resolved = resolveAddressToken(arg, labels);
            if (!resolved.ok) {
                errors.push({ line, message: resolved.message });
                return null;
            }
            if (!validateAddress(resolved.value)) {
                errors.push({ line, message: `Invalid address: ${resolved.value}` });
                return null;
            }
            return { opcode: OPCODE_BY_MNEMONIC[keyBase].opcode, address: resolved.value };
        }

        const keyAddrModify = `${opStem} M(X,${arg.includes(',') ? arg.split(',')[1].trim() : ''})`;
        if (OPCODE_BY_MNEMONIC[keyAddrModify]) {
            const token = arg.split(',')[0].trim();
            const resolved = resolveAddressToken(token, labels);
            if (!resolved.ok) {
                errors.push({ line, message: resolved.message });
                return null;
            }
            if (!validateAddress(resolved.value)) {
                errors.push({ line, message: `Invalid address: ${resolved.value}` });
                return null;
            }
            return { opcode: OPCODE_BY_MNEMONIC[keyAddrModify].opcode, address: resolved.value };
        }
    }

    errors.push({ line, message: `Unknown mnemonic: ${text}` });
    return null;
}

export function assemble(sourceText) {
    const items = parseSource(sourceText);
    const labels = {};
    const warnings = [];
    const errors = [];

    let pass1Addr = 0;
    let pass1Side = 'left';

    for (const item of items) {
        if (item.type === 'org') {
            const value = parseNumber(item.value);
            if (value === null || !validateAddress(value)) {
                errors.push({ line: item.line, message: `Invalid ORG address: ${item.value}` });
                continue;
            }
            pass1Addr = value;
            pass1Side = 'left';
            continue;
        }

        if (item.type === 'label') {
            if (labels[item.name]) {
                errors.push({ line: item.line, message: `Duplicate label: ${item.name}` });
                continue;
            }
            labels[item.name] = { addr: pass1Addr, side: pass1Side };
            continue;
        }

        if (item.type === 'data') {
            if (pass1Side === 'right') {
                pass1Addr = (pass1Addr + 1) & 0x3FF;
                pass1Side = 'left';
            }
            pass1Addr = (pass1Addr + 1) & 0x3FF;
            continue;
        }

        if (item.type === 'instruction') {
            if (pass1Side === 'left') {
                pass1Side = 'right';
            } else {
                pass1Side = 'left';
                pass1Addr = (pass1Addr + 1) & 0x3FF;
            }
        }
    }

    if (errors.length > 0) {
        return { success: false, words: [], labels, warnings, errors };
    }

    const memoryMap = new Map();
    let addr = 0;
    let side = 'left';
    let pendingLeft = null;

    function flushPending() {
        if (!pendingLeft) {
            return;
        }
        const word = packWord(pendingLeft.opcode, pendingLeft.address, 0x00, 0);
        memoryMap.set(addr & 0x3FF, mask40(word));
        addr = (addr + 1) & 0x3FF;
        side = 'left';
        pendingLeft = null;
    }

    for (const item of items) {
        if (item.type === 'label') {
            continue;
        }

        if (item.type === 'org') {
            flushPending();
            const value = parseNumber(item.value);
            if (value === null || !validateAddress(value)) {
                errors.push({ line: item.line, message: `Invalid ORG address: ${item.value}` });
                continue;
            }
            addr = value;
            side = 'left';
            continue;
        }

        if (item.type === 'data') {
            flushPending();
            const valueNum = parseNumber(item.value);
            if (valueNum === null) {
                errors.push({ line: item.line, message: `Invalid DATA literal: ${item.value}` });
                continue;
            }
            memoryMap.set(addr & 0x3FF, mask40(BigInt(valueNum)));
            addr = (addr + 1) & 0x3FF;
            side = 'left';
            continue;
        }

        if (item.type === 'instruction') {
            const encoded = parseInstruction(item.text, labels, warnings, item.line, errors);
            if (!encoded) {
                continue;
            }

            if (side === 'left') {
                pendingLeft = encoded;
                side = 'right';
            } else {
                if (!pendingLeft) {
                    pendingLeft = { opcode: 0x00, address: 0 };
                }
                const word = packWord(pendingLeft.opcode, pendingLeft.address, encoded.opcode, encoded.address);
                memoryMap.set(addr & 0x3FF, mask40(word));
                pendingLeft = null;
                side = 'left';
                addr = (addr + 1) & 0x3FF;
            }
        }
    }

    flushPending();

    if (errors.length > 0) {
        return { success: false, words: [], labels, warnings, errors };
    }

    const words = [...memoryMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([wordAddr, value]) => ({ addr: wordAddr, value }));

    return {
        success: true,
        words,
        labels,
        warnings,
        errors: []
    };
}

export function disassemble(word) {
    const value = BigInt(word);
    const leftHalf = (value >> 20n) & 0xFFFFFn;
    const rightHalf = value & 0xFFFFFn;

    const left = decodeHalf(leftHalf);
    const right = decodeHalf(rightHalf);

    return {
        left: formatDecoded(left.opcode, left.address),
        right: formatDecoded(right.opcode, right.address)
    };
}

export { parseSource, OPCODE_BY_MNEMONIC, encodeHalf };
