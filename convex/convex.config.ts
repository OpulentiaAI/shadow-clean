import { defineApp } from "convex/server";
// Agent component temporarily disabled - using AI SDK directly with streamText
// import agent from "@convex-dev/agent/convex.config";
import persistentTextStreaming from "@convex-dev/persistent-text-streaming/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config";

const app = defineApp();

// Install the Convex Agent component so we can use generated helpers in actions.
// app.use(agent);
app.use(persistentTextStreaming);

// Install the Workflow component for durable agent execution
app.use(workflow);

export default app;
