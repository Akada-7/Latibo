const Support = {
    init() {
        this.injectButton();
        this.bindEvents();
    },

    injectButton() {
        if (document.getElementById("supportFab")) return;
        const btn = document.createElement("button");
        btn.id = "supportFab";
        btn.className = "support-fab";
        btn.title = "Destek";
        btn.innerHTML = `<span style="font-size:20px;">💬</span>`;
        document.body.appendChild(btn);
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.closest("#supportFab")) {
                this.openModal();
            }
            if (e.target.id === "supportModal" || e.target.closest("#supportModal")) {
                if (e.target.id === "supportModal") this.closeModal();
            }
            if (e.target.closest("#supportCancelBtn")) {
                this.closeModal();
            }
            if (e.target.closest("#supportSubmitBtn")) {
                this.submit();
            }
        });
    },

    openModal() {
        this.closeModal();
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay active";
        overlay.id = "supportModal";
        overlay.innerHTML = `
            <div class="modal">
                <h2>${__("support.title")}</h2>
                <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">${__("support.subtitle")}</p>
                <div class="form-group" style="margin-bottom:14px;">
                    <label>${__("support.typeLabel")}</label>
                    <select id="supportType" class="input">
                        <option value="bug">🐛 ${__("support.typeBug")}</option>
                        <option value="question">❓ ${__("support.typeQuestion")}</option>
                        <option value="feedback">💡 ${__("support.typeFeedback")}</option>
                        <option value="other">💬 ${__("support.typeOther")}</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:14px;">
                    <label>${__("support.messageLabel")}</label>
                    <textarea id="supportMessage" class="input" rows="4" placeholder="${__("support.messagePlaceholder")}" style="resize:vertical;min-height:100px;"></textarea>
                </div>
                <div class="form-group" style="margin-bottom:16px;">
                    <label>${__("support.contactLabel")}</label>
                    <input type="text" id="supportContact" class="input" placeholder="${__("support.contactPlaceholder")}">
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="supportCancelBtn" class="btn" style="width:auto;">${__("support.cancel")}</button>
                    <button id="supportSubmitBtn" class="btn btn-primary" style="width:auto;">${__("support.send")}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const user = Auth.getCurrentUser();
        if (user && user.email) {
            const contactEl = document.getElementById("supportContact");
            if (contactEl) contactEl.value = user.email;
        }
    },

    closeModal() {
        const m = document.getElementById("supportModal");
        if (m) m.remove();
    },

    async submit() {
        const type = document.getElementById("supportType").value;
        const message = document.getElementById("supportMessage").value.trim();
        const contact = document.getElementById("supportContact").value.trim();

        if (!message) {
            Utils.showToast(__("support.needMessage"), "error");
            return;
        }

        const btn = document.getElementById("supportSubmitBtn");
        if (btn) { btn.disabled = true; btn.textContent = __("support.sending"); }

        try {
            await Storage.apiCall("/support", "POST", {
                type,
                message,
                contact,
                page: App.currentPage || ""
            });
            Utils.showToast(__("support.sent"), "success");
            this.closeModal();
        } catch (e) {
            Utils.showToast(__("support.failed") + e.message, "error");
            if (btn) { btn.disabled = false; btn.textContent = __("support.send"); }
        }
    }
};
