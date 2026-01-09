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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Plus, Check, Loader2, Eye, EyeOff, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuthSession } from "@/components/auth/session-provider";
import { useConvexUserByExternalId } from "@/lib/convex/hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Environment variable configuration
interface EnvVarConfig {
  name: string;
  label: string;
  description: string;
  placeholder: string;
  secret?: boolean;
  required?: boolean;
  helpUrl?: string;
}

// MCP connector template definition
interface McpTemplate {
  name: string;
  nameId: string;
  description: string;
  category: string;
  icon: string;
  repo: string;
  docsUrl?: string;
  // Default MCP server URL (for hosted services)
  defaultUrl?: string;
  // Whether user needs to provide their own server URL
  requiresCustomServer?: boolean;
  // Authentication methods supported
  authMethods: Array<{
    id: string;
    name: string;
    description: string;
    envVars: EnvVarConfig[];
  }>;
  features: string[];
}

// Default MCP connector templates
const MCP_TEMPLATES: McpTemplate[] = [
  {
    name: "Atlassian",
    nameId: "atlassian",
    description: "Connect to Jira and Confluence via Atlassian Cloud or Server/Data Center",
    category: "Project Management",
    icon: "🔷",
    repo: "https://github.com/sooperset/mcp-atlassian",
    docsUrl: "https://github.com/sooperset/mcp-atlassian#readme",
    requiresCustomServer: true,
    authMethods: [
      {
        id: "api_token",
        name: "API Token (Recommended)",
        description: "Use API tokens for Atlassian Cloud authentication",
        envVars: [
          {
            name: "CONFLUENCE_URL",
            label: "Confluence URL",
            description: "Your Confluence instance URL",
            placeholder: "https://your-company.atlassian.net/wiki",
            required: true,
            helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
          },
          {
            name: "CONFLUENCE_USERNAME",
            label: "Confluence Username",
            description: "Your Atlassian account email",
            placeholder: "your.email@company.com",
            required: true,
          },
          {
            name: "CONFLUENCE_API_TOKEN",
            label: "Confluence API Token",
            description: "API token from id.atlassian.com",
            placeholder: "your-api-token",
            secret: true,
            required: true,
            helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
          },
          {
            name: "JIRA_URL",
            label: "Jira URL",
            description: "Your Jira instance URL",
            placeholder: "https://your-company.atlassian.net",
            required: true,
          },
          {
            name: "JIRA_USERNAME",
            label: "Jira Username",
            description: "Your Atlassian account email",
            placeholder: "your.email@company.com",
            required: true,
          },
          {
            name: "JIRA_API_TOKEN",
            label: "Jira API Token",
            description: "API token for Jira authentication",
            placeholder: "your-api-token",
            secret: true,
            required: true,
            helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
          },
        ],
      },
      {
        id: "pat",
        name: "Personal Access Token (Server/Data Center)",
        description: "Use PAT for self-hosted Atlassian instances",
        envVars: [
          {
            name: "CONFLUENCE_URL",
            label: "Confluence URL",
            description: "Your self-hosted Confluence URL",
            placeholder: "https://confluence.your-company.com",
            required: true,
          },
          {
            name: "CONFLUENCE_PERSONAL_TOKEN",
            label: "Confluence Personal Access Token",
            description: "PAT from your Confluence profile",
            placeholder: "your-personal-access-token",
            secret: true,
            required: true,
          },
          {
            name: "JIRA_URL",
            label: "Jira URL",
            description: "Your self-hosted Jira URL",
            placeholder: "https://jira.your-company.com",
            required: true,
          },
          {
            name: "JIRA_PERSONAL_TOKEN",
            label: "Jira Personal Access Token",
            description: "PAT from your Jira profile",
            placeholder: "your-personal-access-token",
            secret: true,
            required: true,
          },
        ],
      },
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
    docsUrl: "https://linear.app/settings/api",
    requiresCustomServer: true,
    authMethods: [
      {
        id: "api_key",
        name: "API Key",
        description: "Personal API key from Linear settings",
        envVars: [
          {
            name: "LINEAR_API_KEY",
            label: "Linear API Key",
            description: "Personal API key from Linear settings",
            placeholder: "lin_api_...",
            secret: true,
            required: true,
            helpUrl: "https://linear.app/settings/api",
          },
        ],
      },
    ],
    features: [
      "Create and update issues",
      "Manage projects and cycles",
      "Search across workspace",
      "Track team workload",
    ],
  },
  {
    name: "GitHub",
    nameId: "github",
    description: "Manage GitHub repositories, issues, and pull requests",
    category: "Development",
    icon: "🐙",
    repo: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
    docsUrl: "https://github.com/settings/tokens",
    requiresCustomServer: true,
    authMethods: [
      {
        id: "pat",
        name: "Personal Access Token",
        description: "GitHub PAT with repo access",
        envVars: [
          {
            name: "GITHUB_PERSONAL_ACCESS_TOKEN",
            label: "GitHub Personal Access Token",
            description: "PAT with repo, issues, and PR permissions",
            placeholder: "ghp_...",
            secret: true,
            required: true,
            helpUrl: "https://github.com/settings/tokens",
          },
        ],
      },
    ],
    features: [
      "Create and manage issues",
      "Review pull requests",
      "Search repositories",
      "Manage branches",
    ],
  },
  {
    name: "Slack",
    nameId: "slack",
    description: "Send messages and interact with Slack workspaces",
    category: "Communication",
    icon: "💬",
    repo: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
    docsUrl: "https://api.slack.com/apps",
    requiresCustomServer: true,
    authMethods: [
      {
        id: "bot_token",
        name: "Bot Token",
        description: "Slack Bot User OAuth Token",
        envVars: [
          {
            name: "SLACK_BOT_TOKEN",
            label: "Slack Bot Token",
            description: "Bot User OAuth Token from your Slack app",
            placeholder: "xoxb-...",
            secret: true,
            required: true,
            helpUrl: "https://api.slack.com/apps",
          },
          {
            name: "SLACK_TEAM_ID",
            label: "Slack Team ID",
            description: "Your Slack workspace team ID",
            placeholder: "T0123456789",
            required: true,
          },
        ],
      },
    ],
    features: [
      "Send messages to channels",
      "Reply to threads",
      "Search messages",
      "List channels and users",
    ],
  },
  {
    name: "Notion",
    nameId: "notion",
    description: "Manage Notion pages, databases, and blocks",
    category: "Knowledge Management",
    icon: "📝",
    repo: "https://github.com/modelcontextprotocol/servers/tree/main/src/notion",
    docsUrl: "https://www.notion.so/my-integrations",
    requiresCustomServer: true,
    authMethods: [
      {
        id: "integration",
        name: "Internal Integration",
        description: "Notion internal integration token",
        envVars: [
          {
            name: "NOTION_API_KEY",
            label: "Notion API Key",
            description: "Internal integration token from Notion",
            placeholder: "secret_...",
            secret: true,
            required: true,
            helpUrl: "https://www.notion.so/my-integrations",
          },
        ],
      },
    ],
    features: [
      "Create and update pages",
      "Query databases",
      "Manage blocks",
      "Search content",
    ],
  },
  {
    name: "PostgreSQL",
    nameId: "postgres",
    description: "Query and manage PostgreSQL databases",
    category: "Database",
    icon: "🐘",
    repo: "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
    requiresCustomServer: true,
    authMethods: [
      {
        id: "connection_string",
        name: "Connection String",
        description: "PostgreSQL connection URL",
        envVars: [
          {
            name: "POSTGRES_CONNECTION_STRING",
            label: "Connection String",
            description: "PostgreSQL connection URL",
            placeholder: "postgresql://user:password@host:5432/database",
            secret: true,
            required: true,
          },
        ],
      },
    ],
    features: [
      "Execute SQL queries",
      "List tables and schemas",
      "Describe table structure",
      "Read-only mode available",
    ],
  },
  {
    name: "Sentry",
    nameId: "sentry",
    description: "Monitor and manage Sentry issues and errors",
    category: "Monitoring",
    icon: "🔍",
    repo: "https://github.com/modelcontextprotocol/servers/tree/main/src/sentry",
    docsUrl: "https://sentry.io/settings/account/api/auth-tokens/",
    requiresCustomServer: true,
    authMethods: [
      {
        id: "auth_token",
        name: "Auth Token",
        description: "Sentry authentication token",
        envVars: [
          {
            name: "SENTRY_AUTH_TOKEN",
            label: "Sentry Auth Token",
            description: "Authentication token from Sentry settings",
            placeholder: "sntrys_...",
            secret: true,
            required: true,
            helpUrl: "https://sentry.io/settings/account/api/auth-tokens/",
          },
          {
            name: "SENTRY_ORGANIZATION",
            label: "Organization Slug",
            description: "Your Sentry organization slug",
            placeholder: "my-org",
            required: true,
          },
          {
            name: "SENTRY_PROJECT",
            label: "Project Slug",
            description: "Your Sentry project slug (optional)",
            placeholder: "my-project",
          },
        ],
      },
    ],
    features: [
      "List and search issues",
      "Get issue details",
      "View error stack traces",
      "Resolve issues",
    ],
  },
];

type Template = typeof MCP_TEMPLATES[number];

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

  const [selectedAuthMethod, setSelectedAuthMethod] = useState<string>(
    template?.authMethods[0]?.id || ""
  );
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [serverUrl, setServerUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Reset form when template changes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({});
      setServerUrl("");
      setSelectedAuthMethod(template?.authMethods[0]?.id || "");
      setShowSecrets({});
    }
    onOpenChange(open);
  };

  const currentAuthMethod = template?.authMethods.find(
    (m) => m.id === selectedAuthMethod
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !user?._id || !currentAuthMethod) return;

    // Validate required fields
    const missingFields = currentAuthMethod.envVars
      .filter((v) => v.required && !formData[v.name])
      .map((v) => v.label);

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    if (!serverUrl) {
      toast.error("MCP Server URL is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the config JSON with all environment variables
      const configJson = JSON.stringify({
        authMethod: selectedAuthMethod,
        variables: formData,
      });

      await createConnector({
        userId: user._id,
        name: template.name,
        url: serverUrl,
        type: "HTTP",
        templateId: template.nameId,
        configJson,
      });

      toast.success(`${template.name} connector configured successfully`);
      onSuccess();
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add connector");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSecretVisibility = (name: string) => {
    setShowSecrets((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{template.icon}</span>
            Configure {template.name}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server URL */}
          <div className="space-y-2">
            <Label htmlFor="serverUrl">MCP Server URL *</Label>
            <Input
              id="serverUrl"
              type="url"
              placeholder="https://your-mcp-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">
              Deploy the MCP server and enter its URL.{" "}
              <a
                href={template.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View setup guide →
              </a>
            </p>
          </div>

          {/* Auth Method Selection */}
          {template.authMethods.length > 1 && (
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <Tabs value={selectedAuthMethod} onValueChange={setSelectedAuthMethod}>
                <TabsList className="w-full">
                  {template.authMethods.map((method) => (
                    <TabsTrigger key={method.id} value={method.id} className="flex-1 text-xs">
                      {method.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Environment Variables */}
          {currentAuthMethod && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Configuration</Label>
                {template.docsUrl && (
                  <a
                    href={template.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
                  >
                    <HelpCircle className="size-3" />
                    Get credentials
                  </a>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                {currentAuthMethod.envVars.map((envVar) => (
                  <div key={envVar.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={envVar.name}
                        className="text-xs font-medium flex items-center gap-1"
                      >
                        {envVar.label}
                        {envVar.required && <span className="text-destructive">*</span>}
                      </Label>
                      {envVar.helpUrl && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={envVar.helpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <HelpCircle className="size-3" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Click to get this credential</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id={envVar.name}
                        type={envVar.secret && !showSecrets[envVar.name] ? "password" : "text"}
                        placeholder={envVar.placeholder}
                        value={formData[envVar.name] || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, [envVar.name]: e.target.value }))
                        }
                        className="pr-10 text-sm"
                      />
                      {envVar.secret && (
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility(envVar.name)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets[envVar.name] ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">{envVar.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          <div className="bg-muted/30 rounded-md p-3">
            <p className="mb-2 text-xs font-medium">Available features:</p>
            <div className="flex flex-wrap gap-1">
              {template.features.map((feature) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
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
