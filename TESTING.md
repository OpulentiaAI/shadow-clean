# Shadow Testing Guide

This document provides comprehensive guidance on testing in the Shadow monorepo. We use **Vitest** exclusively for all testing, following specific principles adapted from the test-writer methodology.

## Table of Contents

- [Philosophy](#philosophy)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Philosophy

Our testing approach emphasizes:

1. **Behavior over Implementation** - Test what the code does, not how it does it
2. **Simplicity** - Simple tests are more maintainable and reliable
3. **Access Private Fields** - Use bracket notation to verify internal state freely
4. **Combined Unit & Integration** - Both test types live in the same file
5. **Real Dependencies in Integration Tests** - No mocks in integration tests

### Core Testing Approach

**Test that methods are called when expected and state changes correctly:**
- Verify methods are called at the right time
- Check that instance/class variables are set properly
- For complex cases, verify methods are called with expected parameters

**Don't test mock behavior** - test how your code reacts to mocks.

## Setup

The monorepo is configured with Vitest across all apps and packages:

```
shadow-monorepo/
├── vitest.config.ts          # Root config
├── vitest.setup.ts           # Global setup
├── apps/
│   ├── server/
│   │   ├── vitest.config.ts  # Server-specific config
│   │   └── vitest.setup.ts   # Server setup (mocks Prisma)
│   ├── frontend/
│   │   ├── vitest.config.ts  # Frontend config (jsdom)
│   │   └── vitest.setup.ts   # Frontend setup (mocks Next.js)
│   └── sidecar/
│       ├── vitest.config.ts
│       └── vitest.setup.ts
└── packages/
    └── command-security/
        └── vitest.config.ts
```

### Dependencies

All Vitest dependencies are installed at the workspace root:

- `vitest` - Test runner
- `@vitest/ui` - Interactive UI
- `@vitest/coverage-v8` - Coverage reporting
- `@testing-library/react` - React component testing (frontend only)
- `@testing-library/jest-dom` - DOM matchers (frontend only)
- `jsdom` - DOM environment (frontend only)

## Running Tests

### All Tests

```bash
# Run all tests in watch mode
npm run test

# Run all tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Open interactive UI
npm run test:ui
```

### Specific App/Package

```bash
# Server tests
npm run test --filter=server

# Frontend tests
npm run test --filter=frontend

# Command security tests
npm run test --filter=@repo/command-security
```

### Single Test File

```bash
# Run specific test file
npm run test -- apps/server/src/services/git-manager.test.ts

# Watch specific file
npm run test:watch -- apps/server/src/services/git-manager.test.ts
```

### Integration Tests

Integration tests require real API keys:

```bash
# With Anthropic API key
ANTHROPIC_API_KEY=sk-ant-xxx npm run test

# With OpenAI API key
OPENAI_API_KEY=sk-xxx npm run test

# Run only integration tests
npm run test -- -t "integration-test"
```

## Writing Tests

### File Structure

Every test file follows this structure:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ComponentName-unit-test', () => {
  // Setup
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 2-3 unit tests
  it('tests that component initializes correctly', () => {
    // Test initialization
  });

  it('tests that method updates state', () => {
    // Test behavior
  });
});

describe('ComponentName-integration-test', () => {
  // 1 integration test
  it.skipIf(!process.env.API_KEY)(
    'should work with real dependencies',
    async () => {
      // Test with real services
    },
    { timeout: 10000 }
  );
});
```

### Key Principles

1. **Always use Vitest** - Import from 'vitest', never Jest
2. **Separate describe blocks** - Use `-unit-test` and `-integration-test` suffixes
3. **Access private fields** - Use bracket notation: `component['_privateField']`
4. **Test behavior** - Verify method calls and state changes
5. **Simple over complex** - If a test is complex, delete it and write a simpler one

### Testing Patterns

#### Testing Services with Database

```typescript
import { describe, it, expect, vi } from 'vitest';
import { prisma } from '@repo/db';

describe('ServiceName-unit-test', () => {
  it('tests that service creates record', async () => {
    vi.mocked(prisma.task.create).mockResolvedValue({ id: 'test' } as any);

    const service = new ServiceName();
    await service.createTask('test-id');

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 'test-id' }),
      })
    );
  });
});
```

#### Testing LLM/AI Components

```typescript
describe('LLMService-unit-test', () => {
  it('tests that streaming updates state', async () => {
    const mockModel = {
      doStream: vi.fn().mockResolvedValue({
        stream: (async function* () {
          yield { type: 'text-delta', textDelta: 'test' };
        })(),
      }),
    };

    const service = new LLMService();
    service['_model'] = mockModel;

    await service.streamChat('test');

    expect(service['_lastResponse']).toContain('test');
  });
});
```

#### Testing WebSocket Components

```typescript
import type { TypedSocket } from '../socket';

describe('SocketHandler-unit-test', () => {
  it('tests that handler emits events', async () => {
    const mockSocket = {
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
    } as unknown as TypedSocket;

    const handler = new SocketHandler(mockSocket);
    await handler.handleEvent('data');

    expect(mockSocket.emit).toHaveBeenCalledWith('event', expect.any(Object));
  });
});
```

#### Testing React Components

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Component-unit-test', () => {
  it('tests that component renders correctly', () => {
    render(<Component prop="value" />);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Test Structure

### Naming Conventions

- **Test files**: `ComponentName.test.ts` or `ComponentName.test.tsx`
- **Unit describe block**: `ComponentName-unit-test`
- **Integration describe block**: `ComponentName-integration-test`
- **Test names**: Start with "tests that..." to describe behavior

### Test Organization

```
src/
  services/
    git-manager.ts
    git-manager.test.ts      # Tests next to implementation
  agent/
    chat.ts
    chat.test.ts
  components/
    ChatInterface.tsx
    ChatInterface.test.tsx
```

## Examples

### Example 1: GitManager (apps/server/src/services/git-manager.test.ts)

Demonstrates:
- Mocking Node.js APIs (child_process)
- Testing async operations
- Verifying command execution
- Testing error handling

### Example 2: ChatService (apps/server/src/agent/chat.test.ts)

Demonstrates:
- Testing complex services
- Mocking multiple dependencies
- Testing internal state management
- Integration test structure

### Example 3: CommandSecurity (packages/command-security/src/command-security.test.ts)

Demonstrates:
- Package-level testing
- Testing validation logic
- Testing with different input scenarios
- Integration testing with real command sequences

## Best Practices

### DO ✅

```typescript
// Test behavior, not implementation
it('tests that process updates state', () => {
  service.process('input');
  expect(service['_state']).toBe('processed');
});

// Access private fields freely
expect(component['_privateField']).toBe(expectedValue);

// Test how code reacts to mocks
mock.mockResolvedValue('data');
await service.fetch();
expect(service['_data']).toBe('data');

// Use clear, descriptive test names
it('tests that error handling sets error state', () => {});
```

### DON'T ❌

```typescript
// Don't test mock behavior
it('mock returns value', () => {
  const mock = vi.fn().mockReturnValue('test');
  expect(mock()).toBe('test'); // Testing the mock, not your code!
});

// Don't test implementation details
it('uses correct internal method', () => {
  const spy = vi.spyOn(service as any, '_internal');
  service.public();
  expect(spy).toHaveBeenCalled(); // Too coupled to implementation
});

// Don't write complex tests
it('tests everything at once', async () => {
  // 50 lines of setup and assertions
  // If it's complex, break it into simpler tests
});
```

## Troubleshooting

### Common Issues

#### 1. Module Resolution Errors

```bash
# Ensure aliases are configured in vitest.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

#### 2. Prisma Mock Not Working

Check `apps/server/vitest.setup.ts` has the Prisma mock configured.

#### 3. Tests Pass Individually But Fail Together

Clear mocks in `beforeEach`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

#### 4. Integration Test Skipped

Ensure environment variables are set:

```bash
ANTHROPIC_API_KEY=sk-xxx npm run test
```

#### 5. TypeScript Errors in Tests

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### Getting Help

1. Check the test-writer guide: `.claude/agents/test-writer.md`
2. Review example tests in the codebase
3. Run with `--reporter=verbose` for detailed output
4. Use `test:ui` for interactive debugging

## CI/CD Integration

Tests run automatically in CI:

```bash
# GitHub Actions / CI pipeline
npm run test:run
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- Test Writer Guide: `.claude/agents/test-writer.md`
- Example Tests:
  - `apps/server/src/services/git-manager.test.ts`
  - `apps/server/src/agent/chat.test.ts`
  - `packages/command-security/src/command-security.test.ts`

---

**Remember**: Simple tests that verify behavior are better than complex tests that verify implementation. When in doubt, keep it simple!
