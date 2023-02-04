import React from "react"
import ReactDOM from "react-dom"
import delay from "delay"
import matchSorter from "match-sorter"
import tweet2Html from "tweet-html"
import plur from "plur"

// console.log("Hello from nextjs content script!")

const browser = require("webextension-polyfill")

let authorization
let csrfToken

async function messageListener(message) {
  // console.log("Received message", message)
  if (message.name === "credentials") {
    authorization = message.authorization
    csrfToken = message.csrfToken
  }
}

browser.runtime.onMessage.addListener(messageListener)

async function fetchBookmarks() {
  if (!authorization) {
    return console.log("authorization is blank")
  }
  if (!csrfToken) {
    return console.log("csrfToken is blank")
  }

  // console.log("Fetching bookmarks...")
  const res = await fetch(
    "https://api.twitter.com/2/timeline/bookmark.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=10000&ext=mediaStats%2CcameraMoment",
    {
      credentials: "include",
      headers: {
        accept: "*/*",
        // "sec-fetch-mode": "cors",
        // "sec-fetch-site": "same-site",
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "x-csrf-token": csrfToken,
        authorization,
      },
      referrer: window.location.href,
      method: "GET",
      // mode: "cors",
    }
  )
  // console.log("RES", res)
  const json = await res.json()
  // console.log("RES json", json)
  return json
}

const getTbsRoot = () => document.querySelector("#tbs-root")
const getPrimaryColumn = () => document.querySelector('[data-testid="primaryColumn"]')
const getTweetsContainer = () => Array.from(getPrimaryColumn().querySelectorAll('[data-testid="tweet"]')) // document.querySelector('[aria-label="Timeline: Bookmarks"] > div:last-child') // пойдёт [data-testid="tweet"]
const getSearchBox = () => Array.from(document.querySelectorAll('form')).find(form => form.querySelector('[data-testid="SearchBox_Search_Input"]'))
const getThemeBackground = () =>
  document.querySelector("meta[name=theme-color]").attributes.content.textContent
const getThemeAccentColor = () =>
  getComputedStyle(document.querySelector('[data-testid="SideNav_NewTweet_Button"]'), null).getPropertyValue("background-color")
const getTitleContainer = () => document.querySelector('[data-testid="primaryColumn"]').childNodes[0].childNodes[0]
const getThemeTextColor = () =>
  getComputedStyle(getTitleContainer().querySelector('[role="heading"]'), null).getPropertyValue("color")

function useBookmarkedTweets() {
  const [tweets, setTweets] = React.useState(null)
  React.useEffect(() => {
    ; (async () => {
      while (!authorization && !csrfToken) {
        await delay(10)
      }
      let success = false
      let tries = 0
      while (!success && tries < 2) {
        try {
          tries++
          const json = await fetchBookmarks()
          let tweets = Object.values(json.globalObjects.tweets)
          let users = json.globalObjects.users
          tweets = tweets.map(tweet => ({ ...tweet, user: users[tweet.user_id_str] }))
          console.log("Loaded bookmarked tweets", tweets)
          setTweets(tweets)
          success = true
        } catch (err) {
          await delay(500)
          console.log("[fetchBookmarks] failed. Retrying...", err)
        }
      }
    })()
  }, [])
  return tweets
}

function Content() {
  const [inputActive, setInputActive] = React.useState(false)
  const [results, setResults] = React.useState(null)
  const tweets = useBookmarkedTweets()

  if (!location.href.includes("bookmarks")) {
    return null
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!tweets && window.location.href.includes("mobile.twitter.com")) {
      return alert(
        `Shucks, you found that one little thing that doesn't work. You are on 'mobile.twitter.com' and it's not loading bookmarks for some reason. Change to 'twitter.com' and then it should work`
      )
    }

    if (!tweets) {
      return alert("Oh snap, no bookmarked tweets are loaded. Wait a little longer or reload to try again")
    }

    const query = event.target.elements[0].value
    if (query.length == 0) {
      setResults([])
      return;
    }

    if (query.length < 3) {
      return alert("Please type at least three characters!")
    }

    const results = matchSorter(tweets, query, {
      keys: [
        { key: "full_text", threshold: matchSorter.rankings.ACRONYM },
        { key: "user.screen_name", threshold: matchSorter.rankings.ACRONYM },
        { key: "user.name", threshold: matchSorter.rankings.ACRONYM },
      ],
      keepDiacritics: true,
    })
    // console.log("Bookmark search results", results)
    setResults(results)
  }

  const inputActiveCss = `
    #tbs-root form > div > div {
      background: ${getThemeBackground()};
      border: 1px solid ${getThemeAccentColor()};
      border-radius: 9999px;
    }
  `

  const css = `
    #tbs-root {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif;
      color: ${getThemeTextColor()};
      overflow-x: hidden;
      overflow-y: auto;
      max-height: 90vh;
      overscroll-behavior: contain;
      border: 3px solid white;
      border-radius: 15px;
    }

    .tweet-result-container {
      display: flex;
      border-bottom: 1px solid rgb(230, 236, 240);
      padding: 10px 0;
      transition-property: background-color;
      transition-duration: 0.2s;
      padding: 15px;
    }

    // .tweet-result-container:hover {
    //   background-color: rgb(245,248,250);
    // }

    #tbs-root a, .tweet-result-container a:visited {
      color: ${getThemeAccentColor()};
      text-decoration: none;
    }
    #tbs-root a:hover {
      text-decoration: underline;;
    }

    .tweet-result-container img:not(.emoji), .tweet-result-container video {
      max-width: 100%;
      border-radius: 14px;
      max-height: 500px;
      width: 100%;
    }
    .tweet-result-container iframe {
      width: 100%;
      height: 300px;
    }
    .tweet-result-container .emoji {
      height: 1.2em;
      width: 1.2em;
    }

    .tweet-result > a.date {
      line-height: 1.8;
    }
    .tweet-result > .text {
      margin-bottom: 10px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .tweet-result *:last-child {
      // margin-top: 10px;
    }
  `

  return (
    <div>
      <style>{css}</style>
      <style>{inputActive ? inputActiveCss : null}</style>
      <div style={{ padding: "8px 15px" }}>
        <SearchBox onSubmit={onSubmit} onClick={() => setInputActive(true)} />
      </div>
      {results ? (
        <div style={{ fontWeight: 800, fontSize: 19, margin: "12px 0 12px 74px" }}>
          Found {results.length} {plur("result", results.length)}
        </div>
      ) : null}

      {results ? results.map(tweet => <TweetResult tweet={tweet} key={tweet.id_str} />) : null}
    </div>
  )
}

function TweetResult({ tweet }) {
  return (
    <article className="tweet-result-container">
      <div style={{ flexBasis: 49, flexGrow: 0, flexShrink: 0, alignItems: "center", marginRight: 10 }}>
        <img src={tweet.user.profile_image_url_https} style={{ borderRadius: 9999 }} />
      </div>
      <div>
        <span style={{ fontWeight: 700 }}>{tweet.user && tweet.user.name}</span>{" "}
        <span style={{ color: "rgb(101, 119, 134)" }}>@{tweet.user && tweet.user.screen_name}</span>
        <div
          className="tweet-result"
          dangerouslySetInnerHTML={{ __html: tweet2Html(tweet, tweet.user && tweet.user.screen_name) }}
        ></div>
      </div>
    </article>
  )
}

function SearchBox({ onSubmit, onClick }) {
  const containerRef = React.useRef()
  const searchRef = React.useRef()

  React.useEffect(() => {
    async function initSearchBox() {
      let searchBox = getSearchBox()
      while (!searchBox) {
        await delay(10)
        searchBox = getSearchBox()
      }

      const newSearchBox = searchBox.cloneNode(true)
      newSearchBox.onsubmit = onSubmit
      newSearchBox.onclick = onClick
      containerRef.current.append(newSearchBox)
      searchRef.current = newSearchBox

      const input = document.querySelector("#tbs-root input")
      input.placeholder = "Search Bookmarks"
    }
    initSearchBox();
  }, [])

  React.useEffect(() => {
    if (!searchRef.current) return;
    searchRef.current.onsubmit = onSubmit
  }, [onSubmit])

  return <div ref={containerRef} />
}

async function render() {
  let titleContainer = getTitleContainer()
  while (!titleContainer) {
    await delay(10)
    titleContainer = getTitleContainer()
  }

  let root = document.querySelector("#tbs-root")
  if (!root) {
    root = document.createElement("div")
    root.id = "tbs-root"
    titleContainer.after(root)
  }
  ReactDOM.render(<Content />, root)
}

async function startRunLoop() {
  while (true) {
    if (location.href.includes("bookmarks") && !getTbsRoot()) {
      // Fire the engines!
      render()
    }
    // just take our good ol time. Everything is running great
    await delay(1000)
  }
}

startRunLoop()
