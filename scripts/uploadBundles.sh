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

appVersion="v1"

echo "**Copying Core packages**"

# Loop through each directory
for dir in "${dir_paths[@]}"; do
  echo "Copying files from $dir"

  # Get the version from the package.json file
  # TODO: use sha for next
  version=$(jq -r .version "packages/$dir/package.json")

  # Convert slashes to double underscores
  cleanDir=$(echo $dir | sed 's/\//__/g')

  gcloud storage rsync packages/$dir/dist $GCLOUD_BUCKET/modules/$appVersion/$cleanDir/$version/bare --recursive --content-type=application/javascript || echo "Failed to copy files from $dir"

  echo "Completed copy for directory $dir"
  echo ""
done

# Upload all the shared dependencies to another path
echo "**Copying shared dependencies**"

copy_shared_dependencies() {
  local package_name=$1
  local -a files=("${@:2}")

  echo "Copying $package_name files"

  # Get the version from the package's package.json file
  local version=$(jq -r .version "packages/@repo/shared-modules.bundle/node_modules/$package_name/package.json")

  # Join package names into a string with paths
  local joined_paths=$(printf "packages/@repo/shared-modules.bundle/dist/%s.mjs " "${files[@]}" | sed 's/,$//')

  gcloud storage cp $joined_paths $GCLOUD_BUCKET/modules/$appVersion/$package_name/$version/bare --content-type=application/javascript | echo "Failed to copy files from $package_name"

  echo "Completed copying $package_name packages"
  echo ""
}

# React
declare -a react_pkgs=("react" "react_jsx-runtime")
# React-Dom
declare -a reactDom_pkgs=("react-dom" "react-dom_server")
# Styled-Components
declare -a styledComponents_pkgs=("styled-components")

copy_shared_dependencies "react" "${react_pkgs[@]}"
copy_shared_dependencies "react-dom" "${reactDom_pkgs[@]}"
copy_shared_dependencies "styled-components" "${styledComponents_pkgs[@]}"

echo "All directories processed."
