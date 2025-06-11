# MCP Streamable HTTP Server

This is an MCP (Model Context Protocol) Streamable HTTP Server implementation based on the example from [invariantlabs-ai/mcp-streamable-http](https://github.com/invariantlabs-ai/mcp-streamable-http).

## Features

This server provides weather-related tools using the National Weather Service API:

- **get-alerts**: Get weather alerts for a US state
- **get-forecast**: Get weather forecast for specific coordinates (latitude/longitude)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Run the Server

```bash
node build/index.js
```

By default, the server will start at `http://localhost:8123`.

If you'd like to specify a different port, use the `--port` flag:

```bash
node build/index.js --port=9000
```

## API Endpoints

The server exposes a single MCP endpoint at `/mcp` that handles both POST and GET requests:

- **POST /mcp**: Handle MCP JSON-RPC requests
- **GET /mcp**: Establish Server-Sent Events (SSE) stream for real-time notifications

## Available Tools

### get-alerts

Get weather alerts for a US state.

**Parameters:**
- `state` (string): Two-letter state code (e.g., "CA", "NY")

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "get-alerts",
    "arguments": {
      "state": "CA"
    }
  }
}
```

### get-forecast

Get weather forecast for specific coordinates.

**Parameters:**
- `latitude` (number): Latitude of the location
- `longitude` (number): Longitude of the location

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
## Testing the Server

An example client is provided to demonstrate how to interact with the MCP server:

```bash
# Start the server in one terminal
node build/index.js

# In another terminal, run the example client
node example-client.js
```

The example client will:
1. Initialize an MCP connection
2. List available tools
3. Get weather alerts for California
4. Get weather forecast for New York City
  "method": "tools/call",
  "params": {
    "name": "get-forecast",
    "arguments": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}
```

## Features

- **Multi-session support**: Handles multiple simultaneous client connections
- **Server-Sent Events**: Real-time streaming of notifications to clients
- **Dynamic tool updates**: Tools are refreshed every 5 seconds with notifications sent to clients
- **Error handling**: Comprehensive error handling for API failures and invalid requests
- **Graceful shutdown**: Proper cleanup on SIGINT

## Technical Details

- Built with TypeScript and Express.js
- Uses the `@modelcontextprotocol/sdk` for MCP protocol implementation
- Implements the MCP Streamable HTTP transport specification
- Weather data sourced from the National Weather Service API

## Development

The project structure:

```
├── src/
│   ├── index.ts         # Main entry point and Express server setup
│   └── server.ts        # MCP server implementation with tools
├── build/               # Compiled JavaScript output
├── example-client.js    # Example client for testing
├── package.json
├── tsconfig.json
└── README.md
```

## License

ISC