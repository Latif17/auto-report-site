
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('report-form');
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    
    // UI Sections
    const pooledUserStatus = document.getElementById('pooled-user-status');
    
    let isPooledUser = false;

    // Determine if pooled user
    const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
    if (savedDataJson) {
        try {
            isPooledUser = JSON.parse(savedDataJson).shareData === true;
        } catch (e) {}
    }

    async function fetchStats() {
        try {
            const dataStr = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
            let emailQuery = '';
            if (dataStr) {
                try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.email && parsed.shareData) {
                        emailQuery = `?email=${encodeURIComponent(parsed.email)}`;
                    }
                } catch (e) {
                    console.error('Failed to parse local storage data for stats', e);
                }
            }
            const res = await fetch('/api/stats' + emailQuery);
            if (!res.ok) throw new Error('HTTP error');
            const data = await res.json();
            
            let localReported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');

            const activeSection = document.getElementById('active-incident-section');
            const newSection = document.getElementById('new-incident-section');
            const loadingSection = document.getElementById('incident-loading-section');
            
            if (loadingSection) loadingSection.classList.add('hidden');
            
            if (data.recentIncidents && data.recentIncidents.length > 0) {
                const topIncident = data.recentIncidents[0];
                const isReported = topIncident.alreadyReported || localReported.includes(topIncident.id);
                
                const tsDate = new Date(topIncident.smell_timestamp);
                const formattedDate = tsDate.toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' });
                const formattedTime = tsDate.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
                document.getElementById('active-incident-time').textContent = `${formattedDate} - ${formattedTime}`;
                document.getElementById('active-incident-location').textContent = `Reported: ${topIncident.business_location}`;
                
                const joinBtn = document.getElementById('join-incident-btn');
                if (isReported) {
                    joinBtn.textContent = 'You Logged This Event';
                    joinBtn.disabled = true;
                    joinBtn.style.opacity = '0.5';
                    joinBtn.style.cursor = 'not-allowed';
                    joinBtn.onclick = null;
                } else {
                    joinBtn.textContent = 'I smelt this too! (Join)';
                    joinBtn.disabled = false;
                    joinBtn.style.opacity = '1';
                    joinBtn.style.cursor = 'pointer';
                    joinBtn.onclick = (e) => {
                        e.preventDefault();
                        window.joinIncident(topIncident.id);
                    };
                }
                
                activeSection.classList.remove('hidden');
                newSection.classList.add('hidden');
                
                // Allow user to toggle to the new incident form
                document.getElementById('show-new-incident-btn').onclick = () => {
                    activeSection.classList.add('hidden');
                    newSection.classList.remove('hidden');
                };

                if (isPooledUser) {
                    pooledUserStatus.classList.remove('hidden');
                } else {
                    pooledUserStatus.classList.add('hidden');
                }
            } else {
                activeSection.classList.add('hidden');
                newSection.classList.remove('hidden');
                
                if (isPooledUser) {
                    pooledUserStatus.classList.remove('hidden');
                } else {
                    pooledUserStatus.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error('Failed to fetch stats', e);
        }
    }
    fetchStats();

    // Load saved data from localStorage on init
    loadSavedData();

    // Set default date and time using London local time
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
    const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });
    
    document.getElementById('dateOfSmell').value = dateFormatter.format(now);
    document.getElementById('timeOfSmell').value = timeFormatter.format(now);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Gather Data
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            postcode: document.getElementById('postcode').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            dateOfSmell: document.getElementById('dateOfSmell').value,
            timeOfSmell: document.getElementById('timeOfSmell').value,
            smellType: 'Industrial Stench',
            businessLocation: document.getElementById('businessLocation').value,
            storeLocally: document.getElementById('storeLocally').checked,
            shareData: document.getElementById('shareData').checked
        };

        // 2. Handle Local Storage
        if (formData.storeLocally) {
            const { dateOfSmell, timeOfSmell, smellType, businessLocation, ...dataToStore } = formData;
            localStorage.setItem('freshAirWatchData_v2', JSON.stringify(dataToStore));
            localStorage.removeItem('freshAirWatchData');
        } else {
            localStorage.removeItem('freshAirWatchData_v2');
            localStorage.removeItem('freshAirWatchData');
        }
        
        // Update pooled user state internally for immediate UI feedback
        isPooledUser = formData.shareData;

        const joinIncidentId = document.getElementById('joinIncidentId').value;
        const endpoint = joinIncidentId ? '/api/join' : '/api/submit';
        
        if (joinIncidentId) {
            formData.incidentId = joinIncidentId;
            // Ensure they pool data if they are joining
            formData.shareData = true; 
        }

        // 3. UI Loading State
        submitBtn.classList.add('loading');
        statusMessage.classList.add('hidden');
        statusMessage.className = 'status-message'; // Reset classes

        try {
            const response = await simulateSubmission(formData, endpoint);
            
            if (response && response.incidentId) {
                try {
                    let reported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');
                    if (!reported.includes(response.incidentId)) {
                        reported.push(response.incidentId);
                        localStorage.setItem('reported_incidents', JSON.stringify(reported));
                    }
                } catch (e) {
                    console.error('Failed to parse reported_incidents', e);
                }
            }
            fetchStats(); // Refresh stats
            
            // Success
            if (joinIncidentId) {
                statusMessage.textContent = 'Successfully joined the report. Your details have been added.';
                document.getElementById('joinIncidentId').value = '';
                document.getElementById('submit-btn-text').textContent = 'Log this smell';
            } else {
                statusMessage.textContent = formData.shareData 
                    ? 'Stink event logged successfully. Auto-reporting is active for future events.'
                    : 'Stink event logged successfully.';
            }
            statusMessage.classList.add('success');
            statusMessage.classList.remove('hidden');

        } catch (error) {
            // Error
            statusMessage.textContent = error.message || 'Failed to log stink event. Please try again.';
            statusMessage.classList.add('error');
            statusMessage.classList.remove('hidden');
        } finally {
            submitBtn.classList.remove('loading');
        }
    });

    // Helper to load data
    function loadSavedData() {
        const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
        
        if (savedDataJson) {
            try {
                const data = JSON.parse(savedDataJson);
                document.getElementById('fullName').value = data.fullName || '';
                document.getElementById('email').value = data.email || '';
                document.getElementById('postcode').value = data.postcode || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('address').value = data.address || '';

                document.getElementById('storeLocally').checked = data.storeLocally === true;
                document.getElementById('shareData').checked = data.shareData === true;

                // Trigger Returning User State if we have core details
                if (data.fullName && data.postcode) {
                    const verifiedSummary = document.getElementById('verified-summary');
                    const reporterDetails = document.getElementById('reporter-details');
                    const summaryDetails = document.getElementById('summary-details');

                    if (summaryDetails && verifiedSummary && reporterDetails) {
                        summaryDetails.textContent = `${data.fullName} - ${data.postcode}`;
                        verifiedSummary.classList.remove('hidden');
                        reporterDetails.classList.add('hidden');
                    }
                }
            } catch (e) {
                console.error("Failed to parse local storage data", e);
            }
        }
    }

    // Simulate network request
    async function simulateSubmission(data, endpoint = '/api/submit') {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            let errorMsg = 'Failed to process request. Please try again.';
            try {
                const errData = await response.json();
                if (errData && errData.error) {
                    errorMsg = errData.error;
                }
            } catch (e) {}
            throw new Error(errorMsg);
        }
        return response.json();
    }

    // Join Incident Logic
    window.joinIncident = async function(incidentId) {
        // Read DOM inputs
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const postcode = document.getElementById('postcode').value.trim();
        const address = document.getElementById('address').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const storeLocally = document.getElementById('storeLocally').checked;

        let hasValidData = false;
        let data = null;

        // Check if DOM inputs are complete
        if (fullName && email && postcode && address) {
            hasValidData = true;
            data = {
                fullName,
                email,
                postcode,
                address,
                phone,
                storeLocally,
                shareData: true
            };
        } else {
            // Fallback to localStorage
            const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
            if (savedDataJson) {
                try {
                    const parsed = JSON.parse(savedDataJson);
                    if (parsed.email && parsed.fullName && parsed.postcode && parsed.address) {
                        hasValidData = true;
                        data = {
                            fullName: parsed.fullName,
                            email: parsed.email,
                            postcode: parsed.postcode,
                            address: parsed.address,
                            phone: parsed.phone || '',
                            storeLocally: parsed.storeLocally !== false,
                            shareData: true
                        };
                    }
                } catch (e) {}
            }
        }

        if (hasValidData && data) {
            // Auto join
            submitBtn.classList.add('loading');
            statusMessage.classList.add('hidden');
            statusMessage.className = 'status-message'; // Reset classes
            try {
                // Handle Local Storage retention/removal
                if (data.storeLocally) {
                    const { shareData, ...dataToStore } = data;
                    localStorage.setItem('freshAirWatchData_v2', JSON.stringify({ ...dataToStore, storeLocally: true, shareData: true }));
                    localStorage.removeItem('freshAirWatchData');
                } else {
                    localStorage.removeItem('freshAirWatchData_v2');
                    localStorage.removeItem('freshAirWatchData');
                }

                await simulateSubmission({ ...data, incidentId }, '/api/join');
                
                let reported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');
                if (!reported.includes(incidentId)) {
                    reported.push(incidentId);
                    localStorage.setItem('reported_incidents', JSON.stringify(reported));
                }
                
                // Show success status message
                statusMessage.textContent = 'Successfully joined the report. Your details have been added.';
                statusMessage.className = 'status-message success';
                statusMessage.classList.remove('hidden');

                // Clear join states
                document.getElementById('joinIncidentId').value = '';
                document.getElementById('submit-btn-text').textContent = 'Log this smell';

                fetchStats();
            } catch (e) {
                statusMessage.textContent = e.message || 'Failed to join report. Please try again.';
                statusMessage.className = 'status-message error';
                statusMessage.classList.remove('hidden');
            } finally {
                submitBtn.classList.remove('loading');
            }
        } else {
            // Need to fill out form to join
            document.getElementById('joinIncidentId').value = incidentId;
            document.getElementById('submit-btn-text').textContent = 'Join this report';
            
            // Show message and scroll
            statusMessage.textContent = 'Please fill out your personal details below to join this report.';
            statusMessage.className = 'status-message alert-info';
            statusMessage.classList.remove('hidden');
            
            document.getElementById('reporter-details').scrollIntoView({ behavior: 'smooth' });
        }
    };
});
