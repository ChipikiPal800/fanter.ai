// ===== FANTER AI CHAT - OPENROUTER VERSION =====

let messages = JSON.parse(localStorage.getItem('fanter_chat') || '[]');
let isWaiting = false;

// OpenRouter settings
const AI_MODEL = 'google/gemini-2.0-flash-exp:free'; // free model

// Daily limit - 50 requests per day
const DAILY_LIMIT = 50;
let requestsToday = parseInt(localStorage.getItem('ai_requests_today') || '0');
let lastResetDate = localStorage.getItem('ai_last_reset') || new Date().toDateString();

// Check if we need to reset daily counter
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

// Update the UI to show remaining requests
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
  
  // Disable input if limit reached
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  if (input && sendBtn) {
    const disabled = remaining <= 0;
    input.disabled = disabled;
    sendBtn.disabled = disabled;
    input.placeholder = disabled ? 'ai is sleeping - come back tomorrow 🌙' : 'type something...';
  }
}

// System prompt for AI personality
const SYSTEM_PROMPT = `you are fanter ai, a chill gaming assistant on a game site called fanter. 
talk like a cool friend - use lowercase mostly, keep responses short (1-3 sentences), be encouraging, use occasional emojis.
you know about games like minecraft, roblox, fortnite, and browser games.
if someone asks about the daily limit, just say "yeah there's a limit so everyone gets a turn. resets at midnight!"`;

// Load messages on startup
function loadMessages() {
  checkDailyReset();
  
  if (messages.length === 0) {
    messages.push({
      sender: 'ai',
      text: 'yo! i\'m fanter ai. what\'s good? (btw there\'s a daily limit so everyone gets a turn 🔄)',
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

// Call OpenRouter API
async function callOpenRouter(userMessage) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Fanter AI'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-6).map(m => ({
            role: m.sender === 'ai' ? 'assistant' : 'user',
            content: m.text
          })),
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenRouter error:', error);
      return 'yo the ai tripped over its own wires. try again? 🔌';
    }

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('error:', error);
    return 'connection\'s being weird. one more try? 🌐';
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
  
  // Check limit
  if (requestsToday >= DAILY_LIMIT) {
    addMessage('ai', 'i\'m out of messages for today! reset at midnight 🌙 come back then?');
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
  
  // Increment counter
  requestsToday++;
  localStorage.setItem('ai_requests_today', requestsToday.toString());
  
  isWaiting = false;
  updateLimitDisplay();
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
      text: 'yo! i\'m fanter ai. what\'s good? (btw there\'s a daily limit so everyone gets a turn 🔄)',
      timestamp: Date.now()
    }];
    localStorage.setItem('fanter_chat', JSON.stringify(messages));
    renderMessages();
  }
}

// Initialize
loadMessages();
