var fs = require('fs')


function SVGDriver() {
    this.buf = [];
}

SVGDriver.prototype.WriteBeginning = function () {
    this.buf.push("<?xml version=\"1.0\"?>");
    this.buf.push("<svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.0\">");
    this.buf.push('<g transform="scale(2)">');

}

SVGDriver.prototype.WriteEnding = function () {
    this.buf.push('</g>');
    this.buf.push("</svg>");
}

SVGDriver.prototype.WriteStrike = function (x, y, r) {
    var cx = x / 10.0
    var cy = y / 10.0
    var cr = r / 10.0
    return this.buf.push(['<circle cx="' , cx.toFixed(4) , '" cy="' , cy.toFixed(4) , '" r="' , cr, '" />'].join(''));
}

SVGDriver.prototype.line = function (x1, y1, x2, y2, s) {
    //
    this.buf.push(['<line x1="', x1, '" y1="', y1, '" x2="', x2, '" y2="', y2, '" style="', s, '" />'].join(''));
}


SVGDriver.prototype.drawMargins = function (t, l, r) {
    var m = 2000;
    var s = 'stroke:rgb(255,0,0);stroke-width:0.5';
    this.line(0,t/10,m,t/10,s);
    this.line(l/10,0,l/10,m,s);
    this.line(r/10,0,r/10,m,s);
    //this.line(0,t,m,t);
}

SVGDriver.prototype.save = function (fn) {
    fs.writeFileSync(fn, this.buf.join('\n'));
}


module.exports = SVGDriver;
