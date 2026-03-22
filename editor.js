/* ========================================
   KATHA EDITOR — Logic
   Google Auth, AI integration, bilingual UI,
   story management
   ======================================== */

(function () {
  'use strict';

  // ========================================
  // CONFIG — Update these values
  // ========================================
  const CONFIG = {
    // Replace with your Google OAuth Client ID
    GOOGLE_CLIENT_ID: '573358982341-fdrmkps93inrogasaq6k28u9vipf3co7.apps.googleusercontent.com',
    // Replace with your dad's Gmail address
    ALLOWED_EMAIL: 'DADS_EMAIL@gmail.com',
  };

  // ---- State ----
  const state = {
    user: null,
    language: localStorage.getItem('katha-editor-lang') || 'en',
    currentStoryId: null,
    stories: JSON.parse(localStorage.getItem('katha-stories') || '[]'),
  };

  // ---- DOM References ----
  const loginScreen = document.getElementById('loginScreen');
  const loginError = document.getElementById('loginError');
  const editorApp = document.getElementById('editorApp');
  const userPhoto = document.getElementById('userPhoto');
  const logoutBtn = document.getElementById('logoutBtn');
  const langBtns = document.querySelectorAll('.lang-btn');
  const editorText = document.getElementById('editorText');
  const storyTitle = document.getElementById('storyTitle');
  const storyAuthor = document.getElementById('storyAuthor');
  const storyTopic = document.getElementById('storyTopic');
  const wordCount = document.getElementById('wordCount');
  const aiPanel = document.getElementById('aiPanel');
  const aiPanelTitle = document.getElementById('aiPanelTitle');
  const aiPanelContent = document.getElementById('aiPanelContent');
  const aiLoading = document.getElementById('aiLoading');
  const aiResult = document.getElementById('aiResult');
  const storiesModal = document.getElementById('storiesModal');
  const storiesList = document.getElementById('storiesList');
  const aiPromptModal = document.getElementById('aiPromptModal');
  const aiPromptTitle = document.getElementById('aiPromptTitle');
  const aiPromptInput = document.getElementById('aiPromptInput');

  // ========================================
  // GOOGLE SIGN-IN
  // ========================================
  window.onload = function () {
    if (CONFIG.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      // Dev mode: skip auth
      console.warn('Google Client ID not configured. Running in dev mode.');
      showEditor({
        name: 'Dev User',
        picture: '',
        email: 'dev@test.com',
      });
      return;
    }

    google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: handleGoogleSignIn,
    });

    google.accounts.id.renderButton(
      document.getElementById('googleSignInBtn'),
      {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'signin_with',
        shape: 'pill',
      }
    );

    // Check if user was previously signed in
    const savedUser = localStorage.getItem('katha-user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.email === CONFIG.ALLOWED_EMAIL) {
        showEditor(user);
      }
    }
  };

  function handleGoogleSignIn(response) {
    const payload = decodeJwtPayload(response.credential);

    if (payload.email !== CONFIG.ALLOWED_EMAIL) {
      loginError.textContent = 'Access denied. This account is not authorized.';
      return;
    }

    const user = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };

    localStorage.setItem('katha-user', JSON.stringify(user));
    showEditor(user);
  }

  function decodeJwtPayload(token) {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  }

  function showEditor(user) {
    state.user = user;
    loginScreen.style.display = 'none';
    editorApp.style.display = 'flex';

    if (user.picture) {
      userPhoto.src = user.picture;
    } else {
      userPhoto.parentElement.style.display = 'none';
    }
  }

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('katha-user');
    state.user = null;
    editorApp.style.display = 'none';
    loginScreen.style.display = 'flex';
    loginError.textContent = '';
  });

  // ========================================
  // LANGUAGE SWITCHING
  // ========================================
  function setLanguage(lang) {
    state.language = lang;
    localStorage.setItem('katha-editor-lang', lang);
    document.body.setAttribute('data-lang', lang);

    langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update all translatable elements
    document.querySelectorAll('[data-en]').forEach(el => {
      el.textContent = el.getAttribute(`data-${lang}`) || el.getAttribute('data-en');
    });

    // Update placeholders
    document.querySelectorAll('[data-placeholder-en]').forEach(el => {
      el.placeholder = el.getAttribute(`data-placeholder-${lang}`) || el.getAttribute('data-placeholder-en');
    });

    // Update word count
    updateWordCount();

    // Update select options
    document.querySelectorAll('select option[data-en]').forEach(opt => {
      opt.textContent = opt.getAttribute(`data-${lang}`) || opt.getAttribute('data-en');
    });
  }

  langBtns.forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  // Initialize language
  setLanguage(state.language);

  // ========================================
  // WORD COUNT
  // ========================================
  function updateWordCount() {
    const text = editorText.value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    const template = state.language === 'bn' ? '{count} শব্দ' : '{count} words';
    wordCount.textContent = template.replace('{count}', count);
  }

  editorText.addEventListener('input', updateWordCount);

  // ========================================
  // AI INTEGRATION
  // ========================================
  let currentAiAction = null;

  async function callAI(action, text) {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text,
          language: state.language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI request failed');
      }

      return data.result;
    } catch (err) {
      throw err;
    }
  }

  function showAiPanel(title) {
    aiPanelTitle.textContent = title;
    aiLoading.classList.add('show');
    aiResult.textContent = '';
    aiPanel.classList.add('open');
  }

  function showAiResult(text) {
    aiLoading.classList.remove('show');
    aiResult.textContent = text;
  }

  function showAiError(msg) {
    aiLoading.classList.remove('show');
    aiResult.textContent = `Error: ${msg}`;
    aiResult.style.color = '#E8365D';
    setTimeout(() => { aiResult.style.color = ''; }, 3000);
  }

  // AI Write — opens prompt modal
  document.getElementById('btnAiWrite').addEventListener('click', () => {
    currentAiAction = 'write';
    aiPromptTitle.textContent = state.language === 'bn' ? '✨ AI লেখা' : '✨ AI Write';
    aiPromptInput.placeholder = aiPromptInput.getAttribute(`data-placeholder-${state.language}`) || aiPromptInput.getAttribute('data-placeholder-en');
    aiPromptInput.value = '';
    aiPromptModal.classList.add('open');
    aiPromptInput.focus();
  });

  // AI Edit
  document.getElementById('btnAiEdit').addEventListener('click', async () => {
    const text = editorText.value.trim();
    if (!text) {
      showToast(state.language === 'bn' ? 'প্রথমে কিছু লিখুন' : 'Write something first');
      return;
    }
    currentAiAction = 'edit';
    showAiPanel(state.language === 'bn' ? '🪄 AI সম্পাদনা' : '🪄 AI Edit');
    try {
      const result = await callAI('edit', text);
      showAiResult(result);
    } catch (err) {
      showAiError(err.message);
    }
  });

  // AI Translate
  document.getElementById('btnAiTranslate').addEventListener('click', async () => {
    const text = editorText.value.trim();
    if (!text) {
      showToast(state.language === 'bn' ? 'প্রথমে কিছু লিখুন' : 'Write something first');
      return;
    }
    currentAiAction = 'translate';
    const targetLang = state.language === 'bn' ? 'English' : 'বাংলা';
    showAiPanel(`🌐 → ${targetLang}`);
    try {
      const result = await callAI('translate', text);
      showAiResult(result);
    } catch (err) {
      showAiError(err.message);
    }
  });

  // AI Suggest
  document.getElementById('btnAiSuggest').addEventListener('click', async () => {
    const text = editorText.value.trim();
    if (!text) {
      showToast(state.language === 'bn' ? 'প্রথমে কিছু লিখুন' : 'Write something first');
      return;
    }
    currentAiAction = 'suggest';
    showAiPanel(state.language === 'bn' ? '💡 পরামর্শ' : '💡 Suggestions');
    try {
      const result = await callAI('suggest', text);
      showAiResult(result);
    } catch (err) {
      showAiError(err.message);
    }
  });

  // Suggest Title
  document.getElementById('btnSuggestTitle').addEventListener('click', async () => {
    const text = editorText.value.trim();
    if (!text) {
      showToast(state.language === 'bn' ? 'প্রথমে কিছু লিখুন' : 'Write something first');
      return;
    }
    showAiPanel(state.language === 'bn' ? '✨ শিরোনাম পরামর্শ' : '✨ Title Suggestions');
    try {
      const result = await callAI('title', text);
      showAiResult(result);
    } catch (err) {
      showAiError(err.message);
    }
  });

  // AI Prompt Modal — submit
  document.getElementById('aiPromptSubmit').addEventListener('click', async () => {
    const promptText = aiPromptInput.value.trim();
    if (!promptText) return;

    aiPromptModal.classList.remove('open');
    showAiPanel(state.language === 'bn' ? '✨ AI লেখা' : '✨ AI Write');

    try {
      const result = await callAI('write', promptText);
      showAiResult(result);
    } catch (err) {
      showAiError(err.message);
    }
  });

  document.getElementById('aiPromptCancel').addEventListener('click', () => {
    aiPromptModal.classList.remove('open');
  });
  document.getElementById('aiPromptBackdrop').addEventListener('click', () => {
    aiPromptModal.classList.remove('open');
  });

  // AI Panel actions
  document.getElementById('btnInsertAi').addEventListener('click', () => {
    const text = aiResult.textContent;
    if (text && !text.startsWith('Error:')) {
      editorText.value += (editorText.value ? '\n\n' : '') + text;
      updateWordCount();
      aiPanel.classList.remove('open');
      showToast(state.language === 'bn' ? 'যোগ করা হয়েছে' : 'Inserted');
    }
  });

  document.getElementById('btnReplaceAi').addEventListener('click', () => {
    const text = aiResult.textContent;
    if (text && !text.startsWith('Error:')) {
      editorText.value = text;
      updateWordCount();
      aiPanel.classList.remove('open');
      showToast(state.language === 'bn' ? 'প্রতিস্থাপিত' : 'Replaced');
    }
  });

  document.getElementById('btnCloseAi').addEventListener('click', () => {
    aiPanel.classList.remove('open');
  });

  // ========================================
  // STORY MANAGEMENT
  // ========================================
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function saveStories() {
    localStorage.setItem('katha-stories', JSON.stringify(state.stories));
  }

  // New Story
  document.getElementById('btnNewStory').addEventListener('click', () => {
    state.currentStoryId = null;
    storyTitle.value = '';
    storyAuthor.value = '';
    storyTopic.selectedIndex = 0;
    editorText.value = '';
    updateWordCount();
    showToast(state.language === 'bn' ? 'নতুন গল্প' : 'New story');
  });

  // Save Draft
  document.getElementById('btnSaveDraft').addEventListener('click', () => {
    const title = storyTitle.value.trim() || (state.language === 'bn' ? 'শিরোনামহীন' : 'Untitled');
    const text = editorText.value.trim();

    if (!text) {
      showToast(state.language === 'bn' ? 'লেখা খালি' : 'Nothing to save');
      return;
    }

    if (state.currentStoryId) {
      // Update existing
      const story = state.stories.find(s => s.id === state.currentStoryId);
      if (story) {
        story.title = title;
        story.author = storyAuthor.value.trim();
        story.topic = storyTopic.value;
        story.text = text;
        story.language = state.language;
        story.updatedAt = new Date().toISOString();
      }
    } else {
      // Create new
      const story = {
        id: generateId(),
        title,
        author: storyAuthor.value.trim(),
        topic: storyTopic.value,
        text,
        language: state.language,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.stories.unshift(story);
      state.currentStoryId = story.id;
    }

    saveStories();
    showToast(state.language === 'bn' ? 'খসড়া সংরক্ষিত' : 'Draft saved');
  });

  // Publish
  document.getElementById('btnPublish').addEventListener('click', () => {
    const title = storyTitle.value.trim();
    const text = editorText.value.trim();

    if (!title || !text) {
      showToast(state.language === 'bn' ? 'শিরোনাম এবং লেখা প্রয়োজন' : 'Title and text required');
      return;
    }

    if (state.currentStoryId) {
      const story = state.stories.find(s => s.id === state.currentStoryId);
      if (story) {
        story.title = title;
        story.author = storyAuthor.value.trim();
        story.topic = storyTopic.value;
        story.text = text;
        story.language = state.language;
        story.status = 'published';
        story.updatedAt = new Date().toISOString();
      }
    } else {
      const story = {
        id: generateId(),
        title,
        author: storyAuthor.value.trim(),
        topic: storyTopic.value,
        text,
        language: state.language,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.stories.unshift(story);
      state.currentStoryId = story.id;
    }

    saveStories();
    showToast(state.language === 'bn' ? 'প্রকাশিত!' : 'Published!');
  });

  // My Stories
  document.getElementById('btnMyStories').addEventListener('click', () => {
    renderStoriesList();
    storiesModal.classList.add('open');
  });

  document.getElementById('storiesModalClose').addEventListener('click', () => {
    storiesModal.classList.remove('open');
  });
  document.getElementById('storiesModalBackdrop').addEventListener('click', () => {
    storiesModal.classList.remove('open');
  });

  function renderStoriesList() {
    if (state.stories.length === 0) {
      storiesList.innerHTML = `<div class="stories-empty">${state.language === 'bn' ? 'কোনো গল্প নেই' : 'No stories yet'}</div>`;
      return;
    }

    storiesList.innerHTML = state.stories.map(story => `
      <div class="story-list-item" data-id="${story.id}">
        <div class="story-list-info">
          <div class="story-list-title">${escapeHtml(story.title)}</div>
          <div class="story-list-meta">${formatDate(story.updatedAt)} · ${story.language === 'bn' ? 'বাংলা' : 'English'}</div>
        </div>
        <span class="story-list-status ${story.status}">${story.status === 'published' ? (state.language === 'bn' ? 'প্রকাশিত' : 'Published') : (state.language === 'bn' ? 'খসড়া' : 'Draft')}</span>
        <button class="story-list-delete" data-id="${story.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `).join('');

    // Load story on click
    storiesList.querySelectorAll('.story-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.story-list-delete')) return;
        const id = item.dataset.id;
        loadStory(id);
        storiesModal.classList.remove('open');
      });
    });

    // Delete story
    storiesList.querySelectorAll('.story-list-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        state.stories = state.stories.filter(s => s.id !== id);
        saveStories();
        if (state.currentStoryId === id) {
          state.currentStoryId = null;
          storyTitle.value = '';
          storyAuthor.value = '';
          editorText.value = '';
          updateWordCount();
        }
        renderStoriesList();
        showToast(state.language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      });
    });
  }

  function loadStory(id) {
    const story = state.stories.find(s => s.id === id);
    if (!story) return;

    state.currentStoryId = id;
    storyTitle.value = story.title;
    storyAuthor.value = story.author || '';
    storyTopic.value = story.topic || 'ghosts';
    editorText.value = story.text;

    if (story.language && story.language !== state.language) {
      setLanguage(story.language);
    }

    updateWordCount();
    showToast(state.language === 'bn' ? 'গল্প লোড করা হয়েছে' : 'Story loaded');
  }

  // ========================================
  // HELPERS
  // ========================================
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(isoStr) {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return state.language === 'bn' ? 'এইমাত্র' : 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(state.language === 'bn' ? 'bn-IN' : 'en-US', { month: 'short', day: 'numeric' });
  }

  // Toast
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
    void toast.offsetWidth;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  }

})();
