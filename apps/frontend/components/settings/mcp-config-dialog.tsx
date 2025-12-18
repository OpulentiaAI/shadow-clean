"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { McpConnector, McpTransportType, McpConnectorFormData } from "@repo/types";
import { useCreateMcpConnector, useUpdateMcpConnector } from "@/hooks/mcp/use-mcp-connectors";

interface McpConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connector?: McpConnector | null; // If provided, we're editing
}

export function McpConfigDialog({
  open,
  onOpenChange,
  connector,
}: McpConfigDialogProps) {
  const isEditing = !!connector;

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<McpTransportType>("HTTP");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createMutation = useCreateMcpConnector();
  const updateMutation = useUpdateMcpConnector();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Reset form when dialog opens/closes or connector changes
  useEffect(() => {
    if (open && connector) {
      setName(connector.name);
      setUrl(connector.url);
      setType(connector.type);
      setOauthClientId(connector.oauthClientId || "");
      setOauthClientSecret(connector.oauthClientSecret || "");
      setShowAdvanced(!!(connector.oauthClientId || connector.oauthClientSecret));
    } else if (open) {
      setName("");
      setUrl("");
      setType("HTTP");
      setOauthClientId("");
      setOauthClientSecret("");
      setShowAdvanced(false);
    }
  }, [open, connector]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (name.length > 20) {
      toast.error("Name must be 20 characters or less");
      return;
    }

    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }

    try {
      new URL(url);
    } catch {
      toast.error("Invalid URL format");
      return;
    }

    const formData: McpConnectorFormData = {
      name: name.trim(),
      url: url.trim(),
      type,
      oauthClientId: oauthClientId.trim() || undefined,
      oauthClientSecret: oauthClientSecret.trim() || undefined,
    };

    try {
      if (isEditing && connector) {
        await updateMutation.mutateAsync({
          id: connector.id,
          updates: formData,
        });
        toast.success("MCP connector updated");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("MCP connector created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save connector"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit MCP Connector" : "Add MCP Connector"}
          </DialogTitle>
          <DialogDescription>
            Connect to an external MCP server to add tools to your agent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My MCP Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              disabled={isSubmitting}
            />
            <p className="text-muted-foreground text-xs">
              A unique name for this connector (max 20 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="https://mcp.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-muted-foreground text-xs">
              The MCP server endpoint URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Transport Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as McpTransportType)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HTTP">HTTP</SelectItem>
                <SelectItem value="SSE">SSE (Server-Sent Events)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-auto p-0 text-xs"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "Hide" : "Show"} advanced settings
            </Button>

            {showAdvanced && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-2">
                  <Label htmlFor="oauthClientId" className="text-xs">
                    OAuth Client ID (optional)
                  </Label>
                  <Input
                    id="oauthClientId"
                    placeholder="client_id"
                    value={oauthClientId}
                    onChange={(e) => setOauthClientId(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oauthClientSecret" className="text-xs">
                    OAuth Client Secret (optional)
                  </Label>
                  <Input
                    id="oauthClientSecret"
                    type="password"
                    placeholder="client_secret"
                    value={oauthClientSecret}
                    onChange={(e) => setOauthClientSecret(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Trust Warning */}
          <div className="bg-muted/50 flex items-start gap-2 rounded-md border p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-muted-foreground text-xs">
              Only connect to MCP servers you trust. Connectors can execute
              tools and access data through your agent.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Connector"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
