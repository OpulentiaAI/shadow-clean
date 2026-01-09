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
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}

export function getClientApiKeys(): ClientApiKeys {
  return {
    anthropic: getCookie("anthropic-key"),
    openai: getCookie("openai-key"),
    openrouter: getCookie("openrouter-key"),
    nvidia: getCookie("nvidia-key"),
    fireworks: getCookie("fireworks-key"),
    exa: getCookie("exa-key"),
  };
}
