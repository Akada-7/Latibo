const Discover = {
    dreams: [],
    likedIds: new Set(),

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "shareDreamBtn" || e.target.closest("#shareDreamBtn")) {
                this.shareDream();
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

            return `
                <div class="card" style="margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                        <div>
                            <h3 style="margin:0;">🌙 ${Utils.escapeHtml(dream.title || "Untitled Dream")}</h3>
                            <p style="color:var(--text-muted);font-size:12px;margin-top:4px;">
                                by ${Utils.escapeHtml(dream.authorName || "Anonymous")} · ${new Date(dream.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div style="display:flex;gap:6px;align-items:center;">
                            ${categoryBadges}
                        </div>
                    </div>
                    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin-bottom:10px;">
                        ${Utils.escapeHtml(dream.text)}
                    </p>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:13px;">${emojis}</span>
                        <button class="btn-icon" onclick="Discover.likeShared('${dream._id}')" style="font-size:14px;${likeStyle}">${isLiked ? '⭐' : '☆'} ${dream.likes || 0}</button>
                    </div>
                </div>
            `;
        }).join("");
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
                category: dream.category
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
