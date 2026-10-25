import { afterEach, describe, expect, test } from 'bun:test'
import { fakeTimers } from './fake.js'
import { setTimers, timers } from './index.js'
import { serverTimers } from './server.js'

afterEach(() => {
  setTimers(serverTimers)
})

describe('timers', () => {
  test('is the server implementation until one is set', () => {
    expect(timers()).toBe(serverTimers)
  })

  test('calls the implementation set last', () => {
    const fake = fakeTimers()
    setTimers(fake)
    timers().timeout(300, () => undefined)
    expect(fake.asked).toEqual([300])
  })
})

describe('serverTimers', () => {
  test('reads zero from its clock and counts the page as in front', () => {
    expect(serverTimers.now()).toBe(0)
    expect(serverTimers.visible()).toBe(true)
  })

  test('calls back for nothing it starts, and stops each without an error', async () => {
    const heard: string[] = []
    const stops = [
      serverTimers.timeout(0, () => heard.push('timeout')),
      serverTimers.frame(() => heard.push('frame')),
      serverTimers.observeVisible(() => heard.push('visible')),
    ]
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(heard).toEqual([])
    for (const stop of stops) {
      expect(() => stop()).not.toThrow()
    }
  })
})

describe('fakeTimers', () => {
  test('starts its clock at zero and moves it only forward, on advance', () => {
    const fake = fakeTimers()
    expect(fake.now()).toBe(0)
    fake.advance(250)
    expect(fake.now()).toBe(250)
    fake.advance(-100)
    expect(fake.now()).toBe(250)
  })

  test('runs a timeout once its wait has passed, and not before', () => {
    const fake = fakeTimers()
    let ran = 0
    fake.timeout(1000, () => {
      ran += 1
    })
    fake.advance(999)
    expect(ran).toBe(0)
    fake.advance(1)
    expect(ran).toBe(1)
    fake.advance(5000)
    expect(ran).toBe(1)
  })

  test('runs the timeouts in the order they come due, with the clock at each one’s time', () => {
    const fake = fakeTimers()
    const ran: string[] = []
    for (const [name, ms] of [
      ['late', 300],
      ['soon', 100],
      ['middle', 200],
    ] as const) {
      fake.timeout(ms, () => ran.push(`${name} at ${fake.now()}`))
    }
    fake.advance(1000)
    expect(ran).toEqual(['soon at 100', 'middle at 200', 'late at 300'])
    expect(fake.now()).toBe(1000)
  })

  test('runs two timeouts due together in the order they were asked for', () => {
    const fake = fakeTimers()
    const ran: string[] = []
    fake.timeout(100, () => ran.push('first'))
    fake.timeout(100, () => ran.push('second'))
    fake.advance(100)
    expect(ran).toEqual(['first', 'second'])
  })

  test('runs a timeout started by another where it comes due inside the same advance', () => {
    const fake = fakeTimers()
    const ran: number[] = []
    fake.timeout(100, () => {
      ran.push(fake.now())
      fake.timeout(100, () => ran.push(fake.now()))
    })
    fake.advance(250)
    expect(ran).toEqual([100, 200])
  })

  test('never runs a stopped timeout, including one stopped by an earlier timeout', () => {
    const fake = fakeTimers()
    const ran: string[] = []
    fake.timeout(100, () => ran.push('stopped first'))()
    let stopLater = (): void => undefined
    fake.timeout(100, () => {
      ran.push('stopper')
      stopLater()
    })
    stopLater = fake.timeout(200, () => ran.push('stopped later'))
    fake.advance(1000)
    expect(ran).toEqual(['stopper'])
    expect(fake.pending().timeouts).toBe(0)
  })

  test('treats a wait below zero as no wait', () => {
    const fake = fakeTimers()
    let ran = 0
    fake.timeout(-50, () => {
      ran += 1
    })
    fake.advance(0)
    expect(ran).toBe(1)
  })

  test('throws where a timeout starts itself again with no wait, so the spec fails and does not hang', () => {
    const fake = fakeTimers()
    const again = (): void => {
      fake.timeout(0, again)
    }
    fake.timeout(0, again)
    expect(() => fake.advance(0)).toThrow('runs forever')
  })

  test('keeps the wait of each timeout asked for, in order', () => {
    const fake = fakeTimers()
    fake.timeout(300, () => undefined)
    fake.timeout(50, () => undefined)()
    expect(fake.asked).toEqual([300, 50])
  })

  test('runs each frame waiting with the frame’s time, and the clock’s time where none is given', () => {
    const fake = fakeTimers()
    const times: number[] = []
    fake.frame((time) => times.push(time))
    fake.runFrame(16)
    fake.advance(40)
    fake.frame((time) => times.push(time))
    fake.runFrame()
    expect(times).toEqual([16, 40])
  })

  test('leaves a frame asked for during a frame to the next one', () => {
    const fake = fakeTimers()
    const times: number[] = []
    const draw = (time: number): void => {
      times.push(time)
      fake.frame(draw)
    }
    fake.frame(draw)
    fake.runFrame(16)
    expect(times).toEqual([16])
    fake.runFrame(33)
    expect(times).toEqual([16, 33])
    expect(fake.pending().frames).toBe(1)
  })

  test('never runs a stopped frame, including one stopped by an earlier frame', () => {
    const fake = fakeTimers()
    const ran: string[] = []
    fake.frame(() => ran.push('stopped first'))()
    let stopLater = (): void => undefined
    fake.frame(() => {
      ran.push('stopper')
      stopLater()
    })
    stopLater = fake.frame(() => ran.push('stopped later'))
    fake.runFrame(16)
    expect(ran).toEqual(['stopper'])
    expect(fake.pending().frames).toBe(0)
  })

  test('advance runs no frame, and a frame runs no timeout', () => {
    const fake = fakeTimers()
    const ran: string[] = []
    fake.frame(() => ran.push('frame'))
    fake.timeout(0, () => ran.push('timeout'))
    fake.runFrame()
    expect(ran).toEqual(['frame'])
    fake.frame(() => ran.push('second frame'))
    fake.advance(0)
    expect(ran).toEqual(['frame', 'timeout'])
  })

  test('tells each observer when the page leaves the front and comes back, and only on a change', () => {
    const fake = fakeTimers()
    const heard: boolean[] = []
    fake.observeVisible((visible) => heard.push(visible))
    expect(fake.visible()).toBe(true)
    fake.setVisible(true)
    fake.setVisible(false)
    expect(fake.visible()).toBe(false)
    fake.setVisible(true)
    expect(heard).toEqual([false, true])
  })

  test('tells a stopped observer nothing', () => {
    const fake = fakeTimers()
    const heard: boolean[] = []
    const stop = fake.observeVisible((visible) => heard.push(visible))
    expect(fake.pending().observers).toBe(1)
    stop()
    fake.setVisible(false)
    expect(heard).toEqual([])
    expect(fake.pending().observers).toBe(0)
  })
})
