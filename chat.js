// ===== FANTER AI CHAT =====

let messages = JSON.parse(localStorage.getItem('fanter_chat') || '[]');
let isWaiting = false;

// Hugging Face API settings
const HF_MODEL = "microsoft/DialoGPT-medium";
const SYSTEM_PROMPT = "you are fanter ai, a chill gaming assistant on a game site called fanter. talk like a cool friend - use lowercase mostly, keep responses short (1-3 sentences), be encouraging, use occasional emojis.";

// Load messages on startup
function loadMessages() {
  if (messages.length === 0) {
    messages.push({
      sender: 'ai',
      text: 'yo! i\'m fanter ai. what\'s good?',
      timestamp: Date.now()
    });
    localStorage.setItem('fanter_chat', JSON.stringify(messages));
  }
  renderMessages();
}

// Render all messages
function renderMessages() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.sender}-message`;
    messageDiv.innerHTML = `
      <div class="message-avatar">${msg.sender === 'ai' ? '🤖' : '👤'}</div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
    `;
    container.appendChild(messageDiv);
  });
  
  container.scrollTop = container.scrollHeight;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add a message
function addMessage(sender, text) {
  messages.push({
    sender,
    text,
    timestamp: Date.now()
  });
  
  if (messages.length > 50) {
    messages = messages.slice(-50);
  }
  
  localStorage.setItem('fanter_chat', JSON.stringify(messages));
  renderMessages();
}

// Show typing indicator
function showTypingIndicator() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai-message typing';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-text">thinking</div>
  `;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

// Update status
function setStatus(text, color = '#00ff88') {
  const statusEl = document.getElementById('statusIndicator');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.style.color = color;
  }
}

// Call Hugging Face API
async function callHuggingFace(userMessage, retryCount = 0) {
  const proxyUrl = 'https://corsproxy.io/?';
  const apiUrl = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
  
  try {
    const response = await fetch(proxyUrl + encodeURIComponent(apiUrl), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: userMessage,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.8,
          top_p: 0.9
        }
      })
    });

    // Model loading - wait and retry
    if (response.status === 503) {
      setStatus('🟠 waking up...', '#ff8800');
      await new Promise(resolve => setTimeout(resolve, 4000));
      return callHuggingFace(userMessage, retryCount + 1);
    }

    if (!response.ok) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return callHuggingFace(userMessage, retryCount + 1);
    }

    const data = await response.json();
    
    // DialoGPT returns different format
    let aiResponse = data.generated_text || data[0]?.generated_text || '';
    
    if (!aiResponse || aiResponse.length < 2) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return callHuggingFace(userMessage, retryCount + 1);
    }
    
    return aiResponse.trim();
    
  } catch (error) {
    console.error('error, retrying...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    return callHuggingFace(userMessage, retryCount + 1);
  }
}

// Send message
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  
  if (!input || !sendBtn) return;
  
  const message = input.value.trim();
  
  if (!message || isWaiting) return;
  
  addMessage('user', message);
  input.value = '';
  
  isWaiting = true;
  input.disabled = true;
  sendBtn.disabled = true;
  setStatus('🟡 thinking...', '#ffcc00');
  
  showTypingIndicator();
  
  const aiResponse = await callHuggingFace(message);
  
  removeTypingIndicator();
  addMessage('ai', aiResponse);
  
  isWaiting = false;
  input.disabled = false;
  sendBtn.disabled = false;
  setStatus('🟢 online', '#00ff88');
  input.focus();
}

// Handle enter key
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// Clear chat
function clearChat() {
  if (confirm('clear the whole chat?')) {
    messages = [{
      sender: 'ai',
      text: 'yo! i\'m fanter ai. what\'s good?',
      timestamp: Date.now()
    }];
    localStorage.setItem('fanter_chat', JSON.stringify(messages));
    renderMessages();
  }
}

// Initialize
loadMessages();
