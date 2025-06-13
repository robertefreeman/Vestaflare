# Vestaflare MCP Server

A streamlined Model Context Protocol (MCP) server for Vestaboard, designed for easy deployment to Cloudflare Workers.

---

## 🚀 Quick Cloudflare Deployment

### 1. Clone and Install

```bash
git clone https://github.com/octodemo/Vestaflare.git
cd Vestaflare
bun install
```

### 2. Configure Environment Variables

- Copy `.dev.vars.example` to `.dev.vars` for local development.
- **For deployment:** Set all required variables as GitHub Secrets in your repository.
- See `.dev.vars.example` for the full list of required secrets.

### 3. Build and Deploy

```bash
# Build for Cloudflare Workers
npm run build:worker

# Deploy using GitHub Actions (recommended)
# Go to GitHub > Actions > Deploy to Cloudflare Workers
```

---

## ☁️ Cloudflare Workers Environment

- All configuration is handled via environment variables, injected as GitHub Secrets.
- No sensitive data should be committed to the repository.
- The `.dev.vars.example` file uses `${{ secrets.VAR_NAME }}` syntax to indicate required secrets.

---

## 🔑 Authentication

- API key authentication is optional and controlled by environment variables.
- To enable, set `MCP_AUTH_REQUIRED=true` and provide `MCP_API_KEY` as a secret.

---

## 📄 Documentation

See [`deployment.md`](deployment.md) for detailed deployment and operations instructions.

---

## 📄 License

ISC