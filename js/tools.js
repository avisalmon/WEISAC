import { assemble, disassemble } from './assembler.js';

const BUILDER_OPS = [
    { mnemonic: 'HALT', opcode: 0x00, needsAddress: false, category: 'Control' },
    { mnemonic: 'LOAD M(X)', opcode: 0x01, needsAddress: true, category: 'Data Transfer' },
    { mnemonic: 'LOAD -M(X)', opcode: 0x02, needsAddress: true, category: 'Data Transfer' },
    { mnemonic: 'LOAD |M(X)|', opcode: 0x03, needsAddress: true, category: 'Data Transfer' },
    { mnemonic: 'LOAD -|M(X)|', opcode: 0x04, needsAddress: true, category: 'Data Transfer' },
    { mnemonic: 'ADD M(X)', opcode: 0x05, needsAddress: true, category: 'Arithmetic' },
    { mnemonic: 'SUB M(X)', opcode: 0x06, needsAddress: true, category: 'Arithmetic' },
    { mnemonic: 'ADD |M(X)|', opcode: 0x07, needsAddress: true, category: 'Arithmetic' },
    { mnemonic: 'SUB |M(X)|', opcode: 0x08, needsAddress: true, category: 'Arithmetic' },
    { mnemonic: 'LOAD MQ,M(X)', opcode: 0x09, needsAddress: true, category: 'Data Transfer' },
    { mnemonic: 'LOAD MQ', opcode: 0x0A, needsAddress: false, category: 'Data Transfer' },
    { mnemonic: 'MUL M(X)', opcode: 0x0B, needsAddress: true, category: 'Arithmetic' },
    { mnemonic: 'DIV M(X)', opcode: 0x0C, needsAddress: true, category: 'Arithmetic' },
    { mnemonic: 'JUMP+ M(X,0:19)', opcode: 0x0D, needsAddress: true, category: 'Control' },
    { mnemonic: 'JUMP+ M(X,20:39)', opcode: 0x0E, needsAddress: true, category: 'Control' },
    { mnemonic: 'JUMP M(X,0:19)', opcode: 0x0F, needsAddress: true, category: 'Control' },
    { mnemonic: 'JUMP M(X,20:39)', opcode: 0x10, needsAddress: true, category: 'Control' },
    { mnemonic: 'STOR M(X,8:19)', opcode: 0x12, needsAddress: true, category: 'Address Modify' },
    { mnemonic: 'STOR M(X,28:39)', opcode: 0x13, needsAddress: true, category: 'Address Modify' },
    { mnemonic: 'LSH', opcode: 0x14, needsAddress: false, category: 'Arithmetic' },
    { mnemonic: 'RSH', opcode: 0x15, needsAddress: false, category: 'Arithmetic' },
    { mnemonic: 'STOR M(X)', opcode: 0x21, needsAddress: true, category: 'Data Transfer' },
    { mnemonic: 'DATA', opcode: -1, needsAddress: false, isData: true, category: 'Data' }
];

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

function parseBuilderLine(line) {
    const text = (line || '').trim().toUpperCase();
    if (!text) {
        return null;
    }

    // No-operand instructions
    if (text === 'HALT') { return { opcode: 0x00, address: 0 }; }
    if (text === 'LOAD MQ') { return { opcode: 0x0A, address: 0 }; }
    if (text === 'LSH') { return { opcode: 0x14, address: 0 }; }
    if (text === 'RSH') { return { opcode: 0x15, address: 0 }; }

    // M(X) format
    const m = text.match(/^(LOAD|LOAD -|LOAD \||\LOAD -\||ADD|ADD \||SUB|SUB \||LOAD MQ,|MUL|DIV|JUMP\+?|STOR)\s*(?:\|?M\((\d+)(?:,\d+:\d+)?\)\|?|M\((\d+)(?:,\d+:\d+)?\))$/);
    if (!m) { return null; }

    const stem = m[1].replace(/\s+/g, ' ');
    const addr = Number(m[2] || m[3] || 0);

    const opcodeMap = {
        'LOAD': 0x01, 'LOAD -': 0x02, 'LOAD |': 0x03, 'LOAD -|': 0x04,
        'ADD': 0x05, 'SUB': 0x06, 'ADD |': 0x07, 'SUB |': 0x08,
        'LOAD MQ,': 0x09, 'MUL': 0x0B, 'DIV': 0x0C,
        'JUMP+': 0x0D, 'JUMP': 0x0F, 'STOR': 0x21
    };

    const opcode = opcodeMap[stem];
    if (opcode === undefined) { return null; }
    return { opcode, address: addr };
}

function buildPanelHtml() {
    const options = BUILDER_OPS.map((op) => `<option value="${op.opcode}">${op.category ? `[${op.category}] ` : ''}${op.mnemonic}</option>`).join('');

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
            <div class="asm-editor-wrap" id="asm-editor-wrap">
                <div class="asm-line-numbers" id="asm-line-numbers"></div>
                <div class="asm-editor-area">
                    <textarea id="tools-editor-source" rows="16" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" wrap="off"></textarea>
                    <div class="asm-errors" id="asm-errors"></div>
                </div>
                <div class="asm-autocomplete" id="asm-autocomplete" hidden></div>
            </div>
            <div class="tools-actions">
                <button id="tools-assemble-load" type="button">Assemble &amp; Load (Ctrl+Enter)</button>
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

export function initToolsUI() {
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
        const op = BUILDER_OPS.find((item) => item.opcode === opcode) || BUILDER_OPS[0];
        const isData = op.isData;

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
        const encoded = encodeHalf(opcode, op.needsAddress ? address : 0);
        const binary = encoded.toString(2).padStart(20, '0').replace(/(.{4})/g, '$1 ').trim();
        const hex = `0x${encoded.toString(16).toUpperCase().padStart(5, '0')}`;
        const mnemonic = op.needsAddress ? op.mnemonic.replace('X', String(address)) : op.mnemonic;

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
        const op = BUILDER_OPS.find((item) => item.opcode === opcode) || BUILDER_OPS[0];
        const targetAddr = Math.max(0, Math.min(1023, Number(targetAddrInput.value || 0)));
        if (!window.VEIZACPanelAPI) {
            return;
        }
        if (op.isData) {
            const val = BigInt(addrInput.value || 0) & 0xFFFFFFFFFFn;
            if (window.VEIZACPanelAPI.pokeWord) {
                window.VEIZACPanelAPI.pokeWord(targetAddr, val);
            }
            updateBuilderReadout();
            syncTarget(targetAddr + 1);
            return;
        }
        const rawAddr = Number(addrInput.value || 0);
        const address = Math.max(0, Math.min(4095, op.needsAddress ? rawAddr : 0));
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

        // Binary input: 0b...
        if (/^0b[01]+$/i.test(input)) {
            const value = parseInt(input.slice(2), 2) & 0xFFFFF;
            const left = disassemble((BigInt(value) << 20n) | 0n).left;
            const hex = `0x${value.toString(16).toUpperCase().padStart(5, '0')}`;
            translatorReadout.textContent = `Binary -> ${left} | hex ${hex} | dec ${value}`;
            return;
        }

        // Hex input: 0x... or raw hex digits
        if (/^0x[0-9a-f]+$/i.test(input) || /^[0-9a-f]{3,5}$/i.test(input)) {
            const raw = input.startsWith('0x') ? input.slice(2) : input;
            const value = parseInt(raw, 16) & 0xFFFFF;
            const left = disassemble((BigInt(value) << 20n) | 0n).left;
            const binary = value.toString(2).padStart(20, '0');
            translatorReadout.textContent = `Hex -> ${left} | bin ${binary} | dec ${value}`;
            return;
        }

        // Decimal input (pure number)
        if (/^\d+$/.test(input)) {
            const value = parseInt(input, 10) & 0xFFFFF;
            const left = disassemble((BigInt(value) << 20n) | 0n).left;
            const hex = `0x${value.toString(16).toUpperCase().padStart(5, '0')}`;
            const binary = value.toString(2).padStart(20, '0');
            translatorReadout.textContent = `Dec ${input} -> ${left} | hex ${hex} | bin ${binary}`;
            return;
        }

        // Assembly input
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
        const result = assemble(editor.value);
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
        } catch {
            // Clipboard permissions may fail in file:// mode.
        }
    });

    opSelect.addEventListener('change', updateBuilderReadout);
    addrInput.addEventListener('input', updateBuilderReadout);
    translatorInput.addEventListener('input', updateTranslator);
    mount.querySelector('#tools-assemble-load').addEventListener('click', assembleAndLoad);

    // === Assembly Editor: line numbers, autocomplete, live validation ===
    const lineNumbersEl = mount.querySelector('#asm-line-numbers');
    const errorsEl = mount.querySelector('#asm-errors');
    const autocompleteEl = mount.querySelector('#asm-autocomplete');

    const ASM_KEYWORDS = [
        'HALT', 'LOAD M(', 'LOAD -M(', 'LOAD |M(', 'LOAD -|M(',
        'ADD M(', 'SUB M(', 'ADD |M(', 'SUB |M(',
        'LOAD MQ,M(', 'LOAD MQ', 'MUL M(', 'DIV M(',
        'JUMP+ M(', 'JUMP M(', 'JUMP+ ', 'JUMP ',
        'STOR M(', 'STOR M(X,8:19)', 'STOR M(X,28:39)',
        'LSH', 'RSH', 'ORG ', 'DATA '
    ];

    const updateLineNumbers = () => {
        const lineCount = editor.value.split('\n').length;
        let html = '';
        for (let i = 1; i <= lineCount; i += 1) {
            html += `<div>${i}</div>`;
        }
        lineNumbersEl.innerHTML = html;
    };

    const validateEditor = () => {
        const result = assemble(editor.value);
        errorsEl.innerHTML = '';
        if (!result.success && result.errors.length > 0) {
            const errorLines = new Set();
            result.errors.forEach((err) => {
                errorLines.add(err.line);
            });
            const lineEls = lineNumbersEl.querySelectorAll('div');
            lineEls.forEach((el, idx) => {
                if (errorLines.has(idx + 1)) {
                    el.classList.add('error');
                }
            });
            const first = result.errors[0];
            errorsEl.innerHTML = result.errors.slice(0, 3).map((e) =>
                `<div class="asm-error-msg">Line ${e.line}: ${e.message}</div>`
            ).join('');
        }
        editorStatus.textContent = result.success ? `Ready: ${result.words.length} words` : '';
    };

    let acVisible = false;
    let acItems = [];
    let acIndex = 0;

    const showAutocomplete = (items) => {
        if (items.length === 0) { hideAutocomplete(); return; }
        acItems = items;
        acIndex = 0;
        autocompleteEl.innerHTML = items.map((item, i) =>
            `<div class="asm-ac-item${i === 0 ? ' active' : ''}">${item}</div>`
        ).join('');
        autocompleteEl.hidden = false;
        acVisible = true;
    };

    const hideAutocomplete = () => {
        autocompleteEl.hidden = true;
        acVisible = false;
        acItems = [];
    };

    const acceptAutocomplete = () => {
        if (!acVisible || acItems.length === 0) { return false; }
        const chosen = acItems[acIndex];
        const pos = editor.selectionStart;
        const text = editor.value;
        const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
        const lineText = text.slice(lineStart, pos);
        const stripped = lineText.replace(/;.*/, '').trimStart();
        const prefix = stripped.toUpperCase();
        const replaceStart = lineStart + (lineText.length - lineText.trimStart().length);
        editor.value = text.slice(0, replaceStart) + chosen + text.slice(pos);
        editor.selectionStart = editor.selectionEnd = replaceStart + chosen.length;
        hideAutocomplete();
        updateLineNumbers();
        validateEditor();
        return true;
    };

    const updateAutocomplete = () => {
        const pos = editor.selectionStart;
        const text = editor.value;
        const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
        const lineText = text.slice(lineStart, pos);
        const stripped = lineText.replace(/;.*/, '').trimStart();
        if (!stripped || stripped.startsWith(';')) { hideAutocomplete(); return; }
        const prefix = stripped.toUpperCase();
        const matches = ASM_KEYWORDS.filter((kw) => kw.startsWith(prefix) && kw !== prefix);
        if (matches.length > 0 && matches.length <= 8) {
            showAutocomplete(matches);
        } else {
            hideAutocomplete();
        }
    };

    editor.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
            assembleAndLoad();
            event.preventDefault();
            return;
        }
        if (acVisible) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                acIndex = (acIndex + 1) % acItems.length;
                autocompleteEl.querySelectorAll('.asm-ac-item').forEach((el, i) => el.classList.toggle('active', i === acIndex));
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                acIndex = (acIndex - 1 + acItems.length) % acItems.length;
                autocompleteEl.querySelectorAll('.asm-ac-item').forEach((el, i) => el.classList.toggle('active', i === acIndex));
                return;
            }
            if (event.key === 'Tab' || event.key === 'Enter') {
                if (acceptAutocomplete()) {
                    event.preventDefault();
                    return;
                }
            }
            if (event.key === 'Escape') {
                hideAutocomplete();
                event.preventDefault();
                return;
            }
        }
        if (event.key === 'Tab' && !acVisible) {
            event.preventDefault();
            const start = editor.selectionStart;
            editor.value = editor.value.slice(0, start) + '    ' + editor.value.slice(editor.selectionEnd);
            editor.selectionStart = editor.selectionEnd = start + 4;
        }
    });

    editor.addEventListener('input', () => {
        updateLineNumbers();
        validateEditor();
        updateAutocomplete();
    });

    editor.addEventListener('scroll', () => {
        lineNumbersEl.scrollTop = editor.scrollTop;
    });

    editor.addEventListener('click', hideAutocomplete);
    editor.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));

    autocompleteEl.addEventListener('mousedown', (event) => {
        const item = event.target.closest('.asm-ac-item');
        if (item) {
            acIndex = [...autocompleteEl.children].indexOf(item);
            acceptAutocomplete();
        }
    });

    updateLineNumbers();
    validateEditor();

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
        const decoded = disassemble(word);
        const hex = (word & 0xFFFFFFFFFFn).toString(16).toUpperCase().padStart(10, '0');
        const bin = (word & 0xFFFFFFFFFFn).toString(2).padStart(40, '0');
        const signed = word >= (1n << 39n) ? (word - (1n << 40n)).toString() : word.toString();
        inspectorReadout.textContent = [
            `Addr:    ${String(addr).padStart(3, '0')}`,
            `Hex:     0x${hex}`,
            `Binary:  ${bin.slice(0,8)} ${bin.slice(8,20)} ${bin.slice(20,28)} ${bin.slice(28)}`,
            `Signed:  ${signed}`,
            `Left:    ${decoded.left}`,
            `Right:   ${decoded.right}`
        ].join('\n');
    };
    if (inspectorGo) { inspectorGo.addEventListener('click', updateInspector); }
    if (inspectorAddr) { inspectorAddr.addEventListener('change', updateInspector); }

    // Execution Trace - listen to log events
    const traceLog = mount.querySelector('#tools-trace-log');
    let traceLines = [];
    const pushTrace = (line) => {
        traceLines.push(line);
        if (traceLines.length > 200) { traceLines.shift(); }
        if (traceLog) { traceLog.textContent = traceLines.join('\n'); traceLog.scrollTop = traceLog.scrollHeight; }
    };
    // Hook into step events via MutationObserver on log
    const logRows = document.getElementById('sim-log-rows');
    if (logRows) {
        const observer = new MutationObserver(() => {
            const first = logRows.firstElementChild;
            if (first && first.textContent.startsWith('[')) {
                pushTrace(first.textContent);
            }
        });
        observer.observe(logRows, { childList: true });
    }

    toggleButton.addEventListener('click', () => {
        toolbar.classList.toggle('collapsed');
        mount.classList.toggle('collapsed');
    });

    document.addEventListener('keydown', (event) => {
        if ((event.key || '').toLowerCase() === 't') {
            const tag = (document.activeElement || {}).tagName || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }
            toolbar.classList.toggle('collapsed');
            mount.classList.toggle('collapsed');
        }
    });

    updateBuilderReadout();
    setActiveTab(mount, 'builder');
}
