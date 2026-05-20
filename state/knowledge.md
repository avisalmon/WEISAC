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