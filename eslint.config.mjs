import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config(eslint.configs.recommended, tseslint.configs.recommended, globalIgnores(["dist/**"]), {
	rules: {
		"@typescript-eslint/no-require-imports": "off",
		// todo: reduce reliance on this
		"@typescript-eslint/no-explicit-any": "off",
		// used for some aliased firestorm types
		"@typescript-eslint/no-empty-object-type": "off",
	},
});
