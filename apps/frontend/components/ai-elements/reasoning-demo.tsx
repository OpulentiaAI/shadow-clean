"use client";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { useCallback, useEffect, useState } from "react";

const reasoningSteps = [
  "Let me think about this problem step by step.",
  "\n\nFirst, I need to understand what the user is asking for.",
  "\n\nThey want a reasoning component that opens automatically when streaming begins and closes when streaming finishes. The component should be composable and follow existing patterns in the codebase.",
  "\n\nThis seems like a collapsible component with state management would be the right approach.",
].join("");

const ReasoningDemo = () => {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);
  const [tokens, setTokens] = useState<string[]>([]);

  // Function to chunk text into fake tokens of 3-4 characters
  const chunkIntoTokens = useCallback((text: string): string[] => {
    const tokens: string[] = [];
    let i = 0;
    while (i < text.length) {
      const chunkSize = Math.floor(Math.random() * 2) + 3; // Random size between 3-4
      tokens.push(text.slice(i, i + chunkSize));
      i += chunkSize;
    }
    return tokens;
  }, []);

  useEffect(() => {
    const tokenizedSteps = chunkIntoTokens(reasoningSteps);
    setTokens(tokenizedSteps);
    setContent("");
    setCurrentTokenIndex(0);
    setIsStreaming(true);
  }, [chunkIntoTokens]);

  useEffect(() => {
    if (!isStreaming || currentTokenIndex >= tokens.length) {
      if (isStreaming) {
        setIsStreaming(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      setContent((prev) => prev + tokens[currentTokenIndex]);
      setCurrentTokenIndex((prev) => prev + 1);
    }, 25); // Faster interval since we're streaming smaller chunks

    return () => clearTimeout(timer);
  }, [isStreaming, currentTokenIndex, tokens]);

  const getThinkingMessage = (isStreaming: boolean, duration?: number) => {
    if (!isStreaming) return "";
    const seconds = Math.floor((duration || 0) / 1000);
    return `Thinking... (${seconds}s)`;
  };

  return (
    <div className="w-full p-4 h-[300px]">
      <Reasoning className="w-full" isStreaming={isStreaming}>
        <ReasoningTrigger 
          title="AI Reasoning"
          getThinkingMessage={getThinkingMessage}
        />
        <ReasoningContent>{content}</ReasoningContent>
      </Reasoning>
    </div>
  );
};

export default ReasoningDemo;
