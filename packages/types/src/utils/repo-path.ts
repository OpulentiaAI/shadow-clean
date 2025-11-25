/**
 * Utilities for handling both GitHub repositories and local filesystem paths
 */

/**
 * Check if a path/URL represents a local filesystem path
 */
export function isLocalPath(pathOrUrl: string): boolean {
  if (!pathOrUrl) return false;
  
  // Absolute paths (Unix/Mac)
  if (pathOrUrl.startsWith("/")) return true;
  
  // Windows absolute paths (C:\, D:\, etc.)
  if (/^[A-Za-z]:[/\\]/.test(pathOrUrl)) return true;
  
  // Relative paths starting with . or ..
  if (pathOrUrl.startsWith("./") || pathOrUrl.startsWith("../")) return true;
  
  // Home directory paths
  if (pathOrUrl.startsWith("~")) return true;
  
  return false;
}

/**
 * Check if a URL is a GitHub repository URL
 */
export function isGitHubUrl(url: string): boolean {
  if (!url) return false;
  return url.includes("github.com");
}

/**
 * Extract repo name from a local path (last directory name)
 * e.g., /Users/john/projects/my-repo -> my-repo
 */
export function getRepoNameFromLocalPath(localPath: string): string {
  // Normalize path separators and remove trailing slashes
  const normalized = localPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || "local-repo";
}

/**
 * Generate a "full name" for a local repository
 * Format: local/<repo-name> to distinguish from GitHub repos
 */
export function getLocalRepoFullName(localPath: string): string {
  const repoName = getRepoNameFromLocalPath(localPath);
  return `local/${repoName}`;
}

/**
 * Check if a repoFullName represents a local repository
 */
export function isLocalRepoFullName(repoFullName: string): boolean {
  return repoFullName.startsWith("local/");
}

/**
 * Parse a repoFullName to extract owner and repo
 * Works for both GitHub (owner/repo) and local (local/repo-name) formats
 */
export function parseRepoFullName(repoFullName: string): { owner: string; repo: string } {
  const parts = repoFullName.split("/");
  if (parts.length < 2) {
    throw new Error(`Invalid repository full name: ${repoFullName}`);
  }
  return {
    owner: parts[0]!,
    repo: parts.slice(1).join("/"), // Handle repos with / in name
  };
}

/**
 * Validate that a path exists and is a git repository
 * Note: This is a type definition only - actual implementation is in server code
 */
export interface LocalRepoValidation {
  isValid: boolean;
  isGitRepo: boolean;
  error?: string;
}
