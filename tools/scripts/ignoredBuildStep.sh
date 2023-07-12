#!/bin/bash

# This script is used to only deploy a new documentation version when a new tag is created -> for every release
# This prevents deploying a documentation update for a version that is not released yet

# Get the last successful commit SHA
last_commit=$VERCEL_GIT_PREVIOUS_COMMIT

# Get the latest commit SHA
latest_commit=$VERCEL_GIT_COMMIT_SHA

# Get the latest tag associated with the latest commit
latest_tag=$(git describe --tags --abbrev=0 $latest_commit)

# Get the last tag associated with the last commit
last_tag=$(git describe --tags --abbrev=0 $last_commit)

if [ "$latest_tag" = "$last_tag" ]; then
  echo "No new tags. Skipping the build."
  exit 0
fi

echo "New tag detected. Proceeding with the build."
exit 1
