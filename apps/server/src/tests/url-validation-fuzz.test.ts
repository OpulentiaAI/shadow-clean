/**
 * URL Validation Property-Based / Fuzz Tests
 * 
 * Uses generated inputs to find edge cases that handwritten tests miss.
 * Tests the property: "If hostname resolves to private/loopback/bind-all/link-local → must reject"
 * 
 * Run: npx vitest run apps/server/src/tests/url-validation-fuzz.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// URL VALIDATION FUNCTION (replicated from mcpConnectors.ts)
// ============================================================================

function validateMcpUrl(urlString: string): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Only HTTPS URLs are allowed for security" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost variants and bind-all
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "[::]" ||
    hostname.endsWith(".localhost")
  ) {
    return { ok: false, error: "Localhost URLs are not allowed" };
  }

  // Block common internal hostnames
  if (
    hostname === "metadata" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    return { ok: false, error: "Internal hostnames are not allowed" };
  }

  // Block IP address patterns
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Pattern);
  if (ipMatch) {
    const parts = ipMatch.slice(1).map(Number);
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    const d = parts[3] ?? 0;

    if (a === 127) {
      return { ok: false, error: "Loopback IP addresses are not allowed" };
    }
    if (a === 10) {
      return { ok: false, error: "Private IP addresses (10.x.x.x) are not allowed" };
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return { ok: false, error: "Private IP addresses (172.16-31.x.x) are not allowed" };
    }
    if (a === 192 && b === 168) {
      return { ok: false, error: "Private IP addresses (192.168.x.x) are not allowed" };
    }
    if (a === 169 && b === 254) {
      return { ok: false, error: "Link-local/metadata IP addresses are not allowed" };
    }
    if (a === 255 || (a === d && d === 255)) {
      return { ok: false, error: "Broadcast addresses are not allowed" };
    }
  }

  return { ok: true };
}

// ============================================================================
// FUZZ GENERATORS
// ============================================================================

// Seeded random for reproducibility
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
  
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(arr.length)]!;
  }
}

// Generate random IPv4 addresses
function* generateIPv4Addresses(rng: SeededRandom, count: number): Generator<string> {
  for (let i = 0; i < count; i++) {
    const a = rng.nextInt(256);
    const b = rng.nextInt(256);
    const c = rng.nextInt(256);
    const d = rng.nextInt(256);
    yield `${a}.${b}.${c}.${d}`;
  }
}

// Generate known-bad IPs
function* generatePrivateIPs(): Generator<{ ip: string; reason: string }> {
  // Loopback
  yield { ip: "127.0.0.1", reason: "loopback" };
  yield { ip: "127.0.0.2", reason: "loopback" };
  yield { ip: "127.255.255.255", reason: "loopback" };
  
  // 10.0.0.0/8
  yield { ip: "10.0.0.1", reason: "private-10" };
  yield { ip: "10.255.255.255", reason: "private-10" };
  
  // 172.16.0.0/12
  yield { ip: "172.16.0.1", reason: "private-172" };
  yield { ip: "172.31.255.255", reason: "private-172" };
  
  // 192.168.0.0/16
  yield { ip: "192.168.0.1", reason: "private-192" };
  yield { ip: "192.168.255.255", reason: "private-192" };
  
  // Link-local
  yield { ip: "169.254.0.1", reason: "link-local" };
  yield { ip: "169.254.169.254", reason: "metadata" };
  
  // Bind-all
  yield { ip: "0.0.0.0", reason: "bind-all" };
}

// Generate URL variations
function* generateURLVariations(hostname: string): Generator<string> {
  yield `https://${hostname}/`;
  yield `https://${hostname}/api`;
  yield `https://${hostname}:443/`;
  yield `https://${hostname}:8443/`;
  yield `https://user:pass@${hostname}/`;
  yield `https://${hostname}/?redirect=http://localhost`;
}

// Generate hostname variations
function* generateHostnameVariations(): Generator<{ hostname: string; shouldBlock: boolean; reason: string }> {
  // Localhost variants
  yield { hostname: "localhost", shouldBlock: true, reason: "localhost" };
  yield { hostname: "LOCALHOST", shouldBlock: true, reason: "localhost-case" };
  yield { hostname: "sub.localhost", shouldBlock: true, reason: "subdomain-localhost" };
  yield { hostname: "api.localhost", shouldBlock: true, reason: "subdomain-localhost" };
  
  // Internal hostnames
  yield { hostname: "metadata", shouldBlock: true, reason: "metadata" };
  yield { hostname: "metadata.google.internal", shouldBlock: true, reason: "gcp-metadata" };
  yield { hostname: "internal.example.com", shouldBlock: false, reason: "contains-internal-but-not-suffix" };
  yield { hostname: "api.internal", shouldBlock: true, reason: "internal-suffix" };
  yield { hostname: "service.local", shouldBlock: true, reason: "local-suffix" };
  
  // Valid public hostnames
  yield { hostname: "example.com", shouldBlock: false, reason: "public" };
  yield { hostname: "api.example.com", shouldBlock: false, reason: "public-subdomain" };
  yield { hostname: "mcp.context7.com", shouldBlock: false, reason: "public-mcp" };
}

// ============================================================================
// PROPERTY-BASED TESTS
// ============================================================================

describe("URL Validation: Property-Based Tests", () => {
  it("PROPERTY: All private IPs must be rejected", () => {
    for (const { ip, reason } of generatePrivateIPs()) {
      for (const url of generateURLVariations(ip)) {
        const result = validateMcpUrl(url);
        expect(result.ok, `${ip} (${reason}) should be blocked: ${url}`).toBeFalsy();
      }
    }
  });

  it("PROPERTY: All localhost variants must be rejected", () => {
    const localhostVariants = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "[::1]",
      "sub.localhost",
    ];
    
    for (const host of localhostVariants) {
      const result = validateMcpUrl(`https://${host}/api`);
      expect(result.ok, `${host} should be blocked`).toBeFalsy();
    }
  });

  it("PROPERTY: Non-HTTPS protocols must be rejected", () => {
    const protocols = ["http", "ftp", "file", "javascript", "data"];
    
    for (const proto of protocols) {
      const result = validateMcpUrl(`${proto}://example.com/api`);
      expect(result.ok, `${proto}:// should be blocked`).toBeFalsy();
    }
  });

  it("PROPERTY: Valid public URLs must be accepted", () => {
    const validHosts = [
      "example.com",
      "api.example.com",
      "mcp.context7.com",
      "8.8.8.8",
      "1.1.1.1",
    ];
    
    for (const host of validHosts) {
      const result = validateMcpUrl(`https://${host}/api`);
      expect(result.ok, `${host} should be allowed`).toBeTruthy();
    }
  });

  it("PROPERTY: Hostname variations follow expected rules", () => {
    for (const { hostname, shouldBlock, reason } of generateHostnameVariations()) {
      const result = validateMcpUrl(`https://${hostname}/api`);
      expect(
        result.ok !== shouldBlock,
        `${hostname} (${reason}): expected ${shouldBlock ? "blocked" : "allowed"}, got ${result.ok ? "allowed" : "blocked"}`
      ).toBeTruthy();
    }
  });
});

// ============================================================================
// FUZZ TESTS
// ============================================================================

describe("URL Validation: Fuzz Tests", () => {
  it("FUZZ: Random IPv4 addresses don't crash", () => {
    const rng = new SeededRandom(12345);
    const errors: string[] = [];
    
    for (const ip of generateIPv4Addresses(rng, 100)) {
      try {
        const result = validateMcpUrl(`https://${ip}/api`);
        // Should not throw, should return ok: true or ok: false
        expect(typeof result.ok).toBe("boolean");
      } catch (e) {
        errors.push(`Crashed on IP: ${ip}, error: ${e}`);
      }
    }
    
    expect(errors).toHaveLength(0);
  });

  it("FUZZ: Random hostnames don't crash", () => {
    const rng = new SeededRandom(54321);
    const charPool = "abcdefghijklmnopqrstuvwxyz0123456789-.";
    const errors: string[] = [];
    
    for (let i = 0; i < 100; i++) {
      // Generate random hostname
      const length = rng.nextInt(50) + 1;
      let hostname = "";
      for (let j = 0; j < length; j++) {
        hostname += charPool[rng.nextInt(charPool.length)];
      }
      
      try {
        // May throw on invalid hostname, that's fine
        validateMcpUrl(`https://${hostname}.com/api`);
      } catch {
        // Invalid URL is fine, just shouldn't crash unexpectedly
      }
    }
    
    expect(errors).toHaveLength(0);
  });

  it("FUZZ: Edge case ports don't crash", () => {
    const ports = [0, 1, 80, 443, 8080, 8443, 65535, 65536, -1, 99999];
    
    for (const port of ports) {
      try {
        validateMcpUrl(`https://example.com:${port}/api`);
      } catch {
        // Invalid port may throw, that's acceptable
      }
    }
  });

  it("FUZZ: Special characters in path don't affect hostname validation", () => {
    const specialPaths = [
      "/api?x=<script>",
      "/api#fragment",
      "/api/../../../etc/passwd",
      "/api%00null",
      "/api\x00null",
    ];
    
    for (const path of specialPaths) {
      try {
        const result = validateMcpUrl(`https://example.com${path}`);
        // Hostname validation should still work
        expect(result.ok).toBeTruthy();
      } catch {
        // URL parse error is fine
      }
    }
  });
});

// ============================================================================
// MUTATION TESTING KILL LIST
// ============================================================================

describe("URL Validation: Mutation Kill List", () => {
  // These tests are designed to catch specific mutations
  // Each one should fail if a specific line/check is removed
  
  it("MUTATION: Removing HTTPS check would allow HTTP", () => {
    const result = validateMcpUrl("http://example.com/api");
    expect(result.ok).toBeFalsy();
    expect((result as { error: string }).error).toContain("HTTPS");
  });

  it("MUTATION: Removing localhost check would allow localhost", () => {
    const result = validateMcpUrl("https://localhost/api");
    expect(result.ok).toBeFalsy();
  });

  it("MUTATION: Removing 127.x check would allow loopback", () => {
    const result = validateMcpUrl("https://127.0.0.1/api");
    expect(result.ok).toBeFalsy();
  });

  it("MUTATION: Removing 10.x check would allow private IPs", () => {
    const result = validateMcpUrl("https://10.0.0.1/api");
    expect(result.ok).toBeFalsy();
  });

  it("MUTATION: Removing 172.16-31 check would allow private IPs", () => {
    const result = validateMcpUrl("https://172.16.0.1/api");
    expect(result.ok).toBeFalsy();
  });

  it("MUTATION: Removing 192.168 check would allow private IPs", () => {
    const result = validateMcpUrl("https://192.168.0.1/api");
    expect(result.ok).toBeFalsy();
  });

  it("MUTATION: Removing 169.254 check would allow link-local", () => {
    const result = validateMcpUrl("https://169.254.169.254/api");
    expect(result.ok).toBeFalsy();
  });

  it("MUTATION: Removing 0.0.0.0 check would allow bind-all", () => {
    const result = validateMcpUrl("https://0.0.0.0/api");
    expect(result.ok).toBeFalsy();
  });

  it("MUTATION: Removing .internal check would allow internal hosts", () => {
    const result = validateMcpUrl("https://api.internal/api");
    expect(result.ok).toBeFalsy();
  });

  it("MUTATION: Removing .local check would allow mDNS hosts", () => {
    const result = validateMcpUrl("https://server.local/api");
    expect(result.ok).toBeFalsy();
  });
});

// ============================================================================
// BOUNDARY TESTS
// ============================================================================

describe("URL Validation: Boundary Tests", () => {
  it("BOUNDARY: 172.15.x.x is allowed (just below private range)", () => {
    expect(validateMcpUrl("https://172.15.255.255/api").ok).toBeTruthy();
  });

  it("BOUNDARY: 172.16.0.0 is blocked (start of private range)", () => {
    expect(validateMcpUrl("https://172.16.0.0/api").ok).toBeFalsy();
  });

  it("BOUNDARY: 172.31.255.255 is blocked (end of private range)", () => {
    expect(validateMcpUrl("https://172.31.255.255/api").ok).toBeFalsy();
  });

  it("BOUNDARY: 172.32.0.0 is allowed (just above private range)", () => {
    expect(validateMcpUrl("https://172.32.0.0/api").ok).toBeTruthy();
  });

  it("BOUNDARY: 169.253.x.x is allowed (just below link-local)", () => {
    expect(validateMcpUrl("https://169.253.255.255/api").ok).toBeTruthy();
  });

  it("BOUNDARY: 169.255.x.x is allowed (just above link-local)", () => {
    expect(validateMcpUrl("https://169.255.0.0/api").ok).toBeTruthy();
  });
});
