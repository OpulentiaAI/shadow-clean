"use server";

import { auth } from "@/lib/auth/auth";
import { MessageRole, prisma, Task } from "@repo/db";
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
  let userId: string;

  if (BYPASS_AUTH) {
    // Use dev user for local development
    userId = DEV_USER_ID;
    // Ensure dev user exists in database
    await prisma.user.upsert({
      where: { id: DEV_USER_ID },
      update: {},
      create: {
        id: DEV_USER_ID,
        name: "Local Dev User",
        email: "dev@localhost",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } else {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }
    userId = session.user.id;
  }

  const rawData = {
    message: formData.get("message"),
    model: formData.get("model"),
    repoFullName: formData.get("repoFullName") ?? undefined,
    repoUrl: formData.get("repoUrl") ?? undefined,
    baseBranch: formData.get("baseBranch") ?? undefined,
    isScratchpad: formData.get("isScratchpad") === "true",
  };
  const validation = createTaskSchema.safeParse(rawData);
  if (!validation.success) {
    const errorMessage = validation.error.issues
      .map((err: ZodIssue) => err.message)
      .join(", ");
    throw new Error(`Validation failed: ${errorMessage}`);
  }

  const { message, model, isScratchpad } = validation.data;

  const taskId = generateTaskId();

  let repoUrl: string;
  let repoFullName: string;
  let baseBranch = validation.data.baseBranch || "main";

  if (isScratchpad) {
    repoUrl = buildScratchpadRepoUrl(taskId);
    repoFullName = buildScratchpadRepoFullName(taskId);
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
    const activeTaskCount = await prisma.task.count({
      where: {
        userId: userId,
        status: {
          notIn: ["COMPLETED", "FAILED", "ARCHIVED"]
        }
      }
    });

    if (activeTaskCount >= MAX_TASKS_PER_USER_PRODUCTION) {
      throw new Error(`You have reached the maximum of ${MAX_TASKS_PER_USER_PRODUCTION} active tasks. Please complete or archive existing tasks to create new ones.`);
    }
  }

  let task: Task;

  try {
    // Generate a title for the task
    const { title, shadowBranch } = await generateTaskTitleAndBranch(
      taskId,
      message
    );

    // Create the task
    task = await prisma.task.create({
      data: {
        id: taskId,
        title,
        repoFullName,
        repoUrl,
        baseBranch,
        shadowBranch,
        baseCommitSha: "pending",
        status: "INITIALIZING",
        isScratchpad,
        user: {
          connect: {
            id: userId,
          },
        },
        messages: {
          create: {
            content: message,
            role: MessageRole.USER,
            sequence: 1,
            llmModel: model,
          },
        },
      },
    });

    // Initiate the task immediately (synchronously) instead of using after()
    // This ensures workspace initialization begins right after task creation
    try {
      console.log(`[TASK_CREATION] Initiating task ${task.id} immediately`);

      // Forward cookies from the original request
      const requestHeaders = await headers();
      const cookieHeader = requestHeaders.get("cookie");

      const response = await makeBackendRequest(
        `/api/tasks/${task.id}/initiate`,
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
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TASK_CREATION] Failed to initiate task ${task.id}:`, errorText);

        // Update task status to failed if initialization fails
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: "FAILED",
            initializationError: `Initialization failed: ${errorText}`,
          },
        });
      } else {
        console.log(`[TASK_CREATION] Successfully initiated task ${task.id}`);
      }
    } catch (error) {
      console.error(`[TASK_CREATION] Error initiating task ${task.id}:`, error);

      // Update task status to failed if there's an error
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: "FAILED",
          initializationError: `Initialization error: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  } catch (error) {
    console.error("Failed to create task:", error);
    throw new Error("Failed to create task");
  }

  return task.id;
}
