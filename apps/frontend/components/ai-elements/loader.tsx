// Placeholder Loader component for AI Elements
import { Loader2 } from "lucide-react";

export const Loader = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center p-4 ${className}`}>
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
);
