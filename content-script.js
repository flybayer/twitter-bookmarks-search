import React from "react"
import ReactDOM from "react-dom"

console.log("Hello from nextjs content script!")

function Content() {
  return (
    <div style={{ background: "pink" }}>
      <h1>Hello world - My first Extension</h1>
    </div>
  )
}

const app = document.createElement("div")
app.id = "next-extension-root"
document.body.appendChild(app)
ReactDOM.render(<Content />, app)
