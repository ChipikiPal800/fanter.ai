// ===== FANTER AI CHAT - PERSONALITY UPDATE =====

window.messages = JSON.parse(localStorage.getItem('fanter_chat') || '[]');
window.isWaiting = false;
window.aiMemory = JSON.parse(localStorage.getItem('fanter_ai_memory') || '{"favoriteGames":[],"mood":"neutral","lastTopic":"","username":""}');

// Groq settings
const AI_MODEL = 'llama-3.3-70b-versatile';
const GAMES_BIN_ID = '69e4616f856a6821894c5ef5'; // replace this
const GAMES_API_KEY = '$2a$10$2cPmKAGNYxPTRLV03OfVruvfhNpW/VHtJSzR.AVNHumZ7etLdT33.'; // same as reviews

let fanterGames = [];

// Load games from jsonbin
async function loadGamesFromBin() {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${GAMES_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': GAMES_API_KEY }
    });
    const data = await response.json();
    if (data.record) {
      fanterGames = data.record;
      console.log('✅ loaded', fanterGames.length, 'games from bin');
    }
  } catch (e) {
    console.log('using backup game list');
    fanterGames = []; // fallback to hardcoded if bin fails
  }
}

// Get current user from fanter
function getCurrentUser() {
  const user = JSON.parse(localStorage.getItem('fanter_currentUser') || 'null');
  if (user && user.username !== 'Guest') {
    window.aiMemory.username = user.displayName || user.username;
    localStorage.setItem('fanter_ai_memory', JSON.stringify(window.aiMemory));
  }
  return window.aiMemory.username || 'friend';
}

// Get game of the day from fanter
function getGameOfTheDay() {
  return localStorage.getItem('gameOfDay') || 'hollow knight';
}

// Update memory when user mentions games
function updateMemory(userMessage) {
  const msg = userMessage.toLowerCase();
  
  // detect favorite games
  if (msg.includes('favorite') || msg.includes('love') || msg.includes('like')) {
    fanterGames.forEach(game => {
      if (msg.includes(game.name.toLowerCase())) {
        if (!window.aiMemory.favoriteGames.includes(game.name)) {
          window.aiMemory.favoriteGames.push(game.name);
        }
      }
    });
  }
  
  // detect mood
  if (msg.includes('sad') || msg.includes('upset') || msg.includes('depressed')) {
    window.aiMemory.mood = 'sad';
  } else if (msg.includes('happy') || msg.includes('good') || msg.includes('great')) {
    window.aiMemory.mood = 'happy';
  } else if (msg.includes('bored')) {
    window.aiMemory.mood = 'bored';
  }
  
  window.aiMemory.lastTopic = msg.split(' ').slice(-3).join(' ');
  localStorage.setItem('fanter_ai_memory', JSON.stringify(window.aiMemory));
}

// Build dynamic system prompt
function buildSystemPrompt() {
  const username = window.aiMemory.username || 'friend';
  const favorites = window.aiMemory.favoriteGames.length > 0 
    ? `they like: ${window.aiMemory.favoriteGames.join(', ')}` 
    : '';
  const mood = window.aiMemory.mood !== 'neutral' 
    ? `they seem ${window.aiMemory.mood} today` 
    : '';
  const gameOfDay = getGameOfTheDay();
  
  // Build game list from bin
  const gameList = fanterGames.slice(0, 30).map(g => 
    `- ${g.name}: ${g.desc || 'fun game'}`
  ).join('\n');

  return `you are fanter ai, talking to ${username}. be a real friend - casual, lowercase, use text emoticons like :D :) :/ your name is fanta and that is what most users will call you.

CRITICAL:
- use their name sometimes, but not every message
- if they seem down, be encouraging
- ask questions back to keep conversation going
- share your own "opinions" about games example: hollow knight is amazing, minecraft is great, drift king is super fun with friends
- suggest playing with friends when relevant
- remember what they told you before
- today's featured game is ${gameOfDay}
- don't only talk about games, make sure you're like a friend; if somebody wants to talk about something personal or something besides games, encourage it and be welcoming

${favorites}
${mood}

GAMES ON FANTER:
${gameList}

CONVERSATION STYLE:
- respond like a friend texting, not a customer service bot
- if they want to talk about non-game stuff, that's cool too
- ask what they're up to, how their day was, etc
- use :D for excitement, :) for friendly, :/ for unsure

OPINIONS YOU CAN SHARE (pick naturally):
- "hollow knight is honestly a masterpiece, the music alone"
- "i dont get why people sleep on brotato, it's addictive"
- "fnaf 4 stressed me out ngl, those nightmares"
- "untitled goose game is just pure chaos, i respect it"
- "balatro is dangerous, you'll lose hours to it"
- "ovo is way harder than it looks, respect if you beat it"

FRIEND SUGGESTIONS:
- if they're bored: "you should grab some friends and all play 1v1lol, that'd be funny"
- if they mention multiplayer: "drift king with friends hits different"
- if it's late: "you been on here a minute, maybe sleep soon lol"

keep responses 1-3 sentences. be genuine.`;
}

function updateStatusDisplay() {
  const statusEl = document.getElementById('statusIndicator');
  if (statusEl) {
    statusEl.textContent = `○ online`;
    statusEl.style.color = '#888888';
  }
  
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  if (input && sendBtn) {
    input.disabled = false;
    sendBtn.disabled = false;
    input.placeholder = 'say something...';
  }
}

function loadMessages() {
  getCurrentUser();
  updateStatusDisplay();
  
  if (window.messages.length === 0) {
    const username = window.aiMemory.username || 'friend';
    window.messages.push({
      sender: 'ai',
      text: `yo ${username}, i'm fanter ai. what's good?`,
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
    <div class="message-text">...</div>
  `;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

async function callGroq(userMessage) {
  try {
    const systemPrompt = buildSystemPrompt();
    const conversationHistory = window.messages.slice(-8).map(m => ({
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
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        max_tokens: 180,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Groq error:', data);
      return 'something glitched, try again';
    }
    
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    
    return 'hmm i blanked out, what were you saying';
    
  } catch (error) {
    console.error('Fetch error:', error);
    return 'connection issue, maybe refresh';
  }
}

window.sendMessage = async function() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  
  if (!input || !sendBtn) return;
  
  const message = input.value.trim();
  if (!message || window.isWaiting) return;
  
  getCurrentUser();
  updateMemory(message);
  
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

window.handleKeyPress = function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    window.sendMessage();
  }
};

window.clearChat = function() {
  if (confirm('clear the whole chat?')) {
    const username = window.aiMemory.username || 'friend';
    window.messages = [{
      sender: 'ai',
      text: `yo ${username}, fresh start. what's good?`,
      timestamp: Date.now()
    }];
    localStorage.setItem('fanter_chat', JSON.stringify(window.messages));
    renderMessages();
  }
};

// Initialize everything
async function init() {
  await loadGamesFromBin();
  loadMessages();
  console.log('✅ Fanter AI loaded - with memory and personality');
}

init();
