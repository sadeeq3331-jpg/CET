// ==================== PREMIUM SYSTEM (with Google Sheets) ====================
(function() {
  const API_ENDPOINT = "YOUR_GOOGLE_APPS_SCRIPT_URL"; // ← paste your URL here

  const CONTACT = {
    email: "sadeeq3331@gmail.com",
    phone: "15578840796",
    wechat: "Sadeeq331",
    price: "10 yuan"
  };

  const PREMIUM_KEY = "hsk_premium_active"; // same key for consistency

  function injectContactSection() {
    const container = document.getElementById("premium-contact-container");
    if (!container) return;
    container.innerHTML = `
      <div style="margin: 2rem 0 1.5rem; padding: 1.5rem; background: var(--bg-card); border-radius: 1.5rem; border: 2px solid var(--accent); text-align: center;">
        <h3 style="color: var(--accent);"><i class="fas fa-crown"></i> Remove Ads – Only ${CONTACT.price}</h3>
        <p style="margin-bottom: 1rem;">Contact me to get a <strong>one‑time</strong> access code.</p>
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
          <a href="mailto:${CONTACT.email}" style="...">${CONTACT.email}</a>
          <a href="tel:+86${CONTACT.phone}" style="...">${CONTACT.phone}</a>
          <div onclick="window.copyWeChat()" style="...">WeChat: ${CONTACT.wechat}</div>
        </div>
        <p style="margin-top: 1rem; font-size: 0.85rem;">
          <i class="fas fa-exclamation-triangle"></i> Each code works <strong>once only</strong>.<br>
          If you lose access, contact me to reset it.
        </p>
      </div>
    `;
  }

  function injectUnlockUI() {
    // same button + modal as before, but submit handler changed below
    // ... (full modal HTML omitted for brevity – it's identical to previous version)
  }

  async function validateCode(code) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ code: code.toUpperCase() }),
        headers: { "Content-Type": "application/json" }
      });
      const result = await response.json();
      return result.success;
    } catch (e) {
      console.error("Validation error", e);
      return false;
    }
  }

  function attachUnlockEvents() {
    const unlockBtn = document.getElementById("premiumUnlockBtn");
    const modal = document.getElementById("unlockModal");
    const submitBtn = document.getElementById("submitCodeBtn");
    const codeInput = document.getElementById("accessCodeInput");
    const errorEl = document.getElementById("codeError");

    unlockBtn.addEventListener("click", () => {
      modal.style.display = "flex";
      codeInput.value = "";
      errorEl.textContent = "";
    });

    submitBtn.addEventListener("click", async () => {
      const code = codeInput.value.trim().toUpperCase();
      if (!code) return;
      const valid = await validateCode(code);
      if (valid) {
        localStorage.setItem(PREMIUM_KEY, "true");
        localStorage.setItem("hsk_premium_code", code);
        modal.style.display = "none";
        applyPremiumState();
        alert("✅ Code accepted! Enjoy ad‑free access.");
      } else {
        errorEl.textContent = "Invalid or already used code.";
      }
    });

    // ... rest of events same as before
  }

  // Other functions (removeAds, applyPremiumState, etc.) remain unchanged
  // ...
})();
