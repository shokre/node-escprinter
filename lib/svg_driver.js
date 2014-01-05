var fs = require('fs')


function SVGDriver() {
    this.buf = [];
}

SVGDriver.prototype.getBeginning = function () {
    return ["<?xml version=\"1.0\"?>"
        , "<svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.0\">"
        , '<g transform="scale(0.2)">'
    ];
}

SVGDriver.prototype.getEnding = function () {
    return [
        '</g>',
        "</svg>"
    ];
}

SVGDriver.prototype.getOutput = function () {
    return [].concat(this.getBeginning(), this.buf, this.getEnding()).join('\n')
}

SVGDriver.prototype.tag = function (name, attrs, open) {
    var s = ['<' + name];
    for (var k in attrs)
        if (attrs[k])
            s.push([k, '="', attrs[k], '"'].join(''));
    return this.buf.push(s.join(' ')+ (open ? '': '/') + '>')
}

SVGDriver.prototype.WriteStrike = function (x, y, r, s) {
    return this.tag('circle', {
        cx: x.toFixed(4),
        cy: y.toFixed(4),
        r: r,
        style: s
    })
}

SVGDriver.prototype.line = function (x1, y1, x2, y2, s) {
    return this.tag('line', {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        style: s
    });
}

SVGDriver.prototype.drawMargins = function (t, l, r) {
    var m = 2000;
    var s = 'stroke:rgb(255,0,0);stroke-width:1';
    this.tag('g', {style:s}, true);
    this.line(0, t, m, t);
    this.line(l, 0, l, m);
    this.line(r, 0, r, m);
    this.tag('/g',{}, true);
}

SVGDriver.prototype.save = function (fn) {
    fs.writeFileSync(fn, this.getOutput());
}

module.exports = SVGDriver;
