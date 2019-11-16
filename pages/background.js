import delay from "delay"
export default () => "Nothing to see, just a background script :)"

if (typeof window !== "undefined") {
  const browser = require("webextension-polyfill")

  // console.log("Hello from background script!")

  let tabId
  let authorization
  let csrfToken

  browser.webRequest.onSendHeaders.addListener(
    async details => {
      tabId = details.tabId
      authorization = details.requestHeaders.find(h => h.name.toLowerCase() === "authorization").value
      csrfToken = details.requestHeaders.find(h => h.name.toLowerCase() === "x-csrf-token").value

      sendCredentials()
    },
    { urls: ["*://*.twitter.com/*bookmark.json*"] },
    ["requestHeaders"]
  )

  let messageSent = false
  async function sendCredentials() {
    let tries = 0
    while (!messageSent && tries < 100) {
      try {
        tries++
        console.log("Trying message...")
        const res = await browser.tabs.sendMessage(tabId, {
          name: "credentials",
          authorization,
          csrfToken,
        })
        messageSent = true
        console.log("Sent message")
      } catch (err) {
        console.log("error", err)
        await delay(50)
      }
    }
  }

  // end of script
}
