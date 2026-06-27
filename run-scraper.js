require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { submitGovForm } = require('./scraper');
const { randomDelay } = require('./utils');

const supabase = process.env.SUPABASE_URL 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

async function run() {
    if (!supabase) {
        console.error("Missing Supabase credentials.");
        process.exit(1);
        return;
    }

    console.log("Checking for pending incidents...");
    const { data: pendingIncidents, error: fetchError } = await supabase
        .from('incidents')
        .select('*')
        .eq('status', 'pending');

    if (fetchError) {
        console.error("Error fetching incidents:", fetchError);
        process.exit(1);
        return;
    }

    if (!pendingIncidents || pendingIncidents.length === 0) {
        console.log("No pending incidents found. Exiting.");
        process.exit(0);
        return;
    }

    for (const incident of pendingIncidents) {
        console.log(`Processing incident ${incident.id}...`);
        
        // Mark as processing
        const { error: updateProcessingError } = await supabase
            .from('incidents')
            .update({ status: 'processing' })
            .eq('id', incident.id);

        if (updateProcessingError) {
            console.error(`Error updating incident ${incident.id} to processing:`, updateProcessingError);
            continue;
        }

        // Fetch all opted-in users for this incident
        const { data: userReports, error: userReportsError } = await supabase
            .from('opted_in_user_reports')
            .select('user_email')
            .eq('incident_id', incident.id);

        if (userReportsError) {
            console.error(`Error fetching user reports for incident ${incident.id}:`, userReportsError);
            // Revert back to pending? Or just continue to next, leaving it as processing? 
            // It's probably better to just continue or set to error. Let's just log and continue.
            continue;
        }

        if (userReports && userReports.length > 0) {
            const emails = userReports.map(r => r.user_email);
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('*')
                .in('email', emails);

            if (usersError) {
                console.error(`Error fetching users for incident ${incident.id}:`, usersError);
                continue;
            }

            if (users) {
                for (const user of users) {
                    const userData = {
                        email: user.email,
                        fullName: user.full_name,
                        postcode: user.postcode,
                        phone: user.phone,
                        address: user.address
                    };
                    const tsDate = new Date(incident.smell_timestamp);
                    const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
                    const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });
                    
                    const incidentData = {
                        dateOfSmell: dateFormatter.format(tsDate),
                        timeOfSmell: timeFormatter.format(tsDate),
                        smellType: incident.smell_type,
                        businessLocation: incident.business_location
                    };
                    console.log(`Submitting report for ${userData.email}...`);
                    
                    try {
                        await submitGovForm(userData, incidentData);
                    } catch (submitError) {
                        console.error(`Error submitting form for ${userData.email}:`, submitError);
                    }
                    
                    // Add a small delay between submissions to avoid rate limits
                    console.log(`Waiting 5-15s before next submission...`);
                    await randomDelay(5000, 15000);
                }
            }
        }

        // Mark as completed
        const { error: updateCompletedError } = await supabase
            .from('incidents')
            .update({ status: 'completed' })
            .eq('id', incident.id);

        if (updateCompletedError) {
            console.error(`Error updating incident ${incident.id} to completed:`, updateCompletedError);
        } else {
            console.log(`Finished processing incident ${incident.id}.`);
        }
    }
}

if (require.main === module) {
    run().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { run };
