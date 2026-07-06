const yearStamp = document.querySelector("#yearStamp");

if (yearStamp) {
  yearStamp.textContent = `SIRINX company website - ${new Date().getFullYear()}`;
}

// FloatingContactCluster Behavior
(function() {
  const existingTrackEvent = typeof window.trackEvent === 'function' ? window.trackEvent : null;

  function setExpanded(controlId, expanded) {
    const control = document.getElementById(controlId);
    if (control) {
      control.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
  }

  function setPanelOpen(panel, open) {
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    panel.inert = !open;
    panel.classList.toggle('open', open);
  }

  function emitTrackEvent(eventName, data) {
    if (existingTrackEvent) {
      existingTrackEvent(eventName, data);
      return;
    }

    console.log('[track]', eventName, data || '');
  }

  document.addEventListener('click', (event) => {
    const trackedTarget = event.target.closest('[data-track-event], [data-track-events]');
    if (!trackedTarget) {
      return;
    }

    const events = trackedTarget.dataset.trackEvents || trackedTarget.dataset.trackEvent;
    for (const eventName of events.split(' ').filter(Boolean)) {
      emitTrackEvent(eventName, {
        href: trackedTarget.getAttribute('href') || null
      });
    }
  });

  function initQrFallbacks() {
    const qrImages = document.querySelectorAll('[data-qr-image]');

    qrImages.forEach((image) => {
      function markLoaded() {
        image.classList.remove('qr-error');
        image.setAttribute('data-qr-status', 'loaded');
      }

      function markError() {
        image.classList.add('qr-error');
        image.setAttribute('data-qr-status', 'error');
      }

      if (image.complete && image.naturalWidth > 0) {
        markLoaded();
      } else if (image.complete) {
        markError();
      }

      image.addEventListener('load', markLoaded);
      image.addEventListener('error', markError);
    });
  }

  function initReadinessChecklists() {
    const checklists = document.querySelectorAll('[data-readiness-checklist]');

    checklists.forEach((checklist) => {
      const options = Array.from(checklist.querySelectorAll('[data-readiness-option]'));
      const status = checklist.querySelector('[data-readiness-status]');
      const total = options.length;
      const readyMessage = checklist.dataset.readinessReadyMessage || 'พร้อมสำหรับขั้นตอนถัดไป';
      const pendingMessage = checklist.dataset.readinessPendingMessage || 'เลือกข้อมูลที่มีแล้วเพื่อดูความพร้อม';

      function updateStatus() {
        const checked = options.filter((option) => option.checked).length;

        if (!status) {
          return;
        }

        status.textContent =
          checked === total
            ? readyMessage
            : `${pendingMessage} (${checked}/${total})`;
      }

      options.forEach((option) => {
        option.addEventListener('change', updateStatus);
      });

      updateStatus();
    });
  }

  // Desktop LINE Panel
  window.openLinePanel = function() {
    const panel = document.getElementById('line-panel');
    if (panel) {
      if (typeof window.closeInquiryPanel === 'function') {
        window.closeInquiryPanel();
      }
      setPanelOpen(panel, true);
      setExpanded('line-trigger', true);
      emitTrackEvent('line_floating_open');
      emitTrackEvent('line_qr_view');
    }
  };

  window.closeLinePanel = function() {
    const panel = document.getElementById('line-panel');
    if (panel) {
      setPanelOpen(panel, false);
      setExpanded('line-trigger', false);
    }
  };

  // Desktop Inquiry Panel
  window.openInquiryPanel = function() {
    const panel = document.getElementById('inquiry-panel');
    if (panel) {
      if (typeof window.closeLinePanel === 'function') {
        window.closeLinePanel();
      }
      setPanelOpen(panel, true);
      setExpanded('inquiry-trigger', true);
      emitTrackEvent('website_bot_open');
    }
  };

  window.closeInquiryPanel = function() {
    const panel = document.getElementById('inquiry-panel');
    if (panel) {
      setPanelOpen(panel, false);
      setExpanded('inquiry-trigger', false);
    }
  };

  // Mobile Panel
  window.toggleMobilePanel = function() {
    const panel = document.getElementById('mobile-panel');
    if (!panel) return;
    const isOpen = panel.getAttribute('aria-hidden') === 'false';
    if (isOpen) {
      window.closeMobilePanel();
    } else {
      window.openMobilePanel();
    }
  };

  window.openMobilePanel = function() {
    const panel = document.getElementById('mobile-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.add('open');
      setExpanded('contact-trigger-mobile', true);
      document.body.style.overflow = 'hidden';
      emitTrackEvent('contact_cluster_open');
      emitTrackEvent('website_bot_line_group_open');
    }
  };

  window.closeMobilePanel = function() {
    const panel = document.getElementById('mobile-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove('open');
      setExpanded('contact-trigger-mobile', false);
      document.body.style.overflow = '';
    }
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    window.closeLinePanel();
    window.closeInquiryPanel();
    window.closeMobilePanel();
  });

  // Event tracking placeholder only. Production analytics stays gated.
  window.trackEvent = existingTrackEvent || emitTrackEvent;

  // Initialize responsive behavior
  function initFloatingCluster() {
    const mobileTrigger = document.getElementById('contact-trigger-mobile');
    const desktopDock = document.querySelector('.contact-dock-desktop');
    const suppressMobileTrigger =
      document.body.classList.contains('line-page') || document.body.classList.contains('contact-page');

    if (!mobileTrigger || !desktopDock) {
      return;
    }

    function updateLayout() {
      if (window.innerWidth > 768) {
        mobileTrigger.style.display = 'none';
        desktopDock.style.display = 'flex';
        window.closeMobilePanel();
      } else {
        mobileTrigger.style.display = suppressMobileTrigger ? 'none' : 'flex';
        desktopDock.style.display = 'none';
        window.closeLinePanel();
        window.closeInquiryPanel();
      }
    }

    updateLayout();
    window.addEventListener('resize', updateLayout);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFloatingCluster();
    initQrFallbacks();
    initReadinessChecklists();
  });
})();
