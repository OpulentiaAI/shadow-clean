import { type GenericCtx } from "@convex-dev/better-auth";
import { DataModel } from "./_generated/dataModel";
export declare const authComponent: {
    adapter: (ctx: GenericCtx<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>) => import("better-auth/adapters").AdapterFactory;
    getAuth: <T extends import("@convex-dev/better-auth", { with: { "resolution-mode": "import" } }).CreateAuth<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>>(createAuth: T, ctx: GenericCtx<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>) => Promise<{
        auth: ReturnType<T>;
        headers: Headers;
    }>;
    getHeaders: (ctx: GenericCtx<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>) => Promise<Headers>;
    safeGetAuthUser: (ctx: GenericCtx<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>) => Promise<{
        _id: import("convex/values", { with: { "resolution-mode": "import" } }).GenericId<"user">;
        _creationTime: number;
        image?: string | null | undefined;
        userId?: string | null | undefined;
        twoFactorEnabled?: boolean | null | undefined;
        isAnonymous?: boolean | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
        phoneNumber?: string | null | undefined;
        phoneNumberVerified?: boolean | null | undefined;
        createdAt: number;
        updatedAt: number;
        email: string;
        emailVerified: boolean;
        name: string;
    }>;
    getAuthUser: (ctx: GenericCtx<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>) => Promise<{
        _id: import("convex/values", { with: { "resolution-mode": "import" } }).GenericId<"user">;
        _creationTime: number;
        image?: string | null | undefined;
        userId?: string | null | undefined;
        twoFactorEnabled?: boolean | null | undefined;
        isAnonymous?: boolean | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
        phoneNumber?: string | null | undefined;
        phoneNumberVerified?: boolean | null | undefined;
        createdAt: number;
        updatedAt: number;
        email: string;
        emailVerified: boolean;
        name: string;
    }>;
    getAnyUserById: (ctx: GenericCtx<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>, id: string) => Promise<{
        _id: import("convex/values", { with: { "resolution-mode": "import" } }).GenericId<"user">;
        _creationTime: number;
        image?: string | null | undefined;
        userId?: string | null | undefined;
        twoFactorEnabled?: boolean | null | undefined;
        isAnonymous?: boolean | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
        phoneNumber?: string | null | undefined;
        phoneNumberVerified?: boolean | null | undefined;
        createdAt: number;
        updatedAt: number;
        email: string;
        emailVerified: boolean;
        name: string;
    }>;
    setUserId: (ctx: import("convex/server", { with: { "resolution-mode": "import" } }).GenericMutationCtx<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>, authId: string, userId: string) => Promise<void>;
    clientApi: () => {
        getAuthUser: import("convex/server", { with: { "resolution-mode": "import" } }).RegisteredQuery<"public", {}, Promise<{
            _id: import("convex/values", { with: { "resolution-mode": "import" } }).GenericId<"user">;
            _creationTime: number;
            image?: string | null | undefined;
            userId?: string | null | undefined;
            twoFactorEnabled?: boolean | null | undefined;
            isAnonymous?: boolean | null | undefined;
            username?: string | null | undefined;
            displayUsername?: string | null | undefined;
            phoneNumber?: string | null | undefined;
            phoneNumberVerified?: boolean | null | undefined;
            createdAt: number;
            updatedAt: number;
            email: string;
            emailVerified: boolean;
            name: string;
        }>>;
    };
    triggersApi: () => {
        onCreate: import("convex/server", { with: { "resolution-mode": "import" } }).RegisteredMutation<"internal", {
            model: string;
            doc: any;
        }, Promise<void>>;
        onUpdate: import("convex/server", { with: { "resolution-mode": "import" } }).RegisteredMutation<"internal", {
            model: string;
            oldDoc: any;
            newDoc: any;
        }, Promise<void>>;
        onDelete: import("convex/server", { with: { "resolution-mode": "import" } }).RegisteredMutation<"internal", {
            model: string;
            doc: any;
        }, Promise<void>>;
    };
    registerRoutes: (http: import("convex/server", { with: { "resolution-mode": "import" } }).HttpRouter, createAuth: import("@convex-dev/better-auth", { with: { "resolution-mode": "import" } }).CreateAuth<{
        fileChanges: {
            document: {
                _id: import("convex/values").GenericId<"fileChanges">;
                _creationTime: number;
                additions: number;
                deletions: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                filePath: string;
            };
            fieldPaths: ("additions" | "deletions" | "createdAt" | "_creationTime" | "taskId" | "operation" | "filePath") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_task_path: ["taskId", "filePath", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        users: {
            document: {
                _id: import("convex/values").GenericId<"users">;
                _creationTime: number;
                externalId?: string;
                image?: string;
                name: string;
                email: string;
                emailVerified: boolean;
                createdAt: number;
                updatedAt: number;
            };
            fieldPaths: ("externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "_creationTime") | "_id";
            indexes: {
                by_email: ["email", "_creationTime"];
                by_external_id: ["externalId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        sessions: {
            document: {
                _id: import("convex/values").GenericId<"sessions">;
                _creationTime: number;
                ipAddress?: string;
                userAgent?: string;
                createdAt: number;
                updatedAt: number;
                token: string;
                expiresAt: number;
                userId: import("convex/values").GenericId<"users">;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId") | "_id";
            indexes: {
                by_token: ["token", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        accounts: {
            document: {
                _id: import("convex/values").GenericId<"accounts">;
                _creationTime: number;
                accessToken?: string;
                refreshToken?: string;
                idToken?: string;
                accessTokenExpiresAt?: number;
                refreshTokenExpiresAt?: number;
                scope?: string;
                password?: string;
                githubInstallationId?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                accountId: string;
                providerId: string;
                githubAppConnected: boolean;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_provider: ["providerId", "accountId", "_creationTime"];
                by_user_provider: ["userId", "providerId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        verification: {
            document: {
                _id: import("convex/values").GenericId<"verification">;
                _creationTime: number;
                createdAt?: number;
                updatedAt?: number;
                value: string;
                expiresAt: number;
                identifier: string;
            };
            fieldPaths: ("value" | "createdAt" | "updatedAt" | "_creationTime" | "expiresAt" | "identifier") | "_id";
            indexes: {
                by_identifier: ["identifier", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        codebaseUnderstanding: {
            document: {
                _id: import("convex/values").GenericId<"codebaseUnderstanding">;
                _creationTime: number;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                contentJson: string;
            };
            fieldPaths: ("repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "contentJson") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        tasks: {
            document: {
                _id: import("convex/values").GenericId<"tasks">;
                _creationTime: number;
                mainModel?: string;
                workspacePath?: string;
                scheduledCleanupAt?: number;
                initializationError?: string;
                errorMessage?: string;
                pullRequestNumber?: number;
                githubIssueId?: string;
                codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
                status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
                repoUrl: string;
                baseBranch: string;
                shadowBranch: string;
                baseCommitSha: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
                title: string;
                repoFullName: string;
                isScratchpad: boolean;
                workspaceCleanedUp: boolean;
                hasBeenInitialized: boolean;
            };
            fieldPaths: ("status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_repo: ["repoFullName", "_creationTime"];
                by_user_status: ["userId", "status", "_creationTime"];
                by_status: ["status", "_creationTime"];
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        taskSessions: {
            document: {
                _id: import("convex/values").GenericId<"taskSessions">;
                _creationTime: number;
                podName?: string;
                podNamespace?: string;
                connectionId?: string;
                endedAt?: number;
                createdAt: number;
                isActive: boolean;
                taskId: import("convex/values").GenericId<"tasks">;
            };
            fieldPaths: ("createdAt" | "_creationTime" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_active: ["taskId", "isActive", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        chatMessages: {
            document: {
                _id: import("convex/values").GenericId<"chatMessages">;
                _creationTime: number;
                status?: "pending" | "streaming" | "complete" | "failed";
                llmModel?: string;
                metadataJson?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                finishReason?: string;
                editedAt?: number;
                stackedTaskId?: import("convex/values").GenericId<"tasks">;
                promptMessageId?: import("convex/values").GenericId<"chatMessages">;
                clientMessageId?: string;
                content: string;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                role: "USER" | "ASSISTANT" | "SYSTEM";
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "_creationTime" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId") | "_id";
            indexes: {
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_role: ["taskId", "role", "_creationTime"];
                by_model_created: ["llmModel", "createdAt", "_creationTime"];
                by_status: ["taskId", "status", "_creationTime"];
                by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        pullRequestSnapshots: {
            document: {
                _id: import("convex/values").GenericId<"pullRequestSnapshots">;
                _creationTime: number;
                status: "CREATED" | "UPDATED";
                linesAdded: number;
                linesRemoved: number;
                commitSha: string;
                createdAt: number;
                title: string;
                description: string;
                filesChanged: number;
                messageId: import("convex/values").GenericId<"chatMessages">;
            };
            fieldPaths: ("status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "_creationTime" | "title" | "description" | "filesChanged" | "messageId") | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolCalls: {
            document: {
                _id: import("convex/values").GenericId<"toolCalls">;
                _creationTime: number;
                error?: string;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                threadId?: string;
                resultJson?: string;
                completedAt?: number;
                status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolCallId: string;
                toolName: string;
                argsJson: string;
                startedAt: number;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        todos: {
            document: {
                _id: import("convex/values").GenericId<"todos">;
                _creationTime: number;
                status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
                content: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                sequence: number;
            };
            fieldPaths: ("status" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "sequence") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_sequence: ["taskId", "sequence", "_creationTime"];
                by_task_status: ["taskId", "status", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        memories: {
            document: {
                _id: import("convex/values").GenericId<"memories">;
                _creationTime: number;
                content: string;
                repoUrl: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                repoFullName: string;
                taskId: import("convex/values").GenericId<"tasks">;
                category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
            };
            fieldPaths: ("content" | "repoUrl" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "repoFullName" | "taskId" | "category") | "_id";
            indexes: {
                by_user_repo: ["userId", "repoFullName", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_category: ["category", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        repositoryIndex: {
            document: {
                _id: import("convex/values").GenericId<"repositoryIndex">;
                _creationTime: number;
                lastCommitSha?: string;
                createdAt: number;
                updatedAt: number;
                repoFullName: string;
                lastIndexedAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "repoFullName" | "lastIndexedAt" | "lastCommitSha") | "_id";
            indexes: {
                by_repo: ["repoFullName", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        userSettings: {
            document: {
                _id: import("convex/values").GenericId<"userSettings">;
                _creationTime: number;
                rules?: string;
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                memoriesEnabled: boolean;
                autoPullRequest: boolean;
                enableShadowWiki: boolean;
                enableIndexing: boolean;
                selectedModels: string[];
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        mcpConnectors: {
            document: {
                _id: import("convex/values").GenericId<"mcpConnectors">;
                _creationTime: number;
                userId?: import("convex/values").GenericId<"users">;
                templateId?: string;
                configJson?: string;
                oauthClientId?: string;
                oauthClientSecret?: string;
                type: "HTTP" | "SSE";
                url: string;
                name: string;
                createdAt: number;
                updatedAt: number;
                nameId: string;
                enabled: boolean;
            };
            fieldPaths: ("type" | "url" | "name" | "createdAt" | "updatedAt" | "_creationTime" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled") | "_id";
            indexes: {
                by_user: ["userId", "_creationTime"];
                by_user_name_id: ["userId", "nameId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        toolLogs: {
            document: {
                _id: import("convex/values").GenericId<"toolLogs">;
                _creationTime: number;
                error?: string;
                resultJson?: string;
                completedAt?: number;
                durationMs?: number;
                status: "RUNNING" | "COMPLETED" | "FAILED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                toolName: string;
                argsJson: string;
            };
            fieldPaths: ("error" | "status" | "createdAt" | "_creationTime" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        terminalOutput: {
            document: {
                _id: import("convex/values").GenericId<"terminalOutput">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                streamType: "stdout" | "stderr";
                commandId: string;
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "streamType" | "commandId") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workspaceStatus: {
            document: {
                _id: import("convex/values").GenericId<"workspaceStatus">;
                _creationTime: number;
                activeProcessCount?: number;
                diskUsageBytes?: number;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                isHealthy: boolean;
                lastHeartbeat: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        presence: {
            document: {
                _id: import("convex/values").GenericId<"presence">;
                _creationTime: number;
                userImage?: string;
                cursor?: {
                    x: number;
                    y: number;
                };
                selection?: {
                    filePath?: string;
                    start: number;
                    end: number;
                };
                createdAt: number;
                updatedAt: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                userName: string;
                activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
                lastSeenAt: number;
            };
            fieldPaths: ("createdAt" | "updatedAt" | "_creationTime" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_user: ["taskId", "userId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        activities: {
            document: {
                _id: import("convex/values").GenericId<"activities">;
                _creationTime: number;
                metadata?: string;
                timestamp: number;
                userId: import("convex/values").GenericId<"users">;
                taskId: import("convex/values").GenericId<"tasks">;
                activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
            };
            fieldPaths: ("timestamp" | "metadata" | "_creationTime" | "userId" | "taskId" | "activityType") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        agentTools: {
            document: {
                _id: import("convex/values").GenericId<"agentTools">;
                _creationTime: number;
                error?: string;
                completedAt?: number;
                result?: any;
                status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
                args: any;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                toolCallId: string;
                toolName: string;
            };
            fieldPaths: ("error" | "status" | "args" | "createdAt" | "_creationTime" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`) | "_id";
            indexes: {
                by_message: ["messageId", "_creationTime"];
                by_task: ["taskId", "_creationTime"];
                by_tool_call_id: ["toolCallId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowTraces: {
            document: {
                _id: import("convex/values").GenericId<"workflowTraces">;
                _creationTime: number;
                metadata?: string;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
                messageId?: import("convex/values").GenericId<"chatMessages">;
                completedAt?: number;
                totalDurationMs?: number;
                estimatedCostMillicents?: number;
                model?: string;
                provider?: string;
                errorType?: string;
                retryCount?: number;
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
            };
            fieldPaths: ("status" | "metadata" | "createdAt" | "updatedAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_trace_id: ["traceId", "_creationTime"];
                by_status: ["status", "createdAt", "_creationTime"];
                by_model: ["model", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        workflowSteps: {
            document: {
                _id: import("convex/values").GenericId<"workflowSteps">;
                _creationTime: number;
                errorMessage?: string;
                promptTokens?: number;
                completionTokens?: number;
                finishReason?: string;
                toolCallId?: string;
                toolName?: string;
                completedAt?: number;
                durationMs?: number;
                chunkCount?: number;
                totalChars?: number;
                status: "COMPLETED" | "FAILED" | "STARTED";
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                startedAt: number;
                traceId: string;
                stepNumber: number;
                stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
            };
            fieldPaths: ("status" | "createdAt" | "_creationTime" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars") | "_id";
            indexes: {
                by_trace: ["traceId", "stepNumber", "_creationTime"];
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        streamingMetrics: {
            document: {
                _id: import("convex/values").GenericId<"streamingMetrics">;
                _creationTime: number;
                traceId?: string;
                totalDurationMs?: number;
                streamEndedAt?: number;
                charsPerWrite?: number;
                createdAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                messageId: import("convex/values").GenericId<"chatMessages">;
                totalChars: number;
                totalDeltas: number;
                avgChunkSize: number;
                throttleIntervalMs: number;
                streamStartedAt: number;
                dbWriteCount: number;
                streamStatus: "aborted" | "streaming" | "failed" | "completed";
            };
            fieldPaths: ("createdAt" | "_creationTime" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus") | "_id";
            indexes: {
                by_task: ["taskId", "createdAt", "_creationTime"];
                by_message: ["messageId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        commandLogs: {
            document: {
                _id: import("convex/values").GenericId<"commandLogs">;
                _creationTime: number;
                timestamp: number;
                content: string;
                taskId: import("convex/values").GenericId<"tasks">;
                commandId: string;
                stream: "stdout" | "stderr" | "system";
            };
            fieldPaths: ("timestamp" | "content" | "_creationTime" | "taskId" | "commandId" | "stream") | "_id";
            indexes: {
                by_task: ["taskId", "timestamp", "_creationTime"];
                by_command: ["commandId", "timestamp", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        gitState: {
            document: {
                _id: import("convex/values").GenericId<"gitState">;
                _creationTime: number;
                repoUrl?: string;
                status: string;
                currentBranch: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                workDir: string;
                lastOperation: string;
                lastOperationTime: number;
            };
            fieldPaths: ("status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
        virtualFiles: {
            document: {
                _id: import("convex/values").GenericId<"virtualFiles">;
                _creationTime: number;
                content?: string;
                storageId?: import("convex/values").GenericId<"_storage">;
                mimeType?: string;
                path: string;
                createdAt: number;
                updatedAt: number;
                taskId: import("convex/values").GenericId<"tasks">;
                size: number;
                isDirectory: boolean;
            };
            fieldPaths: ("path" | "content" | "createdAt" | "updatedAt" | "_creationTime" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType") | "_id";
            indexes: {
                by_task: ["taskId", "_creationTime"];
                by_task_path: ["taskId", "path", "_creationTime"];
                by_id: ["_id"];
                by_creation_time: ["_creationTime"];
            };
            searchIndexes: {};
            vectorIndexes: {};
        };
    }>, opts?: {
        cors?: boolean | {
            allowedOrigins?: string[];
            allowedHeaders?: string[];
            exposedHeaders?: string[];
        };
    }) => void;
};
export declare const createAuth: (ctx: GenericCtx<DataModel>) => import("better-auth", { with: { "resolution-mode": "import" } }).Auth<{
    baseURL: string;
    database: import("better-auth/adapters", { with: { "resolution-mode": "import" } }).AdapterFactory;
    socialProviders: {
        github: {
            clientId: string;
            clientSecret: string;
            scope: string[];
        };
    };
    secret: string;
    trustedOrigins: string[];
    plugins: [{
        id: "convex";
        init: (ctx: import("better-auth").AuthContext<import("better-auth", { with: { "resolution-mode": "import" } }).BetterAuthOptions>) => void;
        hooks: {
            before: ({
                matcher(context: import("better-auth").HookEndpointContext): boolean;
                handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    context: {
                        headers: Headers;
                    };
                } | undefined>;
            } | {
                matcher: (ctx: import("better-auth").HookEndpointContext) => boolean;
                handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    context: import("better-auth").MiddlewareContext<import("better-auth").MiddlewareOptions, import("better-auth").AuthContext<import("better-auth", { with: { "resolution-mode": "import" } }).BetterAuthOptions> & {
                        returned?: unknown | undefined;
                        responseHeaders?: Headers | undefined;
                    }>;
                }>;
            })[];
            after: ({
                matcher(): true;
                handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<Response | {
                    redirect: boolean;
                    url: string;
                } | undefined>;
            } | {
                matcher: (ctx: import("better-auth").HookEndpointContext) => boolean;
                handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<void>;
            })[];
        };
        endpoints: {
            getOpenIdConfig: import("better-auth").StrictEndpoint<"/convex/.well-known/openid-configuration", {
                method: "GET";
                metadata: {
                    isAction: false;
                };
            }, import("better-auth/plugins").OIDCMetadata>;
            getJwks: import("better-auth").StrictEndpoint<"/convex/jwks", {
                method: "GET";
                metadata: {
                    openapi: {
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                keys: {
                                                    type: string;
                                                    description: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            kid: {
                                                                type: string;
                                                                description: string;
                                                            };
                                                            kty: {
                                                                type: string;
                                                                description: string;
                                                            };
                                                            alg: {
                                                                type: string;
                                                                description: string;
                                                            };
                                                            use: {
                                                                type: string;
                                                                description: string;
                                                                enum: string[];
                                                                nullable: boolean;
                                                            };
                                                            n: {
                                                                type: string;
                                                                description: string;
                                                                nullable: boolean;
                                                            };
                                                            e: {
                                                                type: string;
                                                                description: string;
                                                                nullable: boolean;
                                                            };
                                                            crv: {
                                                                type: string;
                                                                description: string;
                                                                nullable: boolean;
                                                            };
                                                            x: {
                                                                type: string;
                                                                description: string;
                                                                nullable: boolean;
                                                            };
                                                            y: {
                                                                type: string;
                                                                description: string;
                                                                nullable: boolean;
                                                            };
                                                        };
                                                        required: string[];
                                                    };
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, import("better-auth").JSONWebKeySet>;
            getLatestJwks: import("better-auth").StrictEndpoint<"/convex/latest-jwks", {
                isAction: boolean;
                method: "POST";
                metadata: {
                    SERVER_ONLY: true;
                    openapi: {
                        description: string;
                    };
                };
            }, any[]>;
            rotateKeys: import("better-auth").StrictEndpoint<"/convex/rotate-keys", {
                isAction: boolean;
                method: "POST";
                metadata: {
                    SERVER_ONLY: true;
                    openapi: {
                        description: string;
                    };
                };
            }, any[]>;
            getToken: import("better-auth").StrictEndpoint<"/convex/token", {
                method: "GET";
                requireHeaders: true;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                metadata: {
                    openapi: {
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                token: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                token: string;
            }>;
        };
        schema: {
            jwks: {
                fields: {
                    publicKey: {
                        type: "string";
                        required: true;
                    };
                    privateKey: {
                        type: "string";
                        required: true;
                    };
                    createdAt: {
                        type: "date";
                        required: true;
                    };
                    expiresAt: {
                        type: "date";
                        required: false;
                    };
                };
            };
            user: {
                readonly fields: {
                    readonly userId: {
                        readonly type: "string";
                        readonly required: false;
                        readonly input: false;
                    };
                };
            };
        };
    }];
}>;
export declare const getCurrentUser: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values", { with: { "resolution-mode": "import" } }).GenericId<"user">;
    _creationTime: number;
    image?: string | null | undefined;
    userId?: string | null | undefined;
    twoFactorEnabled?: boolean | null | undefined;
    isAnonymous?: boolean | null | undefined;
    username?: string | null | undefined;
    displayUsername?: string | null | undefined;
    phoneNumber?: string | null | undefined;
    phoneNumberVerified?: boolean | null | undefined;
    createdAt: number;
    updatedAt: number;
    email: string;
    emailVerified: boolean;
    name: string;
}>>;
export declare const currentUser: import("convex/server").RegisteredQuery<"public", {
    userId?: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    externalId?: string;
    image?: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: number;
    updatedAt: number;
}>>;
export declare const getUserByEmail: import("convex/server").RegisteredQuery<"public", {
    email: string;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    externalId?: string;
    image?: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: number;
    updatedAt: number;
}>>;
export declare const getUserByExternalId: import("convex/server").RegisteredQuery<"public", {
    externalId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    externalId?: string;
    image?: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: number;
    updatedAt: number;
}>>;
export declare const upsertUser: import("convex/server").RegisteredMutation<"public", {
    emailVerified?: boolean;
    image?: string;
    externalId: string;
    name: string;
    email: string;
}, Promise<import("convex/values").GenericId<"users">>>;
export declare const createSession: import("convex/server").RegisteredMutation<"public", {
    ipAddress?: string;
    userAgent?: string;
    token: string;
    expiresAt: number;
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"sessions">>>;
export declare const getSessionByToken: import("convex/server").RegisteredQuery<"public", {
    token: string;
}, Promise<{
    session: {
        _id: import("convex/values").GenericId<"sessions">;
        _creationTime: number;
        ipAddress?: string;
        userAgent?: string;
        createdAt: number;
        updatedAt: number;
        token: string;
        expiresAt: number;
        userId: import("convex/values").GenericId<"users">;
    };
    user: {
        _id: import("convex/values").GenericId<"users">;
        _creationTime: number;
        externalId?: string;
        image?: string;
        name: string;
        email: string;
        emailVerified: boolean;
        createdAt: number;
        updatedAt: number;
    };
}>>;
export declare const deleteSession: import("convex/server").RegisteredMutation<"public", {
    token: string;
}, Promise<{
    success: boolean;
}>>;
export declare const deleteUserSessions: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    deleted: number;
}>>;
export declare const createAccount: import("convex/server").RegisteredMutation<"public", {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    scope?: string;
    githubInstallationId?: string;
    githubAppConnected?: boolean;
    userId: import("convex/values").GenericId<"users">;
    accountId: string;
    providerId: string;
}, Promise<import("convex/values").GenericId<"accounts">>>;
export declare const getAccountByProvider: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
    providerId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"accounts">;
    _creationTime: number;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    scope?: string;
    password?: string;
    githubInstallationId?: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    accountId: string;
    providerId: string;
    githubAppConnected: boolean;
}>>;
export declare const getGitHubAccount: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"accounts">;
    _creationTime: number;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    scope?: string;
    password?: string;
    githubInstallationId?: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    accountId: string;
    providerId: string;
    githubAppConnected: boolean;
}>>;
export declare const updateGitHubInstallation: import("convex/server").RegisteredMutation<"public", {
    githubInstallationId?: string;
    userId: import("convex/values").GenericId<"users">;
    githubAppConnected: boolean;
}, Promise<import("convex/values").GenericId<"accounts">>>;
export declare const clearGitHubInstallation: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"accounts">>>;
export declare const updateAccountTokens: import("convex/server").RegisteredMutation<"public", {
    accountId: import("convex/values").GenericId<"accounts">;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
}, Promise<{
    success: boolean;
}>>;
export declare const createVerification: import("convex/server").RegisteredMutation<"public", {
    value: string;
    expiresAt: number;
    identifier: string;
}, Promise<import("convex/values").GenericId<"verification">>>;
export declare const getVerification: import("convex/server").RegisteredQuery<"public", {
    identifier: string;
}, Promise<{
    _id: import("convex/values").GenericId<"verification">;
    _creationTime: number;
    createdAt?: number;
    updatedAt?: number;
    value: string;
    expiresAt: number;
    identifier: string;
}>>;
export declare const deleteVerification: import("convex/server").RegisteredMutation<"public", {
    identifier: string;
}, Promise<{
    success: boolean;
}>>;
/**
 * Get current session - Convex-native replacement for /api/get-session
 * This query should be used with useQuery(api.auth.getSession)
 */
export declare const getSession: import("convex/server").RegisteredQuery<"public", {
    token?: string;
}, Promise<{
    user: {
        id: import("convex/values").GenericId<"users">;
        name: string;
        email: string;
        image: string;
        emailVerified: boolean;
    };
    session: {
        id: import("convex/values").GenericId<"sessions">;
        expiresAt: number;
    };
    github: {
        connected: boolean;
        installationId: string;
    };
}>>;
/**
 * Get user settings - Convex-native
 */
export declare const getUserSettings: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"userSettings">;
    _creationTime: number;
    rules?: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    memoriesEnabled: boolean;
    autoPullRequest: boolean;
    enableShadowWiki: boolean;
    enableIndexing: boolean;
    selectedModels: string[];
}>>;
//# sourceMappingURL=auth.d.ts.map