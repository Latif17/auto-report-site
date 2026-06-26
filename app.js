document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('report-form');
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    
    async function fetchStats() {
        try {
            const res = await fetch('http://localhost:3000/api/stats');
            if (!res.ok) throw new Error('HTTP error');
            const data = await res.json();
            document.getElementById('opted-in-count').innerText = data.count;
            document.getElementById('submit-btn-text').innerText = `Submit & Trigger ${data.count} Community Reports`;
            
            if (data.lastReport) {
                const lastDate = new Date(data.lastReport);
                document.getElementById('last-report-time').innerText = lastDate.toLocaleTimeString();
                
                // Check if > 2 hours
                const diffHours = (new Date() - lastDate) / (1000 * 60 * 60);
                if (diffHours > 2) {
                    document.getElementById('active-alert').style.display = 'block';
                }
            } else {
                document.getElementById('active-alert').style.display = 'block';
            }
        } catch (e) {
            console.error('Failed to fetch stats');
            const statsEl = document.getElementById('community-stats');
            if (statsEl) statsEl.style.display = 'none';
        }
    }
    fetchStats();

    // Load saved data from localStorage on init
    loadSavedData();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Gather Data
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            postcode: document.getElementById('postcode').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            timeOfSmell: document.getElementById('timeOfSmell').value,
            storeLocally: document.getElementById('storeLocally').checked,
            shareData: document.getElementById('shareData').checked
        };

        // 2. Handle Local Storage
        if (formData.storeLocally) {
            // Exclude timeOfSmell from what gets stored
            const { timeOfSmell, ...dataToStore } = formData;
            localStorage.setItem('freshAirWatchData_v2', JSON.stringify(dataToStore));
            // Cleanup old version
            localStorage.removeItem('freshAirWatchData');
        } else {
            localStorage.removeItem('freshAirWatchData_v2');
            localStorage.removeItem('freshAirWatchData');
        }

        // 3. UI Loading State
        submitBtn.classList.add('loading');
        statusMessage.classList.add('hidden');
        statusMessage.className = 'status-message'; // Reset classes

        // Simulate API call / Form submission logic
        try {
            await simulateSubmission(formData);
            
            // Success
            statusMessage.textContent = formData.shareData 
                ? 'Report successfully submitted, and your data is shared for automated reporting!'
                : 'Report successfully submitted!';
            statusMessage.classList.add('success');
            statusMessage.classList.remove('hidden');

            // Optional: Generate pre-filled URL or interact with the .gov.uk form directly
            // In a real application we would push the payload to a backend service here.
            
        } catch (error) {
            // Error
            statusMessage.textContent = 'Failed to submit report. Please try again.';
            statusMessage.classList.add('error');
            statusMessage.classList.remove('hidden');
        } finally {
            submitBtn.classList.remove('loading');
        }
    });

    // Helper to load data
    function loadSavedData() {
        // Look for new v2 data, fallback to v1 if v2 doesn't exist
        const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
        if (savedDataJson) {
            try {
                const data = JSON.parse(savedDataJson);
                document.getElementById('fullName').value = data.fullName || '';
                document.getElementById('email').value = data.email || '';
                document.getElementById('postcode').value = data.postcode || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('address').value = data.address || '';

                // Set checkboxes
                document.getElementById('storeLocally').checked = data.storeLocally !== false;
                document.getElementById('shareData').checked = data.shareData === true;
            } catch (e) {
                console.error("Failed to parse local storage data", e);
            }
        }
    }

    // Simulate network request
    async function simulateSubmission(data) {
        const response = await fetch('http://localhost:3000/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }
});
