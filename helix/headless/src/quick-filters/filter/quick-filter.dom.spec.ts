import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

test('a preset reads only the parts of the view its JSON names', async () => {
  const element = (await mount(
    `<helix-headless-quick-filter view='{"sort":"a:asc","columns":{"hidden":["b"]}}'>A</helix-headless-quick-filter>`,
  )) as HTMLElement & { view: unknown }
  expect(element.view).toEqual({ columns: { hidden: ['b'] }, sort: 'a:asc' })
})
