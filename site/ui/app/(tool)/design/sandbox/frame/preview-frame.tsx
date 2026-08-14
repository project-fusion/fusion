'use client'

import '@helix-io/styles/tokens.css'
import '@helix-io/styles/primitives.css'
import '@helix-io/styles/base.css'
import '@helix-io/web/elements.css'
import '@helix-io/web'
import { useEffect } from 'react'

interface RenderMessage {
  direction?: 'ltr' | 'rtl'
  layout?: 'padded' | 'centered' | 'fullscreen'
  origin?: string
  source?: string
  styles?: string
  type?: string
}

/**
 * Renders whatever the sandbox sends, and reports what the example says.
 *
 * The example owns this document: its markup replaces the body's contents and
 * its stylesheet is the only one after the base layer, so it can restyle
 * anything without reaching the sandbox around it.
 *
 * `console` is patched here rather than in the sandbox, which is the point of
 * the frame: this catches what the example itself logs, and nothing the page
 * around it does.
 */
export function PreviewFrame() {
  useEffect(() => {
    const host = document.getElementById('preview-root')
    if (!host) {
      return
    }

    // Answered at the origin the sandbox names in its render message. The
    // first `ready` has to go out wide, because until the sandbox has spoken
    // there is nothing here that knows where its parent is.
    let parentOrigin = '*'
    const post = (message: unknown) => window.parent?.postMessage(message, parentOrigin)

    const levels = ['log', 'info', 'warn', 'error'] as const
    const original = new Map<string, (...args: unknown[]) => void>()
    for (const level of levels) {
      original.set(level, console[level])
      console[level] = (...args: unknown[]) => {
        original.get(level)?.(...args)
        post({
          level,
          text: args.map((arg) => (typeof arg === 'string' ? arg : safeStringify(arg))).join(' '),
          type: 'helix-preview-console',
        })
      }
    }

    const onError = (event: ErrorEvent) => {
      post({ level: 'error', text: event.message, type: 'helix-preview-console' })
    }
    window.addEventListener('error', onError)

    const onMessage = (event: MessageEvent<RenderMessage>) => {
      if (event.data?.type !== 'helix-preview-render' || event.source !== window.parent) {
        return
      }
      const { direction = 'ltr', layout = 'padded', source = '', styles = '' } = event.data
      parentOrigin = event.data.origin ?? event.origin
      document.documentElement.dir = direction
      host.dataset.layout = layout
      host.innerHTML = source
      let sheet = document.getElementById('preview-styles')
      if (!sheet) {
        sheet = document.createElement('style')
        sheet.id = 'preview-styles'
        document.head.append(sheet)
      }
      sheet.textContent = styles
    }
    window.addEventListener('message', onMessage)

    post({ type: 'helix-preview-ready' })

    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('error', onError)
      for (const level of levels) {
        const restore = original.get(level)
        if (restore) {
          console[level] = restore
        }
      }
    }
  }, [])

  return <div id="preview-root" data-layout="padded" />
}

/** Stringifies a logged value without throwing on a cycle. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
