See [AGENT.md](./AGENT.md) for full project context (architecture, API quirks, n8n conventions).

## Quick Reference

- `npm run build` — build the project (`n8n-node build` + codex file copy)
- `npm run lint` — n8n node linter (must pass for community-node verification)
- `bun test` — run tests
- `npm install --ignore-scripts` — local installs (see AGENT.md "Tooling" for why)
- `npm run release` — cut a release; publishing happens in CI with provenance
- `pm2 restart n8n` — restart n8n (never kill by port)
- API docs: https://desk.zoho.com/DeskAPIDocument#Introduction
