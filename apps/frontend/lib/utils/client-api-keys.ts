/**
 * Client-side utility to read API keys from cookies
 * Use this in client components where server actions can't be called
 */

export interface ClientApiKeys {
  anthropic?: string;
  openai?: string;
  openrouter?: string;
  nvidia?: string;
  fireworks?: string;
  exa?: string;
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const raw = parts.pop()?.split(";").shift();
    if (raw) {
      try {
        // Decode URI-encoded cookie values
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
}

export function getClientApiKeys(): ClientApiKeys {
  const keys = {
    anthropic: getCookie("anthropic-key"),
    openai: getCookie("openai-key"),
    openrouter: getCookie("openrouter-key"),
    nvidia: getCookie("nvidia-key"),
    fireworks: getCookie("fireworks-key"),
    exa: getCookie("exa-key"),
  };
  
  // Enhanced debug logging
  if (typeof window !== "undefined") {
    const allCookies = document.cookie;
    const cookieNames = allCookies.split(";").map(c => c.trim().split("=")[0]);
    
    console.log("[CLIENT_API_KEYS] === Cookie Diagnostic ===");
    console.log("[CLIENT_API_KEYS] Current domain:", window.location.hostname);
    console.log("[CLIENT_API_KEYS] Cookie names found:", cookieNames);
    console.log("[CLIENT_API_KEYS] Keys extracted:", {
      anthropic: keys.anthropic ? `YES (${keys.anthropic.length} chars)` : "NO",
      openai: keys.openai ? `YES (${keys.openai.length} chars)` : "NO",
      openrouter: keys.openrouter ? `YES (${keys.openrouter.length} chars)` : "NO",
      nvidia: keys.nvidia ? `YES (${keys.nvidia.length} chars)` : "NO",
      fireworks: keys.fireworks ? `YES (${keys.fireworks.length} chars)` : "NO",
      exa: keys.exa ? `YES (${keys.exa.length} chars)` : "NO",
    });
    
    // Check if fireworks-key cookie exists but wasn't parsed correctly
    const hasFireworksCookie = allCookies.includes("fireworks-key");
    if (hasFireworksCookie && !keys.fireworks) {
      console.error("[CLIENT_API_KEYS] !!! fireworks-key cookie exists but failed to parse !!!");
      console.log("[CLIENT_API_KEYS] Raw cookies:", allCookies);
    }
  }
  
  return keys;
}
