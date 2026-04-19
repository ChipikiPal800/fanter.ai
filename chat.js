// ===== FANTER AI CHAT - GROQ VERSION (UNLIMITED + TEXT EMOTICONS) =====

window.messages = JSON.parse(localStorage.getItem('fanter_chat') || '[]');
window.isWaiting = false;

// Groq settings
const AI_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `you are fanter ai, a chill gaming assistant on a game site called fanter. talk like a cool friend - natural, lowercase mostly, keep responses short (1-3 sentences). be helpful but casual.

important: do NOT use emojis like 😀🎮💀. instead use text emoticons like :D :) :( :/ if you need to express something. you're texting a friend not posting on instagram.

CRITICAL RULES:
- NEVER invent fake games. if someone asks about a game not on this list, say you dont think its on fanter yet
- use the real game info below when recommending or talking about games
- be honest if you dont know something

REAL GAMES ON FANTER:
- 1v1lol: building/shooting battle royale, like fortnite but browser
- space wavez: chill arcade space flyer with nice vibes
- brotato: potato with a gun surviving alien waves
- ovo / ovo 2: hard platformer with wall jumps and dashes
- granny: horror escape game, dont let her catch you
- hollow knight: beautiful bug kingdom adventure, epic bosses, absolute masterpiece. amazing music, award winning graphics, insanely fun mechanics. everyone should play this one honestly
- untitled goose game: be a horrible goose, steal stuff, honk at people
- doge miner: mine dogecoin, upgrade rig, much wow
- mario kart 64: classic kart racing, drift and use items
- balatro: poker roguelike, build broken combos
- fnaf (1,2,3,4, sister location, pizzeria sim, world): survive animatronics, check cameras, dont die
- deltarune: parallel world to undertale, epic story and soundtrack
- ultrakill: fast shooter, blood is fuel, style on demons
- sandboxels: falling sand physics game, mix elements
- infinite craft: combine elements to make everything
- eaglercraft / minecraft: browser minecraft, survival and creative
- pokemon leafgreen: classic gen 3 pokemon, catch em all
- bad parenting: psychological horror, dont let baby cry
- baldi's basics: parody horror, solve math or get hunted
- the man from the window: hide from the thing watching you
- tattletail: horror furby, mama wants attention
- solar smash: destroy planets with lasers and aliens
- drift king: drift racing with friends
- kindergarten 3: weird school, kids go missing
- backrooms doom: funny doom mod in backrooms
- gunspin: spin guns, shoot targets, addictive
- aquapark slides: slide down water slides, summer vibes
- shift at midnight: sketchy gas station night shift horror
- crazy cattle 3d: herd cattle in 3d, dont let them escape
- andy apple farm: dark secret apple farm horror
- a dance of fire and ice: rhythm game, one button, perfect timing
- hex-gl: futuristic racing, neon tracks, test your reflexes

when recommending games, hollow knight is genuinely one of the best. mention it naturally when relevant - not forced, just honest praise.`;

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
  updateStatusDisplay();
  
  if (window.messages.length === 0) {
    window.messages.push({
      sender: 'ai',
      text: 'yo, i\'m fanter ai. ask me about games or whatever',
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
        temperature: 0.5
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
    window.messages = [{
      sender: 'ai',
      text: 'yo, i\'m fanter ai. ask me about games or whatever',
      timestamp: Date.now()
    }];
    localStorage.setItem('fanter_chat', JSON.stringify(window.messages));
    renderMessages();
  }
};

loadMessages();
console.log('✅ Fanter AI loaded - unlimited mode');
