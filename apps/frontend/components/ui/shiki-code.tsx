"use client";

import { getHighlighter } from "@/lib/editor/highlighter";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ShikiCode({
  children,
  className,
  inline = false,
  language,
}: {
  children: string;
  className?: string;
  inline?: boolean;
  language?: string;
}) {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function highlightCode() {
      try {
        const highlighter = await getHighlighter();
        const requestedLang = language || className?.replace(/language-/, "") || "plaintext";
        
        // Get loaded languages and check if requested language is available
        const loadedLangs = highlighter.getLoadedLanguages();
        const langToUse = loadedLangs.includes(requestedLang) ? requestedLang : "plaintext";
        
        const html = highlighter.codeToHtml(children, {
          lang: langToUse,
          theme: "vesper",
        });
        setHighlightedCode(html);
      } catch (error) {
        console.warn("Failed to highlight code:", error);
        // Fallback to plain text with HTML escaping
        const escaped = children
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        setHighlightedCode(`<pre><code>${escaped}</code></pre>`);
      } finally {
        setIsLoading(false);
      }
    }

    highlightCode();
  }, [children, language, className]);

  if (inline) {
    return (
      <code
        className={cn(
          "bg-muted text-muted-foreground inline rounded px-1 py-px font-mono text-xs",
          className
        )}
      >
        {children}
      </code>
    );
  }

  if (isLoading) {
    return (
      <pre
        className={cn(
          "border-border not-prose my-3 max-h-[500px] overflow-auto rounded-md border p-3 font-mono text-xs [&_code]:border-none [&_code]:bg-transparent [&_code]:p-0",
          className
        )}
      >
        <code>{children}</code>
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "border-border not-prose my-3 max-h-[500px] overflow-auto rounded-md border font-mono text-xs [&_code]:border-none [&_code]:bg-transparent [&_code]:p-0 [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-3",
        className
      )}
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  );
}
