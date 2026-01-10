# E2E Streaming Tests Documentation

## Overview

Comprehensive end-to-end streaming tests have been created to verify reasoning deltas and full streaming functionality in the Shadow Agent platform. These tests cover real-time streaming with reasoning models, tool execution, message parts validation, and error handling.

## Test Files Created

### 1. `tests/e2e_streaming.ts`
**Full TypeScript E2E Test Suite**
- Comprehensive test suite with 7 test categories
- Tests reasoning deltas, tool execution, message parts, performance, and error handling
- Uses ConvexHttpClient with proper TypeScript typing
- Includes detailed reporting and performance metrics

### 2. `test-streaming-simple.js`
**Simple Node.js Test Runner**
- Lightweight test runner that doesn't require complex setup
- Uses direct HTTP requests to Convex API
- Can be run with just `node test-streaming-simple.js`
- Focuses on core streaming functionality

## Test Coverage

### Test Suite 1: Setup & Authentication
- ✅ Create test user
- ✅ Create test task with reasoning model configuration
- ✅ Verify task initialization

### Test Suite 2: Basic Streaming Without Reasoning
- ✅ Basic message streaming
- ✅ Stream delta accumulation
- ✅ Message finalization
- ✅ Content verification

### Test Suite 3: Reasoning Delta Streaming
- ✅ DeepSeek R1 reasoning model streaming
- ✅ DeepSeek V3 reasoning model streaming
- ✅ Claude 3.5 Sonnet (comparison)
- ✅ Reasoning parts capture and validation
- ✅ Streaming duration measurement

### Test Suite 4: Tool Execution During Streaming
- ✅ Tool calls during streaming
- ✅ AgentTools table verification
- ✅ Tool name and status tracking
- ✅ File system operations

### Test Suite 5: Message Parts Validation
- ✅ Manual reasoning part creation
- ✅ Text part creation
- ✅ Redacted reasoning parts
- ✅ Part type validation
- ✅ Mixed part types in single message

### Test Suite 6: Streaming Performance & Limits
- ✅ Rapid successive deltas (50 rapid updates)
- ✅ Large content streaming (10KB text)
- ✅ Performance metrics collection
- ✅ Average delta time calculation

### Test Suite 7: Error Handling & Edge Cases
- ✅ Non-existent message ID handling
- ✅ Empty delta handling
- ✅ Invalid part type handling
- ✅ Graceful error recovery

## Key Test Scenarios

### Reasoning Delta Tests
```typescript
// Tests reasoning models that emit streaming deltas
const reasoningModels = [
  "deepseek/deepseek-r1",
  "deepseek/deepseek-v3", 
  "anthropic/claude-3.5-sonnet",
];

const reasoningPrompts = [
  "What is 15 * 23? Show your step-by-step reasoning.",
  "Explain how photosynthesis works, breaking it down into detailed steps.",
  "Write a recursive function to calculate factorial. Think through the algorithm first.",
];
```

### Tool Execution Tests
```typescript
// Tests tool calls during streaming
const toolPrompts = [
  "Create a simple TypeScript file with a function that validates email addresses.",
  "List the files in the current directory and analyze the project structure.",
];
```

### Message Parts Tests
```typescript
// Tests different part types
parts: [{
  type: "reasoning",
  text: "First, I need to understand the problem..."
}, {
  type: "text", 
  text: "Based on my reasoning..."
}, {
  type: "redacted-reasoning" // Anthropic redacted reasoning
}]
```

## Running the Tests

### Option 1: Full TypeScript Suite
```bash
# Set environment variables
export CONVEX_URL="https://veracious-alligator-638.convex.cloud"
export OPENROUTER_API_KEY="your-openrouter-key"

# Run the full test suite
npx tsx tests/e2e_streaming.ts
```

### Option 2: Simple Test Runner
```bash
# Set environment variables
export CONVEX_URL="https://veracious-alligator-638.convex.cloud"
export OPENROUTER_API_KEY="your-openrouter-key"

# Run simple tests
node test-streaming-simple.js
```

### Option 3: Individual Test via Convex CLI
```bash
# Test reasoning streaming
npx convex run streaming.js:streamChatWithTools '{
  "taskId":"<taskId>",
  "prompt":"What is 2+2? Show your reasoning.",
  "model":"deepseek/deepseek-r1",
  "apiKeys":{"openrouter":"<OPENROUTER_API_KEY>"},
  "clientMessageId":"test-001"
}'

# Verify message parts
npx convex run messages.js:byTask '{"taskId":"<taskId>"}'
```

## Expected Test Results

### Reasoning Delta Verification
- ✅ Reasoning parts appear in `message.metadata.parts`
- ✅ Parts have type: "reasoning"
- ✅ Reasoning text accumulates correctly
- ✅ Component auto-opens during streaming (`forceOpen`)

### Tool Execution Verification
- ✅ Tool calls recorded in `agentTools` table
- ✅ Tool names and statuses tracked
- ✅ Tool results processed correctly

### Message Structure Verification
```typescript
// Expected message structure
{
  _id: "messageId",
  content: "accumulated text content",
  metadataJson: JSON.stringify({
    isStreaming: false,
    parts: [
      { type: "reasoning", text: "reasoning content..." },
      { type: "text", text: "final response..." }
    ],
    usage: { promptTokens: 100, completionTokens: 200 },
    finishReason: "stop"
  })
}
```

## Performance Benchmarks

### Expected Performance Metrics
- **Basic Streaming**: < 100ms per delta
- **Reasoning Streaming**: 3-10 seconds total (model-dependent)
- **Tool Execution**: 5-15 seconds (including tool calls)
- **Large Content**: < 500ms for 10KB
- **Rapid Deltas**: < 20ms average per delta

### Success Criteria
- ✅ All reasoning deltas captured
- ✅ Tool calls executed successfully
- ✅ Message parts stored correctly
- ✅ No console errors during streaming
- ✅ Frontend components update in real-time

## Debugging & Troubleshooting

### Common Issues
1. **Missing Reasoning Parts**
   - Check model supports reasoning deltas
   - Verify `accumulatedReasoning` variable in streaming.ts
   - Look for `[STREAMING] Reasoning delta received` logs

2. **Tool Calls Not Working**
   - Verify API keys are properly configured
   - Check agentTools table for entries
   - Ensure tools are enabled in the model configuration

3. **Streaming Not Updating**
   - Check Convex WebSocket connection
   - Verify `NEXT_PUBLIC_USE_CONVEX_REALTIME=true`
   - Look for frontend component re-renders

### Debug Commands
```bash
# Check Convex logs for reasoning events
npx convex logs --follow

# Verify message structure
npx convex run messages.js:get '{"messageId":"<id>"}'

# Check agent tools
npx convex run agentTools.js:byTask '{"taskId":"<taskId>"}'
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Streaming Tests
  env:
    CONVEX_URL: ${{ secrets.CONVEX_URL }}
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: |
    npx tsx tests/e2e_streaming.ts
```

### Vercel Environment Variables
- `CONVEX_URL`: Production Convex URL
- `OPENROUTER_API_KEY`: OpenRouter API key for testing

## Test Maintenance

### Regular Updates Needed
1. **Model Updates**: Add new reasoning models as they become available
2. **API Changes**: Update test calls when Convex API changes
3. **Performance Thresholds**: Adjust expected performance metrics
4. **Test Data**: Update prompts and expected results

### Adding New Tests
1. Create new test function in appropriate suite
2. Add to main test runner
3. Update documentation
4. Verify with manual run

## Conclusion

These comprehensive E2E streaming tests provide thorough coverage of:
- ✅ Reasoning delta streaming from multiple models
- ✅ Tool execution during streaming
- ✅ Message parts validation and storage
- ✅ Performance benchmarking
- ✅ Error handling and edge cases
- ✅ Real-time frontend updates

The tests ensure that the reasoning delta implementation works correctly across different scenarios and provides confidence in the streaming functionality for production use.
