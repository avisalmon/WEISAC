# VEIZAC Site Specification

## Overview
A static single-page website hosted on GitHub Pages. The site presents the history of the
WEIZAC computer and provides an interactive simulator for its IAS-based instruction set.

## Technology
- Plain HTML, CSS, JavaScript (no frameworks, no build step)
- Hosted via GitHub Pages from the `/docs` folder
- All assets self-contained (no CDN dependencies)

## Structure

```
docs/
  index.html        <- single entry point, contains tab navigation
  css/
    style.css
  js/
    main.js         <- tab switching logic
    simulator.js    <- WEIZAC/IAS simulator engine
  images/           <- historical photos and diagrams
```

## Page Layout

### Header
- Title: "VEIZAC" (stylized)
- Subtitle: "The WEIZAC Computer: History and Simulator"

### Tab Navigation
Three tabs, always visible:

1. **Home** (default active)
2. **History**
3. **Training**
4. **Simulator**

### Tab: Home
Summary landing page:
- Brief paragraph explaining what WEIZAC was (Israel's first computer, 1955, IAS architecture)
- Key facts (40-bit word, 21 instructions, built from schematics with no parts)
- 2-3 historical images (from Weizmann Institute archives or public domain)
- Link/credit to Weizmann Institute and IEEE Milestone

### Tab: History
Detailed historical narrative:
- Timeline (1945-2006)
- Key people and their roles
- The story of building WEIZAC (the fairy tale narrative)
- Scientific achievements (tidal equations, quantum mechanics)
- Legacy and impact on Israel's tech industry
- Photos with captions

### Tab: Training
Interactive tutorial teaching users how to program the IAS/WEIZAC machine:
- Lesson 1: Architecture overview (word format, registers, memory)
- Lesson 2: Instruction format (8-bit opcode + 12-bit address)
- Lesson 3: Data transfer instructions
- Lesson 4: Arithmetic instructions
- Lesson 5: Branching and control flow
- Lesson 6: Self-modifying code (loops, arrays)
- Each lesson has explanation text + small interactive exercises
- Exercises let user write instructions and see expected result

### Tab: Simulator

A faithful, immersive IAS/WEIZAC simulator that makes you feel like you're operating
Israel's first computer in the basement of the Ziskind Building, 1955.

#### The Experience

The simulator is built around a physical control panel aesthetic: warm gray brushed-metal
surface, engraved white labels, circular amber/green/red indicator lights, and a rotary
speed dial. When you first open the tab, the machine is "off." You flip the power switch.
Tubes warm up (2 seconds). Lights flicker on. A low electrical hum begins. The memory
display fills with zeros in a CRT-style green-on-black scanline sweep. "READY" appears in
the log. You are now the operator.

#### Panel Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│   W E I Z A C       Weizmann Automatic Computer       מכון ויצמן    │
│──────────────────────────────────────────────────────────────────────│
│  ┌───────────┐  ┌────────────────────────┐  ┌────────────────────┐  │
│  │ REGISTERS │  │       MEMORY           │  │    PAPER TAPE      │  │
│  │           │  │   (scrollable grid)    │  │  ○●○○●●○○ ← holes  │  │
│  │ AC: ••••  │  │  addr | Left  | Right  │  │  ●○●●○○●○          │  │
│  │ MQ: ••••  │  │  000  | ----  | ----   │  │  ○○●○●●○●          │  │
│  │ PC: •••   │  │  001  | ----  | ----   │  │  (scrolls on load) │  │
│  │           │  │  ...                   │  │                    │  │
│  │ [lights]  │  │                        │  │                    │  │
│  └───────────┘  └────────────────────────┘  └────────────────────┘  │
│                                                                      │
│  ● POWER   ● FETCH   ● EXEC   ● STORE   ● HALT   ● LEFT   ● RIGHT │
│                                                                      │
│  ◉ LOAD    ◉ STEP    ◉ RUN    ◉ STOP    ◉ RESET    ⟳ [speed dial]  │
│──────────────────────────────────────────────────────────────────────│
│  [EXECUTION LOG — teletype-style scrolling output]                   │
└──────────────────────────────────────────────────────────────────────┘
```

#### Sound Design

Synthesized via Web Audio API (< 50KB total). No autoplay; sounds activate after first click.

- **Idle hum**: Continuous low 50Hz tone (vacuum tube room ambiance)
- **Step**: Single relay click (sharp, metallic, 50ms)
- **Run**: Rapid relay clicks matching instruction rate
- **Paper tape load**: Chattering reader staccato
- **Halt**: Descending tone + relay release
- **Error**: Harsh buzzer (200ms)
- **Buttons**: Physical toggle clunk

Master volume slider + mute button always visible.

#### Authentic Timing

The real machine ran far too fast to observe (~16,000 adds/sec). We use artistic license:
default speed is ~20 steps/sec, preserving timing RATIOS between operations.
At this speed you can WATCH individual operations happen. Lights blink. Memory cells
highlight. The register changes. The machine thinks in front of your eyes.

A rotary speed dial (draggable, with momentum) offers: OBSERVE · 1955 FEEL · 10x · 100x · MAX.
At MAX: no animation, executes to halt/breakpoint instantly.

#### Paper Tape Workflow

Loading a program follows the original ceremony:

1. **Punch** — Assembled code is visualized as a tape being punched (holes appear with sound)
2. **Feed** — Tape scrolls into the reader with chattering sound
3. **Load** — Words appear in memory one by one (grid highlights each row)
4. **Ready** — Clunk. Silence. Machine awaits RUN.

Takes 2-4 seconds. Double-click LOAD to skip animation.

The tape visual shows 8 columns of holes + sprocket track on off-white paper texture.
Hover any section for a tooltip showing the decoded instruction.

#### Modern Tools (Overlay Toolbar)

A translucent toolbar above the panel provides tools the 1955 operators never had.
Collapsible with T key or toolbar toggle.

**Instruction Builder**: Dropdown form to construct instructions visually.
Select category (Data Transfer / Arithmetic / Control / Address Modify),
pick operation, enter address. See the resulting mnemonic, binary encoding,
hex, plain-English meaning, and color-coded bit fields. Insert into editor.

**Binary Translator**: Type any representation (assembly, hex, binary, decimal)
and see all others update in real-time. Includes a visual punch-hole pattern
of the instruction.

**Assembly Editor**: Textarea with syntax highlighting (opcodes blue, addresses green,
labels orange, comments gray), line numbers, error markers, mnemonic autocomplete,
and faint inline hex preview beside each line.

**Word Inspector**: Click any memory cell → popup showing full decode (left/right
instruction mnemonics, plain-English meaning, raw hex, raw binary, signed decimal
interpretation). Edit, set breakpoint, or add to watch list.

**Execution Trace**: Teletype-styled scrolling log.
Each step: `[addr side] MNEMONIC → register=value`. Last 200 lines retained.

#### Controls

| Control | Action |
|---------|--------|
| Power switch | Start/shutdown sequence (visual + audio) |
| LOAD | Assemble editor content, punch tape, feed into memory |
| STEP | Execute one instruction (Space key) |
| RUN | Continuous execution at dial speed (Enter key) |
| STOP | Pause (Space key when running) |
| RESET | Zero everything, return to idle (R key) |
| Speed dial | OBSERVE / 1955 FEEL / 10x / 100x / MAX |

#### Indicator Lights

| Light | Color | Meaning |
|-------|-------|---------|
| POWER | Green steady | Machine on |
| FETCH | Amber blink | Reading memory |
| EXEC | Green blink | Executing instruction |
| STORE | Amber blink | Writing memory |
| HALT | Red steady | Machine stopped |
| ERROR | Red flash | Fault (div-by-zero, bad opcode) |
| LEFT | White | Executing left half |
| RIGHT | White | Executing right half |

#### Memory View

- 1024-row scrollable grid (showing ~32 visible rows)
- Columns: Addr | Hex (40-bit) | Left Instr (decoded) | Right Instr (decoded)
- Current PC row highlighted (yellow=left, blue=right)
- Recently written cells glow green briefly (1s fade)
- Click row to toggle breakpoint (red dot)

#### Register Display

- AC and MQ: shown as 10-digit hex + signed decimal
- PC: word address + side indicator ("005 L" or "005 R")
- Hover any register for binary breakdown

#### Example Programs (Preloaded)

Dropdown selector with 6 programs:

1. **Add Two Numbers** — 4 instructions, result in memory
2. **Multiply** — demonstrates MQ register
3. **Countdown Loop** — self-modifying code
4. **Sum Array** — address modification for traversal
5. **Factorial** — loop + multiply combined
6. **Fibonacci** — iterative, stores sequence in memory

Selecting one fills the editor. User can modify before loading.

#### Delight Details

- Power switch has a CSS spring animation (toggle with bounce)
- Memory afterglow on writes (green phosphor decay)
- Paper tape has visible fiber texture
- Dramatic 0.2s silence between last instruction and hum fade-out on halt
- Speed dial has drag momentum (overshoots and settles)
- Log text uses slightly randomized character spacing (typewriter feel)
- First-time visitors see the warm-up sequence; return visitors can skip it

## Design Notes
- Clean, minimal design. Dark header, light content area.
- Monospace font for code/memory/register displays.
- Responsive but desktop-first (simulators are awkward on mobile).
- No server-side logic. Everything runs in the browser.
