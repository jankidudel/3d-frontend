#!/usr/bin/env bash
set -euo pipefail

readonly build_directory="$1"
readonly bucket="$2"
readonly distribution_id="$3"
readonly immutable_cache_control='public, max-age=31536000, immutable'
readonly mutable_cache_control='no-cache, max-age=0, must-revalidate'
readonly max_upload_jobs="${DEPLOY_MAX_UPLOAD_JOBS:-8}"
active_uploads=()

if ! [[ "$max_upload_jobs" =~ ^[1-9][0-9]*$ ]]; then
  echo "DEPLOY_MAX_UPLOAD_JOBS must be a positive whole number." >&2
  exit 1
fi

node --experimental-strip-types scripts/seo-artifact.mts "$build_directory"

is_hashed_asset() {
  local file_name="${1##*/}"
  [[ "$file_name" =~ (^|[-.])[A-Za-z0-9_-]{8,}\.(js|mjs|css|map|woff|woff2|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif)$ ]]
}

upload_file() {
  local file="$1"
  local cache_control="$2"
  local relative_path="${file#"$build_directory"/}"
  aws s3 cp "$file" "s3://$bucket/$relative_path" \
    --cache-control "$cache_control" --only-show-errors
}

wait_for_upload_slot() {
  if (( ${#active_uploads[@]} < max_upload_jobs )); then
    return
  fi
  wait "${active_uploads[0]}"
  active_uploads=("${active_uploads[@]:1}")
}

wait_for_uploads() {
  local pid
  for pid in "${active_uploads[@]}"; do
    wait "$pid"
  done
}

upload_phase() {
  local phase="$1"
  local cache_control="$2"
  local file relative_path
  active_uploads=()

  while IFS= read -r -d '' file; do
    relative_path="${file#"$build_directory"/}"
    case "$phase" in
      immutable)
        if ! is_hashed_asset "$file"; then
          continue
        fi
        ;;
      mutable)
        if is_hashed_asset "$file" || [[ "$relative_path" == *.html ]]; then
          continue
        fi
        ;;
      documents)
        if [[ "$relative_path" != *.html ]]; then
          continue
        fi
        ;;
    esac
    upload_file "$file" "$cache_control" &
    active_uploads+=("$!")
    wait_for_upload_slot
  done < <(find "$build_directory" -type f -print0 | sort -z)

  wait_for_uploads
}

# Hashed files are uploaded before HTML, then retained forever so old tabs can
# still load their original lazy chunks. Do not add --delete to this deployment.
upload_phase immutable "$immutable_cache_control"
upload_phase mutable "$mutable_cache_control"
# Upload documents last, once all files they reference are available.
upload_phase documents "$mutable_cache_control"

# Retire only migrated tool HTML after all replacement documents are uploaded.
node --experimental-strip-types scripts/retire-tool-documents.mts "$build_directory" "$bucket"

# Route documents revalidate through the caching-disabled behavior. Every
# referenced JS and CSS entry asset is content-addressed by the build, so a
# new deployment uses new URLs without CloudFront invalidations.
