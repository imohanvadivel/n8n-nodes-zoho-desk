import { config } from '@n8n/node-cli/eslint';
import { globalIgnores } from 'eslint/config';

// n8n's `config` (with n8n Cloud support) applies in full to all shipped code.
// Test files are dev-only and never published — `files: ["dist"]` in package.json
// excludes them — so the community-node rules that govern shipped code (notably
// no-restricted-imports, which flags the `bun:test` import) don't apply to them.
export default [...config, globalIgnores(['**/*.test.ts'])];
