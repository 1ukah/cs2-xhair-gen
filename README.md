# xhairgen

A build-free, single-page CS2 crosshair generator and case opener. The interface follows the game's Panorama menus: a top navigation strip, a settings band with section tabs and search, a map preview above the setting rows, and a right-hand rail for your drops. Switch to **HUD Preview** to see the same reticle in a spectator-style practice view. Maps, fonts, inventory and share codes all work locally in the browser.

## Host on GitHub Pages

1. Put the contents of this folder in a GitHub repository, with `index.html` and `.nojekyll` at the repository root.
2. In **Settings → Pages → Build and deployment**, choose **Deploy from a branch**.
3. Select **main** (or your default branch) and **`/ (root)`**, then **Save**.
4. Use the URL shown by Pages. For example, `https://USERNAME.github.io/REPOSITORY/#editor` opens the generator and `https://USERNAME.github.io/REPOSITORY/#case` opens the case. Neither needs a rewrite rule.

To preview locally, open a terminal in this folder and run:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Visit **http://127.0.0.1:8000/**. Serve it over HTTP(S); opening `index.html` directly from disk blocks ES modules in most browsers.

## Generator

- All ten Crosshair/Scopes styles, in menu order. The style controls follow Panorama's visibility rules, slider limits and increments. Reset restores the game defaults; Undo reverses an edit, import, reset or randomization.
- Both color pickers support saturation/value, hue, alpha, RGBA channels and hex. General, grenade line-up (including all five enable switches and delays) and sniper sights have their own parameter groups.
- Cycle through the seven map scenes, enable movement, hold the preview to sample firing, or magnify the reticle. Select **REF / …P** for reference height, scoped-rifle dot or sniper sight. The preview is a reference-pixel drawing; movement and recoil are illustrative, rather than a weapon physics simulation.
- For a less obstructed sight picture, open **HUD Preview**. The full-window scene uses your current map and reticle; the radar, score strip and ammo display provide the game-like frame of reference. **Esc** returns you to the settings you were editing.
- **Copy code** exports the current, undashed `CS…` game format. Paste it into **CS2 → Settings → Crosshair/Scopes → Share or Import**. Import accepts the same format; old `CSGO-…` codes are identified rather than silently misread.
- **Full config .cfg** includes the spectator, grenade and sniper preferences that game share codes omit. Put `xhairgen.cfg` in `Counter-Strike Global Offensive/game/csgo/cfg/` and enter `exec xhairgen` in the CS2 developer console.

## xhairgen Case

The Series 01 case contains 18 named, usable reticles. A uniformly sampled integer selects a rarity, then a second uniform draw selects a design within that tier.

| Tier | Tickets (of 782) | Displayed odds |
| --- | ---: | ---: |
| Blue · Mil-Spec | 625 | 79.92% |
| Purple · Restricted | 125 | 15.98% |
| Pink · Classified | 25 | 3.20% |
| Red · Covert | 5 | 0.64% |
| Gold · Rare Special Item | 2 | 0.26% |

The web opening recreates the lid reveal, 38-tile strip, highlighted center, six-second Panorama easing curve, ticker and item inspection. The winning design is recorded **before** animation; skipping, switching tabs, reduced motion and reloading do not reroll the drop. Use **Inventory** to re-equip it later. Inventory, editor settings and sound preferences are local to this browser and site.

## Source references and credits

- [Valve release notes](https://www.counter-strike.net/news/updates): September 22–30, 2026 crosshair changes.
- [Panorama settings layout](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/panorama/layout/settings/settings_crosshair.xml), [visibility rules](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/panorama/scripts/settingsmenu_crosshair.js), [English labels](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/resource/csgo_english.txt) and [convar defaults](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/DumpSource2/convars.txt). Snapshot checked November 17, 2026.
- [Perfect World probability disclosure](https://www.csgo.com.cn/news/gamebroad/20170911/206155.shtml), [Panorama container timing](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/panorama/scripts/popups/popup_capability_decodable.js) and [reel styling](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/panorama/styles/popups/popup_capability_decodable.css).
- CS2 codec: the two required browser modules from [AkiVer/csgo-sharecode 7.0.1](https://www.npmjs.com/package/csgo-sharecode/v/7.0.1), [MIT license](vendor/csgo-sharecode/LICENSE).
- Valve's in-game map previews, via [SteamAnalyst's crosshair preview assets](https://www.steamanalyst.com/tools/crosshair-generator). Counter-Strike and its map imagery belong to Valve. This is an independent fan tool.
- [Barlow and Barlow Condensed](https://github.com/jpt/barlow) ([license](assets/fonts/OFL.txt)) and [Saira Condensed](https://github.com/Omnibus-Type/Saira) ([license](assets/fonts/OFL-SairaCondensed.txt)) are self-hosted under the SIL Open Font License. Case artwork, interface mark and synthesized sounds were created for this project.

## Development

`src/settings.js` is the menu and export schema; `src/reticle.js` draws the preview and case specimens; `src/collection.js` contains rarity weights and item designs. `src/editor.js`, `src/color.js` and `src/case.js` drive the two pages; `src/rail.js` and `src/preview-hud.js` drive the side rail and the HUD preview. `styles.css` holds the Panorama-style interface and `hud.css` the HUD preview. Run `npm test` with Node 22+ for the format, menu and drop-distribution checks. No install or build step is required.
