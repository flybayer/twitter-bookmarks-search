const next = require("next")
const mkdirpModule = require("mkdirp")
const fs = require("fs")
const { writeFile } = fs.promises
const { createServer } = require("http")
const { parse } = require("url")
const { join } = require("path")
const { promisify } = require("util")
const { recursiveCopy } = require("next/dist/lib/recursive-copy")
const { recursiveDelete } = require("next/dist/lib/recursive-delete")
const { findPagesDir } = require("next/dist/lib/find-pages-dir")
const { collectPages } = require("next/dist/build/utils")
const Log = require("next/dist/build/output/log")
const mkdirp = promisify(mkdirpModule)

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    const { query } = parsedUrl

    handle(req, res, parsedUrl)

    if (query.page && !["/_error"].includes(query.page)) {
      // Write the latest version of this page to disk
      writeRouteToDisk(query.page)
    }
  }).listen(app.nextConfig.devServerPort, async err => {
    if (err) throw err

    // 1. Set up the out directory
    await recursiveDelete(join(app.nextConfig.devBuildDirectory))
    await mkdirp(join(app.nextConfig.devBuildDirectory))
    await recursiveCopy("public", app.nextConfig.devBuildDirectory)

    // 2. Collect all pages and derive their routes
    const routes = (await collectPages(findPagesDir("."), app.nextConfig.pageExtensions))
      .filter(
        page => !page.startsWith("/_document") && !page.startsWith("/_app") && !page.startsWith("/_error")
      )
      .map(
        page =>
          page
            .replace(new RegExp(`\\.+(${app.nextConfig.pageExtensions.join("|")})$`), "")
            .replace(/\\/g, "/") // Fix the slash
            .replace(/\/index$/, "/") // Convert '/index' to '/'
      )

    // 3. Write all pages to disk as html files
    for (let route of routes) {
      await writeRouteToDisk(route)
    }

    console.log(" ")
    Log.ready(`Ready on http://localhost:${app.nextConfig.devServerPort}`)
    Log.ready(`Add the '${app.nextConfig.devBuildDirectory}' dir to your browser as an unpacked extension`)
    console.log(" ")
  })
})

async function writeRouteToDisk(route) {
  const htmlString = await app.renderToHTML({}, {}, route)
  const file = route === "/" ? "index.html" : route.replace("/", "") + ".html"
  await writeFile(join(app.nextConfig.devBuildDirectory, file), htmlString)
  Log.event(`Saved ${file} to disk`)
}
