// Rules page functionality
class RulesManager {
  constructor() {
    this.fileInput = document.getElementById('fileInput');
    this.pathInput = document.getElementById('pathInput');
    this.uploadBtn = document.getElementById('uploadBtn');
    this.uploadStatus = document.getElementById('uploadStatus');
    this.filetree = document.getElementById('filetree');
    this.fileCount = document.getElementById('fileCount');
    this.fileEditor = document.getElementById('fileEditor');
    this.editorTitle = document.getElementById('editorTitle');
    this.editorContent = document.getElementById('editorContent');
    
    this.currentFile = null;
    this.files = [];
    
    this.init();
  }
  
  init() {
    // Event listeners
    this.uploadBtn.addEventListener('click', () => this.uploadFiles());
    this.fileInput.addEventListener('change', () => {
      if (this.fileInput.files.length > 0) {
        const firstFile = this.fileInput.files[0];
        if (!this.pathInput.value) {
          this.pathInput.placeholder = firstFile.name;
        }
      }
    });
    
    // Load file tree
    this.loadFileTree();
  }
  
  async loadFileTree() {
    try {
      const response = await fetch('/api/rules');
      const tree = await response.json();
      
      this.renderTree(tree);
      this.updateFileCount();
    } catch (error) {
      this.filetree.innerHTML = '<div class="error">Error loading files: ' + error.message + '</div>';
    }
  }
  
  renderTree(node, container = this.filetree, level = 0) {
    if (level === 0) {
      container.innerHTML = '';
    }
    
    if (node.children) {
      // Directory
      node.children.forEach(child => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        itemDiv.style.marginLeft = `${level * 20}px`;
        
        if (child.type === 'directory') {
          itemDiv.innerHTML = `
            <span class="tree-icon tree-folder">📁</span>
            <span>${child.name}</span>
          `;
          container.appendChild(itemDiv);
          this.renderTree(child, container, level + 1);
        } else {
          // File
          itemDiv.innerHTML = `
            <span class="tree-icon tree-file">📄</span>
            <span>${child.name}</span>
            <div class="file-actions">
              <button class="file-action" data-path="${child.path}" data-action="view">View</button>
              <button class="file-action" data-path="${child.path}" data-action="edit">Edit</button>
              <button class="file-action" data-path="${child.path}" data-action="delete">Delete</button>
            </div>
          `;
          container.appendChild(itemDiv);
          
          // Count files
          this.files.push(child);
        }
      });
    }
    
    // Add event listeners to file actions
    if (level === 0) {
      container.querySelectorAll('.file-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const path = e.target.dataset.path;
          const action = e.target.dataset.action;
          this.handleFileAction(path, action);
        });
      });
    }
  }
  
  updateFileCount() {
    this.fileCount.textContent = `${this.files.length} file${this.files.length !== 1 ? 's' : ''}`;
  }
  
  async handleFileAction(path, action) {
    switch (action) {
      case 'view':
      case 'edit':
        await this.openFile(path, action === 'edit');
        break;
      case 'delete':
        if (confirm(`Delete ${path}?`)) {
          await this.deleteFile(path);
        }
        break;
    }
  }
  
  async openFile(path, editable = false) {
    try {
      const response = await fetch(`/api/rules/${encodeURIComponent(path)}`);
      const content = await response.text();
      
      this.currentFile = path;
      this.editorTitle.textContent = editable ? `Edit: ${path}` : `View: ${path}`;
      this.editorContent.value = content;
      this.editorContent.readOnly = !editable;
      this.fileEditor.style.display = 'block';
      
      // Scroll to editor
      this.fileEditor.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      alert('Error opening file: ' + error.message);
    }
  }
  
  async deleteFile(path) {
    try {
      const response = await fetch(`/api/rules/${encodeURIComponent(path)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        this.showStatus('File deleted successfully', 'success');
        this.loadFileTree();
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      this.showStatus('Error deleting file: ' + error.message, 'error');
    }
  }
  
  async uploadFiles() {
    const files = this.fileInput.files;
    if (files.length === 0) {
      this.showStatus('Please select files to upload', 'error');
      return;
    }
    
    this.uploadBtn.disabled = true;
    this.showStatus('Uploading...', 'info');
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        // Use custom path if provided, otherwise use file name
        const customPath = this.pathInput.value;
        const path = customPath || file.name;
        formData.append('path', path);
        
        const response = await fetch('/api/rules', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }
      
      this.showStatus(`Successfully uploaded ${files.length} file(s)`, 'success');
      this.fileInput.value = '';
      this.pathInput.value = '';
      this.loadFileTree();
      
    } catch (error) {
      this.showStatus('Error uploading: ' + error.message, 'error');
    } finally {
      this.uploadBtn.disabled = false;
    }
  }
  
  showStatus(message, type = 'info') {
    this.uploadStatus.textContent = message;
    this.uploadStatus.style.color = type === 'error' ? '#ff4a4a' : 
                                    type === 'success' ? '#4aff4a' : '#4a9eff';
    
    if (type !== 'error') {
      setTimeout(() => {
        this.uploadStatus.textContent = '';
      }, 3000);
    }
  }
}

// Global functions for editor
window.saveFile = async function() {
  const manager = window.rulesManager;
  if (!manager.currentFile) return;
  
  try {
    const formData = new FormData();
    const blob = new Blob([manager.editorContent.value], { type: 'text/plain' });
    formData.append('file', blob);
    formData.append('path', manager.currentFile);
    
    const response = await fetch('/api/rules', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      manager.showStatus('File saved successfully', 'success');
      manager.loadFileTree();
    } else {
      throw new Error('Failed to save file');
    }
  } catch (error) {
    manager.showStatus('Error saving file: ' + error.message, 'error');
  }
};

window.closeEditor = function() {
  const manager = window.rulesManager;
  manager.fileEditor.style.display = 'none';
  manager.currentFile = null;
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.rulesManager = new RulesManager();
});

// Handle navigation
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    if (link.getAttribute('href') === '/') {
      e.preventDefault();
      window.location.href = '/';
    } else if (link.getAttribute('href') === '/docs') {
      e.preventDefault();
      window.location.href = '/docs.html';
    }
  });
});
