import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, X, GripVertical, Info, Maximize2, Minimize2 } from "lucide-react";
import { Agent } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSave: (agent: Agent) => void;
}



export function AgentSettingsModal({ isOpen, onClose, agent, onSave }: AgentSettingsModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [provider, setProvider] = useState<'openrouter'>('openrouter');
  const [model, setModel] = useState("");
  const [prompts, setPrompts] = useState<string[]>([]);
  
  // New state for expanded textarea modal
  const [expandedPromptIndex, setExpandedPromptIndex] = useState<number | null>(null);
  const [expandedPromptValue, setExpandedPromptValue] = useState("");
  
  const isMobile = useIsMobile();
  const { toast } = useToast();



  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || "");
      setStatus(agent.status || "active");
      setProvider("openrouter");
      setModel(agent.model || "qwen/qwen3-coder");
      setPrompts(agent.prompts || [""]);
    } else {
      setName("");
      setDescription("");
      setStatus("active");
      setProvider("openrouter");
      setModel("qwen/qwen3-coder");
      setPrompts([""]);
    }
  }, [agent, isOpen]);



  const handleAddPrompt = () => {
    setPrompts([...prompts, ""]);
  };

  const handleRemovePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };

  const handlePromptChange = (index: number, value: string) => {
    const updated = [...prompts];
    updated[index] = value;
    setPrompts(updated);
  };

  // New functions for expanded modal
  const handleExpandPrompt = (index: number) => {
    setExpandedPromptIndex(index);
    setExpandedPromptValue(prompts[index]);
  };

  const handleCloseExpandedPrompt = () => {
    if (expandedPromptIndex !== null) {
      handlePromptChange(expandedPromptIndex, expandedPromptValue);
    }
    setExpandedPromptIndex(null);
    setExpandedPromptValue("");
  };

  const handleCancelExpandedPrompt = () => {
    setExpandedPromptIndex(null);
    setExpandedPromptValue("");
  };

  const handleSave = () => {
    const filteredPrompts = prompts.filter(p => p.trim());
    
    const savedAgent: Agent = {
      id: agent?.id || Date.now().toString(),
      name: name || "New Agent",
      description: description || "",
      status: status,
      provider: "openrouter",
      model,
      prompts: filteredPrompts,
      isBuilding: false,
      output: agent?.output || null,
      results: agent?.results || undefined,
      detailedSteps: agent?.detailedSteps || undefined
    };

    onSave(savedAgent);
    onClose();
  };





  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-3xl max-h-[85vh]'} bg-gradient-card border-border ${isMobile ? 'p-0' : 'p-0'} flex flex-col`}>
        <DialogHeader className={`${isMobile ? 'p-4 pb-0' : 'p-6 pb-0'}`}>
          <DialogTitle className="text-foreground">
            {agent ? "Edit Agent" : "Create New Agent"}
          </DialogTitle>
        </DialogHeader>

        <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-4' : 'px-6'}`}>
          <div className={`space-y-6 py-4 ${isMobile ? 'space-y-4' : ''}`}>
            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="text-foreground">Agent Name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter agent name"
                className="bg-background border-border"
              />
            </div>

            {/* Agent Description */}
            <div className="space-y-2">
              <Label htmlFor="agent-description" className="text-foreground">Description</Label>
              <Textarea
                id="agent-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this agent does and how it processes requests..."
                className="bg-background border-border min-h-[90px]"
              />
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Agent Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'active' | 'inactive')}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select agent status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem 
                    value="active"
                    className="focus:bg-accent focus:text-accent-foreground"
                  >
                    Active - Will participate in requests
                  </SelectItem>
                  <SelectItem 
                    value="inactive"
                    className="focus:bg-accent focus:text-accent-foreground"
                  >
                    Inactive - Will not participate in requests
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="agent-model" className="text-foreground">
                Model
              </Label>
              <Input
                id="agent-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., anthropic/claude-3.5-sonnet"
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                OpenRouter provides access to multiple AI models from different providers.
              </p>
            </div>

            {/* Prompt Sequence */}
            <div className="space-y-3">
              <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
                <div className="space-y-1">
                  <Label className="text-foreground">Prompt Sequence</Label>
                  <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isMobile ? 'flex-wrap' : ''}`}>
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>Define the sequence of prompts this agent will execute when processing requests</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={handleAddPrompt}
                  className={`flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
                >
                  <Plus className="h-4 w-4" />
                  Add Prompt
                </Button>
              </div>

              <div className="space-y-3">
                {prompts.map((prompt, index) => (
                  <Card key={index} className={`bg-secondary/30 border-border/50 ${isMobile ? 'p-1' : 'p-4'}`}>
                    <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : 'pt-2'}`}>
                        <div className="flex items-center gap-2">
                          {!isMobile && <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />}
                          <span className="text-sm font-medium text-muted-foreground min-w-0">
                            Step {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExpandPrompt(index)}
                            className="p-2 hover:bg-accent hover:text-accent-foreground"
                            title="Expand textarea"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                          {prompts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePrompt(index)}
                              className={`p-2 hover:bg-destructive hover:text-destructive-foreground ${isMobile ? 'h-8 w-8' : 'mt-1'}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <Textarea
                          value={prompt}
                          onChange={(e) => handlePromptChange(index, e.target.value)}
                          placeholder={`Enter prompt step ${index + 1}...\n\nTip: Use {USER_REQUEST} to reference the user's request in your prompt.`}
                          className={`bg-background border-border resize-none min-h-[190px] ${isMobile ? 'text-sm' : ''}`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                
                {prompts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-2">No prompts defined yet</div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddPrompt}
                      className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Prompt
                    </Button>
                  </div>
                )}
              </div>

              {/* Prompt Sequence Help */}
              <div className={`bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg ${isMobile ? 'p-3' : 'p-4'} mb-6`}>
                <h4 className={`font-medium text-blue-900 dark:text-blue-100 mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  How Prompt Sequences Work
                </h4>
                <div className={`text-blue-700 dark:text-blue-300 space-y-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <p>• Each prompt in the sequence is executed in order when processing a request</p>
                  <p>• Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{USER_REQUEST}"}</code> to insert the user's request into your prompts</p>
                  <p>• Previous prompt outputs are automatically passed as context to subsequent prompts</p>
                  <p>• The final prompt's output is shown as the agent's result</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer Actions */}
        <div className={`border-t border-border/30 bg-gradient-card ${isMobile ? 'p-4' : 'p-6'} flex-shrink-0`}>
          <div className={`flex gap-3 ${isMobile ? 'flex-col-reverse' : 'justify-end'}`}>
            <Button
              variant="outline"
              onClick={onClose}
              className={`border-border hover:bg-muted ${isMobile ? 'w-full' : ''}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className={`bg-gradient-primary hover:opacity-90 ${isMobile ? 'w-full' : ''}`}
              disabled={!name.trim() || prompts.filter(p => p.trim()).length === 0}
            >
              {agent ? "Save Changes" : "Create Agent"}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Expanded Prompt Modal */}
      <Dialog open={expandedPromptIndex !== null} onOpenChange={handleCancelExpandedPrompt}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Minimize2 className="h-5 w-5" />
              Edit Prompt Step {expandedPromptIndex !== null ? expandedPromptIndex + 1 : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex-1">
              <Textarea
                value={expandedPromptValue}
                onChange={(e) => setExpandedPromptValue(e.target.value)}
                placeholder={`Enter prompt step ${expandedPromptIndex !== null ? expandedPromptIndex + 1 : ''}...\n\nTip: Use {USER_REQUEST} to reference the user's request in your prompt.`}
                className="bg-background border-border resize-none w-full h-full min-h-[400px] text-sm font-mono"
              />
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
                <p>• Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{USER_REQUEST}"}</code> to insert the user's request</p>
                <p>• Previous prompt outputs are automatically passed as context to subsequent prompts</p>
                <p>• Write clear, specific instructions for the AI to follow</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCancelExpandedPrompt}
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseExpandedPrompt}
              className="bg-gradient-primary hover:opacity-90"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}