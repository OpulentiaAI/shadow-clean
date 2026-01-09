import { httpRouter } from "convex/server";
import { streamPersistentDemo } from "./persistentStreaming";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

http.route({
  path: "/persistent-stream",
  method: "POST",
  handler: streamPersistentDemo,
});

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth);

export default http;



