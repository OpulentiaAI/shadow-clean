import { MorphClient } from "@morphllm/morphsdk";
import { CommandExecProvider } from "@morphllm/morphsdk/tools/warp-grep";

/**
 * Singleton Morph SDK client for fast code editing and semantic grep
 */
class MorphService {
  private client: MorphClient | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MORPH_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "[MORPH] MORPH_API_KEY not set - Morph features will be disabled"
      );
    }
  }

  /**
   * Get or create the Morph client instance
   */
  getClient(): MorphClient {
    if (!this.apiKey) {
      throw new Error("MORPH_API_KEY environment variable is not set");
    }

    if (!this.client) {
      this.client = new MorphClient({ apiKey: this.apiKey });
      console.log("[MORPH] Initialized Morph SDK client");
    }

    return this.client;
  }

  /**
   * Execute fast file edit using Morph SDK
   * @param filePath - Absolute path to the file to edit
   * @param originalContent - Current content of the file
   * @param updateSnippet - The update snippet with // ... existing code ... markers
   * @param instructions - First-person instructions (e.g., "I am adding error handling")
   * @param model - Model to use (morph-v3-large recommended, morph-v3-fast for real-time)
   * @returns Updated file content
   */
  async editFile(
    filePath: string,
    originalContent: string,
    updateSnippet: string,
    instructions: string,
    model: "morph-v3-large" | "morph-v3-fast" = "morph-v3-large"
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      console.log(`[MORPH_EDIT] Editing ${filePath} with model ${model}`);
      console.log(`[MORPH_EDIT] Instructions: ${instructions}`);

      // Use direct API call via fetch since MorphClient doesn't expose apply method
      const response = await fetch("https://api.morphllm.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: `<instruction>${instructions}</instruction>\n<code>${originalContent}</code>\n<update>${updateSnippet}</update>`,
            },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Morph API error: ${response.statusText}`,
        };
      }

      const data = await response.json() as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string") {
        return {
          success: false,
          error: "Morph returned invalid response",
        };
      }

      return {
        success: true,
        content,
      };
    } catch (error) {
      console.error("[MORPH_EDIT_ERROR]", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute semantic grep search using Warp Grep
   * @param query - Natural language search query
   * @param repoRoot - Root directory of the repository
   * @param provider - Optional custom provider for remote execution
   * @returns Search results with file paths and content
   */
  async warpGrep(
    query: string,
    repoRoot: string,
    provider?: CommandExecProvider
  ): Promise<{
    success: boolean;
    contexts?: Array<{ file: string; content: string }>;
    summary?: string;
    error?: string;
  }> {
    try {
      const client = this.getClient();

      console.log(`[MORPH_WARP_GREP] Searching: ${query}`);
      console.log(`[MORPH_WARP_GREP] Repo root: ${repoRoot}`);

      // @ts-expect-error - warpGrep exists at runtime but types may not be updated yet
      const result = await client.warpGrep.execute({
        query,
        repoRoot,
        provider, // Use custom provider if provided (for remote mode)
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Warp grep search failed",
        };
      }

      return {
        success: true,
        contexts: result.contexts,
        summary: result.summary,
      };
    } catch (error) {
      console.error("[MORPH_WARP_GREP_ERROR]", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if Morph SDK is available (API key is set)
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const morphService = new MorphService();
