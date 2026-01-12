"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("convex/server");
const api_1 = require("./_generated/api");
const crons = (0, server_1.cronJobs)();
// Clean up stale presence records; heartbeat is 30s so a 2-minute cutoff is safe.
crons.interval("cleanup-stale-presence", { minutes: 2 }, api_1.internal.presence.cleanupStalePresence, { timeoutMs: 2 * 60 * 1000 });
exports.default = crons;
