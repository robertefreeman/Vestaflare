import {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
} from "@modelcontextprotocol/sdk/types.js";
import { Transport, TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";

/**
 * Authentication utility functions for MCP server
 */
export class AuthUtils {
  /**
   * Validate API key from request headers
   */
  static validateApiKey(request: Request, env: any): boolean {
    // Check if authentication is required
    const authRequired = env.MCP_AUTH_REQUIRED === 'true';
    if (!authRequired) {
      return true; // Authentication not required
    }

    const expectedApiKey = env.MCP_API_KEY;
    if (!expectedApiKey) {
      console.error('MCP_API_KEY not set but authentication is required');
      return false;
    }

    const headerName = env.MCP_AUTH_HEADER_NAME || 'Authorization';
    const authHeader = request.headers.get(headerName);
    
    if (!authHeader) {
      return false;
    }

    // Support both "Bearer <token>" format and direct API key format
    let providedKey: string;
    if (authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7); // Remove "Bearer " prefix
    } else {
      providedKey = authHeader;
    }

    return providedKey === expectedApiKey;
  }

  /**
   * Create unauthorized response
   */
  static createUnauthorizedResponse(): Response {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Unauthorized: Invalid or missing API key'
      },
      id: null
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'WWW-Authenticate': 'Bearer realm="MCP Server"'
      },
    });
  }
}

/**
 * Custom MCP transport implementation for Cloudflare Workers
 * Handles both regular HTTP requests and Server-Sent Events (SSE)
 */
export class WorkerTransport implements Transport {
  public sessionId?: string;
  public onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: any }) => void;
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  
  private _closed = false;
  private _sseController?: ReadableStreamDefaultController<Uint8Array>;
  private _sseEncoder = new TextEncoder();

  constructor(sessionId?: string) {
    this.sessionId = sessionId;
  }

  async start(): Promise<void> {
    // No additional startup needed for Workers transport
  }

  /**
   * Handle incoming HTTP POST requests (JSON-RPC)
   */
  async handlePostRequest(request: Request, env?: any): Promise<Response> {
    // Check authentication first
    if (env && !AuthUtils.validateApiKey(request, env)) {
      return AuthUtils.createUnauthorizedResponse();
    }

    try {
      const body = await request.json();
      
      // Handle the request and get response
      const response = await this.processMessage(body);
      
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, Authorization',
          ...(this.sessionId && { 'mcp-session-id': this.sessionId }),
        },
      });
    } catch (error) {
      console.error('Error handling POST request:', error);
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        },
        id: null
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  /**
   * Handle incoming HTTP GET requests (SSE)
   */
  handleGetRequest(request?: Request, env?: any): Response {
    // Check authentication first
    if (request && env && !AuthUtils.validateApiKey(request, env)) {
      return AuthUtils.createUnauthorizedResponse();
    }

    if (!this.sessionId) {
      return new Response('Session ID required for SSE', {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Create SSE stream using TransformStream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Store controller for sending messages
    this._sseController = stream.readable.getReader() as any;
    
    // Create readable stream for SSE
    const sseStream = new ReadableStream({
      start: (controller) => {
        this._sseController = controller;
        
        // Send initial connection event
        this.sendSSEMessage('Connected to MCP server');
        
        // Keep connection alive with periodic pings
        const pingInterval = setInterval(() => {
          if (!this._closed) {
            this.sendSSEMessage('ping', 'ping');
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
      },
      cancel: () => {
        this._closed = true;
        this.onclose?.();
      }
    });

    return new Response(sseStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, mcp-session-id, Authorization',
        'mcp-session-id': this.sessionId,
      },
    });
  }

  /**
   * Process incoming JSON-RPC message
   */
  private async processMessage(message: JSONRPCMessage): Promise<JSONRPCResponse | null> {
    if (this.onmessage) {
      // For requests, we need to return a response
      if ('method' in message && 'id' in message) {
        return new Promise((resolve) => {
          // Set up temporary response handler
          const originalSend = this.send.bind(this);
          this.send = async (response: JSONRPCMessage) => {
            // Restore original send method
            this.send = originalSend;
            resolve(response as JSONRPCResponse);
          };
          
          // Process the message
          this.onmessage!(message);
        });
      } else {
        // For notifications, just process without expecting response
        this.onmessage(message);
        return null;
      }
    }
    
    return {
      jsonrpc: '2.0',
      id: 'id' in message ? message.id : 0,
      error: {
        code: -32601,
        message: 'Method not found'
      }
    } as JSONRPCResponse;
  }

  /**
   * Send SSE message to client
   */
  private sendSSEMessage(data: string, event?: string) {
    if (!this._sseController || this._closed) return;
    
    try {
      let message = '';
      if (event) {
        message += `event: ${event}\n`;
      }
      message += `data: ${data}\n\n`;
      
      const encoded = this._sseEncoder.encode(message);
      this._sseController.enqueue(encoded);
    } catch (error) {
      console.error('Error sending SSE message:', error);
    }
  }

  // Transport interface implementation
  async send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    if (this._closed) {
      throw new Error('Transport is closed');
    }

    // If SSE is active, send via SSE
    if (this._sseController) {
      this.sendSSEMessage(JSON.stringify(message), 'message');
    }
  }

  async close(): Promise<void> {
    if (this._closed) return;
    
    this._closed = true;
    
    if (this._sseController) {
      try {
        this._sseController.close();
      } catch (error) {
        console.error('Error closing SSE controller:', error);
      }
    }
    
    this.onclose?.();
  }


  /**
   * Generate a new session ID
   */
  static generateSessionId(): string {
    return crypto.randomUUID();
  }
}