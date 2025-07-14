// backend/eslint.config.js
// Flat config ESLint : on importe la config recommandée directement
import recommended from "eslint/conf/eslint-recommended";

export default [
    // Inclusion du config ESLint recommandée
    recommended,

    {
        // Les fichiers TypeScript
        files: ["**/*.ts"],

        // Variables globales déclarées
        languageOptions: {
            globals: {
                browser: "readonly",
                node:    "readonly",
            },
        },

        // Règles personnalisées
        rules: {
        },
    },
];
