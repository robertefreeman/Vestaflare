#!/usr/bin/env bun

import express, { Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { MCPServer } from "./server.js";

// Environment variables are automatically available via process.env

// Default port from environment or fallback
let PORT = parseInt(process.env.PORT || "8123", 10);

// Parse command-line arguments for --port=XXXX
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--port=")) {
    const value = parseInt(arg.split("=")[1], 10);
    if (!isNaN(value)) {
      PORT = value;
    } else {
      console.error("Invalid value for --port");
      process.exit(1);
    }
  }
}

const server = new MCPServer(
  new Server(
    {
      name: process.env.MCP_SERVER_NAME || "mcp-server",
      version: process.env.MCP_SERVER_VERSION || "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  )
);

const app = express();

/**
 * Authentication utility functions for MCP server
 */
class AuthUtils {
  /**
   * Validate API key from request headers
   */
  static validateApiKey(req: Request): boolean {
    // Check if authentication is required
    const authRequired = process.env.MCP_AUTH_REQUIRED === 'true';
    if (!authRequired) {
      return true; // Authentication not required
    }

    const expectedApiKey = process.env.MCP_API_KEY;
    if (!expectedApiKey) {
      console.error('MCP_API_KEY not set but authentication is required');
      return false;
    }

    const headerName = process.env.MCP_AUTH_HEADER_NAME || 'Authorization';
    const authHeader = req.headers[headerName.toLowerCase()] as string;
    
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
   * Authentication middleware
   */
  static authMiddleware(req: Request, res: Response, next: any) {
    // Skip authentication for OPTIONS requests and root endpoint
    if (req.method === 'OPTIONS' || req.path === '/') {
      return next();
    }

    // Check authentication for MCP endpoints
    if (req.path === '/mcp' && !AuthUtils.validateApiKey(req)) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Unauthorized: Invalid or missing API key'
        },
        id: null
      }).header('WWW-Authenticate', 'Bearer realm="MCP Server"');
    }

    next();
  }
}

// Add request logging for debugging
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Add CORS headers
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', process.env.CORS_METHODS || 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', process.env.CORS_HEADERS || 'Content-Type, mcp-session-id, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Add authentication middleware
app.use(AuthUtils.authMiddleware);

// Add root endpoint for debugging
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'MCP Streamable HTTP Server Running',
    endpoint: '/mcp',
    methods: ['GET', 'POST'],
    version: '1.0.0'
  });
});

const router = express.Router();

// single endpoint for the client to send messages to
const MCP_ENDPOINT = "/mcp";

router.post(MCP_ENDPOINT, async (req: Request, res: Response) => {
  await server.handlePostRequest(req, res);
});

router.get(MCP_ENDPOINT, async (req: Request, res: Response) => {
  await server.handleGetRequest(req, res);
});

app.use("/", router);

app.listen(PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await server.cleanup();
  process.exit(0);
});