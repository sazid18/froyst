// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS config file, loaded by Tailwind's `@config` directive
const { color } = require("./schema/color-tokens.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: color,
    },
  },
};
