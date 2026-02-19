// Cloudflare Pages Function - Proxy to RAG APIs
// Routes queries to the embedding API, other requests to Chroma

export async function onRequest(context) {
    const { request, env, params } = context;
    
    const path = params.path ? params.path.join('/') : '';
    const url = new URL(request.url);
    
    // Route /query to the embedding API, everything else to Chroma
    let targetUrl;
    if (path === 'query') {
        targetUrl = `${env.RAG_QUERY_API_URL}/query${url.search}`;
    } else {
        targetUrl = `${env.RAG_API_URL}/api/${path}${url.search}`;
    }
    
    // Clone request with auth headers
    const headers = new Headers(request.headers);
    headers.set('CF-Access-Client-Id', env.CF_ACCESS_CLIENT_ID);
    headers.set('CF-Access-Client-Secret', env.CF_ACCESS_CLIENT_SECRET);
    
    // Forward the request
    const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' 
            ? await request.text() 
            : undefined
    });
    
    // Return response with CORS headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: responseHeaders });
    }
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
    });
}
