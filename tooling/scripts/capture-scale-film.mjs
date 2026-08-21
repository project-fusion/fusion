#!/usr/bin/env node
/**
 * Captures the scale vision film to a file.
 *
 * The piece is a timed sequence of original plates. This asks the theater
 * route for each frame by timestamp so the encode is deterministic.
 *
 * Requires the site running at http://localhost:3000 (not 127.0.0.1: Next's
 * dev server 403s CORS module loads from that origin). Uses Playwright's
 * bundled ffmpeg, which encodes VP8, so the file is WebM.
 *
 *   bun tooling/scripts/capture-scale-film.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../..')
const outDir = resolve(root, 'site/ui/public/media')
const origin = 'http://localhost:3000'
const webm = resolve(outDir, 'sovereignty.webm')
const poster = resolve(outDir, 'sovereignty.jpg')

const findFfmpeg = () => {
  const cache = resolve(homedir(), 'Library/Caches/ms-playwright')
  if (!existsSync(cache)) {
    return 'ffmpeg'
  }
  const dir = readdirSync(cache).find((name) => name.startsWith('ffmpeg-'))
  if (!dir) {
    return 'ffmpeg'
  }
  const mac = resolve(cache, dir, 'ffmpeg-mac')
  return existsSync(mac) ? mac : 'ffmpeg'
}

const ffmpegBin = findFfmpeg()
if (ffmpegBin === 'ffmpeg') {
  const probe = spawn('ffmpeg', ['-version'])
  const missing = await new Promise((done) => {
    probe.on('error', () => done(true))
    probe.on('close', (code) => done(code !== 0))
  })
  if (missing) {
    console.error('capture-scale-film: ffmpeg is not available.')
    process.exit(1)
  }
}

await mkdir(outDir, { recursive: true })

const browser = await chromium
  .launch({
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle'],
    channel: 'chrome',
  })
  .catch(() =>
    chromium.launch({
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle'],
    }),
  )
const page = await browser.newPage({
  deviceScaleFactor: 1,
  viewport: { height: 1080, width: 1920 },
})

await page.emulateMedia({ reducedMotion: 'no-preference' })
await page.goto(`${origin}/preview/scale/film?capture=1`, { waitUntil: 'networkidle' })
await page.addStyleTag({
  content:
    'nextjs-portal, [data-next-badge-root], [data-nextjs-dev-indicator] { display: none !important; }',
})
await page.evaluate(() => document.fonts.ready)
await page.waitForFunction(() => window.__fusionFilm?.ready === true, null, { timeout: 60_000 })

const filmLayer = await page.locator('[data-film]').count()
if (filmLayer === 0) {
  console.warn('capture-scale-film: the theater canvas did not start.')
}

const film = await page.evaluate(() => ({
  duration: window.__fusionFilm?.duration ?? 30,
  fps: window.__fusionFilm?.fps ?? 24,
}))

const frames = Math.round(film.duration * film.fps)
console.log(`capture-scale-film: ${frames} frames at ${film.fps} fps, ${film.duration}s.`)

const ffmpeg = spawn(
  ffmpegBin,
  [
    '-y',
    '-f',
    'image2pipe',
    '-vcodec',
    'mjpeg',
    '-framerate',
    String(film.fps),
    '-i',
    'pipe:0',
    '-c:v',
    'libvpx',
    '-b:v',
    '8M',
    '-cpu-used',
    '1',
    '-deadline',
    'good',
    '-pix_fmt',
    'yuv420p',
    webm,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
)

ffmpeg.on('error', (error) => {
  console.error('capture-scale-film: ffmpeg spawn failed.', error)
  process.exit(1)
})
let ffmpegFailed = false
ffmpeg.on('close', (code) => {
  if (code !== 0 && code !== null) {
    ffmpegFailed = true
  }
})

for (let i = 0; i < frames; i += 1) {
  if (ffmpegFailed || !ffmpeg.stdin) {
    console.error('capture-scale-film: ffmpeg died mid-capture.')
    process.exit(1)
  }
  const time = i / film.fps
  await page.evaluate(async (stamp) => {
    await window.__fusionFilm?.seek(stamp)
  }, time)
  const shot = await page.screenshot({ quality: 92, type: 'jpeg' })
  const ok = ffmpeg.stdin.write(shot)
  if (!ok) {
    await new Promise((done) => ffmpeg.stdin.once('drain', done))
  }
  if (i === Math.round(5.4 * film.fps)) {
    await page.screenshot({ path: poster, quality: 92, type: 'jpeg' })
  }
  if (i % film.fps === 0) {
    console.log(`capture-scale-film: ${i / film.fps}s`)
  }
}

ffmpeg.stdin.end()
const encoded = await new Promise((done) => {
  ffmpeg.on('close', (code) => done(code ?? 1))
})
await browser.close()

if (encoded !== 0) {
  console.error('capture-scale-film: ffmpeg failed.')
  process.exit(1)
}

console.log(`capture-scale-film: wrote ${webm}`)
console.log(`capture-scale-film: wrote ${poster}`)
