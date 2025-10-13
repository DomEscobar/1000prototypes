import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Download, Copy, ExternalLink, Code, Eye, AlertTriangle, RefreshCw, Edit, MoreHorizontal, FileText, Lock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/lib/api";
import { processHTMLForIframe } from "@/lib/utils";
import { useState, useEffect } from "react";
import { LogModal } from "./LogModal";
import { PrivateHistoryManager } from "@/lib/privateHistory";

interface OutputViewerProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any | null;
  userRequest?: string;
  onAgentUpdate?: (updatedAgent: any) => void;
}

// Function to extract HTML from response (similar to backend)
function extractHTMLFromOutput(output: string): { html: string; isHTML: boolean } {
  // Try to find HTML code blocks first (```html ... ```)
  const codeBlockMatch = output.match(/```html\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    return { html: codeBlockMatch[1].trim(), isHTML: true };
  }

  // Try to find any code blocks (``` ... ```)
  const anyCodeBlockMatch = output.match(/```\s*([\s\S]*?)\s*```/);
  if (anyCodeBlockMatch) {
    const content = anyCodeBlockMatch[1].trim();
    // Check if it looks like HTML
    if (content.includes('<html') || content.includes('<!DOCTYPE') || content.includes('<head') || content.includes('<body')) {
      return { html: content, isHTML: true };
    }
  }

  // Look for HTML document structure
  const htmlDocMatch = output.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i);
  if (htmlDocMatch) {
    return { html: htmlDocMatch[1].trim(), isHTML: true };
  }

  // Look for HTML tag patterns
  const htmlTagMatch = output.match(/(<html[\s\S]*?<\/html>)/i);
  if (htmlTagMatch) {
    return { html: htmlTagMatch[1].trim(), isHTML: true };
  }

  // Check if it looks like HTML without full structure
  if (output.includes('<') && output.includes('>') && (
    output.includes('<div') || output.includes('<section') || output.includes('<header') || 
    output.includes('<main') || output.includes('<footer') || output.includes('<nav')
  )) {
    return { html: output, isHTML: true };
  }

  return { html: output, isHTML: false };
}

export function OutputViewer({ isOpen, onClose, agent, userRequest, onAgentUpdate }: OutputViewerProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [iframeKey, setIframeKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [savedPreviewUrl, setSavedPreviewUrl] = useState<string | null>(null);
  const [editedHtml, setEditedHtml] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refresh iframe when modal opens and initialize edited HTML
  useEffect(() => {
    if (isOpen) {
      setIframeKey(prev => prev + 1);
      if (agent?.output) {
        const { html } = extractHTMLFromOutput(agent.output);
        setEditedHtml(html);
        setHasUnsavedChanges(false);
      }
    }
  }, [isOpen, agent?.output]);

  if (!agent?.output) return null;

  const { html, isHTML } = extractHTMLFromOutput(agent.output);

  const handleRefreshIframe = () => {
    setIframeKey(prev => prev + 1);
    toast({
      title: "Preview refreshed",
      description: "The iframe has been reloaded.",
    });
  };

  const handleHtmlChange = (value: string) => {
    setEditedHtml(value);
    setHasUnsavedChanges(value !== html);
  };

  const handleApplyChanges = () => {
    if (agent && onAgentUpdate && isHTML) {
      // Create updated output by replacing the HTML content
      let updatedOutput = agent.output;
      
      // Try to find and replace HTML code blocks first
      const codeBlockMatch = agent.output.match(/```html\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        updatedOutput = agent.output.replace(codeBlockMatch[1].trim(), editedHtml);
      } else {
        // Fallback to replacing the extracted HTML directly
        updatedOutput = agent.output.replace(html, editedHtml);
      }
      
      const updatedAgent = {
        ...agent,
        output: updatedOutput
      };
      onAgentUpdate(updatedAgent);
    }
    
    setIframeKey(prev => prev + 1);
    setHasUnsavedChanges(false);
    toast({
      title: "Changes applied",
      description: "Your HTML changes have been applied and saved.",
    });
  };

  const handleResetChanges = () => {
    setEditedHtml(html);
    setHasUnsavedChanges(false);
    toast({
      title: "Changes reset",
      description: "HTML has been reset to the original version.",
    });
  };

  const handleCopyCode = () => {
    if (agent?.output) {
      const contentToCopy = isHTML ? (hasUnsavedChanges ? editedHtml : html) : agent.output;
      navigator.clipboard.writeText(contentToCopy);
      toast({
        title: "Copied to clipboard",
        description: isHTML ? "HTML code has been copied to your clipboard." : "Content has been copied to your clipboard.",
      });
    }
  };

  const handleDownload = () => {
    if (agent?.output) {
      const content = isHTML ? (hasUnsavedChanges ? editedHtml : html) : agent.output;
      const fileExtension = isHTML ? 'html' : 'txt';
      const mimeType = isHTML ? 'text/html' : 'text/plain';
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${agent.name.toLowerCase().replace(/\s+/g, '-')}-output.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: `${isHTML ? 'HTML' : 'Text'} file has been downloaded.`,
      });
    }
  };

  const handleOpenInNewTab = () => {
    if (agent?.output && isHTML) {
      const htmlToOpen = hasUnsavedChanges ? editedHtml : html;
      const blob = new Blob([processHTMLForIframe(htmlToOpen)], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      toast({
        title: "Cannot preview",
        description: "This output doesn't contain valid HTML for preview.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async (isPrivate: boolean = false) => {
    if (!agent?.output) return;

    try {
      setIsSaving(true);
      
      const title = `${agent.name} - ${new Date().toLocaleDateString()}`;
      const content = isHTML ? (hasUnsavedChanges ? editedHtml : html) : agent.output;
      
      const response = await apiService.saveOutput({
        title,
        content,
        agentId: agent.id,
        agentName: agent.name,
        userRequest: userRequest || "No request provided",
        isHTML,
        model: agent.model || 'gemini-2.0-flash',
        isPrivate
      });

      const previewUrl = `/preview/${response.output.id}`;
      setSavedPreviewUrl(previewUrl);
      
      // If this is a private save, add to local history
      if (isPrivate) {
        const historyItem = {
          id: response.output.id,
          title,
          agentId: agent.id,
          agentName: agent.name,
          userRequest: userRequest || "No request provided",
          isHTML,
          model: agent.model || 'gemini-2.0-flash',
          createdAt: response.output.createdAt,
          previewUrl,
          contentPreview: PrivateHistoryManager.createContentPreview(content, isHTML)
        };
        
        PrivateHistoryManager.addToHistory(historyItem);
      }
      
      toast({
        title: "Output saved!",
        description: `Your output has been saved ${isPrivate ? 'privately' : 'publicly'}. Preview link is now available below.`,
      });
    } catch (error) {
      console.error('Failed to save output:', error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPreviewLink = () => {
    if (savedPreviewUrl) {
      const fullUrl = `${window.location.origin}${savedPreviewUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Link copied!",
        description: "Preview link has been copied to your clipboard.",
      });
    }
  };

  const handleOpenPreview = () => {
    if (savedPreviewUrl) {
      navigate(savedPreviewUrl);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[99vh] bg-gradient-card border-border p-2">
        <DialogHeader>
          <DialogTitle className="sr-only">Output Viewer - {agent?.name}</DialogTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Primary actions - always visible */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    className="flex items-center gap-1 h-8 px-2 sm:px-3"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => handleSave(false)} 
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Save Public
                    <span className="text-xs text-muted-foreground ml-auto">Gallery</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleSave(true)} 
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Save Private
                    <span className="text-xs text-muted-foreground ml-auto">URL only</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Log button - show if agent has results or detailed steps */}
              {((agent?.results && agent.results.length > 0) || (agent?.detailedSteps && agent.detailedSteps.length > 0)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLogModalOpen(true)}
                  className="flex items-center gap-1 h-8 px-2 sm:px-3"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Log</span>
                </Button>
              )}
              
              {isHTML && (
                <div className="flex items-center border rounded-md p-1">
                  <Button
                    variant={viewMode === 'preview' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('preview')}
                    className="h-8 px-2 sm:px-3"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'code' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('code')}
                    className="h-8 px-2 sm:px-3"
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Secondary actions - in dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isHTML && viewMode === 'preview' && (
                    <DropdownMenuItem onClick={handleRefreshIframe} className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refresh Preview
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCopyCode} className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy {isHTML ? 'HTML' : 'Content'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownload} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download {isHTML ? 'HTML' : 'File'}
                  </DropdownMenuItem>
                  {isHTML && (
                    <DropdownMenuItem onClick={handleOpenInNewTab} className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Open in New Tab
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 sm:py-4 flex-1 overflow-hidden">
          {!isHTML && (
            <Alert className="mb-2 sm:mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This output doesn't appear to contain valid HTML. It may be explanatory text or incomplete code.
              </AlertDescription>
            </Alert>
          )}

          {isHTML ? (
            viewMode === 'preview' ? (
              <div className="space-y-2 sm:space-y-3 h-full flex flex-col">
                <h3 className="text-sm font-medium text-foreground hidden sm:block">Live Preview</h3>
                <Card className="p-0 overflow-hidden bg-white flex-1 max-w-[99vw]">
                  <iframe
                    key={iframeKey}
                    srcDoc={processHTMLForIframe(hasUnsavedChanges ? editedHtml : html)}
                    className="w-full h-full min-h-[75vh] sm:h-[70vh] max-w-full border-0"
                    title={`${agent.name} Output`}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                </Card>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">HTML Code</h3>
                  {hasUnsavedChanges && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetChanges}
                        className="flex items-center gap-1 h-8 px-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden sm:inline">Reset</span>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleApplyChanges}
                        className="flex items-center gap-1 h-8 px-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Apply</span>
                      </Button>
                    </div>
                  )}
                </div>
                <Card className="p-0 overflow-hidden flex-1">
                  <Textarea
                    value={editedHtml}
                    onChange={(e) => handleHtmlChange(e.target.value)}
                    className="h-[75vh] sm:h-[70vh] resize-none border-0 bg-secondary/50 font-mono text-xs leading-relaxed focus-visible:ring-0"
                    placeholder="Edit your HTML code here..."
                  />
                </Card>
              </div>
            )
          ) : (
            <div className="space-y-2 sm:space-y-3 h-full flex flex-col">
              <h3 className="text-sm font-medium text-foreground hidden sm:block">Output Content</h3>
              <Card className="p-0 overflow-hidden flex-1">
                <div className="bg-secondary/50 p-2 sm:p-4 text-sm overflow-auto h-[75vh] sm:h-[70vh] scrollbar-thin scrollbar-track-secondary scrollbar-thumb-muted-foreground">
                  <div className="text-foreground whitespace-pre-wrap break-words">
                    {agent.output}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Saved Preview Link Panel */}
        {savedPreviewUrl && (
          <div className="border-t border-border p-3 sm:p-4 bg-secondary/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground mb-1">Preview Link</h4>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded truncate max-w-[200px] sm:max-w-none">
                    {window.location.origin}{savedPreviewUrl}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPreviewLink}
                  className="flex items-center gap-1"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy Link</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenPreview}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Open Preview</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      
      {/* Log Modal */}
      <LogModal 
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        agent={agent}
      />
    </Dialog>
  );
}