/**
 * Script to fetch and store GitHub file tree for an existing task
 * Run with: npx tsx scripts/fetch-github-tree.ts
 */

import { Octokit } from "@octokit/rest";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY;

async function fetchGitHubTree(owner: string, repo: string, branch: string) {
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  // Get branch ref
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const commitSha = refData.object.sha;

  // Get commit to find tree SHA
  const { data: commitData } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: commitSha,
  });

  const treeSha = commitData.tree.sha;

  // Get tree recursively
  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "true",
  });

  // Convert to our format
  const files = treeData.tree
    .filter((item) => item.path && item.sha && (item.type === "blob" || item.type === "tree"))
    .map((item) => ({
      path: item.path!,
      type: item.type as string,
      size: item.size || 0,
    }));

  console.log(`Fetched ${files.length} items from ${owner}/${repo}/${branch}`);
  return files;
}

async function main() {
  const files = await fetchGitHubTree("Git-Godssoldier", "tanstack-ai", "main");
  
  // Output as JSON for use with convex run
  console.log("\n--- Files to store (first 50) ---");
  console.log(JSON.stringify(files.slice(0, 50), null, 2));
  
  console.log(`\n--- Total files: ${files.length} ---`);
  console.log("\nTo store in Convex, run:");
  console.log(`CONVEX_DEPLOY_KEY="..." npx convex run "files:storeGitHubFileTree" '{"taskId":"k57az4jxw1k3e7rq4b7k2wmnxn7y0ze0","files":${JSON.stringify(files)}}'`);
}

main().catch(console.error);
