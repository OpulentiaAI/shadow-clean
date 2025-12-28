# Daytona Documentation Reference v0.0.0-dev
# Generated on: 2025-12-23

> Secure and Elastic Infrastructure for Running AI-Generated Code.

---

## AI Elements Components Created

### Frontend Components (`apps/frontend/components/daytona/`)

| Component | Description | Daytona Integration |
|-----------|-------------|---------------------|
| **WebPreview** | Composable preview frame for live UI | Preview links (`https://{port}-{sandboxId}.proxy.daytona.works`) |
| **WebPreviewBody** | Iframe container for preview | Embeds sandbox preview URL |
| **WebPreviewNavigation** | Back/forward/refresh controls | Navigation within preview |
| **WebPreviewUrl** | Editable URL input bar | Supports port-to-URL conversion |
| **WebPreviewConsole** | Console output panel | Displays sandbox logs |
| **ToolPanel** | Collapsible tool invocation panel | Shows tool status (pending/running/completed/error) |
| **ToolList** | List of multiple tool invocations | Batch tool display |
| **ComputerUseProvider** | Context for computer use state | Wraps computer use functionality |
| **ComputerUseDisplay** | Screenshot/VNC display canvas | Shows sandbox desktop |
| **ComputerUseToolbar** | Mode selection toolbar | Click/move/type/drag/scroll modes |
| **ComputerUseActions** | Keyboard input panel | Quick keys and hotkeys |
| **WebTerminal** | Browser-based terminal | Port 22222 shell access |

### Backend Services (`apps/server/src/daytona/`)

| Service | Description |
|---------|-------------|
| **DaytonaService** | Main SDK wrapper for sandbox management, file ops, git, process execution, computer use |
| **DaytonaWorkspaceManager** | Implements WorkspaceManager interface using Daytona sandboxes |
| **DaytonaExecutor** | Simplified executor for command and file operations |

### Usage Example

```tsx
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewUrl,
  WebPreviewConsole,
  ComputerUseProvider,
  ComputerUseDisplay,
  ComputerUseToolbar,
  ToolPanel,
  WebTerminal,
} from "@/components/daytona";

// WebPreview for live app preview
<WebPreview sandboxId="abc123" port={3000}>
  <div className="flex h-10 items-center border-b px-2">
    <WebPreviewNavigation />
    <WebPreviewUrl />
  </div>
  <WebPreviewBody />
  <WebPreviewConsole maxHeight={150} />
</WebPreview>

// ToolPanel for tool invocation status
<ToolPanel tool={{
  id: "tool-1",
  name: "read_file",
  status: "completed",
  args: { path: "/src/index.ts" },
  result: { content: "..." }
}} />

// WebTerminal for shell access
<WebTerminal sandboxId="abc123" port={22222} />
```

---

## Key Documentation Links

### Core Concepts
- [Getting Started](https://www.daytona.io/docs/en/getting-started.md)
- [Configuration](https://www.daytona.io/docs/en/configuration.md)
- [Sandbox Management](https://www.daytona.io/docs/en/sandbox-management.md)
- [Snapshots](https://www.daytona.io/docs/en/snapshots.md)
- [Volumes](https://www.daytona.io/docs/en/volumes.md)

### SDK References
- [TypeScript SDK](https://www.daytona.io/docs/en/typescript-sdk.md)
- [Python SDK](https://www.daytona.io/docs/en/python-sdk.md)

### Features
- [File System Operations](https://www.daytona.io/docs/en/file-system-operations.md)
- [Git Operations](https://www.daytona.io/docs/en/git-operations.md)
- [Process and Code Execution](https://www.daytona.io/docs/en/process-code-execution.md)
- [Preview & Authentication](https://www.daytona.io/docs/en/preview-and-authentication.md)
- [Computer Use - Linux](https://www.daytona.io/docs/en/computer-use-linux.md)
- [Computer Use - macOS](https://www.daytona.io/docs/en/computer-use-macos.md)
- [Computer Use - Windows](https://www.daytona.io/docs/en/computer-use-windows.md)
- [Language Server Protocol](https://www.daytona.io/docs/en/language-server-protocol.md)
- [Log Streaming](https://www.daytona.io/docs/en/log-streaming.md)
- [Pseudo Terminal (PTY)](https://www.daytona.io/docs/en/pty.md)
- [Web Terminal](https://www.daytona.io/docs/en/web-terminal.md)

### MCP & Tools
- [Daytona MCP Server](https://www.daytona.io/docs/en/mcp.md)
- [CLI Reference](https://www.daytona.io/docs/en/tools/cli.md)

---

## TypeScript SDK Quick Reference

### Installation
```bash
npm install @daytona/sdk
```

### Basic Usage
```typescript
import { Daytona } from '@daytona/sdk'

const daytona = new Daytona()

// Create a sandbox
const sandbox = await daytona.create({
  language: 'typescript',
  // Optional: specify resources
  resources: {
    cpu: 2,
    memory: 4096
  }
})

// Execute code
const result = await sandbox.process.executeCommand('echo "Hello World"')
console.log(result.stdout)

// File operations
await sandbox.fs.writeFile('/app/test.txt', 'Hello')
const content = await sandbox.fs.readFile('/app/test.txt')

// Git operations
await sandbox.git.clone('https://github.com/user/repo.git', '/app/repo')

// Clean up
await sandbox.delete()
```

### Configuration
```typescript
const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  serverUrl: process.env.DAYTONA_SERVER_URL, // Optional
  timeout: 30000 // Optional
})
```

### Environment Variables
- `DAYTONA_API_KEY` - Your Daytona API key
- `DAYTONA_SERVER_URL` - Server URL (optional, defaults to cloud)
- `DAYTONA_TARGET` - Default target/region

---

## Sandbox Management

### Lifecycle States
1. **Creating** - Sandbox is being provisioned
2. **Running** - Sandbox is active and ready
3. **Stopped** - Sandbox is stopped (can be started)
4. **Archived** - Sandbox is archived (can be restored)
5. **Error** - Sandbox encountered an error

### Creating Sandboxes
```typescript
// From image
const sandbox = await daytona.create({
  image: 'ubuntu:22.04',
  language: 'python'
})

// From snapshot
const sandbox = await daytona.create({
  snapshot: 'my-snapshot-id'
})

// With resources
const sandbox = await daytona.create({
  language: 'typescript',
  resources: {
    cpu: 4,
    memory: 8192,
    disk: 20480
  }
})

// Ephemeral (auto-cleanup)
const sandbox = await daytona.create({
  language: 'python',
  ephemeral: true
})
```

### Sandbox Operations
```typescript
// Stop/Start
await sandbox.stop()
await sandbox.start()

// Archive/Restore
await sandbox.archive()
// Archived sandboxes restored on next start

// Delete
await sandbox.delete()

// Get info
const info = await sandbox.info()
console.log(info.state, info.id)
```

---

## File System Operations

```typescript
// List files
const files = await sandbox.fs.listFiles('/app')

// Create directory
await sandbox.fs.createDirectory('/app/new-dir')

// Read/Write files
await sandbox.fs.writeFile('/app/file.txt', 'content')
const content = await sandbox.fs.readFile('/app/file.txt')

// Upload files
await sandbox.fs.uploadFile('/app/upload.txt', Buffer.from('data'))

// Download files
const data = await sandbox.fs.downloadFile('/app/file.txt')

// Delete
await sandbox.fs.deleteFile('/app/file.txt')

// Permissions
await sandbox.fs.setPermissions('/app/script.sh', { mode: '755' })

// Search and replace
await sandbox.fs.searchAndReplace('/app/file.txt', 'old', 'new')
```

---

## Process Execution

### Simple Commands
```typescript
const result = await sandbox.process.executeCommand('ls -la')
console.log(result.stdout)
console.log(result.stderr)
console.log(result.exitCode)
```

### Code Execution
```typescript
// Stateless execution
const result = await sandbox.process.runCode('python', `
print("Hello from Python!")
import sys
print(sys.version)
`)

// Stateful interpreter
const interpreter = await sandbox.codeInterpreter.create('python')
await interpreter.run('x = 10')
await interpreter.run('print(x * 2)')  // Outputs: 20
await interpreter.close()
```

### Sessions (Background Processes)
```typescript
// Create session
const session = await sandbox.process.createSession('my-session')

// Execute in session
await session.execute('npm install')
await session.execute('npm run dev &')

// Get session logs
const logs = await session.getLogs()

// List sessions
const sessions = await sandbox.process.listSessions()

// Delete session
await session.delete()
```

---

## Git Operations

```typescript
// Clone repository
await sandbox.git.clone('https://github.com/user/repo.git', '/app/repo')

// With authentication
await sandbox.git.clone('https://github.com/user/private-repo.git', '/app/repo', {
  username: 'user',
  token: 'ghp_xxxx'
})

// Status
const status = await sandbox.git.status('/app/repo')

// Branch operations
await sandbox.git.createBranch('/app/repo', 'feature-branch')
await sandbox.git.checkout('/app/repo', 'feature-branch')
const branches = await sandbox.git.listBranches('/app/repo')

// Staging and committing
await sandbox.git.add('/app/repo', ['file.txt'])
await sandbox.git.commit('/app/repo', 'Commit message')

// Remote operations
await sandbox.git.push('/app/repo', 'origin', 'main')
await sandbox.git.pull('/app/repo', 'origin', 'main')
```

---

## Computer Use (GUI Automation)

### Overview
Computer Use enables GUI automation with mouse, keyboard, and screenshot capabilities.

### Mouse Operations
```typescript
const computer = sandbox.computerUse

// Move mouse
await computer.mouse.move(100, 200)

// Click
await computer.mouse.click(100, 200)
await computer.mouse.click(100, 200, { button: 'right' })
await computer.mouse.doubleClick(100, 200)

// Drag
await computer.mouse.drag(100, 200, 300, 400)

// Scroll
await computer.mouse.scroll(0, -100) // Scroll up
```

### Keyboard Operations
```typescript
// Type text
await computer.keyboard.type('Hello World')

// Press key
await computer.keyboard.press('Enter')
await computer.keyboard.press('Control+c')

// Key combinations
await computer.keyboard.hotkey('Control', 'Shift', 'p')
```

### Screenshot
```typescript
// Full screenshot
const screenshot = await computer.screenshot.capture()
const base64 = screenshot.toBase64()

// Region screenshot
const region = await computer.screenshot.capture({
  region: { x: 0, y: 0, width: 800, height: 600 }
})

// Save to file
await screenshot.save('/app/screenshot.png')
```

### Display Info
```typescript
const display = await computer.display.getInfo()
console.log(display.width, display.height)
```

---

## Preview & Authentication

### Getting Preview URL
```typescript
// Get preview URL for a port
const previewUrl = await sandbox.getPreviewUrl(3000)
console.log(previewUrl) // https://sandbox-id-3000.preview.daytona.io

// With authentication
const authUrl = await sandbox.getPreviewUrl(3000, { authenticated: true })
```

### Preview Options
```typescript
const url = await sandbox.getPreviewUrl(8080, {
  authenticated: false, // Public access
  path: '/api/health'   // Specific path
})
```

---

## Snapshots

### Creating Snapshots
```typescript
// From running sandbox
const snapshot = await daytona.snapshots.create({
  sandboxId: sandbox.id,
  name: 'my-snapshot'
})

// From image
const snapshot = await daytona.snapshots.create({
  image: 'node:18',
  name: 'node-base'
})

// With declarative builder
const snapshot = await daytona.snapshots.create({
  name: 'python-ml',
  image: Image.debian()
    .pipInstall(['numpy', 'pandas', 'scikit-learn'])
    .copy('./requirements.txt', '/app/')
    .run('pip install -r /app/requirements.txt')
})
```

### Using Snapshots
```typescript
// Create sandbox from snapshot
const sandbox = await daytona.create({
  snapshot: snapshot.id
})

// List snapshots
const snapshots = await daytona.snapshots.list()

// Delete snapshot
await daytona.snapshots.delete(snapshot.id)
```

---

## Volumes (Persistent Storage)

```typescript
// Create volume
const volume = await daytona.volumes.create({
  name: 'my-data',
  size: 10240 // 10GB
})

// Mount to sandbox
const sandbox = await daytona.create({
  language: 'python',
  volumes: [{
    volumeId: volume.id,
    mountPath: '/data'
  }]
})

// List volumes
const volumes = await daytona.volumes.list()

// Delete volume
await daytona.volumes.delete(volume.id)
```

---

## PTY (Pseudo Terminal)

```typescript
// Create PTY session
const pty = await sandbox.pty.create({
  cols: 80,
  rows: 24
})

// Connect to PTY
pty.onData((data) => {
  console.log('Output:', data)
})

// Send input
pty.write('ls -la\n')

// Resize
pty.resize(120, 40)

// Close
pty.close()
```

---

## Log Streaming

```typescript
// Stream logs with callback
await sandbox.process.streamLogs((log) => {
  console.log(`[${log.timestamp}] ${log.message}`)
})

// Get all logs
const logs = await sandbox.process.getLogs()
```

---

## Language Server Protocol (LSP)

```typescript
// Create LSP server
const lsp = await sandbox.lsp.create({
  language: 'typescript',
  rootPath: '/app'
})

// Get completions
const completions = await lsp.getCompletions('/app/index.ts', {
  line: 10,
  character: 5
})

// Close
await lsp.close()
```

---

## Error Handling

```typescript
import { 
  DaytonaError, 
  DaytonaNotFoundError, 
  DaytonaRateLimitError,
  DaytonaTimeoutError 
} from '@daytona/sdk'

try {
  const sandbox = await daytona.create({ language: 'python' })
} catch (error) {
  if (error instanceof DaytonaRateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter)
  } else if (error instanceof DaytonaNotFoundError) {
    console.log('Resource not found:', error.message)
  } else if (error instanceof DaytonaTimeoutError) {
    console.log('Operation timed out')
  } else if (error instanceof DaytonaError) {
    console.log('Daytona error:', error.message)
  }
}
```

---

## MCP Server Tools

The Daytona MCP Server provides these tools:

### Sandbox Management
- `sandbox_create` - Create new sandbox
- `sandbox_delete` - Delete sandbox
- `sandbox_start` - Start stopped sandbox
- `sandbox_stop` - Stop running sandbox
- `sandbox_list` - List all sandboxes
- `sandbox_info` - Get sandbox details

### File Operations
- `file_read` - Read file contents
- `file_write` - Write file contents
- `file_list` - List directory contents
- `file_delete` - Delete file or directory
- `file_upload` - Upload file to sandbox
- `file_download` - Download file from sandbox

### Git Operations
- `git_clone` - Clone repository
- `git_status` - Get repository status
- `git_commit` - Commit changes
- `git_push` - Push to remote
- `git_pull` - Pull from remote
- `git_branch` - Branch operations

### Command Execution
- `execute_command` - Run shell command
- `run_code` - Execute code snippet

### Preview
- `get_preview_url` - Get preview URL for port

---

## CLI Commands Reference

```bash
# Authentication
daytona login
daytona logout

# Sandbox management
daytona sandbox create [options]
daytona sandbox list
daytona sandbox info <sandbox-id>
daytona sandbox start <sandbox-id>
daytona sandbox stop <sandbox-id>
daytona sandbox delete <sandbox-id>

# Snapshots
daytona snapshot create [options]
daytona snapshot list
daytona snapshot delete <snapshot-id>
daytona snapshot push <snapshot-id>

# Volumes
daytona volume create [options]
daytona volume list
daytona volume get <volume-id>
daytona volume delete <volume-id>

# Organization
daytona organization create <name>
daytona organization list
daytona organization use <org-id>
daytona organization delete <org-id>

# MCP
daytona mcp init
daytona mcp start
daytona mcp config

# Other
daytona version
daytona docs
daytona autocomplete
```

---

## Best Practices

1. **Use Snapshots** - Pre-build environments for faster startup
2. **Ephemeral Sandboxes** - Use for one-off tasks to auto-cleanup
3. **Resource Management** - Right-size CPU/memory for workload
4. **Error Handling** - Always handle rate limits and timeouts
5. **Clean Up** - Delete sandboxes when done to avoid charges
6. **Use Volumes** - For persistent data across sandbox restarts
7. **Sessions** - Use for long-running background processes
