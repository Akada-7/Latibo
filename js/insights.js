const Insights = {
    skipWords: new Set([
        "ve","bir","bu","ben","ile","ama","gibi","çok","sonra","kadar","için","olan",
        "daha","var","yok","veya","de","da","mi","mu","ki","ya","hem","çünkü","eğer",
        "ancak","bile","üzere","diye","karşı","önce","sonra","üzerine","kendi","her",
        "the","and","but","for","with","not","this","that","was","were","had","have",
        "has","been","all","can","its","also","from","they","will","what","when",
        "where","which","their","there","about","would","could","should","very",
        "just","then","than","some","more","like","into","over","after","before",
        "without","through","during","because","between","under","again","further",
        "such","both","each","other","only","own","same","so","too","still","while"
    ]),

    async update() {
        const dreams = Storage.getDreams();
        const container = document.getElementById("insightBubbles");
        if (!container) return;

        if (dreams.length === 0) {
            container.innerHTML = "";
            return;
        }

        const bubbles = [];
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        const recent = dreams.filter(d => new Date(d.date) >= weekAgo);
        const older = dreams.filter(d => new Date(d.date) < weekAgo);

        const wordCache = {};

        const getTopWords = (dreamList, limit = 3) => {
            const counts = {};
            dreamList.forEach(d => {
                const words = (d.text || "").toLowerCase().split(/[\s,.;!?()"]+/);
                words.forEach(w => {
                    w = w.trim().replace(/[^a-zçğıöşü0-9a-z]/gi, "").toLowerCase();
                    if (w.length > 3 && !this.skipWords.has(w)) {
                        counts[w] = (counts[w] || 0) + 1;
                    }
                });
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
        };

        const catCounts = Utils.countCategories(dreams);
        const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
        if (topCat) {
            const pct = Math.round((topCat[1] / dreams.length) * 100);
            if (pct >= 20) {
                bubbles.push({ icon: "📂", text: __("insight.category", { pct, cat: topCat[0] }) });
            }
        }

        const feelingCounts = Utils.countFeelings(dreams);
        const topFeeling = Object.entries(feelingCounts).sort((a, b) => b[1] - a[1])[0];
        if (topFeeling && topFeeling[1] >= 2) {
            const pct = Math.round((topFeeling[1] / dreams.length) * 100);
            bubbles.push({ icon: "😊", text: __("insight.feeling", { feeling: topFeeling[0], pct }) });
        }

        if (recent.length >= 2 && older.length >= 2) {
            const recentCats = Utils.countCategories(recent);
            const olderCats = Utils.countCategories(older);
            for (const [cat, cnt] of Object.entries(recentCats)) {
                const olderPct = (olderCats[cat] || 0) / older.length;
                const recentPct = cnt / recent.length;
                if (recentPct > olderPct * 1.5 && recentPct > 0.3) {
                    bubbles.push({ icon: "📈", text: __("insight.trendUp", { cat }) });
                    break;
                }
            }
            for (const [cat, cnt] of Object.entries(olderCats)) {
                const olderPct = cnt / older.length;
                const recentPct = (recentCats[cat] || 0) / recent.length;
                if (recentPct < olderPct * 0.5 && olderPct > 0.3) {
                    bubbles.push({ icon: "📉", text: __("insight.trendDown", { cat }) });
                    break;
                }
            }
        }

        if (recent.length >= 2) {
            const recentWords = getTopWords(recent, 2);
            if (recentWords.length > 0 && !bubbles.find(b => b.icon === "📈" || b.icon === "📉")) {
                const words = recentWords.map(([w]) => `"${w}"`).join(", ");
                bubbles.push({ icon: "🔤", text: __("insight.recentWords", { words }) });
            }
        }

        const topWords = getTopWords(dreams, 3);
        if (topWords.length > 0) {
            const words = topWords.map(([w, c]) => `${w} (${c}x)`).join(", ");
            bubbles.push({ icon: "💭", text: __("insight.topWords", { words }) });
        }

        if (dreams.length >= 3) {
            const daysSpan = Math.max(1, Math.round((now.getTime() - new Date(dreams[0]?.date || now).getTime()) / 86400000));
            const avg = ((dreams.length / daysSpan) * 7).toFixed(1);
            bubbles.push({ icon: "📊", text: __("insight.frequency", { avg }) });
        }

        this.render(bubbles);
    },

    render(bubbles) {
        const container = document.getElementById("insightBubbles");
        if (!container) return;
        if (bubbles.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center;padding:24px;"><p>${__("dash.noData")}</p></div>`;
            return;
        }
        container.innerHTML = bubbles.map(b =>
            `<div class="insight-bubble"><span class="insight-icon">${b.icon}</span><span class="insight-text">${b.text}</span></div>`
        ).join("");
    }
};
