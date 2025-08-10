import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist"] },
    {
        extends: [
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked
        ],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/explicit-member-accessibility": "error",
            "@typescript-eslint/no-deprecated": "error",
            "capitalized-comments": [
                "error",
                "always",
                {
                    ignorePattern: "noinspection"
                }
            ]
        }
    }
);
