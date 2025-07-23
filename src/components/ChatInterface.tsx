import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  RotateCcw,
  Wand2
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isApplied?: boolean;
}

interface ChatInterfaceProps {
  content: string;
  title: string;
  isHTML: boolean;
  onContentUpdate: (newContent: string) => Promise<void> | void;
  className?: string;
}

const ChatInterface = ({ 
  content, 
  title, 
  isHTML, 
  onContentUpdate, 
  className = "" 
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Create placeholder assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isApplied: false
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Create context for the AI
      const context = `
You are helping edit ${isHTML ? 'an HTML' : 'a text'} file titled "${title}".

Current content:
\`\`\`${isHTML ? 'html' : 'text'}
${content}
\`\`\`

Instructions:
- If the user asks for changes, provide the complete updated ${isHTML ? 'HTML' : 'text'} content
- Maintain the existing structure and functionality unless specifically asked to change it
- For HTML files, ensure all tags are properly closed and the document is valid
- Be concise but thorough in your explanations
- If you're providing updated content, wrap it in proper code blocks
- Provide a brief explanation of what changes you made before or after the code
`;

      const systemPrompt = `You are an expert ${isHTML ? 'web developer and designer' : 'content editor'} helping users modify their ${isHTML ? 'HTML' : 'text'} files. You provide clear, actionable suggestions and complete updated content when requested.`;

      let fullResponse = '';
      let wasApplied = false;

      // Use streaming API
      await apiService.chatStream(
        inputMessage,
        context,
        systemPrompt,
        // onChunk callback - update message in real-time
        (chunk: string) => {
          fullResponse += chunk;
          
          // Update the assistant message with new content (cleaned)
          const cleanedContent = removeCodeFromMessage(fullResponse);
          
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: cleanedContent }
              : msg
          ));
        },
        // onComplete callback
        async () => {
          // Final processing when stream is complete
          const extractedCode = extractCodeFromMessage(fullResponse);
          
          if (extractedCode && isValidHTMLUpdate(extractedCode)) {
            try {
              await onContentUpdate(extractedCode);
              wasApplied = true;
              
              toast({
                title: "Changes applied automatically",
                description: "The content has been updated with the AI suggestions.",
              });

              // Update the message to show it was applied
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, isApplied: true }
                  : msg
              ));
            } catch (error) {
              console.error('Failed to apply content update:', error);
              toast({
                title: "Failed to apply changes",
                description: "The changes couldn't be saved, but are visible in the preview.",
                variant: "destructive"
              });
            }
          }

          setIsLoading(false);
        },
        // onError callback
        (error: string) => {
          console.error('Streaming error:', error);
          toast({
            title: "Failed to send message",
            description: error,
            variant: "destructive"
          });
          
          // Remove the placeholder message on error
          setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
          setIsLoading(false);
        }
      );

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      
      // Remove the placeholder message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const extractCodeFromMessage = (content: string): string | null => {
    // First try to extract from markdown code blocks
    const codeBlockPatterns = [
      /```html\s*\n?([\s\S]*?)\n?```/gi,
      /```htm\s*\n?([\s\S]*?)\n?```/gi,
      /```\s*\n?(<!DOCTYPE[\s\S]*?<\/html>[\s\S]*?)\n?```/gi,
      /```\s*\n?(<html[\s\S]*?<\/html>[\s\S]*?)\n?```/gi,
      /```(?:text|txt)?\s*\n?([\s\S]*?)\n?```/gi
    ];
    
    for (const pattern of codeBlockPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim()) {
          const code = match[1].trim();
          // Verify it's actually HTML-like content if we're expecting HTML
          if (!isHTML || code.includes('<') || code.includes('<!DOCTYPE') || code.includes('<html')) {
            return code;
          }
        }
      }
    }
    
    // If no code blocks, look for raw HTML patterns in the content
    if (isHTML) {
      const htmlPatterns = [
        /(<!DOCTYPE[\s\S]*?<\/html>)/i,
        /(<html[\s\S]*?<\/html>)/i,
        /(<\!DOCTYPE[\s\S]*)/i // Sometimes HTML might not be complete
      ];
      
      for (const pattern of htmlPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          // Ensure we get the complete HTML if it's there
          let html = match[1].trim();
          // If it starts with DOCTYPE but doesn't end with </html>, try to find the end
          if (html.includes('<!DOCTYPE') && !html.includes('</html>')) {
            const endMatch = content.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
            if (endMatch) {
              html = endMatch[1].trim();
            }
          }
          return html;
        }
      }
    }
    
    return null;
  };

  const removeCodeFromMessage = (content: string): string => {
    let cleanedContent = content;
    
    // Remove all code blocks (more comprehensive patterns)
    const codeBlockPatterns = [
      /```html\s*\n?[\s\S]*?\n?```/gi,
      /```htm\s*\n?[\s\S]*?\n?```/gi,
      /```(?:text|txt)?\s*\n?[\s\S]*?\n?```/gi,
      /```[\s\S]*?```/gi
    ];
    
    for (const pattern of codeBlockPatterns) {
      cleanedContent = cleanedContent.replace(pattern, '');
    }
    
    // Remove raw HTML content that might not be in code blocks
    if (isHTML) {
      const htmlPatterns = [
        /(<!DOCTYPE[\s\S]*?<\/html>)/gi,
        /(<html[\s\S]*?<\/html>)/gi,
        /(<\!DOCTYPE[\s\S]*)/gi
      ];
      
      for (const pattern of htmlPatterns) {
        cleanedContent = cleanedContent.replace(pattern, '');
      }
      
      // Remove any remaining HTML-like tags that might be scattered
      cleanedContent = cleanedContent.replace(/<[^>]*>/g, '');
    }
    
    // Clean up extra whitespace and newlines
    cleanedContent = cleanedContent
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
    
    // If after cleaning there's very little text left, provide a meaningful message
    if (cleanedContent.length < 20) {
      if (isHTML) {
        return "I've updated your HTML with the requested changes.";
      } else {
        return "I've updated your content with the requested changes.";
      }
    }
    
    // If content is mostly technical jargon or seems like leftover code fragments, provide clean message
    if (cleanedContent.match(/^[<>\{\}\[\]\(\)\;\:\,\.\s]*$/)) {
      return "Changes have been applied to your content.";
    }
    
    return cleanedContent || "Changes have been applied to your content.";
  };

  const isValidHTMLUpdate = (code: string): boolean => {
    if (!code || code.trim().length === 0) {
      return false;
    }
    
    // Only validate for HTML content
    if (!isHTML) {
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



  const handleClearChat = () => {
    setMessages([]);
    toast({
      title: "Chat cleared",
      description: "All messages have been removed.",
    });
  };



  return (
    <div className={`flex flex-col h-full max-h-screen bg-background ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">
              Ask me to help edit your {isHTML ? 'HTML' : 'content'}
            </p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="p-3 rounded-full bg-primary/10 mb-4">
              <Wand2 className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-medium text-foreground mb-2">Start editing with AI</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Ask me to modify your {isHTML ? 'HTML' : 'content'}. I can help with styling, content, structure, and more.
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>• "Add a navigation bar"</p>
              <p>• "Change the color scheme to dark"</p>
              <p>• "Make it mobile responsive"</p>
              <p>• "Add animations"</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="p-1.5 rounded-full bg-primary/10 h-fit">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] space-y-2 ${message.role === 'user' ? 'order-first' : ''}`}>
                    <Card className={`p-3 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-secondary/50'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                        {message.role === 'assistant' && isLoading && message.content === '' && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs">AI is thinking...</span>
                          </div>
                        )}
                        {message.role === 'assistant' && isLoading && message.content !== '' && (
                          <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                        )}
                      </div>
                    </Card>
                    
                    {message.role === 'assistant' && message.isApplied && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="h-5 px-2 text-xs">
                          ✓ Changes Applied
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="p-1.5 rounded-full bg-secondary h-fit">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className={`text-xs text-muted-foreground ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                } px-3`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-secondary/30 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask AI to modify your ${isHTML ? 'HTML' : 'content'}...`}
            disabled={isLoading}
            className="flex-1 bg-background"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="sm"
            className="px-3"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 