// ===== FANTER AI CHAT - OPENROUTER VERSION =====

let messages = JSON.parse(localStorage.getItem('fanter_chat') || '[]');
let isWaiting = false;

// OpenRouter settings - using best free model
const AI_MODEL = 'google/gemini-2.0-flash-exp:free';
const DAILY_LIMIT = 50;
let requestsToday = parseInt(localStorage.getItem('ai_requests_today') || '0');
let lastResetDate = localStorage.getItem('ai_last_reset') || new Date().toDateString();

// Check daily reset
function checkDailyReset() {
  const today = new Date().toDateString();
  if (lastResetDate !== today) {
    requestsToday = 0;
    lastResetDate = today;
    localStorage.setItem('ai_requests_today', '0');
    localStorage.setItem('ai_last_reset', today);
  }
  updateLimitDisplay();
}

// Update UI
function updateLimitDisplay() {
  const remaining = DAILY_LIMIT - requestsToday;
  const statusEl = document.getElementById('statusIndicator');
  if (statusEl) {
    if (remaining <= 0) {
      statusEl.textContent = `🔴 ai recharging - back tomorrow`;
      statusEl.style.color = '#ff6666';
    } else if (remaining < 10) {
      statusEl.textContent = `🟡 ${remaining} messages left today`;
      statusEl.style.color = '#ffcc00';
    } else {
      statusEl.textContent = `🟢 ${remaining} messages left today`;
      statusEl.style.color = '#00ff88';
    }
  }
  
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  if (input && sendBtn) {
    const disabled = remaining <= 0;
    input.disabled = disabled;
    sendBtn.disabled = disabled;
    input.placeholder = disabled ? 'ai is sleeping - come back tomorrow 🌙' : 'type something...';
  }
}

const SYSTEM_PROMPT = `you are fanter ai, a chill gaming assistant on a game site called fanter. 
talk like a cool friend - use lowercase mostly, keep responses short (1-3 sentences), be encouraging, use occasional emojis. dont use asterisks or weird formatting. just plain text.`;

// Load messages
function loadMessages() {
  checkDailyReset();
  
  if (messages.length === 0) {
    messages.push({
      sender: 'ai',
      text: 'yo! i\'m fanter ai. what\'s good? (50 msg limit per day so everyone gets a turn 🔄)',
      timestamp: Date.now()
    });
    localStorage.setItem('fanter_chat', JSON.stringify(messages));
  }
  renderMessages();
}

// Render messages
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addMessage(sender, text) {
  messages.push({ sender, text, timestamp: Date.now() });
  if (messages.length > 50) messages = messages.slice(-50);
  localStorage.setItem('fanter_chat', JSON.stringify(messages));
  renderMessages();
}

function showTypingIndicator() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai-message typing';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-text">thinking...</div>
  `;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

// Call OpenRouter API - simplified and fixed
async function callOpenRouter(userMessage) {
  try {
    // Build conversation history
    const conversationHistory = messages.slice(-8).map(m => ({
      role: m.sender === 'ai' ? 'assistant' : 'user',
      content: m.text
    }));
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://chipikipal800.github.io',
        'X-Title': 'Fanter AI'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        max_tokens: 120,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', data);
      return 'yo something went wrong. try again in a sec? 🔧';
    }
    
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    
    return 'hmm the ai blanked out. what were you saying? 🤔';
    
  } catch (error) {
    console.error('Fetch error:', error);
    return 'connection issue. maybe refresh? 🌐';
  }
}

// Send message
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  
  if (!input || !sendBtn) return;
  
  const message = input.value.trim();
  if (!message || isWaiting) return;
  
  checkDailyReset();
  
  if (requestsToday >= DAILY_LIMIT) {
    addMessage('ai', 'out of messages for today! back at midnight 🌙');
    input.value = '';
    updateLimitDisplay();
    return;
  }
  
  addMessage('user', message);
  input.value = '';
  
  isWaiting = true;
  input.disabled = true;
  sendBtn.disabled = true;
  
  showTypingIndicator();
  
  const aiResponse = await callOpenRouter(message);
  
  removeTypingIndicator();
  addMessage('ai', aiResponse);
  
  requestsToday++;
  localStorage.setItem('ai_requests_today', requestsToday.toString());
  
  isWaiting = false;
  updateLimitDisplay();
  input.focus();
}

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function clearChat() {
  if (confirm('clear the whole chat?')) {
    messages = [{
      sender: 'ai',
      text: 'yo! i\'m fanter ai. what\'s good? (50 msg limit per day so everyone gets a turn 🔄)',
      timestamp: Date.now()
    }];
    localStorage.setItem('fanter_chat', JSON.stringify(messages));
    renderMessages();
  }
}

// Start everything
loadMessages();
