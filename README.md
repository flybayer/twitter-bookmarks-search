![Twitter Bookmarks Search Logo](https://github.com/flybayer/twitter-bookmarks-search/blob/master/marketing-assets/promo-marquee.png)

# Twitter Bookmarks Search WebExtension

This extension finally adds the ability to search your bookmarked tweets inside Twitter.

- [Install for Chrome or Edge](https://chrome.google.com/webstore/detail/twitter-bookmarks-search/flkokionhgagpmnhlngldhbfnblmenen)
- [Install for Firefox](https://addons.mozilla.org/en-US/firefox/addon/twitter-bookmarks-search-2/)

## Contributions

Contributions of all kinds are really appreciated! Issues, pull requests, etc.

## Development

_Requirements_

- macOS
- node
- yarn

1. `yarn install`
2. `yarn start`

## Production Build

1. `yarn`
2. `yarn buildonly` - (the unpacked extension will be in `out/`)

## New Release

1. Increment `version` field in `public/manifest.json`
2. `yarn release` - (the unpacked extension will be in `out/`)
3. Upload `dist/twitter-bookmarks-search-[VERSION].zip` to Chrome & Firefox web stores
