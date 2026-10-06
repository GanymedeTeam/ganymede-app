#!/usr/bin/env bash
set -euo pipefail

# Run the tauri build with all passed arguments
echo "Building Tauri application..."
EXIT_CODE=0
pnpm tauri "$@" || EXIT_CODE=$?

if [[ "$OSTYPE" == linux-gnu* ]]; then
  if [ $EXIT_CODE -eq 0 ]; then
    echo "Linux OS detected and build succeeded. Starting AppImage post-processing..."

    # a) Find the .AppImage in src-tauri/target/release/bundle/appimage/
    echo "Step A: Finding AppImage in src-tauri/target/release/bundle/appimage/..."
    APPIMAGE_FILES=(src-tauri/target/release/bundle/appimage/*.AppImage)
    if [ ! -f "${APPIMAGE_FILES[0]}" ]; then
      echo "Error: No AppImage file found!"
      exit 1
    fi
    # Use absolute paths — appimagetool changes CWD internally when APPIMAGE_EXTRACT_AND_RUN=1
    APPIMAGE="$(realpath "${APPIMAGE_FILES[0]}")"
    SQUASHFS_ROOT="$(pwd)/squashfs-root"
    echo "Found AppImage: $APPIMAGE"

    # b) Run: "$APPIMAGE" --appimage-extract (produces squashfs-root/ in CWD)
    echo "Step B: Extracting AppImage..."
    rm -rf "$SQUASHFS_ROOT"
    "$APPIMAGE" --appimage-extract
    if [ ! -d "$SQUASHFS_ROOT" ]; then
      echo "Error: Extraction failed, squashfs-root directory not found."
      exit 1
    fi

    # c) Remove from squashfs-root/: libwayland-client.so.0, libwayland-egl.so.1, libwayland-cursor.so.0, libwayland-server.so.0 (use find ... -delete)
    echo "Step C: Removing bundled Wayland libraries from squashfs-root/..."
    find "$SQUASHFS_ROOT" \( -name "libwayland-client.so.0" -o -name "libwayland-egl.so.1" -o -name "libwayland-cursor.so.0" -o -name "libwayland-server.so.0" \) -delete

    # d) Download appimagetool: wget -q https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage -O appimagetool
    echo "Step D: Downloading appimagetool..."
    if ! wget -q https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage -O appimagetool; then
      echo "Error: Failed to download appimagetool!"
      rm -f appimagetool
      exit 1
    fi

    # e) chmod +x appimagetool
    echo "Step E: Making appimagetool executable..."
    chmod +x appimagetool

    # f) ARCH=x86_64 ./appimagetool squashfs-root "$APPIMAGE"
    echo "Step F: Repackaging AppImage..."
    ARCH=x86_64 APPIMAGE_EXTRACT_AND_RUN=1 ./appimagetool "$SQUASHFS_ROOT" "$APPIMAGE" || {
      echo "Error: Failed to repackage AppImage with appimagetool!"
      exit 1
    }

    # g) rm -rf squashfs-root appimagetool
    echo "Step G: Cleaning up temporary files..."
    rm -rf "$SQUASHFS_ROOT" appimagetool

    # h) Re-sign the AppImage: the updater signature produced by the build refers to the
    #    pre-repackaging file, so it no longer matches the repackaged AppImage.
    if [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
      echo "Step H: Re-signing repackaged AppImage..."
      if [ -f "$TAURI_SIGNING_PRIVATE_KEY" ]; then
        KEY_ARGS=(-f "$TAURI_SIGNING_PRIVATE_KEY")
      else
        KEY_ARGS=(-k "$TAURI_SIGNING_PRIVATE_KEY")
      fi
      pnpm tauri signer sign "${KEY_ARGS[@]}" -p "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" "$APPIMAGE"
    else
      echo "Step H: TAURI_SIGNING_PRIVATE_KEY is not set, skipping re-signing."
    fi

    echo "Post-processing completed successfully!"
  else
    echo "Build failed with exit code $EXIT_CODE. Skipping post-processing."
  fi
fi

exit $EXIT_CODE