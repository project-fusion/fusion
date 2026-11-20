/**
 * The browser harness scopes its hooks the way `bun:test` does.
 *
 * Each case registers a small suite with the harness, claims it, runs it, and
 * reads what the hooks logged. A hook that ran outside its block shows up in
 * the log of a test it should never have touched.
 */
import { describe, expect, test } from 'bun:test'
import * as harness from './browser.js'

/** Runs everything registered with the harness since the last run. */
const run = (): Promise<harness.SpecResult[]> => harness.claim()()

describe('browser harness hooks', () => {
  test('a beforeEach in one block does not run for a sibling block', async () => {
    const seen: string[] = []
    let faked = false
    harness.describe('fakes the clock', () => {
      harness.beforeEach(() => {
        faked = true
      })
      harness.afterEach(() => {
        faked = false
      })
      harness.test('sees the fake', () => {
        seen.push(`first: ${faked}`)
      })
    })
    harness.describe('keeps the real clock', () => {
      harness.test('sees no fake', () => {
        seen.push(`second: ${faked}`)
      })
    })
    await run()
    expect(seen).toEqual(['first: true', 'second: false'])
  })

  test('an afterEach in one block does not run for a sibling block', async () => {
    const log: string[] = []
    harness.describe('one', () => {
      harness.afterEach(() => {
        log.push('after one')
      })
      harness.test('a', () => {
        log.push('a')
      })
    })
    harness.describe('two', () => {
      harness.test('b', () => {
        log.push('b')
      })
    })
    await run()
    expect(log).toEqual(['a', 'after one', 'b'])
  })

  test('a block nested inside a block runs the outer hooks, outer first', async () => {
    const log: string[] = []
    harness.describe('outer', () => {
      harness.beforeEach(() => {
        log.push('outer')
      })
      harness.describe('inner', () => {
        harness.beforeEach(() => {
          log.push('inner')
        })
        harness.test('nested', () => {
          log.push('test')
        })
      })
    })
    await run()
    expect(log).toEqual(['outer', 'inner', 'test'])
  })

  test('a beforeAll runs once, before the first test of its own block only', async () => {
    const log: string[] = []
    harness.describe('earlier', () => {
      harness.test('runs first', () => {
        log.push('earlier test')
      })
    })
    harness.describe('later', () => {
      harness.beforeAll(() => {
        log.push('before all')
      })
      harness.test('one', () => {
        log.push('one')
      })
      harness.test('two', () => {
        log.push('two')
      })
    })
    harness.describe('empty', () => {
      harness.beforeAll(() => {
        log.push('never')
      })
    })
    await run()
    expect(log).toEqual(['earlier test', 'before all', 'one', 'two'])
  })

  test('an afterAll runs after the last test of its block, inner block first', async () => {
    const log: string[] = []
    harness.describe('outer', () => {
      harness.afterAll(() => {
        log.push('after outer')
      })
      harness.describe('inner', () => {
        harness.afterAll(() => {
          log.push('after inner')
        })
        harness.test('a', () => {
          log.push('a')
        })
        harness.test('b', () => {
          log.push('b')
        })
      })
    })
    harness.describe('sibling', () => {
      harness.test('c', () => {
        log.push('c')
      })
    })
    await run()
    expect(log).toEqual(['a', 'b', 'after inner', 'after outer', 'c'])
  })

  test('a beforeAll that throws fails the tests of its block and no others', async () => {
    harness.describe('broken', () => {
      harness.beforeAll(() => {
        throw new Error('no clock')
      })
      harness.test('one', () => {})
      harness.test('two', () => {})
    })
    harness.describe('fine', () => {
      harness.test('three', () => {})
    })
    const results = await run()
    expect(results.map(({ error, name }) => [name, error])).toEqual([
      ['one', 'a beforeAll hook threw: no clock'],
      ['two', 'a beforeAll hook threw: no clock'],
      ['three', undefined],
    ])
  })

  test('a hook at the top level of one spec file does not run for the next file', async () => {
    const log: string[] = []
    harness.enterFile()
    harness.beforeEach(() => {
      log.push('first file hook')
    })
    harness.test('in the first file', () => {
      log.push('first')
    })
    harness.enterFile()
    harness.test('in the second file', () => {
      log.push('second')
    })
    await run()
    expect(log).toEqual(['first file hook', 'first', 'second'])
  })
})
