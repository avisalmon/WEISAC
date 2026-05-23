(function () {
    const OPS = {
        'HALT': { opcode: 0x00, needsAddress: false, category: 'Control' },
        'LOAD M(X)': { opcode: 0x01, needsAddress: true, category: 'Data Transfer' },
        'LOAD -M(X)': { opcode: 0x02, needsAddress: true, category: 'Data Transfer' },
        'LOAD |M(X)|': { opcode: 0x03, needsAddress: true, category: 'Data Transfer' },
        'LOAD -|M(X)|': { opcode: 0x04, needsAddress: true, category: 'Data Transfer' },
        'ADD M(X)': { opcode: 0x05, needsAddress: true, category: 'Arithmetic' },
        'SUB M(X)': { opcode: 0x06, needsAddress: true, category: 'Arithmetic' },
        'ADD |M(X)|': { opcode: 0x07, needsAddress: true, category: 'Arithmetic' },
        'SUB |M(X)|': { opcode: 0x08, needsAddress: true, category: 'Arithmetic' },
        'LOAD MQ,M(X)': { opcode: 0x09, needsAddress: true, category: 'Data Transfer' },
        'LOAD MQ': { opcode: 0x0A, needsAddress: false, category: 'Data Transfer' },
        'MUL M(X)': { opcode: 0x0B, needsAddress: true, category: 'Arithmetic' },
        'DIV M(X)': { opcode: 0x0C, needsAddress: true, category: 'Arithmetic' },
        'JUMP+ M(X,0:19)': { opcode: 0x0D, needsAddress: true, category: 'Control' },
        'JUMP+ M(X,20:39)': { opcode: 0x0E, needsAddress: true, category: 'Control' },
        'JUMP M(X,0:19)': { opcode: 0x0F, needsAddress: true, category: 'Control' },
        'JUMP M(X,20:39)': { opcode: 0x10, needsAddress: true, category: 'Control' },
        'STOR M(X,8:19)': { opcode: 0x12, needsAddress: true, category: 'Address Modify' },
        'STOR M(X,28:39)': { opcode: 0x13, needsAddress: true, category: 'Address Modify' },
        'LSH': { opcode: 0x14, needsAddress: false, category: 'Arithmetic' },
        'RSH': { opcode: 0x15, needsAddress: false, category: 'Arithmetic' },
        'STOR M(X)': { opcode: 0x21, needsAddress: true, category: 'Data Transfer' },
        'DATA': { opcode: -1, needsAddress: false, isData: true, category: 'Data' }
    };

    const OPCODE_TO_TEXT = {
        0x00: 'HALT',
        0x01: 'LOAD M(X)', 0x02: 'LOAD -M(X)', 0x03: 'LOAD |M(X)|', 0x04: 'LOAD -|M(X)|',
        0x05: 'ADD M(X)', 0x06: 'SUB M(X)', 0x07: 'ADD |M(X)|', 0x08: 'SUB |M(X)|',
        0x09: 'LOAD MQ,M(X)', 0x0A: 'LOAD MQ',
        0x0B: 'MUL M(X)', 0x0C: 'DIV M(X)',
        0x0D: 'JUMP+ M(X,0:19)', 0x0E: 'JUMP+ M(X,20:39)',
        0x0F: 'JUMP M(X,0:19)', 0x10: 'JUMP M(X,20:39)',
        0x12: 'STOR M(X,8:19)', 0x13: 'STOR M(X,28:39)',
        0x14: 'LSH', 0x15: 'RSH',
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
        const options = Object.keys(OPS).map((mnemonic) => {
            const op = OPS[mnemonic];
            return `<option value="${op.opcode}">${op.category ? `[${op.category}] ` : ''}${mnemonic}</option>`;
        }).join('');
        return `
            <div class="tools-toolbar" id="tools-toolbar">
                <button id="tools-toggle" type="button">TOOLS</button>
                <button class="tools-tab active" data-tools-tab="builder" type="button">Instruction Builder</button>
                <button class="tools-tab" data-tools-tab="translator" type="button">Binary Translator</button>
                <button class="tools-tab" data-tools-tab="editor" type="button">Assembly Editor</button>
                <button class="tools-tab" data-tools-tab="inspector" type="button">Word Inspector</button>
                <button class="tools-tab" data-tools-tab="trace" type="button">Execution Trace</button>
            </div>
            <div class="tools-panel active" data-tools-panel="builder">
                <div class="tools-grid">
                    <label>Operation
                        <select id="tools-builder-op">${options}</select>
                    </label>
                    <label id="tools-operand-label">Operand
                        <input id="tools-builder-addr" type="number" min="0" max="4095" value="100">
                    </label>
                </div>
                <div class="tools-readout" id="tools-builder-readout"></div>
                <div class="tools-grid tools-target-grid">
                    <label>Target Address
                        <input id="tools-target-addr" type="number" min="0" max="1023" value="0">
                    </label>
                    <button id="tools-target-up" type="button">&#9650;</button>
                    <button id="tools-target-down" type="button">&#9660;</button>
                </div>
                <div class="tools-actions">
                    <button id="tools-insert-left" type="button">Insert Left</button>
                    <button id="tools-insert-right" type="button">Insert Right</button>
                    <button id="tools-copy" type="button">Copy</button>
                </div>
            </div>
            <div class="tools-panel" data-tools-panel="translator">
                <label>Assembly / Hex / Binary / Decimal
                    <input id="tools-translator-input" type="text" placeholder="ADD M(101) or 0x05065 or 0b... or 325">
                </label>
                <div class="tools-readout" id="tools-translator-readout"></div>
            </div>
            <div class="tools-panel" data-tools-panel="editor">
                <textarea id="tools-editor-source" rows="10" spellcheck="false"></textarea>
                <div class="tools-actions">
                    <button id="tools-assemble-load" type="button">Assemble and Load (Ctrl+Enter)</button>
                </div>
                <div class="tools-readout" id="tools-editor-status"></div>
            </div>
            <div class="tools-panel" data-tools-panel="inspector">
                <div class="tools-grid">
                    <label>Address
                        <input id="tools-inspector-addr" type="number" min="0" max="1023" value="0">
                    </label>
                    <button id="tools-inspector-go" type="button">Inspect</button>
                </div>
                <div class="tools-readout" id="tools-inspector-readout" style="white-space:pre-wrap;"></div>
            </div>
            <div class="tools-panel" data-tools-panel="trace">
                <div class="tools-readout tools-trace-log" id="tools-trace-log" style="max-height:200px;overflow:auto;white-space:pre-wrap;font-size:0.72rem;"></div>
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
        const targetAddrInput = mount.querySelector('#tools-target-addr');
        const editor = mount.querySelector('#tools-editor-source');
        const translatorInput = mount.querySelector('#tools-translator-input');
        const translatorReadout = mount.querySelector('#tools-translator-readout');
        const editorStatus = mount.querySelector('#tools-editor-status');

        editor.value = SAMPLE_SOURCE;

        const operandLabel = mount.querySelector('#tools-operand-label');

        const updateBuilderReadout = () => {
            const opcode = Number(opSelect.value);
            const isData = opcode === -1;

            if (isData) {
                operandLabel.firstChild.textContent = 'Value';
                addrInput.max = '1099511627775';
                const val = BigInt(addrInput.value || 0) & 0xFFFFFFFFFFn;
                const hex = `0x${val.toString(16).toUpperCase().padStart(10, '0')}`;
                readout.textContent = `DATA ${addrInput.value} | hex ${hex}`;
                return `DATA ${addrInput.value}`;
            }

            operandLabel.firstChild.textContent = 'Operand';
            addrInput.max = '4095';
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

        const syncTarget = (addr) => {
            targetAddrInput.value = Math.max(0, Math.min(1023, addr));
            if (window.VEIZACPanelAPI && window.VEIZACPanelAPI.setBuilderTarget) {
                window.VEIZACPanelAPI.setBuilderTarget(addr);
            }
        };

        const insertIntoEditor = (side) => {
            const opcode = Number(opSelect.value);
            const targetAddr = Math.max(0, Math.min(1023, Number(targetAddrInput.value || 0)));
            if (!window.VEIZACPanelAPI) {
                return;
            }
            if (opcode === -1) {
                const val = BigInt(addrInput.value || 0) & 0xFFFFFFFFFFn;
                if (window.VEIZACPanelAPI.pokeWord) {
                    window.VEIZACPanelAPI.pokeWord(targetAddr, val);
                }
                updateBuilderReadout();
                syncTarget(targetAddr + 1);
                return;
            }
            const rawAddr = Number(addrInput.value || 0);
            const needsAddress = Object.values(OPS).find((o) => o.opcode === opcode);
            const address = Math.max(0, Math.min(4095, (needsAddress && needsAddress.needsAddress) ? rawAddr : 0));
            if (!window.VEIZACPanelAPI.pokeHalf) {
                return;
            }
            window.VEIZACPanelAPI.pokeHalf(targetAddr, side, opcode, address);
            updateBuilderReadout();
            if (side === 'right') {
                syncTarget(targetAddr + 1);
            } else {
                syncTarget(targetAddr);
            }
        };

        const moveTargetAddr = (delta) => {
            const cur = Number(targetAddrInput.value || 0);
            syncTarget(cur + delta);
        };

        document.addEventListener('veizac:builder-target', (event) => {
            targetAddrInput.value = event.detail;
        });

        mount.querySelector('#tools-target-up').addEventListener('click', () => moveTargetAddr(-1));
        mount.querySelector('#tools-target-down').addEventListener('click', () => moveTargetAddr(1));
        targetAddrInput.addEventListener('input', () => {
            const val = Math.max(0, Math.min(1023, Number(targetAddrInput.value || 0)));
            if (window.VEIZACPanelAPI && window.VEIZACPanelAPI.setBuilderTarget) {
                window.VEIZACPanelAPI.setBuilderTarget(val);
            }
        });

        const updateTranslator = () => {
            const input = (translatorInput.value || '').trim();
            if (!input) {
                translatorReadout.textContent = '';
                return;
            }

            if (/^0b[01]+$/i.test(input)) {
                const value = parseInt(input.slice(2), 2) & 0xFFFFF;
                const hex = `0x${value.toString(16).toUpperCase().padStart(5, '0')}`;
                translatorReadout.textContent = `Binary -> ${decodeHalfText(value)} | hex ${hex} | dec ${value}`;
                return;
            }

            if (/^0x[0-9a-f]+$/i.test(input) || /^[0-9a-f]{3,5}$/i.test(input)) {
                const raw = input.startsWith('0x') ? input.slice(2) : input;
                const value = parseInt(raw, 16) & 0xFFFFF;
                const binary = value.toString(2).padStart(20, '0');
                translatorReadout.textContent = `Hex -> ${decodeHalfText(value)} | bin ${binary} | dec ${value}`;
                return;
            }

            if (/^\d+$/.test(input)) {
                const value = parseInt(input, 10) & 0xFFFFF;
                const hex = `0x${value.toString(16).toUpperCase().padStart(5, '0')}`;
                const binary = value.toString(2).padStart(20, '0');
                translatorReadout.textContent = `Dec ${input} -> ${decodeHalfText(value)} | hex ${hex} | bin ${binary}`;
                return;
            }

            const parsed = parseBuilderLine(input);
            if (!parsed) {
                translatorReadout.textContent = 'Try: ADD M(101), 0x05065, 0b..., or 325';
                return;
            }
            const encoded = encodeHalf(parsed.opcode, parsed.address);
            const hex = `0x${encoded.toString(16).toUpperCase().padStart(5, '0')}`;
            const binary = encoded.toString(2).padStart(20, '0');
            translatorReadout.textContent = `${input} -> hex ${hex} | bin ${binary} | dec ${encoded}`;
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

        // Word Inspector
        const inspectorAddr = mount.querySelector('#tools-inspector-addr');
        const inspectorReadout = mount.querySelector('#tools-inspector-readout');
        const inspectorGo = mount.querySelector('#tools-inspector-go');
        const updateInspector = () => {
            if (!window.VEIZACPanelAPI) { inspectorReadout.textContent = 'Power on first'; return; }
            const state = window.VEIZACPanelAPI.getMachineState();
            if (!state) { inspectorReadout.textContent = 'No state'; return; }
            const addr = Math.max(0, Math.min(1023, Number(inspectorAddr.value || 0)));
            const word = state.memory[addr];
            const hex = (word & 0xFFFFFFFFFFn).toString(16).toUpperCase().padStart(10, '0');
            const bin = (word & 0xFFFFFFFFFFn).toString(2).padStart(40, '0');
            const signed = word >= (1n << 39n) ? (word - (1n << 40n)).toString() : word.toString();
            const leftHalf = Number((word >> 20n) & 0xFFFFFn);
            const rightHalf = Number(word & 0xFFFFFn);
            inspectorReadout.textContent = [
                `Addr:    ${String(addr).padStart(3, '0')}`,
                `Hex:     0x${hex}`,
                `Binary:  ${bin.slice(0,8)} ${bin.slice(8,20)} ${bin.slice(20,28)} ${bin.slice(28)}`,
                `Signed:  ${signed}`,
                `Left:    ${decodeHalfText(leftHalf)}`,
                `Right:   ${decodeHalfText(rightHalf)}`
            ].join('\n');
        };
        if (inspectorGo) { inspectorGo.addEventListener('click', updateInspector); }
        if (inspectorAddr) { inspectorAddr.addEventListener('change', updateInspector); }

        // Execution Trace
        const traceLog = mount.querySelector('#tools-trace-log');
        let traceLines = [];
        const pushTrace = (line) => {
            traceLines.push(line);
            if (traceLines.length > 200) { traceLines.shift(); }
            if (traceLog) { traceLog.textContent = traceLines.join('\n'); traceLog.scrollTop = traceLog.scrollHeight; }
        };
        const logRowsEl = document.getElementById('sim-log-rows');
        if (logRowsEl) {
            const observer = new MutationObserver(() => {
                const first = logRowsEl.firstElementChild;
                if (first && first.textContent.startsWith('[')) {
                    pushTrace(first.textContent);
                }
            });
            observer.observe(logRowsEl, { childList: true });
        }

        toggleButton.addEventListener('click', () => {
            toolbar.classList.toggle('collapsed');
            mount.classList.toggle('collapsed');
        });

        document.addEventListener('keydown', (event) => {
            const key = (event.key || '').toLowerCase();
            const tag = (document.activeElement || {}).tagName || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
            if (key === 't') {
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
