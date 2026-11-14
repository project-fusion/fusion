require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# The theme engine's native module, which Expo autolinks into a development
# build of an app that depends on @fusion.dev/helix-native.
#
# **The engine is in `theme/engine` where it was built**, as the package on npm
# carries it: `HelixThemeFFI.xcframework`, from `fusion-helix-native`, and the
# Swift UniFFI writes for it. `bun run engine ios` builds both. Without them the
# module has no `deriveModes`, and the theme draws the colors derived at build
# time.
engine = File.exist?(File.join(__dir__, 'theme', 'engine', 'HelixThemeFFI.xcframework'))

Pod::Spec.new do |s|
  s.name           = 'HelixTheme'
  s.version        = package['version']
  s.summary        = 'The Helix theme engine on iOS.'
  s.description    = "Derives a Helix theme's colors from its seeds on the device, with the engine the web runs as WebAssembly."
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: package['repository']['url'] }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  if engine
    s.source_files = 'theme/**/*.swift'
    s.vendored_frameworks = 'theme/engine/HelixThemeFFI.xcframework'
  else
    s.source_files = 'theme/*.swift'
  end
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
