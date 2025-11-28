// Newsletter Subscribe - Beehiiv Integration
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = 'pub_e6b11bde-2ab7-4bb3-a7b2-2f9a9464a37e';

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        // Subscribe to Beehiiv
        const response = await fetch(
            `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    reactivate_existing: true,
                    send_welcome_email: true,
                    utm_source: 'website',
                    utm_medium: 'organic',
                    utm_campaign: 'newsletter_signup'
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Successfully subscribed!'
                })
            };
        } else {
            console.error('Beehiiv error:', data);

            // Handle already subscribed
            if (data.errors && data.errors.some(e => e.includes('already'))) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'You\'re already subscribed!'
                    })
                };
            }

            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: data.errors?.[0] || 'Subscription failed'
                })
            };
        }

    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error. Please try again.' })
        };
    }
};
