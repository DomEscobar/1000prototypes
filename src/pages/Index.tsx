import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Send, Bot, Loader2, Images, Users, FileText, X, Github, Zap, Key, Sparkles } from "lucide-react";
import { AgentCard } from "@/components/AgentCard";
import { Agent } from "@/lib/api";
import { AgentSettingsModal } from "@/components/AgentSettingsModal";
import { OutputViewer } from "@/components/OutputViewer";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/lib/api";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Template suggestions organized by category
  const templateSuggestions = {
    landing: {
      title: "Landing Pages",
      suggestions: [
        "Simple portfolio landing page with hero section, about, and contact form",
        "Basic SaaS landing page with features, pricing, and signup",
        "Restaurant landing page with menu and location",
        "Personal blog with article list and simple navigation"
      ]
    },
    apps: {
      title: "Simple Apps",
      suggestions: [
        "Todo list app with add, edit, and delete functionality",
        "Weather app showing current conditions and forecast",
        "Calculator app with basic math operations",
        "Image gallery with grid layout and lightbox"
      ]
    },
    rooms: {
      title: "3D Rooms",
      suggestions: [
        "Virtual office room with desk, computer, and bookshelf",
        "Cozy living room with sofa, coffee table, and fireplace",
        "Modern bedroom with bed, nightstand, and window view",
        "Kitchen space with appliances, counter, and dining area"
      ]
    }
  };

  // Load agents from localStorage on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Check if this is the first visit and show welcome modal
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('1000prototypes-welcome-seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

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

  const handleSubmitRequest = async () => {
    if (!request.trim()) {
      toast({
        title: "Please enter a request",
        description: "You need to provide a request for the agents to work on.",
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
        const { output, results, detailedSteps } = await apiService.buildWithAgentStreaming(agent.id, request, updateProgress);
        
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

  const handleCloseWelcome = () => {
    localStorage.setItem('1000prototypes-welcome-seen', 'true');
    setShowWelcome(false);
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Thin Navigation Header */}
        <div className="flex items-center justify-between py-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
              1000 Prototypes
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div data-api-key-settings>
              <ApiKeySettings />
            </div>
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
        <Card className="mb-6 sm:mb-8 bg-gradient-card border-border shadow-card">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Input
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="Describe the website you want to create..."
                  className="bg-background border-border text-base sm:text-lg h-11 sm:h-12 pr-12"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitRequest()}
                />
                {!request.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-2 text-muted-foreground hover:text-foreground"
                    title="Browse templates"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSubmitRequest}
                disabled={!request.trim() || agents.some(a => a.isBuilding) || isSubmitting || agents.filter(a => a.prompts.length > 0 && a.status === 'active').length === 0}
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
            
            {/* Templates Modal/Expandable Section */}
            {showTemplates && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Template Library</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-sm bg-background border border-border rounded-md px-3 py-1.5 text-foreground min-w-[150px]"
                    >
                      <option value="all">All Categories</option>
                      {Object.entries(templateSuggestions).map(([key, category]) => (
                        <option key={key} value={key}>{category.title}</option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTemplates(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-6 pr-2">
                  {Object.entries(templateSuggestions)
                    .filter(([key]) => selectedCategory === "all" || selectedCategory === key)
                    .map(([key, category]) => (
                      <div key={key} className="space-y-3">
                        {selectedCategory === "all" && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <h4 className="text-sm font-semibold text-primary">{category.title}</h4>
                          </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {category.suggestions.map((suggestion, index) => (
                            <button
                              key={`${key}-${index}`}
                              onClick={() => {
                                setRequest(suggestion);
                                setShowTemplates(false);
                              }}
                              className="group p-4 text-left bg-gradient-to-br from-background to-accent/20 hover:from-accent/30 hover:to-accent/40 border border-border hover:border-primary/50 rounded-lg transition-all duration-300 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between">
                                <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground pr-2">
                                  {suggestion}
                                </p>
                                <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                                    <div className="w-1 h-1 bg-background rounded-full"></div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
                
                {selectedCategory !== "all" && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      ← View all categories
                    </button>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Click any template to use it, or close this panel to write your own custom request
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading agents...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={handleEditAgent}
                onRemove={handleRemoveAgent}
                onViewOutput={handleViewOutput}
                onToggleStatus={handleToggleAgentStatus}
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

      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="relative">
                <Bot className="h-8 w-8 text-primary" />
                <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1" />
              </div>
              Welcome to 1000 Prototypes!
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              Run multiple AI agents in parallel to prototype websites and apps
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* What this is */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">How it works</h3>
              </div>
              <p className="text-muted-foreground">
                Deploy multiple specialized agents that work on the same request simultaneously. Compare different approaches and pick the best parts from each.
              </p>
            </div>

            {/* API Key requirement */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">OpenRouter API Key Required</h3>
              </div>
              <p className="text-muted-foreground">
                You'll need an OpenRouter API key to access multiple AI models (Claude, GPT-4, Gemini, etc.).
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  1. Get your free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline font-medium">openrouter.ai</a><br/>
                  2. Add it using the settings button above<br/>
                  3. Start building!
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button 
              onClick={() => {
                handleCloseWelcome();
                // Open API key settings - find the actual trigger button
                setTimeout(() => {
                  const apiKeyButton = document.querySelector('[data-api-key-settings] button') as HTMLElement;
                  apiKeyButton?.click();
                }, 100);
              }}
              className="bg-gradient-primary hover:opacity-90 flex-1"
            >
              <Key className="h-4 w-4 mr-2" />
              Set up API Key
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCloseWelcome}
              className="flex-1"
            >
              I'll do this later
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center pt-2">
            This message will only show once. You can always access API settings from the top navigation.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
