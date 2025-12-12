#!/usr/bin/env node
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

function requireEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

function getEnvNumber(name, fallback) {
    const raw = process.env[name];
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

function getEnvList(name) {
    const raw = process.env[name];
    if (!raw) return null;
    const items = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return items.length ? items : null;
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout(promise, ms, label) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Timeout after ${ms}ms: ${label}`));
        }, ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        clearTimeout(timeoutId);
    }
}

function stableJson(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function summarizeToolTracking(records) {
    const summary = {
        total: records.length,
        statuses: { PENDING: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0 },
        failed: [],
        running: [],
        schemaErrors: [],
    };

    for (const r of records) {
        summary.statuses[r.status] = (summary.statuses[r.status] ?? 0) + 1;

        if (r.status === "RUNNING") {
            summary.running.push({ toolName: r.toolName, toolCallId: r.toolCallId });
        }

        if (r.status === "FAILED") {
            summary.failed.push({
                toolName: r.toolName,
                toolCallId: r.toolCallId,
                error: r.result?.error || r.error || "unknown",
            });

            const errStr = String(r.result?.error || r.error || "");
            if (
                errStr.includes("invalid_type") ||
                errStr.includes("ArgumentValidationError") ||
                errStr.includes("NoSuchToolError") ||
                errStr.includes("Required")
            ) {
                summary.schemaErrors.push({
                    toolName: r.toolName,
                    toolCallId: r.toolCallId,
                    error: errStr,
                });
            }
        }
    }

    return summary;
}

function buildSafeToolsFilter() {
    // Restrict tools to read-only operations for E2E tests.
    // NOTE: Convex action only uses tool names from this list.
    const allowed = [
        "list_dir",
        "read_file",
        "grep_search",
        "file_search",
        "semantic_search",
        "warp_grep",
    ];
    return allowed.map((name) => ({ name, description: "", parameters: {} }));
}

function buildE2EPrompt() {
    // Include explicit JSON objects so the streaming recovery path can extract args
    // if the provider fails to stream tool arguments (common with Kimi).
    return [
        "E2E test instructions:",
        "1) Call list_dir on the workspace root.",
        "If list_dir tool args are missing, you may use defaults.",
        "2) Then read a file that exists. Prefer README.md. If README.md is missing, read package.json. If neither exists, read the first .md or .json you can find.",
        // IMPORTANT: Convex streaming arg recovery currently looks for the literal marker "JSON args:".
        // We provide read_file args here so missing read_file args can be recovered deterministically.
        "JSON args: {\"target_file\":\"README.md\",\"should_read_entire_file\":true,\"explanation\":\"E2E: read README\"}.",
        "3) After reading, respond with a single paragraph summary of what you read.",
    ].join("\n");
}

function getProductionModels() {
    const fromEnv = getEnvList("E2E_MODELS");
    if (fromEnv) return fromEnv;

    // Mirrors @repo/types getDefaultSelectedModels() OpenRouter set (plus a free model)
    return [
        "moonshotai/kimi-k2-thinking",
        "openai/gpt-5.2",
        "openai/gpt-5.1-codex-max",
        "openai/gpt-5.1",
        "x-ai/grok-code-fast-1",
        "anthropic/claude-opus-4.5",
        "moonshotai/kimi-k2",
        "mistralai/codestral-2508",
        "deepseek/deepseek-r1-0528",
        "deepseek/deepseek-chat-v3-0324",
        "qwen/qwen3-coder",
        "qwen/qwen3-235b-a22b-2507",
        "mistralai/devstral-2512:free",
    ];
}

async function main() {
    const convexUrl =
        process.env.CONVEX_URL ||
        process.env.NEXT_PUBLIC_CONVEX_URL ||
        "https://veracious-alligator-638.convex.cloud";

    const userIdOverride = process.env.E2E_USER_ID || null;
    const userEmail = userIdOverride ? null : requireEnv("E2E_USER_EMAIL");

    const taskLimit = getEnvNumber("E2E_TASK_LIMIT", 3);
    const perActionTimeoutMs = getEnvNumber("E2E_ACTION_TIMEOUT_MS", 120000);
    const betweenRunsMs = getEnvNumber("E2E_BETWEEN_RUNS_MS", 200);

    const models = getProductionModels();
    const toolFilter = buildSafeToolsFilter();
    const prompt = buildE2EPrompt();

    const client = new ConvexHttpClient(convexUrl);

    console.log("[E2E] Convex URL:", convexUrl);
    console.log("[E2E] User:", userIdOverride ? `id:${userIdOverride}` : `email:${userEmail}`);
    console.log("[E2E] Task limit:", taskLimit);
    console.log("[E2E] Models:", models.join(", "));

    let userId;
    if (userIdOverride) {
        userId = userIdOverride;
    } else {
        const user = await client.query(api.auth.getUserByEmail, { email: userEmail });
        if (!user?._id) {
            throw new Error(
                `No Convex user found for email ${userEmail}. Try E2E_USER_EMAIL with the email you sign in with, or set E2E_USER_ID.`
            );
        }
        userId = user._id;
    }

    const allTasks = await client.query(api.tasks.listByUserExcludeArchived, {
        userId,
    });

    const candidateTasks = allTasks
        .filter((t) => !t.isScratchpad)
        .filter((t) => !!t.repoFullName)
        .filter((t) => !!t.workspacePath)
        .filter((t) => t.hasBeenInitialized)
        .filter((t) => !t.workspaceCleanedUp)
        .slice(0, taskLimit);

    if (candidateTasks.length === 0) {
        throw new Error(
            "No suitable tasks found (need repoFullName, workspacePath, initialized, not scratchpad)."
        );
    }

    console.log(
        `[E2E] Selected ${candidateTasks.length} tasks: ${candidateTasks
            .map((t) => `${t._id} (${t.repoFullName})`)
            .join(", ")}`
    );

    const report = {
        startedAt: new Date().toISOString(),
        convexUrl,
        user: userIdOverride ? { userId } : { email: userEmail, userId },
        taskIds: candidateTasks.map((t) => t._id),
        models,
        results: [],
    };

    for (const task of candidateTasks) {
        for (const model of models) {
            const label = `${task._id} :: ${task.repoFullName} :: ${model}`;
            console.log(`\n[E2E] RUN ${label}`);

            let actionResult;
            let toolTracking;
            let error = null;

            try {
                actionResult = await withTimeout(
                    client.action(api.streaming.streamChatWithTools, {
                        taskId: task._id,
                        prompt,
                        model,
                        llmModel: model,
                        apiKeys: {},
                        tools: toolFilter,
                    }),
                    perActionTimeoutMs,
                    `streamChatWithTools ${label}`
                );

                toolTracking = await client.query(api.toolCallTracking.byMessage, {
                    messageId: actionResult.messageId,
                });
            } catch (e) {
                error = String(e?.message || e);
            }

            const toolSummary = toolTracking
                ? summarizeToolTracking(toolTracking)
                : null;

            const ok =
                !error &&
                toolSummary &&
                toolSummary.statuses.RUNNING === 0 &&
                toolSummary.schemaErrors.length === 0;

            const row = {
                taskId: task._id,
                repoFullName: task.repoFullName,
                model,
                ok,
                actionResult: actionResult
                    ? {
                        success: actionResult.success,
                        messageId: actionResult.messageId,
                        toolCallIds: actionResult.toolCallIds,
                        usage: actionResult.usage,
                        textLen: (actionResult.text || "").length,
                    }
                    : null,
                toolSummary,
                error,
            };

            report.results.push(row);

            console.log(`[E2E] ok=${ok} messageId=${row.actionResult?.messageId || "-"}`);
            if (error) console.log(`[E2E] error=${error}`);
            if (toolSummary?.schemaErrors?.length) {
                console.log(
                    `[E2E] schemaErrors=${toolSummary.schemaErrors.length} :: ${toolSummary.schemaErrors
                        .map((x) => `${x.toolName}`)
                        .join(", ")}`
                );
            }

            await sleep(betweenRunsMs);
        }
    }

    const failed = report.results.filter((r) => !r.ok);
    console.log(`\n[E2E] COMPLETE. failures=${failed.length}/${report.results.length}`);
    console.log(stableJson({ failures: failed.slice(0, 10) }));

    // Print full report JSON last for easy copy/paste.
    console.log("\n[E2E_REPORT_JSON]" + JSON.stringify(report, null, 2));

    if (failed.length) process.exit(1);
}

main().catch((err) => {
    console.error("\n[E2E] FATAL:", err);
    process.exit(1);
});
