#!/usr/bin/env bash
set -euo pipefail

readonly build_directory="$1"
readonly bucket="$2"
readonly distribution_id="$3"
readonly immutable_cache_control='public, max-age=31536000, immutable'
readonly mutable_cache_control='no-cache, max-age=0, must-revalidate'

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

# Hashed files are uploaded before HTML, then retained forever so old tabs can
# still load their original lazy chunks. Do not add --delete to this deployment.
while IFS= read -r -d '' file; do
  if is_hashed_asset "$file"; then
    upload_file "$file" "$immutable_cache_control"
  fi
done < <(find "$build_directory" -type f -print0 | sort -z)

while IFS= read -r -d '' file; do
  relative_path="${file#"$build_directory"/}"
  if ! is_hashed_asset "$file" && [[ "$relative_path" != *.html ]]; then
    upload_file "$file" "$mutable_cache_control"
  fi
done < <(find "$build_directory" -type f -print0 | sort -z)

# Upload documents last, once all files they reference are available.
while IFS= read -r -d '' file; do
  relative_path="${file#"$build_directory"/}"
  if [[ "$relative_path" == *.html ]]; then
    upload_file "$file" "$mutable_cache_control"
  fi
done < <(find "$build_directory" -type f -print0 | sort -z)

# Route documents revalidate through the caching-disabled behavior. Every
# referenced JS and CSS entry asset is content-addressed by the build, so a
# new deployment uses new URLs without CloudFront invalidations.
