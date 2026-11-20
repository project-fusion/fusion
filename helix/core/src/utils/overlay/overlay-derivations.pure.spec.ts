import { describe, expect, test } from 'bun:test'
import {
  dialogDismissal,
  dialogDismissName,
  dialogName,
  dialogSaid,
  drawerDismissal,
  drawerEdge,
  drawerName,
} from './overlay-derivations.js'

describe('how a reader may dismiss a dialog or a drawer', () => {
  test('a dialog closes on a press on its scrim where it names nothing, and on nothing where it is persistent', () => {
    expect(dialogDismissal({})).toBe('any')
    expect(dialogDismissal({ closedby: 'closerequest' })).toBe('closerequest')
    expect(dialogDismissal({ closedby: 'any', persistent: true })).toBe('none')
  })

  test('a drawer that is not modal closes on a close request alone where it names nothing', () => {
    expect(drawerDismissal({})).toBe('any')
    expect(drawerDismissal({ modal: false })).toBe('closerequest')
    expect(drawerDismissal({ modal: 'false' })).toBe('closerequest')
    expect(drawerDismissal({ closedby: 'any', modal: false })).toBe('any')
    expect(drawerDismissal({ persistent: true })).toBe('none')
  })
})

describe('what a dialog or a drawer is called', () => {
  test('is its label, then its title, then its fallback', () => {
    expect(dialogName({ header: 'Delete project', label: 'Remove' })).toBe('Remove')
    expect(dialogName({ header: 'Delete project', label: '' })).toBe('Delete project')
    expect(dialogName({})).toBe('Dialog')
    expect(drawerName({ 'fallback-label': 'Seitenleiste' })).toBe('Seitenleiste')
  })

  test('a phone says an alert dialog’s words with its name as it opens', () => {
    expect(dialogSaid({ label: 'Delete project' })).toBe('Delete project')
    expect(
      dialogSaid({ alert: true, default: 'It cannot be undone.', label: 'Delete project' }),
    ).toBe('Delete project. It cannot be undone.')
  })

  test('a close control is named by `dismiss-label`, Close where it names none', () => {
    expect(dialogDismissName({})).toBe('Close')
    expect(dialogDismissName({ 'dismiss-label': 'Schließen' })).toBe('Schließen')
  })

  test('a drawer comes from its placement, the end where it names none', () => {
    expect(drawerEdge({})).toBe('end')
    expect(drawerEdge({ placement: 'bottom' })).toBe('bottom')
  })
})
