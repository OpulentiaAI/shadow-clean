/**
 * E2E Test for Deepcrawl Tools
 * Tests web_read_url, web_get_markdown, and web_extract_links
 */

import {
  webReadUrl,
  webGetMarkdown,
  webExtractLinks,
} from "../services/deepcrawl-service";

const TEST_URL = "https://example.com";

async function testWebReadUrl() {
  console.log("\n=== Testing web_read_url ===");
  const result = await webReadUrl({
    url: TEST_URL,
    includeMarkdown: true,
    includeMetadata: true,
    includeCleanedHtml: false,
  });

  console.log("Result:", JSON.stringify(result, null, 2));
  
  if (!result.success) {
    console.error("❌ web_read_url FAILED:", result.error);
    return false;
  }
  
  console.log("✅ web_read_url SUCCESS");
  console.log("  - URL:", result.url);
  console.log("  - Title:", result.title);
  console.log("  - Markdown length:", result.markdown?.length || 0, "chars");
  return true;
}

async function testWebGetMarkdown() {
  console.log("\n=== Testing web_get_markdown ===");
  const result = await webGetMarkdown({ url: TEST_URL });

  console.log("Result:", JSON.stringify(result, null, 2));
  
  if (!result.success) {
    console.error("❌ web_get_markdown FAILED:", result.error);
    return false;
  }
  
  console.log("✅ web_get_markdown SUCCESS");
  console.log("  - URL:", result.url);
  console.log("  - Markdown length:", result.markdown?.length || 0, "chars");
  console.log("  - Preview:", result.markdown?.substring(0, 200) || "");
  return true;
}

async function testWebExtractLinks() {
  console.log("\n=== Testing web_extract_links ===");
  const result = await webExtractLinks({
    url: TEST_URL,
    includeTree: false,
    includeExternal: true,
  });

  console.log("Result:", JSON.stringify(result, null, 2));
  
  if (!result.success) {
    console.error("❌ web_extract_links FAILED:", result.error);
    return false;
  }
  
  console.log("✅ web_extract_links SUCCESS");
  console.log("  - URL:", result.url);
  console.log("  - Total links:", result.links?.length || 0);
  console.log("  - Internal links:", result.internalLinks?.length || 0);
  console.log("  - External links:", result.externalLinks?.length || 0);
  return true;
}

async function runAllTests() {
  console.log("🚀 Starting Deepcrawl E2E Tests");
  console.log("================================");
  console.log("Test URL:", TEST_URL);
  console.log("DEEPCRAWL_API_KEY:", process.env.DEEPCRAWL_API_KEY ? "✅ Set" : "❌ Not set");
  
  const results = {
    web_read_url: await testWebReadUrl(),
    web_get_markdown: await testWebGetMarkdown(),
    web_extract_links: await testWebExtractLinks(),
  };
  
  console.log("\n================================");
  console.log("📊 Test Results Summary:");
  console.log("================================");
  
  let allPassed = true;
  for (const [tool, passed] of Object.entries(results)) {
    console.log(`  ${passed ? "✅" : "❌"} ${tool}`);
    if (!passed) allPassed = false;
  }
  
  console.log("================================");
  console.log(allPassed ? "🎉 All tests PASSED!" : "⚠️ Some tests FAILED");
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
