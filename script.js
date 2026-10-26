const searchForm = document.querySelector('.search-box');
const searchInput = document.querySelector('.search-input');
const mainElement = document.querySelector('main');
const resultsContainer = document.querySelector('.results-container');
const clearBtn = document.querySelector('.clear-btn');
const luckyBtn = document.querySelector('.lucky-btn');
const themeBtn = document.querySelector('.theme-btn');
const resetBtn = document.querySelector('.reset-btn');
const logoArea = document.querySelector('.logo-area');
const configBtn = document.querySelector('.icon-btn');
const sidebar = document.querySelector('.sidebar');
const sidebarClose = document.querySelector('.sidebar-close');
const safeToggle = document.getElementById('opt-safe');
const cacheToggle = document.getElementById('opt-cache');
const glowToggle = document.getElementById('opt-glow');

// ID wyszukiwarki z programmablesearchengine.google.com (pole "cx"). Puste = wyniki z Wikipedii.
const GOOGLE_CSE_ID = "";

const THEMES = 4;
const cache = new Map();
const settings = loadSettings();
let currentSearch = 0;
let googleReady = null;
let googleWaiting = null;

function loadSettings() {
    const defaults = { safe: true, cache: true, glow: true, theme: 0 };
    try {
        return Object.assign(defaults, JSON.parse(localStorage.getItem('wizard-settings')));
    } catch (e) {
        return defaults;
    }
}

function saveSettings() {
    try {
        localStorage.setItem('wizard-settings', JSON.stringify(settings));
    } catch (e) {}
}

function applySettings() {
    safeToggle.checked = settings.safe;
    cacheToggle.checked = settings.cache;
    glowToggle.checked = settings.glow;
    document.body.classList.toggle('glow', settings.glow);
    for (let i = 1; i < THEMES; i++) {
        document.body.classList.toggle('theme-' + i, settings.theme === i);
    }
}

function searchWikipedia(query) {
    const url = 'https://pl.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=10&srsearch=' + encodeURIComponent(query);
    return fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Wikipedia HTTP ' + response.status);
            return response.json();
        })
        .then(data => (data.query ? data.query.search : []).map(item => ({
            url: 'https://pl.wikipedia.org/wiki/' + encodeURIComponent(item.title.replace(/ /g, '_')),
            title: escapeHTML(item.title),
            snippet: item.snippet ? item.snippet + '…' : ''
        })));
}

function loadGoogle() {
    if (googleReady) return googleReady;
    googleReady = new Promise((resolve, reject) => {
        window.__gcse = {
            parsetags: 'explicit',
            initializationCallback: function() {
                ['safe', 'off'].forEach(mode => {
                    const div = document.createElement('div');
                    div.id = 'cse-' + mode;
                    div.hidden = true;
                    document.body.appendChild(div);
                    google.search.cse.element.render({
                        div: div.id,
                        tag: 'searchresults-only',
                        gname: mode,
                        attributes: { safeSearch: mode === 'safe' ? 'active' : 'off', enableHistory: false }
                    });
                });
                resolve();
            },
            searchCallbacks: {
                web: {
                    ready: function(name, query, promos, results) {
                        if (googleWaiting) googleWaiting(results || []);
                        return true;
                    }
                }
            }
        };
        const script = document.createElement('script');
        script.src = 'https://cse.google.com/cse.js?cx=' + encodeURIComponent(GOOGLE_CSE_ID);
        script.async = true;
        script.onerror = () => {
            googleReady = null;
            reject(new Error('Nie udało się wczytać cse.js'));
        };
        document.head.appendChild(script);
    });
    return googleReady;
}

function searchGoogle(query) {
    return loadGoogle().then(() => new Promise((resolve, reject) => {
        const done = results => {
            clearTimeout(timer);
            googleWaiting = null;
            resolve(results.map(item => ({
                url: item.url,
                title: escapeHTML(item.titleNoFormatting || ''),
                snippet: escapeHTML(item.contentNoFormatting || '')
            })));
        };
        const timer = setTimeout(() => {
            if (googleWaiting === done) googleWaiting = null;
            reject(new Error('Google nie odpowiada'));
        }, 10000);
        googleWaiting = done;
        google.search.cse.element.getElement(settings.safe ? 'safe' : 'off').execute(query);
    }));
}

function search(query) {
    const key = (GOOGLE_CSE_ID ? 'google' : 'wiki') + (settings.safe ? ':safe:' : ':off:') + query.toLowerCase();
    if (settings.cache && cache.has(key)) return Promise.resolve(cache.get(key));
    return (GOOGLE_CSE_ID ? searchGoogle(query) : searchWikipedia(query)).then(results => {
        if (settings.cache) cache.set(key, results);
        return results;
    });
}

function runSearch(query, lucky) {
    const id = ++currentSearch;
    mainElement.classList.add('has-results');
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
    removeLoader();

    const loader = document.createElement('div');
    loader.className = 'loading-wizard';
    loader.textContent = 'Destylacja wiedzy z eteru sieci... 🔮';
    mainElement.appendChild(loader);

    setUrlQuery(query);

    search(query)
        .then(results => {
            if (id !== currentSearch) return;
            if (lucky && results.length > 0) {
                location.href = results[0].url;
                return;
            }
            showResults(query, results);
        })
        .catch(error => {
            if (id !== currentSearch) return;
            showMessage('Zakłócenia w eterze sieciowym. Zaklęcie nie powiodło się. Spróbuj ponownie później.', true);
            console.error("Błąd wyszukiwania:", error);
        });
}

function showResults(query, results) {
    if (results.length === 0) {
        showMessage('Eter milczy. Nie odnaleziono zwojów odpowiadających zaklęciu: <strong>' + escapeHTML(query) + '</strong>', false);
        return;
    }
    removeLoader();
    resultsContainer.innerHTML = results.map(item => `
        <div class="result-item">
            <a href="${escapeHTML(item.url)}" class="result-url-display" target="_blank" rel="noopener">${escapeHTML(prettyUrl(item.url))}</a>
            <h3 class="result-title"><a href="${escapeHTML(item.url)}" target="_blank" rel="noopener">${item.title}</a></h3>
            <p class="result-snippet">${item.snippet || 'Brak opisu dla tego elementu.'}</p>
        </div>
    `).join('');
    resultsContainer.style.display = 'block';
}

function showMessage(html, isError) {
    removeLoader();
    const box = isError
        ? 'text-align: center; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05);'
        : 'text-align: center; color: #94a3b8;';
    const text = isError ? ' style="color: #f87171;"' : '';
    resultsContainer.innerHTML = `
        <div class="result-item" style="${box}">
            <p class="result-snippet"${text}>${html}</p>
        </div>
    `;
    resultsContainer.style.display = 'block';
}

function removeLoader() {
    document.querySelectorAll('.loading-wizard').forEach(l => l.remove());
}

function resetSearch() {
    currentSearch++;
    searchInput.value = '';
    clearBtn.style.display = 'none';
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';
    removeLoader();
    mainElement.classList.remove('has-results');
    setUrlQuery('');
    searchInput.focus();
}

function setUrlQuery(query) {
    try {
        history.replaceState(null, '', query ? '?q=' + encodeURIComponent(query) : location.pathname);
    } catch (e) {}
}

function prettyUrl(url) {
    try {
        return decodeURIComponent(url);
    } catch (e) {
        return url;
    }
}

function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) runSearch(query, false);
});

luckyBtn.addEventListener('click', function() {
    const query = searchInput.value.trim();
    if (query) {
        runSearch(query, true);
    } else {
        location.href = 'https://pl.wikipedia.org/wiki/Specjalna:Losowa_strona';
    }
});

themeBtn.addEventListener('click', function() {
    settings.theme = (settings.theme + 1) % THEMES;
    saveSettings();
    applySettings();
});

resetBtn.addEventListener('click', function() {
    settings.theme = 0;
    saveSettings();
    applySettings();
    resetSearch();
});

logoArea.addEventListener('click', resetSearch);

searchInput.addEventListener('input', function() {
    clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
});
clearBtn.addEventListener('click', function() {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    searchInput.focus();
});

safeToggle.addEventListener('change', function() {
    settings.safe = safeToggle.checked;
    saveSettings();
});
cacheToggle.addEventListener('change', function() {
    settings.cache = cacheToggle.checked;
    if (!settings.cache) cache.clear();
    saveSettings();
});
glowToggle.addEventListener('change', function() {
    settings.glow = glowToggle.checked;
    saveSettings();
    applySettings();
});

configBtn.addEventListener('click', function() { sidebar.classList.toggle('active'); });
sidebarClose.addEventListener('click', function() { sidebar.classList.remove('active'); });
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') sidebar.classList.remove('active');
});

applySettings();

const startQuery = (new URLSearchParams(location.search).get('q') || '').trim();
if (startQuery) {
    searchInput.value = startQuery;
    clearBtn.style.display = 'block';
    runSearch(startQuery, false);
}
