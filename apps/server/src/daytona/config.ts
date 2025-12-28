/**
 * Daytona Configuration
 * Environment-based configuration for Daytona SDK
 */

export interface DaytonaConfig {
  apiKey: string;
  serverUrl?: string;
  timeout?: number;
  defaultResources?: {
    cpu?: number;
    memory?: number;
    disk?: number;
  };
  defaultLanguage?: string;
  region?: string;
}

export function getDaytonaConfig(): DaytonaConfig {
  const apiKey = process.env.DAYTONA_API_KEY;
  
  if (!apiKey) {
    console.warn('[DAYTONA] DAYTONA_API_KEY not set - Daytona features will be unavailable');
  }

  return {
    apiKey: apiKey || '',
    serverUrl: process.env.DAYTONA_SERVER_URL || undefined,
    timeout: process.env.DAYTONA_TIMEOUT 
      ? parseInt(process.env.DAYTONA_TIMEOUT, 10) 
      : 60000,
    defaultResources: {
      cpu: process.env.DAYTONA_DEFAULT_CPU 
        ? parseInt(process.env.DAYTONA_DEFAULT_CPU, 10) 
        : 2,
      memory: process.env.DAYTONA_DEFAULT_MEMORY 
        ? parseInt(process.env.DAYTONA_DEFAULT_MEMORY, 10) 
        : 4096,
      disk: process.env.DAYTONA_DEFAULT_DISK 
        ? parseInt(process.env.DAYTONA_DEFAULT_DISK, 10) 
        : 20480,
    },
    defaultLanguage: process.env.DAYTONA_DEFAULT_LANGUAGE || 'typescript',
    region: process.env.DAYTONA_REGION || undefined,
  };
}

export function isDaytonaEnabled(): boolean {
  return !!process.env.DAYTONA_API_KEY;
}

export const DAYTONA_WORKSPACE_PATH = '/workspace';
export const DAYTONA_DEFAULT_TIMEOUT = 60000;
export const DAYTONA_POLL_INTERVAL = 2000;
export const DAYTONA_MAX_WAIT_TIME = 300000; // 5 minutes
