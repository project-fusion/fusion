/**
 * Writes a Data Table's export as an XLSX workbook, one sheet with the
 * headings in its first row.
 *
 * Its own entry, `@fusion.dev/helix/data-table/xlsx`, so a table that never
 * writes a spreadsheet does not carry it. Hand it to the table:
 *
 * ```js
 * import { toXlsx } from '@fusion.dev/helix/data-table/xlsx'
 * table.xlsx = toXlsx
 * ```
 *
 * The workbook is the smallest a spreadsheet opens: the parts the format
 * requires, stored in a ZIP without compression, with text written in place
 * and numbers kept as numbers. Text a spreadsheet would run as a formula is
 * kept as text, the way the CSV writer keeps it.
 */

import type { ExportData } from '../export.js'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

/** The CRC-32 a ZIP entry carries. */
export const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** Files stored in a ZIP, without compression, which every reader opens. */
export const zip = (files: readonly { name: string; text: string }[]): Uint8Array => {
  const encoder = new TextEncoder()
  const local: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = encoder.encode(file.text)
    const crc = crc32(data)
    const head = new DataView(new ArrayBuffer(30))
    head.setUint32(0, 0x04034b50, true)
    head.setUint16(4, 20, true)
    head.setUint16(6, 0x0800, true)
    head.setUint32(14, crc, true)
    head.setUint32(18, data.length, true)
    head.setUint32(22, data.length, true)
    head.setUint16(26, name.length, true)
    local.push(new Uint8Array(head.buffer), name, data)
    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, data.length, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true)
    central.push(new Uint8Array(entry.buffer), name)
    offset += 30 + name.length + data.length
  }
  const size = central.reduce((sum, part) => sum + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, size, true)
  end.setUint32(16, offset, true)
  const parts = [...local, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

const xmlText = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    // biome-ignore lint/suspicious/noControlCharactersInRegex: the characters XML 1.0 cannot hold
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')

/** A column's letters, from 0: A, B, … Z, AA. */
const columnName = (index: number): string => {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

const cell = (value: unknown, ref: string): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`
  }
  if (value === undefined || value === null || value === '') {
    return ''
  }
  const text = value instanceof Date ? value.toISOString() : String(value)
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlText(text)}</t></is></c>`
}

/** Writes an export as an XLSX workbook. */
export const toXlsx = (data: ExportData): Uint8Array => {
  const lines = [data.headings, ...data.rows].map(
    (values, row) =>
      `<row r="${row + 1}">${values.map((value, column) => cell(value, `${columnName(column)}${row + 1}`)).join('')}</row>`,
  )
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const relations = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  return zip([
    {
      name: '[Content_Types].xml',
      text: `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      text: `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relations}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      text: `${xml}<workbook xmlns="${main}" xmlns:r="${relations}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      text: `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relations}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      text: `${xml}<worksheet xmlns="${main}"><sheetData>${lines.join('')}</sheetData></worksheet>`,
    },
  ])
}
