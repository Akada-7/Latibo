const Admin = {
    dreams: [],
    comments: [],
    tab: "dreams",

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            const tabBtn = e.target.closest("[data-admin-tab]");
            if (tabBtn) {
                this.switchTab(tabBtn.dataset.adminTab);
                e.preventDefault();
            }
            if (e.target.id === "adminRefreshBtn" || e.target.closest("#adminRefreshBtn")) {
                this.loadAll();
            }
            const delBtn = e.target.closest(".admin-delete-btn");
            if (delBtn) {
                this.deleteDream(delBtn.dataset.id, delBtn.dataset.title);
            }
            const delCommentBtn = e.target.closest(".admin-comment-delete-btn");
            if (delCommentBtn) {
                this.deleteComment(delCommentBtn.dataset.dreamId, delCommentBtn.dataset.commentId, delCommentBtn.dataset.author);
            }
        });

        document.addEventListener("input", (e) => {
            if (e.target.id === "adminSearch") {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => this.loadAll(), 300);
            }
            if (e.target.id === "adminCommentSearch") {
                clearTimeout(this._commentSearchTimer);
                this._commentSearchTimer = setTimeout(() => this.loadAll(), 300);
            }
        });
    },

    switchTab(tab) {
        this.tab = tab;
        document.querySelectorAll("[data-admin-tab]").forEach(b => b.classList.toggle("active", b.dataset.adminTab === tab));
        document.getElementById("adminDreamList").style.display = tab === "dreams" ? "" : "none";
        document.getElementById("adminCommentList").style.display = tab === "comments" ? "" : "none";
        document.getElementById("adminSearch").style.display = tab === "dreams" ? "" : "none";
        document.getElementById("adminCommentSearch").style.display = tab === "comments" ? "" : "none";
        if (!this[tab] || this[tab].length === 0) this.loadAll();
    },

    async loadAll() {
        if (this.tab === "dreams") {
            await this.loadDreams();
            this.renderDreams();
        } else {
            await this.loadComments();
            this.renderComments();
        }
    },

    async loadDreams() {
        try {
            const q = document.getElementById("adminSearch") ? document.getElementById("adminSearch").value : "";
            let url = "/admin/discover";
            if (q) url += "?q=" + encodeURIComponent(q);
            this.dreams = await Storage.apiCall(url, "GET");
        } catch (e) {
            this.dreams = [];
        }
    },

    async loadComments() {
        try {
            const q = document.getElementById("adminCommentSearch") ? document.getElementById("adminCommentSearch").value : "";
            let url = "/admin/comments";
            if (q) url += "?q=" + encodeURIComponent(q);
            this.comments = await Storage.apiCall(url, "GET");
        } catch (e) {
            this.comments = [];
        }
    },

    renderDreams() {
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

    renderComments() {
        const container = document.getElementById("adminCommentList");
        if (!container) return;

        if (this.comments.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><h3>${__("admin.commentsEmpty")}</h3></div>`;
            return;
        }

        container.innerHTML = this.comments.map(c => `
            <div class="card" style="margin-bottom:10px;padding:12px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <strong style="font-size:13px;">💬 ${Utils.escapeHtml(c.authorName)}</strong>
                            <span style="color:var(--text-muted);font-size:11px;">· ${new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p style="color:var(--text-secondary);font-size:13px;margin-top:4px;word-break:break-word;">${Utils.escapeHtml(c.text)}</p>
                        <a href="#" style="font-size:11px;color:var(--accent);opacity:0.7;" data-i18n="admin.commentOnDream">Rüyada:</a>
                        <span style="font-size:11px;color:var(--text-muted);">${Utils.escapeHtml(c.dreamTitle)}</span>
                    </div>
                    <button class="btn admin-comment-delete-btn" data-dream-id="${c.dreamId}" data-comment-id="${c.commentId}" data-author="${Utils.escapeHtml(c.authorName)}" style="width:auto;padding:4px 12px;font-size:11px;border-color:var(--danger);color:var(--danger);flex-shrink:0;">
                        ${__("admin.delete")}
                    </button>
                </div>
            </div>
        `).join("");
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
    },

    async deleteComment(dreamId, commentId, author) {
        if (!confirm(`${__("admin.confirmCommentDelete")} "${author}"?`)) return;
        try {
            await Storage.apiCall(`/admin/comments/${dreamId}/${commentId}`, "DELETE");
            Utils.showToast(__("admin.commentDeleted"), "success");
            this.loadAll();
        } catch (e) {
            Utils.showToast(__("toast.failed") + e.message, "error");
        }
    }
};
