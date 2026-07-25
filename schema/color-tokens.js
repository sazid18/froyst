// design-tokens.js
// Color tokens for the Market Exchange design system.
// Consumed by tailwind.config.js (see bottom) so every token becomes a utility class.
// Values match the working prototype (market-exchange.html).

const color = {
  // Surfaces & text
  ink: {
    DEFAULT: "#131A2A", // primary text
    soft: "#5B6478",    // secondary text, labels, column headers
  },
  surface: "#FFFFFF",   // cards, table, modal, sidebar
  canvas: "#F5F6FA",    // page background
  line: "#E6E9F0",      // borders, dividers
  hover: "#FAFBFE",     // row hover

  // Market semantics
  yes: {
    DEFAULT: "#1652F0", // Yes price, primary buttons, selected side
    soft: "#E8EEFE",    // Yes selected background, liquidity tick flash
    muted: "#B9C6EE",   // disabled primary button
  },
  no: {
    DEFAULT: "#D6336C", // No price, losses
    soft: "#FBE7EF",    // No selected background, lost tag
  },
  gain: {
    DEFAULT: "#18B26B", // positive P&L, confirmations, live dot
    soft: "#DCF5E7",    // volume tick flash, won tag
  },
  gold: "#E8A500",      // favorite star, featured bolt

  // Category chips (bg / text pairs)
  chip: {
    crypto:   { bg: "#DDEBFB", text: "#1E5FBF" },
    business: { bg: "#F3E1E4", text: "#A63A4C" },
    sports:   { bg: "#E1F2E7", text: "#1F7A45" },
    politics: { bg: "#EDE6F8", text: "#6236A8" },
    pop:      { bg: "#FBEEDD", text: "#A96A12" },
    science:  { bg: "#E0F1F3", text: "#166E7C" },
  },

  // Neutral bits
  muted: "#EEF1F6",     // open/neutral status tag bg
  control: "#CBD2E0",   // inactive toggle / disabled strokes
  iconIdle: "#B9C0CF",  // unfavorited star
  scrim: "rgba(19, 26, 42, 0.45)",
};

module.exports = { color };

/* ────────────────────────────────────────────────────────────────────
   tailwind.config.js usage:

   const { color } = require("./design-tokens");

   module.exports = {
     theme: {
       extend: {
         colors: color,
       },
     },
   };

   Then in components:
     <button className="bg-yes text-surface disabled:bg-yes-muted" />
     <span className="text-gain">+$120</span>
     <span className="bg-chip-sports-bg text-chip-sports-text" />

   Note: chip pairs nest one level deep (bg-chip-crypto-bg /
   text-chip-crypto-text). Build those class names from a lookup map,
   not string interpolation, so Tailwind's scanner sees every literal class.
──────────────────────────────────────────────────────────────────── */