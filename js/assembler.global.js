/**
 * VEIZAC Assembler — IIFE global version (file:// compatible)
 * Exposes window.veizacAssemble(source) and window.veizacDisassemble(word)
 */
(function () {
    'use strict';

    const WORD_MASK = 0xFFFFFFFFFFn;
    const SIGN_BIT = 1n << 39n;

    const OPCODE_BY_MNEMONIC = {
        'HALT': { opcode: 0x00 },
        'LOAD M(X)': { opcode: 0x01 },
        'LOAD -M(X)': { opcode: 0x02 },
        'LOAD |M(X)|': { opcode: 0x03 },
        'LOAD -|M(X)|': { opcode: 0x04 },
        'ADD M(X)': { opcode: 0x05 },
        'SUB M(X)': { opcode: 0x06 },
        'ADD |M(X)|': { opcode: 0x07 },
        'SUB |M(X)|': { opcode: 0x08 },
        'LOAD MQ,M(X)': { opcode: 0x09 },
        'LOAD MQ': { opcode: 0x0A },
        'MUL M(X)': { opcode: 0x0B },
        'DIV M(X)': { opcode: 0x0C },
        'JUMP+ M(X,0:19)': { opcode: 0x0D },
        'JUMP+ M(X,20:39)': { opcode: 0x0E },
        'JUMP M(X,0:19)': { opcode: 0x0F },
        'JUMP M(X,20:39)': { opcode: 0x10 },
        'STOR M(X,8:19)': { opcode: 0x12 },
        'STOR M(X,28:39)': { opcode: 0x13 },
        'LSH': { opcode: 0x14 },
        'RSH': { opcode: 0x15 },
        'STOR M(X)': { opcode: 0x21 }
    };

    const MNEMONIC_BY_OPCODE = {
        0x00: 'HALT', 0x01: 'LOAD M(X)', 0x02: 'LOAD -M(X)', 0x03: 'LOAD |M(X)|',
        0x04: 'LOAD -|M(X)|', 0x05: 'ADD M(X)', 0x06: 'SUB M(X)', 0x07: 'ADD |M(X)|',
        0x08: 'SUB |M(X)|', 0x09: 'LOAD MQ,M(X)', 0x0A: 'LOAD MQ', 0x0B: 'MUL M(X)',
        0x0C: 'DIV M(X)', 0x0D: 'JUMP+ M(X,0:19)', 0x0E: 'JUMP+ M(X,20:39)',
        0x0F: 'JUMP M(X,0:19)', 0x10: 'JUMP M(X,20:39)', 0x12: 'STOR M(X,8:19)',
        0x13: 'STOR M(X,28:39)', 0x14: 'LSH', 0x15: 'RSH', 0x21: 'STOR M(X)'
    };

    const SMART_JUMP_CODES = {
        JUMP: { left: 0x0F, right: 0x10 },
        'JUMP+': { left: 0x0D, right: 0x0E }
    };

    function mask40(value) {
        var masked = value & WORD_MASK;
        if ((masked & SIGN_BIT) !== 0n) { masked -= 1n << 40n; }
        return masked;
    }

    function normalizeLine(line) { return line.replace(/\s+/g, ' ').trim(); }

    function parseNumber(token) {
        if (!token) return null;
        var raw = token.trim();
        if (/^[-+]?0x[0-9a-f]+$/i.test(raw)) return Number(BigInt(raw));
        if (/^[-+]?\d+$/.test(raw)) return Number(raw);
        return null;
    }

    function packWord(lOp, lAddr, rOp, rAddr) {
        return (BigInt(lOp & 0xFF) << 32n) | (BigInt(lAddr & 0xFFF) << 20n) |
               (BigInt(rOp & 0xFF) << 12n) | BigInt(rAddr & 0xFFF);
    }

    function validateAddress(v) { return Number.isInteger(v) && v >= 0 && v <= 0xFFF; }

    function resolveAddressToken(token, labels) {
        var numeric = parseNumber(token);
        if (numeric !== null) return { ok: true, value: numeric };
        var label = labels[token];
        if (!label) return { ok: false, message: 'Undefined label: ' + token };
        return { ok: true, value: label.addr, label: label };
    }

    function parseLine(rawLine, lineNumber) {
        var noComment = rawLine.replace(/;.*/, '');
        if (!noComment.trim()) return [];
        var entries = [];
        var rest = noComment.trim();
        while (true) {
            var labelMatch = rest.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
            if (!labelMatch) break;
            entries.push({ type: 'label', name: labelMatch[1], line: lineNumber });
            rest = rest.slice(labelMatch[0].length).trim();
            if (!rest) return entries;
        }
        var orgMatch = rest.match(/^ORG\s+(.+)$/i);
        if (orgMatch) { entries.push({ type: 'org', value: orgMatch[1].trim(), line: lineNumber }); return entries; }
        var dataMatch = rest.match(/^DATA\s+(.+)$/i);
        if (dataMatch) { entries.push({ type: 'data', value: dataMatch[1].trim(), line: lineNumber }); return entries; }
        entries.push({ type: 'instruction', text: normalizeLine(rest), line: lineNumber });
        return entries;
    }

    function parseSource(sourceText) {
        var items = [];
        var lines = sourceText.split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var parsed = parseLine(lines[i], i + 1);
            for (var j = 0; j < parsed.length; j++) items.push(parsed[j]);
        }
        return items;
    }

    function parseInstruction(text, labels, warnings, line, errors) {
        var normalized = text.replace(/\s+/g, ' ').trim();
        var upper = normalized.toUpperCase();

        if (upper === 'HALT' || upper === 'LOAD MQ' || upper === 'LSH' || upper === 'RSH') {
            var key = upper === 'LOAD MQ' ? 'LOAD MQ' : upper;
            return { opcode: OPCODE_BY_MNEMONIC[key].opcode, address: 0 };
        }

        // LOAD MQ,M(X)
        var loadMqMatch = normalized.match(/^LOAD\s+MQ\s*,\s*M\(([^)]+)\)$/i);
        if (loadMqMatch) {
            var token = loadMqMatch[1].trim();
            var resolved = resolveAddressToken(token, labels);
            if (!resolved.ok) { errors.push({ line: line, message: resolved.message }); return null; }
            if (!validateAddress(resolved.value)) { errors.push({ line: line, message: 'Invalid address: ' + resolved.value }); return null; }
            return { opcode: OPCODE_BY_MNEMONIC['LOAD MQ,M(X)'].opcode, address: resolved.value };
        }

        // Smart jump: JUMP label (no explicit side)
        var smartJumpMatch = normalized.match(/^(JUMP\+?|JUMP)\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
        if (smartJumpMatch) {
            var jumpKind = smartJumpMatch[1].toUpperCase();
            var targetName = smartJumpMatch[2];
            var lbl = labels[targetName];
            if (!lbl) { errors.push({ line: line, message: 'Undefined label: ' + targetName }); return null; }
            return { opcode: SMART_JUMP_CODES[jumpKind][lbl.side], address: lbl.addr };
        }

        // General M(arg) instructions
        var mArg = normalized.match(/^([A-Za-z+\- |]+)\s+M\(([^)]+)\)$/i);
        if (mArg) {
            var opStem = normalizeLine(mArg[1].toUpperCase());
            var arg = normalizeLine(mArg[2]);

            // JUMP/JUMP+ with explicit side
            if (opStem === 'JUMP' || opStem === 'JUMP+') {
                var jumpSideMatch = arg.match(/^([^,]+)\s*,\s*(0:19|20:39)$/i);
                if (!jumpSideMatch) { errors.push({ line: line, message: 'Invalid jump syntax: ' + text }); return null; }
                var jToken = jumpSideMatch[1].trim();
                var explicitSide = jumpSideMatch[2] === '0:19' ? 'left' : 'right';
                var jResolved = resolveAddressToken(jToken, labels);
                if (!jResolved.ok) { errors.push({ line: line, message: jResolved.message }); return null; }
                if (!validateAddress(jResolved.value)) { errors.push({ line: line, message: 'Invalid address: ' + jResolved.value }); return null; }
                if (jResolved.label && jResolved.label.side !== explicitSide) {
                    warnings.push({ line: line, message: "Label '" + jToken + "' is on " + jResolved.label.side + " side but jump targets " + explicitSide + " side" });
                }
                var jKey = opStem + ' M(X,' + (explicitSide === 'left' ? '0:19' : '20:39') + ')';
                return { opcode: OPCODE_BY_MNEMONIC[jKey].opcode, address: jResolved.value };
            }

            // Addr-modify variant (STOR M(X,8:19), etc.) — check first when comma present
            if (arg.includes(',')) {
                var modKey = opStem + ' M(X,' + arg.split(',')[1].trim() + ')';
                if (OPCODE_BY_MNEMONIC[modKey]) {
                    var mToken = arg.split(',')[0].trim();
                    var mResolved = resolveAddressToken(mToken, labels);
                    if (!mResolved.ok) { errors.push({ line: line, message: mResolved.message }); return null; }
                    if (!validateAddress(mResolved.value)) { errors.push({ line: line, message: 'Invalid address: ' + mResolved.value }); return null; }
                    return { opcode: OPCODE_BY_MNEMONIC[modKey].opcode, address: mResolved.value };
                }
            }

            // Standard M(X) form
            var baseKey = opStem + ' M(X)';
            if (OPCODE_BY_MNEMONIC[baseKey]) {
                var bResolved = resolveAddressToken(arg, labels);
                if (!bResolved.ok) { errors.push({ line: line, message: bResolved.message }); return null; }
                if (!validateAddress(bResolved.value)) { errors.push({ line: line, message: 'Invalid address: ' + bResolved.value }); return null; }
                return { opcode: OPCODE_BY_MNEMONIC[baseKey].opcode, address: bResolved.value };
            }
        }

        errors.push({ line: line, message: 'Unknown mnemonic: ' + text });
        return null;
    }

    function assemble(sourceText) {
        var items = parseSource(sourceText);
        var labels = {};
        var warnings = [];
        var errors = [];

        // Pass 1: collect labels
        var pass1Addr = 0, pass1Side = 'left';
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.type === 'org') {
                var v = parseNumber(item.value);
                if (v === null || !validateAddress(v)) { errors.push({ line: item.line, message: 'Invalid ORG: ' + item.value }); continue; }
                pass1Addr = v; pass1Side = 'left'; continue;
            }
            if (item.type === 'label') {
                if (labels[item.name]) { errors.push({ line: item.line, message: 'Duplicate label: ' + item.name }); continue; }
                labels[item.name] = { addr: pass1Addr, side: pass1Side }; continue;
            }
            if (item.type === 'data') {
                if (pass1Side === 'right') { pass1Addr = (pass1Addr + 1) & 0x3FF; pass1Side = 'left'; }
                pass1Addr = (pass1Addr + 1) & 0x3FF; continue;
            }
            if (item.type === 'instruction') {
                if (pass1Side === 'left') { pass1Side = 'right'; }
                else { pass1Side = 'left'; pass1Addr = (pass1Addr + 1) & 0x3FF; }
            }
        }

        if (errors.length > 0) return { success: false, words: [], labels: labels, warnings: warnings, errors: errors };

        // Pass 2: encode
        var memoryMap = new Map();
        var addr = 0, side = 'left', pendingLeft = null;

        function flushPending() {
            if (!pendingLeft) return;
            memoryMap.set(addr & 0x3FF, mask40(packWord(pendingLeft.opcode, pendingLeft.address, 0x00, 0)));
            addr = (addr + 1) & 0x3FF; side = 'left'; pendingLeft = null;
        }

        for (var j = 0; j < items.length; j++) {
            var it = items[j];
            if (it.type === 'label') continue;
            if (it.type === 'org') {
                flushPending();
                addr = parseNumber(it.value); side = 'left'; continue;
            }
            if (it.type === 'data') {
                flushPending();
                var dv = parseNumber(it.value);
                if (dv === null) { errors.push({ line: it.line, message: 'Invalid DATA: ' + it.value }); continue; }
                memoryMap.set(addr & 0x3FF, mask40(BigInt(dv)));
                addr = (addr + 1) & 0x3FF; side = 'left'; continue;
            }
            if (it.type === 'instruction') {
                var encoded = parseInstruction(it.text, labels, warnings, it.line, errors);
                if (!encoded) continue;
                if (side === 'left') { pendingLeft = encoded; side = 'right'; }
                else {
                    if (!pendingLeft) pendingLeft = { opcode: 0x00, address: 0 };
                    memoryMap.set(addr & 0x3FF, mask40(packWord(pendingLeft.opcode, pendingLeft.address, encoded.opcode, encoded.address)));
                    pendingLeft = null; side = 'left'; addr = (addr + 1) & 0x3FF;
                }
            }
        }
        flushPending();

        if (errors.length > 0) return { success: false, words: [], labels: labels, warnings: warnings, errors: errors };

        var words = [];
        memoryMap.forEach(function(value, wordAddr) { words.push({ addr: wordAddr, value: value }); });
        words.sort(function(a, b) { return a.addr - b.addr; });

        return { success: true, words: words, labels: labels, warnings: warnings, errors: [] };
    }

    function disassemble(word) {
        var value = BigInt(word);
        var leftHalf = (value >> 20n) & 0xFFFFFn;
        var rightHalf = value & 0xFFFFFn;
        var lOp = Number((leftHalf >> 12n) & 0xFFn), lAddr = Number(leftHalf & 0xFFFn);
        var rOp = Number((rightHalf >> 12n) & 0xFFn), rAddr = Number(rightHalf & 0xFFFn);

        function fmt(opcode, address) {
            var mnemonic = MNEMONIC_BY_OPCODE[opcode] || ('OP 0x' + opcode.toString(16).toUpperCase().padStart(2, '0'));
            if (mnemonic === 'HALT' || mnemonic === 'LOAD MQ' || mnemonic === 'LSH' || mnemonic === 'RSH') return mnemonic;
            return mnemonic.replace('X', String(address));
        }

        return { left: fmt(lOp, lAddr), right: fmt(rOp, rAddr) };
    }

    window.veizacAssemble = assemble;
    window.veizacDisassemble = disassemble;
})();
