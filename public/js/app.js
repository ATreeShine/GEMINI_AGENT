/**
 * Advanced AI Chat Application
 * Frontend JavaScript Implementation
 */

// State Management
const STATE = {
  currentChatId: null,
  messages: [],
  chats: [],
  settings: {
      temperature: 0.7,
      systemPrompt: "You are an AI assistant. Respond thoughtfully and helpfully.",
      maxTokens: 4096,
      topK: 40,
      topP: 0.95,
  },
  userPreferences: {
      theme: 'light',
      showTimestamps: false,
      autoScroll: true,
      keyboardShortcuts: true,
  },
  isSidebarOpen: true,
  isProcessing: false,
};

// DOM Elements
const DOM = {
  // Main container elements
  sidebar: document.getElementById('sidebar'),
  chatContainer: document.getElementById('chat-container'),
  welcomeContainer: document.getElementById('welcome-container'),
  messagesContainer: document.getElementById('messages'),
  inputContainer: document.querySelector('.input-container'),
  
  // Input and buttons
  messageInput: document.getElementById('message-input'),
  sendButton: document.getElementById('send-btn'),
  newChatButton: document.getElementById('new-chat-btn'),
  clearButton: document.getElementById('clear-btn'),
  exportButton: document.getElementById('export-btn'),
  
  // Sidebar elements
  chatList: document.getElementById('chat-list'),
  toggleSidebarButton: document.getElementById('toggle-sidebar-btn'),
  
  // Headers and indicators
  chatTitle: document.getElementById('chat-title'),
  typingIndicator: document.getElementById('typing-indicator'),
  
  // Modals
  settingsModal: document.getElementById('settings-modal'),
  exportModal: document.getElementById('export-modal'),
  deleteModal: document.getElementById('delete-modal'),
  
  // Modal buttons
  settingsButton: document.getElementById('settings-btn'),
  toggleThemeButton: document.getElementById('toggle-theme-btn'),
  saveSettingsButton: document.getElementById('save-settings-btn'),
  resetSettingsButton: document.getElementById('reset-settings-btn'),
  doExportButton: document.getElementById('do-export-btn'),
  confirmDeleteButton: document.getElementById('confirm-delete-btn'),
  
  // Settings form elements
  temperatureSlider: document.getElementById('temperature'),
  temperatureValue: document.getElementById('temperature-value'),
  maxTokensSlider: document.getElementById('max-tokens'),
  maxTokensValue: document.getElementById('max-tokens-value'),
  topPSlider: document.getElementById('top-p'),
  topPValue: document.getElementById('top-p-value'),
  topKSlider: document.getElementById('top-k'),
  topKValue: document.getElementById('top-k-value'),
  systemPromptInput: document.getElementById('system-prompt'),
  
  // User preference checkboxes
  autoScrollCheckbox: document.getElementById('auto-scroll'),
  showTimestampsCheckbox: document.getElementById('show-timestamps'),
  keyboardShortcutsCheckbox: document.getElementById('keyboard-shortcuts'),
  
  // All close buttons
  closeButtons: document.querySelectorAll('.close-btn'),
  cancelButtons: document.querySelectorAll('.cancel-btn'),
  
  // Other
  suggestionChips: document.querySelectorAll('.suggestion-chip'),
  toastContainer: document.getElementById('toast-container'),
};

// API Service
const API = {
  baseUrl: '/api',
  
  async checkStatus() {
      try {
          const response = await fetch(`${this.baseUrl}/status`);
          return await response.json();
      } catch (error) {
          console.error('API Status Check Error:', error);
          return { status: 'offline', error: error.message };
      }
  },
  
  async sendMessage(message, chatId = null, settings = null) {
      try {
          const response = await fetch(`${this.baseUrl}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message, chatId, settings }),
          });
          
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to send message');
          }
          
          return await response.json();
      } catch (error) {
          console.error('Send Message Error:', error);
          throw error;
      }
  },
  
  async getChats() {
      try {
          const response = await fetch(`${this.baseUrl}/chats`);
          if (!response.ok) throw new Error('Failed to fetch chats');
          return await response.json();
      } catch (error) {
          console.error('Get Chats Error:', error);
          throw error;
      }
  },
  
  async getChat(chatId) {
      try {
          const response = await fetch(`${this.baseUrl}/chats/${chatId}`);
          if (!response.ok) throw new Error('Failed to fetch chat');
          return await response.json();
      } catch (error) {
          console.error(`Get Chat Error (${chatId}):`, error);
          throw error;
      }
  },
  
  async deleteChat(chatId) {
      try {
          const response = await fetch(`${this.baseUrl}/chats/${chatId}`, {
              method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete chat');
          return await response.json();
      } catch (error) {
          console.error(`Delete Chat Error (${chatId}):`, error);
          throw error;
      }
  },
  
  async exportChat(chatId, format) {
      try {
          const response = await fetch(`${this.baseUrl}/chats/${chatId}/export`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ format }),
          });
          if (!response.ok) throw new Error('Failed to export chat');
          return await response.json();
      } catch (error) {
          console.error(`Export Chat Error (${chatId}):`, error);
          throw error;
      }
  },
  
  async updateChatSettings(chatId, settings) {
      try {
          const response = await fetch(`${this.baseUrl}/chats/${chatId}/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ settings }),
          });
          if (!response.ok) throw new Error('Failed to update chat settings');
          return await response.json();
      } catch (error) {
          console.error(`Update Settings Error (${chatId}):`, error);
          throw error;
      }
  },
  
  async updateChatTitle(chatId, title) {
      try {
          const response = await fetch(`${this.baseUrl}/chats/${chatId}/title`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title }),
          });
          if (!response.ok) throw new Error('Failed to update chat title');
          return await response.json();
      } catch (error) {
          console.error(`Update Title Error (${chatId}):`, error);
          throw error;
      }
  }
};

// UI Renderer
const UI = {
  renderMessage(message) {
      const messageEl = document.createElement('div');
      messageEl.className = `message message-${message.role}`;
      
      const isUser = message.role === 'user';
      const avatar = isUser ? 'U' : 'AI';
      const avatarClass = isUser ? 'avatar-user' : 'avatar-ai';
      
      messageEl.innerHTML = `
          <div class="message-avatar ${avatarClass}">${avatar}</div>
          <div class="message-wrapper">
              <div class="message-content">${this.formatMessageContent(message.content)}</div>
              ${STATE.userPreferences.showTimestamps && message.timestamp ? 
                  `<div class="message-footer">
                      <div class="message-timestamp">${this.formatTimestamp(message.timestamp)}</div>
                      <div class="message-actions">
                          <button class="icon-btn copy-btn" title="Copy to clipboard">
                              <i class="fas fa-copy"></i>
                          </button>
                      </div>
                  </div>` : ''
              }
          </div>
      `;
      
      // Add event listener for copy button
      const copyBtn = messageEl.querySelector('.copy-btn');
      if (copyBtn) {
          copyBtn.addEventListener('click', () => {
              navigator.clipboard.writeText(message.content)
                  .then(() => this.showToast('Text copied to clipboard!', 'success'))
                  .catch(() => this.showToast('Failed to copy text', 'error'));
          });
      }
      
      DOM.messagesContainer.appendChild(messageEl);
      
      // Scroll to bottom if auto-scroll is enabled
      if (STATE.userPreferences.autoScroll) {
          this.scrollToBottom();
      }
      
      return messageEl;
  },
  
  renderChatList() {
      DOM.chatList.innerHTML = '';
      
      if (STATE.chats.length === 0) {
          DOM.chatList.innerHTML = '<div class="empty-state">No chats found</div>';
          return;
      }
      
      STATE.chats.forEach(chat => {
          const chatItem = document.createElement('div');
          chatItem.className = 'chat-item';
          if (STATE.currentChatId === chat.id) {
              chatItem.classList.add('active');
          }
          
          chatItem.innerHTML = `
              <div class="chat-item-title">${chat.title || `Chat ${chat.id}`}</div>
              <div class="chat-item-actions">
                  <button class="icon-btn delete-chat-btn" data-chat-id="${chat.id}" title="Delete chat">
                      <i class="fas fa-trash"></i>
                  </button>
              </div>
          `;
          
          chatItem.addEventListener('click', (e) => {
              if (!e.target.closest('.delete-chat-btn')) {
                  this.loadChat(chat.id);
              }
          });
          
          const deleteBtn = chatItem.querySelector('.delete-chat-btn');
          if (deleteBtn) {
              deleteBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  this.showDeleteConfirmation(chat.id);
              });
          }
          
          DOM.chatList.appendChild(chatItem);
      });
  },
  
  renderMessages() {
      DOM.messagesContainer.innerHTML = '';
      STATE.messages.forEach(message => {
          this.renderMessage(message);
      });
      
      // Show or hide welcome container based on messages
      if (STATE.messages.length > 0) {
          DOM.welcomeContainer.classList.add('hidden');
      } else {
          DOM.welcomeContainer.classList.remove('hidden');
      }
      
      this.scrollToBottom();
  },
  
  updateUIForNewChat() {
      STATE.currentChatId = null;
      STATE.messages = [];
      DOM.chatTitle.textContent = 'New Conversation';
      this.renderMessages();
      this.updateSendButtonState();
  },
  
  updateUIAfterSend() {
      DOM.messageInput.value = '';
      DOM.messageInput.style.height = 'auto';
      this.updateSendButtonState();
      DOM.messageInput.focus();
  },
  
  updateSendButtonState() {
      DOM.sendButton.disabled = !DOM.messageInput.value.trim();
  },
  
  formatMessageContent(content) {
      // Very basic markdown-like formatting
      // In a production app, use a proper markdown parser
      
      // Escape HTML
      let formatted = this.escapeHTML(content);
      
      // Code blocks
      formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, language, code) => {
          return `<pre class="code-block ${language || ''}"><code>${this.escapeHTML(code)}</code></pre>`;
      });
      
      // Inline code
      formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      // Bold
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Italic
      formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      
      // Links
      formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      
      // Headers
      formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>');
      formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>');
      formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>');
      
      // Lists
      formatted = formatted.replace(/^\* (.*$)/gm, '<li>$1</li>');
      formatted = formatted.replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>');
      
      // Paragraphs - replace newlines with <br> for simplicity
      formatted = formatted.replace(/\n/g, '<br>');
      
      return formatted;
  },
  
  escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  },
  
  formatTimestamp(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
  
  scrollToBottom() {
      DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
  },
  
  showToast(message, type = 'info', duration = 3000) {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      let icon = 'info-circle';
      if (type === 'success') icon = 'check-circle';
      if (type === 'error') icon = 'exclamation-circle';
      
      toast.innerHTML = `
          <div class="toast-icon"><i class="fas fa-${icon}"></i></div>
          <div class="toast-message">${message}</div>
      `;
      
      DOM.toastContainer.appendChild(toast);
      
      // Remove after duration
      setTimeout(() => {
          toast.classList.add('fading-out');
          setTimeout(() => {
              DOM.toastContainer.removeChild(toast);
          }, 300);
      }, duration);
  },
  
  showTypingIndicator() {
      DOM.typingIndicator.classList.remove('hidden');
      this.scrollToBottom();
  },
  
  hideTypingIndicator() {
      DOM.typingIndicator.classList.add('hidden');
  },
  
  toggleSidebar() {
      STATE.isSidebarOpen = !STATE.isSidebarOpen;
      DOM.sidebar.classList.toggle('open', STATE.isSidebarOpen);
  },
  
  toggleTheme() {
      STATE.userPreferences.theme = STATE.userPreferences.theme === 'light' ? 'dark' : 'light';
      document.body.classList.toggle('theme-dark', STATE.userPreferences.theme === 'dark');
      document.body.classList.toggle('theme-light', STATE.userPreferences.theme === 'light');
      this.saveUserPreferences();
      
      // Update icon
      const themeIcon = DOM.toggleThemeButton.querySelector('i');
      themeIcon.className = STATE.userPreferences.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  },
  
  showSettingsModal() {
      // Update settings form with current values
      DOM.temperatureSlider.value = STATE.settings.temperature;
      DOM.temperatureValue.textContent = STATE.settings.temperature;
      
      DOM.maxTokensSlider.value = STATE.settings.maxTokens;
      DOM.maxTokensValue.textContent = STATE.settings.maxTokens;
      
      DOM.topPSlider.value = STATE.settings.topP;
      DOM.topPValue.textContent = STATE.settings.topP;
      
      DOM.topKSlider.value = STATE.settings.topK;
      DOM.topKValue.textContent = STATE.settings.topK;
      
      DOM.systemPromptInput.value = STATE.settings.systemPrompt;
      
      // Update user preferences
      DOM.autoScrollCheckbox.checked = STATE.userPreferences.autoScroll;
      DOM.showTimestampsCheckbox.checked = STATE.userPreferences.showTimestamps;
      DOM.keyboardShortcutsCheckbox.checked = STATE.userPreferences.keyboardShortcuts;
      
      // Show the modal
      DOM.settingsModal.style.display = 'block';
  },
  
  showExportModal() {
      if (!STATE.currentChatId) {
          this.showToast('No chat to export', 'error');
          return;
      }
      DOM.exportModal.style.display = 'block';
  },
  
  showDeleteConfirmation(chatId) {
      STATE.chatToDelete = chatId;
      DOM.deleteModal.style.display = 'block';
  },
  
  closeModal(modal) {
      modal.style.display = 'none';
  },
  
  closeAllModals() {
      DOM.settingsModal.style.display = 'none';
      DOM.exportModal.style.display = 'none';
      DOM.deleteModal.style.display = 'none';
  },
  
  saveSettings() {
      const newSettings = {
          temperature: parseFloat(DOM.temperatureSlider.value),
          maxTokens: parseInt(DOM.maxTokensSlider.value),
          topP: parseFloat(DOM.topPSlider.value),
          topK: parseInt(DOM.topKSlider.value),
          systemPrompt: DOM.systemPromptInput.value,
      };
      
      // Update user preferences
      STATE.userPreferences.autoScroll = DOM.autoScrollCheckbox.checked;
      STATE.userPreferences.showTimestamps = DOM.showTimestampsCheckbox.checked;
      STATE.userPreferences.keyboardShortcuts = DOM.keyboardShortcutsCheckbox.checked;
      
      // Save user preferences
      this.saveUserPreferences();
      
      // Only update settings if they've changed
      if (JSON.stringify(newSettings) !== JSON.stringify(STATE.settings)) {
          STATE.settings = newSettings;
          
          // If we have a current chat, update its settings
          if (STATE.currentChatId) {
              API.updateChatSettings(STATE.currentChatId, newSettings)
                  .then(() => {
                      this.showToast('Settings saved successfully', 'success');
                  })
                  .catch(error => {
                      this.showToast(`Error saving settings: ${error.message}`, 'error');
                  });
          } else {
              this.showToast('Settings saved for new conversations', 'success');
          }
      }
      
      this.closeModal(DOM.settingsModal);
      
      // Re-render messages to apply timestamp setting
      if (STATE.messages.length > 0) {
          this.renderMessages();
      }
  },
  
  resetSettings() {
      const defaultSettings = {
          temperature: 0.7,
          systemPrompt: "You are an AI assistant. Respond thoughtfully and helpfully.",
          maxTokens: 4096,
          topK: 40,
          topP: 0.95,
      };
      
      STATE.settings = defaultSettings;
      
      // Update UI
      DOM.temperatureSlider.value = defaultSettings.temperature;
      DOM.temperatureValue.textContent = defaultSettings.temperature;
      
      DOM.maxTokensSlider.value = defaultSettings.maxTokens;
      DOM.maxTokensValue.textContent = defaultSettings.maxTokens;
      
      DOM.topPSlider.value = defaultSettings.topP;
      DOM.topPValue.textContent = defaultSettings.topP;
      
      DOM.topKSlider.value = defaultSettings.topK;
      DOM.topKValue.textContent = defaultSettings.topK;
      
      DOM.systemPromptInput.value = defaultSettings.systemPrompt;
      
      this.showToast('Settings reset to defaults', 'info');
  },
  
  exportChat() {
      if (!STATE.currentChatId) {
          this.showToast('No chat to export', 'error');
          return;
      }
      
      const format = document.querySelector('input[name="export-format"]:checked').value;
      const includeSettings = document.getElementById('include-settings').checked;
      
      API.exportChat(STATE.currentChatId, format)
          .then(result => {
              if (result.success) {
                  this.showToast(`Chat exported successfully as ${format.toUpperCase()}`, 'success');
                  // In a real app, you'd provide a download link
                  console.log('Export path:', result.path);
              } else {
                  this.showToast('Failed to export chat', 'error');
              }
              this.closeModal(DOM.exportModal);
          })
          .catch(error => {
              this.showToast(`Export error: ${error.message}`, 'error');
              this.closeModal(DOM.exportModal);
          });
  },
  
  deleteChat() {
      if (!STATE.chatToDelete) return;
      
      API.deleteChat(STATE.chatToDelete)
          .then(result => {
              if (result.success) {
                  // If we deleted the current chat, start a new one
                  if (STATE.chatToDelete === STATE.currentChatId) {
                      this.updateUIForNewChat();
                  }
                  
                  // Refresh chat list
                  this.loadChatList();
                  this.showToast('Chat deleted successfully', 'success');
              } else {
                  this.showToast(`Failed to delete chat: ${result.error}`, 'error');
              }
              this.closeModal(DOM.deleteModal);
              STATE.chatToDelete = null;
          })
          .catch(error => {
              this.showToast(`Delete error: ${error.message}`, 'error');
              this.closeModal(DOM.deleteModal);
              STATE.chatToDelete = null;
          });
  },
  
  loadChat(chatId) {
      if (STATE.currentChatId === chatId) return;
      
      API.getChat(chatId)
          .then(chatData => {
              STATE.currentChatId = chatId;
              STATE.messages = chatData.messages || [];
              STATE.settings = chatData.settings || STATE.settings;
              
              // Update UI
              DOM.chatTitle.textContent = chatData.title || `Chat ${chatId}`;
              this.renderMessages();
              this.renderChatList(); // Update active chat in the list
              
              // Hide welcome screen if we have messages
              if (STATE.messages.length > 0) {
                  DOM.welcomeContainer.classList.add('hidden');
              }
          })
          .catch(error => {
              this.showToast(`Error loading chat: ${error.message}`, 'error');
          });
  },
  
  loadChatList() {
      API.getChats()
          .then(data => {
              STATE.chats = data.chats || [];
              this.renderChatList();
          })
          .catch(error => {
              this.showToast(`Error loading chat list: ${error.message}`, 'error');
          });
  },
  
  sendMessage(message) {
      if (!message.trim() || STATE.isProcessing) return;
      
      const userMessage = {
          role: 'user',
          content: message,
          timestamp: Date.now()
      };
      
      // Add user message to UI
      STATE.messages.push(userMessage);
      this.renderMessage(userMessage);
      
      // Update state
      STATE.isProcessing = true;
      this.updateUIAfterSend();
      this.showTypingIndicator();
      
      // Send to API
      API.sendMessage(message, STATE.currentChatId, STATE.settings)
          .then(response => {
              // Hide typing indicator
              this.hideTypingIndicator();
              
              // Update currentChatId if this was a new chat
              if (response.chatId && !STATE.currentChatId) {
                  STATE.currentChatId = response.chatId;
                  DOM.chatTitle.textContent = `Chat ${response.chatId}`;
                  
                  // Refresh chat list to include the new chat
                  this.loadChatList();
              }
              
              // Add AI response to messages and UI
              const aiMessage = {
                  role: 'assistant',
                  content: response.message,
                  timestamp: Date.now()
              };
              
              STATE.messages.push(aiMessage);
              this.renderMessage(aiMessage);
              
              // No longer processing
              STATE.isProcessing = false;
          })
          .catch(error => {
              this.hideTypingIndicator();
              STATE.isProcessing = false;
              this.showToast(`Error: ${error.message}`, 'error');
          });
  },
  
  handleKeyboardShortcuts(event) {
      // Only process if keyboard shortcuts are enabled
      if (!STATE.userPreferences.keyboardShortcuts) return;
      
      // Cmd+Enter or Ctrl+Enter to send message
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          const message = DOM.messageInput.value.trim();
          if (message) {
              this.sendMessage(message);
              event.preventDefault();
          }
      }
      
      // Cmd+N or Ctrl+N for new chat
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
          this.updateUIForNewChat();
          event.preventDefault();
      }
      
      // Cmd+/ or Ctrl+/ to focus input
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
          DOM.messageInput.focus();
          event.preventDefault();
      }
      
      // Escape to close modals
      if (event.key === 'Escape') {
          this.closeAllModals();
      }
  },
  
  saveUserPreferences() {
      localStorage.setItem('chatAppPreferences', JSON.stringify(STATE.userPreferences));
  },
  
  loadUserPreferences() {
      try {
          const savedPreferences = localStorage.getItem('chatAppPreferences');
          if (savedPreferences) {
              STATE.userPreferences = JSON.parse(savedPreferences);
              
              // Apply theme
              document.body.classList.toggle('theme-dark', STATE.userPreferences.theme === 'dark');
              document.body.classList.toggle('theme-light', STATE.userPreferences.theme === 'light');
              
              // Update theme button icon
              const themeIcon = DOM.toggleThemeButton.querySelector('i');
              if (themeIcon) {
                  themeIcon.className = STATE.userPreferences.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
              }
          }
      } catch (error) {
          console.error('Error loading user preferences:', error);
      }
  },
  
  autoResizeTextarea(textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
  }
};

// Event Listeners
function attachEventListeners() {
  // Send message
  DOM.sendButton.addEventListener('click', () => {
      const message = DOM.messageInput.value.trim();
      if (message) {
          UI.sendMessage(message);
      }
  });
  
  // Input handlers
  DOM.messageInput.addEventListener('input', () => {
      UI.updateSendButtonState();
      UI.autoResizeTextarea(DOM.messageInput);
  });
  
  DOM.messageInput.addEventListener('keydown', (event) => {
      // Enter to send (but not with shift for newline)
      if (event.key === 'Enter' && !event.shiftKey) {
          const message = DOM.messageInput.value.trim();
          if (message) {
              UI.sendMessage(message);
              event.preventDefault();
          }
      }
  });
  
  // Sidebar Toggle
  DOM.toggleSidebarButton.addEventListener('click', () => {
      UI.toggleSidebar();
  });
  
  // New Chat
  DOM.newChatButton.addEventListener('click', () => {
      UI.updateUIForNewChat();
  });
  
  // Clear Chat
  DOM.clearButton.addEventListener('click', () => {
      if (STATE.messages.length > 0) {
          UI.showDeleteConfirmation(STATE.currentChatId);
      }
  });
  
  // Settings Modal
  DOM.settingsButton.addEventListener('click', () => {
      UI.showSettingsModal();
  });
  
  // Export Modal
  DOM.exportButton.addEventListener('click', () => {
      UI.showExportModal();
  });
  
  // Theme Toggle
  DOM.toggleThemeButton.addEventListener('click', () => {
      UI.toggleTheme();
  });
  
  // Save Settings
  DOM.saveSettingsButton.addEventListener('click', () => {
      UI.saveSettings();
  });
  
  // Reset Settings
  DOM.resetSettingsButton.addEventListener('click', () => {
      UI.resetSettings();
  });
  
  // Confirm Delete
  DOM.confirmDeleteButton.addEventListener('click', () => {
      UI.deleteChat();
  });
  
  // Export Chat
  DOM.doExportButton.addEventListener('click', () => {
      UI.exportChat();
  });
  
  // Close all modals
  DOM.closeButtons.forEach(button => {
      button.addEventListener('click', (event) => {
          const modal = event.target.closest('.modal');
          UI.closeModal(modal);
      });
  });
  
  DOM.cancelButtons.forEach(button => {
      button.addEventListener('click', (event) => {
          const modal = event.target.closest('.modal');
          UI.closeModal(modal);
      });
  });
  
  // Suggestion chips
  DOM.suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
          DOM.messageInput.value = chip.textContent;
          UI.updateSendButtonState();
          UI.autoResizeTextarea(DOM.messageInput);
          DOM.messageInput.focus();
      });
  });
  
  // Slider value display updates
  DOM.temperatureSlider.addEventListener('input', () => {
      DOM.temperatureValue.textContent = DOM.temperatureSlider.value;
  });
  
  DOM.maxTokensSlider.addEventListener('input', () => {
      DOM.maxTokensValue.textContent = DOM.maxTokensSlider.value;
  });
  
  DOM.topPSlider.addEventListener('input', () => {
      DOM.topPValue.textContent = DOM.topPSlider.value;
  });
  
  DOM.topKSlider.addEventListener('input', () => {
      DOM.topKValue.textContent = DOM.topKSlider.value;
  });
  
  // Global keyboard shortcuts
  document.addEventListener('keydown', (event) => {
      UI.handleKeyboardShortcuts(event);
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
      if (event.target.classList.contains('modal')) {
          UI.closeModal(event.target);
      }
  });
}

// Initialization
async function initializeApp() {
  try {
      // Load user preferences
      UI.loadUserPreferences();
      
      // Check API status
      const status = await API.checkStatus();
      
      if (status.status !== 'online' || !status.apiConfigured) {
          UI.showToast('API service is offline or not properly configured', 'error', 5000);
      }
      
      // Load chat list
      UI.loadChatList();
      
      // Attach event listeners
      attachEventListeners();
      
      // Focus input
      DOM.messageInput.focus();
      
  } catch (error) {
      console.error('Initialization error:', error);
      UI.showToast('Failed to initialize application', 'error');
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', initializeApp);
