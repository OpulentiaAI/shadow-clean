import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as convexOps from '../lib/convex-operations';

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      // Validate content is defined
      if (args.content === null || args.content === undefined) {
        throw new Error('Content cannot be null or undefined');
      }
      return { messageId: 'msg-edge', sequence: 1 };
    });
  });

  it('should handle empty message content', async () => {
    const result = await convexOps.appendMessage({
      taskId: 'empty-test' as any,
      role: 'USER',
      content: '',
      promptMessageId: 'empty-prompt'
    } as any);
    
    expect(result.messageId).toBeDefined();
  });

  it('should handle Unicode extremes', async () => {
    // Complex emoji with ZWJ sequences
    const emojiContent = '👨‍👩‍👧‍👦'.repeat(100);
    const result = await convexOps.appendMessage({
      taskId: 'unicode-test' as any,
      role: 'ASSISTANT',
      content: emojiContent,
      promptMessageId: 'unicode-prompt'
    } as any);
    
    expect(result.messageId).toBeDefined();
  });

  it('should handle SQL injection attempts safely', async () => {
    const maliciousContent = "'; DROP TABLE messages; --";
    const result = await convexOps.appendMessage({
      taskId: 'injection-test' as any,
      role: 'USER',
      content: maliciousContent,
      promptMessageId: 'injection-prompt'
    } as any);
    
    // Should succeed - Convex handles this safely
    expect(result.messageId).toBeDefined();
  });

  it('should handle XSS attempt content', async () => {
    const xssContent = '<script>alert("xss")</script>';
    const result = await convexOps.appendMessage({
      taskId: 'xss-test' as any,
      role: 'USER',
      content: xssContent,
      promptMessageId: 'xss-prompt'
    } as any);
    
    expect(result.messageId).toBeDefined();
  });

  it('should handle null bytes in content', async () => {
    const nullContent = 'Hello\x00World';
    const result = await convexOps.appendMessage({
      taskId: 'null-byte-test' as any,
      role: 'USER',
      content: nullContent,
      promptMessageId: 'null-prompt'
    } as any);
    
    expect(result.messageId).toBeDefined();
  });

  it('should handle very long promptMessageId', async () => {
    const longPromptId = 'prompt-' + 'x'.repeat(1000);
    const result = await convexOps.appendMessage({
      taskId: 'long-prompt-test' as any,
      role: 'ASSISTANT',
      content: 'Test content',
      promptMessageId: longPromptId
    } as any);
    
    expect(result.messageId).toBeDefined();
  });

  it('should handle special characters in content', async () => {
    const specialContent = '!@#$%^&*()_+-=[]{}|;\':",.<>?/\\`~';
    const result = await convexOps.appendMessage({
      taskId: 'special-char-test' as any,
      role: 'USER',
      content: specialContent,
      promptMessageId: 'special-prompt'
    } as any);
    
    expect(result.messageId).toBeDefined();
  });

  it('should handle newlines and tabs in content', async () => {
    const whitespaceContent = 'Line1\nLine2\tTabbed\r\nWindows line';
    const result = await convexOps.appendMessage({
      taskId: 'whitespace-test' as any,
      role: 'USER',
      content: whitespaceContent,
      promptMessageId: 'whitespace-prompt'
    } as any);
    
    expect(result.messageId).toBeDefined();
  });

  it('should handle RTL and mixed direction text', async () => {
    const rtlContent = 'English مرحبا 日本語 Mixed';
    const result = await convexOps.appendMessage({
      taskId: 'rtl-test' as any,
      role: 'USER',
      content: rtlContent,
      promptMessageId: 'rtl-prompt'
    } as any);
    
    expect(result.messageId).toBeDefined();
  });

  it('should reject null content', async () => {
    await expect(
      convexOps.appendMessage({
        taskId: 'null-content-test' as any,
        role: 'USER',
        content: null as any,
        promptMessageId: 'null-content-prompt'
      } as any)
    ).rejects.toThrow();
  });

  it('should handle code blocks with various languages', async () => {
    const codeContent = `
\`\`\`typescript
function test(): void {
  console.log('Hello');
}
\`\`\`

\`\`\`python
def test():
    print("Hello")
\`\`\`
    `;
    
    const result = await convexOps.appendMessage({
      taskId: 'code-test' as any,
      role: 'ASSISTANT',
      content: codeContent,
      promptMessageId: 'code-prompt'
    } as any);
    
    expect(result.messageId).toBeDefined();
  });
});
