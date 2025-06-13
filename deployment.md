# Vestaflare Deployment & Operations Guide

This document provides detailed instructions for deploying and operating the Vestaflare MCP server on Cloudflare Workers.

---

## 1. Prerequisites

- **Cloudflare Account** with Workers enabled.
- **GitHub Repository** with access to Actions.
- **Vestaboard Read/Write Key** from your Vestaboard account.

---

## 2. Environment Variables

All configuration is managed via environment variables, injected as GitHub Secrets.

- Reference `.dev.vars.example` for the full list of required secrets.
- Use the `${{ secrets.VAR_NAME }}` syntax in your GitHub Actions and `.dev.vars.example`.

---

## 3. Setting Up GitHub Secrets

1. Go to your repository's **Settings > Secrets and variables > Actions**.
2. Add all required environment variables as secrets (see `.dev.vars.example`).
3. Required secrets typically include:
   - `VESTABOARD_READ_WRITE_KEY`
   - `MCP_AUTH_REQUIRED`, `MCP_API_KEY` (if authentication is enabled)
   - Any other integration keys needed for your deployment

---

## 4. Build and Deploy

### Required GitHub Secrets

Before deploying, you must set up the following secrets in your GitHub repository:

**Repository Settings > Secrets and variables > Actions > New repository secret**

#### Essential Secrets (Required):
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token with Workers edit permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare Account ID (found in the right sidebar of your Cloudflare dashboard)
- `VESTABOARD_READ_WRITE_KEY` - Your Vestaboard Read/Write API key
- `VESTABOARD_API_BASE_URL` - Vestaboard API base URL (usually `https://rw.vestaboard.com`)

#### Optional Secrets (if MCP authentication is enabled):
- `MCP_API_KEY` - API key for MCP server authentication (if `MCP_AUTH_REQUIRED=true`)

### Local Development

```bash
# Install dependencies
bun install

# Build for Workers
bun run build:worker

# Start local Workers dev server
bun run dev:worker
```

### Cloudflare Workers Deployment

#### Option 1: GitHub Actions (Recommended)
1. Ensure all required secrets are set in GitHub (see above)
2. Push to `main` or `master` branch, or manually trigger the workflow
3. Go to **GitHub > Actions > Deploy to Cloudflare Workers**
4. Monitor the deployment progress

#### Option 2: Manual Deployment
```bash
# Build the worker
bun run build:worker

# Deploy manually (requires wrangler authentication)
bun run deploy
```

---

## 5. Operations

- **Authentication:** Controlled by `MCP_AUTH_REQUIRED` and `MCP_API_KEY` secrets.
- **Environment changes:** Update secrets in GitHub and redeploy.
- **Logs & Monitoring:** Use Cloudflare dashboard for logs and request analytics.
- **API Key Rotation:** Change secrets in GitHub and redeploy as needed.

---

## 6. Security Best Practices

- Never commit secrets or sensitive data to the repository.
- Use GitHub Secrets for all environment variables.
- Rotate API keys regularly.
- Use HTTPS for all production endpoints.

---

## 7. Troubleshooting

### Common Deployment Issues

#### 1. `VESTABOARD_READ_WRITE_KEY is required for Read-Write API`
**Cause:** The `VESTABOARD_READ_WRITE_KEY` secret is not properly set or passed to Cloudflare Workers.

**Solution:**
1. Verify the secret exists in GitHub: `Settings > Secrets and variables > Actions`
2. Ensure the secret name matches exactly: `VESTABOARD_READ_WRITE_KEY`
3. Check that the GitHub Actions workflow includes this secret in both `secrets:` and `env:` sections
4. Redeploy after confirming the secret is set

#### 2. GitHub Actions Deployment Fails
**Cause:** Missing or incorrect `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID`.

**Solution:**
1. Generate a new Cloudflare API token with `Workers:Edit` permissions
2. Add it as `CLOUDFLARE_API_TOKEN` in GitHub Secrets
3. Find your Account ID in the Cloudflare dashboard (right sidebar) and add it as `CLOUDFLARE_ACCOUNT_ID`
4. Ensure the token has access to your Cloudflare account and the specific zone

#### 3. Wrangler Authentication Errors
**Cause:** Cloudflare API token lacks sufficient permissions.

**Solution:**
1. Go to Cloudflare Dashboard > My Profile > API Tokens
2. Create a token with these permissions:
   - `Zone:Zone Settings:Edit`
   - `Zone:Zone:Read`
   - `Workers:Worker Scripts:Edit`
3. Include all zones or specify your domain

#### 4. Environment Variables Not Available in Production
**Cause:** Secrets not properly configured in `wrangler.toml` or GitHub Actions.

**Solution:**
1. Check that secrets are listed in the GitHub Actions workflow `secrets:` section
2. Verify the `wrangler.toml` production environment configuration
3. Ensure secret names match exactly between GitHub and the workflow file

### General Troubleshooting Steps

- **Build fails:** Check TypeScript compilation errors in the Actions log
- **Authentication errors:** Ensure `MCP_AUTH_REQUIRED` and `MCP_API_KEY` are set correctly
- **API errors:** Verify Vestaboard credentials and endpoint URLs
- **Runtime errors:** Check Cloudflare Workers logs in the dashboard

---

## 8. References

- [Vestaboard API Documentation](https://docs.vestaboard.com/docs/read-write-api/authentication)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)