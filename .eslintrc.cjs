module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["react", "react-hooks"],
  extends: ["eslint:recommended", "plugin:react-hooks/recommended"],
  rules: {
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
