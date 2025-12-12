**Purpose**: Rewrite entire files with complete content (optionally supports Morph marker-based edits for existing files)

**Parameters (must match schema exactly):**
- target_file (string, required)
- instructions (string, required)
- code_edit (string, required)
- is_new_file (boolean, optional)

**Critical Instructions:**
- Safest default: explicitly provide the COMPLETE file content in code_edit (full overwrite)
- If editing an existing file and using Morph Fast Apply, code_edit may include update markers like "// ... existing code ..." to indicate unchanged sections
- Make all edits to a file in single call
- If you set is_new_file: use `true` when creating new files, `false` when editing existing files

**When to Use:**
- Creating new files (set `is_new_file: true`)
- Major restructuring of existing files (set `is_new_file: false`)
- Multiple changes in one file (set `is_new_file: false`)
- Complex file modifications (set `is_new_file: false`)

Complete file content with all imports, functions, and code. If using update markers, ensure they clearly bracket unchanged regions.