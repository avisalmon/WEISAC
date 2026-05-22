import { assemble, disassemble } from './assembler.js';

const BUILDER_OPS = [
    { mnemonic: 'LOAD M(X)', opcode: 0x01, needsAddress: true },
    { mnemonic: 'ADD M(X)', opcode: 0x05, needsAddress: true },
    { mnemonic: 'SUB M(X)', opcode: 0x06, needsAddress: true },
    { mnemonic: 'STOR M(X)', opcode: 0x21, needsAddress: true },
    { mnemonic: 'LOAD MQ', opcode: 0x0A, needsAddress: false },
    { mnemonic: 'HALT', opcode: 0x00, needsAddress: false }
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
    const text = (line || '').trim();
    if (!text) {
        return null;
    }

    const noAddr = text.match(/^(HALT|LOAD\s+MQ)$/i);
    if (noAddr) {
        const op = noAddr[1].toUpperCase() === 'HALT' ? 0x00 : 0x0A;
        return { opcode: op, address: 0 };
    }

    const withAddr = text.match(/^(LOAD|ADD|SUB|STOR)\s+M\((\d+)\)$/i);
    if (withAddr) {
        const stem = withAddr[1].toUpperCase();
        const addr = Number(withAddr[2]);
        const opcodeMap = { LOAD: 0x01, ADD: 0x05, SUB: 0x06, STOR: 0x21 };
        return { opcode: opcodeMap[stem], address: addr };
    }

    return null;
}

function buildPanelHtml() {
    const options = BUILDER_OPS.map((op) => `<option value="${op.opcode}">${op.mnemonic}</option>`).join('');

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
    const editor = mount.querySelector('#tools-editor-source');
    const translatorInput = mount.querySelector('#tools-translator-input');
    const translatorReadout = mount.querySelector('#tools-translator-readout');
    const editorStatus = mount.querySelector('#tools-editor-status');

    editor.value = SAMPLE_SOURCE;

    const updateBuilderReadout = () => {
        const opcode = Number(opSelect.value);
        const op = BUILDER_OPS.find((item) => item.opcode === opcode) || BUILDER_OPS[0];
        const rawAddr = Number(addrInput.value || 0);
        const address = Math.max(0, Math.min(4095, rawAddr));
        const encoded = encodeHalf(opcode, op.needsAddress ? address : 0);
        const binary = encoded.toString(2).padStart(20, '0').replace(/(.{4})/g, '$1 ').trim();
        const hex = `0x${encoded.toString(16).toUpperCase().padStart(5, '0')}`;
        const mnemonic = op.needsAddress ? op.mnemonic.replace('X', String(address)) : op.mnemonic;

        readout.textContent = `${mnemonic} | binary ${binary} | hex ${hex}`;
        return mnemonic;
    };

    const insertIntoEditor = (side) => {
        const line = updateBuilderReadout();
        const suffix = side === 'right' ? ' ; preferred right half' : '';
        const insertText = `${line}${suffix}\n`;
        const pos = editor.selectionStart;
        const before = editor.value.slice(0, pos);
        const after = editor.value.slice(pos);
        editor.value = before + insertText + after;
        editor.selectionStart = editor.selectionEnd = pos + insertText.length;
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
            const left = disassemble((BigInt(value) << 20n) | 0n).left;
            translatorReadout.textContent = `Hex ${input} -> ${left}`;
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
