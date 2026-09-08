#!/usr/bin/env bash
set -euo pipefail

readonly build_directory="$1"
readonly bucket="$2"
readonly distribution_id="$3"
readonly immutable_cache_control='public, max-age=31536000, immutable'
readonly mutable_cache_control='no-cache, max-age=0, must-revalidate'
declare -a invalidation_paths=()

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

add_invalidation_paths() {
  local relative_path="$1"
  case "$relative_path" in
    index.html)
      invalidation_paths+=(/ /index.html)
      ;;
    */index.html)
      local route_path="/${relative_path%/index.html}"
      invalidation_paths+=("$route_path" "$route_path/" "/$relative_path")
      ;;
    *)
      invalidation_paths+=("/$relative_path")
      ;;
  esac
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
    add_invalidation_paths "$relative_path"
  fi
done < <(find "$build_directory" -type f -print0 | sort -z)

# These stable, generated entry documents are not route HTML files. The entry
# asset paths are included for the first fingerprinting deployment so stale CDN
# copies of the former stable names cannot survive the migration.
invalidation_paths+=(/robots.txt /sitemap.xml /main.js /styles.css)

mapfile -t invalidation_paths < <(
  printf '%s\n' "${invalidation_paths[@]}" | LC_ALL=C sort -u
)
invalidation_id="$(
  aws cloudfront create-invalidation \
    --distribution-id "$distribution_id" \
    --paths "${invalidation_paths[@]}" \
    --query 'Invalidation.Id' \
    --output text
)"
aws cloudfront wait invalidation-completed \
  --distribution-id "$distribution_id" \
  --id "$invalidation_id"
