#!/usr/bin/env node

/**
 * Simple example client to demonstrate Vestaboard MCP Server communication
 * This shows how to interact with a Vestaboard through the MCP server
 */

const SERVER_URL = 'http://localhost:8123/mcp';

// Authentication configuration (set these if your server requires authentication)
const USE_AUTH = false; // Set to true if your server has MCP_AUTH_REQUIRED=true
const API_KEY = 'your-api-key-here'; // Replace with your actual API key
const AUTH_HEADER = 'Authorization'; // Header name (matches MCP_AUTH_HEADER_NAME)

/**
 * Get headers with optional authentication
 */
function getAuthHeaders(includeContentType = true) {
  const headers = {};
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (USE_AUTH && API_KEY) {
    // Support both Bearer token format and direct API key format
    // Use Bearer format (recommended):
    headers[AUTH_HEADER] = `Bearer ${API_KEY}`;
    // Or use direct format:
    // headers[AUTH_HEADER] = API_KEY;
  }
  
  return headers;
}

// Example: Initialize the MCP connection
async function initializeMCP() {
  const initRequest = {
    jsonrpc: "2.0",
    id: "init-1",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {}
      },
      clientInfo: {
        name: "example-client",
        version: "1.0.0"
      }
    }
  };

  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(initRequest)
    });

    const data = await response.json();
    console.log('Initialize response:', JSON.stringify(data, null, 2));
    
    // Extract session ID from response headers if available
    const sessionId = response.headers.get('mcp-session-id');
    return sessionId;
  } catch (error) {
    console.error('Error initializing MCP:', error);
    return null;
  }
}

// Example: List available tools
async function listTools(sessionId) {
  const listToolsRequest = {
    jsonrpc: "2.0",
    id: "list-tools-1",
    method: "tools/list",
    params: {}
  };

  const headers = getAuthHeaders();
  
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(listToolsRequest)
    });

    const data = await response.json();
    console.log('Available tools:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error listing tools:', error);
    return null;
  }
}

// Example: Get current message from Vestaboard
async function getCurrentMessage(sessionId) {
  const callToolRequest = {
    jsonrpc: "2.0",
    id: "call-tool-1",
    method: "tools/call",
    params: {
      name: "get-current-message",
      arguments: {}
    }
  };

  const headers = getAuthHeaders();
  
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(callToolRequest)
    });

    const data = await response.json();
    console.log('Current Vestaboard message:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error getting current message:', error);
    return null;
  }
}

// Example: Post message to Vestaboard
async function postMessage(sessionId, text = 'HELLO WORLD\nFROM MCP!', useVBML = true) {
  const callToolRequest = {
    jsonrpc: "2.0",
    id: "call-tool-2",
    method: "tools/call",
    params: {
      name: "post-message",
      arguments: {
        text: text,
        useVBML: useVBML
      }
    }
  };

  const headers = getAuthHeaders();
  
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(callToolRequest)
    });

    const data = await response.json();
    console.log(`Posted message to Vestaboard:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error posting message to Vestaboard:', error);
    return null;
  }
}

// Main execution
async function main() {
  console.log('=== Vestaboard MCP Client Example ===\n');
  
  console.log('1. Initializing MCP connection...');
  const sessionId = await initializeMCP();
  
  console.log('\n2. Listing available tools...');
  await listTools(sessionId);
  
  console.log('\n3. Getting current Vestaboard message...');
  await getCurrentMessage(sessionId);
  
  console.log('\n4. Posting a message to Vestaboard...');
  await postMessage(sessionId, 'HELLO {red}\nVESTABOARD!\n\nFrom MCP Server', true);
  
  console.log('\n=== Example completed ===');
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}