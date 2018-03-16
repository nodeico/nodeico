const httpStatus = require('http-status');
const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

const E = process.env;
const CARD = fs.readFileSync('card.svg');
const LOGO = fs.readFileSync('logo.svg');

function request(pth, mth='GET') {
  console.log(`> ${mth} ${pth}`);
  return new Promise((fres, frej) => {
    var pto = url.parse(pth);
    var opt = {hostname: pto.hostname, port: pto.port, path: pto.path, method: mth};
    var req = (pto.protocol==='https:'? https:http).request(opt, (res) => {
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

function pkg(nam) {
  var opt = {hostname: 'unpkg.com', path: `/${nam}`};
  var req = https.request(opt, (res) => {
    
  });
  req.end();
};

function svg(arg, pkg) {
  var a = arg, p = pkg, z = CARD;
  z = z.replace(/{{a.width([\+\-\d]+)}}/g, (m, p1) => `${a.width+(parseFloat(p1)||0)}`);
  z = z.replace(/{{a.height([\+\-\d]+)}}/g, (m, p1) => `${a.height+(parseFloat(p1)||0)}`);
  z = z.replace(/{{a.margin([\+\-\d]+)}}/g, (m, p1) => `${a.margin+(parseFloat(p1)||0)}`);
  z = z.replace(/{{p.install}}/g, p.install);
  z = z.replace(/{{p.dependencies}}/g, p.dependencies);
  z = z.replace(/{{p.dependents}}/g, p.dependents);
  z = z.replace(/{{p.version}}/g, p.version);
  z = z.replace(/{{p.updated}}/g, p.updated);
  return z.replace(/{{n.logo}}/g, LOGO);
};


var server = http.createServer((req, res) => {
  var u = url.parse(req.url);
  console.log(u);
  res.end('Hello World');
});
server.listen(E.PORT||80);
