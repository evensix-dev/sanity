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
  # Get the version from the package.json file
  # TODO: use sha for next
  version=$(cat packages/$dir/package.json | jq -r .version)

  # Convert slashes to double underscores
  cleanDir=$(echo $dir | sed 's/\//__/g')

  echo "gcloud storage rsync packages/$dir/dist $GCLOUD_BUCKET/$cleanDir/$version --recursive --content-type=application/javascript"
  # gcloud storage rsync packages/$dir/dist $GCLOUD_BUCKET/$cleanDir/$version --recursive --content-type=application/javascript || echo "Failed to copy files from $dir"

  echo "Completed copy for directory $dir"
done

echo "All directories processed."
