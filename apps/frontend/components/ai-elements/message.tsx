// Placeholder Message components for AI Elements
export const Message = ({ 
  from, 
  children, 
  className 
}: { 
  from: string; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={`flex ${from === "user" ? "justify-end" : "justify-start"} ${className}`}>
    <div className={`max-w-[80%] rounded-lg p-3 ${
      from === "user" 
        ? "bg-primary text-primary-foreground" 
        : "bg-muted"
    }`}>
      {children}
    </div>
  </div>
);

export const MessageContent = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={className}>{children}</div>
);

export const MessageResponse = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={`whitespace-pre-wrap ${className}`}>{children}</div>
);
