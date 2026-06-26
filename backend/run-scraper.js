require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { submitGovForm } = require('./scraper');

const supabase = process.env.SUPABASE_URL 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

async function run() {
    if (!supabase) {
        console.error("Missing Supabase credentials.");
        process.exit(1);
    }

    console.log("Checking for pending incidents...");
    const { data: pendingIncidents, error: fetchError } = await supabase
        .from('incidents')
        .select('*')
        .eq('status', 'pending');

    if (fetchError) {
        console.error("Error fetching incidents:", fetchError);
        process.exit(1);
    }

    if (!pendingIncidents || pendingIncidents.length === 0) {
        console.log("No pending incidents found. Exiting.");
        process.exit(0);
    }

    for (const incident of pendingIncidents) {
        console.log(`Processing incident ${incident.id}...`);
        
        // Mark as processing
        await supabase.from('incidents').update({ status: 'processing' }).eq('id', incident.id);

        // Fetch all opted-in users for this incident
        const { data: userReports } = await supabase
            .from('opted_in_user_reports')
            .select('user_email')
            .eq('incident_id', incident.id);

        if (userReports && userReports.length > 0) {
            const emails = userReports.map(r => r.user_email);
            const { data: users } = await supabase.from('users').select('*').in('email', emails);

            if (users) {
                for (const user of users) {
                    const userData = {
                        email: user.email,
                        fullName: user.full_name,
                        postcode: user.postcode,
                        phone: user.phone,
                        address: user.address
                    };
                    const incidentData = {
                        timeOfSmell: incident.time_of_smell,
                        smellType: incident.smell_type,
                        businessLocation: incident.business_location
                    };
                    console.log(`Submitting report for ${userData.email}...`);
                    await submitGovForm(userData, incidentData);
                    // Add a small delay between submissions to avoid rate limits
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }

        // Mark as completed
        await supabase.from('incidents').update({ status: 'completed' }).eq('id', incident.id);
        console.log(`Finished processing incident ${incident.id}.`);
    }
}

run().catch(console.error);
