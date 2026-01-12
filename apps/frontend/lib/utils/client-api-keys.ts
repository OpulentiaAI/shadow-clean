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
  
  // Debug logging
  if (typeof window !== "undefined") {
    console.log("[CLIENT_API_KEYS] Read from cookies:", {
      anthropic: !!keys.anthropic,
      openai: !!keys.openai,
      openrouter: !!keys.openrouter,
      nvidia: !!keys.nvidia,
      fireworks: !!keys.fireworks,
      exa: !!keys.exa,
      allCookies: document.cookie,
    });
  }
  
  return keys;
}
