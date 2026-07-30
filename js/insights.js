const Insights = {
    _cached: null,

    async update() {
        const container = document.getElementById("insightBubbles");
        if (!container) return;

        const dreams = Storage.getDreams();
        if (dreams.length === 0) {
            container.innerHTML = "";
            return;
        }

        if (this._cached) {
            this.render(this._cached);
            return;
        }

        container.innerHTML = `<div class="card" style="text-align:center;padding:24px;"><p>${__("insight.loading")}</p></div>`;

        try {
            const data = await Storage.apiCall("/insights", "POST");
            this._cached = data.insights || [];
            this.render(this._cached);
            setTimeout(() => { this._cached = null; }, 300000);
        } catch (e) {
            container.innerHTML = `<div class="card" style="text-align:center;padding:24px;"><p>${__("insight.error")}</p></div>`;
        }
    },

    render(insights) {
        const container = document.getElementById("insightBubbles");
        if (!container) return;
        if (!insights || insights.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center;padding:24px;"><p>${__("dash.noData")}</p></div>`;
            return;
        }
        container.innerHTML = insights.map(b =>
            `<div class="insight-bubble"><span class="insight-icon">${b.icon}</span><span class="insight-text">${b.text}</span></div>`
        ).join("");
    }
};
