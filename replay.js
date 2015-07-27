#!/usr/bin/env node

var fs      = require('fs')
var url     = require('url')
var http    = require('http')
var path    = require('path')
var crypto  = require('crypto')
var mime    = require('mime')
var mkdirp  = require('mkdirp')
var request = require('request')
var program = require('commander')
var _       = require('underscore')

function arglist (list) {
    return list.split(',').map(Function.call, String.prototype.trim)
}

program
    .version(require("./package.json").version)
    .arguments('<url>')
    .option('-p, --port <port>', 'Port for local server', 7003)
    .option('-d, --domains <domains>', 'List of domains to proxy', arglist)
    .option('-r, --proxy-port <port>', 'Starting port range for local proxies', 8150)
    .option('-l, --delay <delay>', 'Introduce delay to asset loading', 2000)
    .action(function (url) {
        program.url = url
    })
    .parse(process.argv)

var domains = program.domains
var ports = program.proxyPort

var proxies = domains.map(function(domain){
    var port = ports++
    return {
        domain  : domain,
        port    : port,
        proxy   : 'http://localhost:' + port,
        dir     : path.join('./data', domain),
        pattern : new RegExp('(https?:)?//[\\w._-]*' + domain + '[-A-Z0-9+&@#/%=~_|$?!:;,.]*', 'igm')
    }
})

function replaceDomains (body) {
    proxies.forEach(function(domain){
        body = body.toString().replace(domain.pattern, function (m, protocol) {
            return domain.proxy + '/' + (~m.indexOf('http') ? m.replace('://', '/') : m.replace('//', 'http/'))
        })
    })
    return body
}

mkdirp.sync('./data')

function serveFromCache(requestURL, cachedPath, res) {
    
    if (fs.existsSync(cachedPath)) {
        console.log('From cache: %s', requestURL)
        res.writeHead(200, { 'Content-Type': mime.lookup(cachedPath) })
        setTimeout(function(){
            fs.createReadStream(cachedPath).pipe(res)
        }, program.delay)
        return true
    }
}

// Create local proxies
proxies.forEach(function (proxy) {

    mkdirp.sync(proxy.dir)

    console.log('Creating proxy server for %s at %s', proxy.domain, proxy.proxy)

    http.createServer(function (req, res) {
        var requestURL = req.url.replace(/^\/https?\//, 'http://')
        var resourceHash = crypto.createHash('md5').update(req.url).digest('hex')
        var parsedURL    = url.parse(req.url)
        var extension    = path.extname(path.basename(parsedURL.pathname))
        var cachedPath   = path.join(proxy.dir, resourceHash) + extension

        var headers = _.extend(
            _.pick(req.headers, ['user-agent', 'accept-language', 'cookie']),
            { 'Access-Control-Allow-Origin': '*' }
        )

        if (req.url === '/favicon.ico') {
            return res.end();
        }

        if (!serveFromCache(requestURL, cachedPath, res, proxy)) {
            console.log('Fetching: %s', requestURL)
            request(requestURL, { encoding: null, headers: headers }, function (err, response, body) {
                var encoding = 'binary'
                if (err || !response) {
                    return res.end();
                }
                var contentType = response.headers['content-type'];
                if (/text|script/.test(contentType)) {
                    body = replaceDomains(body)
                    encoding = 'utf8'

                }
                fs.writeFile(cachedPath, body, encoding, function () {
                    res.end(body)
                })
            })
        }

    }).listen(proxy.port)
})

var filePath = program.url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]/ig, '_') + '.html'

request(program.url, function (err, response, body){
    fs.writeFile(filePath, replaceDomains(body), createServer)
})

// Serve rewritten page through server
function createServer () {
    http.createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        fs.createReadStream(filePath).pipe(res)
    }).listen(program.port)
    console.log('Listening on port ' + program.port)
}
