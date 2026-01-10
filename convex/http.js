"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("convex/server");
const persistentStreaming_1 = require("./persistentStreaming");
const auth_1 = require("./auth");
const http = (0, server_1.httpRouter)();
http.route({
    path: "/persistent-stream",
    method: "POST",
    handler: persistentStreaming_1.streamPersistentDemo,
});
// Register Better Auth routes
auth_1.authComponent.registerRoutes(http, auth_1.createAuth);
exports.default = http;
