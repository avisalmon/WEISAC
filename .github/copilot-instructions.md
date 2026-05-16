# Project Instructions

## Python Environment
- Always activate the virtual environment before running Python: `.\env\Scripts\activate`
- If pip install fails, try with Intel proxy: `pip install --proxy http://proxy-dmz.intel.com:911 <package>`
- All dependencies are in `requirements.txt`. Install with: `pip install -r requirements.txt`

## Project: VEIZAC
- This is a WEIZAC computer history and simulator project
- WEIZAC = Weizmann Automatic Computer, Israel's first computer (1954, Weizmann Institute)
- Reference materials go in `reference/`

## Skills
- Always look for skills in `c:\Users\asalmon\.copilot\skills\`
- Project-local skills are in `./skills/`

## AutoAgent State
- Always read `state/knowledge.md` and `state/plan.md` at the START of each iteration
- Always write progress to `state/knowledge.md` at the END of each iteration
- Do NOT repeat work already recorded in knowledge.md
