# VEIZAC Design Backlog

## How to Use This Document

Each sprint produces a **shippable increment** â€” the site works end-to-end after every sprint.
Features list what to build. Acceptance criteria define "done." Spec refs point to the source of truth.
Status tracks progress: `[ ]` not started, `[~]` in progress, `[x]` done.

---

## Sprint 0 â€” Project Skeleton & Deployment

**Goal:** Empty site loads on GitHub Pages. Tab navigation works. Zero content, pure structure.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 0.1 | HTML skeleton | `docs/index.html` loads with header, tab bar, 4 empty tab panels | [spec.md](spec.md) Â§Structure, Â§Page Layout | `[x]` |
| 0.2 | Tab navigation | Clicking Home/History/Training/Simulator shows correct panel, hides others. Home active by default. URL hash updates (`#home`, `#history`, etc.) | [spec.md](spec.md) Â§Tab Navigation | `[x]` |
| 0.3 | CSS foundation | `docs/css/style.css` â€” dark header, light content area, monospace for code areas. Responsive basics (desktop-first). Passes contrast check (WCAG AA) | [spec.md](spec.md) Â§Design Notes, [ux.md](ux.md) Â§Color Palette, Â§Typography | `[x]` |
| 0.4 | Folder structure | `docs/css/`, `docs/js/`, `docs/images/` directories exist. All asset paths relative. | [spec.md](spec.md) Â§Structure | `[x]` |
| 0.5 | GitHub Pages deploy | Site serves from `/docs` on `main` branch. Visiting the URL shows the 4-tab shell. | [spec.md](spec.md) Â§Technology | `[x]` |
| 0.6 | No-framework rule | Zero external dependencies. No CDN links. No build step. View source = ship source. | [spec.md](spec.md) Â§Technology | `[x]` |
| 0.7 | Favicon and meta | Page title "VEIZAC", meta description, Open Graph tags for social sharing | [spec.md](spec.md) Â§Header | `[x]` |

---

## Sprint 1 â€” Home Tab

**Goal:** Visitor lands on a polished Home page that explains what VEIZAC is and invites exploration.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 1.1 | Hero section | Title "VEIZAC" (stylized), subtitle "The WEIZAC Computer: History and Simulator" | [spec.md](spec.md) §Header | `[ ]` |
| 1.2 | Intro paragraph | Brief text: Israel's first computer, 1955, IAS architecture. Key facts: 40-bit word, 21 instructions, built from schematics without parts | [spec.md](spec.md) §Tab: Home | `[ ]` |
| 1.3 | Historical images | 2-3 images with captions. Images in `docs/images/`, public domain or credited. Alt text on all images. | [spec.md](spec.md) §Tab: Home | `[ ]` |
| 1.4 | Credits and links | Link to Weizmann Institute and IEEE Milestone. Attribution for images. | [spec.md](spec.md) §Tab: Home, [history.md](history.md) §References | `[ ]` |
| 1.5 | Navigation hints | Visual cues directing users to History, Training, and Simulator tabs | [spec.md](spec.md) §Tab: Home | `[ ]` |

---

## Sprint 2 â€” History Tab

**Goal:** Complete bilingual historical narrative with timeline, people, and photos.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 2.1 | English narrative | Full story rendered from history.md: Birth of WEIZAC, Princeton origins, advisory committee, Estrin arrival, improvised construction, first calculation, specs, scientific achievements, legacy | [history.md](history.md) Â§English, [spec.md](spec.md) Â§Tab: History | `[ ]` |
| 2.2 | Hebrew narrative | Full Hebrew section rendered below English (or as a toggle). RTL text direction correct. | [history.md](history.md) Â§Hebrew | `[ ]` |
| 2.3 | Timeline visualization | Visual timeline covering 1945-2006: key dates (1947 committee, 1952 Estrin arrives, 1955 first calc, 1958 full operation, 1963 retired, 2006 IEEE milestone) | [spec.md](spec.md) Â§Tab: History, [history.md](history.md) Â§Timeline | `[ ]` |
| 2.4 | Key people section | Names, roles, photos where available: Pekeris, von Neumann, Einstein, Gerald Estrin, Thelma Estrin, Micha Kedem, Zvi Riesel, Phillip Rabinowitz, Hans Jarosch | [history.md](history.md) Â§English (people subsections) | `[ ]` |
| 2.5 | Technical specs table | Rendered table: word size, instruction format, registers, I/O, memory evolution (1024â†’4096â†’12288 words) | [history.md](history.md) Â§Technical Specifications | `[ ]` |
| 2.6 | Photos with captions | Historical images: machine room, Estrins, paper tape, Ziskind Building basement. Responsive sizing. | [spec.md](spec.md) Â§Tab: History | `[ ]` |
| 2.7 | References | All 13 references from history.md rendered as footnotes or endnotes with working links | [history.md](history.md) Â§References | `[ ]` |
| 2.8 | Scientific achievements | Tidal equations story, quantum mechanics calculations, impact on Israel's tech industry | [history.md](history.md) Â§Scientific Achievements, Â§Legacy | `[ ]` |

---

## Sprint 3 â€” Training Tab (Lessons 1-3)

**Goal:** First three interactive lessons teach architecture basics and data transfer instructions.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 3.1 | Lesson framework | Reusable lesson renderer: title, explanation text, interactive exercise area, expected-result checker. Lesson nav (prev/next). Progress indicator. | [spec.md](spec.md) Â§Tab: Training | `[ ]` |
| 3.2 | Lesson 1: Architecture | Teaches: 40-bit word, two 20-bit instructions per word, registers (AC, MQ, PC), 1024-word memory. Diagram of word format. Interactive: click to identify word parts. | [spec.md](spec.md) Â§Tab: Training (Lesson 1), [simulator.md](simulator.md) Â§Machine Model | `[ ]` |
| 3.3 | Lesson 2: Instruction format | Teaches: 8-bit opcode + 12-bit address, left/right instruction layout, bit positions. Interactive: given a hex word, identify opcode and address of each half. | [spec.md](spec.md) Â§Tab: Training (Lesson 2), [simulator.md](simulator.md) Â§Instruction Encoding | `[ ]` |
| 3.4 | Lesson 3: Data transfer | Teaches: LOAD M(X), LOAD -M(X), LOAD |M(X)|, LOAD -|M(X)|, LOAD MQ,M(X), LOAD MQ, STOR M(X). Interactive: write instructions, predict register/memory state after execution. | [spec.md](spec.md) Â§Tab: Training (Lesson 3), [simulator.md](simulator.md) Â§Data Transfer | `[ ]` |
| 3.5 | Mini-simulator for exercises | Lightweight step-through engine for Training exercises: shows registers + small memory, executes student-written instructions, checks result against expected answer. | [spec.md](spec.md) Â§Tab: Training ("Exercises let user write instructions and see expected result") | `[ ]` |

---

## Sprint 4 â€” Training Tab (Lessons 4-6)

**Goal:** Remaining lessons cover arithmetic, branching, and self-modifying code.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 4.1 | Lesson 4: Arithmetic | Teaches: ADD, SUB, MUL, DIV, absolute-value variants, LSH, RSH. Covers 40-bit overflow (mask40), MUL producing 80-bit result (AC high, MQ low), DIV quotient/remainder split. Interactive: predict results of arithmetic sequences. | [spec.md](spec.md) Â§Tab: Training (Lesson 4), [simulator.md](simulator.md) Â§Arithmetic, Â§Overflow Handling | `[ ]` |
| 4.2 | Lesson 5: Branching | Teaches: JUMP M(X,0:19), JUMP M(X,20:39), JUMP+ conditional variants. Left vs right side targeting. PC as composite {addr, side}. Interactive: trace a loop program step by step, predict PC after each jump. | [spec.md](spec.md) Â§Tab: Training (Lesson 5), [simulator.md](simulator.md) Â§Unconditional Jump, Â§Conditional Jump, Â§Jump Semantics | `[ ]` |
| 4.3 | Lesson 6: Self-modifying code | Teaches: STOR M(X,8:19) and STOR M(X,28:39) for address modification, loop patterns using index increment, array traversal. Interactive: write a loop that sums an array using self-modifying address fields. | [spec.md](spec.md) Â§Tab: Training (Lesson 6), [simulator.md](simulator.md) Â§Address Modify | `[ ]` |
| 4.4 | Completion state | All 6 lessons completable. Progress persists in localStorage. "Try the full simulator â†’" prompt after lesson 6. | [spec.md](spec.md) Â§Tab: Training | `[ ]` |

---

## Sprint 5 â€” Simulator Core Engine

**Goal:** Pure-logic simulator runs correctly in the console. No UI yet.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 5.1 | simulator.js â€” machine model | 1024-word memory, AC, MQ, composite PC {addr, side}, state lifecycle ('off'â†’'booting'â†’'ready'â†’'running'â†’'halted'â†’'error'), stepCount. All constants per spec. | [simulator.md](simulator.md) Â§Machine Model, Â§Constants, Â§Registers, Â§Machine State Lifecycle | `[ ]` |
| 5.2 | simulator.js â€” instruction decode | Extract left/right opcode and address from 40-bit word. Bit positions per spec: left opcode bits 0-7, left addr bits 8-19, right opcode bits 20-27, right addr bits 28-39. | [simulator.md](simulator.md) Â§Instruction Encoding | `[ ]` |
| 5.3 | simulator.js â€” all 21 instructions | Every opcode implemented per ISA table: 7 data transfer, 8 arithmetic, 2 address modify, 2 unconditional jump, 2 conditional jump. Plus HALT (0x00). | [simulator.md](simulator.md) Â§Instruction Set (all subsections) | `[ ]` |
| 5.4 | simulator.js â€” execution cycle | Step function follows spec pseudocode: read word, extract instruction by side, execute, advance PC (leftâ†’rightâ†’next word). jumpTaken flag. Self-modifying code timing (re-read on each side). | [simulator.md](simulator.md) Â§Execution Cycle, Â§Jump Semantics, Â§Self-Modifying Code Timing | `[ ]` |
| 5.5 | simulator.js â€” state lifecycle | powerOn() (offâ†’bootingâ†’ready, async 2s), powerOff(), reset() (â†’ready), step(), run(stepsPerFrame), stop(). Correct state transitions per lifecycle diagram. | [simulator.md](simulator.md) Â§Machine State Lifecycle, Â§API (simulator.js exports) | `[ ]` |
| 5.6 | simulator.js â€” overflow & errors | mask40() truncation, MUL 80-bit handling, DIV by zero â†’ state='error', unknown opcode â†’ state='error'. RSH arithmetic (sign-preserving). | [simulator.md](simulator.md) Â§Overflow Handling, Â§Edge Cases | `[ ]` |
| 5.7 | simulator.js â€” edge cases | PC wrap at 1023â†’0, jump address 12-bit mask, LOAD MQ ignores address, LSH/RSH ignore address, step when ready/halted behavior. All per edge cases table. | [simulator.md](simulator.md) Â§Edge Cases and Decisions | `[ ]` |
| 5.8 | simulator.js â€” API exports | getState() returns deep copy. step() returns trace entry with pc, opcode, operand, mnemonic, ac, mq, memRead, memWrite. loadProgram(words). | [simulator.md](simulator.md) Â§API (simulator.js exports) | `[ ]` |
| 5.9 | Console test suite | All 11 manual test cases pass in browser console: add, factorial, countdown, halt-on-empty, div-by-zero, jump+ negative, jump+ zero, RSH negative, MUL overflow, power cycle, smart label. | [simulator.md](simulator.md) Â§Testing | `[ ]` |

---

## Sprint 6 â€” Assembler

**Goal:** Two-pass assembler converts assembly text to binary words.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 6.1 | assembler.js â€” parsing | Parse lines: comments (;), ORG directive, labels (name:), DATA literals (decimal and hex), all 21 mnemonics. Case-insensitive. | [simulator.md](simulator.md) Â§Assembler Syntax (Format, Rules, Mnemonic Table) | `[ ]` |
| 6.2 | assembler.js â€” two-pass | Pass 1: collect labels with {addr, side} positions. Pass 2: emit binary words. Two consecutive instruction lines pack into one 40-bit word (first=left, second=right). Odd instruction pads right with HALT. | [simulator.md](simulator.md) Â§Assembler Syntax Â§Rules, Â§Labels in Jumps | `[ ]` |
| 6.3 | assembler.js â€” smart labels | `JUMP loop` auto-resolves to correct opcode variant (0x0F/0x10 or 0x0D/0x0E) based on label's side. Explicit form `JUMP M(loop,0:19)` still works. Mismatch emits warning. | [simulator.md](simulator.md) Â§Labels in Jumps | `[ ]` |
| 6.4 | assembler.js â€” error reporting | Returns `{success, words, labels, warnings, errors}`. Errors include line number and message. Unknown mnemonic, duplicate label, undefined label, invalid address all caught. | [simulator.md](simulator.md) Â§API (assembler.js exports) | `[ ]` |
| 6.5 | assembler.js â€” disassemble | `disassemble(word)` returns `{ left, right }` as human-readable mnemonics. Used by memory view and word inspector. | [simulator.md](simulator.md) Â§API (assembler.js exports) | `[ ]` |
| 6.6 | Example programs assemble | All 3 spec examples (Add Two Numbers, Countdown, Factorial) assemble without errors and produce correct output when loaded into simulator. | [simulator.md](simulator.md) Â§Example Programs | `[ ]` |

---

## Sprint 7 â€” Simulator Panel UI

**Goal:** The authentic control panel is rendered and wired to the engine. Machine can be operated visually.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 7.1 | Panel layout | Brushed-metal panel with three sections: registers (left), memory (center), paper tape placeholder (right). Controls bar below. Execution log at bottom. Matches ASCII art layout in spec. | [spec.md](spec.md) Â§Panel Layout, [ux.md](ux.md) Â§The Panel | `[ ]` |
| 7.2 | Color palette and typography | Panel #4a4a4a with brushed-metal texture. Engraved white labels (Futura/Century Gothic). Memory in green monospace on dark (CRT feel). Log in dimmer monospace. | [ux.md](ux.md) Â§Color Palette, Â§Typography | `[ ]` |
| 7.3 | Register display | AC and MQ: 10-digit hex + signed decimal. PC: word address + side ("005 L"). Hover shows binary breakdown. Updates on every step. | [spec.md](spec.md) Â§Register Display, [simulator.md](simulator.md) Â§Registers | `[ ]` |
| 7.4 | Memory view | 1024-row scrollable grid (~32 visible). Columns: Addr, Hex (40-bit), Left Instr (decoded), Right Instr (decoded). Current PC row highlighted (yellow=left, blue=right). Recent writes glow green (1s fade). Click row to toggle breakpoint (red dot). Only re-render changed rows. | [spec.md](spec.md) Â§Memory View, [ux.md](ux.md) Â§Memory View, [simulator.md](simulator.md) Â§Rendering Strategy | `[ ]` |
| 7.5 | Indicator lights | 8 circular lights: POWER (green steady), FETCH (amber blink), EXEC (green blink), STORE (amber blink), HALT (red steady), ERROR (red flash), LEFT (white), RIGHT (white). CSS transitions for persistence-of-vision at fast speeds. | [spec.md](spec.md) Â§Indicator Lights, [ux.md](ux.md) Â§Indicator Lights | `[ ]` |
| 7.6 | Control buttons | LOAD, STEP, RUN, STOP, RESET buttons with physical toggle click feel. Power switch with CSS spring animation (toggle with bounce). All wired to simulator API. | [spec.md](spec.md) Â§Controls, [ux.md](ux.md) Â§Delight Details | `[ ]` |
| 7.7 | Rotary speed dial | 5 positions: OBSERVE (~5/sec), 1955 FEEL (~20/sec), 10x (~200/sec), 100x (~2000/sec), MAX (instant). Draggable with momentum (overshoots and settles). Controls execution rate of run(). | [simulator.md](simulator.md) Â§Speed Control, [ux.md](ux.md) Â§Timing and Speed | `[ ]` |
| 7.8 | Execution log | Teletype-styled scrolling area. Each step: `[addr side] MNEMONIC â†’ register=value`. Last 1000 entries (ring buffer). Slightly randomized character spacing (typewriter feel). | [spec.md](spec.md) Â§Execution Log, [ux.md](ux.md) Â§Execution Trace, [simulator.md](simulator.md) Â§Rendering Strategy | `[ ]` |
| 7.9 | Power-on sequence | Flip power â†’ lights flicker on sequentially (2s), hum starts, memory zeros in CRT scanline sweep, "READY" in log. Return visitors can skip. | [spec.md](spec.md) Â§The Experience, [simulator.md](simulator.md) Â§Machine State Lifecycle, [ux.md](ux.md) Â§Delight Details | `[ ]` |
| 7.10 | Keyboard shortcuts | Space=Step (or Stop when running), Enter=Run, R=Reset, B=Breakpoint, â†‘/â†“=Scroll memory, Esc=Close popup, M=Mute, T=Toggle tools. All scoped to "panel focused" (not when editor has focus). | [ux.md](ux.md) Â§Keyboard Shortcuts | `[ ]` |

---

## Sprint 8 â€” Sound Design

**Goal:** Audio brings the machine to life. All sounds synthesized, no autoplay.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 8.1 | audio.js â€” Web Audio engine | OscillatorNode + GainNode synthesis. No downloaded audio files. Total footprint < 50KB. Audio activates only after first user interaction (browser policy). | [spec.md](spec.md) Â§Sound Design, [simulator.md](simulator.md) Â§File Layout (audio.js), [ux.md](ux.md) Â§Sound Design | `[ ]` |
| 8.2 | Idle hum | Continuous 50Hz + harmonics when state='ready' or 'running'. Very quiet. Fades out on halt (0.2s silence before fade). | [ux.md](ux.md) Â§Sound Design (Machine idle), Â§Delight Details | `[ ]` |
| 8.3 | Step click | Single relay click on each instruction execution. Sharp, metallic, ~50ms. | [ux.md](ux.md) Â§Sound Design (Step execute) | `[ ]` |
| 8.4 | Run mode clicking | Rapid relay clicks at instruction rate. At higher speeds, pitch up. At 100x, blends to continuous hum. | [ux.md](ux.md) Â§Sound Design (Run mode) | `[ ]` |
| 8.5 | Paper tape sounds | Reader: rhythmic chattering staccato. Punch: deeper mechanical thud per character. | [ux.md](ux.md) Â§Sound Design (Paper tape load, Punch tape) | `[ ]` |
| 8.6 | Halt and error sounds | Halt: descending tone + relay release (two-note power-down). Error: harsh square wave buzzer (200ms). | [ux.md](ux.md) Â§Sound Design (Halt, Error) | `[ ]` |
| 8.7 | Button and memory sounds | Button press: physical toggle clunk. Memory write: faint magnetic "tick" (barely audible). | [ux.md](ux.md) Â§Sound Design (Button press, Memory write) | `[ ]` |
| 8.8 | Volume controls | Master volume slider + mute button always visible on panel. M key toggles mute. | [ux.md](ux.md) Â§Sound Design, [ux.md](ux.md) Â§Keyboard Shortcuts | `[ ]` |

---

## Sprint 9 â€” Paper Tape

**Goal:** The ceremonial load sequence with visual paper tape animation.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 9.1 | tape.js â€” tape renderer | Vertical tape strip on panel right side: off-white background with fiber texture, 20-column layout (one per bit of 20-bit instruction), sprocket holes between instruction rows. Each 40-bit word = two rows (left top, right bottom). | [ux.md](ux.md) Â§The Paper Tape Experience (What It Looks Like), [simulator.md](simulator.md) Â§File Layout (tape.js) | `[ ]` |
| 9.2 | Punch animation | On LOAD: holes appear sequentially with punch sounds. Solid dark circles for 1, faint dots for 0. Visual punching takes ~1s. | [ux.md](ux.md) Â§Loading a Program (step 2), [spec.md](spec.md) Â§Paper Tape Workflow (Punch) | `[ ]` |
| 9.3 | Feed animation | Tape scrolls upward into reader with chattering sound. ~1s duration. | [ux.md](ux.md) Â§Loading a Program (step 3), [spec.md](spec.md) Â§Paper Tape Workflow (Feed) | `[ ]` |
| 9.4 | Memory load sequence | Words appear in memory one by one. Memory grid highlights each row as loaded. ~1-2s total. | [ux.md](ux.md) Â§Loading a Program (step 4), [spec.md](spec.md) Â§Paper Tape Workflow (Load) | `[ ]` |
| 9.5 | Completion clunk | Final "clunk" sound. Silence. Machine ready. Full ceremony 2-4s. | [ux.md](ux.md) Â§Loading a Program (step 5), [spec.md](spec.md) Â§Paper Tape Workflow (Ready) | `[ ]` |
| 9.6 | Skip animation | Double-click LOAD skips ceremony, loads instantly. | [ux.md](ux.md) Â§Loading a Program ("double-click LOAD"), [spec.md](spec.md) Â§Paper Tape Workflow | `[ ]` |
| 9.7 | Tape tooltip | Hover any tape section shows decoded instruction: "LOAD M(200) â€” opcode 01, address 0C8". | [ux.md](ux.md) Â§Paper Tape Binary Visualization | `[ ]` |
| 9.8 | Simplified-viz label | Small note "simplified visualization" appears on hover over tape, acknowledging real WEIZAC used 5-channel encoding. | [ux.md](ux.md) Â§The Paper Tape Experience (Note) | `[ ]` |

---

## Sprint 10 â€” Modern Tools Overlay

**Goal:** Five modern tools float above the authentic panel, giving users superpowers.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 10.1 | tools.js â€” toolbar chrome | Translucent frosted-glass toolbar above panel. Collapsible with T key. Contains 5 tool buttons. Visually distinct from authentic layer. | [ux.md](ux.md) Â§Modern Tools (The Toolbar), [spec.md](spec.md) Â§Modern Tools | `[ ]` |
| 10.2 | Instruction Builder | Dropdown form: category (Data Transfer/Arithmetic/Control/Address Modify), operation, address. Shows mnemonic, binary (color-coded bit fields), hex, plain-English meaning, data flow diagram. Insert Left/Right/Copy buttons. | [ux.md](ux.md) Â§Tool 1: Instruction Builder, [spec.md](spec.md) Â§Modern Tools (Instruction Builder) | `[ ]` |
| 10.3 | Binary Translator | Bidirectional converter: type assembly/hex/binary/decimal, all others update in real-time. Includes visual punch-hole pattern of instruction. | [ux.md](ux.md) Â§Tool 2: Binary Translator, [spec.md](spec.md) Â§Modern Tools (Binary Translator) | `[ ]` |
| 10.4 | Assembly Editor | Textarea with syntax highlighting: opcodes blue, addresses green, labels orange, comments gray. Line numbers. Error markers. Mnemonic autocomplete. Faint inline hex preview per line. Ctrl+Enter to assemble and load. | [ux.md](ux.md) Â§Tool 3: Assembly Editor, [spec.md](spec.md) Â§Modern Tools (Assembly Editor) | `[ ]` |
| 10.5 | Word Inspector | Click memory cell â†’ popup with full decode: left/right instruction mnemonics, plain-English meaning, raw hex, raw binary, signed decimal. Edit value, set breakpoint, add to watch list. | [ux.md](ux.md) Â§Tool 4: Word Inspector, [spec.md](spec.md) Â§Modern Tools (Word Inspector) | `[ ]` |
| 10.6 | Execution Trace | Teletype-styled log panel. Each step: `[addr side] MNEMONIC â†’ register=value`. Last 200 lines retained. Scrollable. | [ux.md](ux.md) Â§Tool 5: Execution Trace, [spec.md](spec.md) Â§Modern Tools (Execution Trace) | `[ ]` |

---

## Sprint 11 â€” Example Programs & User Journeys

**Goal:** Preloaded examples make the simulator instantly rewarding. All three user journeys work end-to-end.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 11.1 | Example dropdown | Selector with 6 programs: Add Two Numbers, Multiply, Countdown Loop, Sum Array, Factorial, Fibonacci. Selecting fills editor. User can modify before loading. | [spec.md](spec.md) Â§Example Programs (Preloaded) | `[ ]` |
| 11.2 | Add Two Numbers | 4 instructions. Result in M(102) = 42. Assembles, loads, runs, halts correctly. | [simulator.md](simulator.md) Â§Example Programs (1. Add Two Numbers) | `[ ]` |
| 11.3 | Multiply | Demonstrates MQ register behavior. Correct result. | [spec.md](spec.md) Â§Example Programs | `[ ]` |
| 11.4 | Countdown Loop | Self-modifying code. Addresses 200-210 contain 10,9,8,...,0 after run. | [simulator.md](simulator.md) Â§Example Programs (2. Countdown), Â§Testing case 3 | `[ ]` |
| 11.5 | Sum Array | Address modification for array traversal. Correct sum. | [spec.md](spec.md) Â§Example Programs | `[ ]` |
| 11.6 | Factorial | 7! = 5040 in M(102). Loop + multiply combined. | [simulator.md](simulator.md) Â§Example Programs (3. Factorial), Â§Testing case 2 | `[ ]` |
| 11.7 | Fibonacci | Iterative, stores sequence in memory. | [spec.md](spec.md) Â§Example Programs | `[ ]` |
| 11.8 | Journey 1: First-timer | New user can: flip power â†’ select example â†’ LOAD â†’ STEP through â†’ see result in memory. No prior knowledge required. | [ux.md](ux.md) Â§Journey 1 | `[ ]` |
| 11.9 | Journey 2: Builder | User can build program with Instruction Builder â†’ insert into editor â†’ load â†’ run â†’ debug with Word Inspector. | [ux.md](ux.md) Â§Journey 2 | `[ ]` |
| 11.10 | Journey 3: Purist | User can close toolbar â†’ type hex into memory cells directly â†’ run at authentic speed â†’ read results from grid. No modern tools used. | [ux.md](ux.md) Â§Journey 3 | `[ ]` |

---

## Sprint 12 â€” Polish, Accessibility & Delight

**Goal:** Final quality pass. Accessibility, responsive behavior, easter eggs, delight details.

| # | Feature | Acceptance Criteria | Spec Ref | Status |
|---|---------|-------------------|----------|--------|
| 12.1 | Responsive layout | Desktop (>1200px): full panel, editor left, panel center, tape right. Tablet (768-1200px): stacks vertically, editor collapses to tab. Mobile (<768px): registers+memory+controls only, no tape, banner suggests desktop. | [ux.md](ux.md) Â§Responsive Behavior | `[ ]` |
| 12.2 | Keyboard accessibility | All controls tab-navigable (physical panel order). Focus ring visible. Tab order logical. | [ux.md](ux.md) Â§Accessibility | `[ ]` |
| 12.3 | ARIA labels | Indicator lights have ARIA labels ("Fetch light: active"). Memory contents announced on focus. Register changes announced after step. | [ux.md](ux.md) Â§Accessibility | `[ ]` |
| 12.4 | High-contrast mode | Toggle: white on black, no textures. Meets WCAG AA. | [ux.md](ux.md) Â§Accessibility | `[ ]` |
| 12.5 | Reduced motion | Respect `prefers-reduced-motion`: disable tape animation, light blinking, power-on sequence. Functionality preserved. | [ux.md](ux.md) Â§What We Do NOT Do | `[ ]` |
| 12.6 | Memory afterglow | Written cells glow green, fades over 1s (phosphor decay effect). | [ux.md](ux.md) Â§Delight Details, [spec.md](spec.md) Â§Memory View | `[ ]` |
| 12.7 | Halt dramatic pause | 0.2s silence between last instruction and hum fade-out on halt. | [ux.md](ux.md) Â§Delight Details | `[ ]` |
| 12.8 | Speed dial momentum | Drag past target position, dial swings back and settles. | [ux.md](ux.md) Â§Delight Details | `[ ]` |
| 12.9 | Typewriter spacing | Execution log uses slightly randomized character spacing. | [ux.md](ux.md) Â§Delight Details | `[ ]` |
| 12.10 | Tidal equations easter egg | Loading a program that computes tidal equations shows small wave animation in corner. | [ux.md](ux.md) Â§Delight Details | `[ ]` |
| 12.11 | Register hover breakdown | Hovering any register shows value in binary, hex, and decimal simultaneously. | [ux.md](ux.md) Â§Delight Details, [spec.md](spec.md) Â§Register Display | `[ ]` |
| 12.12 | No-framework final check | Zero external dependencies. No CDN. No build step. No login. No server calls. View source = ship source. | [spec.md](spec.md) Â§Technology, [ux.md](ux.md) Â§What We Do NOT Do | `[ ]` |

---

## Coverage Matrix

Every spec section is mapped to at least one backlog item.

| Spec Document | Section | Sprint # |
|--------------|---------|----------|
| spec.md | Technology | 0.6, 12.12 |
| spec.md | Structure | 0.1, 0.4 |
| spec.md | Header | 0.1, 1.1 |
| spec.md | Tab Navigation | 0.2 |
| spec.md | Tab: Home | 1.1-1.5 |
| spec.md | Tab: History | 2.1-2.8 |
| spec.md | Tab: Training | 3.1-3.5, 4.1-4.4 |
| spec.md | Tab: Simulator (The Experience) | 7.9 |
| spec.md | Panel Layout | 7.1 |
| spec.md | Sound Design | 8.1-8.8 |
| spec.md | Authentic Timing | 7.7 |
| spec.md | Paper Tape Workflow | 9.1-9.8 |
| spec.md | Modern Tools | 10.1-10.6 |
| spec.md | Controls | 7.6 |
| spec.md | Indicator Lights | 7.5 |
| spec.md | Memory View | 7.4 |
| spec.md | Register Display | 7.3, 12.11 |
| spec.md | Example Programs | 11.1-11.7 |
| spec.md | Delight Details | 12.6-12.10 |
| spec.md | Design Notes | 0.3 |
| simulator.md | File Layout | 0.4, 5-10 (one per file) |
| simulator.md | Machine Model | 5.1 |
| simulator.md | Constants | 5.1 |
| simulator.md | Registers | 5.1, 7.3 |
| simulator.md | Number Representation | 5.1 |
| simulator.md | Memory | 5.1 |
| simulator.md | Instruction Encoding | 5.2 |
| simulator.md | Instruction Set (all) | 5.3 |
| simulator.md | Execution Cycle | 5.4 |
| simulator.md | Jump Semantics | 5.4 |
| simulator.md | Self-Modifying Code Timing | 5.4 |
| simulator.md | Halt Condition | 5.3 |
| simulator.md | Machine State Lifecycle | 5.5, 7.9 |
| simulator.md | Overflow Handling | 5.6 |
| simulator.md | Assembler Syntax | 6.1-6.3 |
| simulator.md | Labels in Jumps | 6.3 |
| simulator.md | API (simulator.js) | 5.8 |
| simulator.md | API (assembler.js) | 6.4, 6.5 |
| simulator.md | Example Programs | 11.2, 11.4, 11.6 |
| simulator.md | Edge Cases | 5.7 |
| simulator.md | Rendering Strategy | 7.4, 7.8 |
| simulator.md | Testing | 5.9 |
| simulator.md | Non-Goals | 12.12 |
| simulator.md | Speed Control | 7.7 |
| ux.md | Design Philosophy | 7.1, 10.1 |
| ux.md | Inspirations | (design guidance, no deliverable) |
| ux.md | Color Palette | 0.3, 7.2 |
| ux.md | Typography | 0.3, 7.2 |
| ux.md | Sound Design | 8.1-8.8 |
| ux.md | Timing and Speed | 7.7 |
| ux.md | Paper Tape Experience | 9.1-9.8 |
| ux.md | Modern Tools | 10.1-10.6 |
| ux.md | Punch Card Workflow | 9.1-9.6 |
| ux.md | Indicator Lights | 7.5 |
| ux.md | Responsive Behavior | 12.1 |
| ux.md | Accessibility | 12.2-12.5 |
| ux.md | User Journeys | 11.8-11.10 |
| ux.md | Delight Details | 12.6-12.10 |
| ux.md | What We Do NOT Do | 12.5, 12.12 |
| ux.md | Keyboard Shortcuts | 7.10 |
| history.md | English narrative | 2.1 |
| history.md | Hebrew narrative | 2.2 |
| history.md | Timeline | 2.3 |
| history.md | People | 2.4 |
| history.md | Technical Specs | 2.5 |
| history.md | Scientific Achievements | 2.8 |
| history.md | References | 2.7 |

