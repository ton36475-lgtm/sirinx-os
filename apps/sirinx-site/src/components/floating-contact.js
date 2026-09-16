// FloatingContactCluster Behavior
(function() {
  // Desktop LINE Panel
  window.openLinePanel = function() {
    const panel = document.getElementById('line-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.add('open');
      trackEvent('line_qr_view');
    }
  };

  window.closeLinePanel = function() {
    const panel = document.getElementById('line-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove('open');
    }
  };

  // Desktop Inquiry Panel
  window.openInquiryPanel = function() {
    const panel = document.getElementById('inquiry-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.add('open');
      trackEvent('website_bot_open');
    }
  };

  window.closeInquiryPanel = function() {
    const panel = document.getElementById('inquiry-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove('open');
    }
  };

  // Mobile Panel
  window.toggleMobilePanel = function() {
    const panel = document.getElementById('mobile-panel');
    if (!panel) return;
    const isOpen = panel.getAttribute('aria-hidden') === 'false';
    if (isOpen) {
      closeMobilePanel();
    } else {
      openMobilePanel();
    }
  };

  window.openMobilePanel = function() {
    const panel = document.getElementById('mobile-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.add('open');
      document.body.style.overflow = 'hidden';
      trackEvent('contact_cluster_open');
    }
  };

  window.closeMobilePanel = function() {
    const panel = document.getElementById('mobile-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  // Track events (no-op by default, logs to console)
  window.trackEvent = function(eventName, data) {
    if (typeof data === 'object') {
      console.log('[track]', eventName, data);
    } else {
      console.log('[track]', eventName);
    }
  };

  // Initialize and handle responsive behavior
  function initFloatingCluster() {
    const mobileTrigger = document.getElementById('contact-trigger-mobile');
    const desktopDock = document.querySelector('.contact-dock-desktop');

    function updateLayout() {
      if (window.innerWidth > 768) {
        mobileTrigger.style.display = 'none';
        desktopDock.style.display = 'flex';
      } else {
        mobileTrigger.style.display = 'flex';
        desktopDock.style.display = 'none';
      }
    }

    updateLayout();
    window.addEventListener('resize', updateLayout);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingCluster);
  } else {
    initFloatingCluster();
  }
})();