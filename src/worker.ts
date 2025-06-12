/**
 * Cloudflare Workers entry point for MCP Server
 *
 * This file serves as the main entry point for the Cloudflare Workers runtime.
 * It will be adapted to integrate with the existing MCP server logic.
 */

/// <reference types="@cloudflare/workers-types" />

// TODO: Import and adapt MCP server components for Workers runtime
// TODO: Replace Express.js with Workers-compatible request handling
// TODO: Adapt StreamableHTTPServerTransport for Workers environment
// TODO: Implement proper error handling for Workers runtime
// TODO: Add environment variable handling for Workers

import { AuthUtils } from './worker-transport.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Set up CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, Authorization',
    };

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);
      
      // Root endpoint for health check
      if (url.pathname === '/') {
        return new Response(JSON.stringify({
          status: 'MCP Server Template Running on Cloudflare Workers',
          endpoint: '/mcp',
          methods: ['GET', 'POST'],
          version: '1.0.0'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }

      // Main MCP endpoint
      if (url.pathname === '/mcp') {
        // Check authentication for MCP endpoints
        if (!AuthUtils.validateApiKey(request, env)) {
          return AuthUtils.createUnauthorizedResponse();
        }

        // TODO: Implement MCP server logic here
        // TODO: Handle both GET (SSE) and POST (JSON-RPC) requests
        // TODO: Integrate weather tools (get-alerts, get-forecast)
        // TODO: Implement session management compatible with Workers
        
        if (request.method === 'GET') {
          // TODO: Implement SSE streaming for Workers
          return new Response('SSE endpoint not yet implemented', {
            status: 501,
            headers: corsHeaders,
          });
        }
        
        if (request.method === 'POST') {
          // TODO: Implement JSON-RPC request handling
          const body = await request.json();
          
          // Basic response structure - to be replaced with actual MCP handling
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              message: 'MCP server logic not yet implemented'
            }
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }

      // 404 for unknown paths
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });

    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};

// Environment interface for type safety
interface Env {
  // Server Configuration
  ENVIRONMENT?: string;
  MCP_SERVER_NAME?: string;
  MCP_SERVER_VERSION?: string;
  MCP_SESSION_HEADER_NAME?: string;
  
  // MCP Authentication Configuration
  MCP_AUTH_REQUIRED?: string;
  MCP_API_KEY?: string;
  MCP_AUTH_HEADER_NAME?: string;
  
  // Weather API Configuration
  WEATHER_API_BASE_URL?: string;
  USER_AGENT?: string;
  
  // API Keys (add as needed for your MCP tools)
  WEATHER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  
  // Database Configuration
  DATABASE_URL?: string;
  REDIS_URL?: string;
  
  // External Service URLs
  EXTERNAL_API_URL?: string;
  WEBHOOK_BASE_URL?: string;
  
  // Feature Flags
  ENABLE_LOGGING?: string;
  ENABLE_CORS?: string;
  ENABLE_DEBUG_MODE?: string;
  
  // Security Configuration
  JWT_SECRET?: string;
  API_KEY_HEADER?: string;
  
  // CORS Configuration
  CORS_ORIGIN?: string;
  CORS_METHODS?: string;
  CORS_HEADERS?: string;
}