import { handler as ssrHandler } from './dist/server/entry.mjs';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// Cache configuration for different asset types
const cacheConfig = {
  // Long-term cache for immutable assets (fonts, images with hash)
  immutable: {
    maxAge: '1y',
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  },
  // Medium-term cache for images and other static assets
  static: {
    maxAge: '30d',
    headers: {
      'Cache-Control': 'public, max-age=2592000'
    }
  },
  // Short-term cache for HTML and potentially changing content
  dynamic: {
    maxAge: '1h',
    headers: {
      'Cache-Control': 'public, max-age=3600'
    }
  }
};

// Set cache headers based on file type
function setCacheHeaders(req, res, next) {
  const url = req.url;
  
  // Font files - long cache (1 year)
  if (url.match(/\.(woff2|woff|ttf|eot)$/)) {
    res.set(cacheConfig.immutable.headers);
  }
  // Images - medium cache (30 days)
  else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    res.set(cacheConfig.static.headers);
  }
  // CSS and JS files - medium cache (30 days)
  else if (url.match(/\.(css|js|mjs)$/)) {
    res.set(cacheConfig.static.headers);
  }
  // Manifest and other config files - short cache (1 hour)
  else if (url.match(/\.(json|xml|txt|webmanifest)$/)) {
    res.set(cacheConfig.dynamic.headers);
  }
  
  next();
}

// Apply cache headers to static files
app.use(setCacheHeaders);

// Serve static files from client directory
app.use(express.static(join(__dirname, 'dist/client'), {
  etag: true,
  lastModified: true
}));

// Handle SSR
app.use(ssrHandler);

const port = process.env.PORT || 4321;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
