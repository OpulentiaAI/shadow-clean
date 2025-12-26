"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ExternalLink, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthSession } from "@/components/auth/session-provider";
import { useConvexUserByExternalId } from "@/lib/convex/hooks";

// Default MCP connector templates
const MCP_TEMPLATES = [
  {
    name: "Atlassian",
    nameId: "atlassian",
    description: "Connect to Jira and Confluence via Atlassian Cloud or Server/Data Center",
    category: "Project Management",
    icon: "🔷",
    repo: "https://github.com/sooperset/mcp-atlassian",
    requiredEnvVars: [
      { name: "ATLASSIAN_URL", description: "Your Atlassian instance URL", placeholder: "https://your-domain.atlassian.net" },
      { name: "ATLASSIAN_EMAIL", description: "Your Atlassian account email", placeholder: "you@company.com" },
      { name: "ATLASSIAN_API_TOKEN", description: "API token from id.atlassian.com", placeholder: "your-api-token", secret: true },
    ],
    features: [
      "Search Jira issues with JQL",
      "Create and update Jira issues",
      "Manage Confluence pages",
      "Track issue relationships",
    ],
  },
  {
    name: "Linear",
    nameId: "linear",
    description: "Manage Linear issues, projects, and teams",
    category: "Project Management",
    icon: "📐",
    repo: "https://github.com/cline/linear-mcp",
    requiredEnvVars: [
      { name: "LINEAR_API_KEY", description: "Personal API key from Linear settings", placeholder: "lin_api_...", secret: true },
    ],
    features: [
      "Create and update issues",
      "Manage projects and cycles",
      "Search across workspace",
      "Track team workload",
    ],
  },
  {
    name: "Jira",
    nameId: "jira",
    description: "Dedicated Jira MCP server with optimized AI context payloads",
    category: "Project Management",
    icon: "🎫",
    repo: "https://github.com/cosmix/jira-mcp",
    requiredEnvVars: [
      { name: "JIRA_BASE_URL", description: "Your Jira instance URL", placeholder: "https://your-domain.atlassian.net" },
      { name: "JIRA_USER_EMAIL", description: "Your Jira account email", placeholder: "you@company.com" },
      { name: "JIRA_API_TOKEN", description: "API token for authentication", placeholder: "your-api-token", secret: true },
    ],
    features: [
      "Search with JQL",
      "Get epic children with comments",
      "Create and update issues",
      "File attachments support",
    ],
  },
];

type Template = (typeof MCP_TEMPLATES)[number];

interface ConfigureDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function ConfigureDialog({ template, open, onOpenChange, onSuccess }: ConfigureDialogProps) {
  const { session } = useAuthSession();
  const user = useConvexUserByExternalId(session?.user?.id);
  const createConnector = useMutation(api.mcpConnectors.create);
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [serverUrl, setServerUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !user?._id) return;

    setIsSubmitting(true);
    try {
      // For now, we create the connector with the server URL
      // The env vars would be configured on the MCP server itself
      await createConnector({
        userId: user._id,
        name: template.name,
        url: serverUrl,
        type: "HTTP",
      });

      toast.success(`${template.name} connector added`);
      onSuccess();
      onOpenChange(false);
      setFormData({});
      setServerUrl("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add connector");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{template.icon}</span>
            Configure {template.name}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">MCP Server URL</Label>
            <Input
              id="serverUrl"
              type="url"
              placeholder="https://your-mcp-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">
              Deploy the MCP server from{" "}
              <a
                href={template.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {template.repo.split("/").slice(-1)[0]}
              </a>{" "}
              and enter its URL here.
            </p>
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <p className="mb-2 text-xs font-medium">Required environment variables on server:</p>
            <ul className="space-y-1 text-xs">
              {template.requiredEnvVars.map((envVar) => (
                <li key={envVar.name} className="flex items-start gap-2">
                  <code className="bg-muted rounded px-1">{envVar.name}</code>
                  <span className="text-muted-foreground">- {envVar.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !serverUrl}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  Add Connector
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface McpConnectorTemplatesProps {
  configuredConnectorIds: string[];
}

export function McpConnectorTemplates({ configuredConnectorIds }: McpConnectorTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfigure = (template: Template) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Available Integrations</h3>
        <p className="text-muted-foreground text-xs">
          Pre-configured MCP connectors for popular services
        </p>
      </div>

      <div className="grid gap-3">
        {MCP_TEMPLATES.map((template) => {
          const isConfigured = configuredConnectorIds.includes(template.nameId);

          return (
            <div
              key={template.nameId}
              className="flex items-start justify-between rounded-lg border p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                    {isConfigured && (
                      <Badge variant="default" className="text-xs">
                        <Check className="mr-1 size-3" />
                        Configured
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{template.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {template.features.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {template.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(template.repo, "_blank")}
                >
                  <ExternalLink className="size-4" />
                </Button>
                <Button
                  variant={isConfigured ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleConfigure(template)}
                >
                  {isConfigured ? "Reconfigure" : "Configure"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfigureDialog
        template={selectedTemplate}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          // Refresh will happen automatically via Convex subscription
        }}
      />
    </div>
  );
}
