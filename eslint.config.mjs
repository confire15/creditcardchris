import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "supabase/**", "public/**"],
  },
  {
    rules: {
      // The codebase consistently uses the classic fetch-on-mount pattern
      // (async loader called from useEffect that sets state). Refactoring
      // every data loader carries regression risk with no user-visible win,
      // so this compiler-era rule is off. New code should still prefer
      // event handlers / suspense-friendly loading where practical.
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
