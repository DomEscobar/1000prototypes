import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  X, 
  Wrench, 
  Loader2,
  Bug,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface ConsoleError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
  line?: number;
  column?: number;
  source?: string;
  stack?: string;
}

interface ErrorConsoleProps {
  errors: ConsoleError[];
  onClearErrors: () => void;
  onFixError: (error: ConsoleError) => void;
  onFixAll: () => void;
  isFixingError: boolean;
  content: string;
  title: string;
  className?: string;
}

const ErrorConsole = ({ 
  errors, 
  onClearErrors, 
  onFixError,
  onFixAll, 
  isFixingError, 
  content, 
  title, 
  className = "" 
}: ErrorConsoleProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();

  // Only show errors, filter out warnings
  const displayErrors = errors.filter(e => e.type === 'error');
  const errorCount = displayErrors.length;

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bug className="h-4 w-4 text-blue-500" />;
    }
  };

  const getErrorBadgeVariant = (type: string): "destructive" | "secondary" | "default" => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  if (displayErrors.length === 0) {
    return null;
  }

  return (
    <Card className={`border-l-4 border-l-red-500 ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-red-500" />
              <h3 className="font-medium text-foreground">Console Errors</h3>
                             <div className="flex items-center gap-1">
                 {errorCount > 0 && (
                   <Badge variant="destructive" className="text-xs px-2 py-0">
                     {errorCount} error{errorCount !== 1 ? 's' : ''}
                   </Badge>
                 )}
               </div>
            </div>
            
                         <div className="flex items-center gap-2">
               {errorCount > 0 && (
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={(e) => {
                     e.stopPropagation();
                     onFixAll();
                   }}
                   disabled={isFixingError}
                   className="text-xs"
                 >
                   {isFixingError ? (
                     <Loader2 className="h-3 w-3 animate-spin mr-1" />
                   ) : (
                     <Wrench className="h-3 w-3 mr-1" />
                   )}
                   Fix All
                 </Button>
               )}
               {displayErrors.length > 0 && (
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={(e) => {
                     e.stopPropagation();
                     onClearErrors();
                   }}
                   className="text-muted-foreground hover:text-foreground"
                 >
                   <X className="h-3 w-3" />
                 </Button>
               )}
               {isExpanded ? (
                 <ChevronUp className="h-4 w-4 text-muted-foreground" />
               ) : (
                 <ChevronDown className="h-4 w-4 text-muted-foreground" />
               )}
             </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t border-border">
                         <ScrollArea className="max-h-48 p-3">
               <div className="space-y-2">
                 {displayErrors.map((error) => (
                  <div key={error.id} className="space-y-2">
                    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                      error.type === 'error' 
                        ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30'
                        : error.type === 'warning'
                        ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800/30'
                        : 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30'
                    }`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {getErrorIcon(error.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground break-words">
                              {error.message}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{formatTimestamp(error.timestamp)}</span>
                              {error.line && (
                                <>
                                  <span>•</span>
                                  <span>Line {error.line}</span>
                                </>
                              )}
                              {error.column && (
                                <>
                                  <span>:</span>
                                  <span>Col {error.column}</span>
                                </>
                              )}
                            </div>
                            
                            {error.stack && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Stack trace
                                </summary>
                                <pre className="mt-1 text-xs text-muted-foreground bg-secondary/50 p-2 rounded max-w-full overflow-x-auto">
                                  {error.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                          
                                                     <Button
                             size="sm"
                             variant="outline"
                             onClick={() => onFixError(error)}
                             disabled={isFixingError}
                             className="flex-shrink-0"
                           >
                             {isFixingError ? (
                               <Loader2 className="h-3 w-3 animate-spin mr-1" />
                             ) : (
                               <Wrench className="h-3 w-3 mr-1" />
                             )}
                             Fix Error
                           </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ErrorConsole; 