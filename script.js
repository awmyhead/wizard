const searchForm = document.querySelector('.search-box');
const searchInput = document.querySelector('.search-input');
const mainElement = document.querySelector('main');
const resultsContainer = document.querySelector('.results-container');
const actionButtons = document.querySelector('.action-buttons');
const clearBtn = document.querySelector('.clear-btn');

// Instancja SearxNG - możesz zmienić na dowolną inną publiczną działającą instancję
const SEARXNG_INSTANCE = "https://searx.be"; 

if (searchForm && searchInput) {
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Blokada przeładowania strony
        
        const query = searchInput.value.trim();
        if (!query) return;

        // Przygotowanie wyglądu wyszukiwarki
        if (actionButtons) actionButtons.style.display = 'none';
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
        if (mainElement) mainElement.classList.add('has-results');

        // Czyszczenie ewentualnych starych komunikatów ładowania
        const istniejaceLoadery = document.querySelectorAll('.loading-wizard');
        istniejaceLoadery.forEach(l => l.remove());

        // Wyświetlenie fioletowej animacji ładowania
        const loader = document.createElement('div');
        loader.className = 'loading-wizard';
        loader.innerHTML = 'Destylacja wiedzy z eteru sieci... 🔮';
        mainElement.appendChild(loader);

        // Zapytanie bezpośrednio do SearxNG o format JSON (ZADZIAŁA NA SERWERZE!)
        const targetUrl = SEARXNG_INSTANCE + "/search?q=" + encodeURIComponent(query) + "&format=json&language=pl";

        fetch(targetUrl)
            .then(response => {
                if (!response.ok) throw new Error('Problem z odpowiedzią z eteru.');
                return response.json();
            })
            .then(data => {
                if (loader) loader.remove();

                const searchResults = data.results || [];

                if (resultsContainer) {
                    if (searchResults.length > 0) {
                        // Budowanie kafelków na podstawie realnych wyników z sieci
                        searchResults.forEach(item => {
                            const resultHTML = `
                                <div class="result-item">
                                    <a href="${item.url}" class="result-url-display" target="_blank">${item.url}</a>
                                    <h3 class="result-title"><a href="${item.url}" target="_blank">${item.title}</a></h3>
                                    <p class="result-snippet">${item.content || 'Brak opisu dla tego elementu.'}</p>
                                </div>
                            `;
                            resultsContainer.innerHTML += resultHTML;
                        });
                    } else {
                        resultsContainer.innerHTML = `
                            <div class="result-item" style="text-align: center; color: #94a3b8;">
                                <p class="result-snippet">Eter milczy. Nie odnaleziono zwojów odpowiadających zaklęciu: <strong>${escapeHTML(query)}</strong></p>
                            </div>
                        `;
                    }
                    resultsContainer.style.display = 'block';
                }
            })
            .catch(error => {
                if (loader) loader.remove();
                if (resultsContainer) {
                    resultsContainer.innerHTML = `
                        <div class="result-item" style="text-align: center; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05);">
                            <p class="result-snippet" style="color: #f87171;">Zakłócenia w eterze sieciowym. Zaklęcie nie powiodło się. Spróbuj ponownie później.</p>
                        </div>
                    `;
                    resultsContainer.style.display = 'block';
                }
                console.error("Błąd sieci serwera:", error);
            });
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// Obsługa ikony (X) do usuwania tekstu
if (searchInput && clearBtn) {
    searchInput.addEventListener('input', function() {
        clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
    });
}

// Obsługa wysuwania panelu Konfiguracji Czarów (Sidebar)
const configBtn = document.querySelector('.icon-btn');
const sidebar = document.querySelector('.sidebar');
const sidebarClose = document.querySelector('.sidebar-close');

if (configBtn && sidebar) {
    configBtn.addEventListener('click', function() { sidebar.classList.toggle('active'); });
}
if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', function() { sidebar.classList.remove('active'); });
}

