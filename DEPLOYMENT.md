# Deployment Guide

This document explains how to deploy the Vestaflare MCP Server to Cloudflare Workers.

## Updated Configuration for Wrangler v4.0+

The deployment has been updated to use Wrangler v4.0+ with the following improvements:

### Changes Made

1. **Updated Wrangler Version**
   - Package.json now specifies `wrangler: "^4.0.0"`
   - GitHub Actions workflow installs Wrangler v4 globally

2. **Direct CLI Deployment**
   - Replaced `cloudflare/wrangler-action@v3` with direct Wrangler CLI usage
   - Better control over the deployment process
   - More reliable secret handling

3. **Fixed Build Configuration**
   - Updated `wrangler.toml` to reference `dist/worker.js` (compiled output)
   - Proper TypeScript compilation setup with `tsconfig.worker.json`

4. **Improved Secret Management**
   - Secrets are now set using `wrangler secret put` commands
   - More secure and reliable than environment variable passing

## Required GitHub Secrets

Ensure these secrets are configured in your GitHub repository:

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Workers:Edit permissions
- `VESTABOARD_API_BASE_URL`: Base URL for Vestaboard API (usually `https://rw.vestaboard.com`)
- `VESTABOARD_READ_WRITE_KEY`: Your Vestaboard Read-Write API key
- `MCP_API_KEY`: API key for MCP server authentication

## Deployment Process

The GitHub Actions workflow performs these steps:

1. **Setup Environment**
   - Checkout repository
   - Setup Bun runtime
   - Install dependencies

2. **Build Worker**
   - Compile TypeScript to JavaScript using `tsconfig.worker.json`
   - Output compiled worker to `dist/worker.js`

3. **Install Wrangler v4**
   - Install latest Wrangler v4 globally

4. **Configure Secrets**
   - Set all required secrets in Cloudflare Workers environment

5. **Deploy**
   - Deploy to production environment using Wrangler CLI

## Local Development

For local development and testing:

```bash
# Install dependencies
bun install

# Build the worker
bun run build:worker

# Run locally
bun run dev:worker

# Deploy manually
bun run deploy
```

## Environment Configuration

The `wrangler.toml` file includes:

- **Development environment**: For local testing
- **Production environment**: For deployment
- **Environment variables**: Configured for both environments
- **Secrets**: Handled through GitHub Actions deployment

## Troubleshooting

If deployment fails:

1. **Check GitHub Secrets**
   - Ensure all required secrets are set
   - Verify secret names match exactly

2. **Check Build Output**
   - Ensure `dist/worker.js` is generated correctly
   - Check TypeScript compilation errors

3. **Check Wrangler Configuration**
   - Verify `wrangler.toml` syntax
   - Ensure compatibility flags are correct

4. **Check API Token Permissions**
   - Cloudflare API token needs Workers:Edit permissions
   - Token should have access to the target zone/account

## Version Compatibility

- **Wrangler**: v4.0+ (latest)
- **Node.js Compatibility**: Enabled via `nodejs_compat` flag
- **TypeScript**: v5.8.3+
- **Cloudflare Workers Runtime**: Latest

The deployment is now properly configured for Wrangler v4.0+ and should resolve previous deployment issues.