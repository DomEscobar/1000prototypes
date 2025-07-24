import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Copy, ExternalLink, Code, Eye, AlertTriangle, RefreshCw, Edit, MoreHorizontal, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/lib/api";
import { processHTMLForIframe } from "@/lib/utils";
import { useState, useEffect } from "react";
import { LogModal } from "./LogModal";

interface OutputViewerProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any | null;
  userRequest?: string;
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

export function OutputViewer({ isOpen, onClose, agent, userRequest }: OutputViewerProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [iframeKey, setIframeKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Refresh iframe when modal opens
  useEffect(() => {
    if (isOpen) {
      setIframeKey(prev => prev + 1);
    }
  }, [isOpen]);

  if (!agent?.output) return null;

  const { html, isHTML } = extractHTMLFromOutput(agent.output);

  const handleRefreshIframe = () => {
    setIframeKey(prev => prev + 1);
    toast({
      title: "Preview refreshed",
      description: "The iframe has been reloaded.",
    });
  };

  const handleCopyCode = () => {
    if (agent?.output) {
      navigator.clipboard.writeText(isHTML ? html : agent.output);
      toast({
        title: "Copied to clipboard",
        description: isHTML ? "HTML code has been copied to your clipboard." : "Content has been copied to your clipboard.",
      });
    }
  };

  const handleDownload = () => {
    if (agent?.output) {
      const content = isHTML ? html : agent.output;
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
      const blob = new Blob([processHTMLForIframe(html)], { type: 'text/html' });
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

  const handleSave = async () => {
    if (!agent?.output) return;

    try {
      setIsSaving(true);
      
      const title = `${agent.name} - ${new Date().toLocaleDateString()}`;
      const content = isHTML ? html : agent.output;
      
      const response = await apiService.saveOutput({
        title,
        content,
        agentId: agent.id,
        agentName: agent.name,
        userRequest: userRequest || "No request provided",
        isHTML,
        model: agent.model || 'gemini-2.0-flash'
      });

      const previewUrl = `/preview/${response.output.id}`;
      
      toast({
        title: "Output saved!",
        description: "Your output has been saved successfully. Opening preview...",
      });

      // Navigate to the preview page
      navigate(previewUrl);
      
      // Close the modal
      onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[99vh] bg-gradient-card border-border p-2">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Primary actions - always visible */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 h-8 px-2 sm:px-3"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">{isSaving ? "Saving..." : "Edit"}</span>
              </Button>
              
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
                    srcDoc={processHTMLForIframe(html)}
                    className="w-full h-full min-h-[75vh] sm:h-[70vh] max-w-full border-0"
                    title={`${agent.name} Output`}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                </Card>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 h-full flex flex-col">
                <h3 className="text-sm font-medium text-foreground hidden sm:block">HTML Code</h3>
                <Card className="p-0 overflow-hidden flex-1">
                  <pre className="bg-secondary/50 p-2 sm:p-4 text-xs overflow-auto h-[75vh] sm:h-[70vh] scrollbar-thin scrollbar-track-secondary scrollbar-thumb-muted-foreground">
                    <code className="text-foreground whitespace-pre-wrap break-words">
                      {html}
                    </code>
                  </pre>
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