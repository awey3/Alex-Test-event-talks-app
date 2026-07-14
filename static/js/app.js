// Application State
let state = {
    releaseNotes: [],
    selectedNote: null, // { date, item }
    searchQuery: '',
    categoryFilter: 'all',
    isLoading: false
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    spinner: document.getElementById('spinner'),
    btnText: document.getElementById('btn-text'),
    updateCount: document.getElementById('update-count'),
    statsBadge: document.getElementById('stats-badge'),
    
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    categoryChips: document.querySelectorAll('.chip'),
    
    feedLoading: document.getElementById('feed-loading'),
    feedError: document.getElementById('feed-error'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    feedEmpty: document.getElementById('feed-empty'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    notesList: document.getElementById('release-notes-list'),
    
    shareActionBar: document.getElementById('share-action-bar'),
    selectionCount: document.getElementById('selection-count'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    closeShareBar: document.getElementById('close-share-bar'),
    tweetSelectedBtn: document.getElementById('tweet-selected-btn'),
    
    toast: document.getElementById('toast')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh Button
    elements.refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });
    
    // Retry Button
    elements.retryBtn.addEventListener('click', () => {
        fetchReleaseNotes();
    });
    
    // Search Input
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        toggleClearSearchButton();
        renderFeed();
    });
    
    // Clear Search Button
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        toggleClearSearchButton();
        renderFeed();
        elements.searchInput.focus();
    });
    
    // Category Chips
    elements.categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            elements.categoryChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.categoryFilter = chip.getAttribute('data-filter');
            renderFeed();
        });
    });
    
    // Clear Filters Button (Empty state)
    elements.clearFiltersBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        toggleClearSearchButton();
        
        elements.categoryChips.forEach(c => c.classList.remove('active'));
        document.querySelector('.chip[data-filter="all"]').classList.add('active');
        state.categoryFilter = 'all';
        
        renderFeed();
    });
    
    // Close Share Action Bar
    elements.closeShareBar.addEventListener('click', () => {
        deselectNote();
    });
    
    // Tweet Selected Button
    elements.tweetSelectedBtn.addEventListener('click', () => {
        shareOnX(elements.tweetTextarea.value);
    });
    
    // Textarea character count and validation
    elements.tweetTextarea.addEventListener('input', (e) => {
        updateCharCounter(e.target.value.length);
    });
}

// Fetch Release Notes from Flask API
async function fetchReleaseNotes(forceRefresh = false) {
    if (state.isLoading) return;
    
    setLoadingState(true);
    deselectNote();
    
    const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            state.releaseNotes = result.data;
            
            // Calculate stats
            let totalItems = 0;
            state.releaseNotes.forEach(entry => {
                totalItems += entry.items.length;
            });
            
            elements.updateCount.textContent = `${totalItems} Updates`;
            elements.statsBadge.classList.add('active');
            
            showState('list');
            renderFeed();
            
            if (forceRefresh) {
                showToast("Release notes refreshed successfully!");
            }
        } else {
            throw new Error(result.error || "Failed to load release notes");
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        elements.errorMessage.textContent = error.message;
        showState('error');
    } finally {
        setLoadingState(false);
    }
}

// Manage UI States (Loading, Error, Empty, List)
function setLoadingState(loading) {
    state.isLoading = loading;
    if (loading) {
        elements.refreshBtn.disabled = true;
        elements.refreshIcon.classList.add('hidden');
        elements.spinner.classList.remove('hidden');
        elements.btnText.textContent = "Loading...";
        showState('loading');
    } else {
        elements.refreshBtn.disabled = false;
        elements.refreshIcon.classList.remove('hidden');
        elements.spinner.classList.add('hidden');
        elements.btnText.textContent = "Refresh";
    }
}

function showState(stateName) {
    elements.feedLoading.classList.add('hidden');
    elements.feedError.classList.add('hidden');
    elements.feedEmpty.classList.add('hidden');
    elements.notesList.classList.add('hidden');
    
    if (stateName === 'loading') {
        elements.feedLoading.classList.remove('hidden');
    } else if (stateName === 'error') {
        elements.feedError.classList.remove('hidden');
    } else if (stateName === 'empty') {
        elements.feedEmpty.classList.remove('hidden');
    } else if (stateName === 'list') {
        elements.notesList.classList.remove('hidden');
    }
}

function toggleClearSearchButton() {
    if (state.searchQuery.length > 0) {
        elements.clearSearchBtn.classList.remove('hidden');
    } else {
        elements.clearSearchBtn.classList.add('hidden');
    }
}

// Render Release Notes with current Search and Category filters
function renderFeed() {
    elements.notesList.innerHTML = '';
    
    let hasMatches = false;
    
    state.releaseNotes.forEach(entry => {
        // Filter items within this date entry
        const filteredItems = entry.items.filter(item => {
            // Category check
            const matchesCategory = state.categoryFilter === 'all' || 
                item.category.toLowerCase() === state.categoryFilter.toLowerCase();
            
            // Search query check
            const matchesSearch = state.searchQuery === '' || 
                item.category.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                stripHtml(item.body).toLowerCase().includes(state.searchQuery.toLowerCase());
                
            return matchesCategory && matchesSearch;
        });
        
        // Only render date group if there are matching items
        if (filteredItems.length > 0) {
            hasMatches = true;
            
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            dateGroup.innerHTML = `
                <div class="date-header">
                    <span class="date-title">${entry.date}</span>
                    <span class="date-line"></span>
                </div>
                <div class="notes-grid"></div>
            `;
            
            const grid = dateGroup.querySelector('.notes-grid');
            
            filteredItems.forEach(item => {
                const card = createNoteCard(entry.date, item);
                grid.appendChild(card);
            });
            
            elements.notesList.appendChild(dateGroup);
        }
    });
    
    if (!hasMatches) {
        showState('empty');
    } else {
        showState('list');
    }
}

// Helper to create Note Card element
function createNoteCard(date, item) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.setAttribute('data-id', item.id);
    
    // Check if this card is currently selected
    if (state.selectedNote && state.selectedNote.item.id === item.id) {
        card.classList.add('selected');
    }
    
    const catClass = getCategoryClass(item.category);
    
    card.innerHTML = `
        <div class="card-top">
            <div class="card-badge-row">
                <span class="badge ${catClass}">${item.category}</span>
            </div>
            <div class="select-checkbox-container">
                <svg class="checkmark-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        </div>
        <div class="card-body">
            ${item.body}
        </div>
        <div class="card-actions">
            <button class="btn-card-tweet" title="Immediately Tweet this update">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>Quick Tweet</span>
            </button>
        </div>
    `;
    
    // Prevent Quick Tweet button from triggering card selection
    const tweetBtn = card.querySelector('.btn-card-tweet');
    tweetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const defaultTweet = generateDefaultTweet(date, item);
        shareOnX(defaultTweet);
    });
    
    // Select Card on click
    card.addEventListener('click', () => {
        toggleNoteSelection(date, item);
    });
    
    return card;
}

// Categorize and style badges
function getCategoryClass(category) {
    const cat = category.toLowerCase();
    if (cat.includes('feature') || cat.includes('addition')) return 'feature';
    if (cat.includes('security') || cat.includes('vuln')) return 'security';
    if (cat.includes('change') || cat.includes('update') || cat.includes('modify')) return 'change';
    if (cat.includes('deprecat') || cat.includes('remove')) return 'deprecation';
    return 'default';
}

// Toggle release note selection
function toggleNoteSelection(date, item) {
    const isAlreadySelected = state.selectedNote && state.selectedNote.item.id === item.id;
    
    if (isAlreadySelected) {
        deselectNote();
    } else {
        // Deselect previous card in DOM
        if (state.selectedNote) {
            const prevCard = document.querySelector(`.note-card[data-id="${state.selectedNote.item.id}"]`);
            if (prevCard) prevCard.classList.remove('selected');
        }
        
        state.selectedNote = { date, item };
        
        // Select new card in DOM
        const newCard = document.querySelector(`.note-card[data-id="${item.id}"]`);
        if (newCard) newCard.classList.add('selected');
        
        // Show share action bar and generate tweet
        elements.selectionCount.textContent = "1";
        const tweetText = generateDefaultTweet(date, item);
        elements.tweetTextarea.value = tweetText;
        updateCharCounter(tweetText.length);
        
        elements.shareActionBar.classList.remove('hidden');
    }
}

function deselectNote() {
    if (state.selectedNote) {
        const card = document.querySelector(`.note-card[data-id="${state.selectedNote.item.id}"]`);
        if (card) card.classList.remove('selected');
    }
    state.selectedNote = null;
    elements.shareActionBar.classList.add('hidden');
}

// Generate X (Twitter) ready tweet content
function generateDefaultTweet(date, item) {
    const prefix = `BigQuery [${item.category}] (${date}): `;
    const suffix = `\n\n#BigQuery #GCP #Cloud`;
    
    // Clean description body (strip HTML tags, parse <code> formatting)
    let cleanDesc = parseHtmlToTwitterText(item.body);
    
    // Calculate limits
    const maxDescLength = 280 - prefix.length - suffix.length;
    
    if (cleanDesc.length > maxDescLength) {
        cleanDesc = cleanDesc.substring(0, maxDescLength - 3) + "...";
    }
    
    return `${prefix}${cleanDesc}${suffix}`;
}

// Parse HTML structure into markdown/clean text suitable for X
function parseHtmlToTwitterText(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    // Highlight codes with markdown backticks
    const codes = tempDiv.getElementsByTagName("code");
    for (let i = codes.length - 1; i >= 0; i--) {
        const codeText = codes[i].textContent || codes[i].innerText;
        codes[i].innerText = `\`${codeText}\``;
    }
    
    // Try to format links nicely - e.g. text (URL) or just text
    const links = tempDiv.getElementsByTagName("a");
    for (let i = links.length - 1; i >= 0; i--) {
        const linkText = links[i].textContent || links[i].innerText;
        const linkUrl = links[i].getAttribute('href');
        // If it is a relative GCP link, resolve it
        let resolvedUrl = linkUrl;
        if (linkUrl && linkUrl.startsWith('/')) {
            resolvedUrl = `https://cloud.google.com${linkUrl}`;
        }
        
        // If we have a URL, add it. Keep it brief.
        if (resolvedUrl && !resolvedUrl.includes('product-launch-stages')) {
            links[i].innerText = `${linkText} (${resolvedUrl})`;
        } else {
            links[i].innerText = linkText;
        }
    }
    
    let text = tempDiv.textContent || tempDiv.innerText || "";
    
    // Clean up whitespace, consecutive spaces, and formatting
    text = text.replace(/\s+/g, " ").trim();
    
    return text;
}

// Strip HTML tags for search matching
function stripHtml(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
}

// Update Character Counter
function updateCharCounter(length) {
    elements.charCounter.textContent = `${length}/280`;
    
    elements.charCounter.classList.remove('warning', 'danger');
    elements.tweetSelectedBtn.disabled = false;
    
    if (length > 280) {
        elements.charCounter.classList.add('danger');
        elements.tweetSelectedBtn.disabled = true;
    } else if (length > 250) {
        elements.charCounter.classList.add('warning');
    }
}

// Open Twitter Web Intent URL
function shareOnX(text) {
    const encodedText = encodeURIComponent(text);
    const url = `https://x.com/intent/tweet?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    
    showToast("Opening X (Twitter) to share your update!");
}

// Toast notification helper
let toastTimeout;
function showToast(message) {
    clearTimeout(toastTimeout);
    elements.toast.textContent = message;
    elements.toast.classList.remove('hidden');
    
    toastTimeout = setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3500);
}
