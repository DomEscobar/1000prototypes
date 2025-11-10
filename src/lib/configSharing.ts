import { Agent } from './api';

export interface SharedConfig {
  version: number;
  apiKeys?: {
    openRouterApiKey?: string;
    openRouterBaseUrl?: string;
    wavespeedApiKey?: string;
  };
  agents?: Agent[];
  timestamp?: string;
}

const AGENTS_STORAGE_KEY = 'creative-ai-agents';
const OPENROUTER_API_KEY_STORAGE_KEY = 'openrouter-api-key';
const OPENROUTER_BASE_URL_STORAGE_KEY = 'openrouter-base-url';
const WAVESPEED_API_KEY_STORAGE_KEY = 'wavespeed-api-key';

export function exportConfiguration(includeApiKeys: boolean = true, includeAgents: boolean = true): SharedConfig {
  const config: SharedConfig = {
    version: 1,
    timestamp: new Date().toISOString()
  };

  if (includeApiKeys) {
    const openRouterApiKey = localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY);
    const openRouterBaseUrl = localStorage.getItem(OPENROUTER_BASE_URL_STORAGE_KEY);
    const wavespeedApiKey = localStorage.getItem(WAVESPEED_API_KEY_STORAGE_KEY);

    if (openRouterApiKey || openRouterBaseUrl || wavespeedApiKey) {
      config.apiKeys = {};
      if (openRouterApiKey) config.apiKeys.openRouterApiKey = openRouterApiKey;
      if (openRouterBaseUrl) config.apiKeys.openRouterBaseUrl = openRouterBaseUrl;
      if (wavespeedApiKey) config.apiKeys.wavespeedApiKey = wavespeedApiKey;
    }
  }

  if (includeAgents) {
    const agentsData = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (agentsData) {
      try {
        config.agents = JSON.parse(agentsData);
      } catch (error) {
        console.error('Error parsing agents data:', error);
      }
    }
  }

  return config;
}

export function encodeConfiguration(config: SharedConfig): string {
  const jsonString = JSON.stringify(config);
  return btoa(encodeURIComponent(jsonString));
}

export function decodeConfiguration(encoded: string): SharedConfig | null {
  try {
    const jsonString = decodeURIComponent(atob(encoded));
    const config = JSON.parse(jsonString) as SharedConfig;
    
    if (!config.version || config.version !== 1) {
      console.warn('Unknown configuration version');
      return null;
    }
    
    return config;
  } catch (error) {
    console.error('Error decoding configuration:', error);
    return null;
  }
}

export function generateShareableLink(config: SharedConfig): string {
  const encoded = encodeConfiguration(config);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#config=${encoded}`;
}

export function getConfigFromUrl(): SharedConfig | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#config=')) {
    return null;
  }
  
  const encoded = hash.substring(8);
  return decodeConfiguration(encoded);
}

export function importConfiguration(
  config: SharedConfig,
  options: {
    importApiKeys?: boolean;
    importAgents?: boolean;
    overwriteExisting?: boolean;
  } = {}
): {
  apiKeysImported: boolean;
  agentsImported: boolean;
  agentsCount: number;
} {
  const {
    importApiKeys = true,
    importAgents = true,
    overwriteExisting = false
  } = options;

  let apiKeysImported = false;
  let agentsImported = false;
  let agentsCount = 0;

  if (importApiKeys && config.apiKeys) {
    if (config.apiKeys.openRouterApiKey) {
      if (overwriteExisting || !localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY)) {
        localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, config.apiKeys.openRouterApiKey);
        apiKeysImported = true;
      }
    }
    
    if (config.apiKeys.openRouterBaseUrl) {
      if (overwriteExisting || !localStorage.getItem(OPENROUTER_BASE_URL_STORAGE_KEY)) {
        localStorage.setItem(OPENROUTER_BASE_URL_STORAGE_KEY, config.apiKeys.openRouterBaseUrl);
        apiKeysImported = true;
      }
    }
    
    if (config.apiKeys.wavespeedApiKey) {
      if (overwriteExisting || !localStorage.getItem(WAVESPEED_API_KEY_STORAGE_KEY)) {
        localStorage.setItem(WAVESPEED_API_KEY_STORAGE_KEY, config.apiKeys.wavespeedApiKey);
        apiKeysImported = true;
      }
    }

    if (apiKeysImported) {
      window.dispatchEvent(new CustomEvent('apiKeyUpdated'));
    }
  }

  if (importAgents && config.agents && config.agents.length > 0) {
    const existingAgentsData = localStorage.getItem(AGENTS_STORAGE_KEY);
    let existingAgents: Agent[] = [];
    
    if (existingAgentsData) {
      try {
        existingAgents = JSON.parse(existingAgentsData);
      } catch (error) {
        console.error('Error parsing existing agents:', error);
      }
    }

    if (overwriteExisting) {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(config.agents));
      agentsCount = config.agents.length;
      agentsImported = true;
    } else {
      const existingIds = new Set(existingAgents.map(a => a.id));
      const newAgents = config.agents.filter(a => !existingIds.has(a.id));
      
      if (newAgents.length > 0) {
        const mergedAgents = [...existingAgents, ...newAgents];
        localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(mergedAgents));
        agentsCount = newAgents.length;
        agentsImported = true;
      }
    }

    if (agentsImported) {
      window.dispatchEvent(new CustomEvent('agentsUpdated'));
    }
  }

  return {
    apiKeysImported,
    agentsImported,
    agentsCount
  };
}

export function clearConfigFromUrl(): void {
  if (window.location.hash.startsWith('#config=')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

