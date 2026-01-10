# Reasoning Deltas Implementation

This document describes the implementation of streaming reasoning deltas in Shadow Agent, enabling real-time display of AI reasoning from models like DeepSeek R1, Claude with extended thinking, and other reasoning models.

## Overview

Reasoning deltas are streaming chunks of AI reasoning that models emit as they think through problems. The implementation captures these deltas and streams them to the frontend for live display.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Model (e.g., DeepSeek R1, Claude Opus with thinking)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ convex/streaming.ts - streamChatWithTools                       │
│ - Listens for "reasoning-delta" and "reasoning" parts           │
│ - Accumulates reasoning text                                    │
│ - Logs: "[STREAMING] Reasoning delta received: N chars"         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ convex/messages.ts - appendStreamDelta                          │
│ - Accepts parts array with type: "reasoning"                    │
│ - Stores in message.metadata.parts                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend - Message Display                                      │
│ - Reads metadata.parts from database                            │
│ - ReasoningComponent renders parts with type: "reasoning"       │
│ - Automatically opens (forceOpen) while streaming               │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Backend Changes (convex/streaming.ts)

#### 1. Accumulation Variable
```typescript
let accumulatedReasoning = ""; // Track accumulated reasoning text
```

#### 2. Stream Part Handling

The streaming loop now detects and processes reasoning parts:

```typescript
if (partType === "reasoning-delta") {
  // Handle streaming reasoning deltas
  const reasoningDelta = (part as any).delta ?? (part as any).text ?? "";
  if (reasoningDelta) {
    accumulatedReasoning += reasoningDelta;
    console.log(`[STREAMING] Reasoning delta received: ${reasoningDelta.length} chars`);

    await ctx.runMutation(api.messages.appendStreamDelta, {
      messageId,
      deltaText: reasoningDelta,
      isFinal: false,
      parts: [
        {
          type: "reasoning",
          text: reasoningDelta,
        },
      ],
    });
  }
} else if (partType === "reasoning") {
  // Handle complete reasoning blocks (fallback)
  const reasoningText = (part as any).reasoning ?? (part as any).text ?? "";
  if (reasoningText && !accumulatedReasoning.includes(reasoningText)) {
    accumulatedReasoning += reasoningText;
    console.log(`[STREAMING] Reasoning block received: ${reasoningText.length} chars`);

    await ctx.runMutation(api.messages.appendStreamDelta, {
      messageId,
      deltaText: reasoningText,
      isFinal: false,
      parts: [
        {
          type: "reasoning",
          text: reasoningText,
        },
      ],
    });
  }
}
```

#### 3. Part Types Handled
- **`reasoning-delta`**: Streaming chunks of reasoning text
- **`reasoning`**: Complete reasoning blocks (for models that emit full text at once)

### Message Structure

Reasoning parts are stored in `message.metadata.parts` as objects with:
```typescript
{
  type: "reasoning",
  text: "<reasoning content>"
}
```

### Frontend Changes

The frontend already has full support for reasoning display:

#### 1. Type Definition (packages/types/src/chat/messages.ts)
```typescript
export interface ReasoningPart {
  type: "reasoning";
  text: string;
  signature?: string;
}
```

#### 2. Component Rendering (apps/frontend/components/chat/messages/assistant-message.tsx)
```typescript
if (group.type === "reasoning") {
  return (
    <ReasoningComponent
      key={group.key}
      part={group.part}
      isLoading={isLoading}
      forceOpen={isLoading}  // Auto-open while streaming
    />
  );
}
```

#### 3. Reasoning Component (apps/frontend/components/chat/messages/reasoning.tsx)
```typescript
export function ReasoningComponent({
  part,
  isLoading = false,
  forceOpen = false,
}: {
  part: ReasoningPart;
  isLoading?: boolean;
  forceOpen?: boolean;
}) {
  return (
    <ToolComponent
      icon={<ChevronDown />}
      collapsible
      forceOpen={forceOpen}      // Opens automatically during streaming
      isLoading={isLoading}      // Shows loading state
      type={ToolTypes.REASONING}
    >
      <FadedMarkdown content={trimmedPart} id={JSON.stringify(part)} />
    </ToolComponent>
  );
}
```

## Supported Models

### Models with Reasoning Support

| Model | Provider | Reasoning Format | Status |
|-------|----------|------------------|--------|
| DeepSeek R1 | OpenRouter | `reasoning-delta` | ✅ Supported |
| Deepseek V3 | OpenRouter | `reasoning-delta` | ✅ Supported |
| Claude 3.5 Opus with extended thinking | OpenRouter | `reasoning-delta` | ✅ Supported |
| Grok 3 | OpenRouter | `reasoning-delta` | ✅ Supported (if available) |
| Kimi K2-Thinking | NVIDIA NIM | `reasoning-delta` | ✅ Supported |
| DeepSeek V3.2 | NVIDIA NIM | `reasoning-delta` | ✅ Supported |

### Configuration

To use reasoning models, set the model parameter when calling `streamChatWithTools`:

```typescript
await startStreamWithTools({
  taskId: convexTaskId,
  prompt: message,
  model: "deepseek/deepseek-r1", // or other reasoning model
  llmModel: model,
  apiKeys,
  clientMessageId,
});
```

## Usage Example

### Via Frontend UI
1. Select a reasoning model from the model dropdown
2. Send a message
3. Watch the "Reasoning" component automatically appear and expand
4. Reasoning content streams in real-time
5. Final response appears after reasoning completes

### Via Convex CLI
```bash
npx convex run streaming.js:streamChatWithTools '{
  "taskId":"<taskId>",
  "prompt":"What is 2+2? Show your reasoning.",
  "model":"deepseek/deepseek-r1",
  "apiKeys":{"openrouter":"<OPENROUTER_API_KEY>"},
  "clientMessageId":"test-001"
}'
```

## Debugging

### Enable Reasoning Logging

Reasoning delta events are logged with:
```
[STREAMING] Reasoning delta received: N chars
[STREAMING] Reasoning block received: N chars
```

Look for these logs in Convex when troubleshooting reasoning streaming.

### Verify Message Parts

To check if reasoning parts are being captured:

```bash
# List messages for task
npx convex run messages.js:byTask '{"taskId":"<taskId>"}'

# Check the metadata.parts array for type: "reasoning" entries
```

### Test Script

Use the provided test script:
```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
export MODEL="deepseek/deepseek-r1"
node test-reasoning-streaming.mjs
```

## Known Issues & Limitations

### 1. No Reasoning for Regular Models
Regular models (GPT-4, Claude Opus without extended thinking, etc.) don't emit reasoning deltas. The system handles this gracefully by only rendering reasoning components when parts exist.

### 2. Provider-Specific Formats
Different reasoning models may emit reasoning in slightly different formats:
- Some use `reasoning-delta` + `delta` field
- Some use `reasoning` field  
- Some emit complete blocks at once

The implementation handles multiple variants for robustness.

### 3. Reasoning Not Visible During Tool Calls
When the model is executing tools, reasoning may pause. This is normal behavior - reasoning resumes when the model processes tool results.

## Best Practices

### 1. Use Extended Thinking Models for Complex Tasks
Reasoning models work best for:
- Complex problem-solving
- Multi-step reasoning
- Verification and validation
- Mathematical calculations

### 2. Monitor Token Usage
Reasoning models consume more tokens. Track usage in message metadata:
```typescript
message.metadata?.usage?.promptTokens  // Includes reasoning tokens
message.metadata?.usage?.completionTokens
```

### 3. Handle Long Reasoning Gracefully
Very long reasoning content can be collapsed by the component. The `ReasoningComponent` handles this automatically with scrollable content areas.

## Testing Checklist

- [ ] Reasoning component appears while model is reasoning
- [ ] Reasoning content streams in real-time
- [ ] Component automatically opens (forceOpen) during streaming
- [ ] Component automatically closes when streaming finishes
- [ ] Reasoning parts are stored in message.metadata.parts
- [ ] Final response appears after reasoning completes
- [ ] Tool calls work correctly during reasoning
- [ ] No console errors during reasoning streaming

## Future Enhancements

1. **Reasoning Analytics**: Track reasoning token usage and duration
2. **Reasoning Customization**: Allow users to control reasoning verbosity
3. **Reasoning Export**: Export reasoning and responses separately
4. **Reasoning Comparison**: Compare reasoning across different models
5. **Reasoning Redaction**: Support for redacted reasoning (Anthropic feature)

## References

- [AI SDK v5+ Stream Parts](https://github.com/vercel/ai)
- [DeepSeek R1 Documentation](https://api-docs.deepseek.com)
- [OpenRouter Extended Models](https://openrouter.ai/docs)
