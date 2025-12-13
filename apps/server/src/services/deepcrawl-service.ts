import { DeepcrawlApp } from "deepcrawl";

let deepcrawlClient: DeepcrawlApp | null = null;

export function getDeepCrawlClient(): DeepcrawlApp | null {
  const apiKey = process.env.DEEPCRAWL_API_KEY;
  
  if (!apiKey) {
    console.warn("[DEEPCRAWL] No DEEPCRAWL_API_KEY found in environment");
    return null;
  }

  if (!deepcrawlClient) {
    deepcrawlClient = new DeepcrawlApp({ apiKey });
    console.log("[DEEPCRAWL] Client initialized");
  }

  return deepcrawlClient;
}

export interface WebReadUrlOptions {
  url: string;
  includeMarkdown?: boolean;
  includeMetadata?: boolean;
  includeCleanedHtml?: boolean;
}

export interface WebReadUrlResult {
  success: boolean;
  message: string;
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  cleanedHtml?: string;
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    publishedDate?: string;
  };
  cached?: boolean;
  error?: string;
}

export async function webReadUrl(options: WebReadUrlOptions): Promise<WebReadUrlResult> {
  const client = getDeepCrawlClient();
  
  if (!client) {
    return {
      success: false,
      message: "Deepcrawl API key not configured",
      url: options.url,
      error: "DEEPCRAWL_API_KEY environment variable is not set",
    };
  }

  try {
    console.log(`[DEEPCRAWL] Reading URL: ${options.url}`);
    
    const result = await client.readUrl(options.url, {
      markdown: options.includeMarkdown ?? true,
      metadata: options.includeMetadata ?? true,
      cleanedHtml: options.includeCleanedHtml ?? false,
    });

    return {
      success: true,
      message: `Successfully read content from ${options.url}`,
      url: result.targetUrl,
      title: result.title,
      description: result.description,
      markdown: result.markdown,
      cleanedHtml: result.cleanedHtml,
      metadata: result.metadata ? {
        title: result.metadata.title,
        description: result.metadata.description,
      } : undefined,
      cached: result.cached,
    };
  } catch (error) {
    console.error(`[DEEPCRAWL] Error reading URL:`, error);
    return {
      success: false,
      message: `Failed to read URL: ${options.url}`,
      url: options.url,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface WebGetMarkdownOptions {
  url: string;
}

export interface WebGetMarkdownResult {
  success: boolean;
  message: string;
  url: string;
  markdown: string;
  cached?: boolean;
  error?: string;
}

export async function webGetMarkdown(options: WebGetMarkdownOptions): Promise<WebGetMarkdownResult> {
  const client = getDeepCrawlClient();
  
  if (!client) {
    return {
      success: false,
      message: "Deepcrawl API key not configured",
      url: options.url,
      markdown: "",
      error: "DEEPCRAWL_API_KEY environment variable is not set",
    };
  }

  try {
    console.log(`[DEEPCRAWL] Getting markdown for: ${options.url}`);
    
    const markdown = await client.getMarkdown(options.url);

    return {
      success: true,
      message: `Successfully converted ${options.url} to markdown`,
      url: options.url,
      markdown: typeof markdown === "string" ? markdown : "",
    };
  } catch (error) {
    console.error(`[DEEPCRAWL] Error getting markdown:`, error);
    return {
      success: false,
      message: `Failed to get markdown: ${options.url}`,
      url: options.url,
      markdown: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface WebExtractLinksOptions {
  url: string;
  includeTree?: boolean;
  includeExternal?: boolean;
}

export interface WebExtractLinksResult {
  success: boolean;
  message: string;
  url: string;
  links?: string[];
  internalLinks?: string[];
  externalLinks?: string[];
  tree?: unknown;
  cached?: boolean;
  error?: string;
}

export async function webExtractLinks(options: WebExtractLinksOptions): Promise<WebExtractLinksResult> {
  const client = getDeepCrawlClient();
  
  if (!client) {
    return {
      success: false,
      message: "Deepcrawl API key not configured",
      url: options.url,
      error: "DEEPCRAWL_API_KEY environment variable is not set",
    };
  }

  try {
    console.log(`[DEEPCRAWL] Extracting links from: ${options.url}`);
    
    const result = await client.extractLinks(options.url, {
      tree: options.includeTree ?? false,
      linkExtractionOptions: {
        includeExternal: options.includeExternal ?? false,
      },
    });

    // Extract links from the response
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];

    if ("extractedLinks" in result && result.extractedLinks) {
      const extracted = result.extractedLinks as { internal?: string[]; external?: string[] };
      if (extracted.internal) {
        internalLinks.push(...extracted.internal);
      }
      if (extracted.external) {
        externalLinks.push(...extracted.external);
      }
    }

    return {
      success: true,
      message: `Successfully extracted ${internalLinks.length + externalLinks.length} links from ${options.url}`,
      url: result.targetUrl,
      links: [...internalLinks, ...externalLinks],
      internalLinks,
      externalLinks: options.includeExternal ? externalLinks : undefined,
      tree: "tree" in result ? result.tree : undefined,
      cached: result.cached,
    };
  } catch (error) {
    console.error(`[DEEPCRAWL] Error extracting links:`, error);
    return {
      success: false,
      message: `Failed to extract links: ${options.url}`,
      url: options.url,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
