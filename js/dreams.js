const Dreams = {
    selectedDreamId: null,
    selectedFeelings: [],
    selectedCategories: [],
    nsfw: false,

    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "newDreamBtn" || e.target.closest("#newDreamBtn")) {
                this.showEditor();
            }
            if (e.target.id === "saveDreamBtn") {
                this.handleSave();
            }
            if (e.target.id === "openTagsBtn") {
                this.showTags();
            }
            if (e.target.id === "finishDreamBtn") {
                this.finishDream();
            }
            if (e.target.id === "detailSaveBtn" || e.target.closest("#detailSaveBtn")) {
                this.saveDetailDream();
            }
        });

        document.addEventListener("click", (e) => {
            const btn = e.target.closest(".emotion-btn");
            if (btn) {
                const feeling = btn.dataset.feeling || btn.textContent.trim();
                if (this.selectedFeelings.includes(feeling)) {
                    this.selectedFeelings = this.selectedFeelings.filter(f => f !== feeling);
                    btn.classList.remove("selected");
                } else {
                    this.selectedFeelings.push(feeling);
                    btn.classList.add("selected");
                }
            }
        });

        document.addEventListener("click", (e) => {
            const btn = e.target.closest(".category-btn");
            if (btn) {
                const cat = btn.dataset.category;
                const otherInput = document.getElementById("otherCategoryInput");

                if (cat === "Other") {
                    btn.classList.toggle("selected");
                    if (btn.classList.contains("selected")) {
                        otherInput.style.display = "block";
                        otherInput.focus();
                        if (otherInput.value.trim()) {
                            this.selectedCategories.push(otherInput.value.trim());
                        }
                    } else {
                        otherInput.style.display = "none";
                        this.selectedCategories = this.selectedCategories.filter(c =>
                            c !== otherInput.value.trim()
                        );
                        otherInput.value = "";
                    }
                    return;
                }

                btn.classList.toggle("selected");
                if (btn.classList.contains("selected")) {
                    this.selectedCategories.push(cat);
                } else {
                    this.selectedCategories = this.selectedCategories.filter(c => c !== cat);
                }
            }
        });

        document.addEventListener("input", (e) => {
            if (e.target.id === "otherCategoryInput") {
                const otherBtn = document.querySelector('.category-btn[data-category="Other"]');
                if (!otherBtn || !otherBtn.classList.contains("selected")) return;
                this.selectedCategories = this.selectedCategories.filter(c => c !== e.target._prevVal);
                const val = e.target.value.trim();
                if (val) this.selectedCategories.push(val);
                e.target._prevVal = val;
            }
        });

        document.addEventListener("input", (e) => {
            if (e.target.id === "searchBox") {
                this.search(e.target.value);
            }
        });

        document.addEventListener("change", (e) => {
            if (e.target.id === "nsfwToggle") {
                this.nsfw = e.target.checked;
            }
        });

        document.addEventListener("click", (e) => {
            if (e.target.id === "detailDreamText" || e.target.closest("#detailDreamText")) {
                if (document.getElementById("editDetailText").style.display === "none") {
                    this.editDetailDream();
                }
            }
        });
    },

    showEditor() {
        this.selectedDreamId = null;
        this.selectedFeelings = [];
        this.selectedCategories = [];
        this.nsfw = false;
        document.getElementById("ruya").value = "";
        document.querySelectorAll(".emotion-btn").forEach(b => b.classList.remove("selected"));
        document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("selected"));
        const otherInput = document.getElementById("otherCategoryInput");
        if (otherInput) { otherInput.style.display = "none"; otherInput.value = ""; otherInput._prevVal = ""; }
        const nsfwToggle = document.getElementById("nsfwToggle");
        if (nsfwToggle) nsfwToggle.checked = false;
        App.navigateTo("editor");
    },

    showTags() {
        const text = document.getElementById("ruya").value.trim();
        if (!text) {
            Utils.showToast(__("toast.writeFirst"), "error");
            return;
        }
        App.navigateTo("tags");
    },

    async finishDream() {
        await this.handleSave();
    },

    async handleSave() {
        const textarea = document.getElementById("ruya");
        const text = textarea.value.trim();

        if (!text) {
            Utils.showToast(__("toast.writeFirst"), "error");
            return;
        }

        const dreamData = {
            title: Utils.extractTitle(text),
            text: text,
            feelings: [...this.selectedFeelings],
            category: [...this.selectedCategories],
            tags: [...this.selectedTags || []],
            nsfw: this.nsfw
        };

        if (this.selectedDreamId) {
            await Storage.updateDream(this.selectedDreamId, dreamData);
            Utils.showToast(__("toast.updateSuccess"), "success");
        } else {
            await Storage.addDream(dreamData);
            Utils.showToast(__("toast.saveSuccess"), "success");
        }

        this.selectedDreamId = null;
        this.selectedFeelings = [];
        this.selectedCategories = [];
        this.nsfw = false;
        textarea.value = "";
        document.querySelectorAll(".emotion-btn").forEach(b => b.classList.remove("selected"));
        document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("selected"));
        const otherInput = document.getElementById("otherCategoryInput");
        if (otherInput) { otherInput.style.display = "none"; otherInput.value = ""; otherInput._prevVal = ""; }
        const nsfwToggle = document.getElementById("nsfwToggle");
        if (nsfwToggle) nsfwToggle.checked = false;

        this.render();
        App.navigateTo("dashboard");
    },

    render() {
        const list = document.getElementById("dreamList");
        if (!list) return;

        const dreams = Storage.getDreams();
        list.innerHTML = "";

        dreams.slice().reverse().forEach(dream => {
            const emojis = (dream.feelings || []).map(f => f.split(" ")[0]).join(" ");
            const cats = Array.isArray(dream.category) ? dream.category : (dream.category ? [dream.category] : []);
            const categoryBadges = cats.map(c => `<span class="badge" style="margin-left:6px;font-size:10px;">${Utils.escapeHtml(c)}</span>`).join(" ");

            const item = document.createElement("div");
            item.className = "dream-item";
            item.onclick = () => this.openDream(dream.id);
            item.innerHTML = `
                <div class="dream-item-title">🌙 ${Utils.escapeHtml(dream.title)}${categoryBadges}</div>
                <div class="dream-item-meta">
                    <span>${dream.date} ${emojis}</span>
                    <div class="dream-item-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); Dreams.likeDream(${dream.id})">⭐ ${dream.likes || 0}</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); Dreams.deleteDreamById(${dream.id})">🗑</button>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });

        this.updateSidebarDreams();
        Stats.update();
    },

    updateSidebarDreams() {
        const weeklyBox = document.getElementById("weeklyDream");
        if (!weeklyBox) return;

        const dreams = Storage.getDreams();
        if (dreams.length === 0) {
            weeklyBox.innerHTML = __("nav.noDream");
            return;
        }

        let best = dreams[0];
        dreams.forEach(d => {
            if ((d.likes || 0) > (best.likes || 0)) best = d;
        });
        weeklyBox.innerHTML = `🌙 ${Utils.escapeHtml(Utils.truncate(best.title, 30))}`;
    },

    openDream(id) {
        const dreams = Storage.getDreams();
        const dream = dreams.find(d => d.id === id);
        if (!dream) return;

        this.selectedDreamId = id;

        document.getElementById("detailDreamText").textContent = dream.text;
        document.getElementById("detailDreamText").style.display = "block";
        document.getElementById("editDetailText").style.display = "none";
        document.getElementById("detailSaveBtn").style.display = "none";

        const emojis = (dream.feelings || []).map(f => f.split(" ")[0]).join(" ");
        document.getElementById("detailFeelings").innerHTML = emojis;

        const categoryEl = document.getElementById("detailCategory");
        if (categoryEl) {
            const cats = Array.isArray(dream.category) ? dream.category : (dream.category ? [dream.category] : []);
            let badges = cats.map(c => `<span class="badge">${Utils.escapeHtml(c)}</span>`).join(" ");
            if (dream.nsfw) badges += `<span class="badge" style="background:var(--danger);color:white;border-color:var(--danger);">NSFW</span>`;
            categoryEl.innerHTML = badges.length > 0 ? badges : __("detail.uncategorized");
        }

        App.navigateTo("details");
    },

    editDetailDream() {
        const dreams = Storage.getDreams();
        const dream = dreams.find(d => d.id === this.selectedDreamId);
        if (!dream) return;

        document.getElementById("detailDreamText").style.display = "none";
        document.getElementById("editDetailText").style.display = "block";
        document.getElementById("detailSaveBtn").style.display = "inline-flex";
        document.getElementById("editDetailText").value = dream.text;
    },

    async saveDetailDream() {
        const newText = document.getElementById("editDetailText").value.trim();
        if (!newText) return;

        await Storage.updateDream(this.selectedDreamId, {
            text: newText,
            title: Utils.extractTitle(newText),
            aiAnalysis: ""
        });

        document.getElementById("detailDreamText").textContent = newText;
        document.getElementById("detailDreamText").style.display = "block";
        document.getElementById("editDetailText").style.display = "none";
        document.getElementById("detailSaveBtn").style.display = "none";

        Utils.showToast(__("toast.updateSuccess"), "success");
        this.render();
    },

    async likeDream(id) {
        await Storage.likeDream(id);
        this.render();
    },

    async deleteDreamById(id) {
        if (!confirm(__("toast.confirmDelete"))) return;
        await Storage.deleteDream(id);
        Utils.showToast(__("toast.deleteSuccess"), "info");
        this.render();
    },

    search(query) {
        const text = query.toLowerCase();
        const items = document.querySelectorAll(".dream-item");
        items.forEach(item => {
            const match = item.innerText.toLowerCase().includes(text);
            item.style.display = match ? "block" : "none";
        });
    }
};
