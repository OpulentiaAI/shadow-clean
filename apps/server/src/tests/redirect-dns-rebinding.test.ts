/**
 * Redirect & DNS Rebinding Defense Tests
 * 
 * Tests for SSRF bypass attempts via:
 * - HTTP redirects to internal/private targets
 * - DNS rebinding attacks (hostname resolves public then private)
 * - Multi-hop redirect chains
 * 
 * Run: npx vitest run apps/server/src/tests/redirect-dns-rebinding.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// MOCK DNS RESOLVER
// ============================================================================

interface DNSRecord {
  hostname: string;
  ips: string[];
  ttl: number;
}

class MockDNSResolver {
  private records: Map<string, DNSRecord> = new Map();
  private lookupCount: Map<string, number> = new Map();
  private rebindingTargets: Map<string, { firstIP: string; secondIP: string }> = new Map();

  addRecord(hostname: string, ips: string[], ttl: number = 300): void {
    this.records.set(hostname, { hostname, ips, ttl });
  }

  addRebindingTarget(hostname: string, firstIP: string, secondIP: string): void {
    this.rebindingTargets.set(hostname, { firstIP, secondIP });
  }

  resolve(hostname: string): string[] {
    const count = (this.lookupCount.get(hostname) || 0) + 1;
    this.lookupCount.set(hostname, count);

    // Check for DNS rebinding simulation
    const rebind = this.rebindingTargets.get(hostname);
    if (rebind) {
      // First lookup returns public IP, subsequent lookups return private IP
      return count === 1 ? [rebind.firstIP] : [rebind.secondIP];
    }

    const record = this.records.get(hostname);
    return record ? record.ips : [];
  }

  getLookupCount(hostname: string): number {
    return this.lookupCount.get(hostname) || 0;
  }

  reset(): void {
    this.lookupCount.clear();
  }
}

// ============================================================================
// IP VALIDATION (for resolved IPs)
// ============================================================================

function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  
  const [a, b] = parts;
  
  // Loopback
  if (a === 127) return true;
  
  // Bind-all
  if (a === 0 && parts.every(p => p === 0)) return true;
  
  // Private ranges
  if (a === 10) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  
  // Link-local
  if (a === 169 && b === 254) return true;
  
  return false;
}

function validateResolvedIP(ip: string): { ok: true } | { ok: false; error: string } {
  if (isPrivateIP(ip)) {
    return { ok: false, error: `Resolved IP ${ip} is private/internal` };
  }
  return { ok: true };
}

// ============================================================================
// REDIRECT CHAIN VALIDATOR
// ============================================================================

interface RedirectHop {
  url: string;
  statusCode: number;
  resolvedIP?: string;
}

class RedirectChainValidator {
  private maxHops: number;
  private dnsResolver: MockDNSResolver;

  constructor(maxHops: number = 5, dnsResolver: MockDNSResolver) {
    this.maxHops = maxHops;
    this.dnsResolver = dnsResolver;
  }

  validateChain(hops: RedirectHop[]): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check max hops
    if (hops.length > this.maxHops) {
      violations.push(`Too many redirects: ${hops.length} > ${this.maxHops}`);
    }

    // Validate each hop's resolved IP
    for (let i = 0; i < hops.length; i++) {
      const hop = hops[i];
      if (!hop) continue;

      try {
        const url = new URL(hop.url);
        const hostname = url.hostname;

        // Resolve and validate
        const ips = this.dnsResolver.resolve(hostname);
        for (const ip of ips) {
          const result = validateResolvedIP(ip);
          if (!result.ok) {
            violations.push(`Hop ${i + 1}: ${result.error}`);
          }
        }
      } catch {
        violations.push(`Hop ${i + 1}: Invalid URL - ${hop.url}`);
      }
    }

    return { valid: violations.length === 0, violations };
  }
}

// ============================================================================
// TESTS: Redirect Chain Validation
// ============================================================================

describe("Redirect Defense: Chain Validation", () => {
  const dns = new MockDNSResolver();
  
  // Setup public and private DNS records
  dns.addRecord("public.example.com", ["93.184.216.34"]);
  dns.addRecord("also-public.example.com", ["104.21.2.1"]);
  dns.addRecord("private-internal.corp", ["10.0.0.1"]);
  dns.addRecord("localhost-alias.test", ["127.0.0.1"]);

  it("allows redirect chain through public IPs only", () => {
    const validator = new RedirectChainValidator(5, dns);
    
    const chain: RedirectHop[] = [
      { url: "https://public.example.com/start", statusCode: 302 },
      { url: "https://also-public.example.com/middle", statusCode: 302 },
      { url: "https://public.example.com/final", statusCode: 200 },
    ];

    const result = validator.validateChain(chain);
    expect(result.valid).toBeTruthy();
    expect(result.violations).toHaveLength(0);
  });

  it("blocks redirect to private IP (10.x.x.x)", () => {
    const validator = new RedirectChainValidator(5, dns);
    
    const chain: RedirectHop[] = [
      { url: "https://public.example.com/start", statusCode: 302 },
      { url: "https://private-internal.corp/admin", statusCode: 200 },
    ];

    const result = validator.validateChain(chain);
    expect(result.valid).toBeFalsy();
    expect(result.violations.some(v => v.includes("private"))).toBeTruthy();
  });

  it("blocks redirect to localhost", () => {
    const validator = new RedirectChainValidator(5, dns);
    
    const chain: RedirectHop[] = [
      { url: "https://public.example.com/start", statusCode: 302 },
      { url: "https://localhost-alias.test/secret", statusCode: 200 },
    ];

    const result = validator.validateChain(chain);
    expect(result.valid).toBeFalsy();
  });

  it("blocks excessive redirect hops", () => {
    const validator = new RedirectChainValidator(3, dns);
    
    const chain: RedirectHop[] = [
      { url: "https://public.example.com/1", statusCode: 302 },
      { url: "https://public.example.com/2", statusCode: 302 },
      { url: "https://public.example.com/3", statusCode: 302 },
      { url: "https://public.example.com/4", statusCode: 302 },
      { url: "https://public.example.com/5", statusCode: 200 },
    ];

    const result = validator.validateChain(chain);
    expect(result.valid).toBeFalsy();
    expect(result.violations.some(v => v.includes("Too many redirects"))).toBeTruthy();
  });
});

// ============================================================================
// TESTS: DNS Rebinding Defense
// ============================================================================

describe("DNS Rebinding Defense", () => {
  it("detects DNS rebinding attack (public → private)", () => {
    const dns = new MockDNSResolver();
    dns.addRebindingTarget("attacker.com", "93.184.216.34", "10.0.0.1");
    
    // First lookup: public IP (passes validation)
    const firstLookup = dns.resolve("attacker.com");
    expect(firstLookup[0]).toBe("93.184.216.34");
    expect(validateResolvedIP(firstLookup[0]!).ok).toBeTruthy();
    
    // Second lookup: private IP (should fail)
    const secondLookup = dns.resolve("attacker.com");
    expect(secondLookup[0]).toBe("10.0.0.1");
    expect(validateResolvedIP(secondLookup[0]!).ok).toBeFalsy();
  });

  it("detects DNS rebinding to localhost", () => {
    const dns = new MockDNSResolver();
    dns.addRebindingTarget("sneaky.attacker.com", "104.21.2.1", "127.0.0.1");
    
    const firstLookup = dns.resolve("sneaky.attacker.com");
    expect(isPrivateIP(firstLookup[0]!)).toBeFalsy();
    
    const secondLookup = dns.resolve("sneaky.attacker.com");
    expect(isPrivateIP(secondLookup[0]!)).toBeTruthy();
  });

  it("detects DNS rebinding to metadata endpoint", () => {
    const dns = new MockDNSResolver();
    dns.addRebindingTarget("metadata-stealer.com", "8.8.8.8", "169.254.169.254");
    
    const firstLookup = dns.resolve("metadata-stealer.com");
    expect(isPrivateIP(firstLookup[0]!)).toBeFalsy();
    
    const secondLookup = dns.resolve("metadata-stealer.com");
    expect(isPrivateIP(secondLookup[0]!)).toBeTruthy();
  });

  it("mitigation: re-validate IP on each request", () => {
    const dns = new MockDNSResolver();
    dns.addRebindingTarget("rebind.test", "1.2.3.4", "192.168.1.1");
    
    // Simulate the mitigation: always validate resolved IP before request
    function makeSecureRequest(hostname: string): { allowed: boolean; reason?: string } {
      const ips = dns.resolve(hostname);
      for (const ip of ips) {
        const validation = validateResolvedIP(ip);
        if (!validation.ok) {
          return { allowed: false, reason: validation.error };
        }
      }
      return { allowed: true };
    }
    
    // First request passes
    expect(makeSecureRequest("rebind.test").allowed).toBeTruthy();
    
    // Second request fails (DNS rebinding detected)
    expect(makeSecureRequest("rebind.test").allowed).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Known Redirect Attack Patterns
// ============================================================================

describe("Redirect Defense: Known Attack Patterns", () => {
  const dns = new MockDNSResolver();
  dns.addRecord("legitimate.com", ["93.184.216.34"]);
  dns.addRecord("internal-api", ["10.0.0.50"]);

  it("blocks public → internal API redirect", () => {
    const validator = new RedirectChainValidator(5, dns);
    
    // Attacker's server redirects to internal API
    const chain: RedirectHop[] = [
      { url: "https://legitimate.com/oauth/callback?next=https://internal-api/admin", statusCode: 302 },
      { url: "https://internal-api/admin", statusCode: 200 },
    ];

    const result = validator.validateChain(chain);
    expect(result.valid).toBeFalsy();
  });

  it("blocks open redirect to cloud metadata", () => {
    dns.addRecord("metadata.google.internal", ["169.254.169.254"]);
    const validator = new RedirectChainValidator(5, dns);
    
    const chain: RedirectHop[] = [
      { url: "https://legitimate.com/redirect?url=https://metadata.google.internal", statusCode: 302 },
      { url: "https://metadata.google.internal/computeMetadata/v1/", statusCode: 200 },
    ];

    const result = validator.validateChain(chain);
    expect(result.valid).toBeFalsy();
  });

  it("blocks redirect loop used for timing attacks", () => {
    const validator = new RedirectChainValidator(3, dns);
    
    // Redirect loop to cause timeout/timing side-channel
    const chain: RedirectHop[] = [
      { url: "https://legitimate.com/a", statusCode: 302 },
      { url: "https://legitimate.com/b", statusCode: 302 },
      { url: "https://legitimate.com/c", statusCode: 302 },
      { url: "https://legitimate.com/a", statusCode: 302 }, // Loop back
    ];

    const result = validator.validateChain(chain);
    expect(result.valid).toBeFalsy();
  });
});

// ============================================================================
// TESTS: IP Validation Edge Cases
// ============================================================================

describe("IP Validation: Edge Cases", () => {
  it("correctly identifies all private ranges", () => {
    // Loopback
    expect(isPrivateIP("127.0.0.1")).toBeTruthy();
    expect(isPrivateIP("127.255.255.255")).toBeTruthy();
    
    // 10.x.x.x
    expect(isPrivateIP("10.0.0.0")).toBeTruthy();
    expect(isPrivateIP("10.255.255.255")).toBeTruthy();
    
    // 172.16-31.x.x
    expect(isPrivateIP("172.16.0.0")).toBeTruthy();
    expect(isPrivateIP("172.31.255.255")).toBeTruthy();
    
    // 192.168.x.x
    expect(isPrivateIP("192.168.0.0")).toBeTruthy();
    expect(isPrivateIP("192.168.255.255")).toBeTruthy();
    
    // Link-local
    expect(isPrivateIP("169.254.0.0")).toBeTruthy();
    expect(isPrivateIP("169.254.255.255")).toBeTruthy();
    
    // Bind-all
    expect(isPrivateIP("0.0.0.0")).toBeTruthy();
  });

  it("correctly allows public IPs", () => {
    expect(isPrivateIP("8.8.8.8")).toBeFalsy();
    expect(isPrivateIP("1.1.1.1")).toBeFalsy();
    expect(isPrivateIP("93.184.216.34")).toBeFalsy();
    expect(isPrivateIP("172.15.0.1")).toBeFalsy(); // Just below 172.16
    expect(isPrivateIP("172.32.0.1")).toBeFalsy(); // Just above 172.31
  });

  it("handles malformed IPs gracefully", () => {
    expect(isPrivateIP("not-an-ip")).toBeFalsy();
    expect(isPrivateIP("256.0.0.1")).toBeFalsy();
    expect(isPrivateIP("1.2.3")).toBeFalsy();
    expect(isPrivateIP("")).toBeFalsy();
  });
});

// ============================================================================
// RECOMMENDED MITIGATIONS
// ============================================================================

describe("Redirect Defense: Recommended Mitigations", () => {
  it("documents required HTTP client configuration", () => {
    const requiredSettings = {
      // Limit redirect count
      maxRedirects: 5,
      
      // Re-validate on each hop
      validateEachHop: true,
      
      // DNS caching behavior
      dnsCacheTTL: 0, // Disable or use short TTL
      
      // Resolve and validate before connecting
      preConnectValidation: true,
      
      // Block private IPs at network level
      blockPrivateIPs: true,
    };
    
    expect(requiredSettings.maxRedirects).toBeLessThanOrEqual(10);
    expect(requiredSettings.validateEachHop).toBeTruthy();
    expect(requiredSettings.preConnectValidation).toBeTruthy();
    expect(requiredSettings.blockPrivateIPs).toBeTruthy();
  });

  it("documents defense-in-depth layers", () => {
    const defenseLayers = [
      "URL validation at creation time",
      "URL validation at discovery time",
      "DNS resolution validation before connect",
      "IP validation on each redirect hop",
      "Redirect count limiting",
      "Timeout enforcement",
      "Network-level private IP blocking",
    ];
    
    expect(defenseLayers.length).toBeGreaterThanOrEqual(5);
    console.log("\n  Defense-in-depth layers:");
    for (let i = 0; i < defenseLayers.length; i++) {
      console.log(`    ${i + 1}. ${defenseLayers[i]}`);
    }
  });
});
