import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  Notification,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  LoggingMessageNotification,
  ToolListChangedNotification,
  JSONRPCNotification,
  JSONRPCError,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";
import { Request, Response } from "express";

const SESSION_ID_HEADER_NAME = process.env.MCP_SESSION_HEADER_NAME || "mcp-session-id";
const JSON_RPC = "2.0";
const VESTABOARD_API_BASE = process.env.VESTABOARD_API_BASE_URL || "https://rw.vestaboard.com";
const VESTABOARD_READ_WRITE_KEY = process.env.VESTABOARD_READ_WRITE_KEY;
const VESTABOARD_SUBSCRIPTION_ID = process.env.VESTABOARD_SUBSCRIPTION_ID;
const VESTABOARD_API_KEY = process.env.VESTABOARD_API_KEY;
const VESTABOARD_API_SECRET = process.env.VESTABOARD_API_SECRET;

// Helper function for making Vestaboard API requests
async function makeVestaboardRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<T | null> {
  const url = `${VESTABOARD_API_BASE}/${endpoint}`;
  
  // Use Read/Write Key for simpler authentication if available
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (VESTABOARD_READ_WRITE_KEY) {
    headers['X-Vestaboard-Read-Write-Key'] = VESTABOARD_READ_WRITE_KEY;
  } else if (VESTABOARD_API_KEY && VESTABOARD_API_SECRET) {
    // Use API Key/Secret authentication
    headers['X-Vestaboard-Api-Key'] = VESTABOARD_API_KEY;
    headers['X-Vestaboard-Api-Secret'] = VESTABOARD_API_SECRET;
  } else {
    console.error('No Vestaboard authentication credentials provided');
    return null;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making Vestaboard request:", error);
    return null;
  }
}

// VBML to character codes conversion
const VBML_CHARACTER_MAP: Record<string, number> = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10,
  'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15, 'P': 16, 'Q': 17, 'R': 18, 'S': 19, 'T': 20,
  'U': 21, 'V': 22, 'W': 23, 'X': 24, 'Y': 25, 'Z': 26,
  '0': 27, '1': 28, '2': 29, '3': 30, '4': 31, '5': 32, '6': 33, '7': 34, '8': 35, '9': 36,
  '!': 37, '@': 38, '#': 39, '$': 40, '(': 41, ')': 42,
  '-': 44, '+': 46, '&': 47, '=': 48, ';': 49, ':': 50, "'": 52, '"': 53, '%': 54, ',': 55,
  '.': 56, '/': 59, '?': 60, ' ': 0, // Space character
  // Add colored squares
  '{red}': 63, '{orange}': 64, '{yellow}': 65, '{green}': 66, '{blue}': 67, '{violet}': 68, '{white}': 69
};

// Convert VBML text to character codes matrix (6 rows x 22 columns)
function vbmlToCharacterCodes(vbml: string): number[][] {
  const matrix: number[][] = Array(6).fill(null).map(() => Array(22).fill(0));
  let row = 0;
  let col = 0;
  
  for (let i = 0; i < vbml.length && row < 6; i++) {
    const char = vbml[i].toUpperCase();
    
    // Handle colored squares
    if (char === '{') {
      const endIndex = vbml.indexOf('}', i);
      if (endIndex !== -1) {
        const colorCode = vbml.substring(i, endIndex + 1).toLowerCase();
        if (VBML_CHARACTER_MAP[colorCode]) {
          matrix[row][col] = VBML_CHARACTER_MAP[colorCode];
          col++;
          i = endIndex;
        }
      }
    } else if (char === '\n') {
      row++;
      col = 0;
    } else if (VBML_CHARACTER_MAP[char] !== undefined) {
      matrix[row][col] = VBML_CHARACTER_MAP[char];
      col++;
    }
    
    // Move to next row if we exceed column limit
    if (col >= 22) {
      row++;
      col = 0;
    }
  }
  
  return matrix;
}

// Convert character codes matrix to readable text
function characterCodesToText(matrix: number[][]): string {
  const codeToChar: Record<number, string> = {};
  Object.entries(VBML_CHARACTER_MAP).forEach(([char, code]) => {
    codeToChar[code] = char;
  });
  codeToChar[0] = ' '; // Space
  
  return matrix.map(row => 
    row.map(code => codeToChar[code] || '?').join('')
  ).join('\n');
}

interface VestaboardMessage {
  currentMessage?: {
    layout: number[][];
  };
}

interface VestaboardPostResponse {
  created: {
    id: string;
    text?: string;
  };
}

export class MCPServer {
  server: Server;

  // to support multiple simultaneous connections
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  private toolInterval: NodeJS.Timeout | undefined;
  private getCurrentMessageToolName = "get-current-message";
  private postMessageToolName = "post-message";

  constructor(server: Server) {
    this.server = server;
    this.setupTools();
    this.setupHttpHandlers();
  }

  private setupHttpHandlers() {
    // Handle initialize request
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      console.log('[HTTP] Initialize request received:', request);
      return {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          logging: {}
        },
        serverInfo: {
          name: process.env.MCP_SERVER_NAME || "mcp-server",
          version: process.env.MCP_SERVER_VERSION || "1.0.0"
        }
      };
    });
  }

  async handleGetRequest(req: Request, res: Response) {
    // if server does not offer an SSE stream at this endpoint.
    // res.status(405).set('Allow', 'POST').send('Method Not Allowed')

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    console.log(`[GET /mcp] Session ID: ${sessionId}`);
    
    if (!sessionId || !this.transports[sessionId]) {
      console.log('[GET /mcp] No valid session ID found, returning 400');
      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    }

    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);
    await this.streamMessages(transport);

    return;
  }

  // New method to handle simple HTTP request-response
  async handleHttpRequest(req: Request, res: Response) {
    try {
      const request = req.body;
      console.log(`[HTTP Request] Method: ${request.method}, ID: ${request.id}`);
      console.log(`[HTTP Request] Full request:`, JSON.stringify(request, null, 2));
      
      // Special handling for initialize
      if (request.method === 'initialize') {
        const result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            logging: {}
          },
          serverInfo: {
            name: process.env.MCP_SERVER_NAME || "mcp-server",
            version: process.env.MCP_SERVER_VERSION || "1.0.0"
          }
        };
        
        const response = {
          jsonrpc: "2.0",
          result: result,
          id: request.id
        };
        
        console.log(`[HTTP Response] Sending:`, JSON.stringify(response, null, 2));
        res.json(response);
        return;
      }
      
      // Handle other requests
      const handler = (this.server as any)._requestHandlers.get(request.method);
      if (!handler) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          },
          id: request.id
        });
        return;
      }

      // Call the handler - pass the full request object
      const result = await handler(request, {});
      
      // Send response
      const response = {
        jsonrpc: "2.0",
        result: result,
        id: request.id
      };
      
      console.log(`[HTTP Response] Sending:`, JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error: any) {
      console.error(`[HTTP Error]`, error);
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error.message || "Internal error"
        },
        id: req.body?.id
      });
    }
  }

  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers[SESSION_ID_HEADER_NAME] as string | undefined;
    console.log(`[POST /mcp] Session ID: ${sessionId}`);
    console.log(`[POST /mcp] Is Initialize Request: ${this.isInitializeRequest(req.body)}`);
    
    // For simple HTTP clients (like VS Code extension), use direct handling
    if (!sessionId && req.body && req.body.jsonrpc) {
      console.log('[POST /mcp] Handling as simple HTTP request');
      return this.handleHttpRequest(req, res);
    }
    
    let transport: StreamableHTTPServerTransport;

    try {
      // reuse existing transport
      if (sessionId && this.transports[sessionId]) {
        console.log(`[POST /mcp] Reusing existing transport for session: ${sessionId}`);
        transport = this.transports[sessionId];
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // create new transport
      if (!sessionId && this.isInitializeRequest(req.body)) {
        console.log('[POST /mcp] Creating new transport for initialize request');
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        await this.server.connect(transport);
        console.log('[POST /mcp] Server connected to transport');
        
        await transport.handleRequest(req, res, req.body);
        console.log('[POST /mcp] Request handled by transport');

        // session ID will only be available (if in not Stateless-Mode)
        // after handling the first request
        const sessionId = transport.sessionId;
        if (sessionId) {
          console.log(`[POST /mcp] New session created: ${sessionId}`);
          this.transports[sessionId] = transport;
        } else {
          console.log('[POST /mcp] No session ID generated (stateless mode?)');
        }

        return;
      }

      res
        .status(400)
        .json(
          this.createErrorResponse("Bad Request: invalid session ID or method.")
        );
      return;
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res.status(500).json(this.createErrorResponse("Internal server error."));
      return;
    }
  }

  async cleanup() {
    this.toolInterval?.close();
    await this.server.close();
  }

  private setupTools() {
    // Define available tools
    const setToolSchema = () =>
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        const getCurrentMessageToolSchema = {
          name: this.getCurrentMessageToolName,
          description: "Get the current message displayed on the Vestaboard",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        };

        const postMessageToolSchema = {
          name: this.postMessageToolName,
          description: "Post a new message to the Vestaboard using VBML (Vestaboard Markup Language) or plain text",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The message text to display. Can use VBML formatting like {red}, {blue}, etc. for colored squares, or plain text. Max 6 lines, 22 characters per line.",
              },
              useVBML: {
                type: "boolean",
                description: "Whether to parse the text as VBML (default: true). Set to false for raw character codes.",
                default: true,
              },
            },
            required: ["text"],
          },
        };

        return {
          tools: [getCurrentMessageToolSchema, postMessageToolSchema],
        };
      });

    setToolSchema();

    // set tools dynamically, changing 5 second
    this.toolInterval = setInterval(async () => {
      setToolSchema();
      // to notify client that the tool changed
      Object.values(this.transports).forEach((transport) => {
        const notification: ToolListChangedNotification = {
          method: "notifications/tools/list_changed",
        };
        this.sendNotification(transport, notification);
      });
    }, 5000);

    // handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra) => {
        const args = request.params.arguments;
        const toolName = request.params.name;
        console.log("Received request for tool with argument:", toolName, args);

        if (!args) {
          throw new Error("arguments undefined");
        }

        if (!toolName) {
          throw new Error("tool name undefined");
        }

        if (toolName === this.getCurrentMessageToolName) {
          // Get current message from Vestaboard
          let endpoint = 'subscriptions';
          if (VESTABOARD_SUBSCRIPTION_ID) {
            endpoint = `subscriptions/${VESTABOARD_SUBSCRIPTION_ID}`;
          }
          
          const messageData = await makeVestaboardRequest<VestaboardMessage>(endpoint);

          if (!messageData) {
            return {
              content: [
                {
                  type: "text",
                  text: "Failed to retrieve current message from Vestaboard. Please check your authentication credentials.",
                },
              ],
            };
          }

          const currentLayout = messageData.currentMessage?.layout;
          if (!currentLayout) {
            return {
              content: [
                {
                  type: "text",
                  text: "No current message found on Vestaboard.",
                },
              ],
            };
          }

          const readableText = characterCodesToText(currentLayout);
          
          return {
            content: [
              {
                type: "text",
                text: `Current Vestaboard message:\n\n${readableText}`,
              },
            ],
          };
        }

        if (toolName === this.postMessageToolName) {
          const text = args.text as string;
          const useVBML = args.useVBML !== false; // Default to true
          
          if (!text) {
            return {
              content: [
                {
                  type: "text",
                  text: "No text provided for Vestaboard message.",
                },
              ],
            };
          }

          let characterCodes: number[][];
          
          if (useVBML) {
            // Convert VBML text to character codes
            characterCodes = vbmlToCharacterCodes(text);
          } else {
            // For raw text, convert to simple character codes
            characterCodes = vbmlToCharacterCodes(text);
          }

          // Post message to Vestaboard
          let endpoint = 'subscriptions';
          if (VESTABOARD_SUBSCRIPTION_ID) {
            endpoint = `subscriptions/${VESTABOARD_SUBSCRIPTION_ID}/message`;
          }
          
          const postData = useVBML ? { text } : { characters: characterCodes };
          const response = await makeVestaboardRequest<VestaboardPostResponse>(
            endpoint,
            'POST',
            postData
          );

          if (!response) {
            return {
              content: [
                {
                  type: "text",
                  text: "Failed to post message to Vestaboard. Please check your authentication credentials and message format.",
                },
              ],
            };
          }

          const displayText = characterCodesToText(characterCodes);
          
          return {
            content: [
              {
                type: "text",
                text: `Successfully posted message to Vestaboard!\n\nMessage ID: ${response.created.id}\n\nDisplayed text:\n${displayText}`,
              },
            ],
          };
        }

        throw new Error("Tool not found");
      }
    );
  }

  // send message streaming message every second
  private async streamMessages(transport: StreamableHTTPServerTransport) {
    try {
      // based on LoggingMessageNotificationSchema to trigger setNotificationHandler on client
      const message: LoggingMessageNotification = {
        method: "notifications/message",
        params: { level: "info", data: "SSE Connection established" },
      };

      this.sendNotification(transport, message);

      let messageCount = 0;

      const interval = setInterval(async () => {
        messageCount++;

        const data = `Message ${messageCount} at ${new Date().toISOString()}`;

        const message: LoggingMessageNotification = {
          method: "notifications/message",
          params: { level: "info", data: data },
        };

        try {
          this.sendNotification(transport, message);

          if (messageCount === 2) {
            clearInterval(interval);

            const message: LoggingMessageNotification = {
              method: "notifications/message",
              params: { level: "info", data: "Streaming complete!" },
            };

            this.sendNotification(transport, message);
          }
        } catch (error) {
          console.error("Error sending message:", error);
          clearInterval(interval);
        }
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  private async sendNotification(
    transport: StreamableHTTPServerTransport,
    notification: Notification
  ) {
    const rpcNotificaiton: JSONRPCNotification = {
      ...notification,
      jsonrpc: JSON_RPC,
    };
    await transport.send(rpcNotificaiton);
  }

  private createErrorResponse(message: string): JSONRPCError {
    return {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: message,
      },
      id: randomUUID(),
    };
  }

  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };
    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }
    return isInitial(body);
  }
}