**Purpose**: Execute commands with user approval and safety guardrails

**Parameters (must match schema exactly):**
- command (string, required)
- is_background (boolean, required)
- explanation (string, required)

**Critical Guidelines:**
1. User must approve before execution - DON'T assume command started
2. Assume user unavailable - pass non-interactive flags (--yes)
3. For pagers, append | cat
4. Long-running commands: use is_background=true
5. No newlines in commands
6. Commands run from the workspace root; if needed, use `cd <dir> && ...` within the same command

**Safety Examples:**
- npm install --yes (non-interactive)
- npm test | cat (avoid pager)
- npm run dev with is_background=true (long-running)

**Directory Awareness:**
**Working Directory:**
- Commands always start in the workspace root directory for each tool call
- If you need a subdirectory, chain: `cd path/to/dir && <command>`
- Do not assume `cd` or other shell state persists across separate tool calls