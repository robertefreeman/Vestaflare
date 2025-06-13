# GitHub Actions Workflows

This directory contains automated workflows for the Vestaflare project.

## Deploy to Cloudflare Workers

The [`deploy-cloudflare.yml`](./deploy-cloudflare.yml) workflow automatically deploys the MCP server to Cloudflare Workers when code is pushed to the main branch.

### Required Secrets

Before the workflow can run successfully, you must configure these secrets in your GitHub repository:

1. Go to **Settings > Secrets and variables > Actions**
2. Click **New repository secret** for each of the following:

#### Essential Secrets:
- **`CLOUDFLARE_API_TOKEN`** - Cloudflare API token with Workers edit permissions
- **`VESTABOARD_READ_WRITE_KEY`** - Your Vestaboard Read/Write API key  
- **`VESTABOARD_API_BASE_URL`** - Vestaboard API base URL (typically `https://rw.vestaboard.com`)

#### Optional Secrets:
- **`MCP_API_KEY`** - API key for MCP authentication (only if `MCP_AUTH_REQUIRED=true`)

### How It Works

1. **Trigger**: Runs on push to `main`/`master` branches or manual dispatch
2. **Build**: Installs dependencies with Bun and compiles TypeScript
3. **Deploy**: Uses `cloudflare/wrangler-action@v3` to deploy to production environment
4. **Secrets**: Passes GitHub Secrets as environment variables to Cloudflare Workers

### Monitoring

- View deployment status in the **Actions** tab
- Check Cloudflare Workers dashboard for runtime logs
- Monitor API calls through Cloudflare Analytics

### Troubleshooting

If deployment fails:
1. Check the Actions log for specific error messages
2. Verify all required secrets are set correctly
3. Ensure your Cloudflare API token has sufficient permissions
4. Refer to the main [deployment guide](../../deployment.md) for detailed troubleshooting