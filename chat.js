// ===== FANTER AI CHAT - FIXED =====

window.messages = JSON.parse(localStorage.getItem('fanter_chat') || '[]');
window.isWaiting = false;
window.lastMessageTime = 0;

// Use Groq with better error handling
const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE"; // Replace with your actual key
const AI_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `you are fanter ai, a chill gaming assistant on a game site called fanter. talk like a cool friend - use lowercase mostly, keep responses short (1-3 sentences). dont overuse emojis. be helpful but casual. if someone asks about games, recommend stuff like hollow knight, 1v1lol, fnaf, etc. dont make up fake games.`;

// ===== LOAD MESSAGES =====
function loadMessages() {
  if (window.messages.length === 0) {
    window.messages.push({ sender: 'ai', text: 'yo! i\'m fanter ai. what\'s good?', timestamp: Date.now() });
    localStorage.setItem('fanter_chat', JSON.stringify(window.messages));
  }
  renderMessages();
}

function renderMessages() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  container.innerHTML = window.messages.map(msg => `
    <div class="message ${msg.sender}-message">
      <div class="message-avatar">${msg.sender === 'ai' ? '🤖' : '👤'}</div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
    </div>
  `).join('');
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
  typingDiv.innerHTML = `<div class="message-avatar">🤖</div><div class="message-text">typing...</div>`;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

// ===== CALL GROQ =====
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

    if (!response.ok) {
      console.error('Groq error:', response.status);
      return 'connection issue, try again in a sec';
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'hmm i blanked out, what were you saying';

  } catch (error) {
    console.error('Fetch error:', error);
    return 'connection issue, maybe refresh?';
  }
}

// ===== SEND MESSAGE =====
window.sendMessage = async function() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  if (!input || !sendBtn) return;

  const message = input.value.trim();
  if (!message || window.isWaiting) return;

  addMessage('user', message);
  input.value = '';

  window.isWaiting = true;
  input.disabled = true;
  sendBtn.disabled = true;

  showTypingIndicator();

  const aiResponse = await callGroq(message);

  removeTypingIndicator();
  addMessage('ai', aiResponse);

  window.isWaiting = false;
  input.disabled = false;
  sendBtn.disabled = false;
  input.focus();
};

// ===== HANDLE ENTER =====
window.handleKeyPress = function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    window.sendMessage();
  }
};

// ===== CLEAR CHAT =====
window.clearChat = function() {
  if (confirm('clear the whole chat?')) {
    window.messages = [{ sender: 'ai', text: 'yo! i\'m fanter ai. what\'s good?', timestamp: Date.now() }];
    localStorage.setItem('fanter_chat', JSON.stringify(window.messages));
    renderMessages();
  }
};

// ===== START =====
loadMessages();
console.log('✅ Fanter AI loaded');
