(function () {
    const OPS = {
        'HALT': { opcode: 0x00, needsAddress: false },
        'LOAD M(X)': { opcode: 0x01, needsAddress: true },
        'ADD M(X)': { opcode: 0x05, needsAddress: true },
        'SUB M(X)': { opcode: 0x06, needsAddress: true },
        'LOAD MQ': { opcode: 0x0A, needsAddress: false },
        'STOR M(X)': { opcode: 0x21, needsAddress: true }
    };

    const OPCODE_TO_TEXT = {
        0x00: 'HALT',
        0x01: 'LOAD M(X)',
        0x05: 'ADD M(X)',
        0x06: 'SUB M(X)',
        0x0A: 'LOAD MQ',
        0x21: 'STOR M(X)'
    };

    const SAMPLE_SOURCE = [
        '; Add two numbers and store result at 102',
        'ORG 0',
        'LOAD M(100)',
        'ADD M(101)',
        'STOR M(102)',
        'HALT',
        'ORG 100',
        'DATA 25',
        'DATA 17',
        'DATA 0'
    ].join('\n');

    function encodeHalf(opcode, address) {
        const op = opcode & 0xFF;
        const addr = address & 0xFFF;
        return (op << 12) | addr;
    }

    function packWord(leftOpcode, leftAddr, rightOpcode, rightAddr) {
        return (
            (BigInt(leftOpcode & 0xFF) << 32n) |
            (BigInt(leftAddr & 0xFFF) << 20n) |
            (BigInt(rightOpcode & 0xFF) << 12n) |
            BigInt(rightAddr & 0xFFF)
        );
    }

    function parseNumber(text) {
        const t = (text || '').trim();
        if (/^[-+]?0x[0-9a-f]+$/i.test(t)) {
            return Number(BigInt(t));
        }
        if (/^[-+]?\d+$/.test(t)) {
            return Number(t);
        }
        return null;
    }

    function parseInstruction(line) {
        const clean = line.trim().replace(/\s+/g, ' ');
        if (!clean) {
            return null;
        }

        if (/^(HALT|LOAD MQ)$/i.test(clean)) {
            const key = clean.toUpperCase() === 'HALT' ? 'HALT' : 'LOAD MQ';
            return { opcode: OPS[key].opcode, address: 0 };
        }

        const match = clean.match(/^(LOAD|ADD|SUB|STOR)\s+M\((\d+)\)$/i);
        if (!match) {
            return null;
        }
        const stem = match[1].toUpperCase();
        const address = Number(match[2]);
        const opcodeMap = { LOAD: 0x01, ADD: 0x05, SUB: 0x06, STOR: 0x21 };
        if (!Number.isInteger(address) || address < 0 || address > 4095) {
            return null;
        }
        return { opcode: opcodeMap[stem], address };
    }

    function assembleBasic(source) {
        const lines = source.split(/\r?\n/);
        const memory = new Map();
        const errors = [];
        let addr = 0;
        let side = 'left';
        let pendingLeft = null;

        function flushPending() {
            if (!pendingLeft) {
                return;
            }
            memory.set(addr & 0x3FF, packWord(pendingLeft.opcode, pendingLeft.address, 0x00, 0));
            addr = (addr + 1) & 0x3FF;
            side = 'left';
            pendingLeft = null;
        }

        for (let i = 0; i < lines.length; i += 1) {
            const noComment = lines[i].replace(/;.*/, '').trim();
            if (!noComment) {
                continue;
            }

            const orgMatch = noComment.match(/^ORG\s+(.+)$/i);
            if (orgMatch) {
                const orgValue = parseNumber(orgMatch[1]);
                if (orgValue === null || orgValue < 0 || orgValue > 4095) {
                    errors.push({ line: i + 1, message: `Invalid ORG: ${orgMatch[1]}` });
                    continue;
                }
                flushPending();
                addr = orgValue;
                side = 'left';
                continue;
            }

            const dataMatch = noComment.match(/^DATA\s+(.+)$/i);
            if (dataMatch) {
                const dataValue = parseNumber(dataMatch[1]);
                if (dataValue === null) {
                    errors.push({ line: i + 1, message: `Invalid DATA: ${dataMatch[1]}` });
                    continue;
                }
                flushPending();
                memory.set(addr & 0x3FF, BigInt(dataValue));
                addr = (addr + 1) & 0x3FF;
                side = 'left';
                continue;
            }

            const encoded = parseInstruction(noComment);
            if (!encoded) {
                errors.push({ line: i + 1, message: `Unsupported instruction: ${noComment}` });
                continue;
            }

            if (side === 'left') {
                pendingLeft = encoded;
                side = 'right';
            } else {
                memory.set(addr & 0x3FF, packWord(pendingLeft.opcode, pendingLeft.address, encoded.opcode, encoded.address));
                pendingLeft = null;
                side = 'left';
                addr = (addr + 1) & 0x3FF;
            }
        }

        flushPending();

        if (errors.length > 0) {
            return { success: false, words: [], errors };
        }

        const words = [...memory.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([wordAddr, value]) => ({ addr: wordAddr, value }));

        return { success: true, words, errors: [] };
    }

    function parseBuilderLine(line) {
        const text = (line || '').trim();
        if (!text) {
            return null;
        }
        return parseInstruction(text);
    }

    function decodeHalfText(halfValue) {
        const opcode = (halfValue >> 12) & 0xFF;
        const address = halfValue & 0xFFF;
        const base = OPCODE_TO_TEXT[opcode] || `OP 0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
        return base.includes('X') ? base.replace('X', String(address)) : base;
    }

    function buildPanelHtml() {
        const options = Object.keys(OPS).map((mnemonic) => `<option value="${OPS[mnemonic].opcode}">${mnemonic}</option>`).join('');
        return `
            <div class="tools-toolbar" id="tools-toolbar">
                <button id="tools-toggle" type="button">TOOLS</button>
                <button class="tools-tab active" data-tools-tab="builder" type="button">Instruction Builder</button>
                <button class="tools-tab" data-tools-tab="translator" type="button">Binary Translator</button>
                <button class="tools-tab" data-tools-tab="editor" type="button">Assembly Editor</button>
            </div>
            <div class="tools-panel active" data-tools-panel="builder">
                <div class="tools-grid">
                    <label>Operation
                        <select id="tools-builder-op">${options}</select>
                    </label>
                    <label>Address
                        <input id="tools-builder-addr" type="number" min="0" max="4095" value="100">
                    </label>
                </div>
                <div class="tools-readout" id="tools-builder-readout"></div>
                <div class="tools-actions">
                    <button id="tools-insert-left" type="button">Insert Left</button>
                    <button id="tools-insert-right" type="button">Insert Right</button>
                    <button id="tools-copy" type="button">Copy</button>
                </div>
            </div>
            <div class="tools-panel" data-tools-panel="translator">
                <label>Assembly / Hex
                    <input id="tools-translator-input" type="text" placeholder="ADD M(101) or 0x05065">
                </label>
                <div class="tools-readout" id="tools-translator-readout"></div>
            </div>
            <div class="tools-panel" data-tools-panel="editor">
                <textarea id="tools-editor-source" rows="10" spellcheck="false"></textarea>
                <div class="tools-actions">
                    <button id="tools-assemble-load" type="button">Assemble and Load</button>
                </div>
                <div class="tools-readout" id="tools-editor-status"></div>
            </div>
        `;
    }

    function setActiveTab(root, name) {
        root.querySelectorAll('.tools-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.toolsTab === name);
        });
        root.querySelectorAll('.tools-panel').forEach((panel) => {
            panel.classList.toggle('active', panel.dataset.toolsPanel === name);
        });
    }

    function initToolsUI() {
        const mount = document.getElementById('sim-tools-overlay');
        if (!mount || mount.dataset.initialized === '1') {
            return;
        }

        mount.innerHTML = buildPanelHtml();
        mount.dataset.initialized = '1';

        const toolbar = mount.querySelector('#tools-toolbar');
        const toggleButton = mount.querySelector('#tools-toggle');
        const opSelect = mount.querySelector('#tools-builder-op');
        const addrInput = mount.querySelector('#tools-builder-addr');
        const readout = mount.querySelector('#tools-builder-readout');
        const editor = mount.querySelector('#tools-editor-source');
        const translatorInput = mount.querySelector('#tools-translator-input');
        const translatorReadout = mount.querySelector('#tools-translator-readout');
        const editorStatus = mount.querySelector('#tools-editor-status');

        editor.value = SAMPLE_SOURCE;

        const updateBuilderReadout = () => {
            const opcode = Number(opSelect.value);
            const rawAddr = Number(addrInput.value || 0);
            const address = Math.max(0, Math.min(4095, rawAddr));
            const encoded = encodeHalf(opcode, address);
            const base = OPCODE_TO_TEXT[opcode] || `OP 0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`;
            const mnemonic = base.includes('X') ? base.replace('X', String(address)) : base;
            const binary = encoded.toString(2).padStart(20, '0').replace(/(.{4})/g, '$1 ').trim();
            const hex = `0x${encoded.toString(16).toUpperCase().padStart(5, '0')}`;
            readout.textContent = `${mnemonic} | binary ${binary} | hex ${hex}`;
            return mnemonic;
        };

        const insertIntoEditor = (side) => {
            const line = updateBuilderReadout();
            const suffix = side === 'right' ? ' ; preferred right half' : '';
            editor.value = `${editor.value.trimEnd()}\n${line}${suffix}\n`;
            setActiveTab(mount, 'editor');
        };

        const updateTranslator = () => {
            const input = (translatorInput.value || '').trim();
            if (!input) {
                translatorReadout.textContent = '';
                return;
            }

            if (/^0x[0-9a-f]+$/i.test(input) || /^[0-9a-f]{1,5}$/i.test(input)) {
                const raw = input.startsWith('0x') ? input.slice(2) : input;
                const value = parseInt(raw, 16) & 0xFFFFF;
                translatorReadout.textContent = `Hex ${input} -> ${decodeHalfText(value)}`;
                return;
            }

            const parsed = parseBuilderLine(input);
            if (!parsed) {
                translatorReadout.textContent = 'Could not parse input. Try ADD M(101) or 0x05065';
                return;
            }
            const encoded = encodeHalf(parsed.opcode, parsed.address);
            translatorReadout.textContent = `Assembly -> hex 0x${encoded.toString(16).toUpperCase().padStart(5, '0')} | dec ${encoded}`;
        };

        const assembleAndLoad = () => {
            const result = assembleBasic(editor.value);
            if (!result.success) {
                const firstError = result.errors[0] ? `line ${result.errors[0].line}: ${result.errors[0].message}` : 'unknown error';
                editorStatus.textContent = `Assemble failed: ${firstError}`;
                return;
            }

            document.dispatchEvent(new CustomEvent('veizac:load-program', {
                detail: {
                    words: result.words,
                    label: 'Assembly Editor Program'
                }
            }));
            editorStatus.textContent = `Loaded ${result.words.length} words`;
        };

        mount.querySelectorAll('.tools-tab').forEach((tab) => {
            tab.addEventListener('click', () => setActiveTab(mount, tab.dataset.toolsTab));
        });

        mount.querySelector('#tools-insert-left').addEventListener('click', () => insertIntoEditor('left'));
        mount.querySelector('#tools-insert-right').addEventListener('click', () => insertIntoEditor('right'));
        mount.querySelector('#tools-copy').addEventListener('click', async () => {
            const text = updateBuilderReadout();
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                // Clipboard permissions may fail in file:// mode.
            }
        });

        opSelect.addEventListener('change', updateBuilderReadout);
        addrInput.addEventListener('input', updateBuilderReadout);
        translatorInput.addEventListener('input', updateTranslator);
        mount.querySelector('#tools-assemble-load').addEventListener('click', assembleAndLoad);

        editor.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'Enter') {
                assembleAndLoad();
            }
        });

        toggleButton.addEventListener('click', () => {
            toolbar.classList.toggle('collapsed');
            mount.classList.toggle('collapsed');
        });

        document.addEventListener('keydown', (event) => {
            if ((event.key || '').toLowerCase() === 't') {
                toolbar.classList.toggle('collapsed');
                mount.classList.toggle('collapsed');
            }
        });

        updateBuilderReadout();
        setActiveTab(mount, 'builder');
    }

    window.VEIZACTools = {
        initToolsUI
    };
})();
