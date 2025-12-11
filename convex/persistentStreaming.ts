import { httpAction, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { PersistentTextStreaming } from "@convex-dev/persistent-text-streaming";

const pts = new PersistentTextStreaming(components.persistentTextStreaming);

// Create a new persistent text stream and return its id.
export const createStream = mutation({
  args: {
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const streamId = await pts.createStream(ctx);
    // In the future we can persist streamId on a task/message; for now just return it.
    return { streamId, taskId: args.taskId };
  },
});

// Query the current body of a stream (persistent). [V2 - accepts string ID]
export const getStreamBody = query({
  args: {
    streamId: v.string(), // Component stream IDs are opaque strings
  },
  handler: async (ctx, args) => {
    console.log(`[getStreamBody] Querying stream: ${args.streamId}`);
    return pts.getStreamBody(ctx, args.streamId as any);
  },
});

// Debug query - accepts string streamId for component streams
export const debugGetStream = query({
  args: {
    streamIdStr: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[debugGetStream] Querying stream: ${args.streamIdStr}`);
    try {
      const body = await pts.getStreamBody(ctx, args.streamIdStr as any);
      return { success: true, body };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
});

// Simple demo HTTP action that streams and persists text for a given streamId.
// Replace the generator with your model/tool loop and call appendChunk for each delta.
export const streamPersistentDemo = httpAction(async (ctx, request) => {
  const { streamId } = (await request.json()) as { streamId: string };

  const generate = async (
    _ctx: typeof ctx,
    _req: Request,
    _sid: string,
    appendChunk: (chunk: string) => Promise<void>
  ) => {
    await appendChunk("Streaming started...\n");
    await appendChunk("This text is persisted and streamable via query.\n");
    await appendChunk("Done.");
  };

  const response = await pts.stream(ctx, request, streamId as any, generate);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");
  return response;
});
