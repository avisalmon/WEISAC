# WEIZAC Execution Program

## What This File Is

This is the master execution plan for building the WEIZAC project. An AI agent reads this
file and executes it sprint by sprint. The backlog (`docs/backlog.md`) is the compass — this
file is the process that walks the compass.

**Rules:**
- Follow this file exactly. Do not skip steps.
- The backlog defines WHAT to build. This file defines HOW.
- When in doubt, read the spec (`docs/spec.md`, `docs/simulator.md`, `docs/ux.md`).
- Never invent features not in the backlog.

---

## Safety Rules (MANDATORY — read before EVERY iteration)

These rules exist because a previous agent run falsely marked all sprints complete without
building anything. These rules prevent that from ever happening again.

### Rule 1: One Sprint Per Iteration
Each iteration works on **exactly ONE sprint**. Determine the current sprint by running:
```
python verify_sprint.py --next
```
Work ONLY on that sprint. Do NOT touch backlog status for any other sprint.

### Rule 2: Files Are Truth, Not Status Markers
NEVER determine sprint completion by reading `[x]` markers in `backlog.md` or
`knowledge.md`. Instead, check whether the actual source files exist and contain
real code. Run `python verify_sprint.py N` to check sprint N.

### Rule 3: Verification Gate Before Completion
Before marking ANY sprint feature `[x]` in the backlog:
1. Run `python verify_sprint.py N` for the current sprint
2. ALL checks must pass
3. Run `git diff --stat HEAD` — the diff MUST show the expected source files changed
4. If verification fails, you are NOT done. Fix the code first.

### Rule 4: Dashboard Is Auto-Generated
NEVER edit `docs/dashboard.html` directly. Instead run:
```
python build_dashboard.py
```
This generates the dashboard from the verification results. The agent cannot fake this.

### Rule 5: Evidence In Knowledge
When writing to `state/knowledge.md`, include EVIDENCE:
- List the actual files created/modified with line counts
- Paste the output of `python verify_sprint.py N`
- Paste the output of `git diff --stat HEAD`
Do NOT write "all acceptance criteria met" without this evidence.

### Rule 6: No Bulk Status Updates
NEVER change more than one sprint's worth of `[x]` markers in a single iteration.
If you find yourself marking features `[x]` for a sprint you didn't code in this
iteration, STOP. You are hallucinating.

---

## Environment

- **Project root:** `c:\Projects\VEIZAC`
- **Python venv:** `.\env\Scripts\activate` (for any tooling scripts)
- **Output:** Project root (`index.html`, `css/`, `js/`, `images/`)
- **Test location:** `tests/` folder (not deployed)
- **Dashboard:** `docs/dashboard.html` (reference only)
- **Git:** Commit after each sprint passes. Message: `"Sprint N: <goal from backlog>"`

---

## Model Routing

| Sprints | Model | Rationale |
|---------|-------|-----------|
| 0 – 4 | Claude Sonnet 4.5 (copilot) | HTML, CSS, content, training lessons — layout and design work |
| 5 – 12 | Claude Opus 4.6 (copilot) | Simulator engine, assembler, UI wiring, audio, tools — logic-heavy work |

When spawning subagents, specify the model explicitly per this table.

---

## Token Budget

- **Total budget:** 1,000,000 tokens
- **Tracking:** Maintain a running estimate in `state/budget.json`:
  ```json
  {
    "budget_limit": 1000000,
    "estimated_used": 0,
    "sprint_costs": {},
    "last_checkpoint": "Sprint 0"
  }
  ```
- **Checkpoint:** At the END of every sprint, estimate tokens consumed during that sprint
  and update `state/budget.json`.
- **Hard stop:** If `estimated_used` exceeds `budget_limit`, STOP immediately. Do not start
  the next sprint. Instead:
  1. Update the dashboard with current status
  2. Write a summary of what remains
  3. Ask the human for approval to continue and a new budget amount
- **Budget review:** At 50% budget (500K tokens), report remaining work vs. remaining budget
  to the human regardless of sprint status.

---

## Sprint Execution Loop

For EACH sprint (0 through 12), execute these phases in order:

### Phase 1: UNDERSTAND

1. Run `python verify_sprint.py --next` to determine the current sprint. Do NOT read backlog
   status markers to determine what's done — the verification script checks actual files.
2. Read `docs/backlog.md` — find the current sprint section.
3. Read every spec reference listed in the sprint's features (the "Spec Ref" column).
4. Read `state/knowledge.md` for any context from previous sprints.
5. Confirm you understand:
   - The sprint goal (one sentence at top of sprint section)
   - Every feature's acceptance criteria
   - What files will be created or modified
5. Write a brief sprint plan to `state/knowledge.md`:
   ```
   ## Sprint N — <name>
   Plan: <2-3 sentences>
   Files: <list of files to create/modify>
   Tests needed: yes/no
   ```

### Phase 2: TEST (if applicable)

Not every sprint needs automated tests. Use this decision table:

| Sprint | Tests? | Why |
|--------|--------|-----|
| 0 | No | Structure only — visual check |
| 1 | No | Content only — visual check |
| 2 | No | Content only — visual check |
| 3 | Yes | Mini-simulator exercise engine needs correctness checks |
| 4 | Yes | Exercise engine continued |
| 5 | **Yes — heavy** | Core simulator: every instruction, edge case, state transition |
| 6 | **Yes — heavy** | Assembler: parsing, encoding, error cases, round-trip |
| 7 | Yes | UI wiring: controls trigger correct API calls |
| 8 | No | Audio is perceptual — manual listen test |
| 9 | No | Animation is perceptual — manual visual check |
| 10 | Yes | Tools must encode/decode correctly |
| 11 | Yes | Example programs must produce correct outputs |
| 12 | No | Polish/a11y — manual + lighthouse check |

When tests ARE needed:

1. Create test file: `tests/sprint-N.test.html`
   - Self-contained HTML file that loads the JS modules via `<script type="module">`
   - Runs tests on page load, outputs PASS/FAIL to the page and to `console.log`
   - No test framework dependency. Use a minimal inline test harness:
     ```javascript
     function assert(condition, message) {
       if (!condition) throw new Error('FAIL: ' + message);
     }
     function test(name, fn) {
       try { fn(); log('PASS: ' + name); passes++; }
       catch(e) { log('FAIL: ' + name + ' — ' + e.message); failures++; }
     }
     ```
2. Write tests FIRST, based on acceptance criteria. Each acceptance criterion = at least one test.
3. Verify tests FAIL before implementation (TDD red phase).
4. Tests must be runnable in a browser by opening the HTML file. No Node.js required.

### Phase 3: IMPLEMENT

1. Work in TDD when tests exist:
   - Write test → confirm FAIL → implement code → confirm PASS → next test
2. Work feature-by-feature in backlog order (0.1, 0.2, 0.3, ...).
3. After implementing a feature, update its status in `docs/backlog.md`:
   - `[~]` while in progress
   - `[x]` when acceptance criteria met
4. Follow these code rules:
   - **Zero dependencies.** No npm, no CDN, no imports from outside `docs/`.
   - **ES modules.** Use `<script type="module">` and `import/export`.
   - **BigInt for 40-bit values.** All machine words, AC, MQ use BigInt. Convert to Number
     only at UI boundary. See `simulator.md` §Number Representation.
   - **Clean separation.** `simulator.js` never touches DOM. `ui.js` never modifies machine
     state directly (calls simulator API).
   - **No console.log in production code.** Remove before sprint completion.

### Phase 4: REGRESSION

After all features in a sprint pass:

1. Run ALL previous sprint test files (not just current sprint).
   - Open each `tests/sprint-N.test.html` for N = 3 through current sprint.
   - All must still pass. If any fail, fix before proceeding.
2. Regression test list lives in `tests/regression.html`:
   - An index page that iframes or links all existing test files.
   - Shows overall PASS/FAIL count.
   - Created during Sprint 3 (first sprint with tests), updated each sprint.
3. For content sprints (0-2, 8-9, 12): manual visual check instead.
   - Open `docs/index.html` in browser.
   - Verify no regressions on previously completed tabs.

### Phase 5: QUALITY REVIEW (VERIFICATION GATE)

Before marking a sprint complete, you MUST pass the verification gate:

1. **Run the verification script:**
   ```
   python verify_sprint.py N
   ```
   where N is the current sprint number. ALL checks must pass (✅).
   If ANY check fails (❌), fix the code and re-run until all pass.

2. **Run git diff:**
   ```
   git diff --stat HEAD
   ```
   The diff MUST show the expected source files (JS, HTML, CSS) with real line additions.
   If the diff only shows `backlog.md`, `knowledge.md`, `budget.json`, or `dashboard.html`,
   you have NOT done any real work. STOP and actually implement the code.

3. **Re-read every acceptance criterion** in the backlog for this sprint.
   For each one, verify it is met. Not "probably met" — actually verify.
4. **Check file sizes.** No single JS file over 500 lines. Split if needed.
5. **Check for hardcoded values.** Constants should use named values from simulator spec.
6. **Accessibility spot-check:** Run through tab navigation. Verify labels exist.
7. **Cross-browser sanity:** The site must work in Chrome and Firefox at minimum.
   (We cannot automate this — note any browser-specific code for manual check.)

### Phase 6: DASHBOARD UPDATE (AUTO-GENERATED)

Run the dashboard generator — do NOT edit dashboard.html manually:
```
python build_dashboard.py
```
This reads verification results and budget data to generate an honest dashboard.

### Phase 7: BUDGET CHECKPOINT

1. Estimate tokens used during this sprint. Write to `state/budget.json`.
2. If over budget: STOP. Report to human.
3. If over 50%: WARN. Report to human but continue if approved.

### Phase 8: POST-MORTEM

At the end of each sprint, write a brief post-mortem to `state/knowledge.md`.
Include EVIDENCE — not just claims:

```
### Sprint N Post-Mortem

**Files created/modified:**
- docs/js/simulator.js (287 lines)
- docs/index.html (+45 lines)

**Verification output:**
  Sprint 5: Simulator Core — ✅ PASSED
  ✓ [5.1] simulator.js exists: OK (287 lines)
  ✓ [5.2] Instruction decode: Decode logic found
  ...

**Git diff summary:**
  docs/js/simulator.js | 287 ++++++++++
  docs/index.html      |  45 ++
  2 files changed, 332 insertions(+)

**What went well:**
- <bullet>

**What needs improvement:**
- <bullet>

**Lessons for future sprints:**
- <bullet>
```

If any lesson is a PROCESS improvement (not project-specific), append it to the
`## Learned Process Rules` section at the bottom of THIS file (`program.md`).
This makes the agent smarter over time.

### Phase 9: COMMIT

1. Stage all changed files: `git add .`
2. Commit: `git commit -m "Sprint N: <goal from backlog>"`
3. Do NOT push (human will push after review).

---

## File Map

| File | Purpose | Created in |
|------|---------|------------|
| `docs/index.html` | Main site entry point | Sprint 0 |
| `docs/css/style.css` | All styles | Sprint 0 |
| `docs/js/main.js` | Tab switching, shared utilities | Sprint 0 |
| `docs/js/simulator.js` | Machine model (pure logic, no DOM) | Sprint 5 |
| `docs/js/assembler.js` | Two-pass assembler | Sprint 6 |
| `docs/js/ui.js` | Panel rendering, controls, memory grid | Sprint 7 |
| `docs/js/audio.js` | Web Audio sound engine | Sprint 8 |
| `docs/js/tape.js` | Paper tape animation | Sprint 9 |
| `docs/js/tools.js` | Modern overlay tools | Sprint 10 |
| `docs/dashboard.html` | Build progress dashboard | Sprint 0 (updated every sprint) |
| `tests/regression.html` | Regression test index | Sprint 3 |
| `tests/sprint-N.test.html` | Per-sprint test files | As needed |
| `state/knowledge.md` | Running project context and post-mortems | Pre-existing |
| `state/budget.json` | Token budget tracking | Sprint 0 |
| `state/plan.md` | Current sprint plan | Pre-existing |

---

## Quality Gates

A sprint is DONE only when ALL of these pass:

- [ ] Every acceptance criterion in the backlog is met
- [ ] All tests for this sprint pass
- [ ] All regression tests from previous sprints pass
- [ ] Backlog status updated (`[x]` for all features)
- [ ] Dashboard updated
- [ ] Post-mortem written
- [ ] Budget checkpoint done
- [ ] Git committed

---

## Regression Strategy

### Test Harness

All tests use this minimal inline harness (no framework):

```javascript
// Inline in each test HTML file
let passes = 0, failures = 0;
const results = document.getElementById('results');

function log(msg) {
  console.log(msg);
  results.innerHTML += msg + '\n';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertBigInt(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message + ` (expected ${expected}, got ${actual})`);
  }
}

function test(name, fn) {
  try {
    fn();
    log('✅ ' + name);
    passes++;
  } catch(e) {
    log('❌ ' + name + ' — ' + e.message);
    failures++;
  }
}

function summary() {
  const status = failures === 0 ? 'ALL PASS' : `${failures} FAILURES`;
  log(`\n--- ${passes} passed, ${failures} failed: ${status} ---`);
  document.title = failures === 0 ? '✅ Sprint N' : '❌ Sprint N';
}
```

### Regression Index (`tests/regression.html`)

A page that:
1. Lists all test files as links
2. Has a "Run All" button that opens each in an iframe
3. Collects pass/fail counts via `postMessage` from each iframe
4. Shows aggregate results

### What Counts as Regression

- Any test that passed before and now fails = REGRESSION = must fix before proceeding.
- New features may add new tests but must never break old ones.
- Content changes (HTML/CSS) are regression-checked visually, not automated.

---

## Error Recovery

If a sprint gets stuck:

1. **Test won't pass after 3 attempts:** Stop. Write what you tried to `state/knowledge.md`.
   Ask the human for guidance.
2. **Spec is ambiguous:** Re-read the spec ref. If still unclear, flag it and ask the human.
   Do NOT guess. Do NOT invent behavior not in the spec.
3. **Budget exceeded:** STOP. Report status and remaining work. Wait for human approval.
4. **Regression failure:** Fix the regression BEFORE continuing the current sprint.
   If the fix requires changing the current sprint's approach, document why in the post-mortem.

---

## Starting State

Before Sprint 0, verify:
- [ ] `docs/` folder exists
- [ ] `tests/` folder exists (create if not)
- [ ] `state/knowledge.md` exists (create if not)
- [ ] `state/budget.json` exists (create if not)
- [ ] Git repo initialized with at least one commit

Then begin Sprint 0.

---

## Learned Process Rules

_(This section is written by the agent during execution. Each sprint's post-mortem may
add rules here. These rules apply to ALL future sprints.)_

1. _(none yet — will be populated during execution)_
