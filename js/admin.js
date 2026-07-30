const Admin = {
    dreams: [],

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "adminRefreshBtn" || e.target.closest("#adminRefreshBtn")) {
                this.loadAll();
            }
            const delBtn = e.target.closest(".admin-delete-btn");
            if (delBtn) {
                this.deleteDream(delBtn.dataset.id, delBtn.dataset.title);
            }
        });

        document.addEventListener("input", (e) => {
            if (e.target.id === "adminSearch") {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => this.loadAll(), 300);
            }
        });
    },

    async loadAll() {
        try {
            const q = document.getElementById("adminSearch") ? document.getElementById("adminSearch").value : "";
            let url = "/admin/discover";
            if (q) url += "?q=" + encodeURIComponent(q);
            this.dreams = await Storage.apiCall(url, "GET");
        } catch (e) {
            this.dreams = [];
        }
        this.render();
    },

    render() {
        const container = document.getElementById("adminDreamList");
        if (!container) return;

        if (this.dreams.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><h3>${__("admin.empty")}</h3></div>`;
            return;
        }

        container.innerHTML = this.dreams.map(dream => {
            const cats = Array.isArray(dream.category) ? dream.category : (dream.category ? [dream.category] : []);
            const badge = cats.map(c => `<span class="badge" style="font-size:10px;">${c}</span>`).join(" ");
            const reported = (dream.reports || []).length;
            const comments = (dream.comments || []).length;
            return `
                <div class="card" style="margin-bottom:12px;padding:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <h3 style="margin:0;font-size:15px;">🌙 ${Utils.escapeHtml(dream.title || __("discover.untitled"))}</h3>
                                ${badge}
                                ${dream.nsfw ? '<span class="badge" style="background:var(--danger);color:white;font-size:10px;">NSFW</span>' : ""}
                            </div>
                            <p style="color:var(--text-muted);font-size:12px;margin-top:4px;">
                                ${__("discover.by")} ${Utils.escapeHtml(dream.authorName || __("discover.anonymous"))} · ${new Date(dream.createdAt).toLocaleDateString()}
                                · 💬 ${comments} · 🚩 ${reported}
                            </p>
                            <p style="color:var(--text-secondary);font-size:13px;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                                ${Utils.escapeHtml(dream.text || "").substring(0, 200)}
                            </p>
                        </div>
                        <button class="btn admin-delete-btn" data-id="${dream._id}" data-title="${Utils.escapeHtml(dream.title || "")}" style="width:auto;padding:6px 14px;font-size:12px;border-color:var(--danger);color:var(--danger);flex-shrink:0;">
                            ${__("admin.delete")}
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    },

    async deleteDream(id, title) {
        if (!confirm(`${__("admin.confirmDelete")} "${title || __("discover.untitled")}"?`)) return;
        try {
            await Storage.apiCall(`/admin/discover/${id}`, "DELETE");
            Utils.showToast(__("admin.deleted"), "success");
            this.loadAll();
        } catch (e) {
            Utils.showToast(__("toast.failed") + e.message, "error");
        }
    }
};
