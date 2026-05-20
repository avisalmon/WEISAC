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
function mask40(value) {
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
function extractLeft(word) {
    const opcode = Number((word >> 32n) & 0xFFn);
    const address = Number((word >> 20n) & 0xFFFn);
    return { opcode, address };
}

/**
 * Extract right instruction (bits 20..39) from a 40-bit word.
 * Bit layout: [20..27] = opcode, [28..39] = address
 */
function extractRight(word) {
    const opcode = Number((word >> 12n) & 0xFFn);
    const address = Number(word & 0xFFFn);
    return { opcode, address };
}

// ============================================================================
// Mini-Simulator (lightweight step-through engine for Training exercises)
// ============================================================================

class MiniSimulator {
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

const LESSONS = [
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
    },

    // Lesson 4: Arithmetic Instructions
    {
        id: 4,
        title: 'Arithmetic Instructions',
        sections: [
            {
                heading: 'Addition and Subtraction',
                text: `The WEIZAC can add and subtract numbers, with variants for absolute values.
                    <table class="opcode-table">
                        <tr><th>Mnemonic</th><th>Hex</th><th>Operation</th></tr>
                        <tr><td><code>ADD M(X)</code></td><td>0x05</td><td>AC ← AC + M(X)</td></tr>
                        <tr><td><code>SUB M(X)</code></td><td>0x06</td><td>AC ← AC - M(X)</td></tr>
                        <tr><td><code>ADD |M(X)|</code></td><td>0x07</td><td>AC ← AC + |M(X)|</td></tr>
                        <tr><td><code>SUB |M(X)|</code></td><td>0x08</td><td>AC ← AC - |M(X)|</td></tr>
                    </table>
                    The accumulator is updated with the result. If the result exceeds 40 bits, it wraps (truncates).`
            },
            {
                heading: 'Multiplication',
                text: `<code>MUL M(X)</code> multiplies MQ by the value at address X.
                    The result is 80 bits (up to twice the width):
                    <ul>
                        <li><strong>High 40 bits</strong> → AC</li>
                        <li><strong>Low 40 bits</strong> → MQ</li>
                    </ul>
                    Example: 2^40 × 2^40 produces a 2^80 result, split between AC (high) and MQ (low).
                    For smaller products, AC is usually 0.`
            },
            {
                heading: 'Division',
                text: `<code>DIV M(X)</code> divides AC by the value at address X.
                    <ul>
                        <li><strong>Quotient</strong> → MQ</li>
                        <li><strong>Remainder</strong> → AC</li>
                    </ul>
                    Example: AC = 17, M(X) = 5 → MQ = 3 (quotient), AC = 2 (remainder).
                    <strong>Division by zero causes an ERROR</strong> — the machine halts and displays an error message.`
            },
            {
                heading: 'Shifts',
                text: `The WEIZAC can shift the accumulator left or right by 1 bit (no address needed):
                    <table class="opcode-table">
                        <tr><th>Mnemonic</th><th>Hex</th><th>Operation</th></tr>
                        <tr><td><code>LSH</code></td><td>0x14</td><td>AC ← AC &lt;&lt; 1 (logical left shift)</td></tr>
                        <tr><td><code>RSH</code></td><td>0x15</td><td>AC ← AC &gt;&gt; 1 (arithmetic right shift)</td></tr>
                    </table>
                    <strong>LSH</strong> (logical left shift): shift left, fill with zeros on the right.
                    <strong>RSH</strong> (arithmetic right shift): shift right, preserve the sign bit (bit 39).`
            },
            {
                heading: 'Overflow and Truncation',
                text: `When the result of arithmetic exceeds 40 bits, the WEIZAC silently truncates it to 40 bits.
                    There is no overflow flag; the result simply wraps.
                    <ul>
                        <li>ADD or SUB: result masked to 40 bits</li>
                        <li>MUL: 80-bit result split into AC (high) and MQ (low)</li>
                        <li>DIV: both quotient and remainder are 40 bits</li>
                    </ul>`
            }
        ],
        exercises: [
            {
                id: 'arith-1',
                question: 'If AC = 10 and M(50) = 7, what is AC after ADD M(50)?',
                type: 'multiple-choice',
                options: ['3', '7', '17', '70'],
                answer: 2, // 17
                explanation: 'ADD M(X) adds: AC = AC + M(X) = 10 + 7 = 17.'
            },
            {
                id: 'arith-2',
                question: 'If AC = 10 and M(50) = 7, what is AC after SUB M(50)?',
                type: 'multiple-choice',
                options: ['3', '17', '-3', 'Error'],
                answer: 0, // 3
                explanation: 'SUB M(X) subtracts: AC = AC - M(X) = 10 - 7 = 3.'
            },
            {
                id: 'arith-3',
                question: 'After MUL M(X) where MQ = 2^40 and M(X) = 2^40, which register holds the high 40 bits?',
                type: 'multiple-choice',
                options: ['MQ', 'AC', 'PC', 'Both'],
                answer: 1, // AC
                explanation: 'MUL M(X) produces up to 80 bits. High 40 bits go to AC, low 40 bits go to MQ.'
            },
            {
                id: 'arith-4',
                question: 'If AC = 17 and M(50) = 5, after DIV M(50), what are MQ and AC?',
                type: 'multiple-choice',
                options: ['MQ=3, AC=2', 'MQ=2, AC=3', 'MQ=17, AC=5', 'Error'],
                answer: 0, // MQ=3, AC=2
                explanation: 'DIV M(X): quotient (17÷5=3) goes to MQ, remainder (17%5=2) goes to AC.'
            },
            {
                id: 'arith-5',
                type: 'simulate',
                question: 'After LSH (when AC = 5), what is AC?',
                setup: { AC: 5 },
                program: [
                    { opcode: 0x14, address: 0 }  // LSH
                ],
                expectedAC: 10n,
                explanation: 'LSH left-shifts AC by 1: AC = 5 << 1 = 10.'
            },
            {
                id: 'arith-6',
                type: 'simulate',
                question: 'After RSH (when AC = 10), what is AC?',
                setup: { AC: 10 },
                program: [
                    { opcode: 0x15, address: 0 }  // RSH
                ],
                expectedAC: 5n,
                explanation: 'RSH right-shifts AC by 1 (preserving sign): AC = 10 >> 1 = 5.'
            }
        ]
    },

    // Lesson 5: Branching and Jumps
    {
        id: 5,
        title: 'Branching and Jumps',
        sections: [
            {
                heading: 'Unconditional Jumps',
                text: `A <strong>jump</strong> changes the program counter (PC) to a new location.
                    The WEIZAC has two unconditional jump instructions (always jump):
                    <table class="opcode-table">
                        <tr><th>Mnemonic</th><th>Hex</th><th>Operation</th></tr>
                        <tr><td><code>JUMP M(X,0:19)</code></td><td>0x0F</td><td>PC ← X, execute left instruction</td></tr>
                        <tr><td><code>JUMP M(X,20:39)</code></td><td>0x10</td><td>PC ← X, execute right instruction</td></tr>
                    </table>
                    The notation <code>M(X,0:19)</code> means "the left half of the word at address X".
                    <code>M(X,20:39)</code> means "the right half". The machine jumps to word address X,
                    but chooses whether to start with the left or right instruction.`
            },
            {
                heading: 'Conditional Jumps',
                text: `Conditional jumps check the sign of the accumulator:
                    <table class="opcode-table">
                        <tr><th>Mnemonic</th><th>Hex</th><th>Operation</th></tr>
                        <tr><td><code>JUMP+ M(X,0:19)</code></td><td>0x0D</td><td>if AC ≥ 0: PC ← X, execute left; else continue</td></tr>
                        <tr><td><code>JUMP+ M(X,20:39)</code></td><td>0x0E</td><td>if AC ≥ 0: PC ← X, execute right; else continue</td></tr>
                    </table>
                    <strong>JUMP+</strong> means "jump if positive (or zero)". The condition is AC ≥ 0.
                    If AC is negative, the JUMP+ instruction has no effect — execution continues to the next instruction.`
            },
            {
                heading: 'PC is Composite: Address + Side',
                text: `The Program Counter (PC) is not just a word address; it also tracks which half of the word to execute:
                    <ul>
                        <li><strong>PC.addr</strong>: word address (12 bits, 0–1023)</li>
                        <li><strong>PC.side</strong>: 'left' or 'right'</li>
                    </ul>
                    When the machine boots, PC = { addr: 0, side: 'left' }.
                    After executing the left instruction, PC.side becomes 'right'.
                    After executing the right instruction, PC advances to { addr + 1, side: 'left' }.`
            },
            {
                heading: 'Using Jumps for Loops',
                text: `Loops are built by jumping backward to an earlier instruction.
                    Example: countdown from 10 to 0:
                    <pre>
ORG 100
            LOAD M(200)      ; left:  load counter into AC
            ADD -1           ; right: subtract 1

COUNT_LOOP: STOR M(200)      ; left:  save counter
            JUMP+ M(101, 0)  ; right: if AC ≥ 0, jump back to word 101 left

101:        [next code]      ; if AC < 0, fall through
                    </pre>
                    The <strong>JUMP+ M(101, 0:19)</strong> re-executes the LOAD and ADD,
                    creating a loop that runs until AC becomes negative.`
            }
        ],
        exercises: [
            {
                id: 'branch-1',
                question: 'What does JUMP M(50, 0:19) do?',
                type: 'multiple-choice',
                options: [
                    'Jump to address 50, execute the right instruction',
                    'Jump to address 50, execute the left instruction',
                    'Jump to bit 50',
                    'Nothing (invalid instruction)'
                ],
                answer: 1, // Jump to address 50, execute the left instruction
                explanation: 'JUMP M(X, 0:19) sets PC to { addr: X, side: "left" }.'
            },
            {
                id: 'branch-2',
                question: 'When will JUMP+ M(50, 0:19) actually jump?',
                type: 'multiple-choice',
                options: [
                    'Always',
                    'Only if AC is positive (> 0)',
                    'Only if AC is non-negative (≥ 0)',
                    'Only if AC equals 50'
                ],
                answer: 2, // Only if AC is non-negative (≥ 0)
                explanation: 'JUMP+ jumps if AC ≥ 0 (positive or zero). If AC < 0, it does nothing.'
            },
            {
                id: 'branch-3',
                question: 'If AC = -5 and you execute JUMP+ M(75, 0:19), what happens?',
                type: 'multiple-choice',
                options: [
                    'PC jumps to 75, execute left',
                    'PC does not change, execution continues to next instruction',
                    'AC becomes 75',
                    'Error'
                ],
                answer: 1, // PC does not change
                explanation: 'AC = -5 < 0, so the JUMP+ condition is false. PC does not change.'
            },
            {
                id: 'branch-4',
                question: 'Assuming a JUMP at address 50 that jumps to address 40, what is executed after the jump?',
                type: 'multiple-choice',
                options: [
                    'The instruction at address 51',
                    'The left instruction at address 40',
                    'The right instruction at address 50',
                    'Depends on the jump type'
                ],
                answer: 1, // The left instruction at address 40 (or right, depends on jump type)
                explanation: 'After JUMP M(X, 0:19), PC = { addr: X, side: "left" }, so the next instruction is the left half of word X.'
            },
            {
                id: 'branch-5',
                type: 'simulate',
                question: 'With AC = 1, after JUMP+ M(10, 0:19), what is PC.addr and PC.side?',
                setup: { AC: 1 },
                program: [
                    { opcode: 0x0D, address: 10 }  // JUMP+ M(10, 0:19)
                ],
                expectedPC_addr: 10,
                expectedPC_side: 'left',
                explanation: 'AC = 1 ≥ 0, so jump happens. PC = { addr: 10, side: "left" }.'
            },
            {
                id: 'branch-6',
                type: 'simulate',
                question: 'With AC = -1, after JUMP+ M(10, 0:19), does PC change?',
                setup: { AC: -1 },
                program: [
                    { opcode: 0x0D, address: 10 }  // JUMP+ M(10, 0:19)
                ],
                expectedPC_unchanged: true,
                explanation: 'AC = -1 < 0, so the jump does not happen. PC remains unchanged.'
            }
        ]
    },

    // Lesson 6: Self-Modifying Code
    {
        id: 6,
        title: 'Self-Modifying Code',
        sections: [
            {
                heading: 'What is Self-Modifying Code?',
                text: `<strong>Self-modifying code</strong> means a program that changes its own instructions at runtime.
                    While this sounds dangerous (and it is!), it was essential on early computers with limited memory.
                    By modifying the address field of a LOAD or STORE instruction, a program can iterate
                    over an array without a separate index counter.`
            },
            {
                heading: 'Address Modify Instructions',
                text: `The WEIZAC has two instructions specifically for self-modifying code:
                    <table class="opcode-table">
                        <tr><th>Mnemonic</th><th>Hex</th><th>Operation</th></tr>
                        <tr><td><code>STOR M(X,8:19)</code></td><td>0x12</td><td>M(X)[bits 8-19] ← AC[bits 28-39]</td></tr>
                        <tr><td><code>STOR M(X,28:39)</code></td><td>0x13</td><td>M(X)[bits 28-39] ← AC[bits 28-39]</td></tr>
                    </table>
                    Instead of storing all 40 bits of AC to memory, these instructions store only the lowest 12 bits
                    into a specific address field of the word at M(X).
                    <ul>
                        <li><strong>0x12</strong>: Replace the address field of the <em>left</em> instruction (bits 8-19)</li>
                        <li><strong>0x13</strong>: Replace the address field of the <em>right</em> instruction (bits 28-39)</li>
                    </ul>`
            },
            {
                heading: 'Patching Instructions On The Fly',
                text: `Here's a concrete example: loading 3 values from consecutive addresses (array):
                    <pre>
; Array at addresses 100, 101, 102
DATA 10              ; M(100) = 10
DATA 20              ; M(101) = 20
DATA 30              ; M(102) = 30

ORG 50
SUM:    LOAD M(100)  ; Load first element (hardcoded address 100)
        ADD M(101)   ; Add second element (hardcoded address 101)
        ADD M(102)   ; Add third element (hardcoded address 102)
        STOR M(0)    ; Save result
        HALT
                    </pre>
                    
                    With self-modifying code, we can write a <strong>loop</strong> that increments the address:
                    <pre>
LOOP:   LOAD M(100)  ; Load from address (starts at 100)
        ADD M(101)   ; Add to accumulator
        
NEXT:   LOAD M(200)  ; Load current address into AC
        ADD M(1)     ; Increment by 1
        STOR M(LOAD_ADDR, 8:19)  ; Patch the LOAD address
        STOR M(ADD_ADDR, 8:19)   ; Patch the ADD address
        
        JUMP+ M(LOOP_AGAIN, 0)   ; Jump back if AC still ≥ 0
                    </pre>
                    This avoids hardcoding every address and works for arrays of any length.`
            },
            {
                heading: 'Live-Memory Semantics',
                text: `When the left instruction modifies the current word's right half,
                    the right instruction sees the <strong>new value immediately</strong>.
                    This is because the WEIZAC re-reads memory for each instruction (no instruction buffer).
                    This behavior is both a feature and a trap — you must be careful not to corrupt
                    the very instruction you are about to execute!`
            }
        ],
        exercises: [
            {
                id: 'selfmod-1',
                question: 'What is the purpose of STOR M(X, 8:19)?',
                type: 'multiple-choice',
                options: [
                    'Store AC into memory at address X',
                    'Patch the address field of the left instruction at M(X)',
                    'Patch the address field of the right instruction at M(X)',
                    'Clear bits 8-19 of memory location X'
                ],
                answer: 1, // Patch the address field of the left instruction at M(X)
                explanation: 'STOR M(X, 8:19) replaces bits 8-19 (the address of the left instruction) with AC[28-39].'
            },
            {
                id: 'selfmod-2',
                question: 'Which bits of AC are used when executing STOR M(X, 8:19)?',
                type: 'multiple-choice',
                options: [
                    'All 40 bits',
                    'Bits 0-7 (low byte)',
                    'Bits 28-39 (lowest 12 bits)',
                    'Bits 8-19'
                ],
                answer: 2, // Bits 28-39 (lowest 12 bits)
                explanation: 'Only the lowest 12 bits of AC (bits 28-39) are extracted and used to patch the address field.'
            },
            {
                id: 'selfmod-3',
                question: 'If you execute "STOR M(X, 8:19)" with AC = 205, what address gets patched into the left instruction?',
                type: 'multiple-choice',
                options: [
                    '0',
                    '205',
                    '205 & 0xFFF (205 masked to 12 bits)',
                    'Depends on memory layout'
                ],
                answer: 2, // 205 & 0xFFF
                explanation: 'The lowest 12 bits of AC (205 = 0x0CD, which is 12 bits) patch the address field.'
            },
            {
                id: 'selfmod-4',
                question: 'Why is self-modifying code useful for array iteration?',
                type: 'multiple-choice',
                options: [
                    'It saves memory by avoiding hardcoded addresses',
                    'It runs faster than using index registers',
                    'It allows arrays of unlimited size',
                    'All of the above (sort of)'
                ],
                answer: 0, // It saves memory by avoiding hardcoded addresses
                explanation: 'Early computers had no index registers. Self-modifying code let you loop over arrays without an extra register.'
            },
            {
                id: 'selfmod-5',
                type: 'simulate',
                question: 'If M(50) = 0x05_064_21_0C8 and we execute STOR M(50, 8:19) with AC = 0x12 (address 18), what is the new left address?',
                setup: { memory: { 50: 0x050640210C8n } },
                program: [
                    { opcode: 0x12, address: 50 }  // STOR M(50, 8:19)
                ],
                expectedLeftAddr: 18,
                explanation: 'STOR M(X, 8:19) patches the left address field (bits 8-19) with the lowest 12 bits of AC.'
            }
        ]
    }
];

// ============================================================================
// Lesson Renderer (DOM manipulation for Training tab)
// ============================================================================

class LessonRenderer {
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
                <div class="training-layout">
                    <aside class="lesson-tracker" aria-label="Lesson tracker">
                        <h3>Lessons</h3>
                        <div class="lesson-tracker-list">
                            ${LESSONS.map((l, i) => `
                                <button class="lesson-tracker-item${i === this.currentLesson ? ' active' : ''}${this.progress[i] && this.progress[i]._complete ? ' completed' : ''}" data-lesson-index="${i}">
                                    <span class="lesson-tracker-index">${l.id}</span>
                                    <span class="lesson-tracker-title">${l.title}</span>
                                </button>
                            `).join('')}
                        </div>
                    </aside>

                    <div class="training-main">
                        <div class="lesson-nav-top">
                            <div class="lesson-progress-wrap">
                                <span class="lesson-progress">Lesson ${this.currentLesson + 1} of ${LESSONS.length}</span>
                                <div class="progress-dots">
                                    ${LESSONS.map((_, i) => `<span class="dot${i === this.currentLesson ? ' active' : ''}${this.progress[i] ? ' completed' : ''}"></span>`).join('')}
                                </div>
                            </div>
                            <div class="lesson-nav-top-buttons">
                                <button class="btn-prev btn-prev-top" ${this.currentLesson === 0 ? 'disabled' : ''}>← Previous</button>
                                <button class="btn-next btn-next-top" ${this.currentLesson >= LESSONS.length - 1 ? 'disabled' : ''}>Next →</button>
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
        this.container.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', () => this.goTo(this.currentLesson - 1));
        });
        this.container.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', () => this.goTo(this.currentLesson + 1));
        });

        this.container.querySelectorAll('.lesson-tracker-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.lessonIndex, 10);
                this.goTo(idx);
            });
        });

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

function initTraining(containerEl) {
    const renderer = new LessonRenderer(containerEl);
    renderer.render();
    return renderer;
}


window.VEIZACTraining = { mask40, extractLeft, extractRight, MiniSimulator, LESSONS, LessonRenderer, initTraining };

