// Contact Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Contact Toggle
    const contactToggleBtn = document.querySelector('.contact-toggle-btn');
    const contactPopup = document.querySelector('.contact-popup');
    const closePopupBtn = document.querySelector('.close-popup');

    if (contactToggleBtn && contactPopup && closePopupBtn) {
        contactToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            contactPopup.classList.add('active');
        });

        closePopupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            contactPopup.classList.remove('active');
        });

        // Close popup when clicking outside
        document.addEventListener('click', function(e) {
            if (!contactPopup.contains(e.target) && !contactToggleBtn.contains(e.target)) {
                contactPopup.classList.remove('active');
            }
        });
    }

    // Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const dropdowns = document.querySelectorAll('.dropdown');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Handle dropdowns
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            if (toggle) {
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                    
                    // Update mobile toggle appearance when dropdown is active
                    if (dropdown.classList.contains('active')) {
                        mobileToggle.classList.add('active');
                    } else {
                        // Only remove active class if no dropdowns are active
                        const anyDropdownActive = Array.from(dropdowns).some(d => d.classList.contains('active'));
                        if (!anyDropdownActive) {
                            mobileToggle.classList.remove('active');
                        }
                    }
                });
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileToggle.contains(e.target) && !navLinks.contains(e.target)) {
                mobileToggle.classList.remove('active');
                navLinks.classList.remove('active');
                dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
            }
        });
    }

    // Contact form logic (only if present)
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Here you can add your form submission logic
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            };
            // For now, just log the form data
            console.log('Form submitted:', formData);
            // Clear form and close popup
            contactForm.reset();
            if (contactPopup) contactPopup.classList.remove('active');
            // Show success message (you can customize this)
            alert('Thank you for your message. We will get back to you soon!');
        });
    }

    // Reset dropdowns on resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 900) {
            if (navLinks) navLinks.classList.remove('active');
            if (mobileToggle) mobileToggle.classList.remove('active');
            dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
        }
    });
});

// Pricing Toggle Functionality for Virtual Office Page
window.switchPricing = function(period) {
    const buttons = document.querySelectorAll('.pricing-toggle .toggle-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const periods = ['monthly', 'semester', 'annual'];
    const plans = ['basic', 'pro'];
    plans.forEach(function(plan) {
        periods.forEach(function(p) {
            const el = document.getElementById(plan + '-' + p);
            if (el) {
                el.style.display = p === period ? 'block' : 'none';
            }
        });
    });
}

// Function to get the current period for the 'Get Started' buttons
function getCurrentPeriod() {
    const activeButton = document.querySelector('.pricing-toggle .toggle-btn.active');
    return activeButton ? activeButton.textContent.trim() : 'annual';
}

// Function to handle location toggle clicks
function switchLocation(location) {
    // Select the correct toggle buttons for the location toggles
    const buttons = document.querySelectorAll('.pricing-toggle .toggle-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const addressElement = document.getElementById('office-address');
    const galleryGrid = document.querySelector('.gallery-grid');

    if (addressElement) {
        switch (location) {
            case 'Sydney':
                addressElement.textContent = 'St James Trust Building - 185 Elizabeth St, Sydney, NSW 2000';
                if (galleryGrid) galleryGrid.style.display = 'grid';
                break;
            case 'Perth':
                addressElement.textContent = '8 Production Road Canning Vale, WA 6155';
                if (galleryGrid) galleryGrid.style.display = 'none';
                break;
            case 'Melbourne':
                addressElement.textContent = 'Level 23, Tower 5Collins Square, 727 Collins Street, Docklands, Victoria 3008, Australia';
                if (galleryGrid) galleryGrid.style.display = 'none';
                break;
            case 'Adelaide':
                addressElement.textContent = 'We are working to bring your Virtual Office in Adelaide - Coming soon';
                if (galleryGrid) galleryGrid.style.display = 'none';
                break;
        }
    }
}

// Location Toggle Functionality
const locationToggles = document.querySelectorAll('.location-toggle .toggle-btn');
if (locationToggles.length > 0) {
    locationToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            // Remove active class from all toggles
            locationToggles.forEach(t => t.classList.remove('active'));
            // Add active class to clicked toggle
            toggle.classList.add('active');
        });
    });
} 