// Shared Kebrane house-style helpers (Georgia editorial)
const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = require('docx');
const SERIF = "Georgia", NAVY = "1F3352", RED = "A5322C", INK = "1A1A1A", GREY = "555555";

const P = (o) => new Paragraph(o);
const R = (o) => new TextRun(o);

function nameLine(text) {
  return P({ spacing: { before: 360, after: 40 }, alignment: AlignmentType.CENTER,
    children: [R({ text, font: SERIF, bold: true, color: NAVY, size: 38, characterSpacing: 40 })] });
}
function bigTitle(text, opts = {}) {
  return P({ alignment: AlignmentType.CENTER, spacing: { after: opts.after ?? 60, before: opts.before ?? 0 },
    children: [R({ text, font: SERIF, bold: true, color: NAVY, size: 34 })] });
}
function subtitle(text) {
  return P({ alignment: AlignmentType.CENTER, spacing: { after: 40, before: 140 },
    children: [R({ text, font: SERIF, italics: true, color: GREY, size: 21 })] });
}
function meta(text) {
  return P({ alignment: AlignmentType.CENTER, spacing: { after: 120, before: 60 },
    children: [R({ text, font: SERIF, color: NAVY, size: 19 })] });
}
function rule() {
  return P({ spacing: { after: 260, before: 60 },
    border: { bottom: { color: RED, style: BorderStyle.SINGLE, size: 12, space: 6 } },
    children: [R({ text: "", size: 2 })] });
}
function header(text) {
  return P({ spacing: { before: 340, after: 150 }, keepNext: true,
    children: [ R({ text: "—  ", font: SERIF, bold: true, color: RED, size: 25 }),
                R({ text, font: SERIF, bold: true, color: NAVY, size: 25 }) ] });
}
function body(text) {
  return P({ spacing: { after: 150, line: 288 }, alignment: AlignmentType.JUSTIFIED,
    children: [R({ text, font: SERIF, color: INK, size: 21 })] });
}
function subhead(text) {
  return P({ spacing: { before: 220, after: 80 }, keepNext: true,
    children: [R({ text, font: SERIF, bold: true, color: NAVY, size: 22 })] });
}
function lead(leadIn, rest) {
  return P({ spacing: { after: 150, line: 288 }, alignment: AlignmentType.JUSTIFIED,
    children: [ R({ text: leadIn + "  ", font: SERIF, bold: true, color: NAVY, size: 21 }),
                R({ text: rest, font: SERIF, color: INK, size: 21 }) ] });
}
function numbered(num, leadIn, rest) {
  return P({ spacing: { after: 150, line: 288 }, alignment: AlignmentType.JUSTIFIED,
    indent: { left: 440, hanging: 440 },
    children: [ R({ text: num + "   ", font: SERIF, bold: true, color: RED, size: 21 }),
                R({ text: leadIn + "  ", font: SERIF, bold: true, color: NAVY, size: 21 }),
                R({ text: rest, font: SERIF, color: INK, size: 21 }) ] });
}
function bullet(leadIn, rest) {
  return P({ spacing: { after: 110, line: 280 }, indent: { left: 340, hanging: 340 },
    children: [ R({ text: "–  ", font: SERIF, bold: true, color: RED, size: 21 }),
                R({ text: leadIn, font: SERIF, bold: leadIn.endsWith(": ")||leadIn.endsWith(":"), color: leadIn.match(/:$|: $/) ? NAVY : INK, size: 21 }),
                R({ text: rest, font: SERIF, color: INK, size: 21 }) ] });
}
function ouinon(label, text, color) {
  return P({ spacing: { after: 80, line: 280 }, indent: { left: 340, hanging: 340 },
    children: [ R({ text: label + "  ", font: SERIF, bold: true, color, size: 21 }),
                R({ text, font: SERIF, color: INK, size: 21 }) ] });
}
function quote(text) {
  return P({ spacing: { after: 150, before: 40, line: 288 }, indent: { left: 300 },
    border: { left: { color: RED, style: BorderStyle.SINGLE, size: 18, space: 14 } },
    children: [R({ text, font: SERIF, italics: true, color: NAVY, size: 21 })] });
}
function signature() {
  return [
    P({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 },
      children: [R({ text: "Par Kebrane", font: SERIF, bold: true, color: NAVY, size: 24, characterSpacing: 20 })] }),
    P({ alignment: AlignmentType.CENTER, spacing: { before: 20, after: 120 },
      children: [R({ text: "By Kebrane", font: SERIF, italics: true, color: GREY, size: 20 })] }),
  ];
}
function golden(text) {
  return P({ spacing: { before: 360, after: 120, line: 300 }, indent: { left: 240, right: 240 },
    border: { top: { color: RED, style: BorderStyle.SINGLE, size: 18, space: 10 } },
    children: [R({ text, font: SERIF, italics: true, color: RED, size: 22 })] });
}
function build(fname, title, kids) {
  const doc = new Document({ creator: "Kebrane", title,
    styles: { default: { document: { run: { font: SERIF, size: 21, color: INK } } } },
    sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: kids }] });
  return Packer.toBuffer(doc).then((buf) => require('fs').writeFileSync("/sessions/practical-sweet-franklin/mnt/outputs/" + fname, buf));
}
module.exports = { nameLine, bigTitle, subtitle, meta, rule, header, body, subhead, lead, numbered, bullet, ouinon, quote, signature, golden, build, NAVY, RED };
