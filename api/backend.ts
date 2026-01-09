import type { VercelRequest, VercelResponse } from "@vercel/node";

// Minimal backend health endpoint for Vercel serverless
// Full backend functionality uses Convex directly from the frontend
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;
  
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  
  if (method === "OPTIONS") {
    return res.status(200).end();
  }

  // Health check
  if (url === "/health" || url === "/" || url === "/api/health") {
    return res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      message: "Backend serverless endpoint is healthy",
      note: "Full backend functionality is handled by Convex",
    });
  }

  // API info endpoint
  if (url === "/api" || url === "/api/") {
    return res.status(200).json({
      success: true,
      message: "Shadow Backend API",
      version: "1.0.0",
      mode: "serverless",
      note: "Most API operations are handled directly by Convex. This endpoint provides health checks and basic info.",
    });
  }

  // For other routes, return info about the serverless limitations
  return res.status(200).json({
    success: true,
    message: "Backend serverless mode",
    note: "Full API operations (tasks, chat, streaming) are handled by Convex directly from the frontend",
    requestedPath: url,
    method,
  });
}
