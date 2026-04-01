/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
	env: {
		es2021: true,
	},
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
	},
	ignorePatterns: ["dist/**", "node_modules/**", "*.test.ts", "tsconfig.json", "src/nodes/helpers.ts"],
	overrides: [
		{
			files: ["package.json"],
			parser: "jsonc-eslint-parser",
			plugins: ["n8n-nodes-base"],
			extends: ["plugin:n8n-nodes-base/community"],
		},
		{
			files: ["src/nodes/**/*.node.ts"],
			parser: "@typescript-eslint/parser",
			plugins: ["n8n-nodes-base"],
			extends: ["plugin:n8n-nodes-base/nodes"],
			rules: {
				"n8n-nodes-base/node-dirname-against-convention": "off",
			},
		},
		{
			files: ["src/credentials/**/*.credentials.ts"],
			parser: "@typescript-eslint/parser",
			plugins: ["n8n-nodes-base"],
			extends: ["plugin:n8n-nodes-base/credentials"],
			rules: {
				"n8n-nodes-base/cred-class-field-documentation-url-miscased": "off",
			},
		},
	],
};
