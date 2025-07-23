const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// LocalStorage key for API key
const API_KEY_STORAGE_KEY = 'openrouter-api-key';

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  prompts: string[];
  model?: string;
  provider?: 'openrouter';
  createdAt?: string;
  updatedAt?: string;
  lastActive?: string;
  isBuilding?: boolean;
  output?: string | null;
  results?: string[]; // Step-by-step processing results (legacy)
  detailedSteps?: ProcessStep[]; // Detailed step information with prompts and thinking
  buildProgress?: {
    currentStep: number;
    totalSteps: number;
    stepDescription: string;
    characterCount: number;
    estimatedTimeRemaining?: number;
    startTime?: number;
  };
}

export interface SavedOutput {
  id: string;
  title: string;
  content: string;
  agentId: string;
  agentName: string;
  userRequest: string;
  isHTML: boolean;
  model: string;
  createdAt: string;
}

export interface CommunityAgent {
  id: string;
  name: string;
  description: string;
  author: string;
  prompts: string[];
  model: string;
  provider: 'openrouter';
  tags: string[];
  downloads: number;
  rating: number;
  ratingCount: number;
  status: 'approved';
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  lastUpdated: string;
}

export interface AgentInteraction {
  agentId: string;
  userMessage: string;
  agentResponse: string;
  type: 'chat' | 'command' | 'query';
  timestamp: string;
}

export interface ProcessSequenceRequest {
  prompts: string[];
  userRequest: string;
  model?: string;
  apiKey?: string;
}

export interface ProcessStep {
  stepNumber: number;
  originalPrompt: string;
  fullProcessedPrompt: string;
  response: string;
  thinking?: string;
  characterCount: number;
}

export interface ProcessSequenceResponse {
  results: string[];
  detailedSteps: ProcessStep[];
  finalOutput: string;
  extractedHTML: string;
  hasHTML: boolean;
  timestamp: string;
}

// Default agents that will be loaded initially
const DEFAULT_AGENTS: Agent[] = [
  {
    id: "1",
    name: "HTML Website Builder",
    description: "AI agent that creates complete HTML websites through UI/UX design followed by development implementation",
    status: "active",
    prompts: [
      "Act like a high class UI UX designer with sense of award winning websites and apps cause of your unique creative complex animations.\n\nYour objective {USER_REQUEST}.\nFocus on great animation and design.\n\nAt first write down your detailed idea plan",
      "Act like a high class senior developer which is known to write entirely apps and websites In a clean single HTML file.\n\nYou stick to your principles:\n- clean code\n- Any coding principle.\n\nYou plan every step in a short roadmap before you start.\n\nGiven task: Implement now this detailed plan mentioned with completion and fine grained every detail as single html.\n\nFocus on mobile first experience.\nFocus on feature completion this a production based app.\nYour perfectionist in sizes, positions and animations.\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include a matching Google Font: <link href=\"https://fonts.googleapis.com/css2?family=[FONT_NAME]:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\"> and set it as the default font family.\n- You may use any 3rd party JavaScript and CSS libraries as needed via CDN links, such as:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n  * Vivus.js: <script src=\"https://cdn.jsdelivr.net/npm/vivus@latest/dist/vivus.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * AOS (Animate On Scroll): <link href=\"https://unpkg.com/aos@2.3.1/dist/aos.css\" rel=\"stylesheet\"> and <script src=\"https://unpkg.com/aos@2.3.1/dist/aos.js\"></script>\n  * Particles.js: <script src=\"https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js\"></script>\n  * Or any other libraries that enhance the functionality and user experience\n\nFor images, textures, icons, and more in your app, use the https://vibemedia.space API which creates images on the fly:\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n&removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n&style=game_asset - if it's a game asset. Include the style of the objects and characters at your prompt.\n\nMake sure that all images have the same or matching color tone.\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!.\n\nResponse me the single HTML file now:"
    ],
    model: "qwen/qwen3-coder",
    provider: "openrouter",
    createdAt: new Date().toISOString()
  },
  {
    id: "2", 
    name: "Creative Web Designer",
    description: "AI agent specialized in creating stunning web designs with unique animations and user experiences",
    status: "active",
    prompts: [
      "You are a world-class creative director and UI/UX designer known for crazy abstract creative websites with innovative animations and user experiences.\n\nAnalyze this request: {USER_REQUEST}.\n\nCreate a detailed design concept including:\n1) Overall visual theme and mood\n2) Color palette and typography\n3) Layout structure with at least 5 main sections\n4) Interactive elements and animation concepts\n5) User journey and experience flow.\n\nFocus on creativity, innovation, and visual impact.",
      "You are a frontend development expert who specializes in creating pixel-perfect, responsive websites with complex animations using pure HTML, CSS, and JavaScript.\n\nTake the design concept from the previous step and implement it as a complete, production-ready HTML file.\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include a matching Google Font: <link href=\"https://fonts.googleapis.com/css2?family=[FONT_NAME]:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\"> and set it as the default font family\n- You may use any 3rd party JavaScript and CSS libraries as needed via CDN links, such as:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n * Vivus.js: <script src=\"https://cdn.jsdelivr.net/npm/vivus@latest/dist/vivus.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * AOS (Animate On Scroll): <link href=\"https://unpkg.com/aos@2.3.1/dist/aos.css\" rel=\"stylesheet\"> and <script src=\"https://unpkg.com/aos@2.3.1/dist/aos.js\"></script>\n  * Particles.js: <script src=\"https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js\"></script>\n  * Or any other libraries that enhance the functionality and user experience\n- Mobile-first responsive design\n- Smooth animations and transitions\n- Clean, semantic HTML structure\n- Modern CSS techniques (Grid, Flexbox, Custom Properties)\n- Optimized performance\n- Use https://vibemedia.space API for images: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n- Include &removeBackground=true for icons/logos\n- Use FIXED IDs, no random generators\n- Ensure all images have consistent color tones.\n\nDeliver a complete, self-contained HTML file."
    ],
    model: "anthropic/claude-3.5-sonnet",
    provider: "openrouter",
    createdAt: new Date().toISOString()
  }
];

// LocalStorage key for agents
const AGENTS_STORAGE_KEY = 'creative-ai-agents';

// LocalStorage Agent Management
class LocalAgentService {
  private getStoredAgents(): Agent[] {
    try {
      const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
      if (stored) {
        const agents = JSON.parse(stored);
        // Migrate existing agents to include provider field
        const migratedAgents = this.migrateAgents(agents);
        
        // Save migrated agents back to localStorage if migration occurred
        const needsMigration = agents.some(agent => !agent.provider);
        if (needsMigration) {
          this.saveAgents(migratedAgents);
        }
        
        return migratedAgents;
      }
    } catch (error) {
      console.error('Error loading agents from localStorage:', error);
    }
    
    // Initialize with default agents if none exist
    const defaultAgents = this.migrateAgents(DEFAULT_AGENTS);
    this.saveAgents(defaultAgents);
    return defaultAgents;
  }

  // Migrate existing agents to include provider field based on their model
  private migrateAgents(agents: Agent[]): Agent[] {
    return agents.map(agent => {
      // If agent already has provider, keep it
      if (agent.provider) {
        return agent;
      }

      // All models are now OpenRouter models
      let provider: 'openrouter' = 'openrouter';

      // Update legacy Gemini models to OpenRouter equivalents
      let model = agent.model;
      if (model === 'gemini-2.0-flash' || model === 'gemini-2.5-flash' || model === 'gemini-1.5-flash') {
        model = 'qwen/qwen3-coder';
      } else if (model === 'gemini-2.5-pro' || model === 'gemini-1.5-pro') {
        model = 'anthropic/claude-3.5-sonnet';
      }

      return {
        ...agent,
        provider,
        model
      };
    });
  }

  private saveAgents(agents: Agent[]): void {
    try {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
    } catch (error) {
      console.error('Error saving agents to localStorage:', error);
      throw new Error('Failed to save agents to local storage');
    }
  }

  getAgents(): { agents: Agent[] } {
    return { agents: this.getStoredAgents() };
  }

  getAgent(id: string): { agent: Agent } {
    const agents = this.getStoredAgents();
    const agent = agents.find(a => a.id === id);
    
    if (!agent) {
      throw new Error(`Agent with id ${id} not found`);
    }
    
    return { agent };
  }

  createAgent(agentData: Omit<Agent, 'id' | 'status' | 'createdAt'>): { agent: Agent } {
    const agents = this.getStoredAgents();
    
    const newAgent: Agent = {
      ...agentData,
      id: Date.now().toString(),
      status: 'active',
      provider: 'openrouter',
      createdAt: new Date().toISOString()
    };
    
    agents.push(newAgent);
    this.saveAgents(agents);
    
    return { agent: newAgent };
  }

  updateAgent(id: string, updates: Partial<Agent>): { agent: Agent } {
    const agents = this.getStoredAgents();
    const agentIndex = agents.findIndex(a => a.id === id);
    
    if (agentIndex === -1) {
      throw new Error(`Agent with id ${id} not found`);
    }
    
    const updatedAgent: Agent = {
      ...agents[agentIndex],
      ...updates,
      id, // Ensure ID doesn't change
      provider: 'openrouter', // Ensure provider is always openrouter
      updatedAt: new Date().toISOString()
    };
    
    agents[agentIndex] = updatedAgent;
    this.saveAgents(agents);
    
    return { agent: updatedAgent };
  }

  deleteAgent(id: string): { message: string } {
    const agents = this.getStoredAgents();
    const agentIndex = agents.findIndex(a => a.id === id);
    
    if (agentIndex === -1) {
      throw new Error(`Agent with id ${id} not found`);
    }
    
    agents.splice(agentIndex, 1);
    this.saveAgents(agents);
    
    return { message: `Agent ${id} deleted successfully` };
  }

  resetToDefaults(): { agents: Agent[] } {
    this.saveAgents(DEFAULT_AGENTS);
    return { agents: DEFAULT_AGENTS };
  }
}

class ApiService {
  private localAgentService = new LocalAgentService();

  // API Key Management
  getApiKey(): string | null {
    try {
      return localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Error reading API key from localStorage:', error);
      return null;
    }
  }

  setApiKey(apiKey: string): void {
    try {
      if (apiKey.trim()) {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving API key to localStorage:', error);
      throw new Error('Failed to save API key');
    }
  }

  clearApiKey(): void {
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing API key from localStorage:', error);
    }
  }

  // Get OpenRouter API key (only provider now)
  getProviderApiKey(provider?: 'openrouter'): string | null {
    return this.getApiKey();
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const apiKey = this.getApiKey();
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-API-Key': apiKey }),
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return this.request('/health');
  }

  // Get available models and providers
  async getModels(): Promise<{
    providers: {
      openrouter: { name: string; models: string[] };
    }
  }> {
    return this.request('/api/models');
  }

  // Agent CRUD operations (now using localStorage)
  async getAgents(): Promise<{ agents: Agent[] }> {
    return this.localAgentService.getAgents();
  }

  async createAgent(agent: Omit<Agent, 'id' | 'status' | 'createdAt'>): Promise<{ agent: Agent }> {
    return this.localAgentService.createAgent(agent);
  }

  async getAgent(id: string): Promise<{ agent: Agent }> {
    return this.localAgentService.getAgent(id);
  }

  async updateAgent(id: string, agent: Partial<Agent>): Promise<{ agent: Agent }> {
    return this.localAgentService.updateAgent(id, agent);
  }

  async deleteAgent(id: string): Promise<{ message: string }> {
    return this.localAgentService.deleteAgent(id);
  }

  // Reset agents to defaults (useful for debugging/testing)
  async resetAgentsToDefaults(): Promise<{ agents: Agent[] }> {
    return this.localAgentService.resetToDefaults();
  }

  // Saved Outputs operations
  async getSavedOutputs(): Promise<{ outputs: SavedOutput[] }> {
    return this.request('/api/saved-outputs');
  }

  async getSavedOutput(id: string): Promise<{ output: SavedOutput }> {
    return this.request(`/api/saved-outputs/${id}`);
  }

  async saveOutput(outputData: Omit<SavedOutput, 'id' | 'createdAt'>): Promise<{ output: SavedOutput }> {
    return this.request('/api/saved-outputs', {
      method: 'POST',
      body: JSON.stringify(outputData),
    });
  }

  async updateSavedOutput(id: string, outputData: Omit<SavedOutput, 'id' | 'createdAt'>): Promise<{ output: SavedOutput }> {
    return this.request(`/api/saved-outputs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(outputData),
    });
  }

  async deleteSavedOutput(id: string): Promise<{ message: string }> {
    return this.request(`/api/saved-outputs/${id}`, {
      method: 'DELETE',
    });
  }

  // Community Agents API methods
  async getCommunityAgents(): Promise<{ agents: CommunityAgent[] }> {
    return this.request('/api/community-agents');
  }

  async getCommunityAgent(id: string): Promise<{ agent: CommunityAgent }> {
    return this.request(`/api/community-agents/${id}`);
  }

  async createCommunityAgent(agentData: Omit<CommunityAgent, 'id' | 'downloads' | 'rating' | 'ratingCount' | 'status' | 'featured' | 'createdAt' | 'updatedAt' | 'lastUpdated'>): Promise<{ agent: CommunityAgent }> {
    return this.request('/api/community-agents', {
      method: 'POST',
      body: JSON.stringify(agentData),
    });
  }

  async updateCommunityAgent(id: string, updates: Partial<CommunityAgent>): Promise<{ agent: CommunityAgent }> {
    return this.request(`/api/community-agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCommunityAgent(id: string): Promise<{ message: string }> {
    return this.request(`/api/community-agents/${id}`, {
      method: 'DELETE',
    });
  }

  async incrementCommunityAgentDownloads(id: string): Promise<{ agent: CommunityAgent }> {
    return this.request(`/api/community-agents/${id}/download`, {
      method: 'POST',
    });
  }

  async rateCommunityAgent(id: string, rating: number): Promise<{ agent: CommunityAgent }> {
    return this.request(`/api/community-agents/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  }

  // AI interactions
  async interactWithAgent(
    agentId: string,
    message: string,
    type: 'chat' | 'command' | 'query' = 'chat',
    context?: string
  ): Promise<{ interaction: AgentInteraction }> {
    // For basic interactions, we can use the chat endpoint
    const response = await this.chat(message, context, `You are agent ${agentId}.`);
    
    const interaction: AgentInteraction = {
      agentId,
      userMessage: message,
      agentResponse: response.response,
      type,
      timestamp: response.timestamp
    };
    
    return { interaction };
  }

  async chat(
    message: string,
    context?: string,
    systemPrompt?: string
  ): Promise<{ response: string; timestamp: string }> {
    const apiKey = this.getApiKey();
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context, systemPrompt, apiKey }),
    });
  }

  // Streaming chat with callback for real-time updates
  async chatStream(
    message: string,
    context?: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void,
    onComplete?: () => void,
    onError?: (error: string) => void
  ): Promise<void> {
    const url = `${API_BASE_URL}/api/chat/stream`;
    
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'X-API-Key': apiKey }),
        },
        body: JSON.stringify({ message, context, systemPrompt, apiKey }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Keep default error message
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              const data = JSON.parse(jsonStr);
              
              if (data.error) {
                onError?.(data.error);
                return;
              }
              
              if (data.done) {
                onComplete?.();
                return;
              }
              
              if (data.content) {
                onChunk?.(data.content);
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError, 'Line:', line);
            }
          }
        }
      }
      
      // Process any remaining data in buffer
      if (buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.slice(6).trim();
          if (jsonStr) {
            const data = JSON.parse(jsonStr);
            if (data.done) {
              onComplete?.();
            } else if (data.content) {
              onChunk?.(data.content);
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse final buffer data:', parseError);
        }
      }
      
      // Ensure completion callback is called
      onComplete?.();
      
    } catch (error) {
      console.error('Streaming error:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // Process prompt sequence
  async processPromptSequence(request: ProcessSequenceRequest): Promise<ProcessSequenceResponse> {
    const fallbackApiKey = this.getApiKey();
    const requestBody = { ...request };
    
    // Use fallback API key only if no API key is provided in request
    if (!requestBody.apiKey && fallbackApiKey) {
      requestBody.apiKey = fallbackApiKey;
    }
    
    return this.request('/api/process-sequence', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  // Streaming process prompt sequence with real-time progress updates
  async processPromptSequenceStream(
    request: ProcessSequenceRequest,
    onProgress?: (step: number, totalSteps: number, description: string, characterCount: number) => void,
    onStepComplete?: (step: number, stepResult: string) => void,
    onComplete?: (results: ProcessSequenceResponse) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    const url = `${API_BASE_URL}/api/process-sequence/stream`;
    
    try {
      const fallbackApiKey = this.getApiKey();
      const requestBody = { ...request };
      
      // Use fallback API key only if no API key is provided in request
      if (!requestBody.apiKey && fallbackApiKey) {
        requestBody.apiKey = fallbackApiKey;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(fallbackApiKey && { 'X-API-Key': fallbackApiKey }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Keep default error message
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'error') {
                onError?.(data.error);
                return;
              }
              
              if (data.type === 'progress') {
                onProgress?.(data.step, data.totalSteps, data.description, data.characterCount);
              } else if (data.type === 'step_complete') {
                onStepComplete?.(data.step, data.stepResult);
              } else if (data.type === 'complete') {
                onComplete?.({
                  results: data.results,
                  detailedSteps: data.detailedSteps,
                  finalOutput: data.finalOutput,
                  extractedHTML: data.extractedHTML,
                  hasHTML: data.hasHTML,
                  timestamp: data.timestamp
                });
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError, 'Line:', line);
            }
          }
        }
      }
      
      // Process any remaining data in buffer
      if (buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.slice(6).trim();
          if (jsonStr) {
            const data = JSON.parse(jsonStr);
            if (data.type === 'complete') {
              onComplete?.({
                results: data.results,
                detailedSteps: data.detailedSteps,
                finalOutput: data.finalOutput,
                extractedHTML: data.extractedHTML,
                hasHTML: data.hasHTML,
                timestamp: data.timestamp
              });
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse final buffer data:', parseError);
        }
      }
      
    } catch (error) {
      console.error('Streaming process sequence error:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // Build with agent using prompt sequences
  async buildWithAgent(agentId: string, userRequest: string): Promise<{ output: string; results: string[]; detailedSteps: ProcessStep[] }> {
    try {
      // Get the agent from localStorage
      const agentResponse = this.localAgentService.getAgent(agentId);
      const agent = agentResponse.agent;
      
      if (!agent.prompts || agent.prompts.length === 0) {
        throw new Error('Agent has no prompt sequence defined');
      }

      // Get the OpenRouter API key
      const apiKey = this.getApiKey();

      // Process the prompt sequence with the user request
      const requestData: ProcessSequenceRequest = {
        prompts: agent.prompts,
        userRequest,
        model: agent.model || 'qwen/qwen3-coder'
      };
      
      // Only add apiKey if it exists
      if (apiKey) {
        requestData.apiKey = apiKey;
      }
      
      const result = await this.processPromptSequence(requestData);
      
      // Return extracted HTML/final output, intermediate results, and detailed steps
      const finalOutput = result.hasHTML ? result.extractedHTML : result.finalOutput;
      return { 
        output: finalOutput, 
        results: result.results, 
        detailedSteps: result.detailedSteps || []
      };
    } catch (error) {
      console.error('buildWithAgent error:', error);
      throw error;
    }
  }

  // Build with agent using prompt sequences with progress callbacks
  async buildWithAgentStreaming(
    agentId: string, 
    userRequest: string,
    onProgress?: (step: number, description: string, characterCount: number, output?: string) => void
  ): Promise<{ output: string; results: string[]; detailedSteps: ProcessStep[] }> {
    return new Promise((resolve, reject) => {
      try {
        // Get the agent from localStorage
        const agentResponse = this.localAgentService.getAgent(agentId);
        const agent = agentResponse.agent;
        
        if (!agent.prompts || agent.prompts.length === 0) {
          reject(new Error('Agent has no prompt sequence defined'));
          return;
        }

        // Get the OpenRouter API key
        const apiKey = this.getApiKey();

        // Prepare request data
        const requestData: ProcessSequenceRequest = {
          prompts: agent.prompts,
          userRequest,
          model: agent.model || 'qwen/qwen3-coder'
        };
        
        // Only add apiKey if it exists
        if (apiKey) {
          requestData.apiKey = apiKey;
        }

        // Use the streaming endpoint for real-time progress
        this.processPromptSequenceStream(
          requestData,
                     // onProgress callback
           (step, totalSteps, description, characterCount) => {
             if (onProgress) {
               // step is 1-based from backend, but frontend expects 0-based for calculation
               onProgress(step - 1, description, characterCount);
             }
           },
          // onStepComplete callback
          (step, stepResult) => {
            if (onProgress) {
              onProgress(step - 1, `Step ${step} completed`, stepResult.length, stepResult);
            }
          },
          // onComplete callback
          (processResult) => {
            const finalOutput = processResult.hasHTML ? processResult.extractedHTML : processResult.finalOutput;
            resolve({ 
              output: finalOutput, 
              results: processResult.results,
              detailedSteps: processResult.detailedSteps || []
            });
          },
          // onError callback
          (error) => {
            reject(new Error(error));
          }
        );
        
      } catch (error) {
        console.error('buildWithAgentStreaming error:', error);
        reject(error);
      }
    });
  }
}

export const apiService = new ApiService(); 