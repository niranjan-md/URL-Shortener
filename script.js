document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const themeSwitch = document.getElementById('theme-switch');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Shorten Form Elements
    const urlForm = document.getElementById('url-form');
    const longUrlInput = document.getElementById('long-url');
    const customAliasToggle = document.getElementById('custom-alias-toggle');
    const aliasWrapper = document.getElementById('alias-wrapper');
    const customAliasInput = document.getElementById('custom-alias');
    const servicePrefix = document.getElementById('service-prefix');
    const serviceRadios = document.querySelectorAll('input[name="service"]');
    
    // Shorten Result Elements
    const shortenLoader = document.getElementById('shorten-loader');
    const shortenResult = document.getElementById('shorten-result');
    const shortenError = document.getElementById('shorten-error');
    const errorText = document.getElementById('error-text');
    const shortenedUrl = document.getElementById('shortened-url');
    const qrCodeContainer = document.getElementById('qrcode');
    
    // Lookup Elements
    const lookupForm = document.getElementById('lookup-form');
    const shortUrlInput = document.getElementById('short-url');
    const lookupLoader = document.getElementById('lookup-loader');
    const lookupResult = document.getElementById('lookup-result');
    const lookupError = document.getElementById('lookup-error');
    const lookupErrorText = document.getElementById('lookup-error-text');
    const originalUrl = document.getElementById('original-url');
    
    // History & Utility Elements
    const toast = document.getElementById('toast');
    const historyContainer = document.getElementById('history-container');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');

    // State
    let qrCodeInstance = null;
    let linkHistory = JSON.parse(localStorage.getItem('tinyLinksHistory')) || [];

    // --- Initialization ---
    initTheme();
    renderHistory();
    setupGlobalRipple();

    // --- Event Listeners ---
    
    // Theme Toggle
    themeSwitch.addEventListener('change', function() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
    });

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Custom Alias Toggle & Smooth Animation
    customAliasToggle.addEventListener('change', function() {
        if (this.checked) {
            aliasWrapper.classList.add('open');
            customAliasInput.focus();
        } else {
            aliasWrapper.classList.remove('open');
            customAliasInput.value = '';
        }
    });

    // Update prefix when switching services
    serviceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            let val = this.value;
            if(val === 'tinyurl') val = 'tinyurl.com';
            servicePrefix.textContent = val + '/';
        });
    });

    // --- Shorten Logic ---
    urlForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset UI Safely
        shortenError.style.display = 'none';
        shortenResult.style.display = 'none';
        shortenLoader.style.display = 'flex';
        
        let longUrl = longUrlInput.value.trim();
        const customAlias = customAliasToggle.checked ? customAliasInput.value.trim() : '';
        const selectedService = document.querySelector('input[name="service"]:checked').value;
        
        // Auto-prepend https:// if missing
        if (!/^https?:\/\//i.test(longUrl)) {
            longUrl = 'https://' + longUrl;
        }
        
        try {
            if (!isValidUrl(longUrl)) throw new Error('Please enter a valid URL.');
            
            let finalShortUrl = "";

            if (selectedService === 'tinyurl') {
                let apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
                if (customAlias) apiUrl += `&alias=${encodeURIComponent(customAlias)}`;
                
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Alias might be taken or TinyURL failed.');
                const textResult = await response.text();
                
                if (textResult.startsWith('http')) {
                    finalShortUrl = textResult;
                } else {
                    throw new Error('Failed to generate TinyURL.');
                }
            } 
            else {
                let apiUrl = `https://${selectedService}/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
                if (customAlias) apiUrl += `&shorturl=${encodeURIComponent(customAlias)}`;
                
                const response = await fetch(apiUrl);
                const data = await response.json();
                
                if (data.shorturl) {
                    finalShortUrl = data.shorturl;
                } else if (data.errormessage) {
                    throw new Error(data.errormessage);
                } else {
                    throw new Error(`Service error via ${selectedService}`);
                }
            }

            // Success Handler
            shortenedUrl.textContent = finalShortUrl;
            shortenedUrl.href = finalShortUrl;
            generateQRCode(finalShortUrl);
            saveToHistory(longUrl, finalShortUrl);
            
            shortenResult.style.display = 'block';
            longUrlInput.value = ''; 
            
        } catch (error) {
            let errorMsg = error.message;
            if (errorMsg === "Failed to fetch") {
                errorMsg = "Network error. Please check your connection or disable adblockers.";
            }
            errorText.textContent = errorMsg;
            shortenError.style.display = 'flex';
        } finally {
            shortenLoader.style.display = 'none';
        }
    });

    // --- Lookup Logic ---
    lookupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        lookupError.style.display = 'none';
        lookupResult.style.display = 'none';
        lookupLoader.style.display = 'flex';
        
        let shortUrl = shortUrlInput.value.trim();
        if (!/^https?:\/\//i.test(shortUrl)) shortUrl = 'https://' + shortUrl;
        
        try {
            const parsedUrl = new URL(shortUrl);
            if (!['v.gd', 'is.gd'].includes(parsedUrl.hostname)) {
                throw new Error('Only is.gd or v.gd links are supported for lookup currently.');
            }
            
            const service = parsedUrl.hostname;
            const apiUrl = `https://${service}/forward.php?format=json&shorturl=${encodeURIComponent(shortUrl)}`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.url) {
                originalUrl.textContent = data.url;
                originalUrl.href = data.url;
                lookupResult.style.display = 'block';
            } else {
                throw new Error(data.errormessage || 'URL not found or invalid.');
            }
        } catch (error) {
            let errorMsg = error.message;
            if (errorMsg === "Failed to fetch") errorMsg = "Network error. Make sure the URL is correct.";
            lookupErrorText.textContent = errorMsg || 'Invalid URL format.';
            lookupError.style.display = 'flex';
        } finally {
            lookupLoader.style.display = 'none';
        }
    });

    // --- Bulletproof Copy Handlers ---
    
    // Main result copy buttons
    document.getElementById('copy-btn').addEventListener('click', function() { 
        copyText(shortenedUrl.textContent, this); 
    });
    
    document.getElementById('copy-original-btn').addEventListener('click', function() { 
        copyText(originalUrl.textContent, this); 
    });

    // History copy buttons (Using event delegation so dynamic buttons always work)
    historyList.addEventListener('click', function(e) {
        const btn = e.target.closest('.copy-history-btn');
        if (btn) {
            copyText(btn.getAttribute('data-url'), btn);
        }
    });

    // Core copy function with file:// fallback
    async function copyText(text, btnElement) {
        if (!text) return;
        
        const triggerSuccessUI = () => {
            showToast();
            if (btnElement) {
                const icon = btnElement.querySelector('i');
                if (icon) {
                    const originalClass = icon.className;
                    icon.className = 'fas fa-check';
                    icon.style.color = 'var(--success)';
                    setTimeout(() => {
                        icon.className = originalClass;
                        icon.style.color = '';
                    }, 2000);
                }
            }
        };

        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                triggerSuccessUI();
                return;
            } catch (err) {
                console.warn('Modern clipboard failed, falling back...');
            }
        }
        
        // Fallback for file:// execution or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Make it invisible
        textArea.style.position = "fixed";
        textArea.style.top = "-999999px";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            triggerSuccessUI();
        } catch (err) {
            console.error('Fallback copy failed', err);
            alert("Failed to copy link automatically. Please select the text and copy manually.");
        }
        
        textArea.remove();
    }

    // --- Helper Functions ---
    function initTheme() {
        if (localStorage.getItem('darkTheme') === 'true' || 
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('darkTheme'))) {
            document.body.classList.add('dark-theme');
            themeSwitch.checked = true;
        }
    }

    function isValidUrl(string) {
        try { new URL(string); return true; } catch (_) { return false; }
    }

    function generateQRCode(url) {
        qrCodeContainer.innerHTML = ''; 
        qrCodeInstance = new QRCode(qrCodeContainer, {
            text: url,
            width: 100,
            height: 100,
            colorDark : "#2c2f33", 
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.M
        });
    }

    function showToast() {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // Fixed Ripple Logic (Non-destructive Event Delegation)
    function setupGlobalRipple() {
        document.body.addEventListener('mousedown', function(e) {
            const btn = e.target.closest('.btn-animate');
            if (!btn) return;

            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    }

    // --- History Functions ---
    function saveToHistory(longUrl, shortUrl) {
        linkHistory = linkHistory.filter(item => item.shortUrl !== shortUrl);
        linkHistory.unshift({ longUrl, shortUrl });
        
        if (linkHistory.length > 5) linkHistory.pop();
        
        localStorage.setItem('tinyLinksHistory', JSON.stringify(linkHistory));
        renderHistory();
    }

    function renderHistory() {
        if (linkHistory.length === 0) {
            historyContainer.style.display = 'none';
            return;
        }

        historyContainer.style.display = 'block';
        historyList.innerHTML = '';

        linkHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-links">
                    <a href="${item.shortUrl}" target="_blank" class="history-short">${item.shortUrl}</a>
                    <span class="history-long" title="${item.longUrl}">${item.longUrl}</span>
                </div>
                <button class="icon-btn btn-animate copy-history-btn" data-url="${item.shortUrl}" title="Copy"><i class="fas fa-copy"></i></button>
            `;
            historyList.appendChild(div);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        linkHistory = [];
        localStorage.removeItem('tinyLinksHistory');
        renderHistory();
    });
});