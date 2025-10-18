// Smooth page transitions
(function() {
    'use strict';
    
    // Handle initial page load
    window.addEventListener('load', function() {
        const initialLoader = document.getElementById('initialLoader');
        if (initialLoader) {
            setTimeout(() => {
                initialLoader.classList.add('fade-out');
                setTimeout(() => {
                    initialLoader.style.display = 'none';
                }, 500);
            }, 800); // Show loader for 800ms minimum
        }
    });
    
    // Create page transition overlay
    const transitionOverlay = document.createElement('div');
    transitionOverlay.className = 'page-transition';
    document.body.appendChild(transitionOverlay);
    
    // Handle all internal links
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        
        // Only handle internal links
        if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }
        
        // Skip if it's the same page
        if (href === window.location.pathname || href === '#' || href.startsWith('#')) {
            return;
        }
        
        e.preventDefault();
        
        // Show transition overlay
        transitionOverlay.classList.add('active');
        
        // Navigate after a brief delay
        setTimeout(() => {
            window.location.href = href;
        }, 200);
    });
    
    // Handle page load
    window.addEventListener('load', function() {
        // Remove transition overlay if it exists
        setTimeout(() => {
            if (transitionOverlay) {
                transitionOverlay.classList.remove('active');
            }
        }, 100);
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function() {
        transitionOverlay.classList.add('active');
        setTimeout(() => {
            transitionOverlay.classList.remove('active');
        }, 200);
    });
    
    // Add loading state to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.style.opacity = '0.7';
                submitBtn.style.pointerEvents = 'none';
            }
        });
    });
    
    // Add smooth scroll for anchor links
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
    
})();
