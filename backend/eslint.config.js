// backend/eslint.config.js
export default [
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: {
                browser: "readonly",
                node:    "readonly",
            },
        },
        extends: ["eslint:recommended"],
        rules: {
        },
    },
];
