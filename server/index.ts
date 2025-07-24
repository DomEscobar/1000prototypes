import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { z } from 'zod'
import OpenAI from 'openai'
import { promises as fs, promises } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Provider types
type ModelProvider = 'openrouter'

interface ModelConfig {
  provider: ModelProvider
  model: string
  apiKey?: string
}

// Function to get OpenRouter client with custom API key or fallback to default
function getOpenRouter(apiKey?: string): OpenAI {
  if (apiKey && apiKey.trim()) {
    return new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey.trim(),
      defaultHeaders: {
        "HTTP-Referer": "https://1000prototypes.com",
        "X-Title": "1000Prototypes.space",
      }
    })
  }

  throw new Error('No OpenRouter API key provided. Please set your API key in the application settings or provide an OPEN_ROUTER environment variable.')
}

// Enhanced step result interface
interface ProcessStep {
  stepNumber: number;
  originalPrompt: string;
  fullProcessedPrompt: string;
  response: string;
  thinking?: string;
  characterCount: number;
}

// Universal content generation function
async function generateContent(config: ModelConfig, prompt: string, options: {
  temperature?: number
  maxTokens?: number
  stream?: boolean
  thinking?: boolean
}): Promise<any> {
  const { provider, model, apiKey } = config
  const { temperature = 1, maxTokens = 999999, stream = false } = options

  if (provider === 'openrouter') {
    const openRouter = getOpenRouter(apiKey)

    const messages = [
      {
        role: 'user' as const,
        content: prompt
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
    prompts: z.array(z.string()).min(1, 'At least one prompt is required'),
    userRequest: z.string().min(1, 'User request is required'),
    model: z.string().default('qwen/qwen3-coder'),
    apiKey: z.string().optional()
  })

  try {
    const { prompts, userRequest, model: modelName, apiKey } = ProcessSequenceSchema.parse(body)

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
            const originalPrompt = prompts[i]

            // Replace {USER_REQUEST} placeholder with actual user request
            let processedPrompt = originalPrompt.replace(/{USER_REQUEST}/g, userRequest)

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
              description: `Processing step ${i + 1}...`,
              characterCount: results.join('').length,
              timestamp: new Date().toISOString()
            });
            safeEnqueue(`data: ${stepStartData}\n\n`);

            // enable thinking when model is gemini-2.5-flash or gemini-2.5-pro
            const thinkingConfig = modelName === 'qwen/qwen3-coder' ? {
              thinking: {
                includeThoughts: true,
                thinkingBudget: 1024
              }
            } : undefined

            try {
              promises.writeFile('processedPrompt_' + i + '.json', processedPrompt)
              const provider = "openrouter";
              const result = await generateContent({ provider, model: modelName, apiKey: apiKey || c.req.header('X-API-Key') }, processedPrompt, { stream: true, thinking: thinkingConfig?.thinking?.includeThoughts })

              let response = ''
              let thinking = ''

              // Process streaming response and send chunks
              if (provider === 'openrouter') {
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
              }

              results.push(response)

              // Store detailed step information
              detailedSteps.push({
                stepNumber: i + 1,
                originalPrompt,
                fullProcessedPrompt,
                response,
                thinking: thinking || undefined,
                characterCount: response.length
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
    prompts: z.array(z.string()).min(1, 'At least one prompt is required'),
    userRequest: z.string().min(1, 'User request is required'),
    model: z.string().default('qwen/qwen3-coder'),
    apiKey: z.string().optional()
  })



  try {
    const { prompts, userRequest, model: modelName, apiKey } = ProcessSequenceSchema.parse(body)

    const results: string[] = []
    const detailedSteps: ProcessStep[] = []
    let context = ''

    // Process each prompt in sequence
    for (let i = 0; i < prompts.length; i++) {
      const originalPrompt = prompts[i]

      // Replace {USER_REQUEST} placeholder with actual user request
      let processedPrompt = originalPrompt.replace(/{USER_REQUEST}/g, userRequest)

      // Add context from previous steps
      if (context) {
        processedPrompt += `\n\nContext from previous steps:\n${context}`
      }

      // Store the full processed prompt
      const fullProcessedPrompt = processedPrompt

      // enable thinking when model is gemini-2.5-flash or gemini-2.5-pro
      const thinkingConfig = modelName === 'qwen/qwen3-coder' ? {
        thinking: {
          includeThoughts: true,
          thinkingBudget: 1024
        }
      } : undefined

      console.log(`Making request with model: ${modelName} and thinkingConfig: ${JSON.stringify(thinkingConfig)}`)

      try {
        const provider = "openrouter";
        const result = await generateContent({ provider, model: modelName, apiKey: apiKey || c.req.header('X-API-Key') }, processedPrompt, { stream: true, thinking: thinkingConfig?.thinking?.includeThoughts })

        let response = ''
        let thinking = ''

        // Process streaming response
        if (provider === 'openrouter') {
          for await (const chunk of result) {
            if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
              response += chunk.choices[0].delta.content;
            }
          }
        }

        results.push(response)

        // Store detailed step information
        detailedSteps.push({
          stepNumber: i + 1,
          originalPrompt,
          fullProcessedPrompt,
          response,
          thinking: thinking || undefined,
          characterCount: response.length
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
    apiKey: z.string().optional()
  })

  try {
    const { message, context, systemPrompt, apiKey } = ChatSchema.parse(body)

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
    const model = 'qwen/qwen3-coder'
    const result = await generateContent({ provider, model, apiKey: apiKey || c.req.header('X-API-Key') }, fullPrompt, { stream: true, thinking: true })

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
    apiKey: z.string().optional()
  })

  try {
    const { message, context, systemPrompt, apiKey } = ChatSchema.parse(body)

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
          const model = 'qwen/qwen3-coder'
          const result = await generateContent({ provider, model, apiKey: apiKey || c.req.header('X-API-Key') }, fullPrompt, { stream: true, thinking: true })

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
  model: z.string().min(1, 'Model is required')
})

// Get all saved outputs
api.get('/saved-outputs', async (c) => {
  try {
    const outputs = await savedOutputsDB.getAllOutputs();
    return c.json({ outputs });
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