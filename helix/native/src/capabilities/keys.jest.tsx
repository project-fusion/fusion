import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import type { HostInstance } from 'react-native'
import * as focusVisible from './focus-visible'
import { type KeysModule, keysThrough, type NativePress, nativeKeys } from './keys'

/** The modifiers held with a press, and whether it repeats. Each one left out is `false`. */
type Held = Partial<Pick<NativePress, 'alt' | 'control' | 'meta' | 'repeat' | 'shift'>>

/**
 * A stand-in for the native module. It sends a press as the module does: only
 * where a watched tag is in the press's path or something watches anywhere,
 * and it keeps each answer.
 */
const fakeModule = () => {
  const listeners = new Set<(press: NativePress) => void>()
  const watched = new Set<number>()
  const answers = new Map<number, boolean>()
  const expired = new Set<number>()
  const state = { anywhere: false, next: 0 }
  const module: KeysModule = {
    addListener: (_event, listener) => {
      listeners.add(listener)
      return {
        remove: () => {
          listeners.delete(listener)
        },
      }
    },
    answer: (id, taken) => {
      answers.set(id, taken)
    },
    claim: (id) => !expired.has(id),
    unwatch: (tag) => {
      watched.delete(tag)
    },
    watch: (tag) => {
      watched.add(tag)
    },
    watchAnywhere: (watching) => {
      state.anywhere = watching
    },
  }
  return {
    answers,
    /** Gives the next press to the platform before JavaScript claims it, as a module that waited too long does. */
    expireNext: () => {
      expired.add(state.next + 1)
    },
    listeners,
    module,
    /**
     * Presses `key` while the views in `path` have focus, nearest first, and
     * returns the answer: `undefined` where the module sent nothing or nothing answered.
     */
    press: (key: string, path: readonly number[], held: Held = {}): boolean | undefined => {
      state.next += 1
      const id = state.next
      if (!state.anywhere && !path.some((tag) => watched.has(tag))) {
        return undefined
      }
      const press: NativePress = {
        alt: false,
        control: false,
        meta: false,
        repeat: false,
        shift: false,
        ...held,
        id,
        key,
        path,
      }
      for (const listener of [...listeners]) {
        listener(press)
      }
      return answers.get(id)
    },
    state,
    watched,
  }
}

/** Parts as a spec stands them in, each with the tag of the view it draws. */
const parts = { inner: 21, list: 20, other: 30 } as const
type Part = keyof typeof parts

const node = (name: Part) => name as unknown as HostInstance
const tagFor = (one: HostInstance): number | null => parts[one as unknown as Part] ?? null

/** Keys over a fresh fake module. */
const setUp = () => {
  const fake = fakeModule()
  return { fake, keys: keysThrough(fake.module, tagFor) }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('keysThrough', () => {
  test('hands a listener each key pressed while its node has focus, with the modifiers held', () => {
    const { fake, keys } = setUp()
    const heard: KeyPress[] = []
    keys.listen(node('list'), (press) => {
      heard.push(press)
      return false
    })
    fake.press('ArrowDown', [parts.list], { alt: true, meta: true, repeat: true })
    fake.press('a', [parts.list], { control: true, shift: true })
    expect(heard).toEqual([
      {
        alt: true,
        claimed: false,
        control: false,
        key: 'ArrowDown',
        meta: true,
        repeat: true,
        shift: false,
      },
      {
        alt: false,
        claimed: false,
        control: true,
        key: 'a',
        meta: false,
        repeat: false,
        shift: true,
      },
    ])
  })

  test('turns the focus ring on once its listeners have heard a press', () => {
    const heardKey = jest.spyOn(focusVisible, 'heardKey')
    const { fake, keys } = setUp()
    let heardFirst = false
    keys.listen(node('list'), () => {
      heardFirst = heardKey.mock.calls.length === 0
      return false
    })
    fake.press('ArrowDown', [parts.list])
    expect([heardFirst, heardKey.mock.calls.length]).toEqual([true, 1])
    heardKey.mockRestore()
    focusVisible.heardTouch()
  })

  test('hears a key pressed while a view inside its node has focus', () => {
    const { fake, keys } = setUp()
    const heard: string[] = []
    keys.listen(node('list'), (press) => {
      heard.push(press.key)
      return false
    })
    fake.press('Enter', [parts.inner, parts.list])
    expect(heard).toEqual(['Enter'])
  })

  test('asks the module for no press made while another part has focus', () => {
    const { fake, keys } = setUp()
    let heard = 0
    keys.listen(node('list'), () => {
      heard += 1
      return true
    })
    expect(fake.press('Enter', [parts.other])).toBeUndefined()
    expect(fake.press('Enter', [])).toBeUndefined()
    expect(heard).toBe(0)
  })

  test('answers that a press is taken where a listener answers `true`, and only that press', () => {
    const { fake, keys } = setUp()
    keys.listen(node('list'), (press) => press.key === 'ArrowDown')
    expect(fake.press('ArrowDown', [parts.list])).toBe(true)
    expect(fake.press('Tab', [parts.list])).toBe(false)
  })

  test('hands a press to the nearer listener first, and a farther one hears it claimed', () => {
    const { fake, keys } = setUp()
    const heard: string[] = []
    keys.listen(node('list'), (press) => {
      heard.push(`list ${press.claimed}`)
      return false
    })
    keys.listen(node('inner'), (press) => {
      heard.push(`inner ${press.claimed}`)
      return true
    })
    expect(fake.press('ArrowDown', [parts.inner, parts.list])).toBe(true)
    expect(heard).toEqual(['inner false', 'list true'])
  })

  test('hands each listener on a node the press in the order it started listening', () => {
    const { fake, keys } = setUp()
    const heard: string[] = []
    keys.listen(node('list'), () => {
      heard.push('first')
      return true
    })
    keys.listen(node('list'), (press) => {
      heard.push(`second ${press.claimed}`)
      return false
    })
    expect(fake.press('Home', [parts.list])).toBe(true)
    expect(heard).toEqual(['first', 'second true'])
  })

  test('hears nothing on a node React Native draws no view for, and stops without an error', () => {
    const { fake, keys } = setUp()
    const stop = keys.listen('flattened' as unknown as HostInstance, () => true)
    expect(fake.watched.size).toBe(0)
    expect(fake.listeners.size).toBe(0)
    expect(() => stop()).not.toThrow()
  })

  test('sends the answer where a listener throws, as not taken', () => {
    const { fake, keys } = setUp()
    keys.listen(node('list'), () => {
      throw new Error('a listener failed')
    })
    expect(() => fake.press('Enter', [parts.list])).toThrow('a listener failed')
    expect([...fake.answers.values()]).toEqual([false])
  })

  test('hands no listener a press the module gave to the platform, and sends no answer', () => {
    const { fake, keys } = setUp()
    let heard = 0
    keys.listen(node('list'), () => {
      heard += 1
      return true
    })
    fake.expireNext()
    expect(fake.press('ArrowDown', [parts.list])).toBeUndefined()
    expect(heard).toBe(0)
    expect(fake.answers.size).toBe(0)
  })

  test('watches a tag while anything listens on it, and hears the module only while anything listens', () => {
    const { fake, keys } = setUp()
    const first = keys.listen(node('list'), () => false)
    const second = keys.listen(node('list'), () => false)
    expect([...fake.watched]).toEqual([parts.list])
    expect(fake.listeners.size).toBe(1)
    first()
    expect([...fake.watched]).toEqual([parts.list])
    second()
    second()
    expect(fake.watched.size).toBe(0)
    expect(fake.listeners.size).toBe(0)
  })

  test('hears nothing once stopped', () => {
    const { fake, keys } = setUp()
    let heard = 0
    const stop = keys.listen(node('list'), () => {
      heard += 1
      return true
    })
    stop()
    expect(fake.press('Enter', [parts.list])).toBeUndefined()
    expect(heard).toBe(0)
  })

  test('hands a listener stopped by an earlier one nothing of the press that stopped it', () => {
    const { fake, keys } = setUp()
    const heard: string[] = []
    let later = (): void => undefined
    keys.listen(node('list'), () => {
      heard.push('first')
      later()
      return false
    })
    later = keys.listen(node('list'), () => {
      heard.push('second')
      return false
    })
    fake.press('Escape', [parts.list])
    expect(heard).toEqual(['first'])
  })
})

describe('keysThrough anywhere', () => {
  test('hears a key pressed on another part before that part, and keeps a press it takes from it', () => {
    const { fake, keys } = setUp()
    const heard: string[] = []
    keys.listen(node('other'), (press) => {
      heard.push(`other ${press.key}`)
      return false
    })
    keys.listenAnywhere(node('list'), (press) => {
      heard.push(`anywhere ${press.key}`)
      return press.key === 'Escape'
    })
    expect(fake.press('Escape', [parts.other])).toBe(true)
    expect(fake.press('a', [parts.other])).toBe(false)
    expect(heard).toEqual(['anywhere Escape', 'anywhere a', 'other a'])
  })

  test('hears a key pressed while no view has focus', () => {
    const { fake, keys } = setUp()
    keys.listenAnywhere(node('list'), (press) => press.key === 'Escape')
    expect(fake.state.anywhere).toBe(true)
    expect(fake.press('Escape', [])).toBe(true)
  })

  test('stops watching anywhere once the last listener anywhere stops', () => {
    const { fake, keys } = setUp()
    const first = keys.listenAnywhere(node('list'), () => true)
    const second = keys.listenAnywhere(node('list'), () => true)
    first()
    expect(fake.state.anywhere).toBe(true)
    second()
    expect(fake.state.anywhere).toBe(false)
    expect(fake.listeners.size).toBe(0)
    expect(fake.press('Escape', [])).toBeUndefined()
  })
})

describe('nativeKeys', () => {
  test('hears nothing where the native module is missing, as in Expo Go and Jest, without an error', () => {
    const stop = nativeKeys.listen(node('list'), () => true)
    const anywhere = nativeKeys.listenAnywhere(node('list'), () => true)
    expect(() => stop()).not.toThrow()
    expect(() => anywhere()).not.toThrow()
  })

  test('loads the module `HelixKeys` through expo once, at the first listener', () => {
    const fake = fakeModule()
    const required = jest.fn((_name: string): KeysModule | null => fake.module)
    jest.doMock('expo', () => ({ requireOptionalNativeModule: required }))
    jest.doMock('react-native', () => ({ findNodeHandle: tagFor }))
    try {
      jest.isolateModules(() => {
        const isolated = require('./keys') as typeof import('./keys')
        expect(required).not.toHaveBeenCalled()
        isolated.nativeKeys.listen(node('list'), (press) => press.key === 'ArrowUp')
        isolated.nativeKeys.listenAnywhere(node('list'), () => false)
        expect(fake.press('ArrowUp', [parts.list])).toBe(true)
      })
      expect(required.mock.calls).toEqual([['HelixKeys']])
    } finally {
      jest.dontMock('expo')
      jest.dontMock('react-native')
    }
  })

  test('hears nothing where the app does not install expo', () => {
    const missing = jest.fn(() => {
      throw new Error("Cannot find module 'expo'")
    })
    jest.doMock('expo', missing)
    try {
      jest.isolateModules(() => {
        const isolated = require('./keys') as typeof import('./keys')
        expect(() => isolated.nativeKeys.listen(node('list'), () => true)()).not.toThrow()
      })
      expect(missing).toHaveBeenCalledTimes(1)
    } finally {
      jest.dontMock('expo')
    }
  })
})
