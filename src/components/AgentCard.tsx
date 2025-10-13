import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Settings,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  Play,
  Code2,
  Globe,
  Maximize2,
  RefreshCw,
  Power,
  Copy
} from "lucide-react";

import { ProcessStep, Agent, PromptStep, normalizePrompts } from "@/lib/api";
import { processHTMLForIframe } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onRemove: (agentId: string) => void;
  onViewOutput: (agent: Agent) => void;
  onToggleStatus: (agentId: string) => void;
  onCopy: (agent: Agent) => void;
}

// Function to extract HTML preview from output
function extractHTMLPreview(output: string): { preview: string; isHTML: boolean } {
  if (!output) return { preview: '', isHTML: false };

  // Try to find HTML code blocks first
  const codeBlockMatch = output.match(/```html\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    return { preview: codeBlockMatch[1].trim(), isHTML: true };
  }

  // Look for HTML document structure
  const htmlDocMatch = output.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i);
  if (htmlDocMatch) {
    return { preview: htmlDocMatch[1].trim(), isHTML: true };
  }

  // Look for HTML tag patterns
  const htmlTagMatch = output.match(/(<html[\s\S]*?<\/html>)/i);
  if (htmlTagMatch) {
    return { preview: htmlTagMatch[1].trim(), isHTML: true };
  }

  // Check if it looks like HTML content
  if (output.includes('<') && output.includes('>') && (
    output.includes('<div') || output.includes('<section') || output.includes('<header') ||
    output.includes('<main') || output.includes('<footer') || output.includes('<nav')
  )) {
    return { preview: output, isHTML: true };
  }

  // Return truncated text preview
  const textPreview = output.length > 300 ? output.substring(0, 300) + '...' : output;
  return { preview: textPreview, isHTML: false };
}

export const AgentCard = ({ agent, onEdit, onRemove, onViewOutput, onToggleStatus, onCopy }: AgentCardProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(agent.id);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRefreshIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  const handleViewOutput = () => {
    // Force iframe refresh when opening full view
    setIframeKey(prev => prev + 1);
    onViewOutput(agent);
  };

  const getStatusIcon = () => {
    if (agent.isBuilding) {
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    }
    if (agent.output) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    if (agent.status === 'active') {
      return <Sparkles className="h-3 w-3 text-primary" />;
    }
    return <XCircle className="h-3 w-3 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (agent.isBuilding) return "Creating...";
    if (agent.output) return "Ready";
    if (agent.status === 'active') return "Active";
    return "Inactive";
  };

  const getAgentIcon = () => {
    if (agent.name.toLowerCase().includes('html') || agent.name.toLowerCase().includes('website')) {
      return <Globe className="h-3.5 w-3.5 text-primary" />;
    }
    if (agent.name.toLowerCase().includes('code') || agent.name.toLowerCase().includes('developer')) {
      return <Code2 className="h-3.5 w-3.5 text-primary" />;
    }
    return <Bot className="h-3.5 w-3.5 text-primary" />;
  };

  // Function to determine model display info
  const getModelInfo = () => {
    if (!agent.prompts || agent.prompts.length === 0) {
      return {
        displayText: agent.model || 'Default',
        isMixed: false,
        models: []
      };
    }

    const normalizedPrompts = normalizePrompts(agent.prompts);
    const defaultModel = agent.model || 'qwen/qwen3-coder';

    // Get all models used (including default)
    const modelsUsed = normalizedPrompts.map(prompt => prompt.model || defaultModel);
    const uniqueModels = Array.from(new Set(modelsUsed));

    if (uniqueModels.length === 1) {
      // All prompts use the same model
      return {
        displayText: uniqueModels[0],
        isMixed: false,
        models: uniqueModels
      };
    } else {
      // Mixed models used
      return {
        displayText: `${uniqueModels.length} models`,
        isMixed: true,
        models: uniqueModels
      };
    }
  };

  const modelInfo = getModelInfo();

  const { preview, isHTML } = extractHTMLPreview(agent.output || '');

  return (
    <Card className={`bg-gradient-card border-border shadow-card hover:shadow-elegant transition-all duration-300 overflow-hidden ${agent.status === 'inactive' ? 'opacity-60' : ''}`}>
      {/* Compact Header Badge */}
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 flex items-center gap-1.5">
            {getAgentIcon()}
            <span className="line-clamp-1">{agent.name}</span>
          </Badge>
          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-xs px-2 py-0.5 flex items-center gap-1">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-0">
        {/* Preview Section */}
        {agent.output ? (
          <div className="space-y-3">
            {/* Preview Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Live Preview
                </span>
                <Badge variant={isHTML ? "default" : "secondary"} className="text-xs">
                  {isHTML ? "HTML" : "Text"}
                </Badge>
              </div>
              {isHTML && (
                <Button
                  onClick={handleRefreshIframe}
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  title="Refresh preview"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Preview Area */}
            {isHTML ? (
              <div className="bg-background rounded-lg border border-border overflow-hidden shadow-card">
                <iframe
                  key={iframeKey}
                  srcDoc={processHTMLForIframe(preview)}
                  className="w-full h-64 border-0 bg-background"
                  title={`${agent.name} Preview`}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-4 border border-border h-64 overflow-auto">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-words h-full">
                  {preview}
                </pre>
              </div>
            )}
          </div>
        ) : agent.isBuilding ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center space-y-4 w-full max-w-xs px-4">
              {/* Custom loading animation matching the design system */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-border"></div>
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-primary border-r-primary animate-spin m-auto"></div>
              </div>

              {/* Progress Information */}
              {agent.buildProgress ? (
                <div className="space-y-3">
                  {/* Step Progress */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Step {agent.buildProgress.currentStep} of {agent.buildProgress.totalSteps}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {agent.buildProgress.stepDescription}
                    </p>
                  </div>

                  {/* Progress Bar with Step Completion */}
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(agent.buildProgress.currentStep / agent.buildProgress.totalSteps) * 100}%` }}
                    />
                  </div>

                  {/* Character Count & Time */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{agent.buildProgress.characterCount.toLocaleString()}</span>
                      <span>chars generated</span>
                    </div>
                    {agent.buildProgress.estimatedTimeRemaining && agent.buildProgress.estimatedTimeRemaining > 1000 && (
                      <span className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                        ~{Math.ceil(agent.buildProgress.estimatedTimeRemaining / 1000)}s left
                      </span>
                    )}
                  </div>

                  {/* Live Progress Indicator */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      {agent.buildProgress.currentStep === agent.buildProgress.totalSteps
                        ? "Finalizing..."
                        : "Processing..."
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Creating your website...</p>
                  <p className="text-xs text-muted-foreground">This may take a few moments</p>
                  {/* Fallback progress bar */}
                  <div className="w-32 h-2 bg-muted rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground bg-muted/50 rounded-lg border-2 border-dashed border-border">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-card border border-border w-fit mx-auto">
                <Play className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Ready to create</p>
                <p className="text-xs text-muted-foreground">Submit a request to see output here</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Footer with Details and Actions */}
      <CardFooter className="pt-4 pb-4 bg-muted/30 border-t border-border">
        {/* Details Row */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {agent.prompts.length} steps
              </Badge>
              {agent.provider && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {agent.provider}
                </Badge>
              )}
              <Badge
                variant={modelInfo.isMixed ? "default" : "outline"}
                className={`text-xs ${modelInfo.isMixed ? 'bg-primary text-primary-foreground' : ''}`}
                title={modelInfo.isMixed ? `Uses: ${modelInfo.models.join(', ')}` : `Model: ${modelInfo.displayText}`}
              >
                {modelInfo.isMixed && <Bot className="h-3 w-3 mr-1" />}
                {modelInfo.displayText}
              </Badge>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Primary Action */}
            {agent.output && (
              <Button
                onClick={handleViewOutput}
                className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-200"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Full Output
              </Button>
            )}

            {/* Control Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant={agent.status === 'active' ? 'default' : 'outline'}
                onClick={() => onToggleStatus(agent.id)}
                className={`h-9 px-3 ${agent.status === 'active'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'hover:bg-primary hover:text-primary-foreground'
                  }`}
                disabled={agent.isBuilding}
                title={agent.status === 'active' ? 'Deactivate agent' : 'Activate agent'}
              >
                <Power className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(agent)}
                className="h-9 px-3 hover:bg-primary hover:text-primary-foreground"
                disabled={agent.isBuilding}
                title="Copy agent"
              >
                <Copy className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(agent)}
                className="h-9 px-3 hover:bg-primary hover:text-primary-foreground"
                disabled={agent.isBuilding}
                title="Edit agent settings"
              >
                <Settings className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleRemove}
                className="h-9 px-3 hover:bg-destructive hover:text-destructive-foreground"
                disabled={agent.isBuilding || isRemoving}
                title="Delete agent"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};