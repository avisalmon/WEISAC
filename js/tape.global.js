(function () {
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

    function setTapeContainer(element) {
        tapeContainer = element;
    }

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
    }

    function decodeHalf(halfWord) {
        const opcode = Number((halfWord >> 12n) & 0xFFn);
        const address = Number(halfWord & 0xFFFn);
        const base = OPCODE_NAMES[opcode] || `OP 0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
        const text = opcode === 0x00 || opcode === 0x0A || opcode === 0x14 || opcode === 0x15
            ? base
            : base.replace('X', String(address));
        return `${text} - opcode ${opcode.toString(16).toUpperCase().padStart(2, '0')}, address ${address.toString(16).toUpperCase().padStart(3, '0')}`;
    }

    function createTapeRow(bits, decodeText, showHelp) {
        const row = document.createElement('div');
        row.className = 'tape-row';
        if (showHelp) {
            row.title = `${decodeText} (simplified visualization)`;
        }

        bits.forEach((bit) => {
            const cell = document.createElement('span');
            cell.className = bit ? 'tape-bit on punched' : 'tape-bit off';
            if (showHelp) {
                cell.title = `${decodeText} (simplified visualization)`;
            }
            row.appendChild(cell);
        });

        return row;
    }

    function renderTape(words, options) {
        if (!tapeContainer) {
            return;
        }

        const opts = options || {};
        const showHelp = opts.showHelp !== false;

        tapeContainer.innerHTML = '';

        words.forEach((entry) => {
            const value = BigInt(entry.value);
            const leftHalf = (value >> 20n) & 0xFFFFFn;
            const rightHalf = value & 0xFFFFFn;

            const block = document.createElement('div');
            block.className = 'tape-word';

            const leftRows = halfToByteRows(leftHalf).map((bits) => createTapeRow(bits, decodeHalf(leftHalf), showHelp));
            const sprocket = document.createElement('div');
            sprocket.className = 'tape-sprocket';
            const rightRows = halfToByteRows(rightHalf).map((bits) => createTapeRow(bits, decodeHalf(rightHalf), showHelp));

            leftRows.forEach((row) => block.appendChild(row));
            block.appendChild(sprocket);
            rightRows.forEach((row) => block.appendChild(row));
            tapeContainer.appendChild(block);
        });
    }

    async function animatePunch(onPulse) {
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

    async function animateFeed(onPulse) {
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

    async function runTapeLoadSequence(words, options) {
        const opts = options || {};
        const skip = !!opts.skip;
        const onPunch = opts.onPunch || null;
        const onFeed = opts.onFeed || null;
        const showHelp = opts.showHelp !== false;

        renderTape(words, { showHelp });

        if (skip) {
            const holes = tapeContainer ? tapeContainer.querySelectorAll('.tape-bit.on') : [];
            holes.forEach((hole) => hole.classList.add('punched'));
            return;
        }

        await animatePunch(onPunch);
        await animateFeed(onFeed);
    }

    async function animateLoad(words, onWord) {
        if (!tapeContainer) {
            return;
        }
        const blocks = tapeContainer.querySelectorAll('.tape-word');
        for (let i = 0; i < blocks.length; i += 1) {
            blocks[i].classList.add('tape-consumed');
            if (onWord) {
                onWord(words[i], i);
            }
            await delay(50);
        }
    }

    function renderTapeFromMemory(memory) {
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
            }
            return;
        }
        const words = [];
        for (let addr = 0; addr <= lastNonZero; addr += 1) {
            words.push({ addr, value: memory[addr] });
        }
        renderTape(words, { showHelp: true });
    }

    window.VEIZACTape = {
        setTapeContainer,
        renderTape,
        renderTapeFromMemory,
        animateLoad,
        animatePunch,
        animateFeed,
        runTapeLoadSequence
    };
})();
