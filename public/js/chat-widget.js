(function () {
  function buildWidget() {
    const launcher = document.createElement('button');
    launcher.id = 'ws-chat-launcher';
    launcher.setAttribute('aria-label', 'افتح شات الدعم');
    launcher.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

    const panel = document.createElement('div');
    panel.id = 'ws-chat-panel';
    panel.innerHTML = `
      <div class="chat-head">
        <div>
          <strong>WingServices Support</strong><br>
          <span class="status">● متصل الآن</span>
        </div>
        <button id="ws-chat-close" aria-label="إغلاق">✕</button>
      </div>
      <div class="chat-body" id="ws-chat-body">
        <div class="chat-msg assistant">أهلاً بيك في WingServices! 👋 اسألني عن أي خدمة، سعر، أو ميعاد تسليم.</div>
      </div>
      <div class="chat-input-row">
        <input id="ws-chat-input" type="text" placeholder="اكتب رسالتك..." autocomplete="off">
        <button id="ws-chat-send">إرسال</button>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const body = panel.querySelector('#ws-chat-body');
    const input = panel.querySelector('#ws-chat-input');
    const sendBtn = panel.querySelector('#ws-chat-send');

    function appendMessage(role, text) {
      const div = document.createElement('div');
      div.className = `chat-msg ${role}`;
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return div;
    }

    function appendTyping() {
      const div = document.createElement('div');
      div.className = 'chat-msg assistant typing-dots';
      div.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return div;
    }

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      appendMessage('user', text);
      const typing = appendTyping();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        typing.remove();
        appendMessage('assistant', data.reply || 'حصل خطأ، جرب تاني.');
      } catch (e) {
        typing.remove();
        appendMessage('assistant', 'في مشكلة في الاتصال، حاول تاني.');
      }
    }

    launcher.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) input.focus();
    });
    panel.querySelector('#ws-chat-close').addEventListener('click', () => panel.classList.remove('open'));
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
