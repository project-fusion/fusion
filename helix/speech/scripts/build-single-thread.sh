#!/bin/bash
# Builds the single-thread Moonshine module into vendor/single-thread.
#
# Moonshine publishes a threaded build only, which needs a cross-origin
# isolated page. Its sources build without threads too, and this script does
# that: ONNX Runtime as a minimal SIMD static library, then Moonshine's
# Emscripten module linked against it. Neither project publishes the result.
#
# The versions come from single-thread.json. After a build, update the digests
# there to the ones this prints.
#
# Needs Python 3.10 or later, git, and about 4 GB free. ONNX Runtime installs
# its own emsdk. Takes about 15 minutes on an M-series Mac. The work happens in
# HELIX_MOONSHINE_ROOT, which defaults to ~/.cache/helix-moonshine.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="${HELIX_MOONSHINE_ROOT:-$HOME/.cache/helix-moonshine}"
PYTHON="${PYTHON:-python3}"
MOONSHINE="$(sed -n 's/.*"moonshine": "\(.*\)".*/\1/p' "$HERE/single-thread.json")"
ORT="$(sed -n 's/.*"onnxruntime": "\(.*\)".*/\1/p' "$HERE/single-thread.json")"

mkdir -p "$ROOT"
cd "$ROOT"
[ -d venv ] || "$PYTHON" -m venv venv
# shellcheck disable=SC1091
. venv/bin/activate
pip install -q cmake ninja flatbuffers numpy packaging

# Moonshine's LFS budget runs out, and the two LFS sources a build compiles
# are replaced below, so the checkout skips LFS.
[ -d moonshine/.git ] || GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --branch "v$MOONSHINE" \
  https://github.com/moonshine-ai/moonshine.git
[ -d ort/.git ] || git clone --recursive --depth 1 --branch "v$ORT" \
  https://github.com/microsoft/onnxruntime.git ort

# The flags are Moonshine's own, from scripts/build-ort-wasm.sh, without
# --enable_wasm_threads.
LIB="$ROOT/ort-build-simd/Release/libonnxruntime_webassembly.a"
if [ ! -f "$LIB" ]; then
  (cd ort && ./build.sh --build_dir "$ROOT/ort-build-simd" --config Release \
    --build_wasm_static_lib --enable_wasm_simd \
    --disable_wasm_exception_catching --enable_wasm_api_exception_catching \
    --minimal_build extended custom_ops \
    --include_ops_by_config "$ROOT/moonshine/core/third-party/onnxruntime/moonshine-required-operators.config" \
    --disable_ml_ops --skip_tests --parallel 6 --compile_no_warning_as_error \
    --emsdk_version 4.0.8 \
    --cmake_extra_defines onnxruntime_USE_KLEIDIAI=OFF onnxruntime_BUILD_UNIT_TESTS=OFF)
fi
cp "$LIB" "$ROOT/moonshine/core/third-party/onnxruntime/lib/wasm/libonnxruntime_webassembly_singlethread.a"

# Stubs for the two LFS sources. Both feed features speech to text never
# calls: ZipVoice's built-in voices and the diarization constants.
cat > moonshine/core/moonshine-tts/src/zipvoice-voices-data.cpp <<'CPP'
#include "zipvoice-voices.h"
namespace moonshine_tts {
const ZipVoiceBuiltinVoice* zipvoice_builtin_voices(size_t* count) {
  if (count) { *count = 0; }
  return nullptr;
}
}  // namespace moonshine_tts
CPP
cat > moonshine/core/cpp-annote/src/community1_cpp_annote_embedded.cpp <<'CPP'
#include "community1_cpp_annote_embedded.h"
namespace cppannote::embedded_community1 {
const char segmentation_json[] = "{}";
const std::size_t segmentation_json_size = 2;
const char embedding_json[] = "{}";
const std::size_t embedding_json_size = 2;
const char receptive_field_json[] = "{}";
const std::size_t receptive_field_json_size = 2;
const char pipeline_snapshot_json[] = "{}";
const std::size_t pipeline_snapshot_json_size = 2;
const char golden_speaker_bounds_json[] = "{}";
const std::size_t golden_speaker_bounds_json_size = 2;
const double xvec_mean1[256] = {};
const float xvec_mean2[128] = {};
const float xvec_lda[32768] = {};
const double plda_mu[128] = {};
const double plda_tr[16384] = {};
const double plda_psi[128] = {};
}  // namespace cppannote::embedded_community1
CPP

# shellcheck disable=SC1091
. "$ROOT/ort/cmake/external/emsdk/emsdk_env.sh"
(cd moonshine && scripts/build-wasm.sh single-thread skip-ort)

mkdir -p "$HERE/vendor/single-thread"
cp moonshine/language-bindings/wasm/dist/moonshine.mjs moonshine/language-bindings/wasm/dist/moonshine.wasm \
  "$HERE/vendor/single-thread/"
shasum -a 256 "$HERE"/vendor/single-thread/*
