# Dictionary provenance

`public/dictionary/words.txt` has 126,750 words, 18,887 of them nine letters long. It is a word list generated from the **English Speller Database (ESDB, formerly SCOWL)** by Kevin Atkinson, via <https://app.aspell.net/create>.

## Exact recipe

`scripts/build-wordlist.sh` reproduces the committed file **byte for byte**. This was verified on 2026-10-10 against ESDB revision `1e5b7d3`.

| Setting | Value |
|---|---|
| Size | 70 ("large") |
| Spelling | GB, -ize / OED (`GBz`), which is Oxford spelling: *organize*, *colour* |
| Variant level | 1 (default) |
| Special lists | none |
| Diacritics | strip (*café* becomes *cafe*) |

Post-processing steps:
1. Drop the copyright header.
2. Keep only entries that start with a lowercase letter and contain only letters. This removes proper nouns, hyphenated words, words with apostrophes and dotted abbreviations.
3. Lowercase everything. A handful of brand words become lowercase this way, for example `iPad` becomes `ipad` and `eBay` becomes `ebay`.
4. Sort (C locale) and remove duplicates.

Older notes said "en_GB-ise". That was wrong: the committed list has -ize spellings, so it came from `GBz`.

## License

ESDB is permissively licensed. You may use, copy, modify, distribute and sell lists made from it, provided its copyright notice and permission notice are kept. Both are in `public/dictionary/LICENSE-ESDB.txt`, which is served next to the list, and summarised on the `/dictionary` page.

## Not official Countdown rules

Countdown adjudicates with the Oxford Dictionaries. This list is a spell-checker word list, so it will accept some words the show rejects, and the other way round. The `/dictionary` page says so.

## Derived files

`public/dictionary/conundrums.json` comes from `scripts/build-conundrums.ts`. To regenerate both:

    sh scripts/build-wordlist.sh
    node_modules/.bin/tsx scripts/build-conundrums.ts
