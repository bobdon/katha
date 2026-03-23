// Cloudflare Pages Function: Story CRUD via KV
// KV Binding required: KATHA_KV

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const STORIES_KEY = 'all_stories';

// Handle all methods
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const KV = env.KATHA_KV;
  if (!KV) {
    return new Response(JSON.stringify({ error: 'KV storage not configured' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  try {
    switch (method) {
      case 'GET':
        return getStories(KV);
      case 'POST':
        return saveStories(KV, request);
      case 'DELETE':
        return deleteStory(KV, request);
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: CORS_HEADERS,
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', message: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

// GET - return all stories
async function getStories(KV) {
  const data = await KV.get(STORIES_KEY, 'json');
  return new Response(JSON.stringify({ stories: data || [] }), {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// POST - save entire stories array (full sync)
async function saveStories(KV, request) {
  const body = await request.json();
  const { stories } = body;

  if (!Array.isArray(stories)) {
    return new Response(JSON.stringify({ error: 'Invalid data: stories must be an array' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  await KV.put(STORIES_KEY, JSON.stringify(stories));

  return new Response(JSON.stringify({ success: true, count: stories.length }), {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// DELETE - remove a story by id
async function deleteStory(KV, request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing story id' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const data = await KV.get(STORIES_KEY, 'json');
  const stories = data || [];
  const filtered = stories.filter(s => s.id !== id);

  if (filtered.length === stories.length) {
    return new Response(JSON.stringify({ error: 'Story not found' }), {
      status: 404,
      headers: CORS_HEADERS,
    });
  }

  await KV.put(STORIES_KEY, JSON.stringify(filtered));

  return new Response(JSON.stringify({ success: true, remaining: filtered.length }), {
    status: 200,
    headers: CORS_HEADERS,
  });
        }
