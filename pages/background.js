import delay from "delay"
export default () => "Nothing to see, just a background script :)"

if (typeof window !== "undefined") {
  const browser = require("webextension-polyfill")

  console.log("Hello from background script!")

  browser.runtime.getPlatformInfo().then(console.log)

  // Allow us to embed tweets
  browser.webRequest.onHeadersReceived.addListener(
    details => {
      const headers = details.responseHeaders // original headers
      const csp = headers.find(h => h.name.toLowerCase() === "content-security-policy")
      if (csp) {
        console.log("request headers", headers)
        const urls = "https://*.twitter.com https://*.twimg.com"

        csp.value = csp.value.replace("frame-src 'self'", "frame-src 'self' " + urls)
        csp.value = csp.value.replace("img-src 'self'", "img-src 'self' " + urls)
        csp.value = csp.value.replace(
          "script-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' " + urls
        )
        csp.value = csp.value.replace(
          "style-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' " + urls
        )

        console.log("csp header", csp)
      }

      // return modified headers
      return { responseHeaders: headers }
    },
    {
      urls: ["*://*.twitter.com/*"],
    },
    ["blocking", "responseHeaders"]
  )

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

  async function sendCredentials() {
    let messageSent = false
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
        // const res = await browser.tabs.sendMessage(tabId, "hi")
        console.log("res", res)
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
