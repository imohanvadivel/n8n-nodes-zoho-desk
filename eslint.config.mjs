import { config } from '@n8n/node-cli/eslint';
import { globalIgnores } from 'eslint/config';

// n8n's `config` (with n8n Cloud support) applies in full to all shipped code.
// Test files are excluded only because their hand-rolled mock contexts use `any`
// (31 x no-explicit-any); typing them properly would mean reimplementing
// IExecuteFunctions. They ship nothing — `files: ["dist"]` covers the package —
// and `npx @n8n/scan-community-package`, which lints this repo's source with its
// own config, reports no violations in them.
export default [...config, globalIgnores(['**/*.test.ts'])];
