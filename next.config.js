/* eslint-disable */
const PORT = 1234
const isProd = process.env.NODE_ENV === "production"

module.exports = {
  devBuildDirectory: "out",
  devServerPort: PORT,

  // Special assetPrefix needed for the production build because extensions
  // can't have a top level folder starting with `_` like _next
  assetPrefix: isProd ? "assets" : `http://localhost:${PORT}`,

  // Hide the static prerender indicator since they will always be static
  devIndicators: { autoPrerender: false },
}
