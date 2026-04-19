// ===== FANTER AI CHAT =====

let messages = JSON.parse(localStorage.getItem('fanter_chat') || '[]');
let isWaiting = false;

// Hugging Face API settings
const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";
const SYSTEM_PROMPT = "you are fanter ai, a chill gaming assistant on a game site called fanter. talk like a cool friend - use lowercase mostly, keep responses short (1-3 sentences), be encouraging, use occasional emojis, and never break character. you know about games like minecraft, roblox, fortnite, and browser games. don't use asterisks or roleplay formatting.";

// Load messages on startup
function loadMessages() {
  if (messages.length === 0) {
    // Add welcome message
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
  
  // Keep only last 50 messages to save space
  if (messages.length > 50) {
    messages = messages.slice(-50);
  }
  
  localStorage.setItem('fanter_chat', JSON.stringify(messages));
  renderMessages();
}

// Show typing indicator
function showTypingIndicator() {
  const container = document.getElementById('messagesContainer');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai-message typing';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-text"></div>
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
  statusEl.textContent = text;
  statusEl.style.color = color;
}

// Call Hugging Face API
async function callHuggingFace(userMessage) {
  try {
    // Build conversation context (last 5 messages)
    const context = messages.slice(-5).map(m => 
      `${m.sender === 'ai' ? 'Assistant' : 'Human'}: ${m.text}`
    ).join('\n');
    
    const prompt = `<s>[INST] ${SYSTEM_PROMPT}\n\nPrevious conversation:\n${context}\n\nHuman: ${userMessage} [/INST]`;
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 120,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data[0]?.generated_text || 'yo sorry, my brain glitched. say that again?';
    
    // Clean up response
    aiResponse = aiResponse.trim();
    if (aiResponse.startsWith('Assistant:')) {
      aiResponse = aiResponse.replace('Assistant:', '').trim();
    }
    
    return aiResponse;
    
  } catch (error) {
    console.error('Hugging Face error:', error);
    return 'yo my ai brain is taking a nap rn. try again in a sec? 😴';
  }
}

// Send message
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  const message = input.value.trim();
  
  if (!message || isWaiting) return;
  
  // Add user message
  addMessage('user', message);
  input.value = '';
  
  // Disable input
  isWaiting = true;
  input.disabled = true;
  sendBtn.disabled = true;
  setStatus('🟡 thinking...', '#ffcc00');
  
  // Show typing
  showTypingIndicator();
  
  // Get AI response
  const aiResponse = await callHuggingFace(message);
  
  // Remove typing and add response
  removeTypingIndicator();
  addMessage('ai', aiResponse);
  
  // Re-enable input
  isWaiting = false;
  input.disabled = false;
  sendBtn.disabled = false;
  setStatus('🟢 online', '#00ff88');
  input.focus();
}

// Handle enter key
function handleKeyPress(event) {
  if (event.key === 'Enter') {
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
