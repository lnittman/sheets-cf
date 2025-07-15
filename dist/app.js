// Main app functionality
class SheetsApp {
  constructor() {
    this.promptInput = document.getElementById('prompt');
    this.generateBtn = document.getElementById('generate');
    this.output = document.getElementById('output');
    this.status = document.getElementById('status');
    this.autocomplete = document.getElementById('autocomplete');
    
    this.init();
  }
  
  init() {
    // Event listeners
    this.generateBtn.addEventListener('click', () => this.generateReport());
    this.promptInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.generateReport();
      }
    });
    
    // Autocomplete for file tags
    this.promptInput.addEventListener('input', (e) => this.handleAutocomplete(e));
    
    // Load initial state
    this.checkWorkerStatus();
  }
  
  async checkWorkerStatus() {
    try {
      const response = await fetch('/api/rules');
      if (response.ok) {
        this.status.textContent = 'Ready';
        this.status.style.color = '#4a9eff';
      }
    } catch (error) {
      this.status.textContent = 'Worker Offline';
      this.status.style.color = '#ff4a4a';
    }
  }
  
  async handleAutocomplete(e) {
    const value = e.target.value;
    const lastChar = value[e.target.selectionStart - 1];
    
    if (lastChar === '#') {
      // Show autocomplete
      const response = await fetch('/api/autocomplete?q=');
      const files = await response.json();
      
      if (files.length > 0) {
        this.showAutocomplete(files, e.target.selectionStart);
      }
    } else if (value.includes('#')) {
      // Update autocomplete based on current tag
      const match = value.slice(0, e.target.selectionStart).match(/#([\w\/\.\-]*)$/);
      if (match) {
        const query = match[1];
        const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}`);
        const files = await response.json();
        
        if (files.length > 0) {
          this.showAutocomplete(files, e.target.selectionStart - query.length);
        } else {
          this.hideAutocomplete();
        }
      }
    } else {
      this.hideAutocomplete();
    }
  }
  
  showAutocomplete(files, position) {
    this.autocomplete.innerHTML = files
      .map(file => `<div class="autocomplete-item" data-file="${file}">${file}</div>`)
      .join('');
    
    // Add click handlers
    this.autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const file = item.dataset.file;
        const value = this.promptInput.value;
        const before = value.slice(0, position - 1);
        const after = value.slice(position - 1);
        
        // Replace the # and partial path with the full path
        const newValue = before + '#' + file + ' ' + after.replace(/^#[\w\/\.\-]*/, '');
        this.promptInput.value = newValue;
        this.promptInput.focus();
        this.hideAutocomplete();
      });
    });
  }
  
  hideAutocomplete() {
    this.autocomplete.innerHTML = '';
  }
  
  async generateReport() {
    const prompt = this.promptInput.value.trim();
    
    if (!prompt) {
      this.showError('Please enter a prompt with at least one URL');
      return;
    }
    
    // Check for URLs
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const urls = prompt.match(urlRegex);
    
    if (!urls || urls.length === 0) {
      this.showError('Please include at least one URL in your prompt');
      return;
    }
    
    // Disable button and update status
    this.generateBtn.disabled = true;
    this.status.textContent = 'Generating report...';
    this.status.style.color = '#ffa500';
    this.output.textContent = '';
    this.output.classList.add('loading');
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      this.output.classList.remove('loading');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        this.output.textContent += chunk;
        
        // Auto-scroll to bottom
        this.output.scrollTop = this.output.scrollHeight;
      }
      
      this.status.textContent = 'Report generated';
      this.status.style.color = '#4aff4a';
      
    } catch (error) {
      this.showError(`Error: ${error.message}`);
    } finally {
      this.generateBtn.disabled = false;
      this.output.classList.remove('loading');
    }
  }
  
  showError(message) {
    this.status.textContent = 'Error';
    this.status.style.color = '#ff4a4a';
    this.output.textContent = message;
    this.output.classList.remove('loading');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SheetsApp();
});

// Handle navigation
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    if (link.getAttribute('href') === '/rules') {
      e.preventDefault();
      window.location.href = '/rules.html';
    } else if (link.getAttribute('href') === '/docs') {
      e.preventDefault();
      window.location.href = '/docs.html';
    }
  });
});
