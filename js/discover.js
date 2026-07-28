const Discover = {
    dreams: [],
    likedIds: new Set(),
    expandedIds: new Set(),
    openCommentId: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "shareDreamBtn" || e.target.closest("#shareDreamBtn")) {
                this.shareDream();
            }
            const toggleBtn = e.target.closest(".dream-toggle");
            if (toggleBtn) {
                const id = toggleBtn.dataset.id;
                if (this.expandedIds.has(id)) {
                    this.expandedIds.delete(id);
                } else {
                    this.expandedIds.add(id);
                }
                this.render();
            }
            const commentBtn = e.target.closest(".comment-toggle-btn");
            if (commentBtn) {
                const id = commentBtn.dataset.id;
                this.openCommentId = this.openCommentId === id ? null : id;
                this.render();
                if (this.openCommentId === id) {
                    setTimeout(() => {
                        const input = document.querySelector(`.comment-input[data-id="${id}"]`);
                        if (input) input.focus();
                    }, 100);
                }
            }
            const reportBtn = e.target.closest(".report-btn");
            if (reportBtn) {
                const id = reportBtn.dataset.id;
                this.showReportModal(id);
            }
            const submitReportBtn = e.target.closest("#submitReportBtn");
            if (submitReportBtn) {
                this.submitReport();
            }
            const cancelReportBtn = e.target.closest("#cancelReportBtn");
            if (cancelReportBtn) {
                this.hideReportModal();
            }
            const submitCommentBtn = e.target.closest(".comment-submit-btn");
            if (submitCommentBtn) {
                const id = submitCommentBtn.dataset.id;
                this.addComment(id);
            }
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const commentInput = e.target.closest(".comment-input");
                if (commentInput) {
                    const id = commentInput.dataset.id;
                    this.addComment(id);
                }
            }
        });
        document.addEventListener("input", (e) => {
            if (e.target.id === "discoverSearch") {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => this.loadDiscover(), 300);
            }
        });
        document.addEventListener("change", (e) => {
            if (e.target.id === "discoverFilter") {
                this.loadDiscover();
            }
        });
    },

    async loadDiscover() {
        try {
            const q = document.getElementById("discoverSearch") ? document.getElementById("discoverSearch").value : "";
            const category = document.getElementById("discoverFilter") ? document.getElementById("discoverFilter").value : "";
            let url = `${API_URL}/discover`;
            const params = [];
            if (q) params.push(`q=${encodeURIComponent(q)}`);
            if (category) params.push(`category=${encodeURIComponent(category)}`);
            if (params.length) url += "?" + params.join("&");

            this.dreams = await fetch(url).then(r => r.json());
        } catch (e) {
            this.dreams = [];
        }

        this.likedIds.clear();
        if (Storage.getToken()) {
            for (const dream of this.dreams) {
                try {
                    const res = await Storage.apiCall(`/discover/${dream._id}/liked`);
                    if (res.liked) this.likedIds.add(dream._id);
                } catch (e) {}
            }
        }

        this.render();
    },

    truncateText(text, maxWords = 40) {
        const words = text.split(/\s+/);
        if (words.length <= maxWords) return { text, truncated: false };
        return { text: words.slice(0, maxWords).join(" ") + "...", truncated: true };
    },

    render() {
        const container = document.getElementById("discoverList");
        if (!container) return;

        if (this.dreams.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center;padding:40px;">
                    <h3>No Shared Dreams Yet</h3>
                    <p style="color:var(--text-muted);margin-top:8px;">Be the first to share your dream with the community!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.dreams.map(dream => {
            const emojis = (dream.feelings || []).map(f => f.split(" ")[0]).join(" ");
            const cats = Array.isArray(dream.category) ? dream.category : (dream.category ? [dream.category] : []);
            const categoryBadges = cats.map(c => `<span class="badge" style="font-size:10px;">${c}</span>`).join(" ");
            const isLiked = this.likedIds.has(dream._id);
            const likeStyle = isLiked ? "color:#f59e0b;" : "";
            const isExpanded = this.expandedIds.has(dream._id);
            const { text: displayText, truncated } = this.truncateText(dream.text || "");
            const finalText = isExpanded ? Utils.escapeHtml(dream.text || "") : Utils.escapeHtml(displayText);
            const showCommentBox = this.openCommentId === dream._id;
            const comments = dream.comments || [];

            return `
                <div class="card" style="margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                        <div>
                            <h3 style="margin:0;">🌙 ${Utils.escapeHtml(dream.title || "Untitled Dream")}</h3>
                            <p style="color:var(--text-muted);font-size:12px;margin-top:4px;">
                                by ${Utils.escapeHtml(dream.authorName || "Anonymous")} · ${new Date(dream.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                            ${categoryBadges}
                            ${dream.nsfw ? '<span class="badge" style="background:var(--danger);color:white;border-color:var(--danger);font-size:10px;">NSFW</span>' : ""}
                        </div>
                    </div>
                    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin-bottom:6px;">
                        ${finalText}
                        ${truncated && !isExpanded ? `<span class="dream-toggle" data-id="${dream._id}" style="color:var(--accent);cursor:pointer;font-weight:500;"> devamı</span>` : ""}
                        ${isExpanded ? `<span class="dream-toggle" data-id="${dream._id}" style="color:var(--accent);cursor:pointer;font-weight:500;font-size:13px;"> daha az</span>` : ""}
                    </p>
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:13px;">${emojis}</span>
                            <button class="btn-icon comment-toggle-btn" data-id="${dream._id}" style="font-size:13px;">💬 ${comments.length || 0}</button>
                            <button class="btn-icon report-btn" data-id="${dream._id}" style="font-size:12px;color:var(--text-muted);" title="Report">🚩</button>
                        </div>
                        <button class="btn-icon" onclick="Discover.likeShared('${dream._id}')" style="font-size:14px;${likeStyle}">${isLiked ? '⭐' : '☆'} ${dream.likes || 0}</button>
                    </div>
                    ${showCommentBox ? this.commentSectionHtml(dream) : ""}
                </div>
            `;
        }).join("");
    },

    commentSectionHtml(dream) {
        const comments = dream.comments || [];
        const commentsHtml = comments.map(c => `
            <div style="padding:8px 0;border-bottom:1px solid var(--border-color);font-size:13px;">
                <strong style="color:var(--accent);">${Utils.escapeHtml(c.authorName)}</strong>
                <span style="color:var(--text-muted);font-size:11px;margin-left:6px;">${new Date(c.createdAt).toLocaleString()}</span>
                <p style="margin-top:4px;color:var(--text-secondary);">${Utils.escapeHtml(c.text)}</p>
            </div>
        `).join("");

        return `
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);">
                <div style="margin-bottom:8px;max-height:200px;overflow-y:auto;">
                    ${commentsHtml || '<p style="color:var(--text-muted);font-size:13px;">No comments yet.</p>'}
                </div>
                <div style="display:flex;gap:8px;">
                    <input type="text" class="input comment-input" data-id="${dream._id}" placeholder="Write a comment..." style="flex:1;padding:8px 12px;font-size:13px;" ${!Storage.getToken() ? 'disabled title="Log in to comment"' : ""}>
                    <button class="btn btn-sm btn-primary comment-submit-btn" data-id="${dream._id}" style="width:auto;" ${!Storage.getToken() ? 'disabled' : ""}>Send</button>
                </div>
            </div>
        `;
    },

    async addComment(id) {
        if (!Storage.getToken()) {
            Utils.showToast("Log in to comment.", "error");
            return;
        }
        const input = document.querySelector(`.comment-input[data-id="${id}"]`);
        if (!input || !input.value.trim()) return;

        try {
            const comment = await Storage.apiCall(`/discover/${id}/comment`, "POST", { text: input.value.trim() });
            const dream = this.dreams.find(d => d._id === id);
            if (dream) {
                if (!dream.comments) dream.comments = [];
                dream.comments.push(comment);
            }
            input.value = "";
            this.render();
            setTimeout(() => {
                const newInput = document.querySelector(`.comment-input[data-id="${id}"]`);
                if (newInput) newInput.focus();
            }, 100);
        } catch (e) {
            Utils.showToast("Failed: " + e.message, "error");
        }
    },

    showReportModal(id) {
        const existing = document.getElementById("reportModal");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay active";
        overlay.id = "reportModal";
        overlay.innerHTML = `
            <div class="modal" onclick="event.stopPropagation()">
                <h2>🚩 Report Dream</h2>
                <div class="form-group" style="margin-bottom:16px;">
                    <label>Reason</label>
                    <select id="reportReason" class="input">
                        <option value="I didn't like this dream">😕 I didn't like this dream</option>
                        <option value="Inappropriate content">Inappropriate content</option>
                        <option value="Spam">Spam</option>
                        <option value="Harassment">Harassment</option>
                        <option value="Not dream related">Not dream related</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">Reporting will hide this dream from your feed.</p>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="cancelReportBtn" class="btn" style="width:auto;">Cancel</button>
                    <button id="submitReportBtn" class="btn btn-primary" style="width:auto;">Report & Hide</button>
                </div>
                <input type="hidden" id="reportDreamId" value="${id}">
            </div>
        `;
        overlay.onclick = () => overlay.remove();
        overlay.querySelector(".modal").onclick = (e) => e.stopPropagation();
        document.body.appendChild(overlay);
    },

    hideReportModal() {
        const modal = document.getElementById("reportModal");
        if (modal) modal.remove();
    },

    async submitReport() {
        const id = document.getElementById("reportDreamId").value;
        const reason = document.getElementById("reportReason").value;
        if (!reason) return;

        try {
            const result = await Storage.apiCall(`/discover/${id}/report`, "POST", { reason });
            this.dreams = this.dreams.filter(d => d._id !== id);
            this.render();
            Utils.showToast("Dream reported and hidden.", "success");
            this.hideReportModal();
        } catch (e) {
            Utils.showToast("Failed: " + e.message, "error");
        }
    },

    async shareDream() {
        if (!Dreams.selectedDreamId) return;

        const dreams = Storage.getDreams();
        const dream = dreams.find(d => d.id === Dreams.selectedDreamId);
        if (!dream) return;

        const btn = document.getElementById("shareDreamBtn");
        if (btn && btn.dataset.shared) {
            this.unshareDream(dream);
            return;
        }

        try {
            const result = await Storage.apiCall("/dreams/share", "POST", {
                dreamId: dream.id.toString(),
                text: dream.text,
                title: dream.title,
                feelings: dream.feelings,
                category: dream.category,
                nsfw: dream.nsfw || false
            });

            if (btn) {
                btn.textContent = "🔗 Shared";
                btn.dataset.shared = result._id;
                btn.classList.add("btn-primary");
            }

            Utils.showToast("Dream shared with the community!", "success");
        } catch (e) {
            if (e.message.includes("zaten")) {
                Utils.showToast("This dream is already shared.", "info");
            } else {
                Utils.showToast("Failed to share: " + e.message, "error");
            }
        }
    },

    async unshareDream(dream) {
        const btn = document.getElementById("shareDreamBtn");
        if (!btn || !btn.dataset.shared) return;

        try {
            await Storage.apiCall(`/dreams/share/${btn.dataset.shared}`, "DELETE");
            btn.textContent = "🔗 Share";
            delete btn.dataset.shared;
            btn.classList.remove("btn-primary");
            Utils.showToast("Dream unshared.", "info");
        } catch (e) {
            Utils.showToast("Failed to unshare.", "error");
        }
    },

    async checkShareStatus(dreamId) {
        const btn = document.getElementById("shareDreamBtn");
        if (!btn) return;

        try {
            const result = await Storage.apiCall(`/dreams/${dreamId}/shared`);
            if (result.shared) {
                btn.textContent = "🔗 Shared";
                btn.dataset.shared = result.sharedId;
                btn.classList.add("btn-primary");
            } else {
                btn.textContent = "🔗 Share";
                delete btn.dataset.shared;
                btn.classList.remove("btn-primary");
            }
        } catch (e) {
            btn.textContent = "🔗 Share";
            delete btn.dataset.shared;
            btn.classList.remove("btn-primary");
        }
    },

    async likeShared(id) {
        if (!Storage.getToken()) {
            Utils.showToast("Log in to like dreams.", "error");
            return;
        }

        try {
            const result = await Storage.apiCall(`/discover/${id}/like`, "POST");
            if (result.liked) {
                this.likedIds.add(id);
            } else {
                this.likedIds.delete(id);
            }
            const dream = this.dreams.find(d => d._id === id);
            if (dream) dream.likes = result.likes;
            this.render();
        } catch (e) {
            Utils.showToast("Failed to like.", "error");
        }
    }
};
