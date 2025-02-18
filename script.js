document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const themeSwitch = document.getElementById('theme-switch');
    const urlForm = document.getElementById('url-form');
    const lookupForm = document.getElementById('lookup-form');
    const longUrlInput = document.getElementById('long-url');
    const shortUrlInput = document.getElementById('short-url');
    const customAliasToggle = document.getElementById('custom-alias-toggle');
    const customAliasInput = document.getElementById('custom-alias');
    const customAliasDiv = document.querySelector('.custom-alias');
    const resultContainer = document.querySelector('.result-container');
    const lookupResultContainer = document.querySelector('.lookup-result-container');
    const shortenedUrl = document.getElementById('shortened-url');
    const originalUrl = document.getElementById('original-url');
    const copyBtn = document.getElementById('copy-btn');
    const copyOriginalBtn = document.getElementById('copy-original-btn');
    const copyToast = document.getElementById('copy-toast');
    const errorContainer = document.querySelector('.error-container');
    const lookupErrorContainer = document.querySelector('.lookup-error-container');
    const errorText = document.getElementById('error-text');
    const lookupErrorText = document.getElementById('lookup-error-text');
    const loader = document.querySelector('.loader');
    const lookupLoader = document.querySelector('.lookup-loader');
    const creationDate = document.getElementById('creation-date');
    const totalClicks = document.getElementById('total-clicks');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const serviceRadios = document.querySelectorAll('input[name="service"]');

    // Initialize theme
    if (localStorage.getItem('darkTheme') === 'true') {
        document.body.classList.add('dark-theme');
        themeSwitch.checked = true;
    }

    // Initialize selected service
    const savedService = localStorage.getItem('selectedService');
    if (savedService) {
        document.querySelector(`input[value="${savedService}"]`).checked = true;
    }

    // Theme toggle
    themeSwitch.addEventListener('change', function() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
    });

    // Service selection
    serviceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            localStorage.setItem('selectedService', this.value);
        });
    });

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Change active button
            tabBtns.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show active content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // Custom alias toggle
    customAliasToggle.addEventListener('change', function() {
        customAliasDiv.style.display = this.checked ? 'block' : 'none';
        if (!this.checked) {
            customAliasInput.value = '';
        }
    });

    // URL Shortening Form
    urlForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset previous results
        errorContainer.style.display = 'none';
        resultContainer.style.display = 'none';
        loader.style.display = 'block';
        
        // Get form values
        const longUrl = longUrlInput.value.trim();
        const customAlias = customAliasToggle.checked ? customAliasInput.value.trim() : '';
        const selectedService = document.querySelector('input[name="service"]:checked').value;
        
        try {
            // Input validation
            if (!isValidUrl(longUrl)) {
                throw new Error('Please enter a valid URL starting with http:// or https://');
            }
            
            if (customAlias && !/^[A-Za-z0-9_-]+$/.test(customAlias)) {
                throw new Error('Custom alias can only contain letters, numbers, hyphens, and underscores');
            }
            
            // Build API URL
            let apiUrl = `https://${selectedService}/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
            if (customAlias) {
                apiUrl += `&shorturl=${encodeURIComponent(customAlias)}`;
            }
            
            // Fetch shortened URL
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.shorturl) {
                shortenedUrl.textContent = data.shorturl;
                shortenedUrl.href = data.shorturl;
                resultContainer.style.display = 'block';
            } else if (data.errorcode) {
                throw new Error(data.errormessage || `An error occurred while shortening the URL with ${selectedService}`);
            } else {
                throw new Error(`Unknown error occurred with ${selectedService}`);
            }
            
        } catch (error) {
            errorText.textContent = error.message;
            errorContainer.style.display = 'block';
        } finally {
            loader.style.display = 'none';
        }
    });

    // Lookup Form
    lookupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset previous results
        lookupErrorContainer.style.display = 'none';
        lookupResultContainer.style.display = 'none';
        lookupLoader.style.display = 'block';
        
        // Get form values
        const shortUrl = shortUrlInput.value.trim();
        
        try {
            // Input validation
            if (!isValidShortUrl(shortUrl)) {
                throw new Error('Please enter a valid v.gd or is.gd URL');
            }
            
            // Determine which service to use based on the URL
            const urlObj = new URL(shortUrl);
            const service = urlObj.hostname;
            
            // Build API URL for lookup
            const apiUrl = `https://${service}/forward.php?format=json&shorturl=${encodeURIComponent(shortUrl)}`;
            
            // Fetch original URL
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.url) {
                originalUrl.textContent = data.url;
                originalUrl.href = data.url;
                
                // Display additional info if available
                if (data.created) {
                    const date = new Date(data.created * 1000);
                    creationDate.textContent = `Created: ${date.toLocaleString()}`;
                    creationDate.style.display = 'block';
                } else {
                    creationDate.style.display = 'none';
                }
                
                if (data.total_clicks !== undefined) {
                    totalClicks.textContent = `Total Clicks: ${data.total_clicks}`;
                    totalClicks.style.display = 'block';
                } else {
                    totalClicks.style.display = 'none';
                }
                
                lookupResultContainer.style.display = 'block';
            } else if (data.errorcode) {
                throw new Error(data.errormessage || `An error occurred while looking up the URL with ${service}`);
            } else {
                throw new Error(`Unknown error occurred with ${service}`);
            }
            
        } catch (error) {
            lookupErrorText.textContent = error.message;
            lookupErrorContainer.style.display = 'block';
        } finally {
            lookupLoader.style.display = 'none';
        }
    });

    // Copy buttons
    copyBtn.addEventListener('click', function() {
        copyToClipboard(shortenedUrl.textContent);
    });
    
    copyOriginalBtn.addEventListener('click', function() {
        copyToClipboard(originalUrl.textContent);
    });

    // Helper functions
    function isValidUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return ['http:', 'https:'].includes(parsedUrl.protocol);
        } catch (e) {
            return false;
        }
    }
    
    function isValidShortUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return ['http:', 'https:'].includes(parsedUrl.protocol) &&
                  (parsedUrl.hostname === 'v.gd' || parsedUrl.hostname === 'is.gd');
        } catch (e) {
            return false;
        }
    }
    
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showCopyToast();
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                showCopyToast();
            } catch (err) {
                console.error('Failed to copy: ', err);
                alert('Failed to copy to clipboard');
            }
            
            document.body.removeChild(textArea);
        }
    }
    
    function showCopyToast() {
        copyToast.classList.add('show');
        setTimeout(() => {
            copyToast.classList.remove('show');
        }, 2000);
    }
});