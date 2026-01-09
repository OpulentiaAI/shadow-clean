"use server";

import { isAuthenticated, fetchAuthQuery, fetchAuthMutation } from "@/lib/auth/auth-server";
import { randomUUID } from "crypto";
import { z, type ZodIssue } from "zod";
import { generateTaskTitleAndBranch } from "./generate-title-branch";
import {
  generateTaskId,
  MAX_TASKS_PER_USER_PRODUCTION,
  isLocalPath,
  getLocalRepoFullName,
  SCRATCHPAD_BASE_BRANCH,
  buildScratchpadRepoFullName,
  buildScratchpadRepoUrl,
} from "@repo/types";
import {
  createTask as createConvexTask,
  countActiveTasks,
  upsertUser,
  appendMessage,
  updateTask,
  getTask as getConvexTask,
  streamChatWithTools,
  storeGitHubFileTree,
} from "../convex/actions";
import { getGitHubFileTree } from "../github/github-api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

// Dev user ID for local development without auth
const DEV_USER_ID = "dev-local-user";
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

/**
 * Validate that a string is either a GitHub URL or a local filesystem path
 */
function isValidRepoUrl(url: string): boolean {
  // GitHub URL
  if (url.includes("github.com")) return true;
  // Local path
  if (isLocalPath(url)) return true;
  return false;
}

const createTaskSchema = z
  .object({
    message: z
      .string()
      .min(1, "Message is required")
      .max(100000, "Message too long"),
    model: z.string().min(1, "Model is required"),
    repoFullName: z.string().min(1, "Repository name is required").optional(),
    repoUrl: z
      .string()
      .min(1, "Repository URL or path is required")
      .refine(
        (value) => !value || isValidRepoUrl(value),
        "Must be a GitHub URL or local filesystem path"
      )
      .optional(),
    baseBranch: z.string().min(1, "Base branch is required").optional(),
    isScratchpad: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.isScratchpad) {
      return;
    }

    if (!data.repoFullName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Repository name is required",
        path: ["repoFullName"],
      });
    }

    if (!data.repoUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Repository URL or path is required",
        path: ["repoUrl"],
      });
    }

    if (!data.baseBranch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Base branch is required",
        path: ["baseBranch"],
      });
    }
  });

export async function createTask(formData: FormData) {
  let userId: Id<"users">;

  if (BYPASS_AUTH) {
    // Use dev user for local development
    const convexUserId = await upsertUser({
      externalId: DEV_USER_ID,
      name: "Local Dev User",
      email: "dev@localhost",
      emailVerified: true,
    });
    userId = convexUserId;
  } else {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error("Unauthorized");
    }
    
    // Get the actual authenticated user from Better Auth
    const authUser = await fetchAuthQuery(api.auth.getCurrentUser, {});
    if (!authUser) {
      throw new Error("Unable to get authenticated user");
    }
    
    // Upsert to our users table using the Better Auth user ID as external reference
    const convexUserId = await fetchAuthMutation(api.auth.upsertUser, {
      externalId: authUser._id,
      name: authUser.name ?? "Unknown User",
      email: authUser.email,
      image: authUser.image ?? undefined,
      emailVerified: authUser.emailVerified ?? false,
    });
    userId = convexUserId;
  }

  const rawIsScratchpad = formData.get("isScratchpad");
  const isScratchpadFlag =
    rawIsScratchpad === "true" ||
    rawIsScratchpad === "on" ||
    rawIsScratchpad === "1" ||
    rawIsScratchpad === "yes";

  const rawData = {
    message: formData.get("message"),
    model: formData.get("model"),
    repoFullName: formData.get("repoFullName") ?? undefined,
    repoUrl: formData.get("repoUrl") ?? undefined,
    baseBranch: formData.get("baseBranch") ?? undefined,
    isScratchpad: isScratchpadFlag,
  };
  const validation = createTaskSchema.safeParse(rawData);
  if (!validation.success) {
    const errorMessage = validation.error.issues
      .map((err: ZodIssue) => err.message)
      .join(", ");
    throw new Error(`Validation failed: ${errorMessage}`);
  }

  const { message, model, isScratchpad } = validation.data;

  // Generate a temporary ID for branch naming (Convex will generate the real task ID)
  const tempTaskId = generateTaskId();

  let repoUrl: string;
  let repoFullName: string;
  let baseBranch = validation.data.baseBranch || "main";

  if (isScratchpad) {
    repoUrl = buildScratchpadRepoUrl(tempTaskId);
    repoFullName = buildScratchpadRepoFullName(tempTaskId);
    baseBranch = SCRATCHPAD_BASE_BRANCH;
  } else {
    if (!validation.data.repoUrl || !validation.data.repoFullName) {
      throw new Error("Repository information is required");
    }

    repoUrl = validation.data.repoUrl;
    repoFullName = isLocalPath(repoUrl)
      ? getLocalRepoFullName(repoUrl)
      : validation.data.repoFullName;
  }

  // Check task limit in production only
  if (process.env.NODE_ENV === "production") {
    const activeTaskCount = await countActiveTasks(userId);

    if (activeTaskCount >= MAX_TASKS_PER_USER_PRODUCTION) {
      throw new Error(
        `You have reached the maximum of ${MAX_TASKS_PER_USER_PRODUCTION} active tasks. Please complete or archive existing tasks to create new ones.`
      );
    }
  }

  let taskId: Id<"tasks">;

  try {
    console.log("[TASK_CREATION] Parsed payload", {
      isScratchpad,
      repoUrl: validation.data.repoUrl,
      repoFullName: validation.data.repoFullName,
      baseBranch,
      tempTaskId,
      model,
    });

    // Generate a title for the task
    const { title, shadowBranch } = await generateTaskTitleAndBranch(
      tempTaskId,
      message
    );

    // Create the task in Convex
    const createResult = await createConvexTask({
      title,
      repoFullName,
      repoUrl,
      userId,
      isScratchpad,
      baseBranch,
      baseCommitSha: "pending",
      shadowBranch,
      mainModel: model,
    });
    taskId = createResult.taskId;

    console.log(`[TASK_CREATION] Task created with ID: ${taskId}`);

    // Verify the task was created successfully by querying it back
    // This catches any Convex connectivity or consistency issues early
    const verifyTask = await getConvexTask(taskId);
    if (!verifyTask) {
      console.error(
        `[TASK_CREATION] CRITICAL: Task ${taskId} was created but not found on verify. ` +
          `CONVEX_URL: ${process.env.NEXT_PUBLIC_CONVEX_URL?.substring(0, 50)}...`
      );
      throw new Error(
        "Task creation failed: task not found after creation. Please try again."
      );
    }

    console.log(
      `[TASK_CREATION] Task ${taskId} verified successfully. Status: ${verifyTask.status}`
    );

    // Create the initial user message and get its ID for streaming
    const clientMessageId = randomUUID();
    const { messageId: promptMessageId } = await appendMessage({
      taskId,
      role: "USER",
      content: message,
      llmModel: model,
      clientMessageId,
    });
    console.log(`[TASK_CREATION] Created initial user message: ${promptMessageId}`);

    // IMPORTANT: Do not block task creation on workspace initialization / streaming.
    // We want to redirect to the task page immediately so the user can see init progress
    // and streaming tool calls as they happen.
    console.log(`[TASK_CREATION] Scheduling task initiation in background`, {
      taskId,
      model,
      isScratchpad,
    });

    // Convex-native task initialization (no backend dependency)
    void (async () => {
      try {
        console.log(`[TASK_CREATION] Initiating task ${taskId} via Convex`, {
          model,
          isScratchpad,
        });

        // Update task status to initializing
        await updateTask({
          taskId,
          status: "INITIALIZING",
          initStatus: "PREPARE_WORKSPACE",
        });

        // Fetch and store GitHub file tree for non-scratchpad tasks
        if (!isScratchpad && repoFullName && baseBranch) {
          try {
            console.log(`[TASK_CREATION] Fetching GitHub file tree for ${repoFullName}/${baseBranch}`);
            const fileTree = await getGitHubFileTree(repoFullName, baseBranch, userId.toString());
            
            if (fileTree.length > 0) {
              console.log(`[TASK_CREATION] Storing ${fileTree.length} files in Convex`);
              await storeGitHubFileTree(
                taskId,
                fileTree.map((item) => ({
                  path: item.path,
                  type: item.type,
                  size: item.size,
                }))
              );
              console.log(`[TASK_CREATION] File tree stored successfully`);
            } else {
              console.log(`[TASK_CREATION] No files found in GitHub tree`);
            }
          } catch (fileTreeError) {
            console.error(`[TASK_CREATION] Error fetching file tree:`, fileTreeError);
            // Continue with task creation even if file tree fails
          }
        }

        // Trigger Convex streaming for initial message
        // CRITICAL: Pass promptMessageId to prevent duplicate user message creation
        console.log(
          `[TASK_CREATION] Triggering Convex streaming for task ${taskId} with promptMessageId ${promptMessageId}`
        );
	        try {
	          await streamChatWithTools({
	            taskId,
	            prompt: message,
	            model,
	            llmModel: model,
	            promptMessageId, // Prevents streamChatWithTools from creating another user message
	            clientMessageId,
	            // API keys will be resolved server-side from env vars
	            apiKeys: {
	              anthropic: undefined,
	              openai: undefined,
	              openrouter: undefined,
            },
          });
	          console.log(
	            `[TASK_CREATION] Convex streaming completed for task ${taskId}`
	          );
	          
	          // Streaming action sets task status STOPPED on completion; keep STOPPED so follow-ups work.
	          await updateTask({
	            taskId,
	            status: "STOPPED",
	            initStatus: "ACTIVE",
	            hasBeenInitialized: true,
	          });
	        } catch (streamError) {
	          console.error(
	            `[TASK_CREATION] Convex streaming error for task ${taskId}:`,
	            streamError
          );
          
          await updateTask({
            taskId,
            status: "FAILED",
            initializationError: `Streaming error: ${streamError instanceof Error ? streamError.message : String(streamError)}`,
          });
        }
      } catch (error) {
        console.error(
          `[TASK_CREATION] Error initiating task ${taskId}:`,
          error
        );

        await updateTask({
          taskId,
          status: "FAILED",
          initializationError: `Initialization error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    })();
  } catch (error) {
    console.error("Failed to create task:", error);
    throw new Error("Failed to create task");
  }

  return taskId;
}
