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

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }

    // Handle dropdowns on mobile
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            toggle.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                }
            });
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.navbar')) {
            navLinks.classList.remove('active');
            dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
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
}); 