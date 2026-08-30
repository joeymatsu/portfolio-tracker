# Portfolio Tracker — GitHub Pages Edition

Upload these files to a GitHub repository and enable GitHub Pages.

1. Create a repository, e.g. `portfolio-tracker`.
2. Upload all files in this folder to the repository root.
3. Go to Settings → Pages.
4. Choose Deploy from a branch.
5. Select `main` and `/ (root)`.
6. Save.

Your URL will normally be:
https://YOUR-USERNAME.github.io/portfolio-tracker/

Note: GitHub Pages is static hosting, so this version tries to fetch quotes directly in the browser. If a quote source blocks that request, the app keeps your last/manual price.


## Automatic USD/JPY

The app now attempts to retrieve `USDJPY=X` automatically from Yahoo Finance whenever prices refresh.

- Refreshes when the site opens
- Refreshes every 15 minutes while open
- Refreshes when you return after the refresh interval
- The USD/JPY input is updated automatically
- If retrieval fails, the last saved/manual FX rate remains in place
- You can still type a rate manually at any time
