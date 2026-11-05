import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import onASurfaceStyles from '../.examples/on-a-surface.css' with { type: 'text' }
import onASurface from '../.examples/on-a-surface.html' with { type: 'text' }

/* The gap between one avatar and the next. It was a ring in the page color, a
   halo on any other surface; it is a cutout now, which shows the surface the
   group sits on. What a mask computes to, and where the boxes land, only a
   browser says, so run these with `bun run specs:browser avatar`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Group = HTMLElement & Updatable

const panel = async (): Promise<Group> => {
  await example(onASurface, onASurfaceStyles)
  const group = document.querySelector('helix-avatar-group') as Group
  await settle(group)
  for (const avatar of group.querySelectorAll('helix-avatar')) {
    await settle(avatar as Updatable)
  }
  return group
}

const avatars = (group: Group): HTMLElement[] => [
  ...group.querySelectorAll<HTMLElement>('helix-avatar'),
]

describe('an avatar group on a surface', () => {
  geometry('cuts the gap out of every avatar shown before another, and paints none', async () => {
    const group = await panel()
    const [first, second, third, fourth] = avatars(group)
    for (const avatar of [first, second, third] as HTMLElement[]) {
      expect(getComputedStyle(avatar).maskImage).toContain('radial-gradient')
      expect(getComputedStyle(avatar).boxShadow).toContain('rgba(0, 0, 0, 0)')
    }
    expect((fourth as HTMLElement).hidden).toBe(true)
    expect(getComputedStyle(avatars(group).at(-1) as HTMLElement).maskImage).toBe('none')
  })

  geometry('the count is the avatars’ size, so it fits the cutout before it', async () => {
    const group = await panel()
    const count = part(group, 'overflow') as HTMLElement
    const avatar = (avatars(group)[0] as HTMLElement).getBoundingClientRect()
    expect(count.getBoundingClientRect().width).toBe(avatar.width)
    expect(count.getBoundingClientRect().height).toBe(avatar.height)
  })

  geometry('the group is no taller than the avatars, so nothing draws past them', async () => {
    const group = await panel()
    const avatar = (avatars(group)[0] as HTMLElement).getBoundingClientRect()
    expect(group.getBoundingClientRect().height).toBe(avatar.height)
  })

  geometry('a ring color fills the gap where a page asks for one', async () => {
    const group = await panel()
    group.style.setProperty('--avatar-group-ring-color', 'rgb(1, 2, 3)')
    expect(getComputedStyle(avatars(group)[0] as HTMLElement).boxShadow).toContain('rgb(1, 2, 3)')
    expect(getComputedStyle(part(group, 'overflow') as HTMLElement).boxShadow).toContain(
      'rgb(1, 2, 3)',
    )
  })

  /* The count's fill is the sunken surface, the panel's own color here, so
     what keeps it a circle is its edge. */
  geometry('the count keeps an edge on a panel the color of its fill', async () => {
    const group = await panel()
    const count = getComputedStyle(part(group, 'overflow') as HTMLElement)
    const surface = getComputedStyle(document.querySelector('.panel') as HTMLElement)
    expect(count.backgroundColor).toBe(surface.backgroundColor)
    const probe = document.createElement('i')
    probe.style.color = 'var(--helix-color-border)'
    document.body.append(probe)
    const edge = getComputedStyle(probe).color
    probe.remove()
    expect(edge).not.toBe(surface.backgroundColor)
    expect(count.boxShadow).toContain('inset')
    expect(count.boxShadow).toContain(edge)
    group.style.setProperty('--avatar-group-overflow-border-color', 'rgb(7, 8, 9)')
    expect(getComputedStyle(part(group, 'overflow') as HTMLElement).boxShadow).toContain(
      'rgb(7, 8, 9)',
    )
  })

  geometry('the cutout is on the other side of each avatar right to left', async () => {
    const group = await panel()
    const ltr = getComputedStyle(avatars(group)[0] as HTMLElement).maskImage
    group.setAttribute('dir', 'rtl')
    const rtl = getComputedStyle(avatars(group)[0] as HTMLElement).maskImage
    expect(rtl).not.toBe(ltr)
  })
})
