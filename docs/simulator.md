# WEIZAC Simulator Implementation Specification

## Purpose

A browser-based IAS/WEIZAC machine simulator written in plain JavaScript. No dependencies, no build step. Runs entirely client-side as part of the static GitHub Pages site.

---

## File Layout

```
docs/js/
  simulator.js     <- Machine model (CPU + memory, pure logic, no DOM)
  assembler.js     <- Two-pass assembler with smart label resolution
  audio.js         <- Web Audio API sound engine (hum, clicks, buzzer)
  ui.js            <- Panel rendering, indicator lights, controls, memory grid
  tape.js          <- Paper tape punch/feed animation
  tools.js         <- Instruction builder, binary translator, word inspector
```

`simulator.js` is a pure-logic module. It exports the machine state and step/run/reset functions. It never touches the DOM. This separation allows unit testing outside the browser.

`audio.js` synthesizes all sounds via Web Audio API oscillators and gain nodes (no audio file downloads). Total footprint < 50KB.

`tape.js` renders the paper tape strip and drives the punch/feed animations. Communicates with `ui.js` for load sequencing.

`tools.js` implements the modern overlay tools (instruction builder, translator, inspector). Each tool is a self-contained UI component that reads from and writes to the assembler/simulator APIs.

---

## Machine Model

### Constants

```
WORD_BITS     = 40
OPCODE_BITS   = 8
ADDR_BITS     = 12
INSTR_BITS    = 20     (OPCODE_BITS + ADDR_BITS)
MEMORY_SIZE   = 1024   (words, addressable 0x000 to 0x3FF)
```

### Registers

| Register | Width | Description |
|----------|-------|-------------|
| AC       | 40 bits | Accumulator |
| MQ       | 40 bits | Multiplier/Quotient |
| PC       | composite | Program Counter: word address (12 bits) + side ('left' or 'right') |

Internal state (not architecturally visible):

| Field | Description |
|-------|-------------|
| state | Machine state: 'off' \| 'booting' \| 'ready' \| 'running' \| 'halted' \| 'error' |
| error | String describing fault, or null |

### Number Representation

- 40-bit signed integers, two's complement.
- Bit 39 is the sign bit (MSB). Bit 0 is the LSB.
- Range: -(2^39) to (2^39 - 1), i.e. -549,755,813,888 to +549,755,813,887.

Implementation note: JavaScript bitwise operators (`>>`, `&`, `|`, `^`) coerce operands to **signed 32-bit integers**. Since our words are 40 bits, shifts like `word >> 32` silently fail. Therefore:

- **Use `BigInt` for all word storage, registers (AC, MQ), and bit manipulation.**
- All constants become BigInt literals: `0xFFn`, `0xFFFn`, `32n`, etc.
- Extraction: `leftOpcode = Number((word >> 32n) & 0xFFn)`
- `mask40(value)`: `value & 0xFFFFFFFFFFn` then sign-extend if bit 39 is set.
- Multiply produces an 80-bit BigInt result naturally — no special handling.
- Convert to `Number` only at the UI boundary (display, comparison).
- Performance is not a concern at our instruction rates (max ~2000/sec).

### Memory

- Array of 1024 entries, each a 40-bit value stored as a BigInt (0n default).
- Initialized to all zeros on reset.
- Programs and data coexist in the same memory space (von Neumann architecture).

---

## Instruction Encoding

Each 40-bit word holds two 20-bit instructions:

```
Bit positions (0 = MSB, 39 = LSB):

  [0..7]   = left opcode
  [8..19]  = left address
  [20..27] = right opcode
  [28..39] = right address
```

Extraction (BigInt):

```
leftOpcode  = Number((word >> 32n) & 0xFFn)
leftAddr    = Number((word >> 20n) & 0xFFFn)
rightOpcode = Number((word >> 12n) & 0xFFn)
rightAddr   = Number(word & 0xFFFn)
```

---

## Instruction Set (21 Instructions)

### Data Transfer

| Hex | Mnemonic | Operation |
|-----|----------|-----------|
| 01  | LOAD M(X) | AC <- M(X) |
| 02  | LOAD -M(X) | AC <- -M(X) |
| 03  | LOAD \|M(X)\| | AC <- \|M(X)\| |
| 04  | LOAD -\|M(X)\| | AC <- -\|M(X)\| |
| 09  | LOAD MQ,M(X) | MQ <- M(X) |
| 0A  | LOAD MQ | AC <- MQ |
| 21  | STOR M(X) | M(X) <- AC |

### Arithmetic

| Hex | Mnemonic | Operation |
|-----|----------|-----------|
| 05  | ADD M(X) | AC <- AC + M(X) |
| 06  | SUB M(X) | AC <- AC - M(X) |
| 07  | ADD \|M(X)\| | AC <- AC + \|M(X)\| |
| 08  | SUB \|M(X)\| | AC <- AC - \|M(X)\| |
| 0B  | MUL M(X) | AC:MQ <- MQ * M(X) (high 40 bits -> AC, low 40 bits -> MQ) |
| 0C  | DIV M(X) | MQ <- AC / M(X) (quotient), AC <- AC % M(X) (remainder) |
| 14  | LSH | AC <- AC << 1 (logical left shift, zero fill) |
| 15  | RSH | AC <- AC >> 1 (arithmetic right shift, sign preserved) |

### Address Modify

| Hex | Mnemonic | Operation |
|-----|----------|-----------|
| 12  | STOR M(X,8:19) | M(X)[bits 8..19] <- AC[bits 28..39] |
| 13  | STOR M(X,28:39) | M(X)[bits 28..39] <- AC[bits 28..39] |

These replace the address field of the left (8:19) or right (28:39) instruction in the word at M(X) with the lowest 12 bits of AC. Used for self-modifying code.

### Unconditional Jump

| Hex | Mnemonic | Operation |
|-----|----------|-----------|
| 0F  | JUMP M(X,0:19) | PC <- X, execute left instruction |
| 10  | JUMP M(X,20:39) | PC <- X, execute right instruction |

### Conditional Jump

| Hex | Mnemonic | Operation |
|-----|----------|-----------|
| 0D  | JUMP+ M(X,0:19) | if AC >= 0: PC <- X, execute left instruction |
| 0E  | JUMP+ M(X,20:39) | if AC >= 0: PC <- X, execute right instruction |

---

## Execution Cycle

The PC is a composite: `{ addr: <12-bit word address>, side: 'left' | 'right' }`.

```
function step():
  if state != 'running' and state != 'ready': return

  word = memory[pc.addr]

  if pc.side == 'left':
    instr = extractLeft(word)
  else:
    instr = extractRight(word)

  opcode = instr.opcode
  addr = instr.address
  jumpTaken = false

  execute(opcode, addr)   // may set jumpTaken = true and update pc directly

  if not jumpTaken:
    if pc.side == 'left':
      pc.side = 'right'           // advance to right half of same word
    else:
      pc.side = 'left'
      pc.addr = (pc.addr + 1) & 0x3FF   // advance to next word

  stepCount++
```

### Jump Semantics

- `JUMP M(X,0:19)`:  set `pc = { addr: X, side: 'left' }`, set `jumpTaken = true`
- `JUMP M(X,20:39)`: set `pc = { addr: X, side: 'right' }`, set `jumpTaken = true`
- `JUMP+ M(X,0:19)`:  if AC >= 0, same as JUMP; otherwise do nothing (no jump)
- `JUMP+ M(X,20:39)`: if AC >= 0, same as JUMP; otherwise do nothing

### Self-Modifying Code Timing

When executing the left instruction modifies the current word's right half, the right instruction sees the NEW value. This is because we re-read from memory on each side (no pre-fetch buffer). This matches the physical machine's asynchronous sequential behavior.

> **Historical note:** Some IAS documentation describes an Instruction Buffer Register (IBR) that could pre-fetch both instructions from a word. With an IBR, the right instruction would see the OLD value after a left-side modify. Our simulator uses live-memory semantics (no IBR) as the simpler, more intuitive model for education. This is a deliberate design choice, not an oversight.

---

## Halt Condition

The IAS machine had no explicit HALT instruction. We add a convention:

- **Opcode 0x00** = HALT (not a real IAS opcode; used as a simulator extension)
- A word that is all zeros (0x0000000000) acts as a halt: opcode 0x00, address 0x000.
- When the machine encounters opcode 0x00, it sets `state = 'halted'` and stops.

This is standard practice in IAS simulators and has the nice property that uninitialized memory (all zeros) halts the machine rather than running wild.

---

## Machine State Lifecycle

```
  off ──[power on]──► booting ──[2s warm-up]──► ready
                                                  │
                                        [step/run]│
                                                  ▼
                                               running
                                              /       \
                                   [halt/brk]          [error]
                                            ▼            ▼
                                         halted        error
                                            │            │
                                      [reset]│      [reset]│
                                            ▼            ▼
                                          ready        ready
                                            │
                                   [power off]│
                                            ▼
                                           off
```

| State | Description | UI behavior |
|-------|-------------|-------------|
| off | Machine unpowered | Panel dark, only power switch active |
| booting | Tubes warming up | Lights flicker on sequentially (2s) |
| ready | Idle, awaiting commands | Hum active, POWER light on, all controls enabled |
| running | Executing instructions | Indicator lights blinking, STOP button active |
| halted | Stopped (opcode 0x00 or breakpoint) | HALT light on, can Step/Reset |
| error | Fault (div-by-zero, bad opcode) | ERROR light flashing, can only Reset |

Transitions:
- `off → booting`: User flips power switch
- `booting → ready`: After warm-up animation completes
- `ready → running`: User clicks Step or Run
- `running → halted`: HALT opcode encountered, or breakpoint hit, or STOP clicked
- `running → error`: Division by zero or unknown opcode
- `halted → ready`: User clicks Reset
- `error → ready`: User clicks Reset
- Any state → `off`: User flips power switch off (with shutdown animation)

---

## Overflow Handling

- All arithmetic results are masked to 40 bits (truncate to range).
- `mask40(value)`: `value & 0xFFFFFFFFFF` then sign-extend if bit 39 is set.
- Multiply: `MQ * M(X)` produces up to 80 bits. Store high 40 in AC, low 40 in MQ.
- Division by zero: set `state = 'error'`, set `error = "Division by zero at PC=..."`. The UI shows error in the log and flashes the ERROR light.

---

## Assembler Syntax

The assembler converts human-readable text to binary words loaded into memory.

### Format

```
; Comment (entire line)
ORG 100          ; Set load address to 100

LOAD M(200)      ; Left instruction of current word
ADD M(201)       ; Right instruction of current word (same line = same word)

STOR M(202)      ; Left instruction of next word
HALT             ; Right instruction of next word
```

### Rules

1. Each line is ONE instruction (left or right half).
2. Two consecutive lines are packed into one 40-bit word (first = left, second = right).
3. If a word has only one instruction (odd line at end), right half is 0x00000 (HALT/NOP).
4. `ORG <addr>` sets the load address (default 0).
5. Labels: `label:` on its own line, refers to the word address of the next instruction.
6. Data: `DATA <decimal>` or `DATA 0x<hex>` stores a 40-bit literal.
7. Mnemonics are case-insensitive.

### Mnemonic Table

```
HALT                    -> 0x00
LOAD M(X)               -> 0x01, X
LOAD -M(X)              -> 0x02, X
LOAD |M(X)|             -> 0x03, X
LOAD -|M(X)|            -> 0x04, X
ADD M(X)                -> 0x05, X
SUB M(X)                -> 0x06, X
ADD |M(X)|              -> 0x07, X
SUB |M(X)|              -> 0x08, X
LOAD MQ,M(X)            -> 0x09, X
LOAD MQ                 -> 0x0A, 0
MUL M(X)                -> 0x0B, X
DIV M(X)                -> 0x0C, X
JUMP+ M(X,0:19)         -> 0x0D, X
JUMP+ M(X,20:39)        -> 0x0E, X
JUMP M(X,0:19)          -> 0x0F, X
JUMP M(X,20:39)          -> 0x10, X
STOR M(X,8:19)          -> 0x12, X
STOR M(X,28:39)         -> 0x13, X
LSH                     -> 0x14, 0
RSH                     -> 0x15, 0
STOR M(X)               -> 0x21, X
```

### Labels in Jumps

Two forms supported:

**Explicit side (power-user form):**
```
JUMP M(loop,0:19)       ; jump to left instruction at label 'loop'
JUMP+ M(done,20:39)     ; conditional jump to right instruction at label 'done'
```

**Smart form (recommended):**
```
JUMP loop               ; assembler resolves to correct side automatically
JUMP+ done              ; assembler picks 0:19 or 20:39 based on where label lands
```

The assembler tracks each label's position as `{ addr, side }`. In smart form, it emits the correct opcode variant (0x0F/0x10 for unconditional, 0x0D/0x0E for conditional) based on which side the labeled instruction occupies.

If a label is used with an explicit side that doesn't match where the label actually is, the assembler emits a warning: `"Label 'loop' is on right side but jump targets left side"`.

The assembler resolves labels in a two-pass approach (pass 1: collect labels and their positions, pass 2: emit code).

---

## UI Components

### Memory View

- Table showing words 0-1023 (scrollable, show a window of ~32 rows).
- Columns: `Addr | Hex (40-bit) | Left Instr | Right Instr | Decimal Value`
- Left/Right Instr columns show decoded mnemonic (e.g., "LOAD M(200)").
- Current PC row highlighted (yellow for left, blue for right).
- Modified cells flash briefly on write.
- Click a row to set a breakpoint (toggle, shown with red dot).

### Register Display

- AC: shown as hex (10 digits) and decimal (signed).
- MQ: same format.
- PC: shown as word address + side indicator (e.g., "005 L" or "005 R").

### Controls

| Button | Action |
|--------|--------|
| Step | Execute one instruction, update display |
| Run | Execute continuously at speed-dial rate |
| Stop | Pause execution (when running) |
| Reset | Zero all memory and registers, return to ready state |
| Load | Assemble editor content, animate paper tape, load into memory |

### Speed Control

A rotary dial (draggable knob with momentum) with five labeled positions:

```
OBSERVE · 1955 FEEL · 10x · 100x · MAX
```

- **OBSERVE** (~5 steps/sec): Slowest. Every fetch/decode/execute phase visible. Lights blink distinctly. Best for learning.
- **1955 FEEL** (~20 steps/sec): Default. Artistic-license speed preserving real timing ratios (multiply takes ~11x longer than add). Fast enough to feel like a working machine, slow enough to follow the flow. Note: real WEIZAC ran ~16,000 adds/sec. We slow it down so you can watch it think.
- **10x** (~200 steps/sec): Lights blur. Sounds pitch up. Good for running longer programs with visual feedback.
- **100x** (~2,000 steps/sec): Minimal animation. Lights show steady glow. Sound becomes a hum.
- **MAX**: No delays, no per-step rendering. Executes to halt or breakpoint instantly. Final state rendered once.

### Code Editor

- Textarea on the left of the simulator tab.
- Syntax: as defined in Assembler section above.
- "Load" button parses and loads. Errors shown inline (red underline + message below editor).

### Execution Log

- Scrollable panel below memory view.
- Each step appends one line: `[PC] opcode addr | AC=... MQ=...`
- Limited to last 200 lines (ring buffer, older lines removed).
- Clear button.

### Example Programs Dropdown

A `<select>` with preloaded programs:

1. **Add Two Numbers** — simplest possible program
2. **Multiply Two Numbers** — demonstrates MUL and MQ register
3. **Countdown Loop** — demonstrates self-modifying code for iteration
4. **Sum Array** — demonstrates address modification for array traversal
5. **Factorial** — combines loop and multiply
6. **Fibonacci Sequence** — iterative computation, stores results in memory

Each selection populates the code editor textarea. User can then edit before loading.

---

## Example Programs

### 1. Add Two Numbers

```
; Compute C = A + B
; A at 100, B at 101, result at 102
ORG 0
LOAD M(100)
ADD M(101)
STOR M(102)
HALT

ORG 100
DATA 25
DATA 17
DATA 0
```

Expected result: M(102) = 42.

### 2. Countdown Loop

```
; Count down from 10 to 0, store each value in memory starting at address 200
; Uses self-modifying code to increment the store address
ORG 0
LOAD M(50)           ; load counter (10)
loop:
STOR M(200)          ; store current value (address will be modified)
SUB M(51)            ; subtract 1
JUMP+ M(continue,0:19)
HALT                 ; AC < 0 means we're done
continue:
STOR M(50)           ; save new counter
LOAD M(3)            ; load the STOR instruction word (at addr 3, left side is "STOR M(200)")
ADD M(52)            ; add 1 to the address field (shifts by adding 0x00001_00000)
STOR M(3,8:19)       ; write back modified address
LOAD M(50)           ; reload counter
JUMP M(loop,20:39)   ; loop back (to right side where STOR is)
HALT

ORG 50
DATA 10              ; initial counter
DATA 1               ; decrement value
DATA 1048576         ; address increment: 1 shifted left 20 bits (for left-instr addr field)
```

### 3. Factorial

```
; Compute 7! = 5040
; Result in M(102)
;
; Algorithm: result = N, then result *= (N-1), result *= (N-2), ..., result *= 1.
; Loop exits BEFORE multiplying by zero.
;
ORG 0
LOAD M(100)          ; load N into AC
STOR M(101)          ; result = N (initial product)
loop:
LOAD M(100)          ; load counter
SUB M(103)           ; counter - 1
STOR M(100)          ; save decremented counter
JUMP+ M(check,0:19) ; if counter-1 >= 0, check if we should continue
JUMP M(done,0:19)    ; counter went negative — done (shouldn't happen for N>0)
check:
LOAD M(100)          ; load counter (which is now N-k)
SUB M(103)           ; test counter - 1
JUMP+ M(mul,0:19)   ; if counter-1 >= 0, counter > 0, multiply
JUMP M(done,0:19)    ; counter is 0 — exit before multiplying by zero
mul:
LOAD MQ,M(101)       ; MQ = result so far
MUL M(100)           ; AC:MQ = result * counter
LOAD MQ              ; AC = MQ (lower 40 bits of product)
STOR M(101)          ; save updated result
JUMP M(loop,0:19)    ; loop
done:
LOAD M(101)          ; load final result
STOR M(102)          ; store to output
HALT

ORG 100
DATA 7               ; N (also used as decrementing counter)
DATA 0               ; running product
DATA 0               ; output
DATA 1               ; constant 1
```

---

## API (simulator.js exports)

```javascript
// Machine state object (all word values are BigInt)
const machine = {
  memory: new Array(1024).fill(0n),  // 40-bit BigInt values
  ac: 0n,                            // 40-bit BigInt
  mq: 0n,                            // 40-bit BigInt
  pc: { addr: 0, side: 'left' },     // addr is Number (0-1023)
  state: 'off',                       // 'off'|'booting'|'ready'|'running'|'halted'|'error'
  error: null,                        // string or null
  breakpoints: new Set(),             // set of word addresses (Number)
  stepCount: 0                        // Number
};

// Core functions
function powerOn()                    // transition off -> booting -> ready (async, 2s)
function powerOff()                   // transition any -> off
function reset()                      // zero registers + memory, state -> ready
function step()                       // execute one instruction, return trace entry
function run(stepsPerFrame)           // begin continuous execution
function stop()                       // pause execution, state -> halted
function loadProgram(words)           // write array of {addr, value} into memory
function getState()                   // return deep copy of machine state

// Trace entry returned by step():
{
  pc: { addr, side },                 // PC before execution (addr is Number)
  opcode: 0x05,                       // Number
  operand: 0x100,                     // Number
  mnemonic: \"ADD M(256)\",
  ac: <BigInt after>,
  mq: <BigInt after>,
  memRead: { addr, value } | null,    // value is BigInt
  memWrite: { addr, value } | null    // value is BigInt
}
```

## API (assembler.js exports)

```javascript
// Parse assembly source text, return program or errors/warnings
function assemble(sourceText)
// Returns:
{
  success: true,
  words: [ { addr: 0, value: 0x0100C80501 }, ... ],
  labels: { loop: { addr: 5, side: 'left' }, done: { addr: 12, side: 'right' } },
  warnings: [ { line: 8, message: "Label 'x' is on right side but jump targets left" } ],
  // or
  success: false,
  errors: [ { line: 5, message: "Unknown mnemonic: STORR" }, ... ]
}

// Disassemble a 40-bit word into human-readable text
function disassemble(word)
// Returns: { left: "LOAD M(200)", right: "ADD M(201)" }
```

---

## Edge Cases and Decisions

| Situation | Behavior |
|-----------|----------|
| PC exceeds 1023 | Wraps to 0 (12-bit mask) |
| Jump to invalid address (> 1023) | Mask to 12 bits, wraps naturally |
| Division by zero | `state = 'error'`, `error = "Division by zero at PC=..."` |
| Opcode not in ISA | `state = 'error'`, `error = "Unknown opcode 0xNN at PC=..."` |
| Write to address being executed | Allowed (von Neumann). Takes effect on next fetch. |
| Self-modify current word (right half, executing left) | Right half sees the NEW value. We re-read from memory on each side (no pre-fetch buffer). Matches asynchronous sequential hardware. |
| Multiply overflow | High 40 bits in AC, low 40 bits in MQ. Full 80-bit result preserved across both registers. |
| Negative zero | Two's complement has no negative zero. No special handling needed. |
| LOAD MQ (opcode 0x0A) address field | Ignored (no memory operand). Assembler emits 0x000. |
| LSH/RSH address field | Ignored. Assembler emits 0x000. |
| RSH of negative number | Arithmetic shift: sign bit preserved (shift in 1s from left). |
| Step when state is 'ready' | Transitions to 'running', executes one step, then to 'halted'. |
| Step when state is 'halted' | Transitions to 'running', executes one step, may re-halt or continue. |
| Load when state is 'off' or 'booting' | Ignored (machine not ready). |
| Smart label mismatch | Assembler warning (not error). Explicit form overrides. |

---

## Rendering Strategy

- `requestAnimationFrame` loop when state is `'running'`.
- Each frame: execute N steps (based on speed dial position), then render once.
- When stepping: render after each step.
- Memory view: only re-render rows that changed (diff previous state).
- Register display: always re-render (cheap).
- Trace log: append entries. Cap at 1000 visible entries (ring buffer), scrollable.

---

## Testing

Manual test cases (verify in browser console):

1. Add Two Numbers: M(102) should be 42 after run.
2. Factorial 7: M(102) should be 5040.
3. Self-modifying countdown: addresses 200-210 should contain 10,9,8,...,0.
4. HALT on empty memory: step once -> state = 'halted'.
5. Division by zero: state = 'error' with error message.
6. Jump+ when AC < 0: should NOT jump (fall through).
7. Jump+ when AC = 0: should jump (0 >= 0).
8. RSH of -2: should give -1 (arithmetic shift).
9. MUL large numbers: verify AC and MQ both populated correctly.
10. Power cycle: off -> booting (lights flicker 2s) -> ready.
11. Smart label: `JUMP loop` assembles to correct opcode variant based on label side.

---

## Non-Goals (out of scope)

- No hardware-accurate I/O protocol emulation (paper tape is visual/experiential only, not bit-level faithful).
- No cycle-accurate timing simulation (timing is experiential: authentic speed ratios for UX, not oscilloscope-level precision).
- No floating-point (IAS had none).
- No mobile-optimized layout (desktop-first, readable on tablet, functional but reduced on phone).
