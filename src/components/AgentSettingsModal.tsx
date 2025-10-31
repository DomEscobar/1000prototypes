import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, X, GripVertical, Info, Maximize2, Minimize2, Bot } from "lucide-react";
import { Agent, PromptStep, normalizePrompts } from "@/lib/api";
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
  const [provider, setProvider] = useState<'openrouter' | 'wavespeed'>('openrouter');
  const [model, setModel] = useState("");
  const [prompts, setPrompts] = useState<PromptStep[]>([]);
  
  // Wavespeed-specific configuration
  const [imageSize, setImageSize] = useState('1024*1024');
  const [outputFormat, setOutputFormat] = useState('png');
  
  // New state for expanded textarea modal
  const [expandedPromptIndex, setExpandedPromptIndex] = useState<number | null>(null);
  const [expandedPromptValue, setExpandedPromptValue] = useState("");
  const [expandedPromptModel, setExpandedPromptModel] = useState<string>("");
  const [expandedPromptProvider, setExpandedPromptProvider] = useState<'openrouter' | 'wavespeed' | ''>('');   
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    if (agent) {
      console.log('Loading agent in modal:', { provider: agent.provider, wavespeedConfig: agent.wavespeedConfig });
      setName(agent.name);
      setDescription(agent.description || "");
      setStatus(agent.status || "active");
      setProvider(agent.provider || "openrouter");
      setModel(agent.model || (agent.provider === 'wavespeed' ? 'bytedance/seedream-v4' : 'qwen/qwen3-coder'));
      
      // Load Wavespeed configuration
      setImageSize(agent.wavespeedConfig?.size || '1024*1024');
      setOutputFormat(agent.wavespeedConfig?.outputFormat || 'png');
      
      // Convert legacy string[] format to PromptStep[] format
      const normalizedPrompts = normalizePrompts(agent.prompts || [""]);
      setPrompts(normalizedPrompts.length > 0 ? normalizedPrompts : [{ content: "" }]);
    } else {
      setName("");
      setDescription("");
      setStatus("active");
      setProvider("openrouter");
      setModel("qwen/qwen3-coder");
      setImageSize('1024*1024');
      setOutputFormat('png');
      setPrompts([{ content: "" }]);
    }
  }, [agent]);

  const handleAddPrompt = () => {
    setPrompts([...prompts, { content: "" }]);
  };

  const handleRemovePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };

  const handlePromptChange = (index: number, content: string) => {
    const updated = [...prompts];
    updated[index] = { ...updated[index], content };
    setPrompts(updated);
  };

  const handlePromptModelChange = (index: number, promptModel: string) => {
    const updated = [...prompts];
    updated[index] = { 
      ...updated[index], 
      model: promptModel === model ? undefined : promptModel.trim() || undefined // Don't store if same as default or empty
    };
    setPrompts(updated);
  };

  const handlePromptProviderChange = (index: number, promptProvider: 'openrouter' | 'wavespeed' | '') => {
    const updated = [...prompts];
    updated[index] = { 
      ...updated[index], 
      provider: promptProvider === provider || promptProvider === '' ? undefined : promptProvider as 'openrouter' | 'wavespeed' // Don't store if same as default or empty
    };
    setPrompts(updated);
  };

  // New functions for expanded modal
  const handleExpandPrompt = (index: number) => {
    setExpandedPromptIndex(index);
    setExpandedPromptValue(prompts[index].content);
    setExpandedPromptModel(prompts[index].model || "");
    setExpandedPromptProvider(prompts[index].provider || 'default');
  };

  const handleCloseExpandedPrompt = () => {
    if (expandedPromptIndex !== null) {
      const updated = [...prompts];
      updated[expandedPromptIndex] = {
        ...updated[expandedPromptIndex],
        content: expandedPromptValue,
        model: expandedPromptModel === model ? undefined : expandedPromptModel.trim() || undefined,
        provider: (expandedPromptProvider === '' || expandedPromptProvider === 'default' || expandedPromptProvider === provider) ? undefined : expandedPromptProvider as 'openrouter' | 'wavespeed'
      };
      setPrompts(updated);
    }
    setExpandedPromptIndex(null);
    setExpandedPromptValue("");
    setExpandedPromptModel("");
    setExpandedPromptProvider("");
  };

  const handleCancelExpandedPrompt = () => {
    setExpandedPromptIndex(null);
    setExpandedPromptValue("");
    setExpandedPromptModel("");
    setExpandedPromptProvider("");
  };

  const handleSave = () => {
    const filteredPrompts = prompts.filter(p => typeof p.content === 'string' && p.content.trim());
    
    const savedAgent: Agent = {
      id: agent?.id || Date.now().toString(),
      name: name || "New Agent",
      description: description || "",
      status: status,
      provider: provider,
      model: model.trim() || (provider === 'wavespeed' ? 'bytedance/seedream-v4' : 'qwen/qwen3-coder'),
      wavespeedConfig: provider === 'wavespeed' ? {
        size: imageSize,
        outputFormat: outputFormat
      } : undefined,
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

            {/* Provider Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Provider</Label>
              <Select value={provider} onValueChange={(value) => setProvider(value as 'openrouter' | 'wavespeed')}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem 
                    value="openrouter"
                    className="focus:bg-accent focus:text-accent-foreground"
                  >
                    🤖 OpenRouter - Text Generation
                  </SelectItem>
                  <SelectItem 
                    value="wavespeed"
                    className="focus:bg-accent focus:text-accent-foreground"
                  >
                    🎨 Wavespeed - Image Generation
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {provider === 'openrouter' 
                  ? 'OpenRouter provides access to various text generation models (websites, code, content)'
                  : 'Wavespeed provides AI image generation and editing capabilities'}
              </p>
            </div>

            {/* Default Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="agent-model" className="text-foreground">
                Default Model
              </Label>
              <Input
                id="agent-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={
                  provider === 'wavespeed' 
                    ? "e.g., bytedance/seedream-v4, google/nano-banana/text-to-image"
                    : "e.g., anthropic/claude-3.5-sonnet, qwen/qwen3-coder, openai/gpt-4o"
                }
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                {provider === 'wavespeed'
                  ? 'Wavespeed models: bytedance/seedream-v4 (text-to-image & editing), google/nano-banana/text-to-image'
                  : 'This model will be used for prompts that don\'t specify their own model. Popular models: anthropic/claude-3.5-sonnet, qwen/qwen3-coder, openai/gpt-4o, google/gemini-2.5-flash-lite'}
              </p>
            </div>

            {/* Wavespeed Configuration - Only show if provider is wavespeed */}
            {provider === 'wavespeed' && (
              <div className="space-y-4 p-4 border dark:border-purple-800 rounded-lg">
                <h4 className="font-medium  text-sm flex items-center gap-2">
                  🎨 Image Generation Settings
                </h4>
                
                {/* Size Selection */}
                <div className="space-y-2">
                  <Label htmlFor="image-size" className="text-foreground">Output Size</Label>
                  <Select value={imageSize} onValueChange={setImageSize}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select image size" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="512*512">512×512 (Square - Fast)</SelectItem>
                      <SelectItem value="1024*1024">1024×1024 (Square - Standard) ⭐</SelectItem>
                      <SelectItem value="2048*2048">2048×2048 (Square - High Quality)</SelectItem>
                      <SelectItem value="768*1024">768×1024 (Portrait)</SelectItem>
                      <SelectItem value="1024*768">1024×768 (Landscape)</SelectItem>
                      <SelectItem value="1536*2048">1536×2048 (Portrait - Large)</SelectItem>
                      <SelectItem value="2048*1536">2048×1536 (Landscape - Large)</SelectItem>
                      <SelectItem value="2048*3072">2048×3072 (Portrait - XL)</SelectItem>
                      <SelectItem value="3072*2048">3072×2048 (Landscape - XL)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Larger sizes take longer but produce higher quality images. Standard (1024×1024) recommended.
                  </p>
                </div>
                
                {/* Output Format */}
                <div className="space-y-2">
                  <Label htmlFor="output-format" className="text-foreground">Output Format</Label>
                  <Select value={outputFormat} onValueChange={setOutputFormat}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select output format" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="png">PNG (Best quality, lossless, larger file) ⭐</SelectItem>
                      <SelectItem value="jpg">JPG (Good quality, smaller file)</SelectItem>
                      <SelectItem value="jpeg">JPEG (Same as JPG)</SelectItem>
                      <SelectItem value="webp">WebP (Modern format, best compression)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    PNG recommended for best quality. JPG/WebP for smaller file sizes.
                  </p>
                </div>
              </div>
            )}

            {/* Prompt Sequence */}
            <div className="space-y-3">
              <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
                <div className="space-y-1">
                  <Label className="text-foreground">Prompt Sequence</Label>
                  <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isMobile ? 'flex-wrap' : ''}`}>
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>Define the sequence of prompts this agent will execute. Each prompt can use a different AI model.</span>
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
                      <div className={`flex flex-col items-center gap-2 ${isMobile ? 'justify-between' : 'pt-2'}`}>
                        <div className="flex items-center gap-1">
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
                      <div className="flex-1 space-y-3">
                        {/* Per-prompt provider and model selection */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              Provider for Step {index + 1}
                            </Label>
                            <Select
                              value={prompt.provider || 'default'}
                              onValueChange={(value) => {
                                if (value === 'default') {
                                  handlePromptProviderChange(index, '');
                                } else {
                                  handlePromptProviderChange(index, value as 'openrouter' | 'wavespeed');
                                }
                              }}
                            >
                              <SelectTrigger className="bg-background border-border h-8 text-xs">
                                <SelectValue placeholder={`Use default (${provider})`} />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="default" className="focus:bg-accent focus:text-accent-foreground">
                                  Use Default ({provider})
                                </SelectItem>
                                <SelectItem value="openrouter" className="focus:bg-accent focus:text-accent-foreground">
                                  OpenRouter
                                </SelectItem>
                                <SelectItem value="wavespeed" className="focus:bg-accent focus:text-accent-foreground">
                                  Wavespeed
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Bot className="h-3 w-3" />
                              Model for Step {index + 1}
                            </Label>
                            <Input
                              value={prompt.model || ""}
                              onChange={(e) => handlePromptModelChange(index, e.target.value)}
                              placeholder={`Leave empty to use default (${model || 'qwen/qwen3-coder'})`}
                              className="bg-background border-border h-8 text-xs"
                            />
                          </div>
                        </div>
                        
                        <Textarea
                          value={prompt.content}
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
              <div className={`${provider === 'wavespeed' ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'} border rounded-lg ${isMobile ? 'p-3' : 'p-4'} mb-6`}>
                <h4 className={`font-medium ${provider === 'wavespeed' ? 'text-purple-900 dark:text-purple-100' : 'text-blue-900 dark:text-blue-100'} mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  {provider === 'wavespeed' ? 'How Wavespeed Image Generation Works' : 'How Prompt Sequences Work'}
                </h4>
                <div className={`${provider === 'wavespeed' ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'} space-y-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {provider === 'wavespeed' ? (
                    <>
                      <p>• Your prompt will be used to generate an optimized image generation prompt first</p>
                      <p>• Use <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">{"{USER_REQUEST}"}</code> to reference the user's description</p>
                      <p>• The agent creates a detailed artistic prompt, then generates the image via Wavespeed</p>
                      <p>• For image editing: users can upload images that will be transformed based on your prompt</p>
                      <p>• Result will be displayed as a beautiful HTML page with the generated image</p>
                      <p>• Make sure to set your Wavespeed API key in Settings before using</p>
                    </>
                  ) : (
                    <>
                      <p>• Each prompt in the sequence is executed in order when processing a request</p>
                      <p>• Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{USER_REQUEST}"}</code> to insert the user's request into your prompts</p>
                      <p>• Previous prompt outputs are automatically passed as context to subsequent prompts</p>
                      <p>• Each prompt can use a different AI model - perfect for specialized tasks</p>
                      <p>• Leave model field empty to use the default model for that step</p>
                      <p>• The final prompt's output is shown as the agent's result</p>
                    </>
                  )}
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
              disabled={!name.trim() || prompts.filter(p => typeof p.content === 'string' && p.content.trim()).length === 0}
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
            {/* Provider and Model selection for expanded prompt */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Provider for this step</Label>
                <Select
                  value={expandedPromptProvider || 'default'}
                  onValueChange={(value) => {
                    if (value === 'default') {
                      setExpandedPromptProvider('');
                    } else {
                      setExpandedPromptProvider(value as 'openrouter' | 'wavespeed');
                    }
                  }}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder={`Use default (${provider})`} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="default" className="focus:bg-accent focus:text-accent-foreground">
                      Use Default ({provider})
                    </SelectItem>
                    <SelectItem value="openrouter" className="focus:bg-accent focus:text-accent-foreground">
                      OpenRouter
                    </SelectItem>
                    <SelectItem value="wavespeed" className="focus:bg-accent focus:text-accent-foreground">
                      Wavespeed
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Model for this step
                </Label>
                <Input
                  value={expandedPromptModel}
                  onChange={(e) => setExpandedPromptModel(e.target.value)}
                  placeholder={`Leave empty to use default (${model || 'qwen/qwen3-coder'})`}
                  className="bg-background border-border"
                />
              </div>
            </div>

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
                <p>• Choose the best AI model for this specific task (e.g., Claude for analysis, GPT-4 for code)</p>
                <p>• Leave model empty to use the agent's default model</p>
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