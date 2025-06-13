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
    debugLog('=== VESTABOARD API REQUEST START ===');
    debugLog(`Method: ${method}, Endpoint: "${endpoint}"`);
    const url = `${VESTABOARD_API_BASE}/${endpoint}`;
    debugLog('Full URL:', url);
    // Use Read/Write Key authentication for Read-Write API
    let headers = {
        'Content-Type': 'application/json',
    };
    debugLog('Environment variable check:', {
        hasVestaboardKey: !!env?.VESTABOARD_READ_WRITE_KEY,
        keyLength: env?.VESTABOARD_READ_WRITE_KEY?.length || 0
    });
    if (env?.VESTABOARD_READ_WRITE_KEY) {
        headers['X-Vestaboard-Read-Write-Key'] = env.VESTABOARD_READ_WRITE_KEY;
        debugLog('Added Vestaboard Read-Write Key to headers');
    }
    else {
        debugLog('CRITICAL ERROR: VESTABOARD_READ_WRITE_KEY is missing or undefined');
        console.error('VESTABOARD_READ_WRITE_KEY is required for Read-Write API');
        return null;
    }
    try {
        debugLog('Request details:', {
            url,
            method,
            headers: { ...headers, 'X-Vestaboard-Read-Write-Key': '[REDACTED]' },
            bodyType: body ? typeof body : 'undefined',
            bodyIsArray: Array.isArray(body),
            bodyLength: body ? JSON.stringify(body).length : 0
        });
        if (body) {
            debugLog('Request body preview:', Array.isArray(body) ? `${body.length}x${body[0]?.length || 0} matrix` : body);
        }
        debugLog('Making fetch request...');
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        debugLog('Fetch completed:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });
        if (!response.ok) {
            const errorText = await response.text();
            debugLog('HTTP error response body:', errorText);
            console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        debugLog('Parsing JSON response...');
        const responseData = await response.json();
        debugLog('Parsed response data:', responseData);
        debugLog('=== VESTABOARD API REQUEST SUCCESS ===');
        return responseData;
    }
    catch (error) {
        debugLog('=== VESTABOARD API REQUEST ERROR ===');
        debugLog('Caught error:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
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
        id: request.id ?? null
    };
}
async function handleListTools(request) {
    return {
        jsonrpc: "2.0",
        result: {
            tools: [
                {
                    name: "get-current-message",
                    description: "Get the current message displayed on the Vestaboard using Read-Write API",
                    inputSchema: {
                        type: "object",
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: "post-message",
                    description: "Post a new message to the Vestaboard using Read-Write API with character codes",
                    inputSchema: {
                        type: "object",
                        properties: {
                            text: {
                                type: "string",
                                description: "The message text to display. Can use VBML formatting like {red}, {blue}, etc. for colored squares, or plain text. Max 6 lines, 22 characters per line.",
                            },
                        },
                        required: ["text"],
                    },
                }
            ],
        },
        id: request.id ?? null
    };
}
async function handleCallTool(request, env) {
    debugLog('=== HANDLE CALL TOOL START ===');
    debugLog('Request params:', request.params);
    const { name: toolName, arguments: args } = request.params;
    debugLog('Tool execution:', { toolName, args });
    if (toolName === "get-current-message") {
        debugLog('Executing get-current-message tool');
        // Get current message from Vestaboard Read-Write API
        // The Read-Write API endpoint is just the base URL (empty endpoint)
        const endpoint = '';
        const response = await makeVestaboardRequest(endpoint, 'GET', undefined, env);
        if (!response) {
            return {
                jsonrpc: "2.0",
                result: {
                    content: [
                        {
                            type: "text",
                            text: "Failed to get current message from Vestaboard Read-Write API. Please check:\n- Your VESTABOARD_READ_WRITE_KEY is valid\n- Your Vestaboard device is online\n\nCheck the server logs for more detailed error information.",
                        },
                    ],
                },
                id: request.id ?? null
            };
        }
        // Convert the response to readable text if it contains character codes
        let displayText = "Current message retrieved successfully";
        if (response && Array.isArray(response) && response.length > 0) {
            // If response is a character codes matrix
            displayText = characterCodesToText(response);
        }
        else if (response && response.currentMessage && response.currentMessage.layout) {
            // If response has currentMessage.layout structure
            displayText = characterCodesToText(response.currentMessage.layout);
        }
        else if (response && response.text) {
            // If response has text field
            displayText = response.text;
        }
        else {
            // Show raw response if format is unknown
            displayText = `Raw response: ${JSON.stringify(response, null, 2)}`;
        }
        return {
            jsonrpc: "2.0",
            result: {
                content: [
                    {
                        type: "text",
                        text: `Current Vestaboard message:\n\n${displayText}`,
                    },
                ],
            },
            id: request.id ?? null
        };
    }
    if (toolName === "post-message") {
        debugLog('=== POST MESSAGE TOOL EXECUTION START ===');
        debugLog('Args received:', args);
        const text = args.text;
        debugLog('Input text:', { text, textLength: text?.length });
        if (!text) {
            debugLog('ERROR: No text provided for Vestaboard message');
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
                id: request.id ?? null
            };
        }
        debugLog('Converting text to character codes...');
        const characterCodes = vbmlToCharacterCodes(text);
        debugLog('Character codes conversion result:', {
            matrixSize: `${characterCodes.length}x${characterCodes[0]?.length || 0}`,
            firstRow: characterCodes[0]?.slice(0, 5) || [],
            totalCharacters: characterCodes.flat().filter(c => c !== 0).length
        });
        // Post message to Vestaboard Read-Write API
        // The Read-Write API endpoint is just the base URL (empty endpoint)
        const endpoint = '';
        debugLog('Preparing API request:', { endpoint, method: 'POST' });
        // The Read-Write API expects the character codes in the request body
        const postData = characterCodes;
        debugLog('About to call makeVestaboardRequest...');
        const response = await makeVestaboardRequest(endpoint, 'POST', postData, env);
        debugLog('makeVestaboardRequest returned:', {
            hasResponse: !!response,
            responseType: typeof response,
            responseKeys: response ? Object.keys(response) : []
        });
        if (!response) {
            debugLog('ERROR: No response from Vestaboard API - returning failure message');
            return {
                jsonrpc: "2.0",
                result: {
                    content: [
                        {
                            type: "text",
                            text: "Failed to post message to Vestaboard Read-Write API. Please check:\n- Your VESTABOARD_READ_WRITE_KEY is valid\n- The message format is correct\n- Your Vestaboard device is online\n\nCheck the server logs for more detailed error information.",
                        },
                    ],
                },
                id: request.id ?? null
            };
        }
        debugLog('SUCCESS: Vestaboard API call succeeded');
        const displayText = characterCodesToText(characterCodes);
        debugLog('Display text generated:', { displayText });
        const successResponse = {
            jsonrpc: "2.0",
            result: {
                content: [
                    {
                        type: "text",
                        text: `Successfully posted message to Vestaboard!\n\nDisplayed text:\n${displayText}`,
                    },
                ],
            },
            id: request.id ?? null
        };
        debugLog('=== POST MESSAGE TOOL EXECUTION SUCCESS ===');
        debugLog('Returning success response:', successResponse);
        return successResponse;
    }
    return {
        jsonrpc: "2.0",
        error: {
            code: -32601,
            message: `Tool not found: ${toolName}`
        },
        id: request.id ?? null
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
// Enhanced logging function that ensures output appears in wrangler tail
function debugLog(message, data) {
    const timestamp = new Date().toISOString();
    const logMessage = `[VESTAFLARE-DEBUG ${timestamp}] ${message}`;
    console.log(logMessage);
    if (data !== undefined) {
        console.log(`[VESTAFLARE-DATA ${timestamp}]`, JSON.stringify(data, null, 2));
    }
    // Force flush by also logging to console.error for visibility
    console.error(`[VESTAFLARE-TRACE] ${message}`);
}
export default {
    async fetch(request, env, ctx) {
        debugLog('=== WORKER FETCH START ===');
        debugLog('Request method:', request.method);
        debugLog('Request URL:', request.url);
        // Log environment variable availability (without exposing secrets)
        debugLog('Environment check:', {
            hasVestaboardKey: !!env?.VESTABOARD_READ_WRITE_KEY,
            hasVestaboardBase: !!env?.VESTABOARD_API_BASE_URL,
            hasMcpApiKey: !!env?.MCP_API_KEY,
            authRequired: env?.MCP_AUTH_REQUIRED,
            environment: env?.ENVIRONMENT
        });
        // Set up CORS headers for all responses
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, Authorization',
        };
        // Handle preflight OPTIONS requests
        if (request.method === 'OPTIONS') {
            debugLog('Handling OPTIONS preflight request');
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }
        try {
            const url = new URL(request.url);
            debugLog('Parsed URL pathname:', url.pathname);
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
                debugLog('Processing /mcp endpoint');
                // Check authentication for MCP endpoints
                debugLog('Checking authentication...');
                if (!AuthUtils.validateApiKey(request, env)) {
                    debugLog('Authentication failed - returning unauthorized response');
                    return AuthUtils.createUnauthorizedResponse();
                }
                debugLog('Authentication passed');
                if (request.method === 'GET') {
                    debugLog('Handling GET request for SSE');
                    // Handle SSE requests
                    const sessionId = request.headers.get('mcp-session-id') || generateSessionId();
                    debugLog('SSE session ID:', sessionId);
                    return createSSEResponse(sessionId);
                }
                if (request.method === 'POST') {
                    debugLog('Handling POST request for JSON-RPC');
                    // Handle JSON-RPC requests
                    try {
                        debugLog('Parsing JSON body...');
                        const body = await request.json();
                        debugLog('Parsed JSON-RPC request:', { method: body.method, id: body.id });
                        let response;
                        switch (body.method) {
                            case 'initialize':
                                debugLog('Handling initialize method');
                                response = await handleInitialize(body, env);
                                break;
                            case 'initialized':
                                debugLog('Handling initialized notification');
                                // MCP initialized notification - no response needed
                                return new Response(null, {
                                    status: 204,
                                    headers: corsHeaders,
                                });
                            case 'tools/list':
                                debugLog('Handling tools/list method');
                                response = await handleListTools(body);
                                break;
                            case 'tools/call':
                                debugLog('Handling tools/call method');
                                response = await handleCallTool(body, env);
                                debugLog('tools/call response:', response);
                                break;
                            default:
                                debugLog('Unknown method:', body.method);
                                response = {
                                    jsonrpc: "2.0",
                                    error: {
                                        code: -32601,
                                        message: `Method not found: ${body.method}`
                                    },
                                    id: body.id ?? null
                                };
                        }
                        debugLog('Sending JSON-RPC response:', {
                            hasResult: !!response.result,
                            hasError: !!response.error,
                            id: response.id
                        });
                        return new Response(JSON.stringify(response), {
                            status: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                ...corsHeaders,
                            },
                        });
                    }
                    catch (error) {
                        debugLog('JSON parsing error:', {
                            name: error instanceof Error ? error.name : 'Unknown',
                            message: error instanceof Error ? error.message : String(error)
                        });
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
