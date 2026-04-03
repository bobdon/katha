/* ========================================
   KATHA â App Logic
   Theme switching, navigation, bookmarks,
   emoji reactions
   ======================================== */

(function () {
  'use strict';

  // ---- State ----
  const state = {
    currentTheme: localStorage.getItem('katha-theme') || 'warm',
    currentSection: 'featured',
    bookmarks: JSON.parse(localStorage.getItem('katha-bookmarks') || '[]'),
    reactions: JSON.parse(localStorage.getItem('katha-reactions') || '{}'),
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
  const emojiPicker = document.getElementById('emojiPicker');

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
    if (item.dataset.section) {
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
        showToast('Story saved â¡');
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

  // ---- Emoji Reactions ----
  let activeAddBtn = null;

  // Generate a unique key for each story card
  function getStoryKey(card) {
    const title = card.querySelector('.story-title');
    return title ? title.textContent.trim().substring(0, 30) : null;
  }

  // Restore saved reaction states
  document.querySelectorAll('.story-card').forEach(card => {
    const key = getStoryKey(card);
    if (!key) return;
    const savedReactions = state.reactions[key] || [];

    card.querySelectorAll('.reaction-btn:not(.add-reaction)').forEach(btn => {
      const emoji = btn.dataset.emoji;
      if (savedReactions.includes(emoji)) {
        btn.classList.add('reacted');
        // Increment the count since we saved it
      }
    });
  });

  // Handle clicking existing reaction buttons
  document.querySelectorAll('.reaction-btn:not(.add-reaction)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.story-card');
      const key = getStoryKey(card);
      const emoji = btn.dataset.emoji;
      const countEl = btn.querySelector('.reaction-count');
      let count = parseInt(countEl.textContent) || 0;

      if (btn.classList.contains('reacted')) {
        btn.classList.remove('reacted');
        count = Math.max(0, count - 1);
        if (key) {
          state.reactions[key] = (state.reactions[key] || []).filter(e => e !== emoji);
        }
      } else {
        btn.classList.add('reacted');
        count += 1;
        if (key) {
          if (!state.reactions[key]) state.reactions[key] = [];
          if (!state.reactions[key].includes(emoji)) state.reactions[key].push(emoji);
        }
        // Little pop animation
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => { btn.style.transform = ''; }, 200);
      }

      countEl.textContent = count;
      localStorage.setItem('katha-reactions', JSON.stringify(state.reactions));
    });
  });

  // Handle "+" add reaction button
  document.querySelectorAll('.add-reaction').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      if (activeAddBtn === btn && emojiPicker.classList.contains('open')) {
        closeEmojiPicker();
        return;
      }

      activeAddBtn = btn;
      const rect = btn.getBoundingClientRect();

      // Position the picker above the button
      emojiPicker.style.left = `${Math.min(rect.left, window.innerWidth - 210)}px`;
      emojiPicker.style.top = `${rect.top - 52}px`;
      emojiPicker.classList.add('open');
    });
  });

  // Handle picking an emoji from the picker
  document.querySelectorAll('.emoji-pick').forEach(pick => {
    pick.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!activeAddBtn) return;

      const emoji = pick.dataset.emoji;
      const card = activeAddBtn.closest('.story-card');
      const reactionsContainer = activeAddBtn.closest('.emoji-reactions');
      const key = getStoryKey(card);

      // Check if this emoji already exists on this card
      const existing = reactionsContainer.querySelector(`.reaction-btn[data-emoji="${emoji}"]:not(.add-reaction)`);
      if (existing) {
        // Toggle it on
        if (!existing.classList.contains('reacted')) {
          existing.classList.add('reacted');
          const countEl = existing.querySelector('.reaction-count');
          countEl.textContent = parseInt(countEl.textContent) + 1;
          if (key) {
            if (!state.reactions[key]) state.reactions[key] = [];
            if (!state.reactions[key].includes(emoji)) state.reactions[key].push(emoji);
          }
          existing.style.transform = 'scale(1.2)';
          setTimeout(() => { existing.style.transform = ''; }, 200);
        }
      } else {
        // Create new reaction button
        const newBtn = document.createElement('button');
        newBtn.className = 'reaction-btn reacted';
        newBtn.dataset.emoji = emoji;
        newBtn.setAttribute('aria-label', `React ${emoji}`);
        newBtn.innerHTML = `<span class="reaction-emoji">${emoji}</span><span class="reaction-count">1</span>`;

        // Insert before the + button
        reactionsContainer.insertBefore(newBtn, activeAddBtn);

        // Add click handler to new button
        newBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const countEl = newBtn.querySelector('.reaction-count');
          let count = parseInt(countEl.textContent) || 0;

          if (newBtn.classList.contains('reacted')) {
            newBtn.classList.remove('reacted');
            count = Math.max(0, count - 1);
            if (key) {
              state.reactions[key] = (state.reactions[key] || []).filter(e => e !== emoji);
            }
          } else {
            newBtn.classList.add('reacted');
            count += 1;
            if (key) {
              if (!state.reactions[key]) state.reactions[key] = [];
              if (!state.reactions[key].includes(emoji)) state.reactions[key].push(emoji);
            }
            newBtn.style.transform = 'scale(1.2)';
            setTimeout(() => { newBtn.style.transform = ''; }, 200);
          }
          countEl.textContent = count;
          localStorage.setItem('katha-reactions', JSON.stringify(state.reactions));
        });

        if (key) {
          if (!state.reactions[key]) state.reactions[key] = [];
          if (!state.reactions[key].includes(emoji)) state.reactions[key].push(emoji);
        }

        newBtn.style.transform = 'scale(1.2)';
        setTimeout(() => { newBtn.style.transform = ''; }, 200);
      }

      localStorage.setItem('katha-reactions', JSON.stringify(state.reactions));
      closeEmojiPicker();
      showToast(`Reacted with ${emoji}`);
    });
  });

  function closeEmojiPicker() {
    emojiPicker.classList.remove('open');
    activeAddBtn = null;
  }

  // Close emoji picker when tapping elsewhere
  document.addEventListener('click', () => {
    closeEmojiPicker();
  });

  // ---- Story Reader ----
  const storyReader = document.getElementById('storyReader');
  const storyReaderBack = document.getElementById('storyReaderBack');
  const readerTitle = document.getElementById('readerTitle');
  const readerDate = document.getElementById('readerDate');
  const readerTime = document.getElementById('readerTime');
  const readerText = document.getElementById('readerText');

  function openStoryReader(card) {
    const title = card.querySelector('.story-title');
    const excerpt = card.querySelector('.story-excerpt-short');
    const date = card.querySelector('.story-date');
    const readTime = card.querySelector('.read-time');

    if (!title || !excerpt) return;

    readerTitle.textContent = title.textContent;
    readerDate.textContent = date ? date.textContent : '';
    readerTime.textContent = readTime ? readTime.textContent : '';

    // Get the full text and format it into paragraphs
    const fullText = excerpt.textContent;
    // Split on sentence boundaries that look like paragraph breaks
    // (after dialogue or after periods followed by capital letters with context shifts)
    const paragraphs = fullText.split(/(?<=[.!?""])\s+(?=[A-Z"""])/).reduce((acc, sentence, i) => {
      if (i === 0) return [sentence];
      const last = acc[acc.length - 1];
      // Start a new paragraph roughly every 2-4 sentences
      if (last.length > 300 || /[.!?][""]?\s*$/.test(last)) {
        acc.push(sentence);
      } else {
        acc[acc.length - 1] = last + ' ' + sentence;
      }
      return acc;
    }, []);

    readerText.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');

    storyReader.classList.add('open');
    document.body.style.overflow = 'hidden';
    storyReader.scrollTop = 0;
  }

  function closeStoryReader() {
    storyReader.classList.remove('open');
    document.body.style.overflow = '';
  }

  storyReaderBack.addEventListener('click', (e) => {
    e.stopPropagation();
    closeStoryReader();
  });

  // Close on swipe right (mobile)
  let touchStartX = 0;
  storyReader.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  storyReader.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (diff > 80) closeStoryReader(); // Swipe right to go back
  }, { passive: true });

  document.querySelectorAll('.story-card').forEach(card => {
    card.addEventListener('click', () => {
      openStoryReader(card);
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

  // ---- Passive touch listeners for smooth scrolling ----
  document.querySelectorAll('.story-card, .topic-card').forEach(el => {
    el.addEventListener('touchstart', () => {}, { passive: true });
  });

})();
