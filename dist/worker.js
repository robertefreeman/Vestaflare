/**
 * Cloudflare Workers entry point for MCP Server
 *
 * This file serves as the main entry point for the Cloudflare Workers runtime.
 * It implements MCP protocol handling directly for the Workers environment.
 */
// Vestaboard API configuration
const VESTABOARD_API_BASE = "https://rw.vestaboard.com";
// VBML to character codes conversion
const VBML_CHARACTER_MAP = {
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
function vbmlToCharacterCodes(vbml) {
    const matrix = Array(6).fill(null).map(() => Array(22).fill(0));
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
        }
        else if (char === '\n') {
            row++;
            col = 0;
        }
        else if (VBML_CHARACTER_MAP[char] !== undefined) {
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
function characterCodesToText(matrix) {
    const codeToChar = {};
    Object.entries(VBML_CHARACTER_MAP).forEach(([char, code]) => {
        codeToChar[code] = char;
    });
    codeToChar[0] = ' '; // Space
    return matrix.map(row => row.map(code => codeToChar[code] || '?').join('')).join('\n');
}
// Helper function for making Vestaboard API requests
async function makeVestaboardRequest(endpoint, method = 'GET', body, env) {
    const url = `${VESTABOARD_API_BASE}/${endpoint}`;
    // Use Read/Write Key for simpler authentication if available
    let headers = {
        'Content-Type': 'application/json',
    };
    if (env?.VESTABOARD_READ_WRITE_KEY) {
        headers['X-Vestaboard-Read-Write-Key'] = env.VESTABOARD_READ_WRITE_KEY;
    }
    else if (env?.VESTABOARD_API_KEY && env?.VESTABOARD_API_SECRET) {
        // Use API Key/Secret authentication
        headers['X-Vestaboard-Api-Key'] = env.VESTABOARD_API_KEY;
        headers['X-Vestaboard-Api-Secret'] = env.VESTABOARD_API_SECRET;
    }
    else {
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
        return (await response.json());
    }
    catch (error) {
        console.error("Error making Vestaboard request:", error);
        return null;
    }
}
// Authentication utilities
class AuthUtils {
    static validateApiKey(request, env) {
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
        let providedKey;
        if (authHeader.startsWith('Bearer ')) {
            providedKey = authHeader.substring(7); // Remove "Bearer " prefix
        }
        else {
            providedKey = authHeader;
        }
        return providedKey === expectedApiKey;
    }
    static createUnauthorizedResponse() {
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
// MCP request handlers
async function handleInitialize(request, env) {
    return {
        jsonrpc: "2.0",
        result: {
            protocolVersion: "2024-11-05",
            capabilities: {
                tools: {},
                logging: {}
            },
            serverInfo: {
                name: env.MCP_SERVER_NAME || "mcp-server",
                version: env.MCP_SERVER_VERSION || "1.0.0"
            }
        },
        id: request.id || null
    };
}
async function handleListTools() {
    return {
        jsonrpc: "2.0",
        result: {
            tools: [
                {
                    name: "get-current-message",
                    description: "Get the current message displayed on the Vestaboard",
                    inputSchema: {
                        type: "object",
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: "post-message",
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
                }
            ],
        },
        id: null
    };
}
async function handleCallTool(request, env) {
    const { name: toolName, arguments: args } = request.params;
    if (toolName === "get-current-message") {
        // Get current message from Vestaboard
        let endpoint = 'subscriptions';
        if (env.VESTABOARD_SUBSCRIPTION_ID) {
            endpoint = `subscriptions/${env.VESTABOARD_SUBSCRIPTION_ID}`;
        }
        const messageData = await makeVestaboardRequest(endpoint, 'GET', undefined, env);
        if (!messageData) {
            return {
                jsonrpc: "2.0",
                result: {
                    content: [
                        {
                            type: "text",
                            text: "Failed to retrieve current message from Vestaboard. Please check your authentication credentials.",
                        },
                    ],
                },
                id: request.id || null
            };
        }
        const currentLayout = messageData.currentMessage?.layout;
        if (!currentLayout) {
            return {
                jsonrpc: "2.0",
                result: {
                    content: [
                        {
                            type: "text",
                            text: "No current message found on Vestaboard.",
                        },
                    ],
                },
                id: request.id || null
            };
        }
        const readableText = characterCodesToText(currentLayout);
        return {
            jsonrpc: "2.0",
            result: {
                content: [
                    {
                        type: "text",
                        text: `Current Vestaboard message:\n\n${readableText}`,
                    },
                ],
            },
            id: request.id || null
        };
    }
    if (toolName === "post-message") {
        const text = args.text;
        const useVBML = args.useVBML !== false; // Default to true
        if (!text) {
            return {
                jsonrpc: "2.0",
                result: {
                    content: [
                        {
                            type: "text",
                            text: "No text provided for Vestaboard message.",
                        },
                    ],
                },
                id: request.id || null
            };
        }
        const characterCodes = vbmlToCharacterCodes(text);
        // Post message to Vestaboard
        let endpoint = 'subscriptions';
        if (env.VESTABOARD_SUBSCRIPTION_ID) {
            endpoint = `subscriptions/${env.VESTABOARD_SUBSCRIPTION_ID}/message`;
        }
        const postData = useVBML ? { text } : { characters: characterCodes };
        const response = await makeVestaboardRequest(endpoint, 'POST', postData, env);
        if (!response) {
            return {
                jsonrpc: "2.0",
                result: {
                    content: [
                        {
                            type: "text",
                            text: "Failed to post message to Vestaboard. Please check your authentication credentials and message format.",
                        },
                    ],
                },
                id: request.id || null
            };
        }
        const displayText = characterCodesToText(characterCodes);
        return {
            jsonrpc: "2.0",
            result: {
                content: [
                    {
                        type: "text",
                        text: `Successfully posted message to Vestaboard!\n\nMessage ID: ${response.created.id}\n\nDisplayed text:\n${displayText}`,
                    },
                ],
            },
            id: request.id || null
        };
    }
    return {
        jsonrpc: "2.0",
        error: {
            code: -32601,
            message: `Tool not found: ${toolName}`
        },
        id: request.id || null
    };
}
// Session management for SSE connections
const sessions = new Map();
function generateSessionId() {
    return crypto.randomUUID();
}
function createSSEResponse(sessionId) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            // Store session
            sessions.set(sessionId, { controller, encoder });
            // Send initial connection event
            const message = `data: ${JSON.stringify({
                jsonrpc: "2.0",
                method: "notifications/message",
                params: { level: "info", data: "SSE Connection established" }
            })}\n\n`;
            controller.enqueue(encoder.encode(message));
            // Keep-alive ping every 30 seconds
            const pingInterval = setInterval(() => {
                if (sessions.has(sessionId)) {
                    const ping = `data: ${JSON.stringify({
                        jsonrpc: "2.0",
                        method: "notifications/message",
                        params: { level: "info", data: "ping" }
                    })}\n\n`;
                    try {
                        controller.enqueue(encoder.encode(ping));
                    }
                    catch (error) {
                        clearInterval(pingInterval);
                        sessions.delete(sessionId);
                    }
                }
                else {
                    clearInterval(pingInterval);
                }
            }, 30000);
        },
        cancel() {
            sessions.delete(sessionId);
        }
    });
    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control, mcp-session-id, Authorization',
            'mcp-session-id': sessionId,
        },
    });
}
export default {
    async fetch(request, env, ctx) {
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
            // Health check endpoint
            if (url.pathname === '/health') {
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
                if (request.method === 'GET') {
                    // Handle SSE requests
                    const sessionId = request.headers.get('mcp-session-id') || generateSessionId();
                    return createSSEResponse(sessionId);
                }
                if (request.method === 'POST') {
                    // Handle JSON-RPC requests
                    try {
                        const body = await request.json();
                        let response;
                        switch (body.method) {
                            case 'initialize':
                                response = await handleInitialize(body, env);
                                break;
                            case 'tools/list':
                                response = await handleListTools();
                                break;
                            case 'tools/call':
                                response = await handleCallTool(body, env);
                                break;
                            default:
                                response = {
                                    jsonrpc: "2.0",
                                    error: {
                                        code: -32601,
                                        message: `Method not found: ${body.method}`
                                    },
                                    id: body.id || null
                                };
                        }
                        return new Response(JSON.stringify(response), {
                            status: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                ...corsHeaders,
                            },
                        });
                    }
                    catch (error) {
                        return new Response(JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32700,
                                message: 'Parse error'
                            },
                            id: null
                        }), {
                            status: 400,
                            headers: {
                                'Content-Type': 'application/json',
                                ...corsHeaders,
                            },
                        });
                    }
                }
            }
            // Root endpoint returns basic MCP info
            if (url.pathname === '/') {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    result: {
                        name: env.MCP_SERVER_NAME || "mcp-server",
                        version: env.MCP_SERVER_VERSION || "1.0.0",
                        endpoints: {
                            mcp: '/mcp',
                            health: '/health'
                        }
                    },
                    id: null
                }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                });
            }
            // 404 for unknown paths
            return new Response('Not Found', {
                status: 404,
                headers: corsHeaders,
            });
        }
        catch (error) {
            console.error('Worker error:', error);
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
                    ...corsHeaders,
                },
            });
        }
    },
};
