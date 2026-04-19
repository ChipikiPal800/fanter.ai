// ===== FANTER AI CHAT - GROQ VERSION =====

window.messages = JSON.parse(localStorage.getItem('fanter_chat') || '[]');
window.isWaiting = false;

// Groq settings - blazing fast
const AI_MODEL = 'llama-3.1-8b-instant'; // super fast model
const DAILY_LIMIT = 50;
let requestsToday = parseInt(localStorage.getItem('ai_requests_today') || '0');
let lastResetDate = localStorage.getItem('ai_last_reset') || new Date().toDateString();

const SYSTEM_PROMPT = `you are fanter ai, a chill gaming assistant on a game site called fanter. talk like a cool friend - use lowercase mostly, keep responses short (1-3 sentences), be encouraging, use occasional emojis. dont use asterisks or weird formatting. just plain text.`;

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

function loadMessages() {
  checkDailyReset();
  
  if (window.messages.length === 0) {
    window.messages.push({
      sender: 'ai',
      text: 'yo! i\'m fanter ai. what\'s good? (50 msg limit so everyone gets a turn 🔄)',
      timestamp: Date.now()
    });
    localStorage.setItem('fanter_chat', JSON.stringify(window.messages));
  }
  renderMessages();
}

function renderMessages() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  window.messages.forEach(msg => {
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
  window.messages.push({ sender, text, timestamp: Date.now() });
  if (window.messages.length > 50) window.messages = window.messages.slice(-50);
  localStorage.setItem('fanter_chat', JSON.stringify(window.messages));
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

// Call Groq API - super simple and fast
async function callGroq(userMessage) {
  try {
    const conversationHistory = window.messages.slice(-6).map(m => ({
      role: m.sender === 'ai' ? 'assistant' : 'user',
      content: m.text
    }));
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Groq error:', data);
      return 'yo something glitched. try again? 🔧';
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

window.sendMessage = async function() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  
  if (!input || !sendBtn) return;
  
  const message = input.value.trim();
  if (!message || window.isWaiting) return;
  
  checkDailyReset();
  
  if (requestsToday >= DAILY_LIMIT) {
    addMessage('ai', 'out of messages for today! back at midnight 🌙');
    input.value = '';
    updateLimitDisplay();
    return;
  }
  
  addMessage('user', message);
  input.value = '';
  
  window.isWaiting = true;
  input.disabled = true;
  sendBtn.disabled = true;
  
  showTypingIndicator();
  
  const aiResponse = await callGroq(message);
  
  removeTypingIndicator();
  addMessage('ai', aiResponse);
  
  requestsToday++;
  localStorage.setItem('ai_requests_today', requestsToday.toString());
  
  window.isWaiting = false;
  updateLimitDisplay();
  input.focus();
};

window.handleKeyPress = function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    window.sendMessage();
  }
};

window.clearChat = function() {
  if (confirm('clear the whole chat?')) {
    window.messages = [{
      sender: 'ai',
      text: 'yo! i\'m fanter ai. what\'s good? (50 msg limit so everyone gets a turn 🔄)',
      timestamp: Date.now()
    }];
    localStorage.setItem('fanter_chat', JSON.stringify(window.messages));
    renderMessages();
  }
};

loadMessages();
console.log('✅ Fanter AI loaded with Groq!');
