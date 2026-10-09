#!/bin/sh
# Rebuilds public/dictionary/words.txt from the English Speller Database
# (ESDB, formerly SCOWL). Verified 2026-10-10 to reproduce the committed file
# byte for byte. See docs/DICTIONARY.md.
set -eu
OUT="${1:-public/dictionary/words.txt}"
TMP="$(mktemp)"
curl -sSL -o "$TMP" "http://app.aspell.net/create?max_size=70&spelling=GBz&variant_level=1&diacritic=strip&encoding=utf-8&format=inline&download=wordlist"
# Drop the copyright header (everything up to the '---' line), then:
#   keep entries that start lowercase (drops proper nouns such as London) and
#   are letters only (drops hyphens, apostrophes and abbreviations with dots),
#   lowercase the rest (iPad -> ipad), sort and dedupe.
sed '1,/^---$/d' "$TMP" | grep -E '^[a-z][A-Za-z]*$' | tr 'A-Z' 'a-z' | LC_ALL=C sort -u > "$OUT"
rm -f "$TMP"
wc -l "$OUT"
