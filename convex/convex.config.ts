import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import persistentTextStreaming from "@convex-dev/persistent-text-streaming/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config";

const app = defineApp();

// Install the Convex Agent component for threads, messages, context, and streaming
app.use(agent);
app.use(persistentTextStreaming);

// Install the Workflow component for durable agent execution
app.use(workflow);

export default app;
