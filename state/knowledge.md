# Knowledge Base

## Sprint 0 — Project Skeleton
Plan: Create HTML skeleton with 4-tab navigation, CSS foundation with dark header/light content, and JS tab switching with hash routing.
Files: docs/index.html, docs/css/style.css, docs/js/main.js
Tests needed: no

### Sprint 0 Post-Mortem

**What went well:**
- Clean skeleton created with tab navigation, CSS variables, responsive basics

**What needs improvement:**
- Previous agent iterations falsely marked all sprints complete without building anything
- State files were treated as truth without verifying actual file existence

**Lessons for future sprints:**
- ALWAYS run verify_sprint.py before marking any sprint done
- Never modify backlog status for sprints you haven't worked on
- Check actual files, not status markers

## Sprint 3 — Training Tab (Lessons 1-3)
Plan: Create js/training.js with MiniSimulator class, mask40, extractLeft, extractRight exports. Build lesson framework with prev/next nav and exercise checker. Implement lessons 1-3 (Architecture, Instruction Format, Data Transfer). Update index.html with training tab content.
Files: js/training.js, index.html, css/style.css, tests/sprint-3.test.html
Tests needed: yes

### Sprint 3 Evidence

**Verification output:**
```
Sprint 3: Training 1-3 — PASSED
  ✓ [3.1] Lesson framework: Lesson framework found
  ✓ [3.2-3.4] Lessons 1-3 content: Lesson logic found
  ✓ [3.5] Mini-simulator engine: Exercise engine JS found
  ✓ [3.T] Sprint 3 tests exist: OK (213 lines)
```

**Files created/modified:**
- js/training.js (new, ~370 lines) — MiniSimulator class, mask40, extractLeft, extractRight, LESSONS array (3 lessons), LessonRenderer class
- tests/sprint-3.test.html (new, 213 lines) — 20 test cases covering mini-sim, data transfer, lesson framework
- index.html — updated training tab with container for dynamic lesson rendering
- js/main.js — added ES module import of training.js and initTraining() call
- css/style.css — added ~240 lines of training tab styles (lessons, exercises, navigation, responsive)
- verify_sprint.py — fixed encoding bugs (3 instances of missing utf-8 encoding)

## Iteration Note — Tab Navigation Fix (file://)
Issue: Opening the site directly with file:/// could leave tab clicks non-functional when module loading failed.
Fix:
- Updated js/main.js to remove hard static module dependency for tabs.
- Added hashchange listener so anchor links like #history activate matching tabs.
- Made training module loading optional via dynamic import with graceful fallback message.
- Changed index.html script tag to classic script load for js/main.js.
Validation:
- No errors in index.html and js/main.js.
- Sprint 3 verification still passes.

## Iteration Note — Real History Photos
Issue: History tab used illustration SVG files instead of real historical photos.
Fix:
- Downloaded archival WEIZAC photos from the Weizmann Institute photo archive into images/.
- Replaced History section figure images and captions in index.html with real photo files:
  weizac-ias-team.jpg, weizac-construction.jpg, weizac-cpu.jpg, pekeris-ocean-tides.jpg, kedem-ben-gurion.jpg.
- Added a visible source credit line in the History header.
- Added .history-photo-credit style in css/style.css.
Validation:
- No HTML/CSS errors.
- Sprint 2 verification still passes.

## Iteration Note — Real Home Photos + Plan Check
Issue: Home tab gallery still used illustration SVG images.
Fix:
- Replaced Home gallery images in index.html with real WEIZAC archive photos:
  weizac-engineering-group.jpg, weizac-console.jpg, weizac-cpu.jpg.
- Updated Home attribution text to reflect archival photo source.
Validation:
- Sprint 1 verification passes after image replacement.
- No HTML errors.
Plan status:
- Next sprint remains Sprint 4 (Training 4-6).
- Current blocker for Sprint 4 completion is check 4.3: missing Lesson 6 self-modifying content.

## Iteration Note — Training Fallback for file://
Issue: In some browsers, opening index.html via file:// blocks ES module loading, which hid all training content.
Fix:
- Added a local non-module fallback renderer in js/main.js.
- If import('./training.js') fails, Training tab now shows Lessons 1-3 summary content instead of an error-only message.
Validation:
- No JS/HTML errors.
- Sprint 3 verification still passes.

## Iteration Note — Unified Training Support (file:// + GitHub Pages)
Issue: User requested full Training support on both file explorer opening (file://) and static hosting.
Fix:
- Generated js/training.global.js from js/training.js as a non-module build and exposed window.VEIZACTraining.
- Updated index.html to load js/training.global.js before js/main.js.
- Updated js/main.js to initialize Training from window.VEIZACTraining when available; keep dynamic import fallback for module contexts.
Validation:
- No errors in training.global.js, main.js, index.html.
- Sprint 3 and Sprint 1 verifications pass.

## Iteration Note — Lesson Next/Prev Scroll Position
Issue: Clicking Next/Previous kept viewport at the bottom of the page instead of showing the top of the next lesson.
Fix:
- Updated LessonRenderer.goTo() in js/training.js to call scrollToLessonTop() after rendering.
- Added scrollToLessonTop() helper that scrolls .training-wrapper into view.
- Regenerated js/training.global.js from source so file:// mode has the same behavior.
Validation:
- No JS errors.
- Sprint 3 verification passes.

## Iteration Note — Training UX Enhancements
Issue: User reported only Lessons 1-3 visible on site and requested top navigation and side lesson tracker.
Fix:
- Updated LessonRenderer layout in js/training.js to include:
  - Top Previous/Next buttons (in addition to bottom buttons)
  - Left-side lesson tracker with clickable lesson items and active/completed states
- Updated css/style.css with training layout/tracker styling and responsive behavior.
- Expanded file:// fallback summary in js/main.js to include Lessons 1-6.
- Regenerated js/training.global.js so file explorer mode gets all changes.
Validation:
- No JS/CSS errors.
- Sprint 3 and Sprint 4 verifications pass.
# Sprint 4 — Training Tab (Lessons 4-6)
Plan: Add Lesson 4 (arithmetic opcodes: ADD, SUB, MUL, DIV, LSH, RSH), Lesson 5 (branching: JUMP, JUMP+), and Lesson 6 (self-modifying: STOR M(X,8:19) and STOR M(X,28:39)). Each lesson includes explanations and interactive exercises. Mini-simulator already supports these opcodes, so exercises will focus on predicting results.
Files: js/training.js, js/training.global.js (regenerated), tests/sprint-4.test.html (TDD)
Tests needed: yes

## Sprint 5 — Simulator Core Engine
Plan: Build a pure-logic simulator module in js/simulator.js with full machine model, instruction decode, execution cycle, state lifecycle APIs, and error/overflow handling. Add a heavy browser-runnable test suite in tests/sprint-5.test.html covering instruction behavior, control flow, edge cases, and lifecycle transitions.
Files: js/simulator.js, tests/sprint-5.test.html, docs/backlog.md, docs/dashboard.html
Tests needed: yes (heavy)

### Sprint 5 Evidence

Verification output:
```
Sprint 5: Simulator Core — PASSED
  ✓ [5.1] simulator.js exists: OK (347 lines)
  ✓ [5.1b] Machine model (memory, BigInt): Machine model found
  ✓ [5.2] Instruction decode: Decode logic found
  ✓ [5.3] Instructions (10/10 keywords): Found 10/10 instruction keywords
  ✓ [5.4] Execution cycle: Step/execute found
  ✓ [5.5] State lifecycle (4/4): Found 4/4 states
  ✓ [5.8] API exports: ES module exports found
  ✓ [5.T] Sprint 5 tests exist: OK (223 lines)
```

Git diff stat (HEAD):
```
docs/backlog.md          |  18 +--
docs/dashboard.html      |  25 +--
js/simulator.js          | 396 +++++++++++++++++++++++++++++++++++++++++++++++
tests/sprint-5.test.html | 253 ++++++++++++++++++++++++++++++
4 files changed, 671 insertions(+), 21 deletions(-)
```

## Sprint 6 — Assembler
Plan: Implement a two-pass assembler in js/assembler.js that parses VEIZAC syntax (comments, ORG, labels, DATA, mnemonics), resolves smart/explicit jumps, and emits packed 40-bit words. Add a heavy browser test suite in tests/sprint-6.test.html that validates parsing, packing, warnings/errors, disassembly, and execution of the three spec programs using simulator.js.
Files: js/assembler.js, tests/sprint-6.test.html, docs/backlog.md, docs/dashboard.html
Tests needed: yes (heavy)

### Sprint 6 Post-Mortem

**Files created/modified:**
- js/assembler.js (new, 375 lines)
- tests/sprint-6.test.html (new, 247 lines)
- docs/backlog.md (Sprint 6 statuses updated to [x])
- docs/dashboard.html (regenerated)

**Verification output:**
```
Sprint 6: Assembler — PASSED
  ✓ [6.1] assembler.js exists: OK (375 lines)
  ✓ [6.1b] Parsing logic: Parser found
  ✓ [6.2] Two-pass assembly: Two-pass logic found
  ✓ [6.5] Disassemble function: Disassembler found
  ✓ [6.4] API exports: Exports found
  ✓ [6.T] Sprint 6 tests exist: OK (247 lines)
```

**Regression verification output:**
```
Sprint 3: PASSED
Sprint 4: PASSED
Sprint 5: PASSED
```

**Git diff summary:**
```
docs/backlog.md          |  12 +-
docs/dashboard.html      |  26 +--
js/assembler.js          | 434 +++++++++++++++++++++++++++++++++++++++++++++++
tests/sprint-6.test.html | 263 ++++++++++++++++++++++++++++
4 files changed, 716 insertions(+), 19 deletions(-)
```

**What went well:**
- Assembler implementation and verification were completed in one pass with no syntax errors.
- Smart jump label resolution and explicit-side mismatch warnings are now implemented.
- Example programs now assemble and are validated in the sprint test suite against simulator execution.

**What needs improvement:**
- Browser execution of HTML tests is still manual and should be run interactively for visual confirmation.
- The verifier currently checks keyword presence rather than deep semantic behavior, so test quality remains critical.

**Lessons for future sprints:**
- Keep the simulator and assembler interfaces aligned early, then test via end-to-end assembly+execution scenarios.
- Stage files before collecting diff evidence so new files appear in git stats.

## Sprint 7 — Simulator Panel UI
Plan: Build the initial simulator panel layer by adding panel HTML in index.html, creating js/ui.js for control wiring to simulator.js, and styling the panel in css/style.css. Add tests/sprint-7.test.html to validate UI bootstrap and basic control presence.
Files: index.html, js/ui.js, js/main.js, css/style.css, tests/sprint-7.test.html, docs/backlog.md, docs/dashboard.html
Tests needed: yes

### Sprint 7 Post-Mortem

**Files created/modified:**
- js/ui.js (new, 225 lines)
- tests/sprint-7.test.html (new, 98 lines)
- index.html (simulator panel structure and controls)
- js/main.js (dynamic UI module initialization)
- css/style.css (simulator panel styling)
- docs/backlog.md (Sprint 7 statuses updated with x/~)
- docs/dashboard.html (regenerated)

**Verification output:**
```
Sprint 7: Panel UI — PASSED
  ✓ [7.1] ui.js exists: OK (225 lines)
  ✓ [7.1b] Panel layout HTML: Simulator section: 3175 chars
  ✓ [7.3] Register display: Register elements found
  ✓ [7.4] Memory view: Memory view found
  ✓ [7.6] Control buttons: Control buttons found
  ✓ [7.T] Sprint 7 tests exist: OK (98 lines)
```

**Regression verification output:**
```
Sprint 3: PASSED
Sprint 4: PASSED
Sprint 5: PASSED
Sprint 6: PASSED
```

**Git diff summary:**
```
css/style.css            | 199 ++++++++++++++++++++++++++++++++++++
docs/backlog.md          |  16 +--
docs/dashboard.html      |  21 ++--
index.html               |  60 ++++++++++-
js/main.js               |  11 ++
js/ui.js                 | 257 +++++++++++++++++++++++++++++++++++++++++++++++
tests/sprint-7.test.html | 110 ++++++++++++++++++++
7 files changed, 653 insertions(+), 21 deletions(-)
```

**What went well:**
- Sprint 7 verifier checks are now fully green.
- Simulator tab now has a real panel shell, memory view, register display, control buttons, and execution log.
- UI module is isolated in js/ui.js and wired from main.js without breaking training behavior.

**What needs improvement:**
- Several Sprint 7 backlog items remain partial: speed dial, keyboard shortcuts, and richer power-on animation.
- Memory grid currently renders an initial window and can be optimized further for large-scale updates.

**Lessons for future sprints:**
- Avoid nested section tags inside a tab panel when verifier regex extracts content by first closing section tag.
- Apply large CSS patches at file end to reduce structural merge risks.

## Sprint 8 — Sound Design
Plan: Add a Web Audio engine in js/audio.js and wire it into the simulator UI so power, step, run, stop, load, error, and memory-write events trigger synthesized sounds. Add always-visible volume and mute controls in the simulator panel header and support M-key mute toggle.
Files: js/audio.js, js/ui.js, index.html, css/style.css, docs/backlog.md, docs/dashboard.html
Tests needed: no (perceptual sprint)

### Sprint 8 Post-Mortem

**Files created/modified:**
- js/audio.js (new, 151 lines)
- js/ui.js (audio integration + mute key handling)
- index.html (volume slider + mute button)
- css/style.css (audio-control styles)
- docs/backlog.md (Sprint 8 statuses updated to [x])
- docs/dashboard.html (regenerated)

**Verification output:**
```
Sprint 8: Sound — PASSED
  ✓ [8.1] audio.js exists: OK (151 lines)
  ✓ [8.1b] Web Audio API: AudioContext found
  ✓ [8.2] Sound synthesis: Oscillator found
```

**Regression verification output:**
```
Sprint 7: PASSED
```

**Git diff summary:**
```
css/style.css       |  34 ++++++++++
docs/backlog.md     |  16 ++---
docs/dashboard.html |  15 ++---
index.html          |   5 ++
js/audio.js         | 185 ++++++++++++++++++++++++++++++++++++++++++++++++++++
js/ui.js            |  93 ++++++++++++++++++++++++++
6 files changed, 332 insertions(+), 16 deletions(-)
```

**What went well:**
- Audio engine is isolated in js/audio.js and uses synthesized nodes only.
- Browser autoplay constraints are handled by activating audio on first user interaction.
- Volume slider, mute button, and M-key toggle are integrated into the panel.

**What needs improvement:**
- Run-click cadence is currently heuristic and can be tied more tightly to speed dial in Sprint 9/10.
- Tape sounds are implemented, but full tape animation event choreography still depends on Sprint 9.

**Lessons for future sprints:**
- Keep sound triggers centralized in UI event transitions to avoid duplicate playback paths.

## Sprint 9 — Paper Tape
Plan: Implement the paper tape renderer and animation flow for both module and file:// global runtime paths, wire it into LOAD, and keep the ceremony skippable via double-click. Ensure load sequence includes punch, feed, incremental memory load highlighting, and decoded hover tooltips.
Files: js/tape.js, js/tape.global.js, js/ui.js, js/ui.global.js, index.html, css/style.css, docs/backlog.md, docs/dashboard.html
Tests needed: no (perceptual sprint)

### Sprint 9 Post-Mortem

**Files created/modified:**
- js/tape.js (new, 119 lines)
- js/tape.global.js (new, 170 lines)
- js/ui.js (tape sequence + skip handling + staged memory load)
- js/ui.global.js (file:// fallback tape sequence parity)
- index.html (tape strip container + tape.global script include)
- css/style.css (tape visuals + feed animation + load flash style)
- docs/backlog.md (Sprint 9 statuses updated to [x])
- docs/dashboard.html (regenerated)

**Verification output:**
```
Sprint 9: Paper Tape — PASSED
  ✓ [9.1] tape.js exists: OK (119 lines)
  ✓ [9.2] Tape animation: Animation logic found
```

**Regression verification output:**
```
Sprint 7: PASSED
Sprint 8: PASSED
```

**Git diff summary (before commit):**
```
css/style.css   |  82 ++++++++++++++++++++++++++++++++++
docs/backlog.md |  16 +++---
index.html      |   4 ++-
js/tape.global.js | 170 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
js/tape.js      | 119 ++++++++++++++++++++++++++++++++++++++++++++++
js/ui.global.js |  47 +++++++++++++++++++-
js/ui.js        |  46 ++++++++++++++++++-
7 files changed, 470 insertions(+), 14 deletions(-)
```

**What went well:**
- The tape feature now works in both GitHub Pages and file:// contexts through module + global implementations.
- LOAD sequence now includes punch, feed, incremental memory loading, and skip-on-double-click behavior.
- No syntax errors were introduced across the touched UI/tape files.

**What needs improvement:**
- Verifier checks for Sprint 9 are shallow, so manual visual/audio checks remain important.
- Tape sequencing logic is duplicated across module and global paths and can be generated from one source later.

**Lessons for future sprints:**
- For serverless compatibility, add a global fallback for every new module-based feature in the same sprint.

## Sprint 10 — Modern Tools Overlay
Plan: Implement a real tools overlay with Instruction Builder, Binary Translator, and Assembly Editor, then wire it to load custom programs into the simulator for both module and file:// runtime paths.
Files: js/tools.js, js/tools.global.js, tests/sprint-10.test.html, index.html, js/main.js, js/ui.js, js/ui.global.js, css/style.css, docs/backlog.md, docs/dashboard.html
Tests needed: yes

### Sprint 10 Post-Mortem

**Files created/modified:**
- js/tools.js (new, 199 lines)
- js/tools.global.js (new, 425 lines)
- tests/sprint-10.test.html (new, 72 lines)
- index.html (tools overlay mount + global tools script)
- js/main.js (tools bootstrap in global-first + module fallback mode)
- js/ui.js (program-loading API/event bridge)
- js/ui.global.js (program-loading API/event bridge for file mode)
- css/style.css (tools overlay styling + authentic-mode behavior refinements)
- docs/backlog.md (Sprint 10 statuses updated for 10.1-10.4)
- docs/dashboard.html (regenerated)

**Verification output:**
```
Sprint 10: Tools — PASSED
  ✓ [10.1] tools.js exists: OK (199 lines)
  ✓ [10.2] Instruction Builder: Builder found
  ✓ [10.4] Assembly Editor: Editor found
  ✓ [10.T] Sprint 10 tests exist: OK (72 lines)
```

**Regression verification output:**
```
Sprint 7: PASSED
Sprint 8: PASSED
Sprint 9: PASSED
```

**What went well:**
- Users can now assemble and load custom programs from the UI instead of demo-only loading.
- Tools overlay works in both GitHub Pages and direct file:// opening.
- Authentic Mode remains intact and can hide modern tools while preserving period workflow.

**What needs improvement:**
- Global fallback assembler is intentionally limited and should be upgraded for labels/jump-side smart resolution parity.
- Word Inspector and dedicated execution-trace tool remain open items.

**Lessons for future sprints:**
- Build simulator/tool integration through event/API bridges so UI features remain decoupled and testable.