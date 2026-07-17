const { submitGovForm } = require('./scraper');

async function runLocalTest() {
    console.log("Starting local test without Supabase...");

    // Mock user data. The '@example.com' email triggers TEST_MODE in scraper.js,
    // which prevents the scraper from actually clicking the final "Send report" button.
    const mockUserData = {
        email: "testuser@example.com",
        full_name: "Jane Doe",
        phone: "07700 900000",
        address: "123 Riverside Way",
        postcode: "IG11 0YP"
    };

    // Change these values to test different mapping logic
    // Options for smell_type: 'Rubbish or refuse', 'Sewage', 'Something else'
    // Options for business_location: 
    // - 'Multiple (ReFood, East London Bio Gas)'
    // - 'Multiple (Beckton, Riverside, Crossness)'
    // - 'Veolia Dagenham (Plastics)'
    // Calculate a time 10 minutes in the past to satisfy GOV.UK validation
    const pastDate = new Date(Date.now() - 10 * 60000);
    const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
    const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });

    const mockIncidentData = {
        smellType: "Something else",
        businessLocation: "Veolia Dagenham (Plastics)",
        dateOfSmell: dateFormatter.format(pastDate),
        timeOfSmell: timeFormatter.format(pastDate)
    };

    try {
        // We set SHOW_BROWSER=true programmatically so the UI pops up
        process.env.SHOW_BROWSER = 'true';
        
        await submitGovForm(mockUserData, mockIncidentData);
        console.log("Local test completed successfully!");
    } catch (error) {
        console.error("Local test failed:", error);
    }
}

runLocalTest();
