import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MessageSquare, Sparkles } from "lucide-react";
import { Agent } from "./AgentCard";

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

export function LogModal({ isOpen, onClose, agent }: LogModalProps) {
  // Use detailed steps if available, fallback to basic results for backward compatibility
  const hasDetailedSteps = agent?.detailedSteps && agent.detailedSteps.length > 0;
  const hasBasicResults = agent?.results && agent.results.length > 0;
  
  if (!hasDetailedSteps && !hasBasicResults) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gradient-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-foreground">
              Agent Processing Log - {agent.name}
            </DialogTitle>
            <Badge variant="secondary" className="ml-auto">
              {hasDetailedSteps ? agent.detailedSteps.length : agent.results?.length || 0} steps
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-6">
          <div className="space-y-4">
            {hasDetailedSteps ? (
              // Render detailed steps with full prompt and thinking information
              agent.detailedSteps!.map((step, index) => (
                <Card key={index} className="p-4 bg-secondary/30 border-border">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-foreground">
                          {step.stepNumber}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-4">
                      {/* Step Header */}
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          Step {step.stepNumber} Processing
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Clock className="h-3 w-3" />
                          <span>{step.characterCount.toLocaleString()} chars</span>
                        </div>
                      </div>

                      {/* Original Prompt */}
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Original Prompt:</h4>
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-3 border border-blue-200 dark:border-blue-800">
                          <pre className="text-xs text-blue-800 dark:text-blue-200 whitespace-pre-wrap break-words">
                            {step.originalPrompt}
                          </pre>
                        </div>
                      </div>

                      {/* Full Processed Prompt */}
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Full Prompt Sent to LLM:</h4>
                        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-md p-3 border border-amber-200 dark:border-amber-800">
                          <pre className="text-xs text-amber-800 dark:text-amber-200 whitespace-pre-wrap break-words">
                            {step.fullProcessedPrompt}
                          </pre>
                        </div>
                      </div>

                      {/* Thinking Content (if available) */}
                      {step.thinking && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">LLM Thinking Process:</h4>
                          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-md p-3 border border-purple-200 dark:border-purple-800">
                            <pre className="text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap break-words">
                              {step.thinking}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Response */}
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">LLM Response:</h4>
                        <div className="bg-background/80 rounded-md p-3 border border-border">
                          <pre className="text-sm text-foreground whitespace-pre-wrap break-words">
                            {step.response}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              // Fallback to basic results for backward compatibility
              agent.results!.map((result, index) => (
                <Card key={index} className="p-4 bg-secondary/30 border-border">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          Step {index + 1} Result
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Clock className="h-3 w-3" />
                          <span>
                            {agent.prompts && agent.prompts[index] 
                              ? `Prompt: ${agent.prompts[index].length > 50 
                                  ? agent.prompts[index].substring(0, 50) + "..." 
                                  : agent.prompts[index]}`
                              : `Step ${index + 1}`
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-background/80 rounded-md p-3 border border-border">
                        <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono">
                          {result}
                        </pre>
                      </div>
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        Character count: {result.length.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
            
            {/* Final output summary */}
            {agent.output && (
              <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">✓</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Final Output
                      </span>
                    </div>
                    
                    <div className="bg-green-100 dark:bg-green-900/40 rounded-md p-3 border border-green-200 dark:border-green-800">
                      <pre className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap break-words font-mono">
                        {agent.output.length > 500 
                          ? agent.output.substring(0, 500) + "\n\n... (truncated, see full output in main view)"
                          : agent.output
                        }
                      </pre>
                    </div>
                    
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                      Final character count: {agent.output.length.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 