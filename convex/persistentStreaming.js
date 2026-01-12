"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamPersistentDemo = exports.debugGetStream = exports.getStreamBody = exports.createStream = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const api_1 = require("./_generated/api");
const persistent_text_streaming_1 = require("@convex-dev/persistent-text-streaming");
const pts = new persistent_text_streaming_1.PersistentTextStreaming(api_1.components.persistentTextStreaming);
// Create a new persistent text stream and return its id.
exports.createStream = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.optional(values_1.v.id("tasks")),
    },
    handler: async (ctx, args) => {
        const streamId = await pts.createStream(ctx);
        // In the future we can persist streamId on a task/message; for now just return it.
        return { streamId, taskId: args.taskId };
    },
});
// Query the current body of a stream (persistent). [V2 - accepts string ID]
exports.getStreamBody = (0, server_1.query)({
    args: {
        streamId: values_1.v.string(), // Component stream IDs are opaque strings
    },
    handler: async (ctx, args) => {
        console.log(`[getStreamBody] Querying stream: ${args.streamId}`);
        return pts.getStreamBody(ctx, args.streamId);
    },
});
// Debug query - accepts string streamId for component streams
exports.debugGetStream = (0, server_1.query)({
    args: {
        streamIdStr: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        console.log(`[debugGetStream] Querying stream: ${args.streamIdStr}`);
        try {
            const body = await pts.getStreamBody(ctx, args.streamIdStr);
            return { success: true, body };
        }
        catch (err) {
            return { success: false, error: String(err) };
        }
    },
});
// Simple demo HTTP action that streams and persists text for a given streamId.
// Replace the generator with your model/tool loop and call appendChunk for each delta.
exports.streamPersistentDemo = (0, server_1.httpAction)(async (ctx, request) => {
    const { streamId } = (await request.json());
    const generate = async (_ctx, _req, _sid, appendChunk) => {
        await appendChunk("Streaming started...\n");
        await appendChunk("This text is persisted and streamable via query.\n");
        await appendChunk("Done.");
    };
    const response = await pts.stream(ctx, request, streamId, generate);
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Vary", "Origin");
    return response;
});
