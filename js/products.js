document.addEventListener('DOMContentLoaded', () => {
    // Contact Toggle Functionality
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

    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }

    // Handle contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            };
            
            console.log('Form submitted:', formData);
            contactForm.reset();
            contactPopup.classList.remove('active');
            alert('Thank you for your message. We will get back to you soon!');
        });
    }

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const dropdowns = document.querySelectorAll('.dropdown');

    // Only one event listener for mobileMenuToggle below

    // Handle dropdowns on mobile
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            toggle.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    // Close all other dropdowns first
                    dropdowns.forEach(d => {
                        if (d !== dropdown) {
                            d.classList.remove('active');
                        }
                    });
                    dropdown.classList.toggle('active');
                }
            });
        }
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (!this.hasAttribute('target')) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    if (window.innerWidth <= 768) {
                        navLinks.classList.remove('active');
                    }
                }
            }
        });
    });

    // Ensure nav menu and dropdowns are closed after DOM is fully rendered
    setTimeout(function() {
        if (navLinks) navLinks.classList.remove('active');
        if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
        dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
    }, 0);

    // Hamburger menu toggle (open/close menu and toggle icon)
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function(e) {
            const isOpening = !navLinks.classList.contains('active');
            // Always close all dropdowns before opening menu
            if (isOpening) {
                dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
            }
            navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active'); // for X/close icon
            // Always close all dropdowns when closing menu
            if (!isOpening) {
                dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
            }
        });
    }
}); 