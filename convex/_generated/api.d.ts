/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as agentTools from "../agentTools.js";
import type * as auth from "../auth.js";
import type * as codebaseUnderstanding from "../codebaseUnderstanding.js";
import type * as crons from "../crons.js";
import type * as fileChanges from "../fileChanges.js";
import type * as http from "../http.js";
import type * as memories from "../memories.js";
import type * as messages from "../messages.js";
import type * as persistentStreaming from "../persistentStreaming.js";
import type * as presence from "../presence.js";
import type * as pullRequestSnapshots from "../pullRequestSnapshots.js";
import type * as repositoryIndex from "../repositoryIndex.js";
import type * as streaming from "../streaming.js";
import type * as taskSessions from "../taskSessions.js";
import type * as tasks from "../tasks.js";
import type * as terminalOutput from "../terminalOutput.js";
import type * as todos from "../todos.js";
import type * as toolCallTracking from "../toolCallTracking.js";
import type * as toolCalls from "../toolCalls.js";
import type * as toolLogs from "../toolLogs.js";
import type * as userSettings from "../userSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  agentTools: typeof agentTools;
  auth: typeof auth;
  codebaseUnderstanding: typeof codebaseUnderstanding;
  crons: typeof crons;
  fileChanges: typeof fileChanges;
  http: typeof http;
  memories: typeof memories;
  messages: typeof messages;
  persistentStreaming: typeof persistentStreaming;
  presence: typeof presence;
  pullRequestSnapshots: typeof pullRequestSnapshots;
  repositoryIndex: typeof repositoryIndex;
  streaming: typeof streaming;
  taskSessions: typeof taskSessions;
  tasks: typeof tasks;
  terminalOutput: typeof terminalOutput;
  todos: typeof todos;
  toolCallTracking: typeof toolCallTracking;
  toolCalls: typeof toolCalls;
  toolLogs: typeof toolLogs;
  userSettings: typeof userSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  persistentTextStreaming: {
    lib: {
      addChunk: FunctionReference<
        "mutation",
        "internal",
        { final: boolean; streamId: string; text: string },
        any
      >;
      createStream: FunctionReference<"mutation", "internal", {}, any>;
      getStreamStatus: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        "pending" | "streaming" | "done" | "error" | "timeout"
      >;
      getStreamText: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          text: string;
        }
      >;
      setStreamStatus: FunctionReference<
        "mutation",
        "internal",
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          streamId: string;
        },
        any
      >;
    };
  };
};
