# Portfolio Tracker

Personal web app for Japanese and US stocks, ETFs, and mutual funds.

## What it does

- Stores ticker/fund code, quantity, average buy price, and current price/NAV
- Calculates market value and unrealized gain/loss
- Supports JPY and USD holdings
- Automatically refreshes available quotes when the app opens and every 15 minutes
- Uses manual current price as a fallback if a quote cannot be retrieved
- Saves your portfolio in your browser's LocalStorage
- CSV import/export
- Mobile-responsive and installable to an iPhone Home Screen

## Deploy free on Render

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. Go to https://render.com and sign in.
4. Choose **New → Web Service**.
5. Connect your GitHub account and select the repository.
6. Render should detect `render.yaml`. If configuring manually, use:
   - Runtime: Python
   - Build command: `echo 'No build step required'`
   - Start command: `python server.py`
   - Instance type: Free
   - Health check: `/health`
7. Create the web service.
8. When deployment finishes, open the provided `https://<your-name>.onrender.com` URL.

### Important free-tier behavior

Render's free web services can spin down after inactivity. The first visit after the service has slept may take longer while it wakes up.

## Use on iPhone like an app

1. Open your Render URL in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Launch Portfolio from the new Home Screen icon.

## Privacy / syncing

Your holdings are currently saved in LocalStorage in each browser. They are not uploaded to the Render server. This means your iPhone and computer will have separate portfolios unless you export/import CSV between them. A future version can add sign-in and encrypted cloud sync.

## Local use

```bash
python3 server.py
```

Then open http://localhost:8000.

## Market-data note

This hobby version uses public Yahoo Finance / Yahoo! Finance Japan pages without a paid API key. These unofficial/public endpoints can change, rate-limit requests, or fail for some instruments. For a production or commercial app, use a licensed market-data provider.
