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

    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }

    const contactForm = document.getElementById('contactForm');

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
        contactPopup.classList.remove('active');
        
        // Show success message (you can customize this)
        alert('Thank you for your message. We will get back to you soon!');
    });

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const dropdowns = document.querySelectorAll('.dropdown');

    mobileMenuToggle.addEventListener('click', function() {
        navLinks.classList.toggle('active');
    });

    // Handle dropdowns on mobile
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                dropdown.classList.toggle('active');
            }
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.navbar')) {
            navLinks.classList.remove('active');
            dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
        }
    });
}); 