<img align="right" src="icons/icon-128.png" width="80">

# AutoNextPuzzle

[![Chrome](https://img.shields.io/badge/Chrome-Coming%20Soon-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/bewf/AutoNextPuzzle/tree/chromium)
[![Firefox](https://img.shields.io/badge/Firefox-Install-FF7139?style=for-the-badge&logo=firefox&logoColor=white)](https://addons.mozilla.org/firefox/)

## What does this do?

AutoNextPuzzle advances to the next Chess.com puzzle after you solve it, or retries the puzzle if you miss a move.

You can toggle **Auto Next** and **Auto Retry** right above the Hint button on Chess.com, or click the extension icon to set custom delays (50 ms for Next and 150 ms for Retry by default).

## Modes

| Auto Next | Auto Retry | What it does |
|---|---|---|
| On | On | Advances after a solve and retries after a miss |
| On | Off | Advances to the next puzzle after both solves and misses |
| Off | On | Retries missed puzzles and waits on solves |
| Off | Off | Does nothing automatically |

## Install

Pick your browser:

- **Firefox** → [Firefox Add-ons](https://addons.mozilla.org/firefox/) *(or load `manifest.json` via `about:debugging#/runtime/this-firefox`)*
- **Chrome / Brave** → [Chromium branch](https://github.com/bewf/AutoNextPuzzle/tree/chromium) *(load unpacked via `chrome://extensions` or `brave://extensions`)*

## Credits

Originally based on [AutoNextPuzzle v1.1](https://github.com/fwhuy/AutoNextPuzzle) by Huy ([MIT License](LICENSE)).
