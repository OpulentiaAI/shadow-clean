"use client";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import { useState } from "react";

// Placeholder types for the chat demo
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: ChatMessagePart[];
}

interface ChatMessagePart {
  type: "text" | "reasoning";
  text: string;
}

// Placeholder hook for chat functionality
const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming">("idle");

  const sendMessage = async ({ text }: { text: string }) => {
    setStatus("submitted");
    
    // Simulate streaming
    setTimeout(() => {
      setStatus("streaming");
      
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        parts: [{ type: "text", text }],
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Simulate assistant response with reasoning
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          parts: [
            {
              type: "reasoning",
              text: "Let me think through this step by step.\n\nFirst, I need to understand what the user is asking.\n\nThen I'll formulate a response based on that understanding."
            },
            {
              type: "text",
              text: "I understand your request. Here's my response based on my reasoning above."
            }
          ],
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setStatus("idle");
      }, 2000);
    }, 500);
  };

  return { messages, sendMessage, status };
};

// Placeholder components - these would need to be created
const Conversation = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col h-full">{children}</div>
);

const ConversationContent = ({ children }: { children: React.ReactNode }) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-4">{children}</div>
);

const ConversationScrollButton = () => (
  <button className="p-2 bg-accent rounded-md">Scroll to bottom</button>
);

const ReasoningChatDemo = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.map((message: ChatMessage) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part: ChatMessagePart, i: number) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <MessageResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      case "reasoning":
                        return (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={
                              status === "streaming" &&
                              i === message.parts.length - 1 &&
                              message.id === messages.at(-1)?.id
                            }
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4 w-full max-w-2xl mx-auto relative"
        >
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === "streaming" ? "streaming" : "ready"}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
};

export default ReasoningChatDemo;
