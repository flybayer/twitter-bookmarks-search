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
    "https://api.twitter.com/2/timeline/bookmark.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&count=10000&ext=mediaStats%2ChighlightedLabel%2CcameraMoment&simple_quoted_tweet=true&include_user_entities=true",
    {
      credentials: "include",
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-client-language": "en",
        "x-csrf-token": csrfToken,
        authorization,
      },
      referrer: "https://twitter.com/i/bookmarks",
      referrerPolicy: "no-referrer-when-downgrade",
      body: null,
      method: "GET",
      mode: "cors",
    }
  )
  const json = await res.json()
  // console.log("RES", json)
  return json
}

const getTimeline = () => document.querySelector('[aria-label="Timeline: Bookmarks"]')
const getTweetsContainer = () => document.querySelector('[aria-label="Timeline: Bookmarks"] > div:last-child')
const getSearchBox = () => document.querySelector('[role="search"]')

function useBookmarkedTweets() {
  const [tweets, setTweets] = React.useState(null)
  React.useEffect(() => {
    ;(async () => {
      while (!authorization && !csrfToken) {
        await delay(10)
      }
      let success = false
      while (!success) {
        try {
          const json = await fetchBookmarks()
          let tweets = Object.values(json.globalObjects.tweets)
          let users = json.globalObjects.users
          tweets = tweets.map(tweet => ({ ...tweet, user: users[tweet.user_id_str] }))
          // console.log("Loaded bookmarked tweets", tweets)
          setTweets(tweets)
          success = true
        } catch (err) {
          await delay(50)
          // console.log("[fetchBookmarks] failed. Retrying...", err)
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

  React.useEffect(() => {
    if (results) {
      getTimeline().style
      getTweetsContainer().style.display = "none"
    } else {
      getTweetsContainer().style.display = ""
    }
  }, [results])

  async function onSubmit(event) {
    event.preventDefault()
    if (!tweets) {
      return alert("Oh snap, no bookmarked tweets are loaded. Wait a little longer or reload to try again")
    }

    const query = event.target.elements[0].value
    const results = matchSorter(tweets, query, {
      keys: [
        { key: "full_text", threshold: matchSorter.rankings.ACRONYM },
        { key: "user.screen_name", threshold: matchSorter.rankings.ACRONYM },
        { key: "user.name", threshold: matchSorter.rankings.ACRONYM },
      ],
      keepDiacritics: true,
    })
    console.log("Bookmark search results", results)
    setResults(results)
  }

  return (
    <div>
      <style>{css}</style>
      <style>{inputActive ? inputActiveCss : null}</style>
      <div style={{ padding: "8px 15px" }}>
        <SearchBox onSubmit={onSubmit} onClick={() => setInputActive(true)} />
        <div
          style={{
            margin: "4px 0",
            fontSize: 13,
            fontStyle: "italic",
            textAlign: "center",
            color: "#18bf64",
          }}
        >
          Sponsored by{" "}
          <a
            href="https://acornbookmarks.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#18bf64" }}
          >
            Acorn Bookmark Manager
          </a>
        </div>
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

const inputActiveCss = `
  #tbs-root form > div > div {
    background: white;
    border: 1px solid #21a1f3;
    border-radius: 9999px;
  }
`

const css = `
  #tbs-root {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif;
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

  .tweet-result-container a, .tweet-result-container a:visited {
    color: rgb(27, 149, 224);
    text-decoration: none;
  }
  .tweet-result-container a:hover {
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
    ;(async function() {
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
    })()
  }, [])

  React.useEffect(() => {
    searchRef.current.onsubmit = onSubmit
  }, [onSubmit])

  return <div ref={containerRef} />
}

async function render() {
  let timeline = getTimeline()
  while (!timeline) {
    await delay(20)
    timeline = getTimeline()
  }

  let root = document.querySelector("#tbs-root")
  if (!root) {
    root = document.createElement("div")
    root.id = "tbs-root"
    timeline.prepend(root)
  }
  ReactDOM.render(<Content />, root)
}

async function waitForBookmarksPage() {
  while (!window.location.href.includes("bookmarks")) {
    console.log("waiting..")
    await delay(500)
  }
  render()
}

if (location.href.includes("bookmarks")) {
  render()
} else {
  waitForBookmarksPage()
}
