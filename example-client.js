#!/usr/bin/env node

/**
 * Simple example client to demonstrate MCP Streamable HTTP communication
 * This shows how to make requests to the MCP server
 */

const SERVER_URL = 'http://localhost:8123/mcp';

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
      headers: {
        'Content-Type': 'application/json',
      },
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

  const headers = {
    'Content-Type': 'application/json',
  };
  
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

// Example: Get weather alerts for California
async function getWeatherAlerts(sessionId, state = 'CA') {
  const callToolRequest = {
    jsonrpc: "2.0",
    id: "call-tool-1",
    method: "tools/call",
    params: {
      name: "get-alerts",
      arguments: {
        state: state
      }
    }
  };

  const headers = {
    'Content-Type': 'application/json',
  };
  
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
    console.log(`Weather alerts for ${state}:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error getting weather alerts:', error);
    return null;
  }
}

// Example: Get weather forecast for New York City
async function getWeatherForecast(sessionId, latitude = 40.7128, longitude = -74.0060) {
  const callToolRequest = {
    jsonrpc: "2.0",
    id: "call-tool-2",
    method: "tools/call",
    params: {
      name: "get-forecast",
      arguments: {
        latitude: latitude,
        longitude: longitude
      }
    }
  };

  const headers = {
    'Content-Type': 'application/json',
  };
  
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
    console.log(`Weather forecast for ${latitude}, ${longitude}:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error getting weather forecast:', error);
    return null;
  }
}

// Main execution
async function main() {
  console.log('=== MCP Streamable HTTP Client Example ===\n');
  
  console.log('1. Initializing MCP connection...');
  const sessionId = await initializeMCP();
  
  console.log('\n2. Listing available tools...');
  await listTools(sessionId);
  
  console.log('\n3. Getting weather alerts for California...');
  await getWeatherAlerts(sessionId, 'CA');
  
  console.log('\n4. Getting weather forecast for New York City...');
  await getWeatherForecast(sessionId, 40.7128, -74.0060);
  
  console.log('\n=== Example completed ===');
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}