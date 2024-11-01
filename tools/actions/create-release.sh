#!/bin/sh

set -xe

RELEASE_DATE=$1
RELEASE_LINE=$2

git node release --prepare --skipBranchDiff
# We use it to not specify the branch name as it changes based on
# the commit list (semver-minor/semver-patch)
git config push.default current
awk "/## ${RELEASE_DATE}/,/^<a id=/{ if (!/^<a id=/) print }" \
  "doc/changelogs/CHANGELOG_V${RELEASE_LINE}.md" |\
  gh pr create --body-file -
# TODO: ammend with proposal PR
