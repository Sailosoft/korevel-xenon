// tailwind.config.js
module.exports = {
  // ...
  prefix: "tw-", // You would then use tw-p-4 instead of p-4
  corePlugins: {
    preflight: false, // Optional: only if you find global resets are breaking MUI
  },
};
