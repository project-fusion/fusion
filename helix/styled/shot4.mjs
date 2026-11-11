import { chromium } from '/Users/ross.sheppard/Development/fusion-next/.claude/worktrees/data-table-tools/node_modules/playwright-core/index.mjs'

const b = await chromium.launch()
const p = await b.newPage({ deviceScaleFactor: 2, viewport: { height: 240, width: 820 } })
await p.goto('http://localhost:4391/page2.html')
await p.evaluate(() => window.ready)
await p.waitForTimeout(600)
for (const [name, col] of [
  ['date', 4],
  ['owner', 1],
  ['amount', 3],
]) {
  const h = await p.evaluateHandle(
    (c) =>
      document
        .getElementById('t')
        .shadowRoot.querySelector(`[data-row="1"] > [data-column="${c}"] [part=editor]`),
    col,
  )
  await h.asElement().click()
  await p.waitForTimeout(500)
  const m = await p.evaluate((c) => {
    const e = document
      .getElementById('t')
      .shadowRoot.querySelector(`[data-row="1"] > [data-column="${c}"] [part=editor]`)
    const f = e.shadowRoot.querySelector('[part=field]')
    const r = f.getBoundingClientRect()
    const cs = getComputedStyle(f)
    return {
      border: cs.borderTopWidth,
      h: r.height,
      outline: cs.outlineStyle,
      shadow: cs.boxShadow.slice(0, 60),
      w: r.width | 0,
    }
  }, col)
  console.log(name, JSON.stringify(m))
  await p.screenshot({ clip: { height: 100, width: 820, x: 0, y: 100 }, path: `act-${name}.png` })
}
await b.close()
