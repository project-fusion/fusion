/**
 * Builds the theme engine for phones, from `fusion-helix-native`, into the
 * places the native module reads it from. Nothing it writes is committed.
 *
 *   bun scripts/engine.mjs ios       an XCFramework and the Swift that calls it
 *   bun scripts/engine.mjs android   a shared library for each ABI and the Kotlin
 *
 * **iOS** takes the targets `aarch64-apple-ios`, `aarch64-apple-ios-sim`, and
 * `x86_64-apple-ios`, and Xcode. It writes `ios/theme/engine`: the static
 * library for devices and for both simulators in `HelixThemeFFI.xcframework`,
 * with the C header and module map UniFFI writes for it, and the Swift.
 *
 * **Android** takes the four Android targets and the NDK, found at
 * `ANDROID_NDK_HOME` or `ANDROID_NDK_ROOT`. It writes `android/src/engine`:
 * `libfusion_helix_native.so` under `jniLibs` for each ABI, and the Kotlin.
 *
 * A build of the app reads each from there: the `HelixTheme` pod takes the
 * engine where `ios/theme/engine` holds one, and the Gradle project where
 * `android/src/engine` does. Without them, the module builds with no engine,
 * and the theme draws the colors derived at build time.
 */
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = join(PACKAGE, '../..')
const CRATE = 'fusion-helix-native'
const LIBRARY = 'fusion_helix_native'
const FFI = 'HelixThemeFFI'

/* **The pod's deployment target**, so the library is built for the oldest iOS
   that `HelixTheme.podspec` takes, and the linker has no newer object to warn
   about. */
const IOS_FLOOR = '16.4'

/* **React Native's `minSdk`, 24**, which names the NDK's linker for each ABI.
   A library linked against a later API level fails to load on an older phone. */
const ANDROID_API = 24

/** Each Android ABI, by the Rust target that builds it and the NDK's name for its linker. */
const ABIS = [
  { abi: 'arm64-v8a', linker: 'aarch64-linux-android', target: 'aarch64-linux-android' },
  { abi: 'armeabi-v7a', linker: 'armv7a-linux-androideabi', target: 'armv7-linux-androideabi' },
  { abi: 'x86', linker: 'i686-linux-android', target: 'i686-linux-android' },
  { abi: 'x86_64', linker: 'x86_64-linux-android', target: 'x86_64-linux-android' },
]

const run = (command, args, env = {}) => {
  execFileSync(command, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: 'inherit' })
}

/** Builds the crate's library alone, as one crate type, for `target`. */
const library = (target, type, env = {}) => {
  run(
    'cargo',
    ['rustc', '-p', CRATE, '--lib', '--release', '--target', target, '--crate-type', type],
    env,
  )
  const file = join(
    ROOT,
    'target',
    target,
    'release',
    type === 'staticlib' ? `lib${LIBRARY}.a` : `lib${LIBRARY}.so`,
  )
  if (!existsSync(file)) {
    throw new Error(`engine: cargo reported success and wrote no ${file}`)
  }
  return file
}

/** Writes the bindings in `language` for the library at `built`, into a new directory. */
const bindings = (language, built) => {
  const out = mkdtempSync(join(tmpdir(), 'helix-engine-'))
  run('cargo', [
    'run',
    '-p',
    CRATE,
    '--features',
    'bindgen',
    '--bin',
    'uniffi-bindgen',
    '--',
    'generate',
    '--library',
    built,
    '--language',
    language,
    '--out-dir',
    out,
  ])
  return out
}

/** Empties `directory` and makes it again. */
const fresh = (directory) => {
  rmSync(directory, { force: true, recursive: true })
  mkdirSync(directory, { recursive: true })
}

const ios = () => {
  const env = { IPHONEOS_DEPLOYMENT_TARGET: IOS_FLOOR }
  const built = library('aarch64-apple-ios', 'staticlib', env)
  const simulators = ['aarch64-apple-ios-sim', 'x86_64-apple-ios'].map((target) =>
    library(target, 'staticlib', env),
  )
  const generated = bindings('swift', built)

  const work = mkdtempSync(join(tmpdir(), 'helix-engine-ios-'))
  const device = join(work, 'device', `lib${LIBRARY}.a`)
  const simulator = join(work, 'simulator', `lib${LIBRARY}.a`)
  mkdirSync(dirname(device))
  mkdirSync(dirname(simulator))
  copyFileSync(built, device)
  run('lipo', ['-create', ...simulators, '-output', simulator])
  /* **Without the debug information Rust's standard library ships with**,
     which is most of each archive: the device's was 6.40 MB with it and
     1.27 MB without, measured October 13, 2026. The symbols stay, so a crash
     report still names each function. */
  run('xcrun', ['strip', '-S', device, simulator])

  /* **The header and module map in a folder named for the module**, which
     Clang finds by that name under the search path the pod adds. Another
     XCFramework in the app with a `module.modulemap` at the top of its
     headers then cannot collide with this one. */
  const headers = join(work, 'Headers')
  mkdirSync(join(headers, FFI), { recursive: true })
  copyFileSync(join(generated, `${FFI}.h`), join(headers, FFI, `${FFI}.h`))
  copyFileSync(join(generated, `${FFI}.modulemap`), join(headers, FFI, 'module.modulemap'))

  const out = join(PACKAGE, 'ios/theme/engine')
  fresh(out)
  run('xcodebuild', [
    '-create-xcframework',
    '-library',
    device,
    '-headers',
    headers,
    '-library',
    simulator,
    '-headers',
    headers,
    '-output',
    join(out, `${FFI}.xcframework`),
  ])
  const swift = readdirSync(generated).filter((name) => name.endsWith('.swift'))
  for (const name of swift) {
    copyFileSync(join(generated, name), join(out, name))
  }
  rmSync(work, { force: true, recursive: true })
  rmSync(generated, { force: true, recursive: true })
  console.log(`engine: the iOS engine and ${swift.join(', ')} are in ios/theme/engine`)
}

const android = () => {
  const ndk = process.env.ANDROID_NDK_HOME ?? process.env.ANDROID_NDK_ROOT
  if (ndk === undefined || !existsSync(ndk)) {
    throw new Error('engine: Android needs the NDK. Set ANDROID_NDK_HOME to where it is installed.')
  }
  const prebuilt = join(ndk, 'toolchains/llvm/prebuilt')
  const host = readdirSync(prebuilt)[0]
  if (host === undefined) {
    throw new Error(`engine: ${prebuilt} holds no toolchain`)
  }
  const bin = join(prebuilt, host, 'bin')

  const out = join(PACKAGE, 'android/src/engine')
  fresh(out)
  let built
  for (const { abi, linker, target } of ABIS) {
    const variable = `CARGO_TARGET_${target.toUpperCase().replaceAll('-', '_')}_LINKER`
    built = library(target, 'cdylib', {
      [variable]: join(bin, `${linker}${ANDROID_API}-clang`),
    })
    mkdirSync(join(out, 'jniLibs', abi), { recursive: true })
    const shipped = join(out, 'jniLibs', abi, `lib${LIBRARY}.so`)
    copyFileSync(built, shipped)
    /* **The copy that ships is stripped, and the built library is not.** A
       shared library goes into the app as it is, so its symbol table would
       go too, and the app's own build strips nothing it did not build. The
       Kotlin is read from UniFFI's metadata symbols, which stripping removes:
       on October 14, 2026, stripped at build, the generator found none. */
    run(join(bin, 'llvm-strip'), ['--strip-all', shipped])
  }
  const generated = bindings('kotlin', built)
  cpSync(generated, join(out, 'java'), { recursive: true })
  rmSync(generated, { force: true, recursive: true })
  console.log('engine: the Android engine and its Kotlin are in android/src/engine')
}

const platform = process.argv[2]
if (platform === 'ios') {
  ios()
} else if (platform === 'android') {
  android()
} else {
  console.error('engine: name a platform, `ios` or `android`')
  process.exit(1)
}
