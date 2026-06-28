import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow setState in effects for data-fetching patterns (fetch on mount/refetch).
      // The React Compiler rule flags synchronous setState at the top of effects
      // (e.g., setIsLoading(true) before an async call), which is a standard pattern.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
