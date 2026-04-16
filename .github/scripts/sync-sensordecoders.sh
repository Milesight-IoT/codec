#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: sync-sensordecoders.sh <codec-root> <sensor-decoders-root> [changed-files-list]

Mirrors released codec source files from:
  <codec-root>/vendors/milesight-iot/

into:
  <sensor-decoders-root>/

If [changed-files-list] is provided, it must contain repo-relative paths under
vendors/milesight-iot/. Only those files are synced for this release.

Only the following file types are mirrored:
  *-codec.json
  *-decoder.js
  *-encoder.js
EOF
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage >&2
  exit 1
fi

codec_root=$(cd "$1" && pwd)
sensor_decoders_root=$(cd "$2" && pwd)
changed_files_list=${3:-}
source_root="$codec_root/vendors/milesight-iot"

if [ ! -d "$source_root" ]; then
  echo "Source directory not found: $source_root" >&2
  exit 1
fi

if [ ! -d "$sensor_decoders_root/.git" ]; then
  echo "Target repository is not a git checkout: $sensor_decoders_root" >&2
  exit 1
fi

mirror_patterns=(
  '*-codec.json'
  '*-decoder.js'
  '*-encoder.js'
)

source_files=()
if [ -n "$changed_files_list" ]; then
  if [ ! -f "$changed_files_list" ]; then
    echo "Changed files list not found: $changed_files_list" >&2
    exit 1
  fi

  while IFS= read -r repo_path; do
    [ -z "$repo_path" ] && continue

    case "$repo_path" in
      vendors/milesight-iot/*-codec.json|vendors/milesight-iot/*-decoder.js|vendors/milesight-iot/*-encoder.js|vendors/milesight-iot/*/*-codec.json|vendors/milesight-iot/*/*-decoder.js|vendors/milesight-iot/*/*-encoder.js|vendors/milesight-iot/*/*/*-codec.json|vendors/milesight-iot/*/*/*-decoder.js|vendors/milesight-iot/*/*/*-encoder.js|vendors/milesight-iot/*/*/*/*-codec.json|vendors/milesight-iot/*/*/*/*-decoder.js|vendors/milesight-iot/*/*/*/*-encoder.js)
        source_files+=("$codec_root/$repo_path")
        ;;
      *)
        echo "Skipping unsupported sync path: $repo_path" >&2
        ;;
    esac
  done < "$changed_files_list"
else
  while IFS= read -r -d '' file; do
    source_files+=("$file")
  done < <(
    find "$source_root" -type f \
      \( -name "${mirror_patterns[0]}" -o -name "${mirror_patterns[1]}" -o -name "${mirror_patterns[2]}" \) \
      -print0 | sort -z
  )
fi

if [ "${#source_files[@]}" -eq 0 ]; then
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    {
      echo "has_changes=false"
      echo "changed_files_count=0"
      echo "changed_files<<EOF"
      echo "EOF"
    } >> "$GITHUB_OUTPUT"
  fi
  exit 0
fi

deduped_source_files=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  deduped_source_files+=("$file")
done < <(printf '%s\n' "${source_files[@]}" | awk 'NF' | sort -u)
source_files=("${deduped_source_files[@]}")

for source_file in "${source_files[@]}"; do
  if [[ "$source_file" != "$codec_root"/vendors/milesight-iot/* ]]; then
    echo "Skipping path outside codec source root: $source_file" >&2
    continue
  fi

  relative_path=${source_file#"$source_root"/}
  target_file="$sensor_decoders_root/$relative_path"

  if [ -f "$source_file" ]; then
    mkdir -p "$(dirname "$target_file")"

    if [ ! -f "$target_file" ] || ! cmp -s "$source_file" "$target_file"; then
      cp "$source_file" "$target_file"
    fi
  elif [ -f "$target_file" ]; then
    rm "$target_file"
  fi
done

changed_files=()
while IFS= read -r line; do
  [ -z "$line" ] && continue

  path=${line:3}
  case "$path" in
    *" -> "*) path=${path##* -> } ;;
  esac

  case "$path" in
    *-codec.json|*-decoder.js|*-encoder.js)
      changed_files+=("$path")
      ;;
  esac
done < <(git -C "$sensor_decoders_root" status --short --untracked-files=all)

if [ "${#changed_files[@]}" -gt 0 ]; then
  deduped_files=()
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    deduped_files+=("$file")
  done < <(printf '%s\n' "${changed_files[@]}" | awk 'NF' | sort -u)
  changed_files=("${deduped_files[@]}")
  has_changes=true
else
  has_changes=false
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "has_changes=$has_changes"
    echo "changed_files_count=${#changed_files[@]}"
    echo "changed_files<<EOF"
    if [ "${#changed_files[@]}" -gt 0 ]; then
      printf '%s\n' "${changed_files[@]}"
    fi
    echo "EOF"
  } >> "$GITHUB_OUTPUT"
fi

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## SensorDecoders Mirror"
    echo
    echo "- Source root: \`$source_root\`"
    echo "- Target root: \`$sensor_decoders_root\`"
    echo "- Changed files: ${#changed_files[@]}"
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$has_changes" = true ]; then
  printf '%s\n' "${changed_files[@]}"
fi
