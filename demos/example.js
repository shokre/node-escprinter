
var EP = require('./../index.js');

var dr = new EP.SVGDriver;
var p = new EP.Printer(dr, {
    paper_width: 2500,
    dpi: 720,
});

var ESC = String.fromCharCode(27);
var k15 = String.fromCharCode(15);
var k18 = String.fromCharCode(18);

p.print('normal '+ ESC+'W1WIDE' + ESC + 'W0');
p.print('\n\r');
p.print('Normal (PICA)\n\r');
p.print(ESC+ 'MCompressed (ELITE)\n\r');
p.print(ESC+ 'P');
p.print(k15+ 'Ultra Compressed\n\r'+ k18);
p.print('0....1....2....');
p.print('0....1....2....');
p.print('0....1....2....');
p.print('0....1....2....');
p.drawMargins();
dr.save('out.svg');
