const queryString = require('query-string');
const httpStatus = require('http-status');
const moment = require('moment');
const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

const E = process.env;
const CARD = fs.readFileSync('card.svg', 'utf8');
const LOGO = fs.readFileSync('logo.svg', 'utf8');

function request(pth, mth='GET') {
  console.log(`> ${mth} ${pth}`);
  return new Promise((fres, frej) => {
    var opt = {hostname: 'unpkg.com', path: pth, method: mth};
    var req = https.request(opt, (res) => {
      res.setEncoding('utf8');
      var z = '', cod = res.statusCode, sta = httpStatus[cod];
      console.log(`< ${mth} ${pth} : ${cod} ${sta}`);
      res.on('data', (cnk) => z += cnk);
      res.on('end', () => {
        if(cod>=300 && cod<400) request(res.headers['location'], mth).then(fres);
        else if(cod>=200 && cod<300) fres((res.body=z)&&res);
        else frej(new Error(cod+' '+sta));
      });
    });
    req.on('error', frej);
    req.end();
  });
};

function argument(qry) {
  var width = parseFloat(qry.width)||384, height = parseFloat(qry.height)||56, margin = parseFloat(qry.margin)||4;
  return {width, height, margin};
};

function package(nam) {
  return request(`https://unpkg.com/${nam}/package.json`).then((res) => {
    var pkg = JSON.parse(res.body), mod = res.headers['last-modified'];
    var install = (pkg.preferGlobal? '-g ':'')+pkg.name, deps = Object.keys(pkg.dependencies||{}).length;
    var dependencies = deps+' dependenc'+(deps!==1? 'ies':'y');
    var license = pkg.license, version = pkg.version, updated = moment(mod).fromNow();
    return {install, dependencies, license, version, updated};
  });
};

function fitWidth(org, ins, upd) {
  var iw = 110+(12+ins.length)*12*0.63, uw = 240+upd.length*11*0.63;
  return Math.round(Math.max(org, iw, uw));
};

function svg(arg, pkg) {
  var a = arg, p = pkg, z = CARD;
  a.width = fitWidth(a.width, p.install, p.updated);
  z = z.replace(/{{a.width([\+\-\d]+)?}}/g, (m, p1) => `${a.width+(parseFloat(p1)||0)}`);
  z = z.replace(/{{a.height([\+\-\d]+)?}}/g, (m, p1) => `${a.height+(parseFloat(p1)||0)}`);
  z = z.replace(/{{a.margin([\+\-\d]+)?}}/g, (m, p1) => `${a.margin+(parseFloat(p1)||0)}`);
  z = z.replace(/{{p.install}}/g, p.install);
  z = z.replace(/{{p.dependencies}}/g, p.dependencies);
  z = z.replace(/{{p.license}}/g, p.license);
  z = z.replace(/{{p.version}}/g, p.version);
  z = z.replace(/{{p.updated}}/g, p.updated);
  return z.replace(/{{n.logo}}/g, LOGO);
};

var server = http.createServer((req, res) => {
  console.log(`:> ${req.method} ${req.url}`);
  var {path, search} = url.parse(req.url.toLowerCase());
  var query = queryString.parse(search);
  if(!path.endsWith('.svg')) return res.end();
  var name = path.substring(1, path.length-4);
  package(name).then((pkg) => {
    res.writeHead(200, {'Content-Type': 'image/svg+xml'});
    res.end(svg(argument(query), pkg));
  });
});
server.listen(E.PORT||80);
