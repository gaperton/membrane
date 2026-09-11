#!/usr/bin/env bash
#
# Runs the package tests.
#
# swift-testing ships inside Xcode. On a machine that has only the Command Line
# Tools the framework is present but sits outside SwiftPM's compile and runtime
# search paths, so `swift test` fails to find or load it. Detect that case and
# point the compiler and dynamic linker at the toolchain copy. With a full Xcode
# selected these flags are unnecessary and are not added.
set -euo pipefail

package_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
developer_directory="$(xcode-select --print-path)"
frameworks="${developer_directory}/Library/Developer/Frameworks"
libraries="${developer_directory}/Library/Developer/usr/lib"

flags=()
if [[ -d "${frameworks}/Testing.framework" ]]; then
  flags+=(-Xswiftc -F -Xswiftc "${frameworks}")
  flags+=(-Xlinker -rpath -Xlinker "${frameworks}")
  flags+=(-Xlinker -rpath -Xlinker "${libraries}")
fi

cd "${package_directory}"
exec swift test "${flags[@]}" "$@"
