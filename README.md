# Chess Climb site

The Chess Climb website, published with GitHub Pages: Today's climb to play in the browser, and the support, privacy and get-the-app pages for the iPhone and Android apps.

- Today's climb: `index.html`, with `assets/` (the page's script and rules, its styles, the pieces under their BSD license, the app's sounds) and `climbs/`, one file a month of each day's ten puzzles. The app repository's `Tools/export_climbs.sh` writes them with the apps' own code, so the site and both phones give the same ten; it is run again after a catalog rebuild and before the last month runs out. Nothing is sent from the page: the day's progress stays in the browser.
- Support: `support/index.html`
- Privacy policy: `privacy.html`
- Get the app: `get/index.html`, the one link for bios. iPhones go straight to the App Store, except inside app browsers such as TikTok's, which block it: there the page asks to be opened in Safari. Android shows Google's Get it on Google Play badge, and inside app browsers a note to open the page in Chrome.
