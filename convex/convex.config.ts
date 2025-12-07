import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();

// Install the Convex Agent component so we can use generated helpers in actions.
app.use(agent);

export default app;

