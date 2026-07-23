document.addEventListener('DOMContentLoaded', () => {
    // Inject the FAB and Menu HTML into the DOM
    const navHTML = `
        <div id="fab-nav-container">
            <div id="fab-menu" class="hidden">
                <nav class="fab-menu-links">
                    <a href="/" class="primary-link">Home (Log Smell)</a>
                    <a href="/dashboard.html">Dashboard</a>
                    <a href="/manage.html">Manage My Data</a>
                    <a href="/feedback.html">Feedback</a>
                    <a href="/changelog.html">Changelog</a>
                    <a href="/privacy.html">Privacy Policy</a>
                    <a href="/promise.html">Data Promise</a>
                    <a href="https://report-an-environmental-problem.service.gov.uk/smell/source" target="_blank" rel="noopener noreferrer">Official GOV.UK Form</a>
                    <a href="https://github.com/Latif17/auto-report-site" target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
                </nav>
            </div>
            <button id="fab-button" aria-label="Menu" aria-expanded="false">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    // Append to dossier-container if it exists, otherwise body
    const container = document.querySelector('.dossier-container') || document.body;
    container.insertAdjacentHTML('beforeend', navHTML);

    const fabBtn = document.getElementById('fab-button');
    const fabMenu = document.getElementById('fab-menu');

    fabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = fabMenu.classList.contains('hidden');
        if (isHidden) {
            fabMenu.classList.remove('hidden');
            fabBtn.setAttribute('aria-expanded', 'true');
            // Change icon to X
            fabBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
        } else {
            fabMenu.classList.add('hidden');
            fabBtn.setAttribute('aria-expanded', 'false');
            // Change back to hamburger
            fabBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            `;
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!fabBtn.contains(e.target) && !fabMenu.contains(e.target) && !fabMenu.classList.contains('hidden')) {
            fabBtn.click(); // Trigger the close logic
        }
    });

    // Highlight current page
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    const menuLinks = document.querySelectorAll('.fab-menu-links a');
    menuLinks.forEach(link => {
        try {
            const url = new URL(link.href);
            if (url.origin === window.location.origin) {
                const linkPath = url.pathname.replace(/\/index\.html$/, '/');
                if (linkPath === currentPath) {
                    link.classList.add('active');
                }
            }
        } catch (e) {}
    });
});

// Fetch and display latest version in header
async function updateVersionDisplay() {
    try {
        const response = await fetch('/changelog.json');
        if (!response.ok) throw new Error('Failed to fetch changelog');
        const data = await response.json();
        const latestVersion = data[0].version;
        
        const versionDisplays = document.querySelectorAll('#version-display');
        versionDisplays.forEach(el => {
            el.textContent = 'STINK LOG // ' + latestVersion;
        });
    } catch (error) {
        console.error('Error fetching version:', error);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    updateVersionDisplay();
});

