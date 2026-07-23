const Recurring = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "findRecurringBtn" || e.target.closest("#findRecurringBtn")) {
                this.findRecurring();
            }
        });
    },

    findRecurring() {
        const dreams = Storage.getDreams();
        if (dreams.length < 2) {
            Utils.showToast("Need at least 2 dreams to find patterns.", "info");
            return;
        }

        const groups = this.groupSimilarDreams(dreams);
        this.displayRecurring(groups);
        App.navigateTo("recurring");
    },

    groupSimilarDreams(dreams) {
        const groups = [];

        for (let i = 0; i < dreams.length; i++) {
            for (let j = i + 1; j < dreams.length; j++) {
                const similarity = this.calculateSimilarity(dreams[i], dreams[j]);
                if (similarity > 0.3) {
                    const existingGroup = groups.find(g =>
                        g.some(d => d.id === dreams[i].id || d.id === dreams[j].id)
                    );

                    if (existingGroup) {
                        if (!existingGroup.find(d => d.id === dreams[i].id)) {
                            existingGroup.push({ ...dreams[i], similarity });
                        }
                        if (!existingGroup.find(d => d.id === dreams[j].id)) {
                            existingGroup.push({ ...dreams[j], similarity });
                        }
                    } else {
                        groups.push([
                            { ...dreams[i], similarity },
                            { ...dreams[j], similarity }
                        ]);
                    }
                }
            }
        }

        return groups.filter(g => g.length >= 2);
    },

    calculateSimilarity(dream1, dream2) {
        const words1 = new Set(dream1.text.toLowerCase().split(/\s+/));
        const words2 = new Set(dream2.text.toLowerCase().split(/\s+/));

        const stopWords = new Set(["the", "a", "an", "is", "was", "were", "are", "i", "you", "he", "she", "it", "we", "they", "my", "your", "his", "her", "its", "our", "their", "in", "on", "at", "to", "for", "of", "with", "and", "but", "or", "so", "that", "this", "these", "those"]);

        const filtered1 = [...words1].filter(w => !stopWords.has(w) && w.length > 2);
        const filtered2 = [...words2].filter(w => !stopWords.has(w) && w.length > 2);

        if (filtered1.length === 0 || filtered2.length === 0) return 0;

        const intersection = filtered1.filter(w => filtered2.includes(w));
        const union = [...new Set([...filtered1, ...filtered2])];

        return intersection.length / union.length;
    },

    displayRecurring(groups) {
        const container = document.getElementById("recurringList");
        if (!container) return;

        if (groups.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center;padding:40px;">
                    <h3>No Recurring Patterns Found</h3>
                    <p style="color:var(--text-muted);margin-top:8px;">Keep writing dreams to discover patterns over time.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = groups.map((group, i) => {
            const keywords = this.extractGroupKeywords(group);
            const dates = group.map(d => d.date).join(" → ");
            const snippets = group.map(d =>
                `<div class="dream-item" onclick="Dreams.openDream(${d.id})" style="margin-top:8px;">
                    <div class="dream-item-title">🌙 ${Utils.escapeHtml(Utils.truncate(d.title, 40))}</div>
                    <div class="dream-item-meta"><span>${d.date}</span></div>
                </div>`
            ).join("");

            return `
                <div class="card" style="margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h3>🔁 Pattern #${i + 1}</h3>
                        <span class="badge">${group.length} dreams</span>
                    </div>
                    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:10px;">
                        Keywords: ${keywords.join(", ")}
                    </p>
                    <p style="color:var(--text-muted);font-size:12px;">${dates}</p>
                    ${snippets}
                </div>
            `;
        }).join("");
    },

    extractGroupKeywords(group) {
        const wordCount = {};
        group.forEach(d => {
            const words = d.text.toLowerCase().split(/\s+/);
            words.forEach(w => {
                if (w.length > 3) {
                    wordCount[w] = (wordCount[w] || 0) + 1;
                }
            });
        });

        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }
};
