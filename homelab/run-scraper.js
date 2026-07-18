require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { submitGovForm } = require('./scraper');
const { randomDelay } = require('./utils');

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

async function processQueue() {
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
        if (process.env.DAEMON_MODE !== 'true') {
            process.exit(1);
        }
        return;
    }

    if (!pendingIncidents || pendingIncidents.length === 0) {
        if (process.env.DAEMON_MODE === 'true') {
            console.log("No pending incidents found.");
        } else {
            console.log("No pending incidents found. Exiting.");
            process.exit(0);
        }
        return;
    }

    // --- BATCH FETCH DATA TO PREVENT N+1 QUERIES ---
    const incidentIds = pendingIncidents.map(i => i.id);
    const { data: allUserReports, error: reportsError } = await supabase
        .from('opted_in_user_reports')
        .select('incident_id, user_email')
        .in('incident_id', incidentIds);

    if (reportsError) {
        console.error("Error fetching opted-in user reports:", reportsError);
        if (process.env.DAEMON_MODE !== 'true') {
            process.exit(1);
        }
        return;
    }

    const explicitEmails = (allUserReports || []).map(r => r.user_email);
    
    const { data: pooledUsersRecord, error: pooledError } = await supabase
        .from('users')
        .select('email')
        .eq('pool_data', true);
        
    if (pooledError) {
        console.error("Error fetching pooled users:", pooledError);
        if (process.env.DAEMON_MODE !== 'true') {
            process.exit(1);
        }
        return;
    }
    
    const pooledEmails = (pooledUsersRecord || []).map(u => u.email);
    
    const allEmails = [...new Set([...explicitEmails, ...pooledEmails])];
    
    let allUsers = [];
    if (allEmails.length > 0) {
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .in('email', allEmails);
        if (usersError) {
            console.error("Error fetching user details by emails:", usersError);
            if (process.env.DAEMON_MODE !== 'true') {
                process.exit(1);
            }
            return;
        }
        allUsers = usersData || [];
    }

    const usersByEmail = (allUsers || []).reduce((acc, user) => { acc[user.email] = user; return acc; }, {});
    
    const emailsByIncidentId = {};
    for (const incident of pendingIncidents) {
        const explicitForIncident = (allUserReports || []).filter(r => r.incident_id === incident.id).map(r => r.user_email);
        emailsByIncidentId[incident.id] = [...new Set([...explicitForIncident, ...pooledEmails])];
    }
    // --- END BATCH FETCH ---

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

        const { data: completedReports } = await supabase
            .from('opted_in_user_reports')
            .select('user_email')
            .eq('incident_id', incident.id)
            .eq('status', 'completed');
            
        const completedEmails = new Set((completedReports || []).map(r => r.user_email));
        const incidentEmails = (emailsByIncidentId[incident.id] || []).filter(e => !completedEmails.has(e));
        
        let users = [];
        const successfulUsers = [];
        if (incidentEmails.length > 0) {
            users = incidentEmails.map(e => usersByEmail[e]).filter(Boolean);
            
            if (users && users.length > 0) {
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
                        const success = await submitGovForm(userData, incidentData);
                        if (success) {
                            successfulUsers.push(user);
                            
                            // Mark report as completed in opted_in_user_reports
                            // Upsert ensures we update if it exists or insert if they were pooled and not in the table
                            const { error: completeLinkError } = await supabase
                                .from('opted_in_user_reports')
                                .upsert({ 
                                    incident_id: incident.id, 
                                    user_email: user.email,
                                    status: 'completed',
                                    submitted_at: new Date().toISOString()
                                }, { onConflict: 'user_email, incident_id' });
                                
                            if (completeLinkError) {
                                console.error(`Error marking report complete for ${user.email}:`, completeLinkError);
                            }
                        } else {
                            console.error(`Failed to submit report for ${userData.email}. Will keep user/report in queue.`);
                        }
                    } catch (submitError) {
                        console.error(`Error submitting form for ${userData.email}:`, submitError);
                    }
                    
                    // Add a small delay between submissions to avoid rate limits
                    console.log(`Waiting 5-15s before next submission...`);
                    await randomDelay(5000, 15000);
                }
            }
        }

        // Cleanup unpooled users who successfully submitted
        const unpooledProcessed = successfulUsers.filter(u => !u.pool_data).map(u => u.email);
        if (unpooledProcessed.length > 0) {
            const { data: deletedRows, error: cleanupError } = await supabase.rpc('cleanup_unpooled_users', {
                p_emails: unpooledProcessed,
                p_exclude_incident_id: incident.id
            });

            if (cleanupError) {
                console.error("Error cleaning up unpooled users:", cleanupError);
            } else {
                console.log(`Deleted ${(deletedRows || []).length} unpooled user record(s)...`);
            }
        }

        // Mark incident status based on whether all submissions succeeded
        const allSucceeded = successfulUsers.length === users.length;
        const targetStatus = allSucceeded ? 'completed' : 'pending';
        console.log(`Incident ${incident.id} processed: ${successfulUsers.length}/${users.length} succeeded. Setting status to: ${targetStatus}`);
        
        let query = supabase.from('incidents').update({ status: targetStatus }).eq('id', incident.id);
        
        // If we are trying to mark it completed, only do so if it hasn't been flipped back to pending by a new joiner
        if (targetStatus === 'completed') {
            query = query.eq('status', 'processing');
        }

        const { error: updateStatusError } = await query;

        if (updateStatusError) {
            console.error(`Error updating incident ${incident.id} to ${targetStatus}:`, updateStatusError);
        } else {
            console.log(`Finished processing incident ${incident.id}.`);
        }
    }
}

async function run() {
    console.log("Starting scraper worker...");
    if (process.env.DAEMON_MODE === 'true') {
        console.log("Daemon mode active. Polling every 2 minutes.");
        while(true) {
            await processQueue();
            await new Promise(r => setTimeout(r, 120000));
        }
    } else {
        await processQueue();
    }
}

if (require.main === module) {
    run().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { run, processQueue };
