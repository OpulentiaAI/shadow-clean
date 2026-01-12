"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("convex/server");
const persistentStreaming_1 = require("./persistentStreaming");
const auth_1 = require("./auth");
const daytonaIngest_1 = require("./daytonaIngest");
const http = (0, server_1.httpRouter)();
http.route({
    path: "/persistent-stream",
    method: "POST",
    handler: persistentStreaming_1.streamPersistentDemo,
});
// Daytona Runner ingest endpoint - receives terminal output from Daytona Runner
http.route({
    path: "/daytona-ingest",
    method: "POST",
    handler: daytonaIngest_1.ingest,
});
// Daytona health check endpoint
http.route({
    path: "/daytona-ingest/health",
    method: "GET",
    handler: daytonaIngest_1.health,
});
// Register Better Auth routes
auth_1.authComponent.registerRoutes(http, auth_1.createAuth);
exports.default = http;
