// Sheets CF - Mobile-first AI-native interface
class SheetsApp {
  constructor() {
    this.currentView = 'home';
    this.currentSheet = null;
    this.user = null;
    this.contextFiles = [];
    this.commands = [];
    this.recentSheets = [];
    this.workerUrl = 'https://sheets-cf-worker.luke-nittmann.workers.dev';
    
    this.init();
  }

  async init() {
    // Check for auth token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('sheets-token', token);
      window.history.replaceState({}, document.title, '/');
    }

    // Check authentication
    const savedToken = localStorage.getItem('sheets-token');
    if (savedToken) {
      await this.checkAuth();
    }

    // Load initial data
    await Promise.all([
      this.loadCommands(),
      this.loadContextFiles(),
      this.loadRecentSheets()
    ]);

    // Setup event listeners
    this.setupEventListeners();
    
    // Handle routing
    this.handleRoute();
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item, .desktop-nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('href').substring(1);
        this.navigate(view);
      });
    });

    // Quick generate
    const quickGenerate = document.getElementById('quick-generate');
    if (quickGenerate) {
      quickGenerate.addEventListener('click', () => this.handleQuickGenerate());
    }

    // Quick prompt enter key
    const quickPrompt = document.getElementById('quick-prompt');
    if (quickPrompt) {
      quickPrompt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.metaKey) {
          this.handleQuickGenerate();
        }
      });
    }

    // GitHub button
    const githubBtn = document.getElementById('github-btn');
    if (githubBtn) {
      githubBtn.addEventListener('click', () => this.handleGitHubClick());
    }

    // Search button
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.showSearch());
    }

    // FAB
    const fab = document.getElementById('fab');
    if (fab) {
      fab.addEventListener('click', () => this.showQuickAction());
    }

    // Window popstate for back button
    window.addEventListener('popstate', () => this.handleRoute());

    // Auto-suggest for context files
    quickPrompt?.addEventListener('input', (e) => {
      this.handlePromptInput(e.target.value);
    });
  }

  navigate(view) {
    this.currentView = view;
    window.location.hash = view;
    this.render();
  }

  handleRoute() {
    const hash = window.location.hash.substring(1) || 'home';
    if (hash.startsWith('sheet/')) {
      const sheetId = hash.substring(6);
      this.showSheet(sheetId);
    } else {
      this.currentView = hash;
      this.render();
    }
  }

  render() {
    // Hide all views
    document.querySelectorAll('[id$="-view"]').forEach(view => {
      view.style.display = 'none';
    });

    // Update nav active states
    document.querySelectorAll('.nav-item, .desktop-nav a').forEach(link => {
      const href = link.getAttribute('href')?.substring(1);
      link.classList.toggle('active', href === this.currentView);
    });

    // Show current view
    const viewElement = document.getElementById(`${this.currentView}-view`);
    if (viewElement) {
      viewElement.style.display = 'block';
      viewElement.classList.add('fade-in');
    }

    // Show/hide FAB based on view
    const fab = document.getElementById('fab');
    if (fab) {
      fab.style.display = this.currentView !== 'home' ? 'flex' : 'none';
    }

    // Render view-specific content
    switch (this.currentView) {
      case 'home':
        this.renderHome();
        break;
      case 'sheets':
        this.renderSheets();
        break;
      case 'discover':
        this.renderDiscover();
        break;
      case 'context':
        this.renderContext();
        break;
    }
  }

  renderHome() {
    // Render commands
    const commandGrid = document.getElementById('command-grid');
    if (commandGrid) {
      commandGrid.innerHTML = this.commands.map(cmd => `
        <div class="command-card" onclick="app.selectCommand('${cmd.id}')">
          <div class="command-header">
            <span class="command-icon">${cmd.icon}</span>
            <div class="command-info">
              <div class="command-name">${cmd.name}</div>
              <div class="command-desc">${cmd.description}</div>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Render recent sheets
    const recentSheets = document.getElementById('recent-sheets');
    if (recentSheets) {
      if (this.recentSheets.length === 0) {
        recentSheets.innerHTML = `
          <div class="empty-state">
            <div class="empty-title">no sheets yet</div>
            <div class="empty-desc">generate your first sheet to get started</div>
          </div>
        `;
      } else {
        recentSheets.innerHTML = this.recentSheets.slice(0, 5).map(sheet => `
          <div class="sheet-card" onclick="app.showSheet('${sheet.id}')">
            <div class="sheet-card-title">${sheet.title}</div>
            <div class="sheet-card-meta">${this.formatDate(sheet.created_at)}</div>
          </div>
        `).join('');
      }
    }

    // Render context tags
    this.renderContextTags();
  }

  renderContextTags() {
    const contextTags = document.getElementById('context-tags');
    if (contextTags && this.contextFiles.length > 0) {
      contextTags.innerHTML = `
        <span class="context-label">include context:</span>
        ${this.contextFiles.map(file => `
          <span class="context-tag" data-path="${file.path}" onclick="app.toggleContext('${file.path}')">
            #${file.path}
          </span>
        `).join('')}
      `;
    }
  }

  async handleQuickGenerate() {
    const promptInput = document.getElementById('quick-prompt');
    const generateBtn = document.getElementById('quick-generate');
    
    if (!promptInput || !generateBtn) return;
    
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    // Get selected context files
    const selectedContext = Array.from(document.querySelectorAll('.context-tag.active'))
      .map(tag => tag.dataset.path);

    // Show loading state
    generateBtn.classList.add('loading');
    generateBtn.textContent = 'generating...';

    try {
      // Determine if it's a repo analysis or general prompt
      const isRepoAnalysis = /github\.com|^\w+\/\w+$/.test(prompt);
      
      let endpoint = '/api/generate';
      let body = { prompt, context: selectedContext };

      if (isRepoAnalysis) {
        endpoint = '/api/analyze-repo';
        body = { 
          repo: prompt, 
          analysisType: 'overview',
          userToken: this.user?.githubToken 
        };
      }

      // Create a new sheet
      const sheet = {
        id: this.generateId(),
        title: isRepoAnalysis ? `Analysis: ${prompt}` : prompt.substring(0, 50) + '...',
        content: '',
        metadata: { prompt, context: selectedContext },
        created_at: new Date().toISOString()
      };

      // Navigate to sheet view
      this.showSheet(sheet.id, sheet);

      // Stream the response
      const response = await fetch(`${this.workerUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sheets-token') || ''}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to generate sheet');

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.choices?.[0]?.delta?.content) {
                content += data.choices[0].delta.content;
                this.updateSheetContent(sheet.id, content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Save the sheet
      sheet.content = content;
      await this.saveSheet(sheet);

      // Clear input
      promptInput.value = '';

    } catch (error) {
      console.error('Generation error:', error);
      this.showError('Failed to generate sheet. Please try again.');
    } finally {
      generateBtn.classList.remove('loading');
      generateBtn.textContent = 'generate sheet';
    }
  }

  async showSheet(sheetId, tempSheet = null) {
    this.currentView = 'sheet';
    window.location.hash = `sheet/${sheetId}`;

    // Hide other views
    document.querySelectorAll('[id$="-view"]').forEach(view => {
      view.style.display = 'none';
    });

    // Show sheet view
    const sheetView = document.getElementById('sheet-view');
    if (sheetView) {
      sheetView.style.display = 'block';
      sheetView.classList.add('fade-in');
    }

    // Show loading state
    const sheetTitle = document.getElementById('sheet-title');
    const sheetDate = document.getElementById('sheet-date');
    const sheetRepo = document.getElementById('sheet-repo');
    const sheetContent = document.getElementById('sheet-content');

    if (tempSheet) {
      // Use temporary sheet data
      sheetTitle.textContent = tempSheet.title;
      sheetDate.textContent = this.formatDate(tempSheet.created_at);
      sheetRepo.textContent = tempSheet.metadata?.prompt || '-';
      sheetContent.innerHTML = this.renderMarkdown(tempSheet.content || '');
      this.currentSheet = tempSheet;
    } else {
      // Load sheet from API
      sheetTitle.textContent = 'Loading...';
      sheetContent.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width: 80%;"></div>
      `;

      try {
        const response = await fetch(`${this.workerUrl}/api/sheets/${sheetId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sheets-token') || ''}`
          }
        });

        if (!response.ok) throw new Error('Sheet not found');

        const { sheet } = await response.json();
        
        sheetTitle.textContent = sheet.title;
        sheetDate.textContent = this.formatDate(sheet.created_at);
        sheetRepo.textContent = sheet.metadata?.prompt || '-';
        sheetContent.innerHTML = this.renderMarkdown(sheet.content);
        this.currentSheet = sheet;

      } catch (error) {
        console.error('Error loading sheet:', error);
        sheetContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <div class="empty-title">sheet not found</div>
            <div class="empty-desc">this sheet may have been deleted or you don't have access</div>
          </div>
        `;
      }
    }
  }

  updateSheetContent(sheetId, content) {
    const sheetContent = document.getElementById('sheet-content');
    if (sheetContent && this.currentSheet?.id === sheetId) {
      sheetContent.innerHTML = this.renderMarkdown(content);
    }
  }

  renderMarkdown(content) {
    // Simple markdown rendering (you'd want to use a proper markdown library)
    return content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\* (.+)/gim, '<li>$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\`(.+?)\`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/<li>/g, '<ul><li>')
      .replace(/<\/li>(?![\s\S]*<li>)/g, '</li></ul>');
  }

  async saveSheet(sheet) {
    try {
      const response = await fetch(`${this.workerUrl}/api/sheets/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sheets-token') || ''}`
        },
        body: JSON.stringify(sheet)
      });

      if (!response.ok) throw new Error('Failed to save sheet');

      const { id } = await response.json();
      sheet.id = id;

      // Add to recent sheets
      this.recentSheets.unshift(sheet);
      this.recentSheets = this.recentSheets.slice(0, 20);

      return id;
    } catch (error) {
      console.error('Error saving sheet:', error);
      // Continue even if save fails - user still has the content
    }
  }

  async loadCommands() {
    try {
      const response = await fetch(`${this.workerUrl}/api/commands`);
      const { commands } = await response.json();
      this.commands = commands;
    } catch (error) {
      console.error('Error loading commands:', error);
      // Fallback commands
      this.commands = [
        {
          id: 'analyze',
          name: 'analyze repository',
          description: 'deep dive into github repositories',
          icon: '🔍'
        },
        {
          id: 'extract',
          name: 'extract patterns',
          description: 'extract reusable patterns from code',
          icon: '✨'
        },
        {
          id: 'vision',
          name: 'product vision',
          description: 'reimagine your product with AI',
          icon: '🧘'
        }
      ];
    }
  }

  async loadContextFiles() {
    if (!this.user) return;

    try {
      const response = await fetch(`${this.workerUrl}/api/context`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sheets-token') || ''}`
        }
      });

      if (response.ok) {
        const { files } = await response.json();
        this.contextFiles = files;
      }
    } catch (error) {
      console.error('Error loading context files:', error);
    }
  }

  async loadRecentSheets() {
    if (!this.user) return;

    try {
      const response = await fetch(`${this.workerUrl}/api/sheets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sheets-token') || ''}`
        }
      });

      if (response.ok) {
        const { sheets } = await response.json();
        this.recentSheets = sheets;
      }
    } catch (error) {
      console.error('Error loading recent sheets:', error);
    }
  }

  async checkAuth() {
    try {
      const response = await fetch(`${this.workerUrl}/api/github/user`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sheets-token') || ''}`
        }
      });

      if (response.ok) {
        const { user } = await response.json();
        this.user = user;
        this.updateAuthUI();
      } else {
        localStorage.removeItem('sheets-token');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('sheets-token');
    }
  }

  updateAuthUI() {
    const githubBtn = document.getElementById('github-btn');
    if (githubBtn) {
      if (this.user) {
        githubBtn.innerHTML = `<img src="${this.user.avatar}" alt="${this.user.name}" style="width: 24px; height: 24px; border-radius: 50%;">`;
      } else {
        githubBtn.innerHTML = '<span>👤</span>';
      }
    }
  }

  async handleGitHubClick() {
    if (this.user) {
      // Show user menu
      this.showUserMenu();
    } else {
      // Show auth modal
      const modal = document.getElementById('github-modal');
      if (modal) {
        modal.style.display = 'flex';
      }
    }
  }

  showUserMenu() {
    // Implementation for user menu
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
      <div class="user-info">
        <img src="${this.user.avatar}" alt="${this.user.name}">
        <div>
          <div class="user-name">${this.user.name || this.user.login}</div>
          <div class="user-login">@${this.user.login}</div>
        </div>
      </div>
      <div class="menu-divider"></div>
      <button class="menu-item" onclick="app.signOut()">sign out</button>
    `;
    document.body.appendChild(menu);

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }

  async signOut() {
    localStorage.removeItem('sheets-token');
    this.user = null;
    this.updateAuthUI();
    this.recentSheets = [];
    this.contextFiles = [];
    this.render();
  }

  selectCommand(commandId) {
    const command = this.commands.find(c => c.id === commandId);
    if (!command) return;

    // Pre-fill the prompt input with command template
    const promptInput = document.getElementById('quick-prompt');
    if (promptInput) {
      const templates = {
        analyze: 'analyze [github-url] focusing on architecture and patterns',
        compare: 'compare [repo1] with [repo2] highlighting key differences',
        extract: 'extract reusable patterns from [github-url]',
        audit: 'security audit for [github-url] with vulnerability analysis',
        document: 'generate comprehensive docs for [github-url]',
        vision: 'reimagine [product/repo] with AI-native experiences'
      };

      promptInput.value = templates[commandId] || '';
      promptInput.focus();
      
      // Highlight placeholder text
      const placeholderMatch = promptInput.value.match(/\[([^\]]+)\]/);
      if (placeholderMatch) {
        promptInput.setSelectionRange(
          placeholderMatch.index,
          placeholderMatch.index + placeholderMatch[0].length
        );
      }
    }
  }

  toggleContext(path) {
    const tag = document.querySelector(`.context-tag[data-path="${path}"]`);
    if (tag) {
      tag.classList.toggle('active');
    }
  }

  handlePromptInput(value) {
    // Auto-suggest context files when typing #
    const hashIndex = value.lastIndexOf('#');
    if (hashIndex !== -1 && hashIndex === value.length - 1 || value[hashIndex + 1] !== ' ') {
      // Show context suggestions
      this.showContextSuggestions(value.substring(hashIndex + 1));
    }
  }

  showContextSuggestions(query) {
    // Implementation for context file suggestions
    console.log('Suggesting context files for:', query);
  }

  // Utility functions
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  showError(message) {
    // Simple error toast
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Sheet actions
  copySheet() {
    if (!this.currentSheet) return;
    
    navigator.clipboard.writeText(this.currentSheet.content).then(() => {
      this.showToast('copied to clipboard');
    });
  }

  shareSheet() {
    if (!this.currentSheet) return;
    
    const url = `${window.location.origin}/#sheet/${this.currentSheet.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('link copied');
    });
  }

  downloadSheet() {
    if (!this.currentSheet) return;
    
    const blob = new Blob([this.currentSheet.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentSheet.title.replace(/[^a-z0-9]/gi, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

// GitHub OAuth
async function connectGitHub() {
  try {
    const response = await fetch(`${app.workerUrl}/api/github/auth`);
    const { authUrl } = await response.json();
    window.location.href = authUrl;
  } catch (error) {
    console.error('GitHub auth error:', error);
    app.showError('Failed to connect to GitHub');
  }
}

// Initialize app
const app = new SheetsApp();

// Global functions for onclick handlers
window.app = app;
window.connectGitHub = connectGitHub;
window.copySheet = () => app.copySheet();
window.shareSheet = () => app.shareSheet();
window.downloadSheet = () => app.downloadSheet();