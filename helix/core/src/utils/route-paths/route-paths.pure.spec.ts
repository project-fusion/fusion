import { describe, expect, test } from 'bun:test'
import { currentOf, routeOf, routesTo, trailOf, withBase, withoutBase } from './route-paths.js'

describe('routeOf', () => {
  test('keeps one leading slash and drops a trailing one, the query, and the fragment', () => {
    expect(routeOf('/projects/')).toBe('/projects')
    expect(routeOf('projects')).toBe('/projects')
    expect(routeOf('/projects?sort=due#top')).toBe('/projects')
    expect(routeOf('/')).toBe('/')
    expect(routeOf('')).toBe('/')
  })
})

describe('currentOf', () => {
  test('is `page` for the route showing and `true` for a route above it', () => {
    expect(currentOf('/projects', '/projects')).toBe('page')
    expect(currentOf('/projects', '/projects/website/activity')).toBe('true')
    expect(currentOf('/projects/website', '/projects/website/')).toBe('page')
  })

  test('is nothing for a sibling, a route that only starts with the same letters, or the root above a page', () => {
    expect(currentOf('/activity', '/projects')).toBeUndefined()
    expect(currentOf('/project', '/projects')).toBeUndefined()
    expect(currentOf('/', '/projects')).toBeUndefined()
    expect(currentOf('/', '/')).toBe('page')
  })
})

describe('trailOf', () => {
  test('names each route down to the page, with the last one current', () => {
    expect(routesTo('/projects/website/activity')).toEqual([
      '/',
      '/projects',
      '/projects/website',
      '/projects/website/activity',
    ])
    const labels: Record<string, string> = {
      '/projects': 'Projects',
      '/projects/website': 'Website redesign',
      '/projects/website/activity': 'Activity',
    }
    expect(trailOf('/projects/website/activity', (route) => labels[route])).toEqual([
      { current: false, label: 'Projects', path: '/projects' },
      { current: false, label: 'Website redesign', path: '/projects/website' },
      { current: true, label: 'Activity', path: '/projects/website/activity' },
    ])
  })

  test('leaves out a route its labels leave unnamed', () => {
    expect(trailOf('/projects/website', (route) => (route === '/' ? undefined : route))).toEqual([
      { current: false, label: '/projects', path: '/projects' },
      { current: true, label: '/projects/website', path: '/projects/website' },
    ])
  })
})

describe('withBase and withoutBase', () => {
  test('put a route under the base URL and take it out again', () => {
    expect(withBase('/helix/app/proof', '/projects')).toBe('/helix/app/proof/projects')
    expect(withBase('/helix/app/proof/', '/')).toBe('/helix/app/proof/')
    expect(withBase(undefined, '/projects')).toBe('/projects')
    expect(withBase('', 'projects')).toBe('/projects')
    expect(withoutBase('/helix/app/proof', '/helix/app/proof/projects?sort=due')).toBe(
      '/projects?sort=due',
    )
    expect(withoutBase('/helix/app/proof', '/helix/app/proof')).toBe('/')
    expect(withoutBase('/helix/app/proof', '/helix/app/proof#top')).toBe('/#top')
    expect(withoutBase(undefined, '/projects')).toBe('/projects')
  })

  test('name no route for an address outside the base URL', () => {
    expect(withoutBase('/helix/app/proof', '/helix/app/proofs')).toBeUndefined()
    expect(withoutBase('/helix/app/proof', '/pricing')).toBeUndefined()
  })
})
