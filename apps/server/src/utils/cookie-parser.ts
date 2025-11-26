import { ApiKeys } from "@repo/types";

// Environment variable fallbacks for local development
const ENV_OPENAI_KEY = process.env.OPENAI_API_KEY;
const ENV_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ENV_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

export function parseApiKeysFromCookies(cookieHeader?: string): ApiKeys {
  if (!cookieHeader) {
    // Return env fallbacks if no cookies
    return {
      openai: ENV_OPENAI_KEY || undefined,
      anthropic: ENV_ANTHROPIC_KEY || undefined,
      openrouter: ENV_OPENROUTER_KEY || undefined,
      // groq: undefined,
      // ollama: undefined,
    };
  }

  const cookies = cookieHeader
    .split(";")
    .reduce((acc: Record<string, string>, cookie) => {
      const trimmedCookie = cookie.trim();
      const firstEqualsIndex = trimmedCookie.indexOf("=");
      if (firstEqualsIndex === -1) return acc;

      const key = trimmedCookie.substring(0, firstEqualsIndex);
      const value = trimmedCookie.substring(firstEqualsIndex + 1);

      if (key && value) {
        // Only decode if the value contains % (URL-encoded)
        acc[key] = value.includes("%") ? decodeURIComponent(value) : value;
      }
      return acc;
    }, {});

  // Use cookie values first, then fallback to environment variables
  return {
    openai: cookies["openai-key"] || ENV_OPENAI_KEY || undefined,
    anthropic: cookies["anthropic-key"] || ENV_ANTHROPIC_KEY || undefined,
    openrouter: cookies["openrouter-key"] || ENV_OPENROUTER_KEY || undefined,
    // groq: cookies["groq-key"] || undefined,
    // ollama: cookies["ollama-key"] || undefined,
  };
}
