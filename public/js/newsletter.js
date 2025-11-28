// Newsletter Signup Handler - Beehiiv Integration

(function() {
    const form = document.getElementById('newsletter-form');
    const emailInput = document.getElementById('newsletter-email');
    const messageEl = document.getElementById('newsletter-message');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        if (!email) return;

        // Disable button while submitting
        const btn = form.querySelector('.newsletter-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Subscribing...';
        btn.disabled = true;

        try {
            // Subscribe via Beehiiv
            const response = await fetch('/.netlify/functions/newsletter-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

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
