/**
 * Morph SDK Service
 * 
 * Provides agentic code execution primitives:
 * - Repo Storage: AI-native git with code indexing  
 * - Semantic Search: Natural language code search (~230ms)
 * - Fast Apply: High-speed file editing (10,500 tokens/s)
 */

import { MorphClient } from "@morphllm/morphsdk";
import config from "../config";

export interface MorphSearchResult {
  success: boolean;
  results: Array<{
    filepath: string;
    content: string;
    rerankScore: number;
    language: string;
    startLine: number;
    endLine: number;
  }>;
  stats: { searchTimeMs: number };
}

export interface MorphFastApplyResult {
  success: boolean;
  changes: { linesAdded: number; linesRemoved: number; linesModified: number };
  udiff?: string;
  error?: string;
}

export class MorphService {
  private client: MorphClient | null = null;
  private initialized = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = config.morphApiKey || process.env.MORPH_API_KEY;
    if (!apiKey) {
      console.warn("[MORPH] No API key. Features disabled.");
      return;
    }
    try {
      this.client = new MorphClient({ apiKey });
      this.initialized = true;
      console.log("[MORPH] Client initialized");
    } catch (error) {
      console.error("[MORPH] Init failed:", error);
    }
  }

  isAvailable(): boolean {
    return this.initialized && this.client !== null;
  }

  // Git, Search, and Fast Apply capabilities below

  async initRepo(repoId: string, dir: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.git.init({ repoId, dir });
      return true;
    } catch (error) {
      console.error("[MORPH] Init repo failed:", error);
      return false;
    }
  }

  async cloneRepo(repoId: string, dir: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.git.clone({ repoId, dir });
      return true;
    } catch (error) {
      console.error("[MORPH] Clone failed:", error);
      return false;
    }
  }

  async gitAdd(dir: string, filepath = "."): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.git.add({ dir, filepath });
      return true;
    } catch (error) {
      console.error("[MORPH] Add failed:", error);
      return false;
    }
  }

  async gitCommit(dir: string, message: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      const result = await this.client.git.commit({ dir, message });
      return typeof result === "string" ? result : null;
    } catch (error) {
      console.error("[MORPH] Commit failed:", error);
      return null;
    }
  }

  async gitPush(dir: string, branch = "main"): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.git.push({ dir, branch });
      return true;
    } catch (error) {
      console.error("[MORPH] Push failed:", error);
      return false;
    }
  }

  async gitPull(dir: string, branch = "main"): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.git.pull({ dir, branch });
      return true;
    } catch (error) {
      console.error("[MORPH] Pull failed:", error);
      return false;
    }
  }

  async gitCheckout(dir: string, ref: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.git.checkout({ dir, ref });
      return true;
    } catch (error) {
      console.error("[MORPH] Checkout failed:", error);
      return false;
    }
  }

  async listBranches(dir: string): Promise<string[]> {
    if (!this.client) return [];
    try {
      return (await this.client.git.listBranches({ dir })) || [];
    } catch (error) {
      console.error("[MORPH] List branches failed:", error);
      return [];
    }
  }

  async waitForEmbeddings(repoId: string, timeout = 120000): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.git.waitForEmbeddings({ repoId, timeout });
      return true;
    } catch (error) {
      console.error("[MORPH] Wait embeddings failed:", error);
      return false;
    }
  }

  async searchCode(
    query: string,
    repoId: string,
    limit = 10
  ): Promise<MorphSearchResult | null> {
    if (!this.client) return null;
    try {
      const result = await this.client.codebaseSearch.search({
        query,
        repoId,
        target_directories: [],
        limit,
      });
      return result as MorphSearchResult;
    } catch (error) {
      console.error("[MORPH] Search failed:", error);
      return null;
    }
  }

  async fastApply(
    targetFilepath: string,
    instructions: string,
    codeEdit: string
  ): Promise<MorphFastApplyResult | null> {
    if (!this.client) return null;
    try {
      const result = await this.client.fastApply.execute({
        target_filepath: targetFilepath,
        instructions,
        code_edit: codeEdit,
      });
      return result as MorphFastApplyResult;
    } catch (error) {
      console.error("[MORPH] Fast Apply failed:", error);
      return {
        success: false,
        changes: { linesAdded: 0, linesRemoved: 0, linesModified: 0 },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const morphService = new MorphService();
