/**
 * eslint-config-next 16 exports a native flat-config array, so it is spread
 * directly. The FlatCompat/@eslint/eslintrc shim that older Next projects use
 * crashes against it with "Converting circular structure to JSON".
 */
import next from "eslint-config-next/core-web-vitals";

const config = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "out/**"],
  },
];

export default config;
