import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, X, GripVertical, Info, Send, Loader2 } from "lucide-react";
import { CommunityAgent, apiService } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface AgentSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (agent: CommunityAgent) => void;
}

// Categories removed - using tags only

const MODELS = [
  "anthropic/claude-3.5-sonnet",
  "qwen/qwen3-coder",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.1-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "microsoft/wizardlm-2-8x22b"
];

export function AgentSubmissionModal({ isOpen, onClose, onSuccess }: AgentSubmissionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [model, setModel] = useState("anthropic/claude-3.5-sonnet");
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

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

  const handleAddTag = () => {
    setTags([...tags, ""]);
  };

  const handleRemoveTag = (index: number) => {
    if (tags.length > 1) {
      setTags(tags.filter((_, i) => i !== index));
    }
  };

  const handleTagChange = (index: number, value: string) => {
    const updated = [...tags];
    updated[index] = value.toLowerCase().replace(/\s+/g, '-');
    setTags(updated);
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!name.trim()) {
        toast({
          title: "Name required",
          description: "Please enter an agent name.",
          variant: "destructive"
        });
        return;
      }

      if (!description.trim()) {
        toast({
          title: "Description required", 
          description: "Please enter a description for your agent.",
          variant: "destructive"
        });
        return;
      }

      if (!author.trim()) {
        toast({
          title: "Author required",
          description: "Please enter your name or username as the author.",
          variant: "destructive"
        });
        return;
      }





      const filteredPrompts = prompts.filter(p => p.trim());
      if (filteredPrompts.length === 0) {
        toast({
          title: "Prompts required",
          description: "Please add at least one prompt sequence.",
          variant: "destructive"
        });
        return;
      }

      const filteredTags = tags.filter(t => t.trim());
      if (filteredTags.length === 0) {
        toast({
          title: "Tags required",
          description: "Please add at least one tag.",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);

      const agentData: Omit<CommunityAgent, 'id' | 'downloads' | 'rating' | 'ratingCount' | 'status' | 'featured' | 'createdAt' | 'updatedAt' | 'lastUpdated'> = {
        name: name.trim(),
        description: description.trim(),
        author: author.trim(),
        model,
        provider: "openrouter",
        prompts: filteredPrompts,
        tags: filteredTags
      };

      const response = await apiService.createCommunityAgent(agentData);

      toast({
        title: "Agent published successfully!",
        description: "Your agent has been published and is now available in the community.",
      });

      if (onSuccess) {
        onSuccess(response.agent);
      }

      // Reset form
      setName("");
      setDescription("");
      setAuthor("");
      setModel("anthropic/claude-3.5-sonnet");
      setPrompts([""]);
      setTags([""]);

      onClose();
    } catch (error) {
      console.error('Failed to submit agent:', error);
      toast({
        title: "Failed to submit agent",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[90vh]' : 'max-w-4xl max-h-[85vh]'} bg-gradient-card border-border ${isMobile ? 'p-0' : 'p-0'} flex flex-col`}>
        <DialogHeader className={`${isMobile ? 'p-4 pb-0' : 'p-6 pb-0'}`}>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Send className="h-5 w-5" />
            Publish Community Agent
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Share your agent with the community! Your agent will be published immediately.
          </p>
        </DialogHeader>

        <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-4' : 'px-6'}`}>
          <div className={`space-y-6 py-4 ${isMobile ? 'space-y-4' : ''}`}>
            
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name" className="text-foreground">Agent Name *</Label>
                  <Input
                    id="agent-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Modern E-commerce Builder"
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author" className="text-foreground">Your Name/Username *</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g., john_dev"
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what your agent does and what makes it special..."
                  className="bg-background border-border min-h-[100px]"
                />
              </div>


            </div>

            {/* Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Configuration</h3>
              
              <div className="space-y-2">
                <Label className="text-foreground">AI Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {MODELS.map((modelName) => (
                      <SelectItem 
                        key={modelName}
                        value={modelName}
                        className="focus:bg-accent focus:text-accent-foreground"
                      >
                        {modelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Tags *</Label>
                  <p className="text-xs text-muted-foreground">
                    Add relevant tags to help users discover your agent (e.g., business, ecommerce, portfolio, blog)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Tag
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {tags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      placeholder="e.g., landing-page"
                      className="bg-background border-border text-sm"
                    />
                    {tags.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTag(index)}
                        className="p-2 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt Sequence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Prompt Sequence *</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>Define the sequence of prompts your agent will execute</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPrompt}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Prompt
                </Button>
              </div>

              <div className="space-y-3">
                {prompts.map((prompt, index) => (
                  <Card key={index} className="bg-secondary/30 border-border/50 p-4">
                    <div className="flex gap-3 items-start">
                      <div className="flex items-center gap-2 pt-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <span className="text-sm font-medium text-muted-foreground min-w-0">
                          Step {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <Textarea
                          value={prompt}
                          onChange={(e) => handlePromptChange(index, e.target.value)}
                          placeholder={`Enter prompt step ${index + 1}...\n\nTip: Use {USER_REQUEST} to reference the user's request in your prompt.`}
                          className="bg-background border-border resize-none min-h-[150px] text-sm"
                        />
                      </div>
                      {prompts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePrompt(index)}
                          className="p-2 hover:bg-destructive hover:text-destructive-foreground mt-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Prompt Help */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">
                  Prompt Best Practices
                </h4>
                <div className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
                  <p>• Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{USER_REQUEST}"}</code> to insert the user's request</p>
                  <p>• Be specific about what you want the AI to create</p>
                  <p>• Include technical requirements (frameworks, libraries, etc.)</p>
                  <p>• Define the output format clearly (HTML, structure, etc.)</p>
                  <p>• Each step should build upon previous ones</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`border-t border-border/30 bg-gradient-card ${isMobile ? 'p-4' : 'p-6'} flex-shrink-0`}>
          <div className={`flex gap-3 ${isMobile ? 'flex-col-reverse' : 'justify-end'}`}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className={`border-border hover:bg-muted ${isMobile ? 'w-full' : ''}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`bg-gradient-primary hover:opacity-90 ${isMobile ? 'w-full' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publish Agent
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 