"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { type ModelType } from "@repo/types";
import { Loader2, Code2, Paperclip, ArrowRight } from "lucide-react";
import type { FilteredRepository as Repository } from "@/lib/github/types";
import { GithubConnection } from "./github";
import { LocalRepoConnection } from "./local-repo";
import { ModelSelector } from "./model-selector";

type RichTextEditorProps = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message?: string) => void;  // Optional message param for immediate submit
  selectedModel: ModelType | null;
  onSelectModel: (model: ModelType | null) => void;
  selectedRepo: Repository | null;
  setSelectedRepo: (repo: Repository | null) => void;
  selectedBranch: { name: string; commitSha: string } | null;
  setSelectedBranch: (branch: { name: string; commitSha: string } | null) => void;
  isDisabled?: boolean;
  isPending?: boolean;
  isHome?: boolean;
};

export function RichTextEditor({
  placeholder = "Build features, fix bugs, and understand codebases...",
  value,
  onChange,
  onSubmit,
  selectedModel,
  onSelectModel,
  selectedRepo,
  setSelectedRepo,
  selectedBranch,
  setSelectedBranch,
  isDisabled = false,
  isPending = false,
  isHome = false,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isGithubOpen, setIsGithubOpen] = useState(false);
  const [isLocalRepoOpen, setIsLocalRepoOpen] = useState(false);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInput = useCallback(() => {
    if (contentEditableRef.current) {
      const text = contentEditableRef.current.innerText;
      onChange(text === "\n" ? "" : text);
    }
  }, [onChange]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isPending) return;
      
      // Get the current message directly from contentEditable to avoid race condition
      // where Enter is pressed before input event fires
      let currentMessage = value;
      if (contentEditableRef.current) {
        const text = contentEditableRef.current.innerText;
        currentMessage = text === "\n" ? "" : text;
        // Also sync the state
        if (currentMessage !== value) {
          onChange(currentMessage);
        }
      }
      
      // Pass the current message directly to avoid stale state issues
      onSubmit(currentMessage);
    },
    [isPending, onSubmit, onChange, value]
  );
  
  // Sync contentEditable with value prop (for when parent clears the message)
  // Use textContent instead of innerText to avoid DOM structure issues
  useEffect(() => {
    if (contentEditableRef.current && value === "") {
      // Only clear if there's actually content to clear
      if (contentEditableRef.current.textContent) {
        // Use a microtask to avoid React reconciliation issues
        queueMicrotask(() => {
          if (contentEditableRef.current) {
            contentEditableRef.current.textContent = "";
          }
        });
      }
    }
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && isHome) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [isHome, handleSubmit]
  );

  const handleCodeClick = () => {
    console.log("Code formatting clicked");
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log("Files selected:", files);
    }
  };

  // Use the controlled value prop to determine if empty
  const isEmpty = value.trim().length === 0;

  // Click to focus handler
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (contentEditableRef.current?.contains(target)) {
        contentEditableRef.current.focus();
      }
    };
    const wrapper = contentEditableRef.current?.closest('[role="presentation"]');
    if (wrapper) {
      wrapper.addEventListener("click", handleClick);
      return () => wrapper.removeEventListener("click", handleClick);
    }
  }, []);

  return (
    <div className="mx-auto flex w-full flex-col px-4 lg:max-w-[805px] xl:px-0">
      <form className="mb-6 mt-10 flex w-full flex-col" onSubmit={handleSubmit}>
        <div
          role="presentation"
          className={cn(
            "relative cursor-text rounded-2xl border-[1.5px] border-black/[4%] bg-white shadow-[0_0_1px_0_rgba(0,0,0,0.05),0_0_2px_0_rgba(0,0,0,0.10)] transition-colors dark:border-white/10 dark:bg-zinc-900",
            isFocused && "shadow-[0_0_0_3px_rgba(59,130,246,0.5)]"
          )}
        >
          <input
            ref={fileInputRef}
            accept="image/*,.jpeg,.jpg,.png,.webp,.svg"
            multiple
            type="file"
            tabIndex={-1}
            onChange={handleFileChange}
            title="Attach files"
            aria-label="Attach files"
            className="absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]"
          />
          <div className="flex flex-col">
            <div className="flex h-full flex-col">
              <div className="flex min-w-0 flex-col overflow-x-hidden">
                <div className="relative flex h-full max-h-[400px] min-h-[120px] w-full flex-col overflow-y-auto overflow-x-hidden border-none bg-transparent p-3.5 text-base shadow-none focus:outline-none focus:ring-0">
                  {/* Placeholder - positioned as sibling to avoid contentEditable DOM conflicts */}
                  {isEmpty && (
                    <span className="pointer-events-none absolute left-3.5 top-3.5 font-medium text-black/40 dark:text-white/40">
                      {placeholder}
                    </span>
                  )}
                  <div
                    ref={contentEditableRef}
                    contentEditable
                    role="textbox"
                    aria-label="Message input"
                    title="Type your message here"
                    translate="no"
                    className="tiptap ProseMirror relative flex-1 whitespace-pre-wrap break-words outline-none [font-feature-settings:'liga'_0]"
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    suppressContentEditableWarning
                  />
                </div>
              </div>
            </div>

            {/* Bottom toolbar */}
            <div className="flex min-w-0 flex-row items-center justify-between gap-2 px-3 pb-3">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {/* Model Selector */}
                <ModelSelector
                  selectedModel={selectedModel}
                  handleSelectModel={onSelectModel}
                />
                
                {/* Local Repo Selector */}
                <LocalRepoConnection
                  isOpen={isLocalRepoOpen}
                  setIsOpen={setIsLocalRepoOpen}
                  selectedRepo={selectedRepo}
                  selectedBranch={selectedBranch}
                  setSelectedRepo={setSelectedRepo}
                  setSelectedBranch={setSelectedBranch}
                />
                
                {/* GitHub Repo Selector */}
                <GithubConnection
                  isOpen={isGithubOpen}
                  setIsOpen={setIsGithubOpen}
                  selectedRepo={selectedRepo}
                  selectedBranch={selectedBranch}
                  setSelectedRepo={setSelectedRepo}
                  setSelectedBranch={setSelectedBranch}
                />
              </div>

              {/* Right side buttons */}
              <div className="flex shrink-0 items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCodeClick}
                  title="Code formatting"
                  aria-label="Code formatting"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium text-black/40 hover:bg-black/[4%] focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.5)] active:bg-black/[8%] disabled:bg-black/[2%] disabled:text-black/20 disabled:shadow-none dark:text-white/40 dark:hover:bg-white/10"
                >
                  <Code2 className="h-5 w-5 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={handleAttachClick}
                  title="Attach files"
                  aria-label="Attach files"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium text-black/40 hover:bg-black/[4%] focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.5)] active:bg-black/[8%] disabled:bg-black/[2%] disabled:text-black/20 disabled:shadow-none dark:text-white/40 dark:hover:bg-white/10"
                >
                  <Paperclip className="h-5 w-5 shrink-0" />
                </button>
                <button
                  type="submit"
                  disabled={isEmpty || isDisabled}
                  title="Submit"
                  aria-label="Submit"
                  className="inline-flex h-7 w-9 items-center justify-center gap-0.5 whitespace-nowrap rounded-full bg-[#0F0F0F] px-1.5 py-1 text-sm font-medium text-white/[92%] shadow-[0_0_0_1px_rgba(0,0,0,0.82),_0_-1px_2px_0_rgba(255,255,255,0.12)_inset,_0_1px_2px_0_rgba(255,255,255,0.16)_inset] hover:bg-[#292929] focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.5)] active:bg-[#525252] disabled:bg-[#F0F0F0] disabled:text-black/20 disabled:shadow-none"
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white/80" />
                  ) : (
                    <ArrowRight className="h-5 w-5 shrink-0 text-white/80" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
