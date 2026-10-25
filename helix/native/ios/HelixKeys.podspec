require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# The keys capability's native module, which Expo autolinks into a development
# build of an app that depends on @fusion.dev/helix-native.
Pod::Spec.new do |s|
  s.name           = 'HelixKeys'
  s.version        = package['version']
  s.summary        = 'Hardware keyboard keys for Helix on React Native.'
  s.description    = 'Hands each key pressed on a hardware keyboard to Helix, and drops a key Helix takes.'
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

  # The keys module's files, and none of the theme module's under `theme/`.
  s.source_files = '*.swift'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
