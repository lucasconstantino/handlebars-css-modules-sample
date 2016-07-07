const fs = require('fs')
const path = require('path')
const express = require('express')
const Handlebars = require('handlebars')
const handlebars = require('promised-handlebars')(Handlebars)
const CssModules = require('css-modules-loader-core')

const cssParser = new CssModules()

console.log(Promise.promisify)


// Helper to load filepath as promise.
// ----------------------------------------------

const readFile = (filepath) => new Promise((resolve, reject) => {
  fs.readFile(path.join(__dirname, filepath), 'utf-8', (err, fileContent) => {
    err ? reject(err) : resolve(fileContent)
  })
})


// Handlebars setup
// ----------------------------------------------

handlebars.registerHelper('className', (filename, className) => readFile(filename)
  .then(css => cssParser.load(css, filename))
  .then(parsed => parsed.exportTokens[className])
)


// HTTP Server
// ----------------------------------------------

const server = express()

server.get(/.\.css$/, (req, res) => {
  readFile(req.url)
    .then(css => cssParser.load(css, req.url))
    .then(parsed => res.send(parsed.injectableSource))
    .catch(err => res.status(500).send(err))
})

server.get(['/', /.\.html$/], (req, res) => {
  readFile(req.url + (req.url.slice(-1) == '/' ? 'index.html' : ''))
    .then(html => handlebars.compile(html)())
    .then(compiled => res.send(compiled))
    .catch(err => res.status(500).send(err))
})

server.listen(3001)
