# 🎯 Vestaflare - Vestaboard MCP Server

✨ A **Model Context Protocol (MCP) server** for interacting with Vestaboard displays. This server provides tools to read current messages and post new content to your Vestaboard using VBML (Vestaboard Markup Language) formatting.

---

## 🎯 What This Server Provides

- 🔧 **Vestaboard Integration**: Full integration with Vestaboard Read/Write API
- 📱 **VBML Support**: Parse and convert VBML markup to character codes
- ⚡ **MCP Protocol**: Complete Model Context Protocol server implementation
- 🎨 **Color Support**: Use colored squares in your messages with VBML
- 🔄 **Real-time Updates**: Stream messages to your Vestaboard
- 💻 **TypeScript Foundation**: Fully typed codebase
- 📝 **Example Client**: Working examples to demonstrate usage

---

## 🚀 Quick Start

### 1. 📦 Clone and Setup

```bash
# Clone the repository
git clone https://github.com/octodemo/Vestaflare.git
cd Vestaflare

# Install dependencies
bun install
```

### 2. 🔧 Vestaboard Setup

Before using this server, you'll need to set up your Vestaboard authentication:

1. **Get API Credentials**: Visit [Vestaboard Developer Portal](https://docs.vestaboard.com/docs/read-write-api/authentication)
2. **Choose Authentication Method**:
   - **Read/Write Key** (recommended): Simpler setup for personal use
   - **API Key + Secret**: For applications requiring OAuth-style authentication

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your Vestaboard credentials
# Add either:
#   VESTABOARD_READ_WRITE_KEY=your_read_write_key_here
# OR:
#   VESTABOARD_API_KEY=your_api_key_here
#   VESTABOARD_API_SECRET=your_api_secret_here
#   VESTABOARD_SUBSCRIPTION_ID=your_subscription_id_here
```

### 3. 💻 Local Development

```bash
# Build the project
bun run build

# Run locally with Bun
bun run start

# Or specify a custom port
bun run build/index.js --port=9000
```

🌐 The server will start at `http://localhost:8123` by default.

### 4. ☁️ Cloudflare Workers Development

```bash
# Start local Workers development server
npm run dev:worker

# Build for Workers deployment
npm run build:worker
```

### 5. 🚀 Deploy to Cloudflare Workers

```bash
# Deploy to Cloudflare Workers (free tier)
npm run deploy
```

✅ **Success!** Your MCP server is now live on the edge! 🎉

---

## 🏗️ Core Architecture

### 🔄 Dual Runtime Support

This template is designed to work in both environments:

- 💻 **Bun**: Fast runtime with Express.js server for local development and traditional hosting
- ☁️ **Cloudflare Workers**: Optimized worker implementation for edge deployment

### 🧩 Key Components

```
├── src/
│   ├── index.ts           # 💻 Bun Express server entry point
│   ├── worker.ts          # ☁️ Cloudflare Workers entry point  
│   ├── worker-transport.ts # ⚡ Workers-optimized HTTP transport
│   ├── server.ts          # 🔧 Core MCP server implementation
├── example-client.js      # 🧪 Example client for testing
├── wrangler.toml         # ☁️ Cloudflare Workers configuration
├── tsconfig.json         # 💻 Bun TypeScript config
└── tsconfig.worker.json  # ☁️ Workers TypeScript config
```

---

## 🛠️ Available Tools

This server provides two main tools for Vestaboard interaction:

### 1. `get-current-message`
Retrieves the current message displayed on your Vestaboard.

**Parameters:** None

**Example:**
```json
{
  "name": "get-current-message",
  "arguments": {}
}
```

### 2. `post-message`
Posts a new message to your Vestaboard with VBML support.

**Parameters:**
- `text` (string, required): The message text to display
- `useVBML` (boolean, optional): Whether to parse VBML formatting (default: true)

**VBML Examples:**
- `{red}` - Red colored square
- `{blue}` - Blue colored square  
- `{yellow}` - Yellow colored square
- `{green}` - Green colored square
- `{orange}` - Orange colored square
- `{violet}` - Violet colored square
- `{white}` - White colored square

**Example:**
```json
{
  "name": "post-message",
  "arguments": {
    "text": "HELLO {red}\nWORLD!\n\nFrom Vestaflare",
    "useVBML": true
  }
}
```

## ✨ Using the Example Client

```bash
# Test the server with the included example client
node example-client.js
```

This will:
1. Initialize MCP connection
2. List available tools
3. Get current Vestaboard message
4. Post a test message with VBML formatting
});
```

### 2. ☁️ Configure Workers Deployment

Update [`wrangler.toml`](wrangler.toml):

```toml
name = "your-mcp-server-name"
main = "src/worker.ts"
compatibility_date = "2024-12-06"

[vars]
# Add your environment variables
API_KEY = "your-api-key"
```

### 3. 📦 Update Package Metadata

Modify [`package.json`](package.json):

```json
{
  "name": "your-mcp-server",
  "description": "Your MCP server description",
  "version": "1.0.0"
}
```

---

## 🌐 API Endpoints

The server exposes a single MCP endpoint at `/mcp`:

- 📤 **POST /mcp**: Handle MCP JSON-RPC requests
- 📡 **GET /mcp**: Establish Server-Sent Events (SSE) stream for real-time notifications

### 📋 Example MCP Request

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "your-tool-name",
    "arguments": {
      "param1": "value1"
    }
  }
}
```

---

## ✨ Features

### 🔐 Security & Authentication
- 🔑 **Optional API Key Authentication**: Secure your MCP server with configurable API key authentication
- 🎛️ **Flexible Authentication Formats**: Support for both `Bearer <token>` and direct API key formats
- 🌍 **Environment-Controlled**: Enable/disable authentication via environment variables
- 🌐 **CORS-Compatible**: Proper CORS headers for cross-origin authentication

### 📡 Streaming HTTP Transport
- ⚡ **Real-time Notifications**: Server-Sent Events for live updates
- 👥 **Multi-session Support**: Handle multiple concurrent client connections
- 🔄 **Dynamic Updates**: Real-time tool and resource updates with client notifications

### ☁️ Cloudflare Workers Optimization
- 💰 **Free Tier Compatible**: Designed to work within Cloudflare Workers free tier limits
- 🌍 **Edge Performance**: Global edge deployment for low latency
- 🏗️ **Serverless Architecture**: Pay-per-request pricing model
- ⚡ **Zero Cold Start**: Optimized for fast startup times

### 🛠️ Development Experience
- 💻 **TypeScript Support**: Full type safety and IntelliSense
- 🔥 **Hot Reload**: Fast development iteration with `wrangler dev`
- 🚨 **Error Handling**: Comprehensive error handling and logging
- 🧪 **Example Client**: Ready-to-use client for testing with authentication examples

---

## 🧪 Testing Your Server

Use the included example client to test your implementation:

```bash
# Start your server
bun run build && bun run start

# In another terminal, test with the example client
node example-client.js
```

The example client demonstrates:
1. 🔌 MCP connection initialization
2. 🔍 Tool discovery and listing
3. ⚙️ Tool execution with parameters
4. 🚨 Error handling
5. 🔐 **Authentication examples** (configure `USE_AUTH` and `API_KEY` in the client)

💡 **Note**: If you enable authentication on your server (`MCP_AUTH_REQUIRED=true`), make sure to update the authentication configuration in [`example-client.js`](example-client.js) by setting `USE_AUTH=true` and providing your `API_KEY`.

---

## 🚀 Deployment Options

### ☁️ Cloudflare Workers (Recommended)
- 💰 **Free tier**: 100,000 requests/day
- 🌍 **Global edge**: Low latency worldwide
- 🔧 **Zero maintenance**: Serverless infrastructure

### 🖥️ Traditional Hosting
- 💻 **Bun**: Deploy to any Bun-compatible hosting platform
- 🌐 **Express.js**: Full HTTP server capabilities
- 🎯 **Custom domains**: Complete control over deployment

---

## 🔧 Environment Variables

### 💻 Bun Development (.env file)

For local Bun development, copy `.env.example` to `.env` and configure:

```bash
# Copy the example file
cp .env.example .env
```

#### 📋 Required Variables
- `PORT`: Server port (default: 8123)
- `ENVIRONMENT`: Current environment (development/production)

#### ⚙️ Optional Variables
- `MCP_SERVER_NAME`: Name of your MCP server (default: "mcp-server")
- `MCP_SERVER_VERSION`: Version of your MCP server (default: "1.0.0")
- `MCP_SESSION_HEADER_NAME`: Header name for session ID (default: "mcp-session-id")

#### 🔐 Authentication Variables
- `MCP_AUTH_REQUIRED`: Enable/disable API key authentication (true/false, default: false)
- `MCP_API_KEY`: API key for client authentication (required if MCP_AUTH_REQUIRED=true)
- `MCP_AUTH_HEADER_NAME`: Header name for API key (default: "Authorization")

#### 🌤️ Weather API Configuration (for example weather tools)
- `WEATHER_API_BASE_URL`: Weather API base URL (default: "https://api.weather.gov")
- `USER_AGENT`: User agent string for API requests (default: "weather-app/1.0")

#### 🔑 API Keys (configure as needed for your tools)
- `WEATHER_API_KEY`: Weather service API key
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_API_KEY`: Google services API key
- `ANTHROPIC_API_KEY`: Anthropic API key

#### 🔗 External Services
- `DATABASE_URL`: Database connection string
- `REDIS_URL`: Redis connection string
- `EXTERNAL_API_URL`: External API base URL

#### 🌐 CORS Configuration
- `CORS_ORIGIN`: Allowed origins (default: "*")
- `CORS_METHODS`: Allowed HTTP methods (default: "GET, POST, OPTIONS")
- `CORS_HEADERS`: Allowed headers (default: "Content-Type, mcp-session-id")

#### 🎛️ Feature Flags
- `ENABLE_LOGGING`: Enable detailed logging (true/false)
- `ENABLE_DEBUG_MODE`: Enable debug mode (true/false)

### ☁️ Cloudflare Workers (.dev.vars file)

For Cloudflare Workers development, copy `.dev.vars.example` to `.dev.vars` and configure similarly.

💡 **Note**: The `.env` file is for Bun development, while `.dev.vars` is for Cloudflare Workers. Both files are ignored by git for security.

---

## 🔐 Authentication

This MCP server supports optional API key authentication to secure access to your server endpoints.

### 🔑 Enabling Authentication

Authentication is controlled by environment variables and is **disabled by default**. To enable authentication:

1. **Set authentication environment variables** in your `.env` file (Node.js) or `.dev.vars` file (Cloudflare Workers):

```bash
# Enable authentication
MCP_AUTH_REQUIRED=true

# Set your API key (keep this secure!)
MCP_API_KEY=your-secure-api-key-here

# Optional: customize the header name (default: Authorization)
MCP_AUTH_HEADER_NAME=Authorization
```

2. **Restart your server** after updating the environment variables.

### 🎯 Supported Authentication Formats

The server supports two authentication formats:

#### 🏷️ Bearer Token Format (Recommended)
```bash
Authorization: Bearer your-api-key-here
```

#### 🔑 Direct API Key Format
```bash
Authorization: your-api-key-here
```

### 💻 Client Implementation

When authentication is enabled, clients must include the API key in their requests:

```javascript
// Example client code with authentication
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer your-api-key-here'  // or just 'your-api-key-here'
};

const response = await fetch('http://localhost:8123/mcp', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(mcpRequest)
});
```

### 📋 Authentication Responses

- ✅ **200 OK**: Request successful (valid API key or authentication disabled)
- ❌ **401 Unauthorized**: Invalid or missing API key when authentication is required

Example error response:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Unauthorized: Invalid or missing API key"
  },
  "id": null
}
```

### 🔒 Security Best Practices

1. 🔐 **Keep API keys secure**: Never commit API keys to version control
2. 🌍 **Use environment variables**: Store API keys in `.env` files that are gitignored
3. 🔒 **Use HTTPS in production**: Always use HTTPS when deploying to production
4. 🔄 **Rotate keys regularly**: Change API keys periodically for better security
5. 🏷️ **Use Bearer format**: The `Bearer <token>` format is the recommended standard

### ❌ Disabling Authentication

To disable authentication (default behavior):

```bash
# In .env or .dev.vars
MCP_AUTH_REQUIRED=false
# or simply omit the MCP_AUTH_REQUIRED variable
```

When authentication is disabled, the server will accept all requests without checking for API keys.

---

## 📄 License

ISC

---

## 🎯 Next Steps

1. 🔧 **Customize Tools**: Replace the example tools with your specific functionality
2. ☁️ **Configure Deployment**: Update `wrangler.toml` with your project details
3. 🧪 **Test Locally**: Use the example client to verify your implementation
4. 🚀 **Deploy**: Push to Cloudflare Workers free tier
5. 🔌 **Connect**: Integrate with MCP-compatible clients

🎉 This template provides everything you need to build, test, and deploy production-ready MCP servers with minimal setup time! ✨

---

<div align="center">

**Built with ❤️ for the MCP community**

🚀 [Get Started](#-quick-start) • 📖 [Documentation](#-what-this-template-provides) • 🛠️ [Features](#-features) • 🔧 [Customization](#-customizing-the-template)

</div>