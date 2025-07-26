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
const DEFAULT_AGENTS_VERSION = 12;

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
      "Step 3: Backend Developer - Logic & Interaction Specialist\n\nYou are a backend/full-stack developer specializing in functionality and interactive features. You'll take the frontend foundation from Step 2 and add all the dynamic functionality, business logic, and advanced interactions.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Keep this in mind for all development decisions.**\n\nYour responsibilities:\n- Implement all interactive features and functionality\n- Add JavaScript logic and event handling\n- Create dynamic content and state management\n- Implement data processing and manipulation\n- Add advanced animations and effects\n- Integrate any required APIs or services\n- Handle form processing and validation\n- Implement any backend-like functionality in frontend\n\nIframe-specific considerations:\n- When using GSAP ScrollTrigger, use the iframe's window context, not parent window\n- For scroll-based animations, listen to the iframe's scroll events\n- Use `document` and `window` which will refer to the iframe context\n- For anchor navigation, implement smooth scrolling within the iframe\n- Avoid `window.parent` or `window.top` unless specifically needed for communication\n\nTechnical requirements:\n- Use the HTML/CSS foundation from Step 2 as your starting point\n- Add comprehensive JavaScript functionality\n- **IMPORTANT**: Use `window.addEventListener('load')` instead of `DOMContentLoaded` for initialization\n- You may use any 3rd party JavaScript libraries via CDN:\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n  * GSAP ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * Any other libraries that enhance functionality\n- When using ScrollTrigger, ensure it works within iframe context\n- Implement error handling and edge cases\n- Optimize performance and loading\n- Follow clean code principles (SOLID, KIS)\n\nProvide the complete functionality layer that will be integrated with the frontend foundation.",
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
      "Step 1: Story Architect & Brand Strategist\n\nYou are a master storyteller and brand strategist specializing in creating compelling narratives for landing pages that convert visitors into customers.\n\nUser Request: {USER_REQUEST}\n\nYour task is to analyze the request and create a comprehensive storytelling framework:\n\n1) **Brand Story Analysis**:\n   - What is the core problem this product/service solves?\n   - Who is the target audience and what's their emotional journey?\n   - What's the transformation/outcome the user will experience?\n   - What makes this brand unique and memorable?\n\n2) **Dynamic Narrative Structure** (Analyze the user request and determine the optimal sections needed):\n   Based on the specific user request, determine the most effective sections for this particular landing page. Consider these potential sections and choose/adapt the ones that best serve the user's goals:\n   \n   **Core Sections (usually needed)**:\n   - **Hero Section**: Captivating hook and value proposition\n   - **Solution/Product Section**: Main offering presentation\n   - **Action Section**: Strong call-to-action and conversion elements\n   \n   **Situational Sections (choose based on context)**:\n   - **Problem Section**: Pain points and challenges (if problem-focused)\n   - **Journey/Process Section**: Step-by-step transformation path (if process-oriented)\n   - **Features/Benefits Section**: Detailed capability breakdown (if feature-heavy)\n   - **Proof Section**: Testimonials, case studies, social proof (if credibility is key)\n   - **About/Story Section**: Brand narrative and founder story (if brand-focused)\n   - **Pricing Section**: Plans and packages (if pricing is central)\n   - **FAQ Section**: Common questions and objections (if complex offering)\n   - **Urgency Section**: Scarcity, limited time offers (if time-sensitive)\n   - **Team Section**: Meet the team behind the solution (if people-focused)\n   - **Gallery/Portfolio Section**: Work examples and case studies (if portfolio-based)\n\n   **OUTPUT**: List the specific sections needed for this landing page (typically 4-8 sections) with brief descriptions of their purpose.\n\n3) **Emotional Triggers & Messaging**:\n   - Key emotional hooks for each chosen section\n   - Compelling headlines and subheadings\n   - Benefit-focused copy that resonates\n   - Tone of voice and brand personality\n\n4) **Visual Storytelling Concepts**:\n   - Creative themes and visual metaphors for each section\n   - Color psychology and emotional mood progression\n   - Symbolic elements that reinforce the brand story\n   - Visual narrative flow and storytelling elements\n\n5) **Conversion Journey Mapping**:\n   - How the story unfolds as users scroll through the determined sections\n   - Emotional peaks and valleys throughout the experience\n   - Trust-building moments and credibility markers\n   - Strategic conversion touchpoints and persuasion techniques\n\nDeliver a comprehensive storytelling blueprint with the dynamically determined sections that perfectly match the user's specific request and goals.",
      "Step 2: Visual Journey Designer & Scroll Experience Architect\n\nYou are a creative director specializing in scroll-driven storytelling experiences and visual narrative design.\n\nBased on the storytelling blueprint from Step 1, create a detailed visual journey design:\n\n1) **Scroll Experience Design**:\n   - Map out the scroll timeline and pacing for the specific sections determined in Step 1\n   - Define scroll-triggered animation entry/exit points for each section\n   - Plan parallax layers and depth relationships throughout the narrative\n   - Design smooth section transitions between the chosen sections\n\n2) **Dynamic Visual Section Breakdown** (Design each of the sections identified in Step 1):\n   Take the specific sections determined in Step 1 and create detailed visual concepts for each:\n   \n   For each section identified in Step 1, provide:\n   - **Visual Theme**: Overall aesthetic and mood for this section\n   - **Animation Concept**: Key animations and scroll-triggered effects\n   - **Layout Structure**: How content is organized and flows\n   - **Interactive Elements**: User engagement points and micro-interactions\n   - **Transition In/Out**: How this section connects to adjacent sections\n   \n   Focus on creating a cohesive visual narrative that flows naturally from one section to the next, regardless of which sections were chosen.\n\n3) **Background Animation Concepts**:\n   - Floating geometric shapes that respond to scroll and match the narrative mood\n   - Particle systems that evolve with each section's theme\n   - Morphing background gradients that reflect the emotional journey\n   - Interactive elements like animated icons or illustrations specific to the content\n   - Consistent visual elements that tie all sections together\n\n4) **Visual Hierarchy & Flow**:\n   - Typography scales and animation timing across all sections\n   - Color schemes that evolve with the story through each section\n   - Visual focal points and attention guidance for the specific narrative\n   - Mobile-first responsive behavior for the determined layout\n   - Consistent branding elements throughout the journey\n\n5) **Animation Storyboard**:\n   - Timeline of when animations trigger during scroll for each specific section\n   - Direction and style of element movements that support the narrative\n   - Easing functions and duration specifications for smooth flow\n   - Interaction feedback and hover states for each section type\n   - Cross-section animation continuity and visual connections\n\nProvide a complete visual design specification with detailed animation descriptions that developers can implement, customized for the specific sections and narrative structure determined in Step 1.",
      {
        model: "moonshotai/kimi-k2",
        content: "Step 3: Animation Developer & GSAP Specialist\n\nYou are a frontend animation expert specializing in GSAP ScrollTrigger and creating smooth, performant scroll-driven experiences.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. All animations must work within iframe context.**\n\nUsing the visual design specification from Step 2, build the HTML structure and implement all animations:\n\n1) **Dynamic HTML Structure**:\n   - Create semantic HTML for all sections determined in Step 1 (typically 4-8 sections)\n   - Build the structure based on the specific sections chosen by the Story Architect\n   - Implement proper heading hierarchy and accessibility for the chosen sections\n   - Structure elements for optimal animation performance\n   - Add data attributes for animation targeting specific to each section type\n\n2) **GSAP Animation Implementation (Iframe-aware)**:\n   - ScrollTrigger setup for each specific section using iframe's scroll context\n   - Implement animations tailored to each section's purpose (Hero, Problem, Solution, etc.)\n   - Smooth parallax effects for background elements within iframe viewport\n   - Staggered animations for text and content reveals appropriate to each section\n   - Morphing shapes and floating background objects that match the narrative\n   - Timeline-based sequence animations that flow between the chosen sections\n\n3) **Section-Specific Animation Systems**:\n   - Animations that match the function of each section (e.g., problem visualization, solution demonstrations)\n   - Floating geometric shapes with physics-like movement that support the story\n   - Particle systems that respond to iframe scroll position and section themes\n   - Color transitions that match the narrative mood through each section\n   - Interactive hover effects and micro-animations appropriate to content type\n\n4) **Performance Optimization**:\n   - Efficient animation loops and RAF usage optimized for the specific number of sections\n   - GPU-accelerated transforms across all dynamic sections\n   - Debounced scroll listeners within iframe context\n   - Mobile performance considerations for variable section count\n\n**Iframe-specific GSAP considerations**:\n- Use ScrollTrigger with the iframe's window and document context\n- Ensure all scroll-based triggers work within iframe boundaries for any number of sections\n- For anchor links, implement smooth scrolling within iframe\n- Test animations work properly in iframe viewport constraints regardless of section count\n\nTechnical requirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Include GSAP with ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script> and <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n- Choose and include a Google Font that matches the brand mood\n- **IMPORTANT**: Use `window.addEventListener('load')` instead of `DOMContentLoaded` for initialization\n- For images, textures, icons, and more in your app, use the vibemedia.space API which creates images on the fly:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n- Mobile-first responsive design - ALWAYS design and develop for mobile devices first, then scale up to larger screens\n- Ensure perfect responsiveness across all device sizes (mobile 320px+, tablet 768px+, desktop 1024px+)\n\nDeliver the animated HTML foundation with all scroll-triggered animations working smoothly within iframe context, structured around the specific sections determined in the storytelling phase."
      },
      "Step 4: Conversion Optimizer & Final Assembly\n\nYou are a conversion rate optimization expert and technical integrator specializing in high-converting landing pages.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Ensure all functionality works properly within iframe context.**\n\nTaking the animated foundation from Step 3, add all conversion elements and finalize the landing page:\n\n1) **Dynamic Conversion Elements Integration**:\n   - Strategic CTA button placement throughout the sections determined in Step 1\n   - Conversion elements appropriate to each section type (e.g., lead forms in Hero, testimonials in Proof sections)\n   - Social proof elements positioned based on the narrative structure\n   - Trust signals and security badges placed contextually\n   - Urgency and scarcity elements (if an Urgency section was determined in Step 1)\n   - Section-specific conversion optimization (pricing tables, galleries, FAQs as needed)\n\n2) **Section-Aware Form & Interaction Enhancement**:\n   - Smooth form animations tailored to the specific sections in the landing page\n   - Input field focus states and validation feedback appropriate to context\n   - Progress indicators for multi-step processes (if Process/Journey section exists)\n   - Success/error state animations that match the overall narrative\n   - Interactive elements that enhance each section's specific purpose\n\n3) **Mobile Optimization for Dynamic Layout**:\n   - Touch-friendly interaction areas optimized for the specific section count\n   - Animation performance on mobile across all determined sections\n   - Thumb-friendly button sizes and spacing throughout the narrative\n   - Mobile-specific scroll behaviors that work with variable section lengths\n\n4) **Final Polish & Testing**:\n   - Cross-browser compatibility checks for all sections\n   - Performance optimization considering the specific number and type of sections\n   - Accessibility improvements (ARIA labels, keyboard navigation) across all sections\n   - SEO-friendly structure and meta information reflecting the dynamic content\n\n5) **Contextual Conversion Psychology**:\n   - Strategic use of colors that support the narrative determined in Step 1\n   - Compelling copy that addresses objections specific to the chosen sections\n   - Social proof positioning optimized for the narrative flow\n   - Value proposition reinforcement throughout the determined section structure\n   - Psychological triggers appropriate to each section's role in the story\n\n**Iframe-specific final testing**:\n- Verify all GSAP ScrollTrigger animations work within iframe across all sections\n- Test that anchor navigation provides smooth scrolling within iframe for the specific sections\n- Ensure forms submit and handle validation within iframe context\n- Confirm all interactive elements work properly in iframe environment regardless of section count\n\nFinal requirements:\n- Ensure all animations work smoothly across devices within iframe for the determined structure\n- Implement proper loading states and progressive enhancement\n- Add comprehensive form handling with client-side validation appropriate to section types\n- Include analytics tracking setup (placeholder events) for each section\n- Optimize for Core Web Vitals (LCP, FID, CLS) considering the dynamic section count\n- Test all conversion pathways and user flows specific to the narrative structure\n\nDeliver the complete, production-ready storytelling landing page that combines beautiful animations with high conversion potential, fully optimized for iframe rendering and customized for the specific sections and narrative determined in the storytelling phase."
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
      "Act like a high class senior developer which is known to write entirely apps and websites In a clean single HTML file.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Design and code with iframe context in mind.**\n\nYou stick to your principles:\n- clean code\n- Any coding principle.\n\nYou plan every step in a short roadmap before you start.\n\nGiven task: Implement now this detailed plan mentioned with completion and fine grained every detail as single html.\n\nFocus on mobile first experience - design and develop for mobile devices first, then scale up to larger screens.\nFocus on feature completion this a production based app.\nYour perfectionist in sizes, positions and animations.\nEnsure the design is fully responsive across all device sizes (mobile, tablet, desktop).\n\n**Iframe-specific considerations:**\n- When using GSAP ScrollTrigger, ensure it works within iframe context\n- For scroll-based animations, use the iframe's window and document\n- Implement smooth scrolling for anchor links within the iframe\n- Consider iframe viewport constraints in responsive design\n- Avoid code that attempts to break out of iframe security context\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include a matching Google Font: <link href=\"https://fonts.googleapis.com/css2?family=[FONT_NAME]:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\"> and set it as the default font family.\n- **IMPORTANT**: Use `window.addEventListener('load')` instead of `DOMContentLoaded` for initialization\n- You may use any 3rd party JavaScript and CSS libraries as needed via CDN links, such as:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n  * GSAP ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n  * Vivus.js: <script src=\"https://cdn.jsdelivr.net/npm/vivus@latest/dist/vivus.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * Particles.js: <script src=\"https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js\"></script>\n  * Or any other libraries that enhance the functionality and user experience\n\nFor images, textures, icons, and more in your app, use the vibemedia.space API which creates images on the fly:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n\nResponse me the single HTML file now, optimized for iframe rendering:"
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
      }, "You are a frontend development expert who specializes in creating pixel-perfect, responsive websites with complex animations using pure HTML, CSS, and JavaScript.\n\nTake the design concept from the previous step and implement it as a complete, production-ready HTML file.\n\nRequirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include a matching Google Font: <link href=\"https://fonts.googleapis.com/css2?family=[FONT_NAME]:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\"> and set it as the default font family\n- **IMPORTANT**: Use `window.addEventListener('load')` instead of `DOMContentLoaded` for initialization\n- You may use any 3rd party JavaScript and CSS libraries as needed via CDN links, such as:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n * Vivus.js: <script src=\"https://cdn.jsdelivr.net/npm/vivus@latest/dist/vivus.min.js\"></script>\n  * Chart.js: <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n  * Particles.js: <script src=\"https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js\"></script>\n  * Or any other libraries that enhance the functionality and user experience\n- Mobile-first responsive design - ALWAYS design and develop for mobile devices first, then scale up to larger screens\n- Ensure perfect responsiveness across all device sizes (mobile 320px+, tablet 768px+, desktop 1024px+)\n- Smooth animations and transitions\n- Clean, semantic HTML structure\n- Modern CSS techniques (Grid, Flexbox, Custom Properties)\n- Optimized performance\n- For images, textures, icons, and more in your app, use the vibemedia.space API which creates images on the fly:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (good for icons, sprites, etc.)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n\nDeliver a complete, self-contained HTML file."
    ],
    model: "moonshotai/kimi-k2",
    provider: "openrouter",
    createdAt: new Date().toISOString()
  },
  {
    id: "5",
    name: "Unusual Creative App Builder",
    description: "AI agent specialized in creating highly experimental and unusual creative apps with boundary-pushing UX, innovative interactions, and creative technical implementations",
    status: "inactive",
    prompts: [
      {
        model: "google/gemini-2.5-flash-lite",
        content: "Step 1: Experimental Concept & UX Innovation Specialist\n\nYou are a visionary UX researcher and experimental design specialist known for creating groundbreaking, unconventional user experiences that challenge traditional design patterns.\n\nUser Request: {USER_REQUEST}\n\nYour mission is to conceive a truly unusual and innovative approach that pushes creative boundaries:\n\n1) **Unconventional Problem Analysis**:\n   - What's the most unexpected way to approach this request?\n   - How can we flip traditional expectations and create something surprising?\n   - What unexplored interaction patterns could revolutionize this concept?\n   - How can we make this experience memorable and distinctive?\n\n2) **Experimental UX Innovation**:\n   - Design unusual navigation patterns (non-linear, gravity-based, gesture-driven, etc.)\n   - Create unexpected layout systems (asymmetrical, morphing, context-aware)\n   - Develop innovative interaction methods (voice, gesture, tilt, proximity, etc.)\n   - Design emotional user journeys with surprising moments\n   - Plan unconventional information architecture\n\n3) **Creative Technical Concepts**:\n   - Unusual animation patterns (particle systems, physics simulations, procedural)\n   - Experimental visual effects (distortion, glitch, morphing, 3D transformations)\n   - Creative data visualization approaches\n   - Innovative use of browser APIs (device motion, camera, microphone, etc.)\n   - Unconventional responsive behavior\n\n4) **Boundary-Pushing Features**:\n   - Interactive elements that respond to user behavior in unexpected ways\n   - Dynamic content that evolves based on user interaction patterns\n   - Gamification elements that don't feel like traditional gamification\n   - Social features with creative twists\n   - Accessibility innovations that enhance the experience for everyone\n\n5) **Experience Architecture**:\n   - Map out the unusual user flow and interaction sequences\n   - Define the emotional arc and surprise moments\n   - Plan the technical complexity progression\n   - Design the 'wow factor' moments and their timing\n   - Create a framework for the unconventional experience\n\nDeliver a comprehensive experimental design blueprint that breaks traditional patterns and creates something genuinely unusual and innovative."
      },
      {
        model: "moonshotai/kimi-k2", 
        content: "Step 2: Technical Wizardry & Creative Implementation Specialist\n\nYou are a creative developer and technical artist known for implementing impossible-seeming features and bringing experimental designs to life with cutting-edge web technologies.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. All experimental features must work within iframe context.**\n\nBased on the experimental design blueprint from Step 1, build the core unusual features and creative technical implementation:\n\n1) **Experimental Technical Foundation**:\n   - Implement the unusual layout and navigation systems designed in Step 1\n   - Create the unconventional interaction patterns and experimental UX elements\n   - Build custom animation systems and effects that support the creative vision\n   - Develop the innovative technical features and boundary-pushing functionality\n   - Ensure all experimental elements work seamlessly within iframe constraints\n\n2) **Creative Implementation Focus**:\n   - Advanced GSAP animations with unusual easing and physics simulations\n   - Custom CSS effects (blend modes, filters, transforms, clip-path)\n   - Creative use of Canvas, WebGL, or Three.js for unique visual effects\n   - Innovative responsive behavior that goes beyond standard breakpoints\n   - Experimental typography and text effects\n   - Unusual color systems and dynamic theming\n\n3) **Boundary-Pushing Technical Features**:\n   - Implement gesture recognition, device orientation, or other sensor inputs\n   - Create procedural or generative visual elements\n   - Build interactive particle systems or physics simulations\n   - Develop dynamic content systems that adapt to user behavior\n   - Add creative sound design or audio-visual synchronization\n\n4) **Iframe-Optimized Experimental Development**:\n   - Ensure all advanced features work properly within iframe security context\n   - Optimize experimental animations and effects for iframe performance\n   - Implement creative scroll behaviors that work within iframe boundaries\n   - Test unusual interaction patterns work correctly in iframe environment\n\nTechnical requirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Choose and include an appropriate Google Font that matches the experimental aesthetic\n- **IMPORTANT**: Use `window.addEventListener('load')` instead of `DOMContentLoaded` for initialization\n- You may use cutting-edge libraries via CDN:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * GSAP: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n  * GSAP ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n  * P5.js: <script src=\"https://cdn.jsdelivr.net/npm/p5@1.10.0/lib/p5.min.js\"></script>\n  * Tone.js: <script src=\"https://cdn.jsdelivr.net/npm/tone@15.1.3/build/Tone.min.js\"></script>\n  * Any other experimental libraries that enhance the unusual creative vision\n\n- For images, textures, icons, and creative visual elements, use the vibemedia.space API:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - Remove background automatically (especially useful for icons)\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n- Mobile-first responsive design - ensure experimental features work across all devices\n- Focus on performance optimization for complex animations and effects\n\nDeliver the core unusual technical implementation with all experimental features working smoothly within iframe context."
      },
      "Step 3: Polish & Interactive Enhancement Specialist\n\nYou are a creative technologist and interaction design expert who specializes in adding the final polish, advanced micro-interactions, and 'wow factor' moments to experimental applications.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Ensure all enhancements work properly within iframe context.**\n\nTaking the experimental technical foundation from Step 2, add the final layer of polish and advanced interactive enhancements:\n\n1) **Advanced Micro-Interactions & Polish**:\n   - Add sophisticated hover states and interaction feedback systems\n   - Create smooth state transitions and loading animations\n   - Implement advanced cursor interactions and custom cursor behaviors\n   - Add subtle haptic feedback simulation through visual and audio cues\n   - Polish all animations with perfect timing and easing\n\n2) **Enhanced User Experience Refinements**:\n   - Add progressive disclosure and contextual help systems\n   - Implement smart defaults and adaptive interface behaviors\n   - Create seamless error states and recovery flows\n   - Add accessibility enhancements that complement the experimental design\n   - Optimize the interaction flow and remove any friction points\n\n3) **Creative Enhancement Features**:\n   - Add easter eggs and hidden interactions that reward exploration\n   - Implement dynamic difficulty adjustment or complexity progression\n   - Create personalization features that adapt to user preferences\n   - Add social sharing capabilities with creative previews\n   - Implement data persistence for user customizations\n\n4) **Performance & Experience Optimization**:\n   - Optimize all animations and effects for smooth 60fps performance\n   - Add intelligent loading states and progressive enhancement\n   - Implement efficient memory management for complex features\n   - Add graceful degradation for less capable devices\n   - Ensure consistent experience across different browsers\n\n5) **Final Creative Touches**:\n   - Add ambient animations and atmospheric effects\n   - Implement creative onboarding or tutorial sequences\n   - Create memorable moments that users will want to share\n   - Add subtle branding elements that enhance rather than distract\n   - Polish the overall aesthetic and ensure visual consistency\n\n6) **Creative Icon & Visual Implementation**:\n   - Use https://vibemedia.space API for all icons and special visual elements\n   - Format: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n   - Add &removeBackground=true for clean icons and UI elements\n   - Create unique, experimental icons that match the unusual aesthetic\n   - Implement dynamic icon systems that respond to user interactions\n\n**Iframe-specific final optimizations**:\n- Verify all advanced interactions work smoothly within iframe boundaries\n- Test that performance optimizations maintain quality in iframe context\n- Ensure any experimental features degrade gracefully\n- Confirm all accessibility enhancements work properly\n\nFinal requirements:\n- Combine all previous work into one cohesive, polished experience\n- Add comprehensive error handling and edge case management\n- Implement smart responsive behavior that adapts to any screen size\n- Ensure the final product feels magical and unexpected\n- Test all experimental features work consistently across devices\n- Add final performance optimizations and loading improvements\n- Use vibemedia.space for all icons and special visual elements throughout\n\nDeliver the complete, polished, production-ready unusual creative app that pushes boundaries while maintaining excellent usability and performance."
    ],
    model: "google/gemini-2.5-flash-lite",
    provider: "openrouter",
    createdAt: new Date().toISOString()
  },
  {
    id: "6",
    name: "Hero Section Animation Master",
    description: "AI agent specialized in creating thrilling hero sections with sick GSAP animations, interactive objects, and engaging multi-element choreography that feels new and exciting",
    status: "inactive",
    prompts: [
      {
        model: "google/gemini-2.5-flash-lite",
        content: "Step 1: Animation Choreographer & Creative Vision Specialist\n\nYou are a master animation director and creative visionary known for creating jaw-dropping hero sections that make users stop scrolling and engage. You specialize in orchestrating complex multi-element animations that feel alive and thrilling.\n\nUser Request: {USER_REQUEST}\n\nYour mission is to design a hero section animation experience that feels revolutionary:\n\n1) **Hero Concept & Emotional Impact**:\n   - What's the core message/emotion this hero should convey?\n   - How can we make users feel excitement and engagement within 3 seconds?\n   - What's the unique 'wow factor' that makes this hero unforgettable?\n   - How does this hero differentiate from typical static or basic animated heroes?\n\n2) **Multi-Element Animation Choreography**:\n   - Design 5-8 distinct animated elements that work together harmoniously\n   - Plan how elements interact with each other (collision, attraction, morphing)\n   - Create a timeline of animation sequences that build excitement\n   - Design elements that respond to user interactions (mouse, scroll, click)\n   - Plan layered depth with foreground, midground, and background elements\n\n3) **Interactive Object Behaviors**:\n   - Floating/orbiting objects that respond to mouse movement\n   - Particle systems that react to user presence\n   - Morphing shapes that transform based on interactions\n   - Physics-based elements that bounce, attract, or repel\n   - Dynamic text that responds to cursor proximity or animation triggers\n\n4) **Thrilling Animation Concepts**:\n   - Magnetic field effects between elements\n   - Gravity-based object interactions\n   - Procedural generation of shapes or patterns\n   - Color-shifting gradients that follow animation beats\n   - Elements that seem to 'break' the boundaries of their containers\n   - Synchronized animation beats that create rhythm and flow\n\n5) **Visual Hierarchy & User Journey**:\n   - How animations guide the eye to key content (headline, CTA, etc.)\n   - Progressive disclosure of information through animation timing\n   - Strategic pause points where users can absorb information\n   - Clear path from initial 'wow' to actionable next steps\n   - Balance between impressive visuals and message clarity\n\n6) **Technical Animation Strategy**:\n   - GSAP timeline architecture for complex sequences\n   - Performance considerations for smooth 60fps animations\n   - Responsive behavior across devices without losing impact\n   - Accessibility considerations for motion-sensitive users\n   - Fallback experiences for less capable devices\n\nDeliver a comprehensive animation blueprint that defines every element's behavior, interaction patterns, and the overall choreography that will make users feel thrilled and engaged."
      },
      {
        model: "qwen/qwen3-coder",
        content: "Step 2: GSAP Animation Technical Implementation Specialist\n\nYou are an expert GSAP developer and animation engineer who specializes in bringing complex animation visions to life with smooth, performant code that works flawlessly across devices.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. All animations must work within iframe context.**\n\nBased on the animation blueprint from Step 1, implement the technical foundation and core animation systems:\n\n1) **Advanced GSAP Animation Architecture**:\n   - Build complex timeline sequences with proper sequencing and overlap\n   - Implement the multi-element choreography designed in Step 1\n   - Create smooth object interactions and element relationships\n   - Develop responsive animation systems that scale properly\n   - Ensure all animations work seamlessly within iframe constraints\n\n2) **Interactive Element Implementation**:\n   - Mouse-following objects with smooth easing and momentum\n   - Scroll-triggered animations that enhance the experience\n   - Click/touch interactions that provide satisfying feedback\n   - Proximity-based effects that respond to cursor distance\n   - Device orientation responses for mobile engagement\n\n3) **Physics & Object Interaction Systems**:\n   - Implement attraction/repulsion forces between elements\n   - Create collision detection and response behaviors\n   - Build momentum and inertia systems for natural movement\n   - Develop morphing and transformation sequences\n   - Add particle systems that enhance the overall experience\n\n4) **Visual Effects & Enhancement**:\n   - Dynamic gradient animations and color transitions\n   - SVG path animations and morphing effects\n   - CSS filter animations (blur, brightness, hue rotation)\n   - WebGL or Canvas integration for advanced effects\n   - Creative use of CSS transforms and blend modes\n\n5) **Performance Optimization**:\n   - GPU acceleration for all transform-based animations\n   - Efficient RAF loops and timeline management\n   - Optimized rendering and minimal DOM manipulation\n   - Smart animation culling for off-screen elements\n   - Mobile-specific performance considerations\n\n**Iframe-specific GSAP implementation**:\n- Use ScrollTrigger with iframe's window and document context\n- Ensure mouse/touch events work properly within iframe boundaries\n- Test all interactive elements function correctly in iframe environment\n- Optimize animations for iframe viewport constraints\n\nTechnical requirements:\n- Include Tailwind CSS: <script src=\"https://cdn.tailwindcss.com\"></script>\n- Include GSAP with all necessary plugins:\n  * GSAP Core: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js\"></script>\n  * ScrollTrigger: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js\"></script>\n  * MotionPath: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/MotionPathPlugin.min.js\"></script>\n  * MorphSVG: <script src=\"https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/MorphSVGPlugin.min.js\"></script> (if available)\n- Choose an appropriate Google Font that matches the energy and style\n- **IMPORTANT**: Use `window.addEventListener('load')` instead of `DOMContentLoaded` for initialization\n- Optional advanced libraries:\n  * Three.js: <script src=\"https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.tsl.min.js\"></script>\n  * P5.js: <script src=\"https://cdn.jsdelivr.net/npm/p5@1.10.0/lib/p5.min.js\"></script>\n\n- For all visual elements, icons, and creative assets, use vibemedia.space:\n\nFormat: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n\nOptional Parameters:\n• &removeBackground=true - For clean icons and UI elements\n\nIMPORTANT: Use FIXED IDs in your code, not random generators!\n- Mobile-first responsive design - ensure animations work beautifully on all devices\n- Focus on achieving smooth 60fps performance across the animation experience\n\nDeliver the core hero section with all animation systems working smoothly, interactive elements responding properly, and the foundation ready for final polish."
      },
      "Step 3: Polish, Optimization & User Experience Enhancement\n\nYou are a UX specialist and performance optimization expert who adds the final layer of polish and ensures the hero section provides an exceptional user experience while maintaining top performance.\n\n**IMPORTANT: Your HTML will be rendered inside an iframe for security and isolation. Ensure all enhancements work properly within iframe context.**\n\nTaking the animated hero foundation from Step 2, add final polish and optimization:\n\n1) **Advanced Interaction Polish**:\n   - Fine-tune all animation timings and easing for perfect feel\n   - Add subtle micro-interactions that reward user exploration\n   - Implement smooth state transitions and hover effects\n   - Create satisfying feedback for all interactive elements\n   - Add loading animations that build anticipation\n\n2) **User Experience Enhancement**:\n   - Add accessibility features (reduced motion preferences, keyboard navigation)\n   - Implement progressive enhancement for different device capabilities\n   - Create clear visual hierarchy that guides users through the content\n   - Add contextual help or onboarding elements if needed\n   - Ensure mobile experience is as engaging as desktop\n\n3) **Performance & Technical Optimization**:\n   - Optimize animation performance for consistent 60fps\n   - Add intelligent preloading for all visual assets\n   - Implement efficient memory management for complex animations\n   - Add graceful degradation for less capable devices\n   - Optimize bundle size and loading times\n\n4) **Visual Polish & Aesthetic Enhancement**:\n   - Perfect color harmony and contrast ratios\n   - Add atmospheric effects and ambient animations\n   - Implement dynamic lighting or shadow effects\n   - Fine-tune typography and content readability during animations\n   - Add subtle sound design cues (visual feedback for audio-like experiences)\n\n5) **Content Integration & Messaging**:\n   - Ensure hero content (headlines, CTAs) integrates seamlessly with animations\n   - Add compelling copy that matches the energy of the animations\n   - Implement clear calls-to-action that feel natural within the experience\n   - Create smooth transitions to the rest of the page content\n   - Add social proof or trust signals that enhance credibility\n\n6) **Creative Asset Integration**:\n   - Use vibemedia.space for all final visual elements and icons\n   - Format: https://vibemedia.space/[UNIQUE_ID].png?prompt=[DETAILED DESCRIPTION]\n   - Add &removeBackground=true for clean integration\n   - Create dynamic visual systems that enhance the animation story\n   - Implement context-aware visual elements that respond to interactions\n\n7) **Browser Compatibility & Testing**:\n   - Test across all major browsers and devices\n   - Add vendor prefixes and fallbacks where needed\n   - Implement feature detection for advanced capabilities\n   - Ensure consistent experience across different screen sizes\n   - Add error handling for edge cases\n\n**Iframe-specific final optimization**:\n- Verify all interactions work smoothly within iframe boundaries\n- Test performance optimization maintains quality in iframe context\n- Ensure accessibility features work properly in iframe environment\n- Confirm all visual elements render correctly\n\nFinal requirements:\n- Combine all previous work into one cohesive, polished hero section\n- Ensure the hero feels thrilling and new while remaining functional\n- Add comprehensive error handling and graceful degradation\n- Optimize for Core Web Vitals and page speed\n- Create an experience that makes users want to stay and explore\n- Use vibemedia.space for all visual assets throughout the experience\n\nDeliver the complete, production-ready hero section that combines stunning animations with excellent usability, accessibility, and performance - a hero that truly stops users in their tracks and makes them feel excited about what comes next."
    ],
    model: "google/gemini-2.5-flash-lite",
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