#!/bin/bash

# Array of directory paths
declare -a dir_paths=(
  "sanity"
  "@sanity/vision"
  "@sanity/portable-text-editor"
  "@sanity/block-tools"
  "@sanity/diff"
  "@sanity/util"
  "@sanity/mutator"
  "@sanity/schema"
)

# Loop through each directory
for dir in "${dir_paths[@]}"; do
  echo "Copying files from $dir"
  appVersion="v1"

  # Get the version from the package.json file
  # TODO: use sha for next
  version=$(cat packages/$dir/package.json | jq -r .version)

  # Convert slashes to double underscores
  cleanDir=$(echo $dir | sed 's/\//__/g')

  gcloud storage rsync packages/$dir/dist $GCLOUD_BUCKET/modules/$appVersion/$cleanDir/$version/bare --recursive --content-type=application/javascript || echo "Failed to copy files from $dir"

  echo "Completed copy for directory $dir"
  echo ""
done

echo "All directories processed."
