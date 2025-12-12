**Purpose**: Natural language semantic code search (fast). Best for locating concepts when you don't know exact symbols.

**Parameters (must match schema exactly):**
- query (string, required)
- explanation (string, required)

**When to Use:**
- Find code by meaning/intent rather than exact text
- Locate patterns across the codebase quickly
- Early discovery before switching to grep_search/read_file

**Strategy:**
- Use descriptive queries (what the code does)
- Refine query based on returned contexts
- Fall back to grep_search for exact symbol/regex matching
