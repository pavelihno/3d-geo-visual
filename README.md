<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1LnP4fToa9yt7Vy8mjc57sgFVazoOwBLS

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Run with Docker

Build and start the production preview server in a container:

```bash
docker build -t geo-visual .
docker run --rm -p 4173:4173 -e GEMINI_API_KEY=<your_key> geo-visual
```

The app will be available at http://localhost:4173.
