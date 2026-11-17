const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
const assetsPath = path.join(distPath, 'assets');

// Enable proxy headers for Hostinger reverse proxies (Nginx / Cloudflare / LiteSpeed)
app.enable('trust proxy');

// 1. Direct assets serving with immutable 1-year caching
if (fs.existsSync(assetsPath)) {
  app.use('/assets', express.static(assetsPath, {
    maxAge: '1y',
    immutable: true,
  }));
}

// 2. Serve all other root static files from dist (favicon, robots, brochures, etc.)
app.use(express.static(distPath, {
  maxAge: '1d',
  index: 'index.html',
}));

// 3. Health check endpoint for uptime monitors
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'nfvs-web', timestamp: new Date().toISOString() });
});

// 4. SPA Fallback: send index.html for page navigation
app.get('*', (req, res) => {
  // If the path looks like a static asset file that was not found, return 404 rather than HTML
  if (/\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|mp4|webp|woff|woff2|ttf|json|map)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send('Asset not found');
  }

  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).type('text/plain').send('Application build in progress or dist/index.html not found. Please run "npm run build:web".');
  }
});

// 5. Global error handler
app.use((err, req, res, next) => {
  console.error('[Web Server Error]', err);
  res.status(500).type('text/plain').send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`[NF Venture Studio] Web server running on port ${PORT}`);
});
