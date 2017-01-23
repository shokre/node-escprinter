var RobotronFont = require('./fonts/robofont.js').RobotronFont
var ZERO = '0'.charCodeAt(0);

function Printer(m_output, opts) {
    opts = opts || {};
    this.buf = [];

    var self = this;

    opts.margin_left = opts.margin_left || 20;
    opts.margin_top = opts.margin_top || 20;
    opts.paper_width = opts.paper_width || 1250;
    opts.point_size = opts.point_size || 6.0;
    opts.dpi = opts.dpi || 720.0;
    var m_x = 0;
    var m_y = 0;
    var m_printmode = false;
    var m_endofpage = false;

    //TODO: Íàñòðàèâàòü ðåæèìû ïî DIP-ïåðåêëþ÷àòåëÿì
    var m_fontsp, m_fontdo, m_fontfe, m_fontks, m_fontel, m_fontun;
    var m_shiftx, m_shifty;  // 6 lines/inch
    var m_superscript, m_subscript;
    var m_charset = 0;

    function UpdateShiftX() {
        m_shiftx = opts.dpi / 10;  // Îáû÷íûé èíòåðâàë
        if (m_fontel)
            m_shiftx = opts.dpi / 12;  // Ýëèòà
        else if (m_fontks)
            m_shiftx = opts.dpi / 17;  // Ñæàòûé

        if (m_fontsp)  // Øðèôò âðàçðÿäêó
            m_shiftx *= 2;
    }

    function PrinterReset() {
        m_x = m_y = 0;
        m_printmode = false;

        //TODO: Íàñòðàèâàòü ðåæèìû ïî DIP-ïåðåêëþ÷àòåëÿì
        m_fontsp = m_fontdo = m_fontfe = m_fontks = m_fontel = m_fontun = false;
        m_shifty = 720/6;  // 6 lines/inch
        UpdateShiftX();

        m_superscript = m_subscript = false;
        m_charset = 0;
    }

    function DrawStrike(x, y) {
        m_output.WriteStrike(opts.margin_left + x, opts.margin_top + y, opts.point_size);
    }

    function PrintCharacter(ch) {
        if (ch < 32 || ch > 255) return;
        if (ch < 160 && ch > 126) return;

        var charset = m_charset ^ (ch > 128 ? 1 : 0);
        ch &= 0x7f;
        var symbol = ch;
        if (ch >= '@' && charset != 0)
            symbol += 68;

        // Ïîëó÷àåì àäðåñ ñèìâîëà â çíàêîãåíåðàòîðå
        var pchardata = RobotronFont.chars[symbol];

        var step = m_shiftx / 11.0
        var y = m_y;
        if (m_subscript) y += 4 * 12;

        // Öèêë ïå÷àòè ñèìâîëà ïî ñòðîêàì
        var data = 0;
        var prevdata = 0;
        for (var line = 0; line < 9; line++) {
            data = pchardata[line];

            // Îñîáàÿ îáðàáîòêà äëÿ íàä- è ïîä-ñòðî÷íûõ ñèìâîëîâ
            if ((m_superscript || m_subscript)) {
                if ((line & 1) == 0) {
                    prevdata = data;
                    continue;
                }
                else {
                    data |= prevdata;  // Îáúåäèíÿåì äâå ñòðîêè ñèìâîëà â îäíó
                }
            }

            for (var col = 0; col < 9; col++)  // Öèêë ïå÷àòè òî÷åê ñòðîêè
            {
                var bit = (data >> col) & 1;
                if (m_fontun && line == 8) bit = 1;
                if (!bit) continue;

                DrawStrike(m_x + col * step, y);
                if (m_fontsp)
                    DrawStrike(m_x + (col + 1.0) * step, y);

                //TODO: Ó÷èòûâàòü m_fontfe (æèðíûé øðèôò)
            }

            y += 12;  // 12 ñîîòâåòñòâóåò 1/60 inch
        }

        // Äëÿ m_fontun äîáèâàòü ïîñëåäíþþ òî÷êó
        if (m_fontun)
            DrawStrike(m_x + 9.0 * step, m_y + 8 * 12);
    }

    function GetNextByte() {
        return self.buf.shift();
    }

    function InterpretEscape() {
        var ch = GetNextByte();
        switch (String.fromCharCode(ch)) {
            case 'U': // Ïå÷àòü â îäíîì èëè äâóõ íàïðàâëåíèÿõ
                GetNextByte();  // Èãíîðèðóåì
                break;
            case 'x': // Âûáîð êà÷åñòâà
                m_printmode = (GetNextByte() != 0);
                break;

            // Ãðóïïà ôóíêöèé character pitch
            case 'P':  // Âêëþ÷åíèå øðèôòà "ïèêà"
                m_fontel = false;
                UpdateShiftX();
                break;
            case 'M':  // Âêëþ÷åíèå øðèôòà "ýëèòà" (12 ñèìâîëîâ íà äþéì)
                m_fontel = true;
                UpdateShiftX();
                break;
            case '0':  // Óñòàíîâêà èíòåðâàëà 1/8"
                m_shifty = opts.dpi / 8;
                break;
            case '1':  // Óñòàíîâêà èíòåðâàëà 7/72"
                m_shifty = opts.dpi * 7 / 72;
                break;
            case '2':
                m_shifty = opts.dpi / 6;
                /* set line spacing to 1/6 inch */
                break;
            case 'A':   /* text line spacing */
                m_shifty = (opts.dpi * GetNextByte() / 60);
                break;
            case '3':   /* graphics line spacing */
                m_shifty = (opts.dpi * GetNextByte() / 180);
                break;
            case 'J': /* variable line spacing */
                m_y += GetNextByte() * opts.dpi / 180;
                return true;

            case 'C': //PageLength - èãíîðèðîâàòü
                if (GetNextByte() == 0)
                    GetNextByte();
                break;
            case 'N': //Skip perforation - èãíîðèðîâàòü
                GetNextByte();
                break;
            case 'O':
                break;
            case 'B': //Set vertical tabs - èãíîðèðîâàòü ???
                while (GetNextByte() != 0);
                break;
            case '/':
                GetNextByte();
                break;
            case 'D': //Set horizontal tabs - èãíîðèðîâàòü ???
                while (GetNextByte() != 0);
                break;
            case 'Q': //Set right margin - èãíîðèðîâàòü ???
                GetNextByte();
                break;

            //Bit image graphics mode !!! - íåäîäåëàíî
            case 'K': /* 8-bit single density graphics */
            case 'L': /* the same */
                printGR9(2 * 6);
                break;
            case 'Y': /* 8-bit double-speed double-density graphics */
                printGR9(2 * 3);
                break;
            case 'Z': /* 8-bit quadple-density graphics */
                printGR9(3 /* = 2*1.5 */);
                break;
            case '*': /* Bit Image Graphics Mode */
                switch (GetNextByte()) {
                    case 0: /* same as ESC K graphic command */
                    case 1: /* same as ESC L graphic command */
                        printGR9(2 * 6);
                        break;
                    case 2: /* same as ESC Y graphic command */
                        printGR9(2 * 3);
                        break;
                    case 3: /* same as ESC Z graphic command */
                        printGR9(3);
                        break;
                    case 4: /* CRT 1 */
                        printGR9(9);
                        break;
                    case 5:
                        //TODO
                        break;
                    case 6: /* CRT 2 */
                        printGR9(8);
                        break;
                    case 32:  /* High-resolution for ESC K */
                        printGR24(2 * 6);
                        break;
                    case 33:  /* High-resolution for ESC L */
                        printGR24(2 * 3);
                        break;
                    case 38:  /* CRT 3 */
                        printGR24(2 * 4);
                        break;
                    case 39:  /* High-resolution triple-density */
                        printGR24(2 * 2);
                        break;
                    case 40:  /* high-resolution hex-density */
                        printGR24(2);
                        break;
                }
                break;
            /* reassign bit image command ??? */
            case '?':
                break;
            /* download - èãíîðèðîâàòü (???) */
            case '&':
                break; /* this command downloads character sets to the printer */
            case '%':
                break; /* select/deselect download character code */
            case ':': /* this command copies the internal character set into the download area */
                GetNextByte();
                GetNextByte();
                GetNextByte();
                break;
            case 'R': /* international character set - èãíîðèðîâàòü (???) */
                m_charset = GetNextByte();
                break;
            /* MSB control - èãíîðîðèðîâàòü (???) */
            case '#':
                break; /* clear most significant bit */
            case '=':
                break; /* clear most significant bit */
            case '>':
                break; /* set most significant bit */
            /* print table control */
            case '6':
                break; /* select upper character set */
            case '7':
                break; /* select lower character set */
            /* home head */
            case '<':
                m_x = 0;
                /* repositions the print head to the left most column */
                break;
            /* absolute dot position */
            case '$':
                m_x = GetNextByte();
                m_x += 256 * GetNextByte();
                m_x = m_x * opts.dpi / 60;
                break;
            /* relative dot position */
            case '\\':
                var shift = GetNextByte();
                shift += 256 * GetNextByte();
                m_x += ( shift * opts.dpi / (m_printmode ? 180 : 120) );
                /* !!! ó÷åñòü ìîäó LQ èëè DRAFT */
                break;

            /* CHARACTER CONTROL CODES */
            case 'E': // Âêëþ÷åíèå æèðíîãî øðèôòà
                m_fontfe = true;
                UpdateShiftX();
                break;
            case 'F': // Âûêëþ÷åíèå æèðíîãî øðèôòà
                m_fontfe = false;
                UpdateShiftX();
                break;
            case 'G':  // Âêëþ÷åíèå äâîéíîé ïå÷àòè
                m_fontdo = true;
                break;
            case 'H':  // Âûêëþ÷åíèå äâîéíîé ïå÷àòè
                m_fontdo = false;
                m_superscript = m_subscript = false;
                break;
            case '-': // Ïîä÷åðêèâàíèå
                m_fontun = (GetNextByte() != ZERO);
                break;

            case 'S': // Âêëþ÷åíèå ïå÷àòè â âåðõíåé èëè íèæíåé ÷àñòè ñòðîêè
                var ss = GetNextByte();
                m_superscript = (ss == 0);
                m_subscript = (ss == 1);
                break;
            case 'T': // Âûêëþ÷åíèå ïå÷àòè â âåðõíåé èëè íèæíåé ÷àñòè ñòðîêè
                m_superscript = m_subscript = false;
                break;
            case 'W': // Âêëþ÷åíèå èëè âûêëþ÷åíèå øðèôòà âðàçðÿäêó
                m_fontsp = (GetNextByte() != ZERO);
                UpdateShiftX();
                break;
            case '!': // Âûáîð âèäà øðèôòà
                var fontbits = GetNextByte();
                m_fontel = (fontbits & 1) != 0;
                m_fontks = ((fontbits & 4) != 0) && !m_fontel;
                m_fontfe = ((fontbits & 8) != 0) && !m_fontel;
                m_fontdo = (fontbits & 16) != 0;
                m_fontsp = (fontbits & 32) != 0;
                UpdateShiftX();
                break;
            /* italic print */
            case '4': /* set italics */
                break;
            case '5': /* clear itelics */
                break;
            /* character table */
            case 't': /* select character table ??? */
                GetNextByte();
                /* èãíîðèðîâàòü */
                break;
            /* double height */
            case 'w': /* select double height !!! */
                GetNextByte();
                break;

            /* SYSTEM CONTROL CODES */
            /* reset */
            case '@':
                PrinterReset();
                break;

            default:

                switch (ch) {

                    case 15:/*SI*/
                        // Âêëþ÷åíèå ñæàòîãî øðèôòà
                        m_fontks = true;
                        UpdateShiftX();
                        break;


                    case 14:/*SO*/
                        // Âêëþ÷åíèå øðèôòà âðàçðÿäêó
                        m_fontsp = true;
                        UpdateShiftX();
                        break;
                    /* inter character space */
                    case 32:/*SP*/

                        GetNextByte();
                        break;

                    /* cut sheet feeder control */
                    case 25:/*EM*/
                        GetNextByte();
                        /* ??? - èãíîðèðîâàòü */
                        break;
                }
        }

        return true;
    }

    function printGR9(dx) {
        var width = GetNextByte();  // Êîëè÷åñòâî "êóñî÷êîâ" äàííûõ î èçîáðàæåíèè
        width += 256 * GetNextByte();

        // ×èòàòü è âûâîäèòü äàííûå
        for (; width > 0; width--) {
            var fbyte = GetNextByte();
            var mask = 0x80;
            for (var i = 0; i < 8; i++) {
                if (fbyte & mask) {
                    DrawStrike(float(m_x), float(m_y + i * 12));
                    /* 12 ñîîòâåòñòâóåò 1/60 inch... Íà ñàìîì äåëå ðàññòîÿíèå ìàæäó èãëàìè ó
                     9-pin dot matrix printers = 1/72 inch, íî ïðè ýìóëÿöèè íà 24-pin ïðèíèìàåòñÿ 1/60 */
                }
                mask >>= 1;
            }
            m_x += dx;
        }
    }

    function printGR24(dx) {
        var width = GetNextByte();  // Êîëè÷åñòâî "êóñî÷êîâ" äàííûõ î èçîáðàæåíèè
        width += 256 * GetNextByte();

        // ×èòàòü è âûâîäèòü äàííûå
        for (; width > 0; width--) {
            for (var n = 0; n < 3; n++) {
                var fbyte = GetNextByte();
                var mask = 0x80;
                for (var i = 0; i < 8; i++) {
                    if (fbyte & mask) {
                        DrawStrike(float(m_x), (m_y + (n * 4 * 8/*èãë*/) + i * 4));
                        /* 4 ñîîòâåòñòâóåò 1/180 inch - ðàññòîÿíèå ìàæäó èãëàìè ó 24-pin dot matrix printers */
                    }
                    mask >>= 1;
                }
            }
            m_x += dx;
        }
    }

    this.InterpretNext = function InterpretNext() {
        if (this.buf.length == 0)
            return false;

        var ch = this.buf.shift();
        switch (ch) {
            case 0:/*NUL*/

            case 7:/*BEL*/

            case 17:/*DC1*/

            case 19:/*DC3*/

            case 127:/*DEL*/

                break; // Èãíîðèðóåìûå êîäû
            case 24:/*CAN*/

                m_endofpage = true;
                m_x = m_y = 0;
                return false; //Êîíåö ñòðàíèöû
            case 8:/*BS*/
                // Backspace - ñäâèã íà 1 ñèìâîë íàçàä
                m_x -= m_shiftx;
                if (m_x < 0) m_x = 0;
                break;
            case 9:/*HT*/
                // Ãîðèçîíòàëüíàÿ òàáóëÿöèÿ - ðåàëèçîâàí ÷àñòíûé ñëó÷àé
                //NOTE: ïåðåóñòàíîâêà ïîçèöèé òàáóëÿöèè èãíîðèðóåòñÿ
                m_x += m_shiftx * 8;
                m_x = (m_x / (m_shiftx * 8)) * (m_shiftx * 8);
                break;
            case 10:/*LF*/
                // Line Feed - ñäâèã ê ñëåäóþùåé ñòðîêå
                m_x = 0;
                m_y += m_shifty;
                return true;
            case 11:/*VT*/
                //Âåðòèêàëüíàÿ òàáóëÿöèÿ - â ÷àñòíîì ñëó÷àå óäîâëåòâîðÿåò îïèñàíèþ.
                //NOTE: Ïåðåóñòàíîâêà ïîçèöèé òàáóëÿöèè èãíîðèðóåòñÿ
                m_x = 0;
                m_y += m_shifty;
                return true;
            case 12:/*FF*/
                // Form Feed - !!! äîäåëàòü
                m_endofpage = true;
                m_x = m_y = 0;
                return false;
            case 13:/*CR*/
                // Carriage Return - âîçâðàò êàðåòêè
                m_x = 0;
                break;
            case 14:/*SO*/
                // Âêëþ÷åíèå øðèôòà âðàçðÿäêó
                m_fontsp = true;
                UpdateShiftX();
                break;
            case 15:/*SI*/
                // Âêëþ÷åíèå ñæàòîãî øðèôòà (17.1 ñèìâîëîâ íà äþéì)
                m_fontks = true;
                UpdateShiftX();
                break;
            case 18:/*DC2*/
                // Âûêëþ÷åíèå ñæàòîãî øðèôòà
                m_fontks = false;
                UpdateShiftX();
                break;
            case 20:/*DC4*/
                // Âûêëþ÷åíèå øðèôòà âðàçðÿäêó
                m_fontsp = false;
                UpdateShiftX();
                break;
            case 27:/*ESC*/
                //Expanded Function Codes
                return InterpretEscape();

            /* èíà÷å "íàïå÷àòàòü" ñèìâîë */
            default:
                if (m_x + m_shiftx + opts.margin_left > opts.paper_width) {
                    m_x = 0;
                    m_y += m_shifty;
                }
                PrintCharacter(ch);
                m_x += m_shiftx;
                break;
        }

        return true;
    }

    this.drawMargins = function () {
        m_output.drawMargins(opts.margin_top, opts.margin_left, opts.paper_width - opts.margin_left);
    }
    // init
    PrinterReset();
}

function toUTF8Array(str) {
    var utf8 = [];
    for (var i = 0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6),
                0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12),
                0x80 | ((charcode >> 6) & 0x3f),
                0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff) << 10)
                | (str.charCodeAt(i) & 0x3ff))
            utf8.push(0xf0 | (charcode >> 18),
                0x80 | ((charcode >> 12) & 0x3f),
                0x80 | ((charcode >> 6) & 0x3f),
                0x80 | (charcode & 0x3f));
        }
    }
    return utf8;
}

Printer.prototype.print = function (str) {
    this.buf = toUTF8Array(str);
    while (this.InterpretNext());
}

module.exports = Printer;
