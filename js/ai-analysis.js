const AIAnalysis = {
    provider: "openai",

    init() {
        this.provider = localStorage.getItem("dreamapp_ai_provider") || "openai";
        this.bindEvents();
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "analyzeBtn" || e.target.closest("#analyzeBtn")) {
                this.analyzeCurrentDream();
            }
            if (e.target.id === "saveApiBtn" || e.target.closest("#saveApiBtn")) {
                this.saveProvider();
            }
        });
    },

    saveProvider() {
        const provider = document.getElementById("aiProvider").value;
        this.provider = provider;
        localStorage.setItem("dreamapp_ai_provider", provider);
        Utils.showToast(__("toast.aiProviderSaved"), "success");
    },

    async analyzeCurrentDream() {
        if (!Dreams.selectedDreamId) return;

        const dreams = Storage.getDreams();
        const dream = dreams.find(d => d.id === Dreams.selectedDreamId);
        if (!dream) return;

        if (!Storage.getToken()) {
            Utils.showToast(__("toast.aiLoginNeeded"), "error");
            return;
        }

        const btn = document.getElementById("analyzeBtn");
        if (btn) {
            btn.disabled = true;
            btn.textContent = __("detail.analyzing");
        }

        try {
            const analysis = await Storage.apiCall("/chat", "POST", {
                text: dream.text
            });

            await Storage.updateDream(dream.id, { aiAnalysis: analysis });
            this.displayAnalysis(analysis);
            Utils.showToast(__("toast.aiComplete"), "success");
        } catch (err) {
            Utils.showToast(__("toast.aiFailed") + " " + err.message, "error");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = __("detail.analyze");
            }
        }
    },

    displayAnalysis(analysis) {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || __("detail.noAI");
        };

        const setSymbols = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!val) { el.textContent = __("detail.noAI"); return; }
            const lines = val.split("\n").filter(l => l.trim());
            el.innerHTML = lines.map(line => {
                const clean = line.replace(/^[\-\*\•\d\.]+\s*/, "").trim();
                const parts = clean.split(/[:\-–]/);
                if (parts.length >= 2) {
                    const symbol = parts[0].trim();
                    const meaning = parts.slice(1).join("-").trim();
                    return `<div style="margin-bottom:8px;"><strong style="color:var(--accent);">✦ ${Utils.escapeHtml(symbol)}</strong><br><span style="color:var(--text-secondary);margin-left:16px;">${Utils.escapeHtml(meaning)}</span></div>`;
                }
                return `<div style="margin-bottom:6px;color:var(--text-secondary);">✦ ${Utils.escapeHtml(clean)}</div>`;
            }).join("");
        };

        set("dreamMood", analysis.mood);
        setSymbols("dreamSymbols", analysis.symbols);
        set("dreamPatterns", analysis.patterns);
        set("dreamSuggestions", analysis.suggestions);

        const deepEl = document.getElementById("dreamDeepAnalysis");
        if (deepEl) deepEl.textContent = analysis.deepAnalysis || "";
    },

    loadExistingAnalysis(dream) {
        if (dream.aiAnalysis && typeof dream.aiAnalysis === "object") {
            this.displayAnalysis(dream.aiAnalysis);
        } else {
            ["dreamMood", "dreamSymbols", "dreamPatterns", "dreamSuggestions"].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = __("detail.noAI");
            });
            const deepEl = document.getElementById("dreamDeepAnalysis");
            if (deepEl) deepEl.textContent = __("detail.noAI");
        }
    }
};
