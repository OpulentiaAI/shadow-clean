import type { VercelRequest, VercelResponse } from "@vercel/node";

// Minimal sidecar health endpoint for Vercel serverless
// Full sidecar functionality requires a persistent server (Railway/container)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;
  
  // Health check
  if (url === "/health" || url === "/" || url === "/api/health") {
    return res.status(200).json({
      success: true,
      healthy: true,
      message: "Sidecar serverless endpoint is healthy",
      note: "Full sidecar functionality requires a persistent server",
      details: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Status endpoint
  if (url === "/status" || url === "/api/status") {
    return res.status(200).json({
      success: true,
      status: "serverless",
      message: "Sidecar is running in serverless mode with limited functionality",
    });
  }

  // All other routes return info about limitations
  return res.status(200).json({
    success: true,
    message: "Sidecar serverless mode",
    note: "Full file system, terminal, and git operations require a persistent sidecar server",
    requestedPath: url,
    method,
  });
}
