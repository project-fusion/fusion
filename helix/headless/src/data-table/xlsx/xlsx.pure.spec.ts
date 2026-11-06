import { expect, test } from 'bun:test'
import { crc32, toXlsx } from './index.js'

test('the CRC is the one ZIP readers check', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
})

test('a workbook is a ZIP holding the sheet, with text in place and numbers as numbers', () => {
  const bytes = toXlsx({ fields: ['a', 'b'], headings: ['Name', 'Amount'], rows: [['A & B', 12]] })
  expect(new DataView(bytes.buffer).getUint32(0, true)).toBe(0x04034b50)
  const text = new TextDecoder().decode(bytes)
  expect(text).toContain(
    '<c r="A2" t="inlineStr"><is><t xml:space="preserve">A &amp; B</t></is></c>',
  )
  expect(text).toContain('<c r="B2"><v>12</v></c>')
  expect(text).toContain('xl/worksheets/sheet1.xml')
})
