import 'server-only'

/**
 * Minimaler PDF-Generator ohne Abhängigkeiten: Tabellenberichte (A4 quer) mit Kopfzeile, Spaltenköpfen,
 * Seitenumbruch und Fußzeile. Schrift Helvetica (Standard-14, WinAnsi → Umlaute funktionieren).
 * Reicht für Zugriffsprotokoll und Nachweislisten; für gestaltete Dokumente wäre eine Bibliothek nötig.
 */
export type PdfSpalte = { label: string; breite: number }   // Breite in pt
export type PdfBericht = { titel: string; untertitel?: string; hinweis?: string; spalten: PdfSpalte[]; zeilen: string[][]; fusszeile?: string }

const PAGE_W = 841.89, PAGE_H = 595.28   // A4 quer
const MARGIN = 40
const FONT = 9, HEAD = 9, TITLE = 16, LINE = 14

// Näherung der Helvetica-Zeichenbreiten (in 1/1000 em) für Kürzung und Ausrichtung
const W: Record<string, number> = { ' ': 278, '.': 278, ',': 278, ':': 278, '-': 333, '·': 333, i: 222, l: 222, j: 222, t: 278, f: 278, r: 333, I: 278, m: 833, w: 722, M: 833, W: 944, '@': 1015 }
function breite(s: string, size: number) {
  let w = 0
  for (const ch of s) w += W[ch] ?? (ch >= 'A' && ch <= 'Z' ? 667 : 556)
  return (w / 1000) * size
}
function kuerzen(s: string, max: number, size: number) {
  if (breite(s, size) <= max) return s
  let t = s
  while (t.length > 1 && breite(t + '…', size) > max) t = t.slice(0, -1)
  return t + '…'
}

/** Text → WinAnsi (cp1252) als PDF-String-Literal mit Escapes */
function lit(s: string) {
  const bytes: number[] = []
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    let b: number
    if (c < 128) b = c
    else if (c === 0x20AC) b = 0x80      // €
    else if (c === 0x2026) b = 0x85      // …
    else if (c === 0x2013) b = 0x96      // –
    else if (c === 0x2014) b = 0x97      // —
    else if (c === 0x201E) b = 0x84      // „
    else if (c === 0x201C) b = 0x93      // “
    else if (c === 0x201D) b = 0x94      // ”
    else if (c >= 0xA0 && c <= 0xFF) b = c   // Latin-1 inkl. Umlaute
    else b = 0x3F                        // ?
    bytes.push(b)
  }
  let out = ''
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5C) out += '\\' + String.fromCharCode(b)
    else if (b < 32 || b > 126) out += '\\' + b.toString(8).padStart(3, '0')
    else out += String.fromCharCode(b)
  }
  return `(${out})`
}

export function erzeugeTabellenPdf(b: PdfBericht): Uint8Array {
  const gesamt = b.spalten.reduce((n, s) => n + s.breite, 0)
  const faktor = Math.min(1, (PAGE_W - 2 * MARGIN) / gesamt)
  const spalten = b.spalten.map(s => ({ ...s, breite: s.breite * faktor }))
  const erstellt = new Intl.DateTimeFormat('de-AT', { timeZone: 'Europe/Vienna', dateStyle: 'medium', timeStyle: 'short' }).format(new Date())

  // Seiten-Inhalte (Content-Streams) aufbauen
  const seiten: string[] = []
  let ops: string[] = []
  let y = 0
  const text = (x: number, yy: number, s: string, size: number, fett = false, farbe = '0 0 0') => {
    ops.push(`BT /${fett ? 'F2' : 'F1'} ${size} Tf ${farbe} rg ${x.toFixed(2)} ${yy.toFixed(2)} Td ${lit(s)} Tj ET`)
  }
  const linie = (yy: number, grau = 0.8) => ops.push(`${grau} G 0.5 w ${MARGIN} ${yy.toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${yy.toFixed(2)} l S`)

  const kopf = (seite: number) => {
    ops = []
    y = PAGE_H - MARGIN
    // Kopfleiste (Dunkelblau) mit grünem Balken – CD der Gemeinde
    ops.push(`0 0.294 0.447 rg 0 ${(PAGE_H - 34).toFixed(2)} ${PAGE_W} 34 re f`)
    ops.push(`0.659 0.788 0.349 rg 0 ${(PAGE_H - 38).toFixed(2)} ${PAGE_W} 4 re f`)
    text(MARGIN, PAGE_H - 22, 'SITZUNGSUNTERLAGEN · MARKTGEMEINDE GUMPOLDSKIRCHEN', 9, true, '1 1 1')
    text(PAGE_W - MARGIN - breite(`Seite ${seite}`, 9), PAGE_H - 22, `Seite ${seite}`, 9, false, '1 1 1')
    y = PAGE_H - 62
    text(MARGIN, y, b.titel, TITLE, true, '0 0.294 0.447'); y -= 16
    if (b.untertitel) { text(MARGIN, y, b.untertitel, 10, false, '0.35 0.4 0.46'); y -= 14 }
    if (b.hinweis) { text(MARGIN, y, kuerzen(b.hinweis, PAGE_W - 2 * MARGIN, 8.5), 8.5, false, '0.35 0.4 0.46'); y -= 12 }
    y -= 6
    // Spaltenköpfe
    let x = MARGIN
    for (const s of spalten) { text(x + 2, y - 10, s.label.toUpperCase(), HEAD, true, '0.35 0.4 0.46'); x += s.breite }
    y -= LINE; linie(y, 0.6); y -= 4
  }
  const fuss = () => {
    linie(MARGIN - 6, 0.8)
    text(MARGIN, MARGIN - 18, b.fusszeile ?? `Erstellt am ${erstellt} · ${b.zeilen.length} Einträge`, 8, false, '0.5 0.5 0.5')
    seiten.push(ops.join('\n'))
  }

  let seite = 1
  kopf(seite)
  if (b.zeilen.length === 0) text(MARGIN + 2, y - 10, 'Keine Einträge für diese Auswahl.', FONT, false, '0.5 0.5 0.5')
  b.zeilen.forEach((zeile, i) => {
    if (y - LINE < MARGIN + 10) { fuss(); seite++; kopf(seite) }
    if (i % 2 === 1) ops.push(`0.957 0.965 0.973 rg ${MARGIN} ${(y - LINE + 3).toFixed(2)} ${(PAGE_W - 2 * MARGIN).toFixed(2)} ${LINE} re f`)
    let x = MARGIN
    zeile.forEach((z, k) => { const s = spalten[k]; if (s) { text(x + 2, y - 10, kuerzen(z ?? '', s.breite - 4, FONT), FONT); x += s.breite } })
    y -= LINE
  })
  fuss()

  // PDF-Objekte zusammensetzen
  const objs: string[] = []
  const add = (s: string) => { objs.push(s); return objs.length }
  const fontN = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const fontB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const pagesN = objs.length + 1 + seiten.length * 2   // Nummer des Pages-Objekts (nach allen Seiten)
  const pageIds: number[] = []
  for (const inhalt of seiten) {
    const len = Buffer.byteLength(inhalt, 'latin1')
    const c = add(`<< /Length ${len} >>\nstream\n${inhalt}\nendstream`)
    const p = add(`<< /Type /Page /Parent ${pagesN} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${c} 0 R /Resources << /Font << /F1 ${fontN} 0 R /F2 ${fontB} 0 R >> >> >>`)
    pageIds.push(p)
  }
  add(`<< /Type /Pages /Kids [${pageIds.map(i => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)
  const catalog = add(`<< /Type /Catalog /Pages ${pagesN} 0 R >>`)
  const info = add(`<< /Title ${lit(b.titel)} /Producer (Sitzungsunterlagen Gumpoldskirchen) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z) >>`)

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new Uint8Array(Buffer.from(out, 'latin1'))
}

/** CSV mit Semikolon (Excel im deutschsprachigen Raum) und BOM */
export function erzeugeCsv(spalten: string[], zeilen: string[][]) {
  const z = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`
  return '﻿' + [spalten.map(z).join(';'), ...zeilen.map(r => r.map(z).join(';'))].join('\r\n')
}
