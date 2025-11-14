import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Send, Bot, Loader2, Images, Users, X, Github, ImagePlus, EyeOff, Settings, History, Trash2, Sparkles } from "lucide-react";
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

// Constants
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_COMPRESSED_SIZE_MB = 1;

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
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Load agents from localStorage on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Initialize hideInactiveAgents from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hide-inactive-agents');
      if (saved !== null) {
        setHideInactiveAgents(saved === 'true');
      }
    } catch (e) {
      // noop: localStorage may be unavailable
    }
  }, []);

  // Persist hideInactiveAgents to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('hide-inactive-agents', String(hideInactiveAgents));
    } catch (e) {
      // noop
    }
  }, [hideInactiveAgents]);

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

  // Image compression utility function
  const compressImage = async (file: File, maxSizeMB: number = MAX_COMPRESSED_SIZE_MB): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions to maintain aspect ratio
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Adjust quality for file size
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Reduce quality if still too large
          while (dataUrl.length > maxSizeMB * 1024 * 1024 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle image file selection with improved error handling
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these images would exceed the limit
    if (selectedImages.length + files.length > MAX_IMAGES) {
      toast({
        title: "Too many images",
        description: `You can upload a maximum of ${MAX_IMAGES} images. Currently selected: ${selectedImages.length}`,
        variant: "destructive"
      });
      return;
    }

    setIsUploadingImages(true);
    const validImages: string[] = [];
    const errors: string[] = [];

    try {
      for (const file of Array.from(files)) {
        try {
          // Validate type
          if (!file.type.startsWith('image/')) {
            errors.push(`${file.name}: Invalid file type`);
            continue;
          }
          
          // Validate size
          if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            errors.push(`${file.name}: File too large (max ${MAX_IMAGE_SIZE_MB}MB)`);
            continue;
          }
          
          // Compress and process image
          const dataUrl = await compressImage(file);
          validImages.push(dataUrl);
          
        } catch (error) {
          errors.push(`${file.name}: Failed to process`);
        }
      }
      
      if (validImages.length > 0) {
        setSelectedImages(prev => [...prev, ...validImages]);
        toast({
          title: "Images uploaded",
          description: `Successfully added ${validImages.length} image(s).`,
        });
      }
      
      if (errors.length > 0) {
        toast({
          title: errors.length === files.length ? "All images failed" : "Some images failed",
          description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? ` and ${errors.length - 3} more...` : ''),
          variant: "destructive"
        });
      }
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove selected image
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all images
  const clearAllImages = () => {
    setSelectedImages([]);
    toast({
      title: "Images cleared",
      description: "All selected images have been removed.",
    });
  };

  // Trigger file input
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Create a synthetic event to reuse handleImageUpload
      const event = {
        target: { files }
      } as React.ChangeEvent<HTMLInputElement>;
      handleImageUpload(event);
    }
  };

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      // Agents are now handled locally via localStorage
      const response = await apiService.getAgents();

      // Transform agents to include runtime properties
      const transformedAgents: Agent[] = response.agents.map(agent => ({
        ...agent,
        model: agent.model || "google/gemini-2.5-flash-lite",
        provider: agent.provider || "openrouter",
        wavespeedConfig: agent.wavespeedConfig,
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
        console.log('Saving agent with provider:', agent.provider, 'wavespeedConfig:', agent.wavespeedConfig);
        await apiService.updateAgent(agent.id, {
          name: agent.name,
          description: agent.description,
          prompts: agent.prompts,
          model: agent.model,
          provider: agent.provider,
          wavespeedConfig: agent.wavespeedConfig
        });

        setAgents(agents.map(a => a.id === agent.id ? { ...agent, isBuilding: false, output: null, results: undefined, detailedSteps: undefined } : a));
      } else {
        // Create new agent
        const response = await apiService.createAgent({
          name: agent.name,
          description: agent.description || "",
          prompts: agent.prompts || [],
          model: agent.model,
          provider: agent.provider,
          wavespeedConfig: agent.wavespeedConfig
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
        model: agentData.model,
        provider: agentData.provider || 'openrouter',
        wavespeedConfig: agentData.wavespeedConfig
      });

      const newAgent: Agent = {
        ...response.agent,
        model: response.agent.model || "google/gemini-2.5-flash-lite",
        prompts: response.agent.prompts || [],
        provider: response.agent.provider || 'openrouter',
        wavespeedConfig: response.agent.wavespeedConfig,
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

    // Process each agent's request with progress tracking and staggered delays
    const buildPromises = activeAgents.map(async (agent, index) => {
      const startTime = Date.now();

      // Add staggered delay between agent starts to prevent API flooding
      // This helps distribute the load and reduces the chance of rate limiting
      if (index > 0) {
        const delay = index * 2000; // 2 second delay between each agent
        console.log(`Delaying agent ${agent.name} by ${delay}ms to prevent API flooding`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

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
      }
    } catch (error) {
      console.error('Error processing agents:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateAgentSequenceData = async (description: string) => {
    if (!description.trim()) {
      toast({
        title: "Please enter a description",
        description: "You need to provide a description to generate an agent sequence.",
        variant: "destructive"
      });
      return null;
    }

    if (!hasApiKey) {
      toast({
        title: "API key required",
        description: "Please set your API key in settings to generate agent sequences.",
        variant: "destructive"
      });
      handleOpenApiSettings();
      return null;
    }

    try {
      const words = description.trim().split(/\s+/);
      const suggestedName = words.slice(0, 3).join(' ') || 'Custom Agent';

      const { prompts } = await apiService.generateAgentPrompts(suggestedName, description);

      if (!prompts || prompts.length === 0) {
        throw new Error('No prompts generated');
      }

      return {
        name: suggestedName,
        description: description,
        prompts: prompts
      };
    } catch (error) {
      console.error('Failed to generate agent sequence:', error);
      toast({
        title: "Failed to generate agent sequence",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleGenerateAgentSequence = async () => {
    setIsGeneratingPrompts(true);

    try {
      const result = await generateAgentSequenceData(request);
      
      if (!result) {
        return;
      }

      const newAgent = await apiService.createAgent({
        name: result.name,
        description: result.description,
        prompts: result.prompts,
        model: "google/gemini-2.5-flash-lite",
        provider: "openrouter"
      });

      const transformedAgent: Agent = {
        ...newAgent.agent,
        isBuilding: false,
        output: null,
        results: undefined,
        detailedSteps: undefined
      };

      setAgents([...agents, transformedAgent]);

      toast({
        title: "Agent sequence generated!",
        description: `Created "${result.name}" with ${result.prompts.length} prompt${result.prompts.length > 1 ? 's' : ''}.`,
      });

      setRequest("");
    } finally {
      setIsGeneratingPrompts(false);
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground font-medium">
                    {selectedImages.length} of {MAX_IMAGES} images selected
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllImages}
                    className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Selected image ${index + 1}`}
                        className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage(image)}
                        title="Click to preview"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading indicator for image upload */}
            {isUploadingImages && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-background/50 p-3 rounded-lg border">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing images...
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div 
                className={`flex-1 relative transition-all duration-200 ${isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Input
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder={selectedImages.length > 0 ? "Describe what you want to create with these images..." : "Describe the website you want to create... or drag & drop images"}
                  className="bg-background border-border text-base sm:text-lg h-12 sm:h-14 pr-24 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitRequest()}
                />
                {!request.trim() && selectedImages.length === 0 && !isDragging && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={triggerImageUpload}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                    title="Upload images"
                    disabled={isUploadingImages}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                )}
                {request.trim() && !isDragging && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateAgentSequence}
                    disabled={isGeneratingPrompts || !hasApiKey}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                    title="Generate Agent Sequence"
                  >
                    {isGeneratingPrompts ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {isDragging && (
                  <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
                    <p className="text-primary font-medium">Drop images here</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmitRequest}
                disabled={(!request.trim() && selectedImages.length === 0) || agents.some(a => a.isBuilding) || isSubmitting || isUploadingImages || agents.filter(a => a.prompts.length > 0 && a.status === 'active').length === 0}
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
        onGenerateSequence={generateAgentSequenceData}
        isGeneratingSequence={isGeneratingPrompts}
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

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="w-full flex items-center justify-center">
              <img 
                src={previewImage} 
                alt="Full preview" 
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
