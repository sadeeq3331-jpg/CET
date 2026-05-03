// ==================== PREMIUM SYSTEM (Google Sheets backend) ====================
(function() {
  const API_ENDPOINT = "AKfycbyj2jtdkhCZhgUvl2-F19OC9nB7Br6GS9uRp8NvoHLz";  // ← CHANGE THIS

  const CONTACT = {
    email: "sadeeq3331@gmail.com",
    phone: "15578840796",
    wechat: "Sadeeq331",
    price: "10 yuan"
  };

  const PREMIUM_KEY = "hsk_premium_active";

  // ========== INJECT CONTACT SECTION ==========
  function injectContactSection() {
    const container = document.getElementById("premium-contact-container");
    if (!container) return;
    container.innerHTML = `
      <div style="margin:2rem 0; padding:1.5rem; background:var(--bg-card,#fff); border-radius:1.5rem; border:2px solid var(--accent,#0d9488); text-align:center;">
        <h3 style="color:var(--accent);"><i class="fas fa-crown" style="color:#ffd700;"></i> Remove Ads – Only ${CONTACT.price}</h3>
        <p style="margin-bottom:1rem;">Contact me for a <strong>one‑time</strong> access code.</p>
        <div style="display:flex; flex-wrap:wrap; gap:1rem; justify-content:center;">
          <a href="mailto:${CONTACT.email}" style="text-decoration:none; color:var(--text-primary);"><i class="far fa-envelope"></i> ${CONTACT.email}</a>
          <a href="tel:+86${CONTACT.phone}" style="text-decoration:none; color:var(--text-primary);"><i class="fas fa-phone-alt"></i> ${CONTACT.phone}</a>
          <span onclick="window.copyWeChat()" style="cursor:pointer;"><i class="fab fa-weixin"></i> WeChat: ${CONTACT.wechat}</span>
        </div>
        <p style="margin-top:1rem; font-size:0.85rem;"><i class="fas fa-exclamation-triangle"></i> Each code works <strong>once only</strong>. If you lose access, contact me to reset it.</p>
      </div>
    `;
  }

  // ========== INJECT UNLOCK BUTTON & MODAL ==========
  function injectUnlockUI() {
    if (document.getElementById("premiumUnlockBtn")) return;

    const btn = document.createElement("button");
    btn.id = "premiumUnlockBtn";
    btn.innerHTML = '<i class="fas fa-crown"></i> Unlock Ad‑Free';
    btn.className = "premium-unlock-btn";
    document.body.appendChild(btn);

    const modal = document.createElement("div");
    modal.id = "unlockModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <h3><i class="fas fa-lock-open"></i> Enter Access Code</h3>
        <p>Enter your one‑time code.</p>
        <input type="text" id="accessCodeInput" class="code-input" placeholder="ENG-XXXXXX" autocomplete="off">
        <div class="error-message" id="codeError"></div>
        <button class="modal-btn primary" id="submitCodeBtn">Unlock</button>
        <button class="modal-btn secondary" id="closeModalBtn">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Add styles (abbreviated for space – you can copy the style block from earlier)
    const style = document.createElement("style");
    style.textContent = `
      .premium-unlock-btn { position:fixed; bottom:80px; right:20px; z-index:1000; background:linear-gradient(135deg,#f6d365,#fda085); color:#1e1b4b; border:none; border-radius:40px; padding:0.6rem 1.2rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:8px; }
      .modal-overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:2000; align-items:center; justify-content:center; }
      .modal-content { background:white; padding:2rem; border-radius:2rem; max-width:400px; width:90%; }
      .code-input { width:100%; padding:0.9rem; border-radius:3rem; border:2px solid #ccc; margin:1rem 0; }
      .error-message { color:#e53e3e; }
      .modal-btn { padding:0.8rem; border-radius:3rem; border:none; cursor:pointer; }
      .primary { background:var(--accent,#0d9488); color:white; }
      .secondary { background:transparent; border:1px solid #ccc; }
    `;
    document.head.appendChild(style);

    attachUnlockEvents();
  }

  function attachUnlockEvents() {
    const unlockBtn = document.getElementById("premiumUnlockBtn");
    const modal = document.getElementById("unlockModal");
    const submitBtn = document.getElementById("submitCodeBtn");
    const codeInput = document.getElementById("accessCodeInput");
    const errorEl = document.getElementById("codeError");
    const closeBtn = document.getElementById("closeModalBtn");

    unlockBtn.addEventListener("click", () => {
      modal.style.display = "flex";
      codeInput.value = "";
      errorEl.textContent = "";
    });
    closeBtn.addEventListener("click", () => modal.style.display = "none");
    modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

    submitBtn.addEventListener("click", async () => {
      const code = codeInput.value.trim().toUpperCase();
      if (!code) return;
      const valid = await window.validateCode(code);
      if (valid) {
        localStorage.setItem(PREMIUM_KEY, "true");
        modal.style.display = "none";
        applyPremiumState();
        alert("✅ Code accepted! Enjoy ad‑free access.");
      } else {
        errorEl.textContent = "Invalid or already used code.";
      }
    });
  }

  // ========== VALIDATE CODE VIA GOOGLE SHEETS ==========
  window.validateCode = async function(code) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ code: code.toUpperCase() }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      return data.success === true;
    } catch (e) {
      console.error("Code validation error", e);
      return false;
    }
  };

  // ========== REMOVE ADS ==========
  function removeAds() {
    document.body.classList.add("premium-active");
    document.querySelectorAll(".adsbygoogle,.ad-container,ins.adsbygoogle,[id*='ad']").forEach(el => el.style.display = "none");
  }

  function applyPremiumState() {
    if (localStorage.getItem(PREMIUM_KEY) === "true") {
      const btn = document.getElementById("premiumUnlockBtn");
      if (btn) btn.style.display = "none";
      removeAds();
    }
  }

  window.copyWeChat = () => navigator.clipboard.writeText(CONTACT.wechat).then(() => alert("WeChat ID copied!"));

  // Init
  function init() {
    injectContactSection();
    injectUnlockUI();
    applyPremiumState();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
