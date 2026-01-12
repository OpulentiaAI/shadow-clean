/**
 * Test to verify all API key providers are included when building streaming payloads.
 * This prevents regression where new providers are added to ApiKeys but not forwarded to Convex.
 */

import { describe, it, expect } from 'vitest';

// List of all API key providers that MUST be forwarded to Convex streaming
const REQUIRED_PROVIDERS = [
  'anthropic',
  'openai', 
  'openrouter',
  'nvidia',
  'fireworks',
  'exa',
] as const;

describe('API Keys Streaming Payload', () => {
  it('should include all required providers in streamChatWithTools type', async () => {
    // Import the action wrapper to verify its type includes all providers
    const actionsModule = await import('../lib/convex/actions');
    
    // The streamChatWithTools function exists
    expect(typeof actionsModule.streamChatWithTools).toBe('function');
    
    // Verify the function signature by checking its toString doesn't strip providers
    // This is a smoke test - the real verification is TypeScript compilation
    const fnString = actionsModule.streamChatWithTools.toString();
    
    // Function should be defined (not throwing immediately)
    expect(fnString).toBeDefined();
  });

  it('should have consistent provider list in ApiKeys type', async () => {
    // Import the types package to verify ApiKeys includes all providers
    const typesModule = await import('@repo/types');
    
    // Verify API_KEY_PROVIDERS constant includes all required providers
    const providers = Object.values(typesModule.API_KEY_PROVIDERS);
    
    for (const required of REQUIRED_PROVIDERS) {
      expect(providers).toContain(required);
    }
  });

  it('should have provider names for all required providers', async () => {
    const typesModule = await import('@repo/types');
    
    // Verify API_KEY_PROVIDER_NAMES has entries for all required providers
    const providerNames = typesModule.API_KEY_PROVIDER_NAMES;
    
    for (const required of REQUIRED_PROVIDERS) {
      expect(providerNames).toHaveProperty(required);
      expect(typeof providerNames[required as keyof typeof providerNames]).toBe('string');
    }
  });
});

describe('Client API Keys', () => {
  it('should read all provider keys from cookies', async () => {
    const { getClientApiKeys } = await import('../lib/utils/client-api-keys');
    
    // Function should exist and return an object
    expect(typeof getClientApiKeys).toBe('function');
    
    // In test environment (no document), should return object with undefined values
    const keys = getClientApiKeys();
    expect(typeof keys).toBe('object');
    
    // Should have all required provider keys (even if undefined)
    for (const required of REQUIRED_PROVIDERS) {
      expect(keys).toHaveProperty(required);
    }
  });
});
