/* ========================================
   KATHA — App Logic
   Theme switching, navigation, bookmarks
   ======================================== */

(function () {
  'use strict';

  // ---- State ----
  const state = {
    currentTheme: localStorage.getItem('katha-theme') || 'warm',
    currentSection: 'featured',
    bookmarks: JSON.parse(localStorage.getItem('katha-bookmarks') || '[]'),
  };

  // ---- DOM References ----
  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeModal = document.getElementById('themeModal');
  const themeModalBackdrop = document.getElementById('themeModalBackdrop');
  const themeModalClose = document.getElementById('themeModalClose');
  const themeOptions = document.querySelectorAll('.theme-option');
  const navTabs = document.querySelectorAll('.nav-tab');
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  const sections = document.querySelectorAll('.section');
  const bookmarkBtns = document.querySelectorAll('.bookmark-btn');

  // ---- Theme ----
  function setTheme(theme) {
    state.currentTheme = theme;
    html.setAttribute('data-theme', theme);
    localStorage.setItem('katha-theme', theme);
    updateThemeOptions();
  }

  function updateThemeOptions() {
    themeOptions.forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === state.currentTheme);
    });
  }

  function openThemeModal() {
    themeModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeThemeModal() {
    themeModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  themeToggle.addEventListener('click', openThemeModal);
  themeModalBackdrop.addEventListener('click', closeThemeModal);
  themeModalClose.addEventListener('click', closeThemeModal);

  themeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      setTheme(opt.dataset.theme);
      showToast(`Theme: ${opt.querySelector('.theme-label').textContent}`);
    });
  });

  // Initialize theme
  setTheme(state.currentTheme);

  // ---- Navigation ----
  function switchSection(sectionId) {
    if (!sectionId || sectionId === state.currentSection) return;

    state.currentSection = sectionId;

    // Update sections
    sections.forEach(sec => {
      sec.classList.toggle('active', sec.id === `section-${sectionId}`);
    });

    // Update nav tabs
    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.section === sectionId);
    });

    // Update bottom nav
    bottomNavItems.forEach(item => {
      if (item.dataset.section) {
        item.classList.toggle('active', item.dataset.section === sectionId);
      }
    });

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchSection(tab.dataset.section));
  });

  bottomNavItems.forEach(item => {
    if (item.classList.contains('write-btn')) {
      item.addEventListener('click', () => {
        showToast('✍️ Write feature coming soon!');
      });
    } else if (item.dataset.section) {
      item.addEventListener('click', () => switchSection(item.dataset.section));
    }
  });

  // ---- Bookmarks ----
  bookmarkBtns.forEach((btn, index) => {
    // Restore bookmarked state
    if (state.bookmarks.includes(index)) {
      btn.classList.add('bookmarked');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('bookmarked');

      if (btn.classList.contains('bookmarked')) {
        if (!state.bookmarks.includes(index)) {
          state.bookmarks.push(index);
        }
        showToast('Story saved ♡');
      } else {
        state.bookmarks = state.bookmarks.filter(i => i !== index);
        showToast('Removed from saved');
      }

      localStorage.setItem('katha-bookmarks', JSON.stringify(state.bookmarks));
      updateBookmarksSection();
    });
  });

  function updateBookmarksSection() {
    const bookmarksSection = document.getElementById('section-bookmarks');
    const emptyState = bookmarksSection.querySelector('.empty-state');
    const savedCount = state.bookmarks.length;

    if (savedCount > 0 && emptyState) {
      emptyState.querySelector('.empty-text').textContent = `${savedCount} saved stor${savedCount === 1 ? 'y' : 'ies'}`;
      emptyState.querySelector('.empty-subtext').textContent = 'Your reading list is growing!';
    } else if (savedCount === 0 && emptyState) {
      emptyState.querySelector('.empty-text').textContent = 'No saved stories yet';
      emptyState.querySelector('.empty-subtext').textContent = 'Tap the bookmark icon on any story to save it for later';
    }
  }

  updateBookmarksSection();

  // ---- Story card tap ----
  document.querySelectorAll('.story-card').forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('.story-title');
      if (title) {
        showToast(`Opening "${title.textContent}"...`);
      }
    });
  });

  // ---- Toast Notification ----
  let toastTimer;
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.remove('show');

    // Force reflow
    void toast.offsetWidth;
    toast.classList.add('show');

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  // ---- Haptic-like feedback (visual) on card press ----
  document.querySelectorAll('.story-card, .topic-card').forEach(el => {
    el.addEventListener('touchstart', () => {}, { passive: true });
  });

})();
