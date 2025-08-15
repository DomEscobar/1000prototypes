import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Send, Bot, Loader2, Images, Users, X, Github, ImagePlus, EyeOff, Settings } from "lucide-react";
import { AgentCard } from "@/components/AgentCard";
import { Agent } from "@/lib/api";
import { AgentSettingsModal } from "@/components/AgentSettingsModal";
import { OutputViewer } from "@/components/OutputViewer";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [request, setRequest] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const [hasApiKey, setHasApiKey] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [hideInactiveAgents, setHideInactiveAgents] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Load agents from localStorage on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Check if API key is present
  useEffect(() => {
    const apiKey = localStorage.getItem('openrouter-api-key');
    setHasApiKey(!!apiKey);
    
    // Listen for storage changes to update API key status
    const handleStorageChange = () => {
      const currentApiKey = localStorage.getItem('openrouter-api-key');
      setHasApiKey(!!currentApiKey);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for the custom event that might be fired by the API settings component
    const handleApiKeyUpdate = () => {
      const currentApiKey = localStorage.getItem('openrouter-api-key');
      setHasApiKey(!!currentApiKey);
    };
    
    window.addEventListener('apiKeyUpdated', handleApiKeyUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('apiKeyUpdated', handleApiKeyUpdate);
    };
  }, []);

  // Handle image file selection
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const promises = Array.from(files).map((file) => {
      return new Promise<void>((resolve) => {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: "Please select only image files.",
            variant: "destructive"
          });
          resolve();
          return;
        }

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please select images smaller than 5MB.",
            variant: "destructive"
          });
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newImages.push(e.target.result as string);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(() => {
      setSelectedImages(prev => [...prev, ...newImages]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  // Remove selected image
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Trigger file input
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      // Agents are now handled locally via localStorage
      const response = await apiService.getAgents();

      // Transform agents to include runtime properties
      const transformedAgents: Agent[] = response.agents.map(agent => ({
        ...agent,
        model: agent.model || "qwen/qwen3-coder",
        prompts: agent.prompts || [],
        isBuilding: false,
        output: null,
        results: undefined,
        detailedSteps: undefined
      }));

      setAgents(transformedAgents);

    } catch (error) {
      console.error('Failed to load agents:', error);
      toast({
        title: "Failed to load agents",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAgent = () => {
    setEditingAgent(null);
    setIsSettingsOpen(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setIsSettingsOpen(true);
  };

  const handleSaveAgent = async (agent: Agent) => {
    try {
      if (editingAgent) {
        // Update existing agent
        await apiService.updateAgent(agent.id, {
          name: agent.name,
          description: agent.description,
          prompts: agent.prompts,
          model: agent.model
        });

        setAgents(agents.map(a => a.id === agent.id ? { ...agent, isBuilding: false, output: null, results: undefined, detailedSteps: undefined } : a));
      } else {
        // Create new agent
        const response = await apiService.createAgent({
          name: agent.name,
          description: agent.description || "",
          prompts: agent.prompts || [],
          model: agent.model
        });

        const newAgent: Agent = {
          ...response.agent,
          model: response.agent.model || "gemini-2.0-flash",
          prompts: response.agent.prompts || [],
          isBuilding: false,
          output: null,
          results: undefined,
          detailedSteps: undefined
        };

        setAgents([...agents, newAgent]);
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
      toast({
        title: "Failed to save agent",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    try {
      await apiService.deleteAgent(agentId);
      setAgents(agents.filter(a => a.id !== agentId));
    } catch (error) {
      console.error('Failed to remove agent:', error);
      toast({
        title: "Failed to remove agent",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleToggleAgentStatus = async (agentId: string) => {
    try {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;

      const newStatus = agent.status === 'active' ? 'inactive' : 'active';

      await apiService.updateAgent(agentId, { status: newStatus });

      setAgents(agents.map(a =>
        a.id === agentId ? { ...a, status: newStatus } : a
      ));

    } catch (error) {
      console.error('Failed to toggle agent status:', error);
      toast({
        title: "Failed to update agent status",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleCopyAgent = async (agent: Agent) => {
    try {
      // Create a copy of the agent with a new name and reset runtime properties
      const copiedAgent = {
        ...agent,
        name: `${agent.name} (Copy)`,
        // Reset runtime properties
        isBuilding: false,
        output: null,
        results: undefined,
        detailedSteps: undefined,
        buildProgress: undefined
      };

      // Remove the id so the backend creates a new one
      const { id, ...agentData } = copiedAgent;

      const response = await apiService.createAgent({
        name: agentData.name,
        description: agentData.description || "",
        prompts: agentData.prompts || [],
        model: agentData.model
      });

      const newAgent: Agent = {
        ...response.agent,
        model: response.agent.model || "gemini-2.0-flash",
        prompts: response.agent.prompts || [],
        isBuilding: false,
        output: null,
        results: undefined,
        detailedSteps: undefined
      };

      setAgents([...agents, newAgent]);

      toast({
        title: "Agent copied successfully",
        description: `"${newAgent.name}" has been created.`,
      });

    } catch (error) {
      console.error('Failed to copy agent:', error);
      toast({
        title: "Failed to copy agent",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleSubmitRequest = async () => {
    if (!request.trim() && selectedImages.length === 0) {
      toast({
        title: "Please enter a request or upload images",
        description: "You need to provide a request or upload images for the agents to work on.",
        variant: "destructive"
      });
      return;
    }

    const activeAgents = agents.filter(agent => agent.prompts.length > 0 && agent.status === 'active');

    if (activeAgents.length === 0) {
      const hasInactiveAgents = agents.filter(agent => agent.prompts.length > 0 && agent.status === 'inactive').length > 0;
      toast({
        title: hasInactiveAgents ? "No active agents" : "No agents with prompt sequences",
        description: hasInactiveAgents
          ? "Please activate at least one agent to work on your request."
          : "Please add at least one agent with a defined prompt sequence to work on your request.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // Initialize all active agents with building state and progress
    setAgents(prev => prev.map(agent =>
      activeAgents.some(a => a.id === agent.id)
        ? {
          ...agent,
          isBuilding: true,
          output: null,
          results: undefined,
          detailedSteps: undefined,
          buildProgress: {
            currentStep: 0,
            totalSteps: agent.prompts.length,
            stepDescription: "Initializing...",
            characterCount: 0,
            startTime: Date.now()
          }
        }
        : agent
    ));

    // Process each agent's request with progress tracking
    const buildPromises = activeAgents.map(async (agent) => {
      const startTime = Date.now();

      try {
        // Create progress updater function
        const updateProgress = (step: number, description: string, charCount: number = 0) => {
          const elapsed = Date.now() - startTime;
          const avgTimePerStep = elapsed / Math.max(step + 1, 1);
          const remainingSteps = agent.prompts.length - (step + 1);
          const estimatedTimeRemaining = remainingSteps > 0 ? avgTimePerStep * remainingSteps : 0;

          setAgents(prev => prev.map(a =>
            a.id === agent.id
              ? {
                ...a,
                buildProgress: {
                  currentStep: step + 1,
                  totalSteps: agent.prompts.length,
                  stepDescription: description,
                  characterCount: charCount,
                  estimatedTimeRemaining,
                  startTime
                }
              }
              : a
          ));
        };

        // Use the streaming API for real progress updates
        const { output, results, detailedSteps } = await apiService.buildWithAgentStreaming(agent.id, request, updateProgress, selectedImages);

        setAgents(prev => prev.map(a =>
          a.id === agent.id
            ? { ...a, isBuilding: false, output, results, detailedSteps, buildProgress: undefined }
            : a
        ));

        return { agentId: agent.id, success: true, output };
      } catch (error) {
        console.error(`Agent ${agent.id} failed:`, error);

        setAgents(prev => prev.map(a =>
          a.id === agent.id
            ? { ...a, isBuilding: false, output: null, results: undefined, detailedSteps: undefined, buildProgress: undefined }
            : a
        ));

        toast({
          title: `${agent.name} failed`,
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });

        return { agentId: agent.id, success: false, error };
      }
    });

    try {
      const results = await Promise.allSettled(buildPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      if (successCount > 0) {
        toast({
          title: "Agents completed",
          description: `${successCount} out of ${activeAgents.length} agents completed successfully.`,
        });
        // Clear images after successful submission
        setSelectedImages([]);
      }
    } catch (error) {
      console.error('Error processing agents:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewOutput = (agent: Agent) => {
    setViewingAgent(agent);
  };

  const handleOpenApiSettings = () => {
    // Find and click the API settings button
    const apiKeyButton = document.querySelector('[data-api-key-settings] button') as HTMLElement;
    apiKeyButton?.click();
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Thin Navigation Header */}
        <div className="flex items-center justify-between py-3 mb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div data-api-key-settings>
              <ApiKeySettings />
            </div>
            {!hasApiKey && (
              <Badge 
                variant="destructive" 
                className="cursor-pointer text-xs px-2 py-1 animate-pulse"
                onClick={handleOpenApiSettings}
              >
                <Settings className="h-3 w-3 mr-1" />
                API Key Required
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">

            <Button
              variant="outline"
              onClick={() => navigate('/community-agents')}
              className="flex items-center gap-2 h-9 px-2 sm:px-3"
              title="Community Agents"
            >
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Agents</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/gallery')}
              className="flex items-center gap-2 h-9 px-2 sm:px-3"
              title="Gallery"
            >
              <Images className="h-4 w-4" />
              <span className="hidden sm:inline">Gallery</span>
            </Button>
          </div>
        </div>

        {/* Input Section */}
        <Card className=" bg-gradient-card border-border shadow-card">
          <div className="p-4 sm:p-6">
            {/* Image preview area */}
            {selectedImages.length > 0 && (
              <div className="mb-4 p-3 bg-background rounded-lg border">
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Selected image ${index + 1}`}
                        className="h-20 w-20 object-cover rounded border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Input
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder={selectedImages.length > 0 ? "Describe what you want to create with these images..." : "Describe the website you want to create..."}
                  className="bg-background border-border text-base sm:text-lg h-11 sm:h-12 pr-12"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitRequest()}
                />
                {!request.trim() && selectedImages.length === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={triggerImageUpload}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-2 text-muted-foreground hover:text-foreground"
                    title="Upload images"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button
                onClick={handleSubmitRequest}
                disabled={(!request.trim() && selectedImages.length === 0) || agents.some(a => a.isBuilding) || isSubmitting || agents.filter(a => a.prompts.length > 0 && a.status === 'active').length === 0}
                className="bg-gradient-primary hover:opacity-90 h-11 sm:h-12 px-6 sm:px-8 w-full sm:w-auto"
              >
                {isSubmitting || agents.some(a => a.isBuilding) ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                )}
                {isSubmitting ? "Processing..." : "Submit"}
              </Button>
            </div>

          </div>
        </Card>

        {/* Hide Inactive Agents Toggle */}
        <div className="flex gap-2 my-2 ">
          <div className="flex items-center gap-2 ">
            <Switch
              id="hide-inactive"
              checked={hideInactiveAgents}
              onCheckedChange={setHideInactiveAgents}
              className="data-[state=checked]:bg-primary"
            />
            <Label
              htmlFor="hide-inactive"
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
            >
              <EyeOff className="h-3 w-3" />
              <span className="">Hide inactive</span>
            </Label>
          </div>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading agents...</span>
          </div>
        ) : (
          <>

          </>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {agents
              .filter(agent => !hideInactiveAgents || agent.status === 'active')
              .map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={handleEditAgent}
                  onRemove={handleRemoveAgent}
                  onViewOutput={handleViewOutput}
                  onToggleStatus={handleToggleAgentStatus}
                  onCopy={handleCopyAgent}
                />
              ))}

            {/* Add Agent Card */}
            <Card className="bg-gradient-card border-border border-dashed shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer group">
              <div
                className="p-6 h-full flex items-center justify-center"
                onClick={handleAddAgent}
              >
                <div className="text-center">
                  <Plus className="h-12 w-12 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-muted-foreground group-hover:text-foreground transition-colors">
                    Add New Agent
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border text-center">
          <a
            href="https://github.com/DomEscobar/1000prototypes.git"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Github className="h-4 w-4" />
            Open Source
          </a>
        </footer>

      </div>

      {/* Modals */}
      <AgentSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        agent={editingAgent}
        onSave={handleSaveAgent}
      />

      <OutputViewer
        isOpen={!!viewingAgent}
        onClose={() => setViewingAgent(null)}
        agent={viewingAgent}
        userRequest={request}
      />



      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default Index;
