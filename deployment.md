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

### Local Development

```bash
# Install dependencies
bun install

# Build for Workers
npm run build:worker

# Start local Workers dev server
npm run dev:worker
```

### Cloudflare Workers Deployment

- **Recommended:** Use the provided GitHub Actions workflow.
- Go to **GitHub > Actions > Deploy to Cloudflare Workers**.
- Ensure all required secrets are set before deploying.

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

- **Deployment fails:** Check that all required secrets are set.
- **Authentication errors:** Ensure `MCP_AUTH_REQUIRED` and `MCP_API_KEY` are set correctly.
- **API errors:** Verify Vestaboard credentials and endpoint URLs.

---

## 8. References

- [Vestaboard API Documentation](https://docs.vestaboard.com/docs/read-write-api/authentication)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)