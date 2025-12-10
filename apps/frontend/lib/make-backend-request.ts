/**
 * Helper function to make HTTP requests to the backend server with automatic API key authentication.
 * Only adds the Authorization header in Vercel production environment (VERCEL_ENV=production).
 *
 * @param url - The URL to request (can be absolute or relative to backend server)
 * @param options - Standard fetch RequestInit options
 * @returns Promise<Response> - The fetch response
 */
export async function makeBackendRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let fullUrl = url;
  if (!url.startsWith("http")) {
    const baseUrl =
      process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
    fullUrl = `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add API key in production (Vercel or Railway)
  const isProduction = process.env.VERCEL_ENV === "production" || 
                       process.env.RAILWAY_ENVIRONMENT === "production" ||
                       process.env.NODE_ENV === "production";
  if (isProduction) {
    const apiKey = process.env.SHADOW_API_KEY;
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      console.warn(
        "[makeBackendRequest] SHADOW_API_KEY not found - required in production environment"
      );
    }
  }

  try {
    return await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error(`[makeBackendRequest] Failed to fetch ${fullUrl}:`, error);
    // Return a mock error response to prevent crash
    return new Response(JSON.stringify({ error: "Backend unreachable" }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" },
    });
  }
}
