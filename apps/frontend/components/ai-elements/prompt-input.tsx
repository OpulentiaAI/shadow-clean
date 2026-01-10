// Placeholder PromptInput components for AI Elements
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

export const PromptInput = ({ 
  onSubmit, 
  children, 
  className 
}: { 
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode; 
  className?: string;
}) => (
  <form onSubmit={onSubmit} className={className}>
    {children}
  </form>
);

export const PromptInputTextarea = ({ 
  value, 
  placeholder, 
  onChange, 
  className 
}: { 
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}) => (
  <Textarea
    value={value}
    placeholder={placeholder}
    onChange={onChange}
    className={className}
    rows={3}
  />
);

export const PromptInputSubmit = ({ 
  status, 
  disabled, 
  className 
}: { 
  status: "ready" | "streaming";
  disabled?: boolean;
  className?: string;
}) => (
  <Button
    type="submit"
    size="sm"
    disabled={disabled || status === "streaming"}
    className={className}
  >
    {status === "streaming" ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <Send className="h-4 w-4" />
    )}
  </Button>
);
