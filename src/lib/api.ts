const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// LocalStorage keys for API key and base URL
const API_KEY_STORAGE_KEY = 'openrouter-api-key';
const BASE_URL_STORAGE_KEY = 'openrouter-base-url';

// Enhanced prompt interface to support per-prompt models and providers
export interface PromptStep {
  content: string;
  model?: string; // Optional model override for this specific prompt
  provider?: 'openrouter' | 'wavespeed'; // Optional provider override for this specific prompt
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  prompts: any[]; // Support both legacy string[] and new PromptStep[]
  model?: string; // Default model for the agent (fallback for prompts without specific model)
  provider?: 'openrouter' | 'wavespeed';
  wavespeedConfig?: {
    size?: string;          // e.g., "1024*1024", "2048*2048", "512*768"
    outputFormat?: string;  // e.g., "png", "jpg", "webp"
  };
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
  isPrivate: boolean;
}

export interface PrivateHistoryItem {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  userRequest: string;
  isHTML: boolean;
  model: string;
  createdAt: string;
  previewUrl: string;
  contentPreview?: string; // First 100 chars for preview
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
  prompts: string[] | PromptStep[]; // Support both legacy and new formats
  userRequest: string;
  model?: string; // Default model if not specified per prompt
  provider?: 'openrouter' | 'wavespeed'; // Default provider if not specified per prompt
  apiKey?: string;
  baseUrl?: string; // Support for configurable base URL
  images?: string[]; // Support for image URLs or base64 data
  wavespeedConfig?: {
    size?: string;
    outputFormat?: string;
  };
}

export interface ProcessStep {
  stepNumber: number;
  originalPrompt: string;
  fullProcessedPrompt: string;
  response: string;
  thinking?: string;
  characterCount: number;
  model?: string; // Track which model was used for this step
}

export interface ProcessSequenceResponse {
  results: string[];
  detailedSteps: ProcessStep[];
  finalOutput: string;
  extractedHTML: string;
  hasHTML: boolean;
  timestamp: string;
}

// Version for default agents - increment this when you update default agents
// HOW TO UPDATE DEFAULT AGENTS:
// 1. Make changes to DEFAULT_AGENTS array
// 2. Increment DEFAULT_AGENTS_VERSION by 1
// 3. Existing users will get new/updated agents while keeping their customizations
// 4. Only non-customized default agents will be updated automatically
const DEFAULT_AGENTS_VERSION = 13;

// Default agents that will be loaded initially
const DEFAULT_AGENTS: Agent[] = [
  {
    id: "1",
    name: "General Website Builder",
    description: "AI agent that creates complete HTML websites through UI/UX design followed by development implementation",
    status: "active",
    prompts: [
      {
        content: "Act like a high class UI UX designer with sense of award winning websites and apps cause of your unique creative complex animations.\n\nYour objective {USER_REQUEST}.\nFocus on great animation and design.\n\nAt first write down your detailed idea plan",
        model: "google/gemini-2.5-flash-lite"
      },
      "Act like a high class senior developer which is known to write entirely apps and websites In a clean single HTML file.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Design and code with iframe context in mind.**\n\nYou stick to your principles:\n- clean code\n- Any coding principle.\n\nYou plan every step in a short roadmap before you start.\n\nGiven task: Implement now this detailed plan mentioned with completion and fine grained every detail as single html.\n\nFocus on mobile first experience - design and develop for mobile devices first, then scale up to larger screens.\nFocus on feature completion this a production based app.\nYour perfectionist in sizes, positions and animations.\nEnsure the design is fully responsive across all device sizes (mobile, tablet, desktop).\n\n**Iframe-specific considerations:**\n- When using GSAP ScrollTrigger, ensure it works within iframe context\n- For scroll-based animations, use the iframe's window and document\n- Implement smooth scrolling for anchor links within the iframe\n- Consider iframe viewport constraints in responsive design\n- Avoid code that attempts to break out of iframe security context\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include a matching Google Font: <link href=\"https://fonts.googleapis.com/css2?family=[FONT_NAME]:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\"> and set it as the default font family.\n- **IMPORTANT**: Use `window.addEventListener('load')` instead of `DOMContentLoaded` for initialization\n- You may use any 3rd party JavaScript and CSS libraries as needed via CDN links, such as:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n  * GSAP ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n  * Vivus.js: <script src=\"https://cdn.jsdelivr.net/npm/vivus@latest/dist/vivus.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * Particles.js: <script src=\"https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js\"></script>\n  * Or any other libraries that enhance the functionality and user experience\n\nFor images, textures, icons, and more in your app, use the vibemedia.space API which creates images on the fly:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n\nResponse me the single HTML file now, optimized for iframe rendering:"
    ],
    model: "google/gemini-2.5-flash-lite",
    provider: "openrouter",
    createdAt: new Date().toISOString()
  },
  {
    id: "image-gen-1",
    name: "AI Image Creator",
    description: "Creates stunning AI-generated images from text descriptions using Wavespeed API (Bytedance SeeDream V4)",
    status: "inactive",
    prompts: [
      "{USER_REQUEST}, highly detailed, professional photography, 8K resolution, sharp focus, vibrant colors, stunning composition"
    ],
    model: "bytedance/seedream-v4",
    provider: "wavespeed",
    createdAt: new Date().toISOString()
  },
  {
    id: "image-edit-1",
    name: "AI Image Editor",
    description: "Transforms and edits uploaded images using AI (requires image upload + description of desired changes)",
    status: "inactive",
    prompts: [
      "{USER_REQUEST}, highly detailed, professional photography, 8K resolution, sharp focus, vibrant colors, stunning composition"
    ],
    model: "bytedance/seedream-v4/edit",
    provider: "wavespeed",
    createdAt: new Date().toISOString()
  }
];

// LocalStorage keys for agents and versioning
const AGENTS_STORAGE_KEY = 'creative-ai-agents';
const AGENTS_VERSION_KEY = 'creative-ai-agents-version';

// LocalStorage Agent Management
class LocalAgentService {
  private getStoredAgents(): Agent[] {
    try {
      const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
      const storedVersion = localStorage.getItem(AGENTS_VERSION_KEY);
      const currentStoredVersion = storedVersion ? parseInt(storedVersion, 10) : 0;

      if (stored && currentStoredVersion >= DEFAULT_AGENTS_VERSION) {
        // Version is up to date, just return stored agents with basic migration
        const agents = JSON.parse(stored);
        const migratedAgents = this.migrateAgents(agents);

        // Save migrated agents back to localStorage if basic migration occurred
        const needsMigration = agents.some(agent => !agent.provider);
        if (needsMigration) {
          this.saveAgents(migratedAgents);
        }

        return migratedAgents;
      }

      if (stored) {
        // Version is outdated, need to merge with new defaults
        const existingAgents = JSON.parse(stored);
        const mergedAgents = this.mergeWithDefaults(existingAgents);
        this.saveAgents(mergedAgents);
        this.saveVersion();
        return mergedAgents;
      }
    } catch (error) {
      console.error('Error loading agents from localStorage:', error);
    }

    // Initialize with default agents if none exist
    const defaultAgents = this.migrateAgents(DEFAULT_AGENTS);
    this.saveAgents(defaultAgents);
    this.saveVersion();
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

  private saveVersion(): void {
    try {
      localStorage.setItem(AGENTS_VERSION_KEY, DEFAULT_AGENTS_VERSION.toString());
    } catch (error) {
      console.error('Error saving agents version to localStorage:', error);
    }
  }

  private mergeWithDefaults(existingAgents: Agent[]): Agent[] {
    // Create a map of existing agents by ID for quick lookup
    const existingAgentsMap = new Map(existingAgents.map(agent => [agent.id, agent]));

    // Start with migrated existing agents
    const migratedExisting = this.migrateAgents(existingAgents);
    const result: Agent[] = [...migratedExisting];

    // Add new default agents that don't exist in user's collection
    for (const defaultAgent of DEFAULT_AGENTS) {
      if (!existingAgentsMap.has(defaultAgent.id)) {
        // This is a new default agent, add it
        const migratedDefaultAgent = this.migrateAgents([defaultAgent])[0];
        result.push(migratedDefaultAgent);
      } else {
        // Agent exists, check if default agent has been updated
        const existingAgent = existingAgentsMap.get(defaultAgent.id)!;

        // Only update if the existing agent hasn't been customized by user
        // We consider an agent "customized" if user has changed name, description, or prompts
        const isCustomized =
          existingAgent.name !== this.getOriginalDefaultAgent(defaultAgent.id)?.name ||
          existingAgent.description !== this.getOriginalDefaultAgent(defaultAgent.id)?.description ||
          JSON.stringify(existingAgent.prompts) !== JSON.stringify(this.getOriginalDefaultAgent(defaultAgent.id)?.prompts);

        if (!isCustomized) {
          // Agent hasn't been customized, safe to update with new default
          const updatedAgent: Agent = {
            ...existingAgent,
            name: defaultAgent.name,
            description: defaultAgent.description,
            prompts: defaultAgent.prompts,
            model: defaultAgent.model,
            provider: 'openrouter',
            updatedAt: new Date().toISOString()
          };

          // Replace the existing agent in result
          const index = result.findIndex(a => a.id === defaultAgent.id);
          if (index !== -1) {
            result[index] = updatedAgent;
          }
        }
      }
    }

    return result;
  }

  // Helper method to get original default agent by ID (for comparison)
  private getOriginalDefaultAgent(id: string): Agent | undefined {
    return DEFAULT_AGENTS.find(agent => agent.id === id);
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
      provider: agentData.provider || 'openrouter', // Use provided provider or default to openrouter
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
    this.saveVersion();
    return { agents: DEFAULT_AGENTS };
  }

  forceUpdate(): { agents: Agent[]; message: string } {
    try {
      // Clear version to force update
      localStorage.removeItem(AGENTS_VERSION_KEY);

      // Reload agents (this will trigger merge with defaults)
      const agents = this.getStoredAgents();

      return {
        agents,
        message: `Successfully updated agents to version ${DEFAULT_AGENTS_VERSION}`
      };
    } catch (error) {
      console.error('Error forcing agent update:', error);
      throw new Error('Failed to force update agents');
    }
  }

  getVersionInfo(): {
    currentVersion: number;
    storedVersion: number;
    isUpToDate: boolean;
    totalAgents: number;
    defaultAgents: number;
  } {
    try {
      const storedVersion = localStorage.getItem(AGENTS_VERSION_KEY);
      const currentStoredVersion = storedVersion ? parseInt(storedVersion, 10) : 0;
      const agents = this.getStoredAgents();

      return {
        currentVersion: DEFAULT_AGENTS_VERSION,
        storedVersion: currentStoredVersion,
        isUpToDate: currentStoredVersion >= DEFAULT_AGENTS_VERSION,
        totalAgents: agents.length,
        defaultAgents: DEFAULT_AGENTS.length
      };
    } catch (error) {
      console.error('Error getting version info:', error);
      return {
        currentVersion: DEFAULT_AGENTS_VERSION,
        storedVersion: 0,
        isUpToDate: false,
        totalAgents: 0,
        defaultAgents: DEFAULT_AGENTS.length
      };
    }
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

  // Base URL Management
  getBaseUrl(): string | null {
    try {
      return localStorage.getItem(BASE_URL_STORAGE_KEY);
    } catch (error) {
      console.error('Error reading base URL from localStorage:', error);
      return null;
    }
  }

  setBaseUrl(baseUrl: string): void {
    try {
      if (baseUrl.trim()) {
        localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl.trim());
      } else {
        localStorage.removeItem(BASE_URL_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving base URL to localStorage:', error);
      throw new Error('Failed to save base URL');
    }
  }

  clearBaseUrl(): void {
    try {
      localStorage.removeItem(BASE_URL_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing base URL from localStorage:', error);
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

  // Force update agents to latest version (useful for debugging/testing)
  async forceUpdateAgents(): Promise<{ agents: Agent[]; message: string }> {
    return this.localAgentService.forceUpdate();
  }

  // Get current agents version info
  async getAgentsVersionInfo(): Promise<{
    currentVersion: number;
    storedVersion: number;
    isUpToDate: boolean;
    totalAgents: number;
    defaultAgents: number;
  }> {
    return this.localAgentService.getVersionInfo();
  }

  // Generate agent prompts
  async generateAgentPrompts(name: string, description: string): Promise<{ prompts: string[] }> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();

    return this.request('/api/generate-agent-prompts', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        ...(apiKey && { apiKey }),
        ...(baseUrl && { baseUrl }),
      }),
    });
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
    systemPrompt?: string,
    images?: string[]
  ): Promise<{ response: string; timestamp: string }> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context, systemPrompt, images, apiKey, baseUrl }),
    });
  }

  // Streaming chat with callback for real-time updates
  async chatStream(
    message: string,
    context?: string,
    systemPrompt?: string,
    images?: string[],
    onChunk?: (chunk: string) => void,
    onComplete?: () => void,
    onError?: (error: string) => void
  ): Promise<void> {
    const url = `${API_BASE_URL}/api/chat/stream`;

    try {
      const apiKey = this.getApiKey();
      const baseUrl = this.getBaseUrl();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'X-API-Key': apiKey }),
        },
        body: JSON.stringify({ message, context, systemPrompt, images, apiKey, baseUrl }),
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
    const baseUrl = this.getBaseUrl();
    const requestBody = { ...request };

    // Use fallback API key only if no API key is provided in request
    if (!requestBody.apiKey && fallbackApiKey) {
      requestBody.apiKey = fallbackApiKey;
    }

    // Add baseURL to request
    if (baseUrl) {
      requestBody.baseUrl = baseUrl;
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
      const baseUrl = this.getBaseUrl();
      const requestBody = { ...request };

      // Use fallback API key only if no API key is provided in request
      if (!requestBody.apiKey && fallbackApiKey) {
        requestBody.apiKey = fallbackApiKey;
      }

      // Add baseURL to request
      if (baseUrl) {
        requestBody.baseUrl = baseUrl;
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
        model: agent.model || 'qwen/qwen3-coder',
        provider: agent.provider || 'openrouter'
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
    onProgress?: (step: number, description: string, characterCount: number, output?: string) => void,
    images?: string[]
  ): Promise<{ output: string; results: string[]; detailedSteps: ProcessStep[] }> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get the agent from localStorage
        const agentResponse = this.localAgentService.getAgent(agentId);
        const agent = agentResponse.agent;

        if (!agent.prompts || agent.prompts.length === 0) {
          reject(new Error('Agent has no prompt sequence defined'));
          return;
        }

        // Use unified prompt sequence flow for both OpenRouter and Wavespeed
        const apiKey = agent.provider === 'wavespeed' ? (this.getWavespeedApiKey() || this.getApiKey()) : this.getApiKey();

        // Prepare request data
        const requestData: ProcessSequenceRequest = {
          prompts: agent.prompts,
          userRequest,
          model: agent.model || (agent.provider === 'wavespeed' ? 'bytedance/seedream-v4' : 'qwen/qwen3-coder'),
          provider: agent.provider || 'openrouter',
          images
        };

        // Add wavespeed configuration if this is a wavespeed agent
        if (agent.provider === 'wavespeed' && agent.wavespeedConfig) {
          requestData.wavespeedConfig = agent.wavespeedConfig;
        }

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

  // Generate image using Wavespeed API
  async generateImage(request: {
    prompt: string
    model: string
    size?: string
    outputFormat?: string
    images?: string[]
    apiKey?: string
  }): Promise<{ imageUrl: string; result: any; timestamp: string }> {
    const apiKey = request.apiKey || this.getWavespeedApiKey() || this.getApiKey()
    console.log("===========", apiKey)
    const response = await fetch(`${API_BASE_URL}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-API-Key': apiKey })
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || errorData.error || `Image generation failed: ${response.statusText}`)
    }

    return await response.json()
  }

  // Get Wavespeed API key from localStorage
  getWavespeedApiKey(): string | null {
    try {
      return localStorage.getItem('wavespeed-api-key')
    } catch (error) {
      console.error('Error reading Wavespeed API key:', error)
      return null
    }
  }

  // Save Wavespeed API key to localStorage
  saveWavespeedApiKey(apiKey: string): void {
    try {
      if (apiKey.trim()) {
        localStorage.setItem('wavespeed-api-key', apiKey.trim())
      } else {
        localStorage.removeItem('wavespeed-api-key')
      }
    } catch (error) {
      console.error('Error saving Wavespeed API key:', error)
      throw new Error('Failed to save Wavespeed API key')
    }
  }
}

// Helper functions to work with both prompt formats
export function normalizePrompts(prompts: string[] | PromptStep[]): PromptStep[] {
  if (!Array.isArray(prompts) || prompts.length === 0) {
    return [{ content: "" }];
  }

  // Handle mixed arrays - normalize each element individually
  return prompts.map(prompt => {
    if (typeof prompt === 'string') {
      // Legacy string format
      return { content: String(prompt) };
    } else if (prompt && typeof prompt === 'object') {
      // PromptStep object format, ensure content is always a string
      return {
        ...prompt,
        content: typeof prompt.content === 'string' ? prompt.content : String(prompt.content || "")
      };
    } else {
      // Fallback for any unexpected format
      return { content: String(prompt || "") };
    }
  });
}

export function getPromptContent(prompts: string[] | PromptStep[], index: number): string {
  if (typeof prompts[0] === 'string') {
    return (prompts as string[])[index];
  }
  return (prompts as PromptStep[])[index].content;
}

export function getPromptModel(prompts: string[] | PromptStep[], index: number): string | undefined {
  if (typeof prompts[0] === 'string') {
    return undefined; // Legacy format doesn't have per-prompt models
  }
  return (prompts as PromptStep[])[index].model;
}

export function getPromptProvider(prompts: string[] | PromptStep[], index: number, defaultProvider: 'openrouter' | 'wavespeed' = 'openrouter'): 'openrouter' | 'wavespeed' {
  if (typeof prompts[0] === 'string') {
    return defaultProvider; // Legacy format uses default provider
  }
  return (prompts as PromptStep[])[index].provider || defaultProvider;
}

export const apiService = new ApiService(); 