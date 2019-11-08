import React from "react"
import ReactDOM from "react-dom"
import delay from "delay"

console.log("Hello from nextjs content script!")

async function onClick(event) {
  event.preventDefault()
}

const getTimeline = () => document.querySelector('[aria-label="Timeline: Bookmarks"]')
const getSearchBox = () => document.querySelector('[role="search"]')

const css = `
  #tbs-root form > div > div {
    background: white;
    border: 1px solid #21a1f3;
    border-radius: 9999px;
  }
`

function Content() {
  const [active, setActive] = React.useState(false)
  return (
    <div style={{ padding: "8px 15px" }}>
      <style>{active ? css : null}</style>
      <SearchBox onSubmit={onClick} onClick={() => setActive(true)} />
    </div>
  )
}

function SearchBox({ onSubmit, onClick }) {
  const ref = React.useRef()

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
      ref.current.append(newSearchBox)

      const input = document.querySelector("#tbs-root input")
      input.placeholder = "Search Bookmarks"
    })()
  }, [onSubmit])

  return <div ref={ref} />
}

;(async function() {
  let timeline = getTimeline()
  while (!timeline) {
    await delay(10)
    timeline = getTimeline()
  }

  const app = document.createElement("div")
  app.id = "tbs-root"
  timeline.prepend(app)
  ReactDOM.render(<Content />, app)
})()
