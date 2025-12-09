import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up stale presence records; heartbeat is 30s so a 2-minute cutoff is safe.
crons.interval(
  "cleanup-stale-presence",
  { minutes: 2 },
  internal.presence.cleanupStalePresence,
  { timeoutMs: 2 * 60 * 1000 }
);

export default crons;

