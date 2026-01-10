# AI Elements Reasoning Components

## Overview

The AI Elements reasoning components provide a comprehensive solution for displaying AI reasoning content in chat applications. These components automatically open during streaming and close when finished, with smooth animations and intuitive user interactions.

## Components

### `<Reasoning />`

A collapsible container that automatically manages its open state based on streaming status.

**Props:**
- `isStreaming?: boolean` - Whether the content is currently streaming (auto-opens when true)
- `...props` - All props from Radix UI Collapsible.Root

**Usage:**
```tsx
<Reasoning className="w-full" isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>
```

### `<ReasoningTrigger />`

The trigger button for toggling the reasoning content visibility.

**Props:**
- `title?: string` - Custom title (defaults to "Reasoning" or "Thinking..." when streaming)
- `getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode` - Custom thinking message
- `...props` - All props from Radix UI Collapsible.Trigger

**Usage:**
```tsx
<ReasoningTrigger 
  title="AI Reasoning"
  getThinkingMessage={(isStreaming, duration) => 
    isStreaming ? `Thinking... (${Math.floor(duration/1000)}s)` : ""
  }
/>
```

### `<ReasoningContent />`

The content container for reasoning text.

**Props:**
- `...props` - All props from Radix UI Collapsible.Content

**Usage:**
```tsx
<ReasoningContent>
  <div className="whitespace-pre-wrap">{reasoningText}</div>
</ReasoningContent>
```

## Features

- ✅ **Auto-open during streaming** - Automatically opens when `isStreaming={true}`
- ✅ **Auto-close when finished** - Closes when streaming stops
- ✅ **Smooth animations** - Powered by Radix UI transitions
- ✅ **Visual streaming indicator** - Shows loading state with spinner
- ✅ **Manual toggle control** - Users can manually expand/collapse
- ✅ **Accessibility** - Full keyboard navigation support
- ✅ **Responsive design** - Works across all screen sizes
- ✅ **Theme support** - Seamless light/dark theme integration
- ✅ **TypeScript support** - Full type safety

## Integration Examples

### Basic Usage

```tsx
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";

function MyComponent() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [reasoningText, setReasoningText] = useState("");

  return (
    <Reasoning className="w-full" isStreaming={isStreaming}>
      <ReasoningTrigger title="AI Reasoning" />
      <ReasoningContent>{reasoningText}</ReasoningContent>
    </Reasoning>
  );
}
```

### Chat Integration

```tsx
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";

function ChatMessage({ message, isLatestMessage, isStreaming }) {
  return (
    <div>
      {message.parts.map((part, i) => {
        if (part.type === "reasoning") {
          const isLastPart = i === message.parts.length - 1;
          const isLoading = isStreaming && isLatestMessage && isLastPart;

          return (
            <Reasoning
              key={`${message.id}-${i}`}
              className="w-full"
              isStreaming={isLoading}
            >
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          );
        }
        return <div key={i}>{part.text}</div>;
      })}
    </div>
  );
}
```

### Streaming Demo

```tsx
import { ReasoningDemo } from "@/components/ai-elements/reasoning";

function App() {
  return (
    <div className="p-4">
      <h2>Reasoning Component Demo</h2>
      <ReasoningDemo />
    </div>
  );
}
```

### Full Chat Demo

```tsx
import { ReasoningChatDemo } from "@/components/ai-elements/reasoning";

function ChatApp() {
  return (
    <div className="h-screen">
      <ReasoningChatDemo />
    </div>
  );
}
```

## Backend Integration

### AI SDK Route Example

```typescript
// app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { model, messages }: { messages: UIMessage[]; model: string } =
    await req.json();
    
  const result = streamText({
    model: 'deepseek/deepseek-r1',
    messages: convertToModelMessages(messages),
  });
  
  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
```

### Convex Integration

The reasoning components work seamlessly with the existing Convex streaming implementation:

```typescript
// In your message rendering logic
{group.type === "reasoning" && (
  <ReasoningComponent
    part={group.part}
    isLoading={isStreamingMessage && isLatestPart}
    forceOpen={isLoading}
  />
)}
```

## Styling

The components use Tailwind CSS classes and can be customized through:

1. **className prop** - Pass custom classes to any component
2. **CSS Variables** - Override theme colors
3. **Tailwind Config** - Extend the design system

### Custom Styling Example

```tsx
<Reasoning className="border-2 border-blue-500 rounded-lg">
  <ReasoningTrigger className="bg-blue-100 hover:bg-blue-200" />
  <ReasoningContent className="bg-blue-50 p-4">
    {reasoningText}
  </ReasoningContent>
</Reasoning>
```

## Migration from Existing Components

The new AI Elements components are designed to work alongside the existing `ReasoningComponent` in the codebase. You can gradually migrate:

### Existing (ToolComponent-based)
```tsx
<ReasoningComponent
  part={part}
  isLoading={isLoading}
  forceOpen={forceOpen}
/>
```

### New (AI Elements)
```tsx
<Reasoning isStreaming={isLoading}>
  <ReasoningTrigger />
  <ReasoningContent>{part.text}</ReasoningContent>
</Reasoning>
```

## Performance Considerations

- **Lazy Rendering**: Content is only rendered when expanded
- **Smooth Animations**: Hardware-accelerated CSS transitions
- **Minimal Re-renders**: Optimized state management
- **Memory Efficient**: Cleanup on unmount

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels
- **Focus Management**: Logical focus flow
- **High Contrast**: Theme-aware colors

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When contributing to the reasoning components:

1. Follow the existing component patterns
2. Ensure TypeScript types are accurate
3. Test with both light and dark themes
4. Verify accessibility with screen readers
5. Test streaming behavior thoroughly

## Troubleshooting

### Common Issues

**Component doesn't auto-open during streaming**
- Verify `isStreaming` prop is correctly passed
- Check that the parent component's state is updating

**Animation appears choppy**
- Ensure CSS transitions are not being overridden
- Check for conflicting transform properties

**Content overflows**
- Use proper CSS classes for text wrapping
- Consider max-height on the content container

### Debug Tips

```tsx
// Add debug logging
<Reasoning 
  isStreaming={isStreaming}
  onChange={(open) => console.log('Reasoning open state:', open)}
>
  <ReasoningTrigger />
  <ReasoningContent>{content}</ReasoningContent>
</Reasoning>
```
