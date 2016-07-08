const fs = require('fs')
const path = require('path')
const express = require('express')
const handlebars = require('handlebars')
const CssModules = require('css-modules-loader-core')

const cssParser = new CssModules()


/**
 * Helper to load file content in a promise.
 */
const readFile = (filepath) => new Promise((resolve, reject) => {
  fs.readFile(path.join(__dirname, filepath), 'utf-8', (err, fileContent) => {
    err ? reject(err) : resolve(fileContent)
  })
})


/**
 * Read CSS file, parse it's content, and start the application.
 */
readFile('styles.css')
  .then(css => cssParser.load(css, 'styles'))
  .then(cssModule => {
    const css = cssModule.injectableSource
    const classes = cssModule.exportTokens

    // Handlebars setup
    // ----------------------------------------------

    handlebars.registerHelper('class', className => cssModule.exportTokens[className])


    // HTTP Server
    // ----------------------------------------------

    const server = express()
    const index = readFile('index.html').then(html => handlebars.compile(html)())

    server.get('/styles.css', (req, res) => res.set('Content-Type', 'text/css; charset=UTF-8').send(css))
    server.get(['/', '/index.html'], (req, res) => index.then(html => res.set('Content-Type', 'text/html; charset=UTF-8').send(html)))

    server.listen(3001, () => console.log('Listening on http://localhost:3001'))

  }).catch(console.error)
