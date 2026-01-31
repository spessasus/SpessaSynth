import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
    { ignores: ["dist", "src/externals/sl-web-ogg"] },
    {
        extends: [
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
            eslintPluginUnicorn.configs.recommended,
            eslintConfigPrettier
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
            ],
            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    checksVoidReturn: false
                }
            ],

            // Spessasynth uses snake_case
            "unicorn/filename-case": [
                "error",
                {
                    cases: {
                        snakeCase: true
                    }
                }
            ],
            // Often used for new Array<type>, more cluttered with Array.from
            "unicorn/no-new-array": "off",
            // Useful in events
            "unicorn/no-null": "off",
            // Technical stuff like "modulators" or "envelopes" not commonly used
            // TODO add proper rules for this later
            "unicorn/prevent-abbreviations": "off",

            // Need to pass undefined as value sometimes (for example getGenerator)
            "unicorn/no-useless-undefined": "off",
            // I don't like for...of with entries
            "unicorn/no-for-loop": "off",

            // Not in the RMIDI world
            "unicorn/text-encoding-identifier-case": "off",

            // We're working with legacy formats here
            "unicorn/prefer-code-point": "off",

            // I don't like it
            "unicorn/prefer-at": "off",

            // Doesn't work with typed arrays
            "unicorn/prefer-spread": "off",

            // This breaks a ton of TypeScript things
            "unicorn/prefer-global-this": "off"
        }
    }
);
