<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy the app

This contains everything you need to run the app locally.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

Searches use the OpenStreetMap Nominatim geocoding service (no API key required), so no environment variables are necessary.

### UI notes

-   Responsive sidebar and search inputs designed for touch targets on mobile.
-   Light/dark toggle with glassmorphism-inspired panels driven by shared design tokens.
-   Accessible focus states, ARIA-labelled controls, and clearer status/error messaging across the search flow.

## Run with Docker

Build and start the production static server in a container (defaults to port 3000):

```bash
docker build -t geo-visual .
docker run --rm -e APP_PORT=3000 -p 3000:3000 geo-visual
```

The app will be available at http://localhost:3000. To use a different port, set `APP_PORT` at build and/or runtime:

```bash
docker build --build-arg APP_PORT=4000 -t geo-visual .
docker run --rm -e APP_PORT=4000 -p 4000:4000 geo-visual
```
