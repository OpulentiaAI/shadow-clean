export const SCRATCHPAD_REPO_OWNER = "scratchpad";
export const SCRATCHPAD_REPO_URL_SCHEME = "scratchpad://";
export const SCRATCHPAD_BASE_BRANCH = "scratchpad-main";
export const SCRATCHPAD_DISPLAY_NAME = "Scratchpad";

export function buildScratchpadRepoFullName(taskId: string): string {
  return `${SCRATCHPAD_REPO_OWNER}/${taskId}`;
}

export function buildScratchpadRepoUrl(taskId: string): string {
  return `${SCRATCHPAD_REPO_URL_SCHEME}${taskId}`;
}

export function isScratchpadRepoFullName(value?: string | null): boolean {
  if (!value) return false;
  return value.startsWith(`${SCRATCHPAD_REPO_OWNER}/`);
}
