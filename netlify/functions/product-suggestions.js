// Netlify Function: Product Suggestions API
// Filters products to exclude hidden and match brand/category of a selected product
// Supports GET with query params: productId or brand & category

const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode } = res;
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Request Failed. Status Code: ${statusCode}`));
          res.resume();
          return;
        }
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData || '{}');
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', (e) => reject(e));
  });
}

function normalizeBrand(p) {
  const raw = (p && (p.brandType || p.brand || '')).trim();
  return raw.toLowerCase();
}

function normalizeCategory(p) {
  const raw = (p && p.category || '').trim();
  return raw.toLowerCase();
}

function isVisible(p) {
  // Strictly exclude hidden or undefined visibility
  return p && p.visible === true;
}

function sanitizeProduct(p, id) {
  return {
    id: id || p.id,
    title: p.title || 'Untitled',
    brand: p.brand || p.brandType || null,
    category: p.category || null,
    image: p.image || null,
    glbFiles: Array.isArray(p.glbFiles)
      ? p.glbFiles.map(({ url, src, name }) => ({ url: url || src || null, name: name || null }))
      : [],
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
    };
  }

  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const productId = params.get('productId');
    const brandParam = (params.get('brand') || '').trim().toLowerCase();
    const categoryParam = (params.get('category') || '').trim().toLowerCase();

    // Fetch all products via RTDB REST API (public rules assumed similar to client)
    const DB_URL = 'https://finalcaps2-1b3dc-default-rtdb.firebaseio.com';
    const all = await fetchJson(`${DB_URL}/products.json`);
    const entries = Object.entries(all || {});

    // Resolve selected product context
    let selectedBrand = brandParam;
    let selectedCategory = categoryParam;
    if (productId) {
      const match = entries.find(([id]) => id === productId);
      if (match) {
        const [, p] = match;
        selectedBrand = normalizeBrand(p);
        selectedCategory = normalizeCategory(p);
      }
    }

    // Basic validation
    if (!selectedBrand && !selectedCategory) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, suggestions: [], reason: 'Missing brand and category context' }),
      };
    }

    // Server-side filtering: exclude hidden; enforce brand & category match when available
    const suggestions = entries
      .filter(([, p]) => isVisible(p))
      .filter(([, p]) => {
        const b = normalizeBrand(p);
        const c = normalizeCategory(p);
        // If both context fields are present, require both match
        if (selectedBrand && selectedCategory) {
          return b === selectedBrand && c === selectedCategory;
        }
        // If only one is present, require that one
        if (selectedBrand && !selectedCategory) return b === selectedBrand;
        if (!selectedBrand && selectedCategory) return c === selectedCategory;
        return false;
      })
      .map(([id, p]) => sanitizeProduct(p, id));

    // Sort by relevance: exact brand match first, then category (stable sort by title for consistency)
    suggestions.sort((a, b) => {
      const aBrandMatch = (a.brand || '').toLowerCase() === selectedBrand ? 1 : 0;
      const bBrandMatch = (b.brand || '').toLowerCase() === selectedBrand ? 1 : 0;
      const aCatMatch = (a.category || '').toLowerCase() === selectedCategory ? 1 : 0;
      const bCatMatch = (b.category || '').toLowerCase() === selectedCategory ? 1 : 0;
      if (bBrandMatch !== aBrandMatch) return bBrandMatch - aBrandMatch;
      if (bCatMatch !== aCatMatch) return bCatMatch - aCatMatch;
      return String(a.title).localeCompare(String(b.title));
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, count: suggestions.length, suggestions }),
    };
  } catch (err) {
    console.error('[product-suggestions] error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message || 'Internal Error' }),
    };
  }
};