"""
VEIZAC Sprint Verification Gate
================================
This script is the SINGLE SOURCE OF TRUTH for sprint completion.
It checks actual files, not status markers.

Usage:
    python verify_sprint.py          # Auto-detect current sprint, verify it
    python verify_sprint.py 5        # Verify sprint 5 specifically
    python verify_sprint.py --all    # Verify all sprints, show real status
    python verify_sprint.py --next   # Show which sprint to work on next

The agent MUST run this before claiming any sprint is done.
The build_dashboard.py script reads this output to generate the dashboard.
"""

import os
import sys
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
DOCS = ROOT  # Site files live at project root (index.html, css/, js/, images/)
JS = ROOT / "js"
CSS = ROOT / "css"
IMAGES = ROOT / "images"
TESTS = ROOT / "tests"
STATE = ROOT / "state"

# Minimum line counts to distinguish real files from stubs
MIN_LINES_JS = 15
MIN_LINES_HTML = 20
MIN_LINES_CSS = 10


def count_lines(filepath):
    """Count non-empty lines in a file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return sum(1 for line in f if line.strip())
    except (FileNotFoundError, UnicodeDecodeError):
        return 0


def file_exists_and_real(filepath, min_lines=10):
    """Check file exists AND has meaningful content (not a stub)."""
    if not os.path.isfile(filepath):
        return False, f"MISSING: {filepath}"
    lines = count_lines(filepath)
    if lines < min_lines:
        return False, f"STUB ({lines} lines, need {min_lines}+): {filepath}"
    return True, f"OK ({lines} lines): {filepath}"


def file_contains(filepath, patterns):
    """Check file contains all expected patterns (strings or regexes)."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        return False, [f"MISSING: {filepath}"]
    
    missing = []
    for pattern in patterns:
        if isinstance(pattern, str):
            if pattern not in content:
                missing.append(f"Missing string: '{pattern}'")
        else:
            if not re.search(pattern, content):
                missing.append(f"Missing pattern: {pattern.pattern}")
    
    if missing:
        return False, missing
    return True, []


def dir_has_files(dirpath, extension=None, min_count=1):
    """Check directory has at least min_count files of given extension."""
    if not os.path.isdir(dirpath):
        return False, f"MISSING DIR: {dirpath}"
    files = list(Path(dirpath).glob(f"*{extension}" if extension else "*"))
    files = [f for f in files if f.is_file()]
    if len(files) < min_count:
        return False, f"Need {min_count}+ {extension or ''} files, found {len(files)}: {dirpath}"
    return True, f"OK ({len(files)} files): {dirpath}"


# ============================================================
# Sprint verification definitions
# Each sprint returns (passed: bool, checks: list[dict])
# ============================================================

def verify_sprint_0():
    """Sprint 0: Project Skeleton & Deployment"""
    checks = []
    
    # 0.1 HTML skeleton
    ok, msg = file_exists_and_real(DOCS / "index.html", MIN_LINES_HTML)
    checks.append({"id": "0.1", "name": "HTML skeleton", "pass": ok, "detail": msg})
    
    if ok:
        ok2, missing = file_contains(DOCS / "index.html", [
            "tab-home", "tab-history", "tab-training", "tab-simulator",
            '<nav', '<header', '<footer'
        ])
        checks.append({"id": "0.2", "name": "Tab navigation elements", "pass": ok2, 
                       "detail": "All tab elements present" if ok2 else f"Missing: {missing}"})
    else:
        checks.append({"id": "0.2", "name": "Tab navigation elements", "pass": False, 
                       "detail": "Cannot check — index.html missing"})
    
    # 0.3 CSS
    ok, msg = file_exists_and_real(CSS / "style.css", MIN_LINES_CSS)
    checks.append({"id": "0.3", "name": "CSS foundation", "pass": ok, "detail": msg})
    
    # 0.4 Folder structure
    dirs_ok = all(os.path.isdir(d) for d in [CSS, JS, IMAGES])
    checks.append({"id": "0.4", "name": "Folder structure", "pass": dirs_ok,
                   "detail": "css/, js/, images/ exist" if dirs_ok else "Missing directories"})
    
    # 0.6 No framework
    if os.path.isfile(DOCS / "index.html"):
        ok, missing = file_contains(DOCS / "index.html", [])
        # Check for CDN links (should NOT exist)
        with open(DOCS / "index.html", "r", encoding="utf-8") as f:
            html = f.read()
        has_cdn = "cdn" in html.lower() or "unpkg" in html.lower() or "jsdelivr" in html.lower()
        checks.append({"id": "0.6", "name": "No-framework rule", "pass": not has_cdn,
                       "detail": "No CDN links" if not has_cdn else "FOUND CDN links!"})
    
    # 0.7 Meta tags
    if os.path.isfile(DOCS / "index.html"):
        ok, missing = file_contains(DOCS / "index.html", [
            "<title>VEIZAC</title>", "og:title"
        ])
        checks.append({"id": "0.7", "name": "Favicon and meta", "pass": ok,
                       "detail": "Title and OG tags present" if ok else f"Missing: {missing}"})
    
    # JS file exists
    ok, msg = file_exists_and_real(JS / "main.js", 5)
    checks.append({"id": "0.2b", "name": "Tab JS file", "pass": ok, "detail": msg})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_1():
    """Sprint 1: Home Tab"""
    checks = []
    
    # Check index.html has Home tab content (not just <h2>Home</h2>)
    ok, msg = file_exists_and_real(DOCS / "index.html", 30)
    checks.append({"id": "1.0", "name": "index.html has content", "pass": ok, "detail": msg})
    
    if ok:
        with open(DOCS / "index.html", "r", encoding="utf-8") as f:
            html = f.read()
        
        # 1.1 Hero section
        has_hero = "VEIZAC" in html and ("subtitle" in html.lower() or "WEIZAC" in html)
        checks.append({"id": "1.1", "name": "Hero section", "pass": has_hero,
                       "detail": "Hero with VEIZAC title found" if has_hero else "No hero section content"})
        
        # 1.2 Intro paragraph (should have substantial text about WEIZAC)
        has_intro = "1955" in html or "1954" in html or "Weizmann" in html.lower()
        checks.append({"id": "1.2", "name": "Intro paragraph", "pass": has_intro,
                       "detail": "Historical intro text found" if has_intro else "No intro text about WEIZAC history"})
        
        # 1.3 Images
        img_count = html.count("<img")
        has_images = img_count >= 2
        checks.append({"id": "1.3", "name": "Historical images", "pass": has_images,
                       "detail": f"{img_count} images found" if has_images else f"Need 2+ images, found {img_count}"})
        
        # 1.4 Credits/links
        has_links = "weizmann" in html.lower() or "ieee" in html.lower()
        checks.append({"id": "1.4", "name": "Credits and links", "pass": has_links,
                       "detail": "External links found" if has_links else "No Weizmann/IEEE links"})
        
        # 1.5 Navigation hints
        has_nav_hints = ("history" in html.lower() and "training" in html.lower() and 
                        "simulator" in html.lower() and html.count("tab-") >= 4)
        checks.append({"id": "1.5", "name": "Navigation hints", "pass": has_nav_hints,
                       "detail": "Nav hints present" if has_nav_hints else "No navigation hints to other tabs"})
    else:
        for fid in ["1.1", "1.2", "1.3", "1.4", "1.5"]:
            checks.append({"id": fid, "name": f"Feature {fid}", "pass": False, "detail": "index.html too small"})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_2():
    """Sprint 2: History Tab"""
    checks = []
    
    with open(DOCS / "index.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    # Extract history tab content
    # Look for substantial content in the history section
    history_match = re.search(r'id="tab-history"[^>]*>(.*?)</section>', html, re.DOTALL)
    history_content = history_match.group(1) if history_match else ""
    history_len = len(history_content.strip())
    
    checks.append({"id": "2.1", "name": "English narrative", "pass": history_len > 500,
                   "detail": f"History section: {history_len} chars" if history_len > 500 else f"Too short ({history_len} chars)"})
    
    has_hebrew = bool(re.search(r'[\u0590-\u05FF]', history_content))
    checks.append({"id": "2.2", "name": "Hebrew narrative", "pass": has_hebrew,
                   "detail": "Hebrew text found" if has_hebrew else "No Hebrew text"})
    
    has_timeline = "timeline" in history_content.lower() or "1955" in history_content
    checks.append({"id": "2.3", "name": "Timeline", "pass": has_timeline,
                   "detail": "Timeline content found" if has_timeline else "No timeline"})
    
    has_people = any(name in history_content for name in ["Pekeris", "Estrin", "von Neumann"])
    checks.append({"id": "2.4", "name": "Key people", "pass": has_people,
                   "detail": "Key people mentioned" if has_people else "No key people section"})
    
    has_specs = "40-bit" in history_content or "1024" in history_content or "word" in history_content.lower()
    checks.append({"id": "2.5", "name": "Technical specs", "pass": has_specs,
                   "detail": "Technical specs found" if has_specs else "No specs table"})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_3():
    """Sprint 3: Training Tab (Lessons 1-3)"""
    checks = []
    
    with open(DOCS / "index.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    training_match = re.search(r'id="tab-training"[^>]*>(.*?)</section>', html, re.DOTALL)
    training_content = training_match.group(1) if training_match else ""
    
    has_framework = "lesson" in training_content.lower() and len(training_content) > 200
    checks.append({"id": "3.1", "name": "Lesson framework", "pass": has_framework,
                   "detail": "Lesson framework found" if has_framework else "No lesson content"})
    
    # Check for lesson JS or inline lesson logic
    lesson_js = (JS / "lessons.js").exists() or (JS / "training.js").exists()
    lesson_inline = "lesson" in html.lower() and ("exercise" in html.lower() or "interactive" in html.lower())
    has_lessons = lesson_js or lesson_inline
    checks.append({"id": "3.2-3.4", "name": "Lessons 1-3 content", "pass": has_lessons,
                   "detail": "Lesson logic found" if has_lessons else "No lesson JS or interactive content"})
    
    # 3.5 Mini-simulator
    mini_sim = any((JS / name).exists() for name in ["mini-simulator.js", "exercise-engine.js", "training.js"])
    checks.append({"id": "3.5", "name": "Mini-simulator engine", "pass": mini_sim,
                   "detail": "Exercise engine JS found" if mini_sim else "No mini-simulator JS file"})
    
    # Tests required for Sprint 3
    test_ok, test_msg = file_exists_and_real(TESTS / "sprint-3.test.html", MIN_LINES_HTML)
    checks.append({"id": "3.T", "name": "Sprint 3 tests exist", "pass": test_ok, "detail": test_msg})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_4():
    """Sprint 4: Training Tab (Lessons 4-6)"""
    checks = []
    
    with open(DOCS / "index.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    # Also read JS files for lesson content (lessons are rendered from JS)
    js_content = ""
    if os.path.isdir(JS):
        for fname in os.listdir(JS):
            if fname.endswith(".js") and os.path.isfile(JS / fname):
                js_content += open(JS / fname, "r", encoding="utf-8", errors="ignore").read()
    combined = html.lower() + js_content.lower()
    
    # Check for lessons 4-6 content (arithmetic, branching, self-modifying)
    has_arithmetic = any(word in combined for word in ["arithmetic", "add m(x)", "multiply", "lesson 4"])
    checks.append({"id": "4.1", "name": "Lesson 4: Arithmetic", "pass": has_arithmetic,
                   "detail": "Arithmetic lesson content found" if has_arithmetic else "No arithmetic lesson"})
    
    has_branching = any(word in combined for word in ["branch", "jump", "lesson 5"])
    checks.append({"id": "4.2", "name": "Lesson 5: Branching", "pass": has_branching,
                   "detail": "Branching lesson content found" if has_branching else "No branching lesson"})
    
    has_selfmod = any(word in combined for word in ["self-modif", "lesson 6", "address modification"])
    checks.append({"id": "4.3", "name": "Lesson 6: Self-modifying", "pass": has_selfmod,
                   "detail": "Self-modifying lesson found" if has_selfmod else "No self-modifying lesson"})
    
    # 4.4 localStorage progress
    has_progress = "localStorage" in html or any(
        "localStorage" in open(JS / f, "r", encoding="utf-8", errors="ignore").read() 
        for f in os.listdir(JS) if f.endswith(".js") and os.path.isfile(JS / f)
    ) if os.path.isdir(JS) else False
    checks.append({"id": "4.4", "name": "Progress persistence", "pass": has_progress,
                   "detail": "localStorage used" if has_progress else "No localStorage"})
    
    test_ok, test_msg = file_exists_and_real(TESTS / "sprint-4.test.html", MIN_LINES_HTML)
    checks.append({"id": "4.T", "name": "Sprint 4 tests exist", "pass": test_ok, "detail": test_msg})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_5():
    """Sprint 5: Simulator Core Engine"""
    checks = []
    
    # simulator.js MUST exist and be substantial
    sim_path = JS / "simulator.js"
    ok, msg = file_exists_and_real(sim_path, 100)
    checks.append({"id": "5.1", "name": "simulator.js exists", "pass": ok, "detail": msg})
    
    if ok:
        with open(sim_path, "r", encoding="utf-8") as f:
            sim = f.read()
        
        # 5.1 Machine model
        has_model = all(word in sim for word in ["memory", "BigInt" if "BigInt" in sim else "0n"])
        checks.append({"id": "5.1b", "name": "Machine model (memory, BigInt)", "pass": has_model,
                       "detail": "Machine model found" if has_model else "Missing machine model"})
        
        # 5.2 Instruction decode
        has_decode = "opcode" in sim.lower() and "address" in sim.lower()
        checks.append({"id": "5.2", "name": "Instruction decode", "pass": has_decode,
                       "detail": "Decode logic found" if has_decode else "No instruction decode"})
        
        # 5.3 Instructions (check for key opcodes)
        has_instructions = sum(1 for word in ["LOAD", "STOR", "ADD", "SUB", "MUL", "DIV", "JUMP", "HALT", "LSH", "RSH"] 
                              if word in sim)
        checks.append({"id": "5.3", "name": f"Instructions ({has_instructions}/10 keywords)", 
                       "pass": has_instructions >= 8,
                       "detail": f"Found {has_instructions}/10 instruction keywords"})
        
        # 5.4 Execution cycle
        has_cycle = "step" in sim and ("execute" in sim.lower() or "fetch" in sim.lower())
        checks.append({"id": "5.4", "name": "Execution cycle", "pass": has_cycle,
                       "detail": "Step/execute found" if has_cycle else "No execution cycle"})
        
        # 5.5 State lifecycle
        has_states = sum(1 for s in ["ready", "running", "halted", "error"] if f"'{s}'" in sim or f'"{s}"' in sim)
        checks.append({"id": "5.5", "name": f"State lifecycle ({has_states}/4)", 
                       "pass": has_states >= 3,
                       "detail": f"Found {has_states}/4 states"})
        
        # 5.8 API exports
        has_exports = "export" in sim
        checks.append({"id": "5.8", "name": "API exports", "pass": has_exports,
                       "detail": "ES module exports found" if has_exports else "No exports"})
    else:
        for fid in ["5.1b", "5.2", "5.3", "5.4", "5.5", "5.8"]:
            checks.append({"id": fid, "name": f"Feature {fid}", "pass": False, "detail": "simulator.js missing"})
    
    # Tests REQUIRED for sprint 5
    test_ok, test_msg = file_exists_and_real(TESTS / "sprint-5.test.html", 30)
    checks.append({"id": "5.T", "name": "Sprint 5 tests exist", "pass": test_ok, "detail": test_msg})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_6():
    """Sprint 6: Assembler"""
    checks = []
    
    asm_path = JS / "assembler.js"
    ok, msg = file_exists_and_real(asm_path, 80)
    checks.append({"id": "6.1", "name": "assembler.js exists", "pass": ok, "detail": msg})
    
    if ok:
        with open(asm_path, "r", encoding="utf-8") as f:
            asm = f.read()
        
        has_parse = "parse" in asm.lower()
        checks.append({"id": "6.1b", "name": "Parsing logic", "pass": has_parse,
                       "detail": "Parser found" if has_parse else "No parser"})
        
        has_twopass = "pass" in asm.lower() and "label" in asm.lower()
        checks.append({"id": "6.2", "name": "Two-pass assembly", "pass": has_twopass,
                       "detail": "Two-pass logic found" if has_twopass else "No two-pass"})
        
        has_disasm = "disassemble" in asm.lower()
        checks.append({"id": "6.5", "name": "Disassemble function", "pass": has_disasm,
                       "detail": "Disassembler found" if has_disasm else "No disassembler"})
        
        has_exports = "export" in asm
        checks.append({"id": "6.4", "name": "API exports", "pass": has_exports,
                       "detail": "Exports found" if has_exports else "No exports"})
    else:
        for fid in ["6.1b", "6.2", "6.5", "6.4"]:
            checks.append({"id": fid, "name": f"Feature {fid}", "pass": False, "detail": "assembler.js missing"})
    
    test_ok, test_msg = file_exists_and_real(TESTS / "sprint-6.test.html", 30)
    checks.append({"id": "6.T", "name": "Sprint 6 tests exist", "pass": test_ok, "detail": test_msg})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_7():
    """Sprint 7: Simulator Panel UI"""
    checks = []
    
    # ui.js must exist
    ui_path = JS / "ui.js"
    ok, msg = file_exists_and_real(ui_path, 50)
    checks.append({"id": "7.1", "name": "ui.js exists", "pass": ok, "detail": msg})
    
    # index.html must have panel layout
    with open(DOCS / "index.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    sim_section = re.search(r'id="tab-simulator"[^>]*>(.*?)</section>', html, re.DOTALL)
    sim_content = sim_section.group(1) if sim_section else ""
    
    has_panel = len(sim_content) > 500
    checks.append({"id": "7.1b", "name": "Panel layout HTML", "pass": has_panel,
                   "detail": f"Simulator section: {len(sim_content)} chars" if has_panel else "Simulator tab empty"})
    
    has_registers = any(word in sim_content.lower() for word in ["register", "ac", "accumulator"])
    checks.append({"id": "7.3", "name": "Register display", "pass": has_registers,
                   "detail": "Register elements found" if has_registers else "No register display"})
    
    has_memory = "memory" in sim_content.lower()
    checks.append({"id": "7.4", "name": "Memory view", "pass": has_memory,
                   "detail": "Memory view found" if has_memory else "No memory view"})
    
    has_controls = any(word in sim_content.lower() for word in ["step", "run", "reset", "power"])
    checks.append({"id": "7.6", "name": "Control buttons", "pass": has_controls,
                   "detail": "Control buttons found" if has_controls else "No control buttons"})
    
    test_ok, test_msg = file_exists_and_real(TESTS / "sprint-7.test.html", MIN_LINES_HTML)
    checks.append({"id": "7.T", "name": "Sprint 7 tests exist", "pass": test_ok, "detail": test_msg})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_8():
    """Sprint 8: Sound Design"""
    checks = []
    
    audio_path = JS / "audio.js"
    ok, msg = file_exists_and_real(audio_path, 40)
    checks.append({"id": "8.1", "name": "audio.js exists", "pass": ok, "detail": msg})
    
    if ok:
        with open(audio_path, "r", encoding="utf-8") as f:
            audio = f.read()
        
        has_webaudio = "AudioContext" in audio or "audioContext" in audio
        checks.append({"id": "8.1b", "name": "Web Audio API", "pass": has_webaudio,
                       "detail": "AudioContext found" if has_webaudio else "No Web Audio"})
        
        has_oscillator = "Oscillator" in audio or "oscillator" in audio
        checks.append({"id": "8.2", "name": "Sound synthesis", "pass": has_oscillator,
                       "detail": "Oscillator found" if has_oscillator else "No oscillator synthesis"})
    else:
        checks.append({"id": "8.1b", "name": "Web Audio API", "pass": False, "detail": "audio.js missing"})
        checks.append({"id": "8.2", "name": "Sound synthesis", "pass": False, "detail": "audio.js missing"})
    
    # No tests required for Sprint 8 (perceptual)
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_9():
    """Sprint 9: Paper Tape"""
    checks = []
    
    tape_path = JS / "tape.js"
    ok, msg = file_exists_and_real(tape_path, 30)
    checks.append({"id": "9.1", "name": "tape.js exists", "pass": ok, "detail": msg})
    
    if ok:
        with open(tape_path, "r", encoding="utf-8") as f:
            tape = f.read()
        has_animation = "animate" in tape.lower() or "scroll" in tape.lower() or "punch" in tape.lower()
        checks.append({"id": "9.2", "name": "Tape animation", "pass": has_animation,
                       "detail": "Animation logic found" if has_animation else "No animation"})
    else:
        checks.append({"id": "9.2", "name": "Tape animation", "pass": False, "detail": "tape.js missing"})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_10():
    """Sprint 10: Modern Tools Overlay"""
    checks = []
    
    tools_path = JS / "tools.js"
    ok, msg = file_exists_and_real(tools_path, 50)
    checks.append({"id": "10.1", "name": "tools.js exists", "pass": ok, "detail": msg})
    
    if ok:
        with open(tools_path, "r", encoding="utf-8") as f:
            tools = f.read()
        
        has_builder = "builder" in tools.lower() or "instruction" in tools.lower()
        checks.append({"id": "10.2", "name": "Instruction Builder", "pass": has_builder,
                       "detail": "Builder found" if has_builder else "No builder"})
        
        has_editor = "editor" in tools.lower() or "assembly" in tools.lower()
        checks.append({"id": "10.4", "name": "Assembly Editor", "pass": has_editor,
                       "detail": "Editor found" if has_editor else "No editor"})
    else:
        checks.append({"id": "10.2", "name": "Instruction Builder", "pass": False, "detail": "tools.js missing"})
        checks.append({"id": "10.4", "name": "Assembly Editor", "pass": False, "detail": "tools.js missing"})
    
    test_ok, test_msg = file_exists_and_real(TESTS / "sprint-10.test.html", MIN_LINES_HTML)
    checks.append({"id": "10.T", "name": "Sprint 10 tests exist", "pass": test_ok, "detail": test_msg})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_11():
    """Sprint 11: Example Programs"""
    checks = []
    
    # Examples could be in a separate file or embedded
    examples_path = JS / "examples.js"
    ok, msg = file_exists_and_real(examples_path, 20)
    if not ok:
        # Check if examples are in the HTML or another JS file
        with open(DOCS / "index.html", "r", encoding="utf-8") as f:
            html = f.read()
        has_examples = "example" in html.lower() and ("factorial" in html.lower() or "countdown" in html.lower())
        if has_examples:
            ok = True
            msg = "Examples found inline in HTML"
    
    checks.append({"id": "11.1", "name": "Example programs exist", "pass": ok, "detail": msg})
    
    test_ok, test_msg = file_exists_and_real(TESTS / "sprint-11.test.html", MIN_LINES_HTML)
    checks.append({"id": "11.T", "name": "Sprint 11 tests exist", "pass": test_ok, "detail": test_msg})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


def verify_sprint_12():
    """Sprint 12: Polish & Accessibility"""
    checks = []
    
    with open(DOCS / "index.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    has_aria = "aria-" in html
    checks.append({"id": "12.3", "name": "ARIA labels", "pass": has_aria,
                   "detail": "ARIA attributes found" if has_aria else "No ARIA labels"})
    
    has_responsive = "@media" in open(CSS / "style.css", "r", encoding="utf-8").read() if os.path.isfile(CSS / "style.css") else False
    checks.append({"id": "12.1", "name": "Responsive layout", "pass": has_responsive,
                   "detail": "Media queries found" if has_responsive else "No media queries"})
    
    has_reduced_motion = "prefers-reduced-motion" in (
        open(CSS / "style.css", "r", encoding="utf-8").read() if os.path.isfile(CSS / "style.css") else ""
    )
    checks.append({"id": "12.5", "name": "Reduced motion support", "pass": has_reduced_motion,
                   "detail": "prefers-reduced-motion found" if has_reduced_motion else "No reduced motion support"})
    
    passed = all(c["pass"] for c in checks)
    return passed, checks


# Sprint registry
SPRINT_VERIFIERS = {
    0: ("Project Skeleton", verify_sprint_0),
    1: ("Home Tab", verify_sprint_1),
    2: ("History Tab", verify_sprint_2),
    3: ("Training 1-3", verify_sprint_3),
    4: ("Training 4-6", verify_sprint_4),
    5: ("Simulator Core", verify_sprint_5),
    6: ("Assembler", verify_sprint_6),
    7: ("Panel UI", verify_sprint_7),
    8: ("Sound", verify_sprint_8),
    9: ("Paper Tape", verify_sprint_9),
    10: ("Tools", verify_sprint_10),
    11: ("Examples", verify_sprint_11),
    12: ("Polish", verify_sprint_12),
}


def verify_all():
    """Verify all sprints and return structured results."""
    results = {}
    for sprint_num, (name, verifier) in SPRINT_VERIFIERS.items():
        try:
            passed, checks = verifier()
        except Exception as e:
            passed = False
            checks = [{"id": f"{sprint_num}.ERR", "name": "Verification error", "pass": False, "detail": str(e)}]
        results[sprint_num] = {"name": name, "passed": passed, "checks": checks}
    return results


def find_current_sprint():
    """Find the first sprint that hasn't passed verification."""
    results = verify_all()
    for sprint_num in sorted(results.keys()):
        if not results[sprint_num]["passed"]:
            return sprint_num, results
    return None, results  # All done


def print_results(results, verbose=False):
    """Pretty-print verification results."""
    total = len(results)
    done = sum(1 for r in results.values() if r["passed"])
    
    print(f"\n{'='*60}")
    print(f"  VEIZAC Sprint Verification — {done}/{total} sprints VERIFIED")
    print(f"{'='*60}\n")
    
    for sprint_num in sorted(results.keys()):
        r = results[sprint_num]
        status = "✅ PASS" if r["passed"] else "❌ FAIL"
        print(f"  Sprint {sprint_num:2d}: {r['name']:<20s} {status}")
        
        if verbose or not r["passed"]:
            for check in r["checks"]:
                icon = "  ✓" if check["pass"] else "  ✗"
                print(f"    {icon} [{check['id']}] {check['name']}: {check['detail']}")
    
    print(f"\n{'='*60}")
    
    # Write machine-readable output
    output = {
        "timestamp": __import__("datetime").datetime.now().isoformat(),
        "summary": {"total": total, "passed": done, "failed": total - done},
        "sprints": {}
    }
    for sprint_num, r in results.items():
        output["sprints"][str(sprint_num)] = {
            "name": r["name"],
            "passed": r["passed"],
            "checks": r["checks"]
        }
    
    output_path = STATE / "verification.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results written to: {output_path}")
    
    return done, total


def main():
    args = sys.argv[1:]
    
    if "--all" in args:
        results = verify_all()
        print_results(results, verbose="--verbose" in args or "-v" in args)
    elif "--next" in args:
        current, results = find_current_sprint()
        if current is None:
            print("All sprints verified! Project is complete.")
        else:
            print(f"Next sprint to work on: Sprint {current} — {results[current]['name']}")
            print(f"\nFailing checks:")
            for check in results[current]["checks"]:
                if not check["pass"]:
                    print(f"  ✗ [{check['id']}] {check['name']}: {check['detail']}")
    elif args and args[0].isdigit():
        sprint_num = int(args[0])
        if sprint_num in SPRINT_VERIFIERS:
            name, verifier = SPRINT_VERIFIERS[sprint_num]
            passed, checks = verifier()
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"\nSprint {sprint_num}: {name} — {status}\n")
            for check in checks:
                icon = "✓" if check["pass"] else "✗"
                print(f"  {icon} [{check['id']}] {check['name']}: {check['detail']}")
        else:
            print(f"Unknown sprint: {sprint_num}")
    else:
        # Default: find current sprint and verify it
        current, results = find_current_sprint()
        if current is None:
            print_results(results)
        else:
            print(f"Current sprint: {current} — {results[current]['name']}")
            print_results({current: results[current]}, verbose=True)


if __name__ == "__main__":
    main()
