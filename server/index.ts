import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { z } from 'zod'
import OpenAI from 'openai'
import { promises as fs, promises } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import imageSize from 'image-size'

// Provider types
type ModelProvider = 'openrouter' | 'wavespeed'

interface ModelConfig {
  provider: ModelProvider
  model: string
  apiKey?: string
  baseUrl?: string
}

interface WavespeedModelConfig {
  provider: 'wavespeed'
  model: string
  apiKey?: string
  baseUrl?: string
  size?: string
  outputFormat?: string
  enableBase64Output?: boolean
  enableSyncMode?: boolean
}

// Function to get OpenRouter client with custom API key and baseURL or fallback to default
function getOpenRouter(apiKey?: string, baseUrl?: string): OpenAI {
  if (apiKey && apiKey.trim()) {
    return new OpenAI({
      baseURL: baseUrl?.trim() || "https://openrouter.ai/api/v1",
      apiKey: apiKey.trim(),
      defaultHeaders: {
        "HTTP-Referer": "https://1000prototypes.com",
        "X-Title": "1000Prototypes.space",
      }
    })
  }

  throw new Error('No OpenRouter API key provided. Please set your API key in the application settings or provide an OPEN_ROUTER environment variable.')
}

// Function to get Wavespeed client configuration
function getWavespeedClient(apiKey?: string) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('No Wavespeed API key provided. Please set your API key in the application settings.')
  }
  
  return {
    apiKey: apiKey.trim(),
    baseUrl: 'https://api.wavespeed.ai/api/v3'
  }
}

// Helper function to get image dimensions from base64 or URL
async function getImageDimensions(imageDataOrUrl: string): Promise<{ width: number; height: number } | null> {
  try {
    let imageBuffer: Buffer;
    
    // Check if it's a base64 data URL
    if (imageDataOrUrl.startsWith('data:image/')) {
      const base64Data = imageDataOrUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } 
    // Check if it's a URL
    else if (imageDataOrUrl.startsWith('http://') || imageDataOrUrl.startsWith('https://')) {
      const response = await fetch(imageDataOrUrl);
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      return null;
    }
    
    // Use image-size library to get dimensions
    const dimensions = imageSize(imageBuffer);
    
    if (dimensions.width && dimensions.height) {
      return { width: dimensions.width, height: dimensions.height };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
}

// Function to generate images using Wavespeed API
async function generateImage(config: WavespeedModelConfig, prompt: string, options: {
  images?: string[]
  size?: string
  outputFormat?: string
}): Promise<any> {
  const { model, apiKey, baseUrl, size = 'original', outputFormat = 'png' } = config
  const { images } = options
  const client = getWavespeedClient(apiKey)
  
  // Use the model name directly in the URL (e.g., "bytedance/seedream-v4" or "bytedance/seedream-v4/edit")
  const endpoint = `${client.baseUrl}/${model}`
  
  // Determine the actual size to use
  let actualSize = size;
  if (size === 'original' && images && images.length > 0) {
    // Get dimensions from the first image
    const dimensions = await getImageDimensions(images[0]);
    if (dimensions) {
      let { width, height } = dimensions;
      const totalPixels = width * height;
      const minPixels = 921600; // Wavespeed minimum requirement
      
      // Auto-upscale if image is too small
      if (totalPixels < minPixels) {
        const scaleFactor = Math.sqrt(minPixels / totalPixels);
        width = Math.ceil(width * scaleFactor);
        height = Math.ceil(height * scaleFactor);
        console.log(`Original size ${dimensions.width}*${dimensions.height} (${totalPixels} pixels) is below minimum ${minPixels}`);
        console.log(`Auto-upscaling to ${width}*${height} (${width * height} pixels) to meet requirement`);
      } else {
        console.log(`Detected original image size: ${width}*${height} (${totalPixels} pixels)`);
      }
      
      actualSize = `${width}*${height}`;
    } else {
      console.warn('Could not detect image dimensions, using default 1024*1024');
      actualSize = '1024*1024';
    }
  } else if (size === 'original') {
    // No images provided, use default
    console.log('No images provided for "original" size, using default 1024*1024');
    actualSize = '1024*1024';
  }
  
  const requestBody: any = {
    enable_base64_output: config.enableBase64Output || false,
    enable_sync_mode: config.enableSyncMode || false,
    prompt,
    size: actualSize,
    output_format: outputFormat
  }

  console.log('requestBody=========>', requestBody)

  console.log('images=========>', images?.length)
  // Add images for editing models
  if (images && images.length > 0) {
    requestBody.images = images
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${client.apiKey}`
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Wavespeed API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  const result = await response.json() as any
  const requestId = result.data.id
  console.log(`Task submitted successfully. Request ID: ${requestId}`)
  
  // Poll for result
  while (true) {
    const pollResponse = await fetch(
      `${client.baseUrl}/predictions/${requestId}/result`,
      {
        headers: {
          'Authorization': `Bearer ${client.apiKey}`
        }
      }
    )
    
    const pollResult = await pollResponse.json() as any
    
    if (pollResponse.ok) {
      const data = pollResult.data
      const status = data.status
      
      if (status === 'completed') {
        const resultUrl = data.outputs[0]
        console.log('Task completed. URL:', resultUrl)
        return pollResult
      } else if (status === 'failed') {
        console.error('Task failed:', data.error)
        throw new Error(`Image generation failed: ${data.error}`)
      } else {
        console.log('Task still processing. Status:', status)
      }
    } else {
      console.error('Error:', pollResponse.status, JSON.stringify(pollResult))
      throw new Error(`Polling failed: ${pollResponse.status} ${JSON.stringify(pollResult)}`)
    }
    
    // Wait 0.1 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 0.1 * 1000))
  }
}

// Enhanced step result interface
interface ProcessStep {
  stepNumber: number;
  originalPrompt: string;
  fullProcessedPrompt: string;
  response: string;
  thinking?: string;
  characterCount: number;
  model?: string; // Track which model was used for this step
}

// Enhanced prompt interface to support per-prompt models and providers
interface PromptStep {
  content: string;
  model?: string; // Optional model override for this specific prompt
  provider?: 'openrouter' | 'wavespeed'; // Optional provider override for this specific prompt
}

// Helper functions to work with both prompt formats
function normalizePrompts(prompts: (string | PromptStep)[]): PromptStep[] {
  return prompts.map(prompt =>
    typeof prompt === 'string' ? { content: prompt } : prompt
  );
}

function getPromptContent(prompts: (string | PromptStep)[], index: number): string {
  const prompt = prompts[index];
  return typeof prompt === 'string' ? prompt : prompt.content;
}

function getPromptModel(prompts: (string | PromptStep)[], index: number, defaultModel: string): string {
  const prompt = prompts[index];
  if (typeof prompt === 'string') {
    return defaultModel;
  }
  return prompt.model || defaultModel;
}

function getPromptProvider(prompts: (string | PromptStep)[], index: number, defaultProvider: 'openrouter' | 'wavespeed'): 'openrouter' | 'wavespeed' {
  const prompt = prompts[index];
  if (typeof prompt === 'string') {
    return defaultProvider;
  }
  return prompt.provider || defaultProvider;
}

// Universal content generation function
async function generateContent(config: ModelConfig, prompt: string, options: {
  temperature?: number
  maxTokens?: number
  stream?: boolean
  thinking?: boolean
  images?: string[]
}): Promise<any> {
  const { provider, model, apiKey, baseUrl } = config
  const { temperature = 1, maxTokens = 999999, stream = false, images } = options

  if (provider === 'openrouter') {
    const openRouter = getOpenRouter(apiKey, baseUrl)

    // Build message content
    let messageContent: any;

    if (images && images.length > 0) {
      // Multimodal message with images
      messageContent = [
        {
          type: 'text',
          text: prompt
        }
      ];

      // Add images to content
      for (const image of images) {
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: image
          }
        });
      }
    } else {
      // Text-only message
      messageContent = prompt;
    }


    const messages = [
      {
        role: 'user' as const,
        content: messageContent
      }
    ]

    if (stream) {
      return await openRouter.chat.completions.create({
        model,
        messages,
        temperature,
        stream: true
      })
    } else {
      return await openRouter.chat.completions.create({
        model,
        messages,
        temperature,
        stream: false
      })
    }
  } else if (provider === 'wavespeed') {
    const wavespeedConfig = config as WavespeedModelConfig
    const result = await generateImage(wavespeedConfig, prompt, {
      images: images || [],
      size: wavespeedConfig.size,
      outputFormat: wavespeedConfig.outputFormat
    })
    
    return result
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }
}

// Saved Output interface
interface SavedOutput {
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

// Community Agent interface
interface CommunityAgent {
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
  status: 'approved'; // All agents are automatically approved
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  lastUpdated: string;
}

// JSON Database class for saved outputs
class SavedOutputsDB {
  private dbPath: string;

  constructor() {
    this.dbPath = path.join('/data', 'saved-outputs.json');
  }

  private async ensureDataDir(): Promise<void> {
    const dataDir = path.dirname(this.dbPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private async readDB(): Promise<SavedOutput[]> {
    try {
      await this.ensureDataDir();
      const data = await fs.readFile(this.dbPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is empty, return empty array
      return [];
    }
  }

  private async writeDB(outputs: SavedOutput[]): Promise<void> {
    await this.ensureDataDir();
    await fs.writeFile(this.dbPath, JSON.stringify(outputs, null, 2));
  }

  async getAllOutputs(): Promise<SavedOutput[]> {
    return this.readDB();
  }

  async getOutput(id: string): Promise<SavedOutput | null> {
    const outputs = await this.readDB();
    return outputs.find(output => output.id === id) || null;
  }

  async saveOutput(outputData: Omit<SavedOutput, 'id' | 'createdAt'>): Promise<SavedOutput> {
    const outputs = await this.readDB();

    const newOutput: SavedOutput = {
      ...outputData,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };

    outputs.push(newOutput);
    await this.writeDB(outputs);

    return newOutput;
  }

  async updateOutput(id: string, outputData: Omit<SavedOutput, 'id' | 'createdAt'>): Promise<SavedOutput | null> {
    const outputs = await this.readDB();
    const outputIndex = outputs.findIndex(output => output.id === id);

    if (outputIndex === -1) {
      return null; // Output not found
    }

    const updatedOutput: SavedOutput = {
      ...outputs[outputIndex],
      ...outputData,
      id, // Keep the original ID
      // Keep the original createdAt, don't update it
    };

    outputs[outputIndex] = updatedOutput;
    await this.writeDB(outputs);

    return updatedOutput;
  }

  async deleteOutput(id: string): Promise<boolean> {
    const outputs = await this.readDB();
    const initialLength = outputs.length;
    const filteredOutputs = outputs.filter(output => output.id !== id);

    if (filteredOutputs.length === initialLength) {
      return false; // No output was deleted
    }

    await this.writeDB(filteredOutputs);
    return true;
  }
}

// JSON Database class for community agents
class CommunityAgentsDB {
  private dbPath: string;

  constructor() {
    this.dbPath = path.join('/data', 'community-agents.json');
  }

  private async ensureDataDir(): Promise<void> {
    const dataDir = path.dirname(this.dbPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private async readDB(): Promise<CommunityAgent[]> {
    try {
      await this.ensureDataDir();
      const data = await fs.readFile(this.dbPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is empty, return default agents
      return this.getDefaultAgents();
    }
  }

  private async writeDB(agents: CommunityAgent[]): Promise<void> {
    await this.ensureDataDir();
    await fs.writeFile(this.dbPath, JSON.stringify(agents, null, 2));
  }

  private getDefaultAgents(): CommunityAgent[] {
    return [
      {
        id: "community-5",
        name: "SaaS Landing Page Expert",
        description: "Specialized in creating high-converting SaaS product landing pages with pricing and feature sections",
        author: "saasmaster",
        prompts: [
          "You are a SaaS marketing expert with deep knowledge of B2B software positioning and conversion optimization. Analyze this request: {USER_REQUEST}.\n\nDevelop a comprehensive SaaS landing page strategy including:\n1) Value proposition and pain point identification\n2) Feature benefits communication framework\n3) Pricing strategy and tier presentation\n4) Social proof and customer success stories\n5) Free trial and onboarding flow design\n6) Competitive differentiation messaging\n\nFocus on B2B decision-maker psychology and enterprise sales funnels.",
          "You are a SaaS-focused frontend developer expert in creating conversion-optimized software landing pages.\n\nBuild a complete SaaS landing page as a single HTML file with:\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Professional, tech-forward design language\n- Interactive pricing calculator with toggle (monthly/yearly)\n- Feature comparison tables and benefit highlights\n- Customer testimonials with company logos\n- Free trial signup with progressive forms\n- Product demo video or interactive showcase\n- Integration logos and security badges\n- FAQ section with expandable items\n- Clear call-to-action hierarchy throughout\n- Include: hero, features, pricing, testimonials, demo, FAQ, signup sections"
        ],
        model: "anthropic/claude-3.5-sonnet",
        provider: "openrouter",
        tags: ["saas", "software", "pricing", "features"],
        downloads: 987,
        rating: 4.7,
        ratingCount: 134,
        status: "approved",
        featured: false,
        createdAt: "2024-01-13T11:30:00Z",
        updatedAt: "2024-01-13T11:30:00Z",
        lastUpdated: "2024-01-13T11:30:00Z"
      },
      {
        id: "community-6",
        name: "Blog & Content Site Builder",
        description: "Creates engaging blog and content websites with article layouts and content management",
        author: "contentcreator",
        prompts: [
          "You are a content strategist and UX designer specializing in blog and publishing websites. Analyze this request: {USER_REQUEST}.\n\nDesign a comprehensive content website strategy including:\n1) Content hierarchy and navigation structure\n2) Article layout and reading experience optimization\n3) Author profiles and byline presentation\n4) Categories, tags, and content discovery\n5) Search functionality and content filtering\n6) Newsletter signup and content marketing integration\n\nFocus on reader engagement and content discoverability.",
          "You are a frontend developer experienced in building content-rich websites with optimal reading experiences.\n\nCreate a complete blog/content website as a single HTML file with:\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Typography optimized for reading (proper line height, spacing)\n- Article grid with featured posts and categories\n- Individual article layouts with sharing buttons\n- Author bio sections and related posts\n- Search functionality with live filtering\n- Newsletter signup with validation\n- Comment system mockup with threading\n- Reading time estimates and progress indicators\n- Dark mode toggle for comfortable reading\n- Include: header, featured posts, article grid, individual post layout, sidebar, footer"
        ],
        model: "qwen/qwen3-coder",
        provider: "openrouter",
        tags: ["blog", "content", "articles", "cms"],
        downloads: 723,
        rating: 4.4,
        ratingCount: 89,
        status: "approved",
        featured: false,
        createdAt: "2024-01-11T13:20:00Z",
        updatedAt: "2024-01-11T13:20:00Z",
        lastUpdated: "2024-01-11T13:20:00Z"
      }
    ];
  }

  async getAllCommunityAgents(): Promise<CommunityAgent[]> {
    const agents = await this.readDB();
    // Only return approved agents by default
    return agents.filter(agent => agent.status === 'approved');
  }

  async getAllCommunityAgentsAdmin(): Promise<CommunityAgent[]> {
    return this.readDB();
  }

  async getCommunityAgent(id: string): Promise<CommunityAgent | null> {
    const agents = await this.readDB();
    return agents.find(agent => agent.id === id) || null;
  }

  async createCommunityAgent(agentData: Omit<CommunityAgent, 'id' | 'downloads' | 'rating' | 'ratingCount' | 'status' | 'featured' | 'createdAt' | 'updatedAt' | 'lastUpdated'>): Promise<CommunityAgent> {
    const agents = await this.readDB();

    const newAgent: CommunityAgent = {
      ...agentData,
      id: randomUUID(),
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      status: 'approved', // New agents are automatically approved
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    agents.push(newAgent);
    await this.writeDB(agents);

    return newAgent;
  }

  async updateCommunityAgent(id: string, updates: Partial<CommunityAgent>): Promise<CommunityAgent | null> {
    const agents = await this.readDB();
    const agentIndex = agents.findIndex(agent => agent.id === id);

    if (agentIndex === -1) {
      return null;
    }

    const updatedAgent: CommunityAgent = {
      ...agents[agentIndex],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    agents[agentIndex] = updatedAgent;
    await this.writeDB(agents);

    return updatedAgent;
  }

  async deleteCommunityAgent(id: string): Promise<boolean> {
    const agents = await this.readDB();
    const initialLength = agents.length;
    const filteredAgents = agents.filter(agent => agent.id !== id);

    if (filteredAgents.length === initialLength) {
      return false;
    }

    await this.writeDB(filteredAgents);
    return true;
  }

  async incrementDownloads(id: string): Promise<CommunityAgent | null> {
    const agents = await this.readDB();
    const agentIndex = agents.findIndex(agent => agent.id === id);

    if (agentIndex === -1) {
      return null;
    }

    agents[agentIndex].downloads += 1;
    await this.writeDB(agents);

    return agents[agentIndex];
  }

  async rateCommunityAgent(id: string, rating: number): Promise<CommunityAgent | null> {
    const agents = await this.readDB();
    const agentIndex = agents.findIndex(agent => agent.id === id);

    if (agentIndex === -1) {
      return null;
    }

    const agent = agents[agentIndex];
    const newTotalRating = (agent.rating * agent.ratingCount) + rating;
    agent.ratingCount += 1;
    agent.rating = Math.round((newTotalRating / agent.ratingCount) * 10) / 10; // Round to 1 decimal place

    await this.writeDB(agents);
    return agent;
  }
}

// Initialize databases
const savedOutputsDB = new SavedOutputsDB();
const communityAgentsDB = new CommunityAgentsDB();

// Request throttling and queuing system
class RequestThrottler {
  private requestQueue = new Map<string, Promise<any>>();
  private activeRequests = new Map<string, number>();
  private maxConcurrentRequests = 3; // Limit concurrent requests per model
  private requestDelays = new Map<string, number>(); // Track last request time per model

  async throttledGenerateContent(config: ModelConfig, prompt: string, options: any): Promise<any> {
    const key = `${config.provider}-${config.model}`;
    const now = Date.now();
    
    // Check if we need to add delay between requests for this model
    const lastRequest = this.requestDelays.get(key) || 0;
    const timeSinceLastRequest = now - lastRequest;
    const minDelay = 1000; // 1 second minimum between requests for same model
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    
    // Check concurrent request limit
    const activeCount = this.activeRequests.get(key) || 0;
    if (activeCount >= this.maxConcurrentRequests) {
      // Wait for a slot to become available
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Increment active request count
    this.activeRequests.set(key, activeCount + 1);
    this.requestDelays.set(key, Date.now());
    
    try {
      const result = await this.generateContentWithRetry(config, prompt, options);
      return result;
    } finally {
      // Decrement active request count
      const currentCount = this.activeRequests.get(key) || 0;
      this.activeRequests.set(key, Math.max(0, currentCount - 1));
    }
  }

  private async generateContentWithRetry(config: ModelConfig, prompt: string, options: any, maxRetries = 3): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await generateContent(config, prompt, options);
      } catch (error) {
        console.warn(`Request attempt ${i + 1} failed for ${config.provider}-${config.model}:`, error);
        
        if (i === maxRetries - 1) {
          throw error; // Last attempt failed
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, i);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

const requestThrottler = new RequestThrottler();

// HTML Parser function
function extractHTMLFromResponse(response: string): string {
  // Try to find HTML code blocks first (```html ... ```)
  const codeBlockMatch = response.match(/```html\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find any code blocks (``` ... ```)
  const anyCodeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
  if (anyCodeBlockMatch) {
    const content = anyCodeBlockMatch[1].trim();
    // Check if it looks like HTML
    if (content.includes('<html') || content.includes('<!DOCTYPE') || content.includes('<head') || content.includes('<body')) {
      return content;
    }
  }

  // Look for HTML document structure
  const htmlDocMatch = response.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i);
  if (htmlDocMatch) {
    return htmlDocMatch[1].trim();
  }

  // Look for HTML tag patterns
  const htmlTagMatch = response.match(/(<html[\s\S]*?<\/html>)/i);
  if (htmlTagMatch) {
    return htmlTagMatch[1].trim();
  }

  // Look for a complete HTML structure starting with any HTML tag
  const htmlStructureMatch = response.match(/(<(?:!DOCTYPE|html|head|body)[\s\S]*)/i);
  if (htmlStructureMatch) {
    let html = htmlStructureMatch[1];
    // Try to find the end of the HTML
    const lastHtmlTag = html.lastIndexOf('</html>');
    if (lastHtmlTag !== -1) {
      html = html.substring(0, lastHtmlTag + 7);
    }
    return html.trim();
  }

  // If no HTML found, return the original response
  return response;
}

// Initialize Hono app
const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors())

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API Routes
const api = new Hono()

// Streaming process prompt sequence endpoint
api.post('/process-sequence/stream', async (c) => {
  const body = await c.req.json()

  const ProcessSequenceSchema = z.object({
    prompts: z.array(z.union([
      z.string(),
      z.object({
        content: z.string(),
        model: z.string().optional(),
        provider: z.enum(['openrouter', 'wavespeed']).optional()
      })
    ])).min(1, 'At least one prompt is required'),
    userRequest: z.string().default(''),
    model: z.string().default('qwen/qwen3-coder'),
    provider: z.enum(['openrouter', 'wavespeed']).default('openrouter'),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    images: z.array(z.string()).optional(),
    wavespeedConfig: z.object({
      size: z.string().optional(),
      outputFormat: z.string().optional()
    }).optional()
  })

  try {
    const { prompts, userRequest, model: modelName, provider: defaultProvider, apiKey, baseUrl, images, wavespeedConfig } = ProcessSequenceSchema.parse(body)
    // Set up Server-Sent Events headers
    c.header('Content-Type', 'text/plain; charset=utf-8')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Headers', 'Content-Type')

    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false;

        // Helper function to safely enqueue data
        const safeEnqueue = (data: string) => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(new TextEncoder().encode(data));
            } catch (error) {
              console.warn('Failed to enqueue data, controller may be closed:', error);
              isControllerClosed = true;
            }
          }
        };

        // Helper function to safely close controller
        const safeClose = () => {
          if (!isControllerClosed) {
            try {
              controller.close();
              isControllerClosed = true;
            } catch (error) {
              console.warn('Failed to close controller:', error);
              isControllerClosed = true;
            }
          }
        };

        try {
          const results: string[] = []
          const detailedSteps: ProcessStep[] = []
          let context = ''

          // Send initial progress
          const initialData = JSON.stringify({
            type: 'progress',
            step: 0,
            totalSteps: prompts.length,
            description: 'Starting sequence...',
            characterCount: 0,
            timestamp: new Date().toISOString()
          });
          safeEnqueue(`data: ${initialData}\n\n`);

          // Process each prompt in sequence
          for (let i = 0; i < prompts.length; i++) {
            const originalPromptText = getPromptContent(prompts, i)
            const stepModel = getPromptModel(prompts, i, modelName)
            const stepProvider = getPromptProvider(prompts, i, defaultProvider)

            // Replace {USER_REQUEST} placeholder with actual user request
            let processedPrompt = originalPromptText.replace(/{USER_REQUEST}/g, userRequest)

            // Add context from previous steps
            if (context) {
              processedPrompt = `<Context>\n${context}\n</Context>\n\n` + processedPrompt
            }

            const fullProcessedPrompt = processedPrompt

            // Send step start progress
            const stepStartData = JSON.stringify({
              type: 'progress',
              step: i + 1,
              totalSteps: prompts.length,
              description: `Processing step ${i + 1} with ${stepModel}...`,
              characterCount: results.join('').length,
              timestamp: new Date().toISOString()
            });
            safeEnqueue(`data: ${stepStartData}\n\n`);

            // enable thinking when model is gemini-2.5-flash or gemini-2.5-pro
            const thinkingConfig = stepModel === 'qwen/qwen3-coder' ? {
              thinking: {
                includeThoughts: true,
                thinkingBudget: 1024
              }
            } : undefined

            try {
              promises.writeFile('processedPrompt_' + i + '.json', processedPrompt)
              
              const config: any = {
                provider: stepProvider,
                model: stepModel,
                apiKey: apiKey || c.req.header('X-API-Key'),
                baseUrl
              }
              
              if (stepProvider === 'wavespeed' && wavespeedConfig) {
                config.size = wavespeedConfig.size || 'original'
                config.outputFormat = wavespeedConfig.outputFormat || 'png'
              }
              
              const result = await requestThrottler.throttledGenerateContent(config, processedPrompt, { stream: true, thinking: thinkingConfig?.thinking?.includeThoughts, images })

              let response = ''
              let thinking = ''

              // Process streaming response and send chunks
              if (stepProvider === 'openrouter') {
                for await (const chunk of result) {
                  if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                    const content = chunk.choices[0].delta.content;
                    response += content;

                    // Send incremental progress with character updates
                    const progressData = JSON.stringify({
                      type: 'progress',
                      step: i + 1,
                      totalSteps: prompts.length,
                      description: `Processing step ${i + 1}...`,
                      characterCount: results.join('').length + response.length,
                      incrementalContent: content,
                      timestamp: new Date().toISOString()
                    });
                    safeEnqueue(`data: ${progressData}\n\n`);
                  }
                }
              } else if (stepProvider === 'wavespeed') {
                // Wavespeed returns a complete result, not a stream
                const imageUrl = result.data?.outputs?.[0] || result.image_url || result.url || result.data?.url
                
                // Create an HTML response with the image
                response = `<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Image</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
    .download-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.95);
      color: #1f2937;
      border: none;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 10;
      cursor: pointer;
    }
    .download-btn:hover {
      background: rgba(255, 255, 255, 1);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }
    .download-btn svg {
      width: 16px;
      height: 16px;
    }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="AI Generated Image" />
  <button class="download-btn" onclick="downloadImage()">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
    </svg>
    Download
  </button>
  <script>
    async function downloadImage() {
      try {
        const imageUrl = "${imageUrl}";
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ai-generated-image.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
        alert('Download failed. You can right-click the image and select "Save image as..."');
      }
    }
  </script>
</body>
</html>`

                // Send progress update
                const progressData = JSON.stringify({
                  type: 'progress',
                  step: i + 1,
                  totalSteps: prompts.length,
                  description: `Image generated successfully`,
                  characterCount: results.join('').length + response.length,
                  incrementalContent: response,
                  timestamp: new Date().toISOString()
                });
                safeEnqueue(`data: ${progressData}\n\n`);
              }

              results.push(response)

              // Store detailed step information
              detailedSteps.push({
                stepNumber: i + 1,
                originalPrompt: originalPromptText,
                fullProcessedPrompt,
                response,
                thinking: thinking || undefined,
                characterCount: response.length,
                model: stepModel
              })

              // Add this result to context for next prompts
              context = response

              // Send step completion
              const stepCompleteData = JSON.stringify({
                type: 'step_complete',
                step: i + 1,
                totalSteps: prompts.length,
                stepResult: response,
                characterCount: results.join('').length,
                timestamp: new Date().toISOString()
              });
              safeEnqueue(`data: ${stepCompleteData}\n\n`);

            } catch (error) {
              console.error(`Error processing prompt ${i + 1}:`, error)
              const errorData = JSON.stringify({
                type: 'error',
                step: i + 1,
                error: `Failed to process prompt step ${i + 1}`,
                timestamp: new Date().toISOString()
              });
              safeEnqueue(`data: ${errorData}\n\n`);
              safeClose();
              return;
            }
          }

          // The final output is the last result
          const finalOutput = results[results.length - 1] || ''
          const extractedHTML = extractHTMLFromResponse(finalOutput)

          // Send completion with final results
          const completionData = JSON.stringify({
            type: 'complete',
            results,
            detailedSteps,
            finalOutput,
            extractedHTML,
            hasHTML: extractedHTML !== finalOutput,
            timestamp: new Date().toISOString()
          });
          safeEnqueue(`data: ${completionData}\n\n`);
          safeClose();

        } catch (error) {
          console.error('Process sequence streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            timestamp: new Date().toISOString()
          });
          safeEnqueue(`data: ${errorData}\n\n`);
          safeClose();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error) {
    console.error('Process sequence stream error:', error)
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return c.json({ error: 'Failed to process sequence', details: errorMessage }, 500)
  }
})

// Process prompt sequence endpoint
api.post('/process-sequence', async (c) => {
  const body = await c.req.json()

  const ProcessSequenceSchema = z.object({
    prompts: z.array(z.union([
      z.string(),
      z.object({
        content: z.string(),
        model: z.string().optional(),
        provider: z.enum(['openrouter', 'wavespeed']).optional()
      })
    ])).min(1, 'At least one prompt is required'),
    userRequest: z.string().min(1, 'User request is required'),
    model: z.string().default('qwen/qwen3-coder'),
    provider: z.enum(['openrouter', 'wavespeed']).default('openrouter'),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    images: z.array(z.string()).optional(),
    wavespeedConfig: z.object({
      size: z.string().optional(),
      outputFormat: z.string().optional()
    }).optional()
  })



  try {
    const { prompts, userRequest, model: modelName, provider: defaultProvider, apiKey, baseUrl, images, wavespeedConfig } = ProcessSequenceSchema.parse(body)

    const results: string[] = []
    const detailedSteps: ProcessStep[] = []
    let context = ''

    // Process each prompt in sequence
    for (let i = 0; i < prompts.length; i++) {
      const originalPromptText = getPromptContent(prompts, i)
      const stepModel = getPromptModel(prompts, i, modelName)
      const stepProvider = getPromptProvider(prompts, i, defaultProvider)

      // Replace {USER_REQUEST} placeholder with actual user request
      let processedPrompt = originalPromptText.replace(/{USER_REQUEST}/g, userRequest)

      // Add context from previous steps
      if (context) {
        processedPrompt += `\n\nContext from previous steps:\n${context}`
      }

      // Store the full processed prompt
      const fullProcessedPrompt = processedPrompt

      // enable thinking when model is gemini-2.5-flash or gemini-2.5-pro
      const thinkingConfig = stepModel === 'qwen/qwen3-coder' ? {
        thinking: {
          includeThoughts: true,
          thinkingBudget: 1024
        }
      } : undefined

      console.log(`Making request with model: ${stepModel}, provider: ${stepProvider} and thinkingConfig: ${JSON.stringify(thinkingConfig)}`)

      try {
        const config: any = {
          provider: stepProvider,
          model: stepModel,
          apiKey: apiKey || c.req.header('X-API-Key'),
          baseUrl
        }
        
        if (stepProvider === 'wavespeed' && wavespeedConfig) {
          config.size = wavespeedConfig.size || '1024*1024'
          config.outputFormat = wavespeedConfig.outputFormat || 'png'
        }
        
        const result = await requestThrottler.throttledGenerateContent(config, processedPrompt, { stream: true, thinking: thinkingConfig?.thinking?.includeThoughts, images })

        let response = ''
        let thinking = ''

        // Process streaming response
        if (stepProvider === 'openrouter') {
          for await (const chunk of result) {
            if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
              response += chunk.choices[0].delta.content;
            }
          }
        } else if (stepProvider === 'wavespeed') {
          // Wavespeed returns a complete result, not a stream
          const imageUrl = result.data?.outputs?.[0] || result.image_url || result.url || result.data?.url
          
          // Create an HTML response with the image
          response = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Image</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 90%;
            text-align: center;
        }
        h1 {
            margin: 0 0 24px 0;
            color: #333;
            font-size: 28px;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .prompt {
            margin-top: 24px;
            padding: 16px;
            background: #f7f7f7;
            border-radius: 8px;
            color: #666;
            font-size: 14px;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Generated Image</h1>
        <img src="${imageUrl}" alt="Generated image">
        <div class="prompt">
            <strong>Prompt:</strong><br>
            ${processedPrompt.replace(/<Context>[\s\S]*?<\/Context>\n\n/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
    </div>
</body>
</html>`
        }

        results.push(response)

        // Store detailed step information
        detailedSteps.push({
          stepNumber: i + 1,
          originalPrompt: originalPromptText,
          fullProcessedPrompt,
          response,
          thinking: thinking || undefined,
          characterCount: response.length,
          model: stepModel
        })

        // Add this result to context for next prompts
        context += `\nStep ${i + 1} output: ${response}`

      } catch (error) {
        console.error(`Error processing prompt ${i + 1}:`, error)
        throw new Error(`Failed to process prompt step ${i + 1}`)
      }
    }

    // The final output is the last result
    const finalOutput = results[results.length - 1] || ''

    // Extract HTML from the final output
    const extractedHTML = extractHTMLFromResponse(finalOutput)

    return c.json({
      results,
      detailedSteps,
      finalOutput,
      extractedHTML,
      hasHTML: extractedHTML !== finalOutput,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Process sequence error:', error)
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return c.json({ error: 'Failed to process sequence', details: errorMessage }, 500)
  }
})

// Chat endpoint (non-streaming)
api.post('/chat', async (c) => {
  const body = await c.req.json()

  const ChatSchema = z.object({
    message: z.string().min(1, 'Message is required'),
    context: z.string().optional(),
    systemPrompt: z.string().optional(),
    images: z.array(z.string()).optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional()
  })

  try {
    const { message, context, systemPrompt, images, apiKey, baseUrl } = ChatSchema.parse(body)

    // Build the full prompt
    let fullPrompt = ''

    if (systemPrompt) {
      fullPrompt += `${systemPrompt}\n\n`
    }

    if (context) {
      fullPrompt += `Context:\n${context}\n\n`
    }

    fullPrompt += `User: ${message}`

    // Generate response using default model
    const provider = 'openrouter'
    const model = 'google/gemini-2.5-pro' // Use multimodal model for image support
    const result = await requestThrottler.throttledGenerateContent({ provider, model, apiKey: apiKey || c.req.header('X-API-Key'), baseUrl }, fullPrompt, { stream: true, thinking: true, images })

    let response = ''

    // Process streaming response
    if (provider === 'openrouter') {
      for await (const chunk of result) {
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
          response += chunk.choices[0].delta.content;
        }
      }
    }

    if (!response) {
      response = 'Sorry, I could not generate a response.'
    }

    return c.json({
      response,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Chat error:', error)
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return c.json({ error: 'Failed to process chat message', details: errorMessage }, 500)
  }
})

// Streaming chat endpoint
api.post('/chat/stream', async (c) => {
  const body = await c.req.json()

  const ChatSchema = z.object({
    message: z.string().min(1, 'Message is required'),
    context: z.string().optional(),
    systemPrompt: z.string().optional(),
    images: z.array(z.string()).optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional()
  })

  try {
    const { message, context, systemPrompt, images, apiKey, baseUrl } = ChatSchema.parse(body)

    // Build the full prompt
    let fullPrompt = ''

    if (systemPrompt) {
      fullPrompt += `${systemPrompt}\n\n`
    }

    if (context) {
      fullPrompt += `Context:\n${context}\n\n`
    }

    fullPrompt += `User: ${message}`

    // Set up Server-Sent Events headers
    c.header('Content-Type', 'text/plain; charset=utf-8')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Headers', 'Content-Type')

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const provider = 'openrouter'
          const model = 'google/gemini-2.5-pro' // Use multimodal model for image support
          const result = await requestThrottler.throttledGenerateContent({ provider, model, apiKey: apiKey || c.req.header('X-API-Key'), baseUrl }, fullPrompt, { stream: true, thinking: true, images })

          // Stream the response
          if (provider === 'openrouter') {
            for await (const chunk of result) {
              if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                const data = JSON.stringify({
                  content: chunk.choices[0].delta.content,
                  done: false,
                  timestamp: new Date().toISOString()
                });
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
              }
            }
          }

          // Send completion signal
          const finalData = JSON.stringify({
            content: '',
            done: true,
            timestamp: new Date().toISOString()
          });
          controller.enqueue(new TextEncoder().encode(`data: ${finalData}\n\n`));
          controller.close();

        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            done: true,
            timestamp: new Date().toISOString()
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Chat stream error:', error)
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return c.json({ error: 'Failed to process chat message', details: errorMessage }, 500)
  }
})

// Saved Outputs endpoints
const SavedOutputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  agentName: z.string().min(1, 'Agent name is required'),
  userRequest: z.string().min(1, 'User request is required'),
  isHTML: z.boolean(),
  model: z.string().min(1, 'Model is required'),
  isPrivate: z.boolean().default(false)
})

// Get all saved outputs (public only for gallery)
api.get('/saved-outputs', async (c) => {
  try {
    const outputs = await savedOutputsDB.getAllOutputs();
    // Filter out private outputs for the public gallery
    const publicOutputs = outputs.filter(output => !output.isPrivate);
    return c.json({ outputs: publicOutputs });
  } catch (error) {
    console.error('Get saved outputs error:', error);
    return c.json({ error: 'Failed to retrieve saved outputs' }, 500);
  }
})

// Get a specific saved output
api.get('/saved-outputs/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const output = await savedOutputsDB.getOutput(id);

    if (!output) {
      return c.json({ error: 'Saved output not found' }, 404);
    }

    return c.json({ output });
  } catch (error) {
    console.error('Get saved output error:', error);
    return c.json({ error: 'Failed to retrieve saved output' }, 500);
  }
})

// Save a new output
api.post('/saved-outputs', async (c) => {
  try {
    const body = await c.req.json();
    const outputData = SavedOutputSchema.parse(body);

    const savedOutput = await savedOutputsDB.saveOutput(outputData);

    return c.json({ output: savedOutput }, 201);
  } catch (error) {
    console.error('Save output error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to save output' }, 500);
  }
})

// Update an existing output
api.put('/saved-outputs/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const body = await c.req.json();
    const outputData = SavedOutputSchema.parse(body);

    const updatedOutput = await savedOutputsDB.updateOutput(id, outputData);

    if (!updatedOutput) {
      return c.json({ error: 'Saved output not found' }, 404);
    }

    return c.json({ output: updatedOutput });
  } catch (error) {
    console.error('Update output error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to update output' }, 500);
  }
})

// Delete a saved output
api.delete('/saved-outputs/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const deleted = await savedOutputsDB.deleteOutput(id);

    if (!deleted) {
      return c.json({ error: 'Saved output not found' }, 404);
    }

    return c.json({ message: 'Saved output deleted successfully' });
  } catch (error) {
    console.error('Delete saved output error:', error);
    return c.json({ error: 'Failed to delete saved output' }, 500);
  }
})

// Community Agents endpoints
const CommunityAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  author: z.string().min(1, 'Author is required'),
  prompts: z.array(z.string()).min(1, 'At least one prompt is required'),
  model: z.string().min(1, 'Model is required'),
  provider: z.literal('openrouter'),
  tags: z.array(z.string()).min(1, 'At least one tag is required')
})

// Get all community agents
api.get('/community-agents', async (c) => {
  try {
    const agents = await communityAgentsDB.getAllCommunityAgents();
    return c.json({ agents });
  } catch (error) {
    console.error('Get community agents error:', error);
    return c.json({ error: 'Failed to retrieve community agents' }, 500);
  }
})

// Get a specific community agent
api.get('/community-agents/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const agent = await communityAgentsDB.getCommunityAgent(id);

    if (!agent) {
      return c.json({ error: 'Community agent not found' }, 404);
    }

    return c.json({ agent });
  } catch (error) {
    console.error('Get community agent error:', error);
    return c.json({ error: 'Failed to retrieve community agent' }, 500);
  }
})

// Submit a new community agent
api.post('/community-agents', async (c) => {
  try {
    const body = await c.req.json();
    const agentData = CommunityAgentSchema.parse(body);

    const newAgent = await communityAgentsDB.createCommunityAgent(agentData);

    return c.json({ agent: newAgent }, 201);
  } catch (error) {
    console.error('Create community agent error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to create community agent' }, 500);
  }
})

// Update a community agent (admin only)
api.put('/community-agents/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const body = await c.req.json();

    const updatedAgent = await communityAgentsDB.updateCommunityAgent(id, body);

    if (!updatedAgent) {
      return c.json({ error: 'Community agent not found' }, 404);
    }

    return c.json({ agent: updatedAgent });
  } catch (error) {
    console.error('Update community agent error:', error);
    return c.json({ error: 'Failed to update community agent' }, 500);
  }
})

// Delete a community agent (admin only)
api.delete('/community-agents/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const deleted = await communityAgentsDB.deleteCommunityAgent(id);

    if (!deleted) {
      return c.json({ error: 'Community agent not found' }, 404);
    }

    return c.json({ message: 'Community agent deleted successfully' });
  } catch (error) {
    console.error('Delete community agent error:', error);
    return c.json({ error: 'Failed to delete community agent' }, 500);
  }
})

// Increment download count for a community agent
api.post('/community-agents/:id/download', async (c) => {
  const { id } = c.req.param();

  try {
    const agent = await communityAgentsDB.incrementDownloads(id);

    if (!agent) {
      return c.json({ error: 'Community agent not found' }, 404);
    }

    return c.json({ agent });
  } catch (error) {
    console.error('Increment downloads error:', error);
    return c.json({ error: 'Failed to update download count' }, 500);
  }
})

// Rate a community agent
api.post('/community-agents/:id/rate', async (c) => {
  const { id } = c.req.param();

  try {
    const body = await c.req.json();
    const { rating } = z.object({
      rating: z.number().min(1).max(5)
    }).parse(body);

    const agent = await communityAgentsDB.rateCommunityAgent(id, rating);

    if (!agent) {
      return c.json({ error: 'Community agent not found' }, 404);
    }

    return c.json({ agent });
  } catch (error) {
    console.error('Rate community agent error:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to rate community agent' }, 500);
  }
})

// Generate agent prompts endpoint
api.post('/generate-agent-prompts', async (c) => {
  const body = await c.req.json()
  
  const GeneratePromptsSchema = z.object({
    name: z.string().min(1, 'Agent name is required'),
    description: z.string().min(1, 'Agent description is required'),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional()
  })
  
  try {
    const { name, description, apiKey, baseUrl } = GeneratePromptsSchema.parse(body)
    
    const prompt = `You are an expert AI agent architect. Based on the following agent name and description, generate a comprehensive prompt sequence (array of prompts) that will enable this agent to accomplish its task.

Agent Name: ${name}
Agent Description: ${description}

Your task:
1. Analyze the agent's purpose from the name and description
2. Break down the task into logical steps
3. Create a sequence of prompts (typically 2-4 prompts) that guide the agent through the process
4. Each prompt should build on the previous one and use {USER_REQUEST} placeholder where the user's actual request will be inserted

Guidelines:
- Each prompt should be a clear instruction for one step in the process
- Prompts should use the {USER_REQUEST} placeholder to reference the user's input
- The sequence should flow logically: planning → design → development → polish (or similar workflow)
- Include specific technical requirements when relevant (e.g., Tailwind CSS, mobile-first, iframe considerations)
- Return ONLY a valid JSON array of strings, where each string is a prompt
- Do NOT include markdown code blocks, just the raw JSON array

Example structure:
[
  "Step 1: Analysis prompt with {USER_REQUEST}...",
  "Step 2: Design prompt that references previous step...",
  "Step 3: Implementation prompt with technical requirements..."
]

Return the JSON array:`
    
    const config: ModelConfig = {
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash-lite',
      apiKey: apiKey || c.req.header('X-API-Key'),
      baseUrl
    }
    
    const result = await requestThrottler.throttledGenerateContent(config, prompt, { stream: false })
    
    let response = ''
    if (config.provider === 'openrouter') {
      response = result.choices[0].message.content || ''
    }
    
    // Extract JSON array from response (might be wrapped in code blocks)
    let prompts: string[] = []
    try {
      // Try to parse as direct JSON first
      prompts = JSON.parse(response.trim())
    } catch {
      // Try to extract JSON from code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/i)
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[1])
      } else {
        // Try to find JSON array in the response
        const arrayMatch = response.match(/\[[\s\S]*?\]/)
        if (arrayMatch) {
          prompts = JSON.parse(arrayMatch[0])
        } else {
          throw new Error('Could not extract JSON array from response')
        }
      }
    }
    
    // Validate it's an array of strings
    if (!Array.isArray(prompts) || !prompts.every(p => typeof p === 'string')) {
      throw new Error('Response is not a valid array of strings')
    }
    
    return c.json({
      prompts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Generate agent prompts error:', error)
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return c.json({ error: 'Failed to generate agent prompts', details: errorMessage }, 500)
  }
})

// Image generation endpoint using Wavespeed
api.post('/generate-image', async (c) => {
  const body = await c.req.json()
  
  const ImageGenerationSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required'),
    model: z.string().min(1, 'Model is required'),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    size: z.string().optional().default('original'),
    outputFormat: z.string().optional().default('png'),
    images: z.array(z.string()).optional() // for image editing
  })
  
  try {
    const { prompt, model, apiKey, baseUrl, size, outputFormat, images } = ImageGenerationSchema.parse(body)
    
    const config: WavespeedModelConfig = {
      provider: 'wavespeed',
      model,
      apiKey: apiKey || c.req.header('X-Wavespeed-API-Key') || c.req.header('X-API-Key'),
      baseUrl,
      size,
      outputFormat
    }
    
    const result = await generateImage(config, prompt, { images, size, outputFormat })
    
    // Extract image URL from Wavespeed response structure
    // Wavespeed returns: { code, message, data: { outputs: [...] } }
    const imageUrl = result.data?.outputs?.[0] || result.image_url || result.url || result.data?.url
    
    return c.json({
      imageUrl,
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Image generation error:', error)
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return c.json({ error: 'Failed to generate image', details: errorMessage }, 500)
  }
})

// Mount API routes
app.route('/api', api)

// Catch-all for undefined routes
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Start server
const port = process.env.PORT || 3000
console.log(`🚀 Server starting on port ${port}`)

export default {
  port,
  fetch: app.fetch,
  // Increase timeout for streaming requests (4 minutes - Bun max is 255s)
  idleTimeout: 255,
  // Enable WebSocket for better streaming support
  development: process.env.NODE_ENV !== 'production'
} 