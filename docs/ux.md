# VEIZAC Simulator — UX Specification

## Design Philosophy

The simulator operates in two layers:

1. **Authentic Mode** — the default experience. Looks, sounds, and feels like operating WEIZAC in 1955. Paper tape, indicator lights, mechanical noise, real-time delays.
2. **Modern Tools** — accessible via a toolbar. Instruction builder, binary translator, assembly editor, debugger. These are "the tools the original operators wished they had."

The user starts in the authentic world. Tools float above it like a transparent overlay. The machine underneath never stops being the machine.

---

## Inspirations (What We Steal From)

| Simulator | What They Did Right | What We Take |
|-----------|-------------------|--------------|
| [Altair 8800](https://s2js.com/altair/) | Fan noise, switch clicks, correct clock speed, faithful front panel | Sound design, faithful timing, physical panel aesthetic |
| [Easy 6502](https://skilldrick.github.io/easy6502/) | Inline code editor + immediate visual feedback + step debugger | Integrated editor with live decode, step-through with register watch |
| [IASSim](https://www.cs.colby.edu/djskrien/IASSim/) | Dual-pane (assembly source ↔ memory), step forward/backward | Memory viewer with highlighted current instruction, bi-directional stepping |
| [Manchester Baby Sim](http://www.davidsharp.com/baby/) | CRT display emulation (green phosphor glow, scan lines) | Visual memory display styled as physical hardware |
| Ben Eater's breadboard CPU | Clock speed control, single-step through microcode | Visible internal state (fetch/decode/execute phases) |

---

## Visual Design

### The Panel (Main View)

The simulator's primary visual is a **control panel** inspired by 1950s laboratory equipment:

```
┌─────────────────────────────────────────────────────────────────┐
│  W E I Z A C    Weizmann Automatic Computer    מכון ויצמן למדע  │
│─────────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌─────────────┐  ┌──────────────────────┐  ┌──────────────┐   │
│  │  REGISTERS  │  │      MEMORY          │  │  PAPER TAPE  │   │
│  │             │  │   (scrollable grid)   │  │   (visual)   │   │
│  │  AC: ••••   │  │                      │  │   ○●○○●●○○   │   │
│  │  MQ: ••••   │  │  addr | L    | R     │  │   ●○●●○○●○   │   │
│  │  PC: •••    │  │  000  | ---- | ----  │  │   ○○●○●●○●   │   │
│  │             │  │  001  | ---- | ----  │  │   ...         │   │
│  │  [lights]   │  │  002  | ---- | ----  │  │              │   │
│  └─────────────┘  │  ...                 │  └──────────────┘   │
│                    └──────────────────────┘                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ◉ LOAD    ◉ STEP    ◉ RUN    ◉ STOP    ◉ RESET       │   │
│  └─────────────────────────────────────────────────────────┘   │
│─────────────────────────────────────────────────────────────────│
│  [EXECUTION LOG - scrolling teletype output]                    │
└─────────────────────────────────────────────────────────────────┘
```

### Color Palette

- Panel background: warm gray (#4a4a4a) with subtle brushed-metal texture
- Panel frame: dark brown/black border, rounded corners (industrial cabinet feel)
- Indicator lights: amber (idle), green (active), red (halt/error)
- Text labels: engraved white (Futura-like sans-serif, uppercase)
- Memory display: dark background, green monospace text (CRT feel)
- Paper tape: off-white with dark punched holes

### Typography

- Panel labels: `'Futura', 'Century Gothic', sans-serif` — uppercase, letter-spaced
- Memory/registers: `'IBM Plex Mono', 'Courier New', monospace` — green on dark
- Log output: same monospace, but dimmer (simulating faded printout)

---

## Sound Design

All sounds are short Web Audio API oscillator bursts or pre-recorded samples (< 5KB each). A master volume slider and mute button are always visible.

| Event | Sound | Character |
|-------|-------|-----------|
| Machine idle | Low hum (50Hz base + harmonics) | Continuous, very quiet. The room tone of a vacuum-tube machine. |
| Step execute | Single relay click | Sharp, metallic. ~50ms. |
| Run mode | Rapid clicking (frequency matches instruction rate) | Like a mechanical clock ticking fast. |
| Paper tape load | Chattering reader sound | Rhythmic staccato, speeds up then stops. |
| Punch tape (output) | Mechanical punch thud | Deeper than reader, one per character. |
| Halt | Descending tone + relay release | Two-note "power down" feel. |
| Error | Buzzer (harsh square wave, 200ms) | Unmistakable "something went wrong." |
| Button press | Physical toggle click | Satisfying clunk. |
| Memory write | Faint magnetic "tick" | Barely audible, subliminal. |

Implementation: Use Web Audio API `OscillatorNode` and `GainNode` for synthetic sounds. Keep total audio assets under 50KB.

---

## Timing and Speed

### Authentic Speed (Default)

The real IAS machine took:
- Addition: 62 μs (~16,000 ops/sec)
- Multiplication: 713 μs (~1,400 ops/sec)
- Memory access: ~5 μs (core memory read/write cycle)

At real speed, individual operations are invisible to the human eye. We use artistic license: the default 1955 FEEL position runs at ~20 steps/sec, preserving the RATIO between operation types (multiply pauses ~11x longer than add). This is fast enough to feel like a working machine, slow enough to follow.

The dial has five positions:

```
OBSERVE · 1955 FEEL · 10x · 100x · MAX
```

- **OBSERVE** (~5 steps/sec): Every phase visible. Fetch, decode, execute light up in sequence. Best for first-time learners.
- **1955 FEEL** (~20 steps/sec): Default. Lights blink. Sounds click. You can follow program flow but it feels like a real machine working.
- **10x** (~200 steps/sec): Lights blur together. Sounds pitch up. Good for running longer programs.
- **100x** (~2,000 steps/sec): Minimal animation. Lights glow steady. Sound becomes continuous hum.
- **MAX**: Instant. No animation or sound. Executes to halt/breakpoint, renders final state once.

---

## The Paper Tape Experience

### What It Looks Like

A vertical strip on the right side of the panel showing a stylized paper tape:

- Off-white background with visible fiber texture
- 20 columns per row (one column per bit of a 20-bit instruction)
- Sprocket holes (smaller dots, centered) between left and right instruction rows for visual authenticity
- Punched holes are solid dark circles; un-punched positions are faint dots
- Each 40-bit word occupies two rows (left instruction top, right instruction bottom)
- The tape scrolls vertically as it’s read or punched

Note: Real WEIZAC paper tape used 5-channel encoding (multiple rows per instruction). We use a simplified 20-column layout for immediate readability. A small label ("simplified visualization") appears on hover.

### Loading a Program (The Full Ceremony)

When the user clicks LOAD:

1. The **code editor** (modern tool) content is assembled
2. The result is visualized as a paper tape being "punched" — holes appear sequentially with punch sounds
3. The tape feeds into the reader — scrolls upward with chattering sound
4. Words appear in memory one by one (memory grid highlights each row as it's loaded)
5. When complete: a satisfying "clunk" and the reader stops

This takes ~2-4 seconds. It's not instant. That's the point. The user FEELS the program entering the machine.

For impatient users: double-click LOAD skips the animation and loads instantly.

### Paper Tape Binary Visualization

Each 40-bit word is shown as two rows on the tape (20 bits each = left instruction, right instruction):

```
 ○ ● ○ ○ ○ ○ ○ ●  ●  ○ ○ ● ● ○ ○ ● ○ ○ ○ ○   ← left:  LOAD M(200)
   sprocket→ •
 ○ ○ ○ ○ ○ ● ○ ●  ●  ○ ○ ● ● ○ ○ ● ○ ○ ○ ●   ← right: ADD M(201)
```

Hovering over a tape section shows a tooltip: "LOAD M(200) — opcode 01, address 0C8"

---

## Modern Tools (The Toolbar)

A collapsible toolbar sits above the authentic panel. It contains tools that a 1955 programmer would have killed for. Styled as a translucent modern overlay (frosted glass effect) to visually separate "helper layer" from "machine layer."

### Tool 1: Instruction Builder

A visual form for constructing instructions without memorizing opcodes:

```
┌─ BUILD INSTRUCTION ─────────────────────────────────┐
│                                                      │
│  Category:  [▾ Arithmetic        ]                   │
│  Operation: [▾ ADD M(X)          ]                   │
│  Address:   [___200___]                              │
│                                                      │
│  ┌─ RESULT ──────────────────────────────────┐      │
│  │  Mnemonic:  ADD M(200)                    │      │
│  │  Binary:    00000101 000011001000          │      │
│  │  Hex:       05 0C8                        │      │
│  │  Meaning:   AC <- AC + contents of M(200) │      │
│  └───────────────────────────────────────────┘      │
│                                                      │
│  [ Insert Left ▼ ]  [ Insert Right ▼ ]  [ Copy ]    │
└──────────────────────────────────────────────────────┘
```

The category dropdown groups instructions logically:
- Data Transfer (LOAD, STOR variants)
- Arithmetic (ADD, SUB, MUL, DIV, shifts)
- Control Flow (JUMP, JUMP+ variants)
- Address Modify (STOR M(X,8:19), STOR M(X,28:39))

Selecting an operation shows:
- Its effect in plain English
- A diagram of data flow (e.g., arrow from M(X) to AC)
- The binary encoding with each field color-coded

### Tool 2: Binary Translator

A bidirectional converter. Type in any representation and see all others:

```
┌─ TRANSLATE ─────────────────────────────────────────┐
│                                                      │
│  Assembly:  [LOAD M(200)                    ] ←→    │
│  Binary:    [00000001 000011001000           ] ←→    │
│  Hex:       [01 0C8                         ] ←→    │
│  Decimal:   [address = 200                  ]        │
│                                                      │
│  ┌─ PUNCH PATTERN ─────────────┐                    │
│  │  ○●○○○○○● • ○○●●○○●○○○     │ ← visual holes    │
│  └─────────────────────────────┘                    │
│                                                      │
│  Editing any field updates all others in real-time.  │
└──────────────────────────────────────────────────────┘
```

### Tool 3: Assembly Editor

A textarea with:
- Syntax highlighting (opcodes = blue, addresses = green, labels = orange, comments = gray)
- Line numbers
- Error markers (red squiggly underline + tooltip)
- Auto-complete for mnemonics (type "LO" → suggests LOAD M(X), LOAD MQ, etc.)
- Inline binary preview (faint gray text showing hex encoding next to each line)

### Tool 4: Word Inspector

Click any memory cell in the grid to open an inspector popup:

```
┌─ WORD @ ADDRESS 005 ────────────────────────────────┐
│                                                      │
│  Raw hex:     01 0C8  05 0C9                         │
│  Raw binary:  0000000100001100100000000010100001...   │
│                                                      │
│  Left instruction:                                   │
│    LOAD M(200)                                       │
│    "Load contents of address 200 into AC"            │
│                                                      │
│  Right instruction:                                  │
│    ADD M(201)                                        │
│    "Add contents of address 201 to AC"               │
│                                                      │
│  As signed integer: 4,467,982,537                    │
│                                                      │
│  [ Edit ] [ Set Breakpoint ] [ Watch ]               │
└──────────────────────────────────────────────────────┘
```

### Tool 5: Execution Trace

A scrollable log styled as teletype printout (monospace, slightly uneven baseline for character):

```
[000 L]  LOAD M(200)      → AC = 25
[000 R]  ADD M(201)       → AC = 42
[001 L]  STOR M(202)      → M(202) = 42
[001 R]  HALT             → machine stopped
```

Optional columns: cycle count, memory reads/writes, register diffs.

---

## Interaction Patterns

### Starting the Simulator (First Visit)

1. Tab opens showing the panel in "powered off" state (dark, no lights)
2. A physical power switch (toggle) is visible at top-right
3. User clicks the switch → startup sequence:
   - Hum begins (quiet)
   - Lights flicker on one by one (0.5s stagger)
   - Memory display initializes (fills with zeros, CRT-style scanline animation)
   - "READY" appears in the log
4. Machine is now in idle state, awaiting a program

### Loading and Running a Program

| Step | User Action | Machine Response |
|------|-------------|-----------------|
| 1 | Select example from dropdown (or write in editor) | Code appears in editor |
| 2 | Click LOAD | Paper tape animation, program enters memory |
| 3 | Click STEP | One instruction executes. Lights flash. Register updates. |
| 4 | Click RUN | Continuous execution at selected speed |
| 5 | Click STOP (or breakpoint hit) | Machine pauses. Current state frozen. |
| 6 | Click RESET | All registers zero, memory cleared, lights dim to idle |

### Keyboard Shortcuts

Shortcuts are active only when the code editor does NOT have focus. When the editor is focused, only Ctrl+Enter (Load) and Escape (blur editor) work.

| Key | Action | Context |
|-----|--------|--------|
| Space | Step (when paused) / Stop (when running) | Panel focused |
| Enter | Run | Panel focused |
| R | Reset | Panel focused |
| L | Load | Panel focused |
| B | Toggle breakpoint on selected memory row | Panel focused |
| ↑/↓ | Scroll memory view | Panel focused |
| Esc | Close any open tool/popup, or blur editor | Always |
| M | Toggle mute | Panel focused |
| T | Toggle tools toolbar | Panel focused |
| Ctrl+Enter | Assemble and Load | Editor focused |

---

## The "Punch Card" Workflow

To reinforce the authentic experience, the simulator supports a deliberate workflow that mirrors what WEIZAC operators actually did:

### Phase 1: Write (the desk)
The assembly editor is your "programming sheet." You write instructions here, just as Phillip Rabinowitz' students wrote theirs on paper forms.

### Phase 2: Punch (the preparation room)
Clicking LOAD triggers the "punching" visualization. Your program becomes physical. You see the holes being made. There's no undo once it's punched (visually). If there's an assembler error, the punch jams with an error sound. Fix and re-punch.

### Phase 3: Feed (the machine room)
The tape feeds into the reader. Words flow into memory. This is the moment of commitment.

### Phase 4: Run (holding your breath)
You press RUN. The machine works. Relays click. Lights dance. You watch the AC register accumulate. Will it halt cleanly, or loop forever?

### Phase 5: Read (the output)
Results live in memory. Use the Word Inspector to read values. In authentic mode, you could click "Punch Output" to see results printed on an output tape (visual only).

---

## Indicator Lights

A row of circular indicator LEDs on the panel:

| Light | Color | Meaning |
|-------|-------|---------|
| POWER | Green (steady) | Machine is on |
| FETCH | Amber (blink) | Memory read in progress |
| EXEC | Green (blink) | Instruction executing |
| STORE | Amber (blink) | Memory write in progress |
| HALT | Red (steady) | Machine stopped |
| ERROR | Red (flash) | Division by zero, unknown opcode |
| LEFT | White (on) | Executing left instruction |
| RIGHT | White (on) | Executing right instruction |

In authentic speed mode, these blink visibly. In fast modes, they blur together (realistic persistence-of-vision effect via CSS transitions).

---

## Responsive Behavior

| Viewport | Layout |
|----------|--------|
| Desktop (>1200px) | Full panel. Editor on left, panel center, tape right. |
| Tablet (768-1200px) | Panel stacks vertically. Editor collapses to tab. |
| Mobile (<768px) | Simplified view: registers + memory + controls only. No tape animation. Sound still works. Banner suggests desktop for full experience. |

---

## Accessibility

- All controls keyboard-navigable (tab order follows physical panel layout)
- Indicator lights have ARIA labels ("Fetch light: active")
- Sound is supplementary only (visual indicators exist for all audio cues)
- High-contrast mode available (toggle): white on black, no textures
- Screen reader: memory contents announced on focus, register changes announced after step

---

## Example User Journeys

### Journey 1: "I've never seen assembly before"

1. Arrives at Simulator tab. Sees the panel. Flips the power switch.
2. Clicks "Examples" → selects "Add Two Numbers"
3. Reads the code in the editor (4 lines, commented)
4. Clicks LOAD. Watches the tape punch and feed. Cool.
5. Clicks STEP. Sees AC change to 25. "Oh, it loaded the number."
6. Clicks STEP again. Sees AC change to 42. "It added!"
7. Steps twice more. Sees HALT. Checks memory 102 = 42.
8. Feels like a genius. Tries the next example.

### Journey 2: "I want to write my own program"

1. Opens the Instruction Builder tool.
2. Selects "Data Transfer" → "LOAD M(X)" → types address 50.
3. Sees the binary encoding. Clicks "Insert Left."
4. Selects "Arithmetic" → "ADD M(X)" → address 51.
5. Clicks "Insert Right." First word is complete.
6. Continues building. Loads. Runs. Debugs with Step and Word Inspector.

### Journey 3: "I want the full 1955 experience"

1. Closes the toolbar (press T). Only the physical panel visible.
2. Turns up volume. Hears the hum.
3. Manually types hex into memory cells (click → type → enter).
4. No assembler. No mnemonics. Just binary going in.
5. Runs at authentic speed. Watches lights for 30 seconds.
6. Reads output from memory grid. Calculates if result is correct by hand.
7. Feels a profound respect for 1955 programmers.

---

## Delight Details (Small Touches That Matter)

- The power switch has a satisfying CSS animation (toggle throw with slight bounce)
- Memory cells that were recently written have a brief green "afterglow" (fades over 1s)
- The paper tape has a subtle paper-fiber texture (CSS background)
- When the machine halts cleanly, there's a 0.2s silence before the hum fades (dramatic pause)
- The rotary speed dial has momentum (drag past and it swings back)
- Hovering over a register shows its value in binary, hex, and decimal simultaneously
- The execution log uses a monospace font with slight randomized character spacing (typewriter feel)
- First load of the page shows a brief "warming up" animation (tubes heating, 2 seconds) before READY
- Easter egg: loading a program that computes the tidal equations displays a small wave animation in the corner

---

## What We Do NOT Do

- No skeuomorphic 3D rendering (flat panel with texture, not a photorealistic machine)
- No mandatory tutorials blocking access (panel is always interactive)
- No login, accounts, or server calls
- No mobile-hostile "you must use desktop" gatekeeping (degrade gracefully)
- No accessibility-breaking animations (respect prefers-reduced-motion)
- No audio autoplay (sounds start only after first user interaction, per browser policy)
