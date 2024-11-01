#!/bin/sh

set -xe

RELEASE_DATE=$1
RELEASE_LINE=$2

if [ -z "$RELEASE_DATE" ] || [ -z "$RELEASE_LINE" ]; then
  echo "Usage: $0 <RELEASE_DATE> <RELEASE_LINE>"
  exit 1
fi

git config --local user.email "github-bot@iojs.org"
git config --local user.name "Node.js GitHub Bot"

git node release --prepare --skipBranchDiff --yes --releaseDate "$RELEASE_DATE"
# We use it to not specify the branch name as it changes based on
# the commit list (semver-minor/semver-patch)
git config push.default current
git push

TITLE=$(awk "/^## ${RELEASE_DATE}/ { print substr(\$0, 4) }" "doc/changelogs/CHANGELOG_V${RELEASE_LINE}.md")

# Use a temporary file for the PR body
TEMP_BODY=$(mktemp)
awk "/## ${RELEASE_DATE}/,/^<a id=/{ if (!/^<a id=/) print }" "doc/changelogs/CHANGELOG_V${RELEASE_LINE}.md" > "$TEMP_BODY"

gh pr create --title "$TITLE" --body-file "$TEMP_BODY"

rm "$TEMP_BODY"
# TODO: amend with proposal PR
