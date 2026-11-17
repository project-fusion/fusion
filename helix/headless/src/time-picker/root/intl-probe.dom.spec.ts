import '@fusion.dev/helix-testing/dom/register'
import { expect, test } from 'bun:test'

/* A throwaway probe, to be removed before merging: what this engine's `Intl`
   gives for Korean, so the time picker's failure in WebKit on ubuntu-26.04 can
   be read as the engine's locale data or the picker's code. It fails on
   purpose, so the runner prints what it found. */

test('intl probe: what this engine says for ko-KR', () => {
  const at = new Date(Date.UTC(1970, 0, 1, 21, 5))
  const parts = (locale: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options })
      .formatToParts(at)
      .map((part) => `${part.type}=${part.value}`)
      .join('|')
  const found = {
    arabic: new Intl.NumberFormat('ar-EG').format(123),
    dayPeriod: parts('ko-KR', { hour: 'numeric', hour12: true }),
    displayName: new Intl.DisplayNames(['ko-KR'], { type: 'language' }).of('en'),
    german: new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', weekday: 'long' }).format(at),
    japanese: parts('ja-JP', { hour: 'numeric', hour12: true }),
    month: new Intl.DateTimeFormat('ko-KR', { month: 'long', timeZone: 'UTC' }).format(at),
    navigator: navigator.language,
    resolved: new Intl.DateTimeFormat('ko-KR').resolvedOptions().locale,
    short: new Intl.DateTimeFormat('ko-KR', { timeStyle: 'short', timeZone: 'UTC' }).format(at),
    supported: Intl.DateTimeFormat.supportedLocalesOf(['ko-KR', 'ko', 'ja-JP', 'de-DE', 'ar-EG']),
    weekday: new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', weekday: 'long' }).format(at),
  }
  expect(JSON.stringify(found)).toBe('see the values in this failure')
})
