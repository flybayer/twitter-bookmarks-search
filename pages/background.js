export default () => "Nothing to see, just a background script :)"

if (typeof window !== "undefined") {
  console.log("Hello from background script!")

  const browser = require("webextension-polyfill")
  window.browser = browser

  browser.runtime.getPlatformInfo().then(console.log)
}
