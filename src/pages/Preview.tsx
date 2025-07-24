import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  ExternalLink, 
  Code, 
  Eye, 
  AlertTriangle, 
  RefreshCw,
  Calendar,
  User,
  Loader2,
  Bot,
  MessageSquare,
  Monitor,
  X,
  Share2
} from "lucide-react";
import { apiService, SavedOutput } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ChatInterface from "@/components/ChatInterface";
import ErrorConsole, { ConsoleError } from "@/components/ErrorConsole";
import { useIsMobile } from "@/hooks/use-mobile";

interface PreviewProps {
  previewId?: string;
  isModal?: boolean;
  onClose?: () => void;
}

const Preview = ({ previewId, isModal = false, onClose }: PreviewProps) => {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Use previewId prop if in modal mode, otherwise use route param
  const id = isModal ? previewId : routeId;
  
  const [savedOutput, setSavedOutput] = useState<SavedOutput | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [currentView, setCurrentView] = useState<'content' | 'chat'>('content');
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([]);
  const [isFixingError, setIsFixingError] = useState(false);

  useEffect(() => {
    loadSavedOutput();
  }, [id]);

  // Error capture from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'console-error') {
        const errorData = event.data.data;
        
        // Only capture errors, not warnings
        if (errorData.type === 'warning') return;
        
        const newError: ConsoleError = {
          id: Date.now().toString() + Math.random(),
          message: errorData.message,
          type: errorData.type || 'error',
          timestamp: new Date(),
          line: errorData.line,
          column: errorData.column,
          source: errorData.source,
          stack: errorData.stack
        };
        
        setConsoleErrors(prev => [...prev, newError]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Clear errors when content changes
  useEffect(() => {
    setConsoleErrors([]);
  }, [savedOutput?.content, iframeKey]);

  const loadSavedOutput = async () => {
    if (!id) {
      setError("No output ID provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.getSavedOutput(id);
      setSavedOutput(response.output);
    } catch (err) {
      console.error('Failed to load saved output:', err);
      setError(err instanceof Error ? err.message : "Failed to load saved output");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentUpdate = async (newContent: string) => {
    if (savedOutput) {
      const updatedOutput = {
        ...savedOutput,
        content: newContent
      };
      
      // Update local state immediately for responsive UI
      setSavedOutput(updatedOutput);
      
      // Refresh iframe if it's an HTML file
      if (savedOutput.isHTML) {
        setIframeKey(prev => prev + 1);
      }

      // Save to database in the background
      try {
        await apiService.updateSavedOutput(savedOutput.id, {
          title: updatedOutput.title,
          content: newContent,
          agentId: updatedOutput.agentId,
          agentName: updatedOutput.agentName,
          userRequest: updatedOutput.userRequest,
          isHTML: updatedOutput.isHTML,
          model: updatedOutput.model || 'gemini-2.0-flash'
        });
        
        // Only show toast for successful saves occasionally to avoid spam
        if (Math.random() < 0.3) {
          toast({
            title: "Changes saved",
            description: "Your updates have been saved automatically.",
          });
        }
      } catch (error) {
        console.error('Failed to save updates:', error);
        toast({
          title: "Save failed",
          description: "Failed to save changes to database. Your edits are preserved locally.",
          variant: "destructive"
        });
      }
    }
  };

  const handleFixError = async (error: ConsoleError) => {
    if (!savedOutput) return;

    setIsFixingError(true);

    try {
      const context = `
You are helping fix a JavaScript/HTML error in a file titled "${savedOutput.title}".

Current HTML content:
\`\`\`html
${savedOutput.content}
\`\`\`

Error details:
- Message: ${error.message}
- Type: ${error.type}
${error.line ? `- Line: ${error.line}` : ''}
${error.column ? `- Column: ${error.column}` : ''}
${error.stack ? `- Stack trace: ${error.stack}` : ''}

Instructions:
- Analyze the error and fix the issue in the HTML/JavaScript code
- Provide the complete corrected HTML content
- Maintain all existing functionality while fixing the specific error
- Ensure the fix is robust and won't cause other issues
- Be concise in your explanation of what was fixed
`;

      const systemPrompt = `You are an expert web developer specializing in debugging and fixing JavaScript and HTML errors. You provide complete, corrected code and clear explanations of fixes.`;

      const response = await apiService.chat(
        `Fix this error: ${error.message}`,
        context,
        systemPrompt
      );

      // Auto-apply the fix like the chat interface does
      const extractedCode = extractCodeFromResponse(response.response);
      if (extractedCode && isValidHTMLUpdate(extractedCode)) {
        await handleContentUpdate(extractedCode);
        
        toast({
          title: "Error fix applied",
          description: `Fixed: ${error.message.substring(0, 50)}${error.message.length > 50 ? '...' : ''}`,
        });
        
        // Remove the fixed error from the list
        setConsoleErrors(prev => prev.filter(e => e.id !== error.id));
      } else {
        toast({
          title: "Could not auto-fix",
          description: "The AI response didn't contain valid fixable code. Check the chat for manual instructions.",
          variant: "destructive"
        });
      }

    } catch (err) {
      console.error('Error fixing failed:', err);
      toast({
        title: "Fix failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsFixingError(false);
    }
  };

  const handleFixAllErrors = async () => {
    if (!savedOutput) return;

    const errorMessages = consoleErrors
      .filter(e => e.type === 'error')
      .map(e => e.message);

    if (errorMessages.length === 0) return;

    setIsFixingError(true);

    try {
      const context = `
You are helping fix multiple JavaScript/HTML errors in a file titled "${savedOutput.title}".

Current HTML content:
\`\`\`html
${savedOutput.content}
\`\`\`

All errors that need to be fixed:
${errorMessages.map((msg, index) => `${index + 1}. ${msg}`).join('\n')}

Instructions:
- Analyze all the errors and fix ALL issues in the HTML/JavaScript code
- Provide the complete corrected HTML content that addresses ALL errors
- Maintain all existing functionality while fixing all the errors
- Ensure the fixes are robust and won't cause other issues
- Be concise in your explanation of what was fixed
`;

      const systemPrompt = `You are an expert web developer specializing in debugging and fixing JavaScript and HTML errors. You provide complete, corrected code and clear explanations of fixes for multiple errors at once.`;

      const response = await apiService.chat(
        `Fix all these errors: ${errorMessages.join('; ')}`,
        context,
        systemPrompt
      );

      // Auto-apply the fix like the chat interface does
      const extractedCode = extractCodeFromResponse(response.response);
      if (extractedCode && isValidHTMLUpdate(extractedCode)) {
        await handleContentUpdate(extractedCode);
        
        toast({
          title: "All errors fixed",
          description: `Fixed ${errorMessages.length} error${errorMessages.length !== 1 ? 's' : ''} automatically`,
        });
        
        // Clear all errors since we attempted to fix all
        setConsoleErrors([]);
      } else {
        toast({
          title: "Could not auto-fix all errors",
          description: "The AI response didn't contain valid fixable code. Check the chat for manual instructions.",
          variant: "destructive"
        });
      }

    } catch (err) {
      console.error('Fix all errors failed:', err);
      toast({
        title: "Fix all failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsFixingError(false);
    }
  };

  const handleClearErrors = () => {
    setConsoleErrors([]);
    toast({
      title: "Errors cleared",
      description: "All console errors have been cleared.",
    });
  };

  // Extract code from AI response (similar to ChatInterface)
  const extractCodeFromResponse = (content: string): string | null => {
    const codeBlockPattern = /```(?:html|htm)?\s*\n?([\s\S]*?)\n?```/i;
    const match = content.match(codeBlockPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      return content.trim();
    }
    
    return null;
  };

  // Validate if extracted code is meaningful and should trigger an update
  const isValidHTMLUpdate = (code: string): boolean => {
    if (!code || code.trim().length === 0) {
      return false;
    }
    
    const isHTMLContent = savedOutput?.isHTML;
    
    // Only validate for HTML content
    if (!isHTMLContent) {
      return code.trim().length > 10; // Basic length check for non-HTML
    }
    
    const trimmedCode = code.trim();
    
    // Check for meaningful HTML content
    const hasHTMLStructure = (
      trimmedCode.includes('<!DOCTYPE') ||
      trimmedCode.includes('<html') ||
      trimmedCode.includes('<head') ||
      trimmedCode.includes('<body') ||
      (trimmedCode.includes('<') && trimmedCode.includes('>'))
    );
    
    // Reject if it's too short or doesn't contain HTML-like content
    if (!hasHTMLStructure || trimmedCode.length < 50) {
      return false;
    }
    
    // Reject if it's mostly whitespace or placeholder text
    const meaningfulContent = trimmedCode.replace(/\s+/g, ' ').trim();
    if (meaningfulContent.length < 30) {
      return false;
    }
    
    // Check for common invalid patterns
    const invalidPatterns = [
      /^[\s\n\r]*$/,  // Only whitespace
      /^[<>\s]*$/,    // Only HTML brackets and whitespace
      /^\s*<!--[\s\S]*-->\s*$/, // Only HTML comments
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(trimmedCode)) {
        return false;
      }
    }
    
    return true;
  };

  // Inject error capture script into HTML
  const getEnhancedHTML = (originalHTML: string): string => {
    const errorCaptureScript = `
<script>
(function() {
  // Capture console errors
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.error = function(...args) {
    originalError.apply(console, args);
    window.parent.postMessage({
      type: 'console-error',
      data: {
        message: args.join(' '),
        type: 'error',
        timestamp: Date.now()
      }
    }, '*');
  };

  console.warn = function(...args) {
    originalWarn.apply(console, args);
    window.parent.postMessage({
      type: 'console-error',
      data: {
        message: args.join(' '),
        type: 'warning',
        timestamp: Date.now()
      }
    }, '*');
  };

  // Capture runtime errors
  window.addEventListener('error', function(event) {
    window.parent.postMessage({
      type: 'console-error',
      data: {
        message: event.message,
        type: 'error',
        line: event.lineno,
        column: event.colno,
        source: event.filename,
        stack: event.error ? event.error.stack : undefined,
        timestamp: Date.now()
      }
    }, '*');
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    window.parent.postMessage({
      type: 'console-error',
      data: {
        message: 'Unhandled Promise Rejection: ' + (event.reason || 'Unknown'),
        type: 'error',
        stack: event.reason && event.reason.stack ? event.reason.stack : undefined,
        timestamp: Date.now()
      }
    }, '*');
  });
})();
</script>
`;

    // Inject the script before the closing head tag or at the beginning of body
    if (originalHTML.includes('</head>')) {
      return originalHTML.replace('</head>', errorCaptureScript + '</head>');
    } else if (originalHTML.includes('<body>')) {
      return originalHTML.replace('<body>', '<body>' + errorCaptureScript);
    } else {
      return errorCaptureScript + originalHTML;
    }
  };

  const handleRefreshIframe = () => {
    setIframeKey(prev => prev + 1);
    toast({
      title: "Preview refreshed",
      description: "The iframe has been reloaded.",
    });
  };

  const handleCopyCode = () => {
    if (savedOutput?.content) {
      navigator.clipboard.writeText(savedOutput.content);
      toast({
        title: "Copied to clipboard",
        description: savedOutput.isHTML ? "HTML code has been copied to your clipboard." : "Content has been copied to your clipboard.",
      });
    }
  };

  const handleDownload = () => {
    if (savedOutput?.content) {
      const fileExtension = savedOutput.isHTML ? 'html' : 'txt';
      const mimeType = savedOutput.isHTML ? 'text/html' : 'text/plain';
      
      const blob = new Blob([savedOutput.content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${savedOutput.title.toLowerCase().replace(/\s+/g, '-')}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: `${savedOutput.isHTML ? 'HTML' : 'Text'} file has been downloaded.`,
      });
    }
  };

  const handleOpenInNewTab = () => {
    if (savedOutput?.content && savedOutput.isHTML) {
      const blob = new Blob([savedOutput.content], { type: 'text/html' });
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

  const handleBackNavigation = () => {
    if (isModal && onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  const handleShare = async () => {
    if (!id) return;

    const shareUrl = `${window.location.origin}/preview/${id}`;
    
    try {
      // Try using the Web Share API first (mobile devices)
      if (navigator.share) {
        await navigator.share({
          title: savedOutput?.title || 'Shared Output',
          text: `Check out this output: ${savedOutput?.title || 'Untitled'}`,
          url: shareUrl
        });
        
        toast({
          title: "Shared successfully",
          description: "The preview link has been shared.",
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        
        toast({
          title: "Link copied to clipboard",
          description: "The preview link has been copied to your clipboard.",
        });
      }
    } catch (error) {
      // If both methods fail, show the URL for manual copying
      console.error('Share failed:', error);
      
      toast({
        title: "Share link",
        description: shareUrl,
        duration: 10000, // Show longer so user can copy manually
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading saved output...</span>
        </div>
      </div>
    );
  }

  if (error || !savedOutput) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={handleBackNavigation}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {isModal ? "Close Preview" : "Back to Home"}
            </Button>
          </div>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || "Saved output not found"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const renderContent = () => (
    <div className="flex-1">
      {!savedOutput.isHTML && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This output doesn't contain valid HTML. It may be explanatory text or incomplete code.
          </AlertDescription>
        </Alert>
      )}

      {savedOutput.isHTML ? (
        viewMode === 'preview' ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Live Preview</h3>
            <Card className="p-0 overflow-hidden bg-white">
              <iframe
                key={iframeKey}
                srcDoc={getEnhancedHTML(savedOutput.content)}
                className="w-full h-[80vh] border-0"
                title={savedOutput.title}
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">HTML Code</h3>
            <Card className="p-0 overflow-hidden">
              <pre className="bg-secondary/50 p-4 text-xs overflow-auto h-[80vh] scrollbar-thin scrollbar-track-secondary scrollbar-thumb-muted-foreground">
                <code className="text-foreground whitespace-pre-wrap break-words">
                  {savedOutput.content}
                </code>
              </pre>
            </Card>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Output Content</h3>
          <Card className="p-0 overflow-hidden">
            <div className="bg-secondary/50 p-4 text-sm overflow-auto h-[80vh] scrollbar-thin scrollbar-track-secondary scrollbar-thumb-muted-foreground">
              <div className="text-foreground whitespace-pre-wrap break-words">
                {savedOutput.content}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    // Mobile: Tab layout
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/30">
          <Button
            variant="ghost"
            onClick={handleBackNavigation}
            className="flex items-center gap-2 h-9 px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            {isModal ? "Close" : "Back"}
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              title="Share preview link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
            {isModal && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackNavigation}
                title="Close Preview"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'content' | 'chat')} className="flex flex-col h-[calc(100vh-60px)]">
          <TabsList className="grid w-full grid-cols-2 mx-3 mt-3">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="flex-1 px-3 pb-3 mt-3">
            <div className="h-full">
              {/* Mobile view controls for HTML */}
              {savedOutput.isHTML && (
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-lg font-semibold text-foreground truncate">{savedOutput.title}</h1>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md p-1">
                      <Button
                        variant={viewMode === 'preview' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('preview')}
                        className="h-8 px-3"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'code' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('code')}
                        className="h-8 px-3"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </div>
                    {viewMode === 'preview' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshIframe}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {renderContent()}
              
              {/* Mobile Error Console */}
              {savedOutput.isHTML && (
                <div className="mt-4">
                  <ErrorConsole
                    errors={consoleErrors}
                    onClearErrors={handleClearErrors}
                    onFixError={handleFixError}
                    onFixAll={handleFixAllErrors}
                    isFixingError={isFixingError}
                    content={savedOutput.content}
                    title={savedOutput.title}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="chat" className="flex-1 mt-3 overflow-hidden">
            <div className="h-full border rounded-lg mx-3 mb-3 overflow-hidden">
              <ChatInterface
                content={savedOutput.content}
                title={savedOutput.title}
                isHTML={savedOutput.isHTML}
                onContentUpdate={handleContentUpdate}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Desktop: Sidebar layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Header */}
      <div className="flex items-center justify-between py-3 px-6 border-b border-border">
        <Button
          variant="ghost"
          onClick={handleBackNavigation}
          className="flex items-center gap-2 h-9 px-3"
        >
          <ArrowLeft className="h-4 w-4" />
          {isModal ? "Close Preview" : "Back to Home"}
        </Button>
        
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{savedOutput.title}</h1>
          <span className="text-sm text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Bot className="h-3 w-3" />
            {savedOutput.agentName}
          </span>
          <Badge variant="outline" className="text-sm">
            {savedOutput.model}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {savedOutput.isHTML && (
            <div className="flex items-center border rounded-md p-1">
              <Button
                variant={viewMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('preview')}
                className="h-8 px-3"
              >
                <Eye className="h-4 w-4 mr-1" />
              </Button>
              <Button
                variant={viewMode === 'code' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('code')}
                className="h-8 px-3"
              >
                <Code className="h-4 w-4 mr-1" />
              </Button>
            </div>
          )}
          {savedOutput.isHTML && viewMode === 'preview' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshIframe}
              className="flex items-center gap-2"
              title="Refresh preview"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-2"
            title="Share preview link"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
          </Button>
          {isModal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="flex items-center gap-2"
              title="Close Preview"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto space-y-4">
          {renderContent()}
          
          {/* Desktop Error Console */}
          {savedOutput.isHTML && (
            <ErrorConsole
              errors={consoleErrors}
              onClearErrors={handleClearErrors}
              onFixError={handleFixError}
              onFixAll={handleFixAllErrors}
              isFixingError={isFixingError}
              content={savedOutput.content}
              title={savedOutput.title}
            />
          )}
        </div>

        {/* Chat Sidebar */}
        <div className="w-96 border-l border-border flex flex-col bg-secondary/20 max-h-full overflow-hidden">
          <ChatInterface
            content={savedOutput.content}
            title={savedOutput.title}
            isHTML={savedOutput.isHTML}
            onContentUpdate={handleContentUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default Preview; 