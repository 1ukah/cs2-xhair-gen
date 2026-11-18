# xhairgen

xhairgen is a crosshair generator and a case opener for Counter-Strike 2. It is one static page. It has no build step and no server code. All data stays in your browser.

## Publish on GitHub Pages

1. Create an empty public repository on GitHub. Do not add a README, a license or a `.gitignore` file.
2. Open a terminal in this folder.
3. Connect the folder to the repository and push the `master` branch:

   ```sh
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin master
   ```

4. On GitHub, open **Settings → Pages** in the repository.
5. Below **Build and deployment**, set **Source** to **Deploy from a branch**.
6. Select the `master` branch and the `/ (root)` folder.
7. Select **Save**.
8. Wait approximately one minute. Then open `https://USERNAME.github.io/REPOSITORY/`.

The file `.nojekyll` tells GitHub Pages to publish the files as they are. All paths are relative, thus the page works in a repository subfolder. The address `#editor` opens the generator. The address `#case` opens the case.

## Run on your computer

1. Open a terminal in this folder.
2. Start a local server:

   ```sh
   python -m http.server 8000 --bind 127.0.0.1
   ```

3. Open `http://127.0.0.1:8000/` in a browser.

Do not open `index.html` directly from the disk. Browsers block JavaScript modules on `file:` addresses.

## Generator

- The generator has the ten crosshair styles of the game, in the menu sequence.
- Each style shows only its applicable controls. The limits and the increments are the same as in the game.
- **Reset** sets the game defaults. **Undo** cancels the last change.
- A menu opens below its row and does not cover the preview.
- The color control opens a small panel below the preview. The preview shows each color change immediately.
- The arrows on the preview change the map. There are seven maps.
- **Start Dynamic Preview** shows the crosshair during movement. Hold the preview to show the crosshair during fire.
- **Copy** copies the share code. In the game, open **Settings → Crosshair/Scopes → Share or Import** and paste the code.
- **Share or Import** reads a share code from the game. The page identifies old `CSGO-…` codes and does not import them.
- **.cfg** downloads `crosshair.cfg`. This file also contains the spectator, grenade and sniper settings.
- To use the file, put it in `Counter-Strike Global Offensive/game/csgo/cfg/`. Then enter `exec crosshair` in the game console.

## Series 1 Case

A random integer selects the rarity. Then the page makes a random crosshair with the rules of that rarity. Thus each drop is different.

| Rarity | Tickets (of 782) | Chance | Crosshairs |
| --- | ---: | ---: | --- |
| Blue · Mil-Spec | 625 | 79.92% | Small static crosses, classic crosses and dots in standard colors |
| Purple · Restricted | 125 | 15.98% | Circles, squares, quadrants and half outlines of moderate size |
| Pink · Classified | 25 | 3.20% | Dynamic quadrants and circles, split alphas, color outlines, T style |
| Red · Covert | 5 | 0.64% | All styles with large sizes, color outlines, center dots and recoil |
| Gold · Rare Special | 2 | 0.26% | All options across their full range |

- **Open** turns a strip of 44 tiles and stops on the drop.
- The page records the drop before the animation starts. **Skip**, a page reload or a tab change does not change the drop.
- **Auto** opens cases continuously. Select **Auto** again to stop.

## Inventory

- The inventory keeps a maximum of 300 drops. When it is full, a new drop replaces the oldest drop that is not a favorite.
- The star makes a drop a favorite. Favorites stay at the top.
- The rarity buttons show only the drops of one rarity.
- **Select** lets you mark more than one drop. Then **Delete** removes the marked drops.
- With no marked drops, **Delete** removes all drops in the current filter. It does not remove favorites.
- **Delete** shows the number of drops. Select it a second time to confirm.
- Select a drop to see its share code, to equip it, to make it a favorite or to delete it.

## Development

- `src/settings.js` contains the menu and the export format.
- `src/reticle.js` draws the crosshair.
- `src/collection.js` contains the rarity weights and the generators.
- `src/editor.js`, `src/color.js` and `src/case.js` control the two pages.
- `src/ui.js` contains the shared interface parts.
- `styles.css` contains the interface styles.

To do the tests, you must have Node.js 22 or later. Run this command:

```sh
npm test
```

## Sources and credits

- [Valve release notes](https://www.counter-strike.net/news/updates): crosshair changes of September 22–30, 2026.
- Panorama [settings layout](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/panorama/layout/settings/settings_crosshair.xml), [visibility rules](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/panorama/scripts/settingsmenu_crosshair.js), [English labels](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/resource/csgo_english.txt) and [default values](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/DumpSource2/convars.txt).
- [Perfect World chance disclosure](https://www.csgo.com.cn/news/gamebroad/20170911/206155.shtml) and [Panorama case timing](https://github.com/SteamTracking/GameTracking-CS2/blob/1f0929becf45ae98da160cdc3e62e84745fdeebc/game/csgo/pak01_dir/panorama/scripts/popups/popup_capability_decodable.js).
- Share code format: two modules from [AkiVer/csgo-sharecode 7.0.1](https://www.npmjs.com/package/csgo-sharecode/v/7.0.1), with the [MIT license](vendor/csgo-sharecode/LICENSE).
- Map pictures: Valve game previews, from the [SteamAnalyst crosshair generator](https://www.steamanalyst.com/tools/crosshair-generator).
- Fonts: [Barlow](https://github.com/jpt/barlow) ([license](assets/fonts/OFL.txt)) and [Saira Condensed](https://github.com/Omnibus-Type/Saira) ([license](assets/fonts/OFL-SairaCondensed.txt)), with the SIL Open Font License.

Counter-Strike and its map pictures are the property of Valve. This project is an independent fan tool.
