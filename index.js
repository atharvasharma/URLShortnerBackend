const express = require('express');
const crypto = require('crypto');
var cors = require('cors')
require('dotenv').config()
const app = express();
const PORT = 8080;


// Middleware to parse JSON requests
app.use(express.json());
app.use(cors())

// In-memory storage for URL mappings and TTL
const urlMap = new Map();
const ttlMap = new Map();
const countMap = new Map();

// Helper function to generate a unique short URL
function generateShortUrl() {
  let shortUrl;
  do {
    shortUrl = crypto.randomBytes(6).toString('hex'); // Generate a 12-character hexadecimal string
  } while (urlMap.has(shortUrl));
  return shortUrl;
}

// API endpoint to create a short URL with TTL
app.post('/shorten', (req, res) => {
  const { url, ttl } = req.body;

  // Validate the provided URL
  try {
    new URL(url);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Check if the URL already exists in the map
  const existingShortUrl = Array.from(urlMap.entries()).find(([, value]) => value === url);

  if (existingShortUrl) {
    // Update the TTL if provided
    if (ttl) {
      ttlMap.set(existingShortUrl[0], Date.now() + ttl * 1000);
    }
    return res.json({ shortUrl: `${process.env.HOST_URL}:${PORT}/${existingShortUrl[0]}` });
  }

  // Generate a new short URL
  const shortUrl = generateShortUrl();
  urlMap.set(shortUrl, url);

  // Set the TTL if provided
  if (ttl) {
    ttlMap.set(shortUrl, Date.now() + ttl * 1000);
  }

  res.json({ shortUrl: `${process.env.HOST_URL}:${PORT}/${shortUrl}` });
});

// API endpoint to retrieve the original URL
app.get('/:shortUrl', (req, res) => {
  const shortUrl = req.params.shortUrl;
  const longUrl = urlMap.get(shortUrl);

  if (!longUrl) {
    return res.status(404).json({ error: 'URL not found' });
  }

  // Check if the URL has expired
  const expirationTime = ttlMap.get(shortUrl);
  if (expirationTime && Date.now() > expirationTime) {
    urlMap.delete(shortUrl);
    ttlMap.delete(shortUrl);
    countMap.delete(shortUrl);
    return res.status(404).json({ error: 'URL has expired' });
  }

  countMap.set(shortUrl, (countMap.get(shortUrl) || 0) + 1);

  console.log("Current count: " + countMap.get(shortUrl));

  res.redirect(longUrl);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});