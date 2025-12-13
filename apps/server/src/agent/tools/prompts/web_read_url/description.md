# Instructions

Read and analyze the content of any web URL. This tool fetches a webpage and returns structured content including markdown, metadata, and optionally cleaned HTML.

Use this tool when:
- The user provides a URL they want you to read or analyze
- You need to understand the content of a webpage before using it for a task
- You want full page context including metadata, title, description, and content

## Options

- `include_markdown` (default: true): Get the page content as clean markdown
- `include_metadata` (default: true): Get page metadata (title, description, author, etc.)
- `include_cleaned_html` (default: false): Get sanitized HTML if needed for detailed analysis

## Tips

- Always use this tool when a user shares a URL they want you to understand
- For documentation links, the markdown output is ideal for learning about APIs or libraries
- For GitHub repos, combine with other tools to understand the codebase structure
- The tool caches requests, so repeated reads of the same URL are fast
