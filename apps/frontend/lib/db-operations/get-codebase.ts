import { CodebaseWithSummaries, CodebaseSummary, ShadowWikiContentSchema } from "@repo/types";
import { getConvexClient, api } from "../convex/client";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Parse codebase content from Convex format to CodebaseSummary[]
 */
function parseConvexCodebaseSummaries(content: unknown): CodebaseSummary[] {
  try {
    const parseResult = ShadowWikiContentSchema.safeParse(content);
    if (!parseResult.success) {
      console.warn("Failed to parse codebase content:", parseResult.error);
      return [];
    }

    const data = parseResult.data;
    const summaries: CodebaseSummary[] = [];

    // Add root summary
    if (data.rootSummary) {
      summaries.push({
        id: "root_overview",
        type: "repo_summary",
        fileName: "root_overview",
        filePath: "root_overview",
        language: "markdown",
        content: data.rootSummary,
      });
    }

    // Add file summaries
    Object.entries(data.fileCache).forEach(([filePath, content]) => {
      if (content.trim().length > 0) {
        const fileName = filePath.split("/").pop() || filePath;
        const fileExtension = fileName.split(".").pop() || "";
        summaries.push({
          id: filePath.replace(/[^a-zA-Z0-9]/g, "_"),
          type: "file_summary",
          fileName,
          filePath,
          language: fileExtension,
          content,
        });
      }
    });

    // Add directory summaries
    Object.values(data.structure.nodes).forEach((node) => {
      if (node.summary && node.id !== "root" && node.children.length > 0) {
        summaries.push({
          id: node.id,
          type: "directory_summary",
          fileName: node.name,
          filePath: node.relPath || node.name,
          language: "markdown",
          content: node.summary,
        });
      }
    });

    return summaries;
  } catch (e) {
    console.error("Error parsing codebase content", e);
    return [];
  }
}

/**
 * Get codebase by ID from Convex
 */
export async function getCodebase(
  codebaseId: string
): Promise<CodebaseWithSummaries | null> {
  try {
    const client = getConvexClient();
    const codebase = await client.query(api.codebaseUnderstanding.get, {
      id: codebaseId as Id<"codebaseUnderstanding">,
    });

    if (!codebase) {
      return null;
    }

    const summaries = parseConvexCodebaseSummaries(codebase.content);

    return {
      id: codebase._id as string,
      repoFullName: codebase.repoFullName,
      repoUrl: codebase.repoUrl,
      content: codebase.content,
      createdAt: new Date(codebase.createdAt),
      updatedAt: new Date(codebase.updatedAt),
      userId: codebase.userId as string,
      tasks: [], // Tasks relationship not needed for Wiki display
      summaries,
    };
  } catch (err) {
    console.error("Failed to fetch codebase from Convex", err);
    return null;
  }
}

/**
 * Get codebase by task ID from Convex
 */
export async function getCodebaseByTaskId(
  taskId: string
): Promise<CodebaseWithSummaries | null> {
  try {
    const client = getConvexClient();
    const codebase = await client.query(api.codebaseUnderstanding.getByTaskId, {
      taskId: taskId as Id<"tasks">,
    });

    if (!codebase) {
      return null;
    }

    const summaries = parseConvexCodebaseSummaries(codebase.content);

    return {
      id: codebase._id as string,
      repoFullName: codebase.repoFullName,
      repoUrl: codebase.repoUrl,
      content: codebase.content,
      createdAt: new Date(codebase.createdAt),
      updatedAt: new Date(codebase.updatedAt),
      userId: codebase.userId as string,
      tasks: [], // Tasks relationship not needed for Wiki display
      summaries,
    };
  } catch (err) {
    console.error("Failed to fetch codebase by task ID from Convex", err);
    return null;
  }
}
