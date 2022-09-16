const queryString = require('query-string');
const httpStatus  = require('http-status');
const moment      = require('moment');
const https = require('https');
const http  = require('http');
const url   = require('url');
const fs    = require('fs');

const E = process.env;
const CARD = fs.readFileSync('card.svg', 'utf8');
const LOGO = fs.readFileSync('logo.svg', 'utf8');
const HEADERS = {
  'Content-Type': 'image/svg+xml',
  'Access-Control-Allow-Origin': 'https://nodeico.github.io',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
};




function request(pth, method='GET') {
  console.log(`> ${method} ${pth}`);
  return new Promise((fres, frej) => {
    var opts = {hostname: 'unpkg.com', path: pth, method};
    var req  = https.request(opts, res => {
      res.setEncoding('utf8');
      var code   = res.statusCode;
      var status = httpStatus[code];
      console.log(`< ${method} ${pth} : ${code} ${status}`);
      var body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (code>=300 && code<400) request(res.headers['location'], method).then(fres);
        else if (code>=200 && code<300) fres((res.body = body) && res);
        else frej(new Error(code+' '+status));
      });
    });
    req.on('error', frej);
    req.end();
  });
}


function argument(qry) {
  var width  = parseFloat(qry.width)  || 384;
  var height = parseFloat(qry.height) || 56;
  var margin = parseFloat(qry.margin) || 4;
  return {width, height, margin};
}


function package(nam) {
  return request(`https://unpkg.com/${nam}/package.json`).then(res => {
    var pkg = JSON.parse(res.body);
    var mod = res.headers['last-modified'];
    var install = (pkg.preferGlobal? '-g ' : '') + pkg.name;
    var deps    = Object.keys(pkg.dependencies || {}).length;
    var dependencies = deps + ' dependenc' + (deps!==1? 'ies' : 'y');
    var license = pkg.license;
    var version = pkg.version;
    var updated = moment(mod).fromNow();
    return {install, dependencies, license, version, updated};
  });
}


function fitWidth(org, ins, upd) {
  var iw = 110 + (12 + ins.length) * 12 * 0.63;
  var uw = 240 + upd.length        * 11 * 0.63;
  return Math.round(Math.max(org, iw, uw));
}


function svg(arg, pkg) {
  var a = arg, p = pkg, c = CARD;
  a.width = fitWidth(a.width, p.install, p.updated);
  c = c.replace(/{{a.width([\+\-\d]+)?}}/g,  (m, p1) => `${a.width  + (parseFloat(p1) || 0)}`);
  c = c.replace(/{{a.height([\+\-\d]+)?}}/g, (m, p1) => `${a.height + (parseFloat(p1) || 0)}`);
  c = c.replace(/{{a.margin([\+\-\d]+)?}}/g, (m, p1) => `${a.margin + (parseFloat(p1) || 0)}`);
  c = c.replace(/{{p.install}}/g, p.install);
  c = c.replace(/{{p.dependencies}}/g, p.dependencies);
  c = c.replace(/{{p.license}}/g, p.license);
  c = c.replace(/{{p.version}}/g, p.version);
  c = c.replace(/{{p.updated}}/g, p.updated);
  return c.replace(/{{n.logo}}/g, LOGO);
}


var server = http.createServer((req, res) => {
  console.log(`:> ${req.method} ${req.url}`);
  if (req.url==='/') { res.writeHead(302, {'Location': 'https://nodeico.github.io'}); return res.end(); }
  var {path, search} = url.parse(req.url.toLowerCase());
  var query = queryString.parse(search);
  if (!path.endsWith('.svg')) return res.end();
  var name = path.substring(1, path.length-4);
  package(name).then(pkg => {
    res.writeHead(200, HEADERS);
    res.end(svg(argument(query), pkg));
  }, _ => res.end());
});
server.listen(E.PORT || 80);
