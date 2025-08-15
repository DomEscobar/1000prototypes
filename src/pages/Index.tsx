import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Send, Bot, Loader2, Images, Users, X, Github, ImagePlus, EyeOff, Settings, History } from "lucide-react";
import { AgentCard } from "@/components/AgentCard";
import { Agent } from "@/lib/api";
import { AgentSettingsModal } from "@/components/AgentSettingsModal";
import { OutputViewer } from "@/components/OutputViewer";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { PrivateHistory } from "@/components/PrivateHistory";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { PrivateHistoryManager } from "@/lib/privateHistory";

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
  const [isPrivateHistoryOpen, setIsPrivateHistoryOpen] = useState(false);
  const [privateHistoryCount, setPrivateHistoryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Load agents from localStorage on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Update private history count
  useEffect(() => {
    const updateHistoryCount = () => {
      setPrivateHistoryCount(PrivateHistoryManager.getHistoryCount());
    };
    
    updateHistoryCount();
    
    // Listen for storage changes to update count
    const handleStorageChange = () => {
      updateHistoryCount();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically since localStorage events don't fire for same-tab changes
    const interval = setInterval(updateHistoryCount, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
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
    <div className="min-h-screen bg-background p-3 sm:p-6 page-container">
      <div className="max-w-7xl mx-auto">
        {/* Clean Navigation Header */}
        <div className="flex items-center justify-between py-4 mb-8 border-b border-border/50">
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
              onClick={() => setIsPrivateHistoryOpen(true)}
              className="flex items-center gap-2 h-9 px-3 hover:bg-primary/10 hover:text-primary hover:border-primary/50 relative"
              title="Private History"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Private</span>
              {privateHistoryCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-primary text-primary-foreground"
                >
                  {privateHistoryCount > 99 ? '99+' : privateHistoryCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/community-agents')}
              className="flex items-center gap-2 h-9 px-3 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
              title="Community Agents"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Community</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/gallery')}
              className="flex items-center gap-2 h-9 px-3 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
              title="Gallery"
            >
              <Images className="h-4 w-4" />
              <span className="hidden sm:inline">Gallery</span>
            </Button>
          </div>
        </div>

        {/* Input Section */}
        <Card className="bg-gradient-card border-border shadow-card">
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
                  className="bg-background border-border text-base sm:text-lg h-12 sm:h-14 pr-12 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitRequest()}
                />
                {!request.trim() && selectedImages.length === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={triggerImageUpload}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                    title="Upload images"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button
                onClick={handleSubmitRequest}
                disabled={(!request.trim() && selectedImages.length === 0) || agents.some(a => a.isBuilding) || isSubmitting || agents.filter(a => a.prompts.length > 0 && a.status === 'active').length === 0}
                className="bg-gradient-primary hover:opacity-90 hover:shadow-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto transition-all duration-200 rounded-lg font-medium"
              >
                {isSubmitting || agents.some(a => a.isBuilding) ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                )}
                {isSubmitting ? "Processing..." : "Create"}
              </Button>
            </div>

          </div>
        </Card>

        {/* Hide Inactive Agents Toggle */}
        <div className="flex justify-between items-center my-6">
          <div className="flex items-center gap-3">
            <Switch
              id="hide-inactive"
              checked={hideInactiveAgents}
              onCheckedChange={setHideInactiveAgents}
              className="data-[state=checked]:bg-primary"
            />
            <Label
              htmlFor="hide-inactive"
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-2 font-medium"
            >
              <EyeOff className="h-4 w-4" />
              Hide inactive agents
            </Label>
          </div>
          {agents.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {agents.filter(a => !hideInactiveAgents || a.status === 'active').length} of {agents.length} agents visible
            </div>
          )}
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
            <Card className="bg-gradient-card border-border border-dashed shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer group min-h-[400px] flex items-center justify-center">
              <div
                className="p-8 text-center w-full"
                onClick={handleAddAgent}
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                      Add New Agent
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Create a custom AI agent with specific instructions and capabilities
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/50 text-center">
          <div className="space-y-4">
            <a
              href="https://github.com/DomEscobar/1000prototypes.git"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <Github className="h-4 w-4" />
              Open Source on GitHub
            </a>
            <p className="text-xs text-muted-foreground/80">
              Build beautiful prototypes with AI-powered agents
            </p>
          </div>
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
        onAgentUpdate={setViewingAgent}
      />

      <PrivateHistory
        isOpen={isPrivateHistoryOpen}
        onClose={() => setIsPrivateHistoryOpen(false)}
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
