"use server";

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { z, ZodIssue } from "zod";
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
import { makeBackendRequest } from "../make-backend-request";
import {
  createTask as createConvexTask,
  countActiveTasks,
  initiateTask as initiateConvexTask,
  upsertUser,
  appendMessage,
  updateTask,
  getTask as getConvexTask,
} from "../convex/actions";
import type { Id } from "../../../../convex/_generated/dataModel";

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
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }
    const convexUserId = await upsertUser({
      externalId: session.user.id,
      name: session.user.name ?? "Authenticated User",
      email: session.user.email ?? "unknown@user.local",
      image: session.user.image ?? undefined,
      emailVerified: session.user.emailVerified ?? false,
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

    // Create the initial user message
    await appendMessage({
      taskId,
      role: "USER",
      content: message,
      llmModel: model,
    });

    // Initiate the task immediately (synchronously) instead of using after()
    // This ensures workspace initialization begins right after task creation
    try {
      console.log(`[TASK_CREATION] Initiating task ${taskId} immediately`, {
        model,
        isScratchpad,
      });

      // Forward cookies from the original request
      const requestHeaders = await headers();
      const cookieHeader = requestHeaders.get("cookie");

      // Check if Convex streaming is enabled to skip backend LLM processing
      const useConvexStreaming =
        process.env.NEXT_PUBLIC_USE_CONVEX_REALTIME === "true";

      const response = await makeBackendRequest(
        `/api/tasks/${taskId}/initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cookieHeader && { Cookie: cookieHeader }),
          },
          body: JSON.stringify({
            message,
            model,
            userId: userId,
            // When Convex streaming is enabled, skip backend LLM processing
            // Convex streamChatWithTools action will handle the LLM call
            useConvexStreaming,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[TASK_CREATION] Failed to initiate task ${taskId}: status=${response.status}`,
          errorText
        );

        // Update task status to failed if initialization fails
        await updateTask({
          taskId,
          status: "FAILED",
          initializationError: `Initialization failed: ${errorText}`,
        });
      } else {
        console.log(`[TASK_CREATION] Successfully initiated task ${taskId}`);
      }
    } catch (error) {
      console.error(`[TASK_CREATION] Error initiating task ${taskId}:`, error);

      // Update task status to failed if there's an error
      await updateTask({
        taskId,
        status: "FAILED",
        initializationError: `Initialization error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  } catch (error) {
    console.error("Failed to create task:", error);
    throw new Error("Failed to create task");
  }

  return taskId;
}
