const fs = require('fs')
const path = require('path')
const express = require('express')
const Handlebars = require('handlebars')
const handlebars = require('promised-handlebars')(Handlebars)
const CssModules = require('css-modules-loader-core')

const cssParser = new CssModules()


// Helpers
// ----------------------------------------------

// Helper to load file content in a promise.
const readFile = (filepath) => new Promise((resolve, reject) => {
  fs.readFile(filepath, 'utf-8', (err, content) => {
    err ? reject(err) : resolve({ content, filepath })
  })
})

// Helper method to read HTML file content and compile it, adding class names
// and injecting CSS when needed.
const parseHTMLFile = (filepath) => readFile(filepath)
  .then(({ content, filepath }) => handlebars.compile(content)({ filepath }))

// Helper method to read CSS file content and parse as css-module.
const parseCSSFile = (filepath) => readFile(filepath)
  .then(({ content, filepath }) => {
    const imported = []
    const fetch = fetcher(imported)

    return cssParser.load(content, path.relative(__dirname, filepath), filepath, fetch)
      .then(({ exportTokens, injectableSource }) => ({
        exportTokens,
        injectableSource: imported.join(' ') + injectableSource
      }))
  })

// Fetched method to load import composables on CSS files.
const fetcher = (imported = []) => (search, relativeTo, _trace) => parseCSSFile(path.resolve(path.dirname(_trace), search.replace(/"/g, '')))
  .then(({ exportTokens, injectableSource }) => {
    imported.push(injectableSource)
    return exportTokens
  })


// Handlebars setup
// ----------------------------------------------

// This helper will load a stylesheet file, parse as a css-module,
// inject the resulting content on the HTML and add things to the context.
handlebars.registerHelper('stylesheet', function (file, name, con) {
  const context = this
  const root = path.dirname(context.filepath)
  const filepath = path.resolve(root, file)
  const parsed = parseCSSFile(filepath)

  // Register dynamic helper for each imported stylesheet.
  handlebars.registerHelper(name, className => parsed.then(({ exportTokens }) => exportTokens[className]))

  return parsed.then(({ injectableSource }) => new handlebars.SafeString('<style>' + injectableSource + '</style>'));
})



// HTTP Server
// ----------------------------------------------

const server = express()

server.get(['/', /\.*\.html/], (req, res) => {
  const filepath = req.url + (req.url.slice(-1) === '/' ? 'index.html' : '')
  return parseHTMLFile(path.join(__dirname, filepath))
    .then(html => res.send(html))
    .catch(e => res.status(500).send(e.toString()))
})

server.listen(3001, () => console.log('Listening on http://localhost:3001'))
