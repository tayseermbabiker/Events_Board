// Newsletter Signup Handler - Beehiiv Integration

(function() {
    console.log('Newsletter JS loaded');

    const form = document.getElementById('newsletter-form');
    const emailInput = document.getElementById('newsletter-email');
    const messageEl = document.getElementById('newsletter-message');

    if (!form) {
        console.log('Newsletter form not found');
        return;
    }

    console.log('Newsletter form found, attaching handler');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Newsletter form submitted');

        const email = emailInput.value.trim();
        if (!email) {
            console.log('No email entered');
            return;
        }

        // Disable button while submitting
        const btn = form.querySelector('.newsletter-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Subscribing...';
        btn.disabled = true;

        try {
            // Get selected interests
            const interestCheckboxes = form.querySelectorAll('input[name="interests"]:checked');
            const interests = Array.from(interestCheckboxes).map(cb => cb.value);

            console.log('Sending to newsletter-subscribe:', { email, interests });

            // Subscribe via Beehiiv - IMPORTANT: Use correct endpoint
            const response = await fetch('/.netlify/functions/newsletter-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    interests: interests
                })
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok && data.success) {
                showMessage('success', data.message || "You're in! Check your inbox.");
                emailInput.value = '';

                // Store in localStorage to remember they subscribed
                localStorage.setItem('newsletter_subscribed', 'true');
                localStorage.setItem('newsletter_email', email);
            } else {
                showMessage('error', data.error || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Newsletter signup error:', error);
            showMessage('error', 'Connection error. Please try again.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    function showMessage(type, text) {
        messageEl.textContent = text;
        messageEl.className = 'newsletter-message ' + type;
    }

    // Hide newsletter section if already subscribed
    function checkSubscribed() {
        if (localStorage.getItem('newsletter_subscribed') === 'true') {
            const section = document.querySelector('.newsletter-section');
            if (section) {
                const box = section.querySelector('.newsletter-box');
                box.innerHTML = `
                    <h2>You're Subscribed!</h2>
                    <p>Weekly events digest coming to your inbox every Monday.</p>
                    <p class="newsletter-note">Check your email: ${localStorage.getItem('newsletter_email') || ''}</p>
                `;
            }
        }
    }

    // Check on page load
    checkSubscribed();
})();
