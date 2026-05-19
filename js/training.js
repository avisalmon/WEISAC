/**
 * VEIZAC Training Module
 * Provides the lesson framework and a lightweight mini-simulator
 * for interactive exercises in the Training tab.
 */

// ============================================================================
// Constants
// ============================================================================

const WORD_BITS = 40n;
const MASK_40 = 0xFFFFFFFFFFn;
const SIGN_BIT = 1n << 39n;
const MEMORY_SIZE = 1024;

// ============================================================================
// Core Functions (exported)
// ============================================================================

/**
 * Mask a BigInt value to 40 bits with sign extension.
 */
export function mask40(value) {
    value = value & MASK_40;
    if (value & SIGN_BIT) {
        // Sign extend: value is negative in 40-bit two's complement
        return value - (1n << 40n);
    }
    return value;
}

/**
 * Extract left instruction (bits 0..19) from a 40-bit word.
 * Bit layout: [0..7] = opcode, [8..19] = address
 */
export function extractLeft(word) {
    const opcode = Number((word >> 32n) & 0xFFn);
    const address = Number((word >> 20n) & 0xFFFn);
    return { opcode, address };
}

/**
 * Extract right instruction (bits 20..39) from a 40-bit word.
 * Bit layout: [20..27] = opcode, [28..39] = address
 */
export function extractRight(word) {
    const opcode = Number((word >> 12n) & 0xFFn);
    const address = Number(word & 0xFFFn);
    return { opcode, address };
}

// ============================================================================
// Mini-Simulator (lightweight step-through engine for Training exercises)
// ============================================================================

export class MiniSimulator {
    constructor() {
        this.memory = new Array(MEMORY_SIZE).fill(0n);
        this.AC = 0n;
        this.MQ = 0n;
        this.PC = 0;
        this.side = 'left';
        this.jumped = false;
        this.halted = false;
        this.error = null;
        this.stepCount = 0;
    }

    reset() {
        this.memory.fill(0n);
        this.AC = 0n;
        this.MQ = 0n;
        this.PC = 0;
        this.side = 'left';
        this.jumped = false;
        this.halted = false;
        this.error = null;
        this.stepCount = 0;
    }

    /**
     * Execute a single opcode with the given address operand.
     */
    execute(opcode, addr) {
        this.jumped = false;

        switch (opcode) {
            case 0x00: // HALT
                this.halted = true;
                break;

            // Data Transfer
            case 0x01: // LOAD M(X)
                this.AC = mask40(this.memory[addr]);
                break;
            case 0x02: // LOAD -M(X)
                this.AC = mask40(-this.memory[addr]);
                break;
            case 0x03: // LOAD |M(X)|
                this.AC = mask40(this.memory[addr] < 0n ? -this.memory[addr] : this.memory[addr]);
                break;
            case 0x04: // LOAD -|M(X)|
                this.AC = mask40(-(this.memory[addr] < 0n ? -this.memory[addr] : this.memory[addr]));
                break;
            case 0x09: // LOAD MQ,M(X)
                this.MQ = mask40(this.memory[addr]);
                break;
            case 0x0A: // LOAD MQ
                this.AC = mask40(this.MQ);
                break;
            case 0x21: // STOR M(X)
                this.memory[addr] = mask40(this.AC);
                break;

            // Arithmetic
            case 0x05: // ADD M(X)
                this.AC = mask40(this.AC + this.memory[addr]);
                break;
            case 0x06: // SUB M(X)
                this.AC = mask40(this.AC - this.memory[addr]);
                break;
            case 0x07: // ADD |M(X)|
                this.AC = mask40(this.AC + (this.memory[addr] < 0n ? -this.memory[addr] : this.memory[addr]));
                break;
            case 0x08: // SUB |M(X)|
                this.AC = mask40(this.AC - (this.memory[addr] < 0n ? -this.memory[addr] : this.memory[addr]));
                break;
            case 0x0B: // MUL M(X): AC:MQ = MQ * M(X)
                {
                    const product = this.MQ * this.memory[addr];
                    this.AC = mask40(product >> 40n);
                    this.MQ = mask40(product & MASK_40);
                }
                break;
            case 0x0C: // DIV M(X): MQ = AC / M(X), AC = AC % M(X)
                if (this.memory[addr] === 0n) {
                    this.error = `Division by zero at PC=${this.PC}`;
                    throw new Error(this.error);
                }
                {
                    const quotient = this.AC / this.memory[addr];
                    const remainder = this.AC % this.memory[addr];
                    this.MQ = mask40(quotient);
                    this.AC = mask40(remainder);
                }
                break;
            case 0x14: // LSH
                this.AC = mask40(this.AC << 1n);
                break;
            case 0x15: // RSH (arithmetic)
                this.AC = mask40(this.AC >> 1n);
                break;

            // Address Modify
            case 0x12: // STOR M(X,8:19) — patch left address field
                {
                    const addrBits = this.AC & 0xFFFn;
                    const word = this.memory[addr];
                    // Clear bits 8..19 (positions 20..31 from LSB in 40-bit word)
                    const cleared = word & ~(0xFFFn << 20n);
                    this.memory[addr] = cleared | (addrBits << 20n);
                }
                break;
            case 0x13: // STOR M(X,28:39) — patch right address field
                {
                    const addrBits = this.AC & 0xFFFn;
                    const word = this.memory[addr];
                    // Clear bits 28..39 (positions 0..11 from LSB)
                    const cleared = word & ~0xFFFn;
                    this.memory[addr] = cleared | addrBits;
                }
                break;

            // Unconditional Jump
            case 0x0F: // JUMP M(X,0:19)
                this.PC = addr;
                this.side = 'left';
                this.jumped = true;
                break;
            case 0x10: // JUMP M(X,20:39)
                this.PC = addr;
                this.side = 'right';
                this.jumped = true;
                break;

            // Conditional Jump
            case 0x0D: // JUMP+ M(X,0:19)
                if (this.AC >= 0n) {
                    this.PC = addr;
                    this.side = 'left';
                    this.jumped = true;
                }
                break;
            case 0x0E: // JUMP+ M(X,20:39)
                if (this.AC >= 0n) {
                    this.PC = addr;
                    this.side = 'right';
                    this.jumped = true;
                }
                break;

            default:
                this.error = `Unknown opcode 0x${opcode.toString(16).padStart(2, '0')}`;
                throw new Error(this.error);
        }
    }

    /**
     * Execute one instruction at the current PC/side.
     */
    step() {
        if (this.halted) return;

        const word = this.memory[this.PC];
        const instr = this.side === 'left' ? extractLeft(word) : extractRight(word);

        this.execute(instr.opcode, instr.address);

        if (!this.jumped && !this.halted) {
            if (this.side === 'left') {
                this.side = 'right';
            } else {
                this.side = 'left';
                this.PC = (this.PC + 1) & 0x3FF;
            }
        }

        this.stepCount++;
    }

    /**
     * Run until halt or max steps reached.
     */
    run(maxSteps = 10000) {
        for (let i = 0; i < maxSteps && !this.halted && !this.error; i++) {
            this.step();
        }
    }

    /**
     * Load an array of { addr, value } into memory.
     */
    loadProgram(words) {
        for (const { addr, value } of words) {
            this.memory[addr] = BigInt(value);
        }
    }
}

// ============================================================================
// Lesson Data
// ============================================================================

export const LESSONS = [
    // Lesson 1: Architecture Overview
    {
        id: 1,
        title: 'Architecture Overview',
        sections: [
            {
                heading: 'The 40-bit Word',
                text: `The WEIZAC uses a <strong>40-bit word</strong> as its basic unit of data.
                    Every memory location holds one 40-bit word. Each word can store either:
                    <ul>
                        <li>A single 40-bit signed integer (range: -549,755,813,888 to +549,755,813,887)</li>
                        <li>Two 20-bit instructions (left half and right half)</li>
                    </ul>
                    This dual-use design is the hallmark of the <em>von Neumann architecture</em> —
                    code and data share the same memory.`
            },
            {
                heading: 'Two Instructions Per Word',
                text: `Each 40-bit word can hold two instructions:
                    <div class="word-diagram">
                        <span class="left-instr">Left Instruction (bits 0–19)</span>
                        <span class="right-instr">Right Instruction (bits 20–39)</span>
                    </div>
                    The processor executes the left instruction first, then the right instruction,
                    then moves to the next word.`
            },
            {
                heading: 'Registers',
                text: `The WEIZAC has only three registers:
                    <table class="register-table">
                        <tr><th>Register</th><th>Width</th><th>Purpose</th></tr>
                        <tr><td><code>AC</code></td><td>40 bits</td><td>Accumulator — holds results of calculations</td></tr>
                        <tr><td><code>MQ</code></td><td>40 bits</td><td>Multiplier/Quotient — used for multiply and divide</td></tr>
                        <tr><td><code>PC</code></td><td>12+1 bits</td><td>Program Counter — word address + side (left/right)</td></tr>
                    </table>`
            },
            {
                heading: 'Memory',
                text: `The original WEIZAC had <strong>1024 words</strong> of memory (addresses 0–1023).
                    Each word is 40 bits wide. Programs and data coexist in the same address space.
                    There is no separation between code and data — the same word can be executed
                    as an instruction or read as a number.`
            }
        ],
        exercises: [
            {
                id: 'arch-1',
                question: 'How many bits are in one WEIZAC memory word?',
                type: 'multiple-choice',
                options: ['8 bits', '16 bits', '32 bits', '40 bits', '64 bits'],
                answer: 3, // index of correct option (40 bits)
                explanation: 'The WEIZAC uses 40-bit words — unusual by modern standards but common in early machines.'
            },
            {
                id: 'arch-2',
                question: 'How many instructions fit in one word?',
                type: 'multiple-choice',
                options: ['1', '2', '4', '8'],
                answer: 1, // 2 instructions
                explanation: 'Each 40-bit word holds two 20-bit instructions (left and right).'
            },
            {
                id: 'arch-3',
                question: 'Which register holds the result of arithmetic operations?',
                type: 'multiple-choice',
                options: ['PC', 'MQ', 'AC', 'SP'],
                answer: 2, // AC
                explanation: 'The Accumulator (AC) holds the result of most arithmetic and load operations.'
            }
        ]
    },

    // Lesson 2: Instruction Format
    {
        id: 2,
        title: 'Instruction Format',
        sections: [
            {
                heading: 'The 20-bit Instruction',
                text: `Each instruction is 20 bits wide and consists of two fields:
                    <div class="instr-diagram">
                        <span class="opcode-field">Opcode (8 bits)</span>
                        <span class="addr-field">Address (12 bits)</span>
                    </div>
                    <ul>
                        <li><strong>Opcode</strong> (bits 0–7): Tells the machine what to do (load, add, jump, etc.)</li>
                        <li><strong>Address</strong> (bits 8–19): Points to a memory location (0–4095, though only 0–1023 used)</li>
                    </ul>`
            },
            {
                heading: 'Left and Right Layout',
                text: `In a 40-bit word, the two instructions are laid out as:
                    <pre class="bit-layout">
Bit:  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
      |------- Left Opcode -----|----------- Left Address ----------|------- Right Opcode ----|----------- Right Address ---------|
                    </pre>
                    The left instruction occupies bits 0–19, the right instruction bits 20–39.`
            },
            {
                heading: 'Execution Order',
                text: `The processor follows this cycle:
                    <ol>
                        <li>Fetch the word at the current PC address</li>
                        <li>Execute the left instruction (bits 0–19)</li>
                        <li>Execute the right instruction (bits 20–39)</li>
                        <li>Advance PC to the next word</li>
                    </ol>
                    Jumps can redirect execution to either the left or right instruction of any word.`
            }
        ],
        exercises: [
            {
                id: 'instr-1',
                question: 'How many bits does the opcode occupy?',
                type: 'multiple-choice',
                options: ['4 bits', '6 bits', '8 bits', '12 bits'],
                answer: 2, // 8 bits
                explanation: 'The opcode is 8 bits wide, allowing up to 256 possible instructions (only 21 are used).'
            },
            {
                id: 'instr-2',
                question: 'What is the maximum address value with a 12-bit address field?',
                type: 'multiple-choice',
                options: ['255', '1023', '4095', '65535'],
                answer: 2, // 4095
                explanation: '12 bits can represent values 0 to 4095 (2^12 - 1 = 4095).'
            },
            {
                id: 'instr-3',
                question: 'Given the hex word 0x05_064_21_0C8, what is the left opcode byte?',
                type: 'multiple-choice',
                options: ['0x05', '0x64', '0x21', '0xC8'],
                answer: 0, // 0x05
                explanation: 'The left opcode is the first 8 bits (the first 2 hex digits) of the word: 0x05.'
            },
            {
                id: 'instr-4',
                question: 'In that same word (0x05_064_21_0C8), what is the right instruction\'s address?',
                type: 'multiple-choice',
                options: ['0x064 (100)', '0x0C8 (200)', '0x21 (33)', '0x050 (80)'],
                answer: 1, // 0x0C8 = 200
                explanation: 'The right address is the last 12 bits: 0x0C8 = 200 in decimal.'
            }
        ]
    },

    // Lesson 3: Data Transfer Instructions
    {
        id: 3,
        title: 'Data Transfer Instructions',
        sections: [
            {
                heading: 'Moving Data Around',
                text: `Data transfer instructions move values between memory and registers.
                    The WEIZAC has 7 data transfer instructions:
                    <table class="opcode-table">
                        <tr><th>Mnemonic</th><th>Hex</th><th>Operation</th></tr>
                        <tr><td><code>LOAD M(X)</code></td><td>0x01</td><td>AC ← M(X)</td></tr>
                        <tr><td><code>LOAD -M(X)</code></td><td>0x02</td><td>AC ← -M(X)</td></tr>
                        <tr><td><code>LOAD |M(X)|</code></td><td>0x03</td><td>AC ← |M(X)|</td></tr>
                        <tr><td><code>LOAD -|M(X)|</code></td><td>0x04</td><td>AC ← -|M(X)|</td></tr>
                        <tr><td><code>LOAD MQ,M(X)</code></td><td>0x09</td><td>MQ ← M(X)</td></tr>
                        <tr><td><code>LOAD MQ</code></td><td>0x0A</td><td>AC ← MQ</td></tr>
                        <tr><td><code>STOR M(X)</code></td><td>0x21</td><td>M(X) ← AC</td></tr>
                    </table>`
            },
            {
                heading: 'Loading Values',
                text: `The basic pattern is: load a value from memory into the accumulator (AC).
                    <code>LOAD M(X)</code> copies the value at memory address X into AC.
                    The variants with <code>-</code> and <code>|...|</code> negate or take
                    the absolute value during the load — this was cheaper than having separate
                    negate instructions on early hardware.`
            },
            {
                heading: 'Storing Values',
                text: `<code>STOR M(X)</code> writes the current value of AC into memory address X.
                    This is how you save results. The accumulator is not cleared by storing —
                    AC retains its value after a STOR instruction.`
            },
            {
                heading: 'The MQ Register',
                text: `The MQ (Multiplier/Quotient) register is a second storage register.
                    <code>LOAD MQ,M(X)</code> loads a value from memory into MQ (not AC).
                    <code>LOAD MQ</code> copies MQ into AC (ignores the address field).
                    MQ is primarily used for multiply and divide operations (covered in Lesson 4).`
            }
        ],
        exercises: [
            {
                id: 'data-1',
                question: 'After executing LOAD M(100) when M(100) = 42, what is AC?',
                type: 'multiple-choice',
                options: ['0', '42', '-42', '100'],
                answer: 1, // 42
                explanation: 'LOAD M(X) copies the value at address X into AC. M(100) = 42, so AC = 42.'
            },
            {
                id: 'data-2',
                question: 'After executing LOAD -M(100) when M(100) = 42, what is AC?',
                type: 'multiple-choice',
                options: ['42', '-42', '0', 'Error'],
                answer: 1, // -42
                explanation: 'LOAD -M(X) negates the value: AC = -M(100) = -42.'
            },
            {
                id: 'data-3',
                question: 'What instruction would you use to save AC into memory address 200?',
                type: 'multiple-choice',
                options: ['LOAD M(200)', 'STOR M(200)', 'LOAD MQ,M(200)', 'ADD M(200)'],
                answer: 1, // STOR M(200)
                explanation: 'STOR M(X) writes AC into memory at address X.'
            },
            {
                id: 'data-4',
                type: 'simulate',
                question: 'What are AC and MQ after these two instructions? LOAD MQ,M(50) then LOAD MQ (where M(50) = 99)',
                setup: { memory: { 50: 99 } },
                program: [
                    { opcode: 0x09, address: 50 },  // LOAD MQ,M(50)
                    { opcode: 0x0A, address: 0 }    // LOAD MQ
                ],
                expectedAC: 99n,
                expectedMQ: 99n,
                explanation: 'LOAD MQ,M(50) puts 99 into MQ. LOAD MQ copies MQ into AC. Both end up 99.'
            }
        ]
    }
];

// ============================================================================
// Lesson Renderer (DOM manipulation for Training tab)
// ============================================================================

export class LessonRenderer {
    constructor(containerEl) {
        this.container = containerEl;
        this.currentLesson = 0;
        this.progress = this.loadProgress();
    }

    loadProgress() {
        try {
            return JSON.parse(localStorage.getItem('veizac-training-progress') || '{}');
        } catch {
            return {};
        }
    }

    saveProgress() {
        localStorage.setItem('veizac-training-progress', JSON.stringify(this.progress));
    }

    render() {
        const lesson = LESSONS[this.currentLesson];
        if (!lesson) return;

        this.container.innerHTML = `
            <div class="training-wrapper">
                <div class="lesson-nav-top">
                    <span class="lesson-progress">Lesson ${this.currentLesson + 1} of ${LESSONS.length}</span>
                    <div class="progress-dots">
                        ${LESSONS.map((_, i) => `<span class="dot${i === this.currentLesson ? ' active' : ''}${this.progress[i] ? ' completed' : ''}"></span>`).join('')}
                    </div>
                </div>

                <h2 class="lesson-title">Lesson ${lesson.id}: ${lesson.title}</h2>

                <div class="lesson-content">
                    ${(lesson.sections || []).map(s => `
                        <section class="lesson-section">
                            <h3>${s.heading}</h3>
                            <div class="section-text">${s.text}</div>
                        </section>
                    `).join('')}
                </div>

                <div class="exercises">
                    <h3>Exercises</h3>
                    ${lesson.exercises.map((ex, i) => this.renderExercise(ex, i)).join('')}
                </div>

                <div class="lesson-nav-bottom">
                    <button class="btn-prev" ${this.currentLesson === 0 ? 'disabled' : ''}>← Previous</button>
                    <button class="btn-next" ${this.currentLesson >= LESSONS.length - 1 ? 'disabled' : ''}>Next →</button>
                </div>
            </div>
        `;

        this.attachEvents();
    }

    renderExercise(exercise, index) {
        if (exercise.type === 'multiple-choice') {
            return `
                <div class="exercise" data-index="${index}">
                    <p class="exercise-question">${exercise.question}</p>
                    <div class="exercise-options">
                        ${exercise.options.map((opt, i) => `
                            <label class="option">
                                <input type="radio" name="ex-${exercise.id}" value="${i}">
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                    <button class="btn-check" data-exercise="${exercise.id}">Check Answer</button>
                    <div class="exercise-feedback"></div>
                </div>
            `;
        }
        if (exercise.type === 'simulate') {
            return `
                <div class="exercise exercise-simulate" data-index="${index}">
                    <p class="exercise-question">${exercise.question}</p>
                    <button class="btn-run-sim" data-exercise="${exercise.id}">Run Simulation</button>
                    <div class="sim-output"></div>
                    <div class="exercise-feedback"></div>
                </div>
            `;
        }
        return '';
    }

    attachEvents() {
        const prev = this.container.querySelector('.btn-prev');
        const next = this.container.querySelector('.btn-next');

        if (prev) prev.addEventListener('click', () => this.goTo(this.currentLesson - 1));
        if (next) next.addEventListener('click', () => this.goTo(this.currentLesson + 1));

        // Check buttons for multiple-choice
        this.container.querySelectorAll('.btn-check').forEach(btn => {
            btn.addEventListener('click', () => this.checkAnswer(btn));
        });

        // Run simulation buttons
        this.container.querySelectorAll('.btn-run-sim').forEach(btn => {
            btn.addEventListener('click', () => this.runSimExercise(btn));
        });
    }

    goTo(index) {
        if (index >= 0 && index < LESSONS.length) {
            this.currentLesson = index;
            this.render();
            this.scrollToLessonTop();
        }
    }

    scrollToLessonTop() {
        const wrapper = this.container.querySelector('.training-wrapper');
        const target = wrapper || this.container;
        if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }

    checkAnswer(btn) {
        const exerciseId = btn.dataset.exercise;
        const lesson = LESSONS[this.currentLesson];
        const exercise = lesson.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        const exerciseEl = btn.closest('.exercise');
        const selected = exerciseEl.querySelector(`input[name="ex-${exerciseId}"]:checked`);
        const feedback = exerciseEl.querySelector('.exercise-feedback');

        if (!selected) {
            feedback.innerHTML = '<span class="feedback-hint">Please select an answer.</span>';
            return;
        }

        const answer = parseInt(selected.value, 10);
        if (answer === exercise.answer) {
            feedback.innerHTML = `<span class="feedback-correct">✓ Correct! ${exercise.explanation}</span>`;
            this.markExerciseComplete(exerciseId);
        } else {
            feedback.innerHTML = `<span class="feedback-wrong">✗ Not quite. ${exercise.explanation}</span>`;
        }
    }

    runSimExercise(btn) {
        const exerciseId = btn.dataset.exercise;
        const lesson = LESSONS[this.currentLesson];
        const exercise = lesson.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        const sim = new MiniSimulator();
        if (exercise.setup && exercise.setup.memory) {
            for (const [addr, val] of Object.entries(exercise.setup.memory)) {
                sim.memory[parseInt(addr, 10)] = BigInt(val);
            }
        }

        for (const instr of exercise.program) {
            sim.execute(instr.opcode, instr.address);
        }

        const exerciseEl = btn.closest('.exercise');
        const output = exerciseEl.querySelector('.sim-output');
        const feedback = exerciseEl.querySelector('.exercise-feedback');

        output.innerHTML = `<code>AC = ${sim.AC}, MQ = ${sim.MQ}</code>`;

        const acCorrect = sim.AC === exercise.expectedAC;
        const mqCorrect = sim.MQ === exercise.expectedMQ;

        if (acCorrect && mqCorrect) {
            feedback.innerHTML = `<span class="feedback-correct">✓ Correct! ${exercise.explanation}</span>`;
            this.markExerciseComplete(exerciseId);
        } else {
            feedback.innerHTML = `<span class="feedback-wrong">Result shown above. ${exercise.explanation}</span>`;
        }
    }

    markExerciseComplete(exerciseId) {
        if (!this.progress[this.currentLesson]) {
            this.progress[this.currentLesson] = {};
        }
        this.progress[this.currentLesson][exerciseId] = true;

        // Check if all exercises in this lesson are complete
        const lesson = LESSONS[this.currentLesson];
        const allDone = lesson.exercises.every(ex => this.progress[this.currentLesson][ex.id]);
        if (allDone) {
            this.progress[this.currentLesson]._complete = true;
        }
        this.saveProgress();
    }
}

// ============================================================================
// Initialize Training Tab (called from main.js or inline)
// ============================================================================

export function initTraining(containerEl) {
    const renderer = new LessonRenderer(containerEl);
    renderer.render();
    return renderer;
}
