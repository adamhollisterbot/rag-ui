// RAG Explorer - Frontend Logic

const API_BASE = '/api';
const TENANT = 'default_tenant';
const DATABASE = 'default_database';

// Theme handling
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.className = savedTheme === 'light' ? 'theme-light' : '';
themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';

themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('theme-light');
    document.body.classList.toggle('theme-light', !isLight);
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'dark' : 'light');
});

// DOM Elements
const statusEl = document.getElementById('status');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const collectionFilter = document.getElementById('collection-filter');
const limitFilter = document.getElementById('limit-filter');
const collectionsList = document.getElementById('collections-list');
const documentsPanel = document.getElementById('documents-panel');
const documentsList = document.getElementById('documents-list');
const collectionTitle = document.getElementById('collection-title');
const refreshBtn = document.getElementById('refresh-btn');
const closeDocsBtn = document.getElementById('close-docs-btn');

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
});

// API helpers
async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
}

// Check connection
async function checkConnection() {
    try {
        const heartbeat = await api('/v2/heartbeat');
        statusEl.textContent = 'Connected';
        statusEl.className = 'status connected';
        return true;
    } catch (e) {
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'status error';
        return false;
    }
}

// Load collections
async function loadCollections() {
    try {
        const collections = await api(`/v2/tenants/${TENANT}/databases/${DATABASE}/collections`);
        
        // Update filter dropdown
        collectionFilter.innerHTML = '<option value="">All</option>';
        collections.forEach(c => {
            collectionFilter.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
        
        // Update browse view
        if (collections.length === 0) {
            collectionsList.innerHTML = '<div class="empty-state">No collections found</div>';
            return;
        }
        
        collectionsList.innerHTML = '';
        for (const coll of collections) {
            // Get count
            const countData = await api(`/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${coll.id}/count`);
            
            const card = document.createElement('div');
            card.className = 'collection-card';
            card.innerHTML = `
                <div class="collection-name">${coll.name}</div>
                <div class="collection-count">${countData}</div>
                <div class="collection-label">documents</div>
            `;
            card.addEventListener('click', () => showDocuments(coll));
            collectionsList.appendChild(card);
        }
    } catch (e) {
        console.error('Failed to load collections:', e);
        collectionsList.innerHTML = '<div class="empty-state">Failed to load collections</div>';
    }
}

// Show documents in a collection
async function showDocuments(collection) {
    collectionTitle.textContent = collection.name;
    documentsPanel.classList.remove('hidden');
    documentsList.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
        const data = await api(`/v2/tenants/${TENANT}/databases/${DATABASE}/collections/${collection.id}/get`, {
            method: 'POST',
            body: JSON.stringify({
                limit: 50,
                include: ['documents', 'metadatas']
            })
        });
        
        if (!data.ids || data.ids.length === 0) {
            documentsList.innerHTML = '<div class="empty-state">No documents</div>';
            return;
        }
        
        documentsList.innerHTML = '';
        data.ids.forEach((id, i) => {
            const doc = data.documents?.[i] || '';
            const meta = data.metadatas?.[i] || {};
            
            const card = document.createElement('div');
            card.className = 'document-card';
            card.innerHTML = `
                <div class="document-id">${id}</div>
                <div class="document-content">${escapeHtml(doc.substring(0, 500))}${doc.length > 500 ? '...' : ''}</div>
            `;
            documentsList.appendChild(card);
        });
    } catch (e) {
        console.error('Failed to load documents:', e);
        documentsList.innerHTML = '<div class="empty-state">Failed to load documents</div>';
    }
}

// Search
async function search() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    searchResults.innerHTML = '<div class="loading">Searching...</div>';
    
    const collectionName = collectionFilter.value;
    const limit = parseInt(limitFilter.value);
    
    try {
        // Use the query API endpoint which handles embeddings server-side
        const data = await api('/query', {
            method: 'POST',
            body: JSON.stringify({
                query: query,
                collection: collectionName || null,
                limit: limit
            })
        });
        
        const results = data.results || [];
        
        // Render results
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="empty-state">No results found</div>';
            return;
        }
        
        searchResults.innerHTML = '';
        results.forEach(result => {
            const card = document.createElement('div');
            card.className = 'result-card';
            
            const score = result.distance !== null ? result.distance.toFixed(4) : 'N/A';
            
            card.innerHTML = `
                <div class="result-header">
                    <span class="result-source">${result.collection}/${result.id}</span>
                    <span class="result-score">score: ${score}</span>
                </div>
                <div class="result-content">${escapeHtml(result.document)}</div>
                ${Object.keys(result.metadata).length > 0 ? `
                    <div class="result-meta">
                        ${Object.entries(result.metadata).map(([k, v]) => `<strong>${k}:</strong> ${v}`).join(' · ')}
                    </div>
                ` : ''}
            `;
            searchResults.appendChild(card);
        });
    } catch (e) {
        console.error('Search failed:', e);
        searchResults.innerHTML = '<div class="empty-state">Search failed</div>';
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
searchBtn.addEventListener('click', search);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
});
refreshBtn.addEventListener('click', loadCollections);
closeDocsBtn.addEventListener('click', () => {
    documentsPanel.classList.add('hidden');
});

// Initialize
async function init() {
    const connected = await checkConnection();
    if (connected) {
        await loadCollections();
    }
}

init();
