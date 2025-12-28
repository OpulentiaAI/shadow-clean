/**
 * Daytona AI Elements Components
 * 
 * Components that power a real-time browser-style view for agents:
 * - WebPreview: Live preview frame with navigation, URL input, and console
 * - ToolPanel: Collapsible panel for tool invocation status
 * - ComputerUse: Mouse, keyboard, screenshot controls for GUI automation
 * - WebTerminal: Browser-based terminal on port 22222
 * 
 * These components integrate with Daytona.io sandbox infrastructure:
 * - Preview links (ports 3000-9999): https://{port}-{sandboxId}.proxy.daytona.works
 * - Computer Use API: Desktop automation via mouse, keyboard, screenshots
 * - Web Terminal: Shell access on default port 22222
 */

// WebPreview - Live preview frame for sandbox web apps
export {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewUrl,
  WebPreviewConsole,
  useWebPreview,
  type WebPreviewProps,
  type WebPreviewContextValue,
  type ConsoleLog,
} from "./web-preview";

// ToolPanel - Display tool invocation details/status
export {
  ToolPanel,
  ToolList,
  type ToolPanelProps,
  type ToolListProps,
  type ToolInvocation,
  type ToolStatus,
} from "./tool-panel";

// ComputerUse - Desktop automation controls
export {
  ComputerUseProvider,
  ComputerUseDisplay,
  ComputerUseToolbar,
  ComputerUseActions,
  useComputerUse,
  type ComputerUseProviderProps,
  type ComputerUseContextValue,
  type Position,
  type DisplayInfo,
  type MouseButton,
  type KeyModifier,
  type InteractionMode,
} from "./computer-use";

// WebTerminal - Browser-based shell terminal
export {
  WebTerminal,
  type WebTerminalProps,
} from "./web-terminal";

// Legacy BrowserViewPanel (deprecated, use WebPreview instead)
export { BrowserViewPanel } from "./browser-view-panel";
