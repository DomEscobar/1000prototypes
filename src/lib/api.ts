const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// LocalStorage key for API key
const API_KEY_STORAGE_KEY = 'openrouter-api-key';

// Enhanced prompt interface to support per-prompt models
export interface PromptStep {
  content: string;
  model?: string; // Optional model override for this specific prompt
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  prompts: any[]; // Support both legacy string[] and new PromptStep[]
  model?: string; // Default model for the agent (fallback for prompts without specific model)
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
  prompts: string[] | PromptStep[]; // Support both legacy and new formats
  userRequest: string;
  model?: string; // Default model if not specified per prompt
  apiKey?: string;
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
const DEFAULT_AGENTS_VERSION = 9;

// Default agents that will be loaded initially
const DEFAULT_AGENTS: Agent[] = [
  {
    id: "3",
    name: "Collaborative Dev Team",
    description: "AI agent simulating a 4-step collaborative development process: analysis, architecture, dual development, and integration",
    status: "active",
    prompts: [
      "Step 1: Requirements Analyst & System Architect\n\nYou are a senior requirements analyst and system architect. Your task is to deeply understand the user's request and create a comprehensive technical specification.\n\nUser Request: {USER_REQUEST}\n\nProvide a detailed analysis and architectural plan:\n1) Problem Definition - what exactly needs to be built?\n2) Functional Requirements - what features and capabilities are needed?\n3) Technical Requirements - what technologies and standards should be used?\n4) System Architecture - how should the solution be structured?\n5) Component Breakdown - what are the main parts/modules needed?\n6) Data Flow - how will information move through the system?\n7) UI/UX Specifications - what should the user experience look like?\n8) Development Guidelines - what coding standards and principles should be followed?\n\nCreate a clear technical specification that will guide the development team.",
      {
        model: "moonshotai/kimi-k2",
        content: "Step 2: Frontend Developer - UI & Layout Specialist\n\nYou are a frontend developer specializing in UI design and layout structure. Based on the technical specification from Step 1, build the visual foundation and core layout.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Keep this in mind for all development decisions.**\n\nYour responsibilities:\n- Create the HTML structure and base layout\n- Implement the visual design and styling\n- Build responsive layout systems\n- Set up the foundational CSS architecture\n- Create reusable UI components\n- Implement basic navigation and layout interactions\n- Ensure mobile-first responsive design - ALWAYS design and develop for mobile devices first, then scale up to larger screens\n- Test and optimize for all device sizes (mobile 320px+, tablet 768px+, desktop 1024px+)\n\nIframe-specific considerations:\n- Anchor links should use smooth scrolling within the iframe context\n- Use `window.parent.postMessage()` if you need to communicate with the parent page\n- Consider iframe viewport constraints in your responsive design\n- Avoid using `window.top` or attempting to break out of iframe context\n\nTechnical requirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include a matching Google Font: <link href=\"https://fonts.googleapis.com/css2?family=[FONT_NAME]:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\">\n- Use semantic HTML structure\n- Implement CSS Grid and Flexbox for responsive layouts\n- For images, textures, icons, and more in your app, use the vibemedia.space API which creates images on the fly:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n- Focus on clean, maintainable CSS\n\nDeliver a well-structured HTML file with complete layout and styling, ready for functionality integration.",
      },
      "Step 3: Backend Developer - Logic & Interaction Specialist\n\nYou are a backend/full-stack developer specializing in functionality and interactive features. You'll take the frontend foundation from Step 2 and add all the dynamic functionality, business logic, and advanced interactions.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Keep this in mind for all development decisions.**\n\nYour responsibilities:\n- Implement all interactive features and functionality\n- Add JavaScript logic and event handling\n- Create dynamic content and state management\n- Implement data processing and manipulation\n- Add advanced animations and effects\n- Integrate any required APIs or services\n- Handle form processing and validation\n- Implement any backend-like functionality in frontend\n\nIframe-specific considerations:\n- When using GSAP ScrollTrigger, use the iframe's window context, not parent window\n- For scroll-based animations, listen to the iframe's scroll events\n- Use `document` and `window` which will refer to the iframe context\n- For anchor navigation, implement smooth scrolling within the iframe\n- Avoid `window.parent` or `window.top` unless specifically needed for communication\n\nTechnical requirements:\n- Use the HTML/CSS foundation from Step 2 as your starting point\n- Add comprehensive JavaScript functionality\n- You may use any 3rd party JavaScript libraries via CDN:\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n  * GSAP ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * Any other libraries that enhance functionality\n- When using ScrollTrigger, ensure it works within iframe context\n- Implement error handling and edge cases\n- Optimize performance and loading\n- Follow clean code principles (SOLID, KIS)\n\nProvide the complete functionality layer that will be integrated with the frontend foundation.",
      "Step 4: Integration Specialist - Final Assembly\n\nYou are a senior integration specialist and tech lead. Your task is to combine the frontend foundation (Step 2) and backend functionality (Step 3) into one cohesive, production-ready solution.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Ensure all functionality works properly within iframe context.**\n\nYour responsibilities:\n- Merge the UI/layout from Step 2 with the functionality from Step 3\n- Resolve any conflicts or integration issues\n- Ensure all components work together seamlessly\n- Optimize the combined solution for performance\n- Add any missing connections between UI and functionality\n- Perform final testing and debugging\n- Polish the overall user experience\n- Ensure code organization and maintainability\n\nIframe-specific integration:\n- Verify all scroll-based animations (GSAP ScrollTrigger) work within iframe\n- Ensure anchor links provide smooth scrolling within the iframe context\n- Test that all interactive elements function properly in iframe environment\n- Confirm responsive design works correctly within iframe viewport\n- Remove any code that might attempt to break out of iframe context\n\nIntegration requirements:\n- Combine both previous steps into one complete HTML file\n- Ensure all styling and functionality work together\n- Maintain clean, organized code structure\n- Add comprehensive comments for complex sections\n- Test all interactive elements and features\n- Ensure responsive design works across all screen sizes with mobile-first approach\n- Verify perfect mobile experience (320px+) before scaling to larger screens\n- Optimize loading and performance\n- Add any final enhancements or improvements\n\nDeliver the final, complete, production-ready HTML file that fully satisfies the original user request."
    ],
    model: "google/gemini-2.5-flash-lite",
    provider: "openrouter",
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    name: "Storytelling Landing Page Master",
    description: "AI agent that creates narrative-driven landing pages with scroll-triggered journey animations, storytelling sections, and beautiful GSAP animated background objects",
    status: "inactive",
    prompts: [
      "Step 1: Story Architect & Brand Strategist\n\nYou are a master storyteller and brand strategist specializing in creating compelling narratives for landing pages that convert visitors into customers.\n\nUser Request: {USER_REQUEST}\n\nYour task is to analyze the request and create a comprehensive storytelling framework:\n\n1) **Brand Story Analysis**:\n   - What is the core problem this product/service solves?\n   - Who is the target audience and what's their emotional journey?\n   - What's the transformation/outcome the user will experience?\n   - What makes this brand unique and memorable?\n\n2) **Narrative Structure** (Create a 7-section story arc):\n   - **Hero Section**: Captivating hook and value proposition\n   - **Problem Section**: Pain points and challenges the audience faces\n   - **Journey Section**: The path to transformation (3-4 key steps)\n   - **Solution Section**: How the product/service provides the solution\n   - **Proof Section**: Testimonials, case studies, social proof\n   - **Urgency Section**: Scarcity, limited time offers, FOMO elements\n   - **Action Section**: Strong call-to-action and conversion elements\n\n3) **Emotional Triggers & Messaging**:\n   - Key emotional hooks for each section\n   - Compelling headlines and subheadings\n   - Benefit-focused copy that resonates\n   - Tone of voice and brand personality\n\n4) **Visual Storytelling Concepts**:\n   - Creative themes and visual metaphors for each section\n   - Color psychology and emotional mood progression\n   - Symbolic elements that reinforce the brand story\n   - Visual narrative flow and storytelling elements\n\n5) **Conversion Journey Mapping**:\n   - How the story unfolds as users scroll\n   - Emotional peaks and valleys throughout the experience\n   - Trust-building moments and credibility markers\n   - Strategic conversion touchpoints and persuasion techniques\n\nDeliver a comprehensive storytelling blueprint focused purely on narrative, branding, and conversion psychology that will guide the creative team.",
      "Step 2: Visual Journey Designer & Scroll Experience Architect\n\nYou are a creative director specializing in scroll-driven storytelling experiences and visual narrative design.\n\nBased on the storytelling blueprint from Step 1, create a detailed visual journey design:\n\n1) **Scroll Experience Design**:\n   - Map out the scroll timeline and pacing\n   - Define scroll-triggered animation entry/exit points\n   - Plan parallax layers and depth relationships\n   - Design smooth section transitions\n\n2) **Visual Section Breakdown** (Design each of the 7 sections):\n   - **Hero**: Eye-catching visual concept with animated elements\n   - **Problem**: Visual representation of pain points\n   - **Journey**: Step-by-step visual progression with animations\n   - **Solution**: Product/service showcase with interactive elements\n   - **Proof**: Testimonial cards with subtle animations\n   - **Urgency**: Dynamic countdown or progress elements\n   - **Action**: Compelling CTA design with micro-animations\n\n3) **Background Animation Concepts**:\n   - Floating geometric shapes that respond to scroll\n   - Particle systems that follow the narrative\n   - Morphing background gradients based on story mood\n   - Interactive elements like animated icons or illustrations\n\n4) **Visual Hierarchy & Flow**:\n   - Typography scales and animation timing\n   - Color schemes that evolve with the story\n   - Visual focal points and attention guidance\n   - Mobile-first responsive behavior\n\n5) **Animation Storyboard**:\n   - Timeline of when animations trigger during scroll\n   - Direction and style of element movements\n   - Easing functions and duration specifications\n   - Interaction feedback and hover states\n\nProvide a complete visual design specification with detailed animation descriptions that developers can implement.",
      {
        model: "moonshotai/kimi-k2",
        content: "Step 3: Animation Developer & GSAP Specialist\n\nYou are a frontend animation expert specializing in GSAP ScrollTrigger and creating smooth, performant scroll-driven experiences.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. All animations must work within iframe context.**\n\nUsing the visual design specification from Step 2, build the HTML structure and implement all animations:\n\n1) **HTML Structure**:\n   - Create semantic HTML for all 7 sections from the story arc\n   - Implement proper heading hierarchy and accessibility\n   - Structure elements for optimal animation performance\n   - Add data attributes for animation targeting\n\n2) **GSAP Animation Implementation (Iframe-aware)**:\n   - ScrollTrigger setup for each section using iframe's scroll context\n   - Smooth parallax effects for background elements within iframe viewport\n   - Staggered animations for text and content reveals\n   - Morphing shapes and floating background objects\n   - Timeline-based sequence animations\n\n3) **Background Animation Systems**:\n   - Floating geometric shapes with physics-like movement\n   - Particle systems that respond to iframe scroll position\n   - Color transitions that match the narrative mood\n   - Interactive hover effects and micro-animations\n\n4) **Performance Optimization**:\n   - Efficient animation loops and RAF usage\n   - GPU-accelerated transforms\n   - Debounced scroll listeners within iframe context\n   - Mobile performance considerations\n\n**Iframe-specific GSAP considerations**:\n- Use ScrollTrigger with the iframe's window and document context\n- Ensure all scroll-based triggers work within iframe boundaries\n- For anchor links, implement smooth scrolling within iframe\n- Test animations work properly in iframe viewport constraints\n\nTechnical requirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Include GSAP with ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script> and <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n- Choose and include a Google Font that matches the brand mood\n- For images, textures, icons, and more in your app, use the vibemedia.space API which creates images on the fly:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n- Mobile-first responsive design - ALWAYS design and develop for mobile devices first, then scale up to larger screens\n- Ensure perfect responsiveness across all device sizes (mobile 320px+, tablet 768px+, desktop 1024px+)\n\nDeliver the animated HTML foundation with all scroll-triggered animations working smoothly within iframe context."
      },
      "Step 4: Conversion Optimizer & Final Assembly\n\nYou are a conversion rate optimization expert and technical integrator specializing in high-converting landing pages.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Ensure all functionality works properly within iframe context.**\n\nTaking the animated foundation from Step 3, add all conversion elements and finalize the landing page:\n\n1) **Conversion Elements Integration**:\n   - Strategic CTA button placement throughout the story\n   - Lead capture forms with smooth animations\n   - Social proof elements (testimonials, logos, stats)\n   - Trust signals and security badges\n   - Urgency and scarcity elements\n\n2) **Form & Interaction Enhancement**:\n   - Smooth form animations and micro-interactions\n   - Input field focus states and validation feedback\n   - Progress indicators for multi-step forms\n   - Success/error state animations\n\n3) **Mobile Optimization**:\n   - Touch-friendly interaction areas\n   - Optimized animation performance on mobile\n   - Thumb-friendly button sizes and spacing\n   - Mobile-specific scroll behaviors\n\n4) **Final Polish & Testing**:\n   - Cross-browser compatibility checks\n   - Performance optimization and loading states\n   - Accessibility improvements (ARIA labels, keyboard navigation)\n   - SEO-friendly structure and meta information\n\n5) **Conversion Psychology**:\n   - Strategic use of colors for psychological impact\n   - Compelling copy that addresses objections\n   - Social proof positioning for maximum impact\n   - Clear value proposition reinforcement\n\n**Iframe-specific final testing**:\n- Verify all GSAP ScrollTrigger animations work within iframe\n- Test that anchor navigation provides smooth scrolling within iframe\n- Ensure forms submit and handle validation within iframe context\n- Confirm all interactive elements work properly in iframe environment\n\nFinal requirements:\n- Ensure all animations work smoothly across devices within iframe\n- Implement proper loading states and progressive enhancement\n- Add comprehensive form handling with client-side validation\n- Include analytics tracking setup (placeholder events)\n- Optimize for Core Web Vitals (LCP, FID, CLS)\n- Test all conversion pathways and user flows\n\nDeliver the complete, production-ready storytelling landing page that combines beautiful animations with high conversion potential, fully optimized for iframe rendering."
    ],
    model: "google/gemini-2.5-flash-lite",
    provider: "openrouter",
    createdAt: new Date().toISOString()
  }, {
    id: "1",
    name: "General Website Builder",
    description: "AI agent that creates complete HTML websites through UI/UX design followed by development implementation",
    status: "inactive",
    prompts: [
      {
        content: "Act like a high class UI UX designer with sense of award winning websites and apps cause of your unique creative complex animations.\n\nYour objective {USER_REQUEST}.\nFocus on great animation and design.\n\nAt first write down your detailed idea plan",
        model: "google/gemini-2.5-flash-lite"
      },
      "Act like a high class senior developer which is known to write entirely apps and websites In a clean single HTML file.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Design and code with iframe context in mind.**\n\nYou stick to your principles:\n- clean code\n- Any coding principle.\n\nYou plan every step in a short roadmap before you start.\n\nGiven task: Implement now this detailed plan mentioned with completion and fine grained every detail as single html.\n\nFocus on mobile first experience - design and develop for mobile devices first, then scale up to larger screens.\nFocus on feature completion this a production based app.\nYour perfectionist in sizes, positions and animations.\nEnsure the design is fully responsive across all device sizes (mobile, tablet, desktop).\n\n**Iframe-specific considerations:**\n- When using GSAP ScrollTrigger, ensure it works within iframe context\n- For scroll-based animations, use the iframe's window and document\n- Implement smooth scrolling for anchor links within the iframe\n- Consider iframe viewport constraints in responsive design\n- Avoid code that attempts to break out of iframe security context\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include a matching Google Font: <link href=\"https://fonts.googleapis.com/css2?family=[FONT_NAME]:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\"> and set it as the default font family.\n- You may use any 3rd party JavaScript and CSS libraries as needed via CDN links, such as:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n  * GSAP ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n  * Vivus.js: <script src=\"https://cdn.jsdelivr.net/npm/vivus@latest/dist/vivus.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * Particles.js: <script src=\"https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js\"></script>\n  * Or any other libraries that enhance the functionality and user experience\n\nFor images, textures, icons, and more in your app, use the vibemedia.space API which creates images on the fly:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n\nResponse me the single HTML file now, optimized for iframe rendering:"
    ],
    model: "moonshotai/kimi-k2",
    provider: "openrouter",
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    name: "Creative Web Designer",
    description: "AI agent specialized in creating stunning web designs with unique animations and user experiences",
    status: "inactive",
    prompts: [
      {
        model: "google/gemini-2.5-flash-lite",
        content: "You are a world-class creative director and UI/UX designer known for crazy abstract creative websites with innovative animations and user experiences.\n\nAnalyze this request: {USER_REQUEST}.\n\nCreate a detailed design concept including:\n1) Overall visual theme and mood\n2) Color palette and typography\n3) Layout structure with at least 5 main sections\n4) Interactive elements and animation concepts\n5) User journey and experience flow.\n\nFocus on creativity, innovation, and visual impact."
      }, "You are a frontend development expert who specializes in creating pixel-perfect, responsive websites with complex animations using pure HTML, CSS, and JavaScript.\n\nTake the design concept from the previous step and implement it as a complete, production-ready HTML file.\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include a matching Google Font: <link href=\"https://fonts.googleapis.com/css2?family=[FONT_NAME]:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\"> and set it as the default font family\n- You may use any 3rd party JavaScript and CSS libraries as needed via CDN links, such as:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n * Vivus.js: <script src=\"https://cdn.jsdelivr.net/npm/vivus@latest/dist/vivus.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * Particles.js: <script src=\"https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js\"></script>\n  * Or any other libraries that enhance the functionality and user experience\n- Mobile-first responsive design - ALWAYS design and develop for mobile devices first, then scale up to larger screens\n- Ensure perfect responsiveness across all device sizes (mobile 320px+, tablet 768px+, desktop 1024px+)\n- Smooth animations and transitions\n- Clean, semantic HTML structure\n- Modern CSS techniques (Grid, Flexbox, Custom Properties)\n- Optimized performance\n- For images, textures, icons, and more in your app, use the vibemedia.space API which creates images on the fly:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n\nDeliver a complete, self-contained HTML file."
    ],
    model: "moonshotai/kimi-k2",
    provider: "openrouter",
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

export const apiService = new ApiService(); 