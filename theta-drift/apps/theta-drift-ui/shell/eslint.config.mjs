import nx from "@nx/eslint-plugin";
import playwright from "eslint-plugin-playwright";
import baseConfig from "../../../eslint.config.mjs";

export default [
    ...nx.configs["flat/angular"],
    ...nx.configs["flat/angular-template"],
    ...baseConfig,
    {
        ...playwright.configs["flat/recommended"],
        files: [
            "e2e/**/*.ts",
            "e2e/**/*.js"
        ]
    },
    {
        files: [
            "src/**/*.ts"
        ],
        rules: {
            "@angular-eslint/directive-selector": [
                "error",
                {
                    type: "attribute",
                    prefix: "app",
                    style: "camelCase"
                }
            ],
            "@angular-eslint/component-selector": [
                "error",
                {
                    type: "element",
                    prefix: "app",
                    style: "kebab-case"
                }
            ]
        }
    },
    {
        files: [
            "src/**/*.html"
        ],
        // Override or add rules here
        rules: {}
    }
];
