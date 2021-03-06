module.exports = {
	root: true,
	extends: ["airbnb-base", "prettier", "plugin:import/recommended", "plugin:import/typescript"],
	ignorePatterns: ["src/v1/**/*", "dist/**/*", "build/**/*", "public/swagger.json", "public/custom.js"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		es2021: true,
		sourceType: "module", // Allows for the use of imports
	},
	plugins: ["@typescript-eslint", "prettier", "import"],
	rules: {
		"indent": ["error", "tab"],
		"import/no-cycle": "warn",
		"no-unused-vars": "off",
		"no-plusplus": "off",
		"@typescript-eslint/no-unused-vars": ["error"],
		"no-console": "off",
		"no-param-reassign": "off",
		"import/prefer-default-export": "off",
		"camelcase": "off",
		"class-methods-use-this": "off",
		"import/extensions": [
			"error",
			"ignorePackages",
			{
				js: "never",
				jsx: "never",
				ts: "never",
				tsx: "never",
				mjs: "never",
			},
		],
	},
	settings: {
		"import/resolver": {
			typescript: {
				alwaysTryTypes: true,
				project: "tsconfig.json",
			},
			node: {
				extensions: [".js", ".ts", ".json"],
			},
		},
		"import/extensions": [".js", ".ts", ".mjs", ".jsx", ".tsx"],
	},
};
