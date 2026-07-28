const Stats = {
    charts: {},

    update() {
        const dreams = Storage.getDreams();

        const el = (id) => document.getElementById(id);
        if (el("totalDreams")) el("totalDreams").textContent = dreams.length;

        let totalLikes = 0;
        let totalWords = 0;
        const dates = [];

        dreams.forEach(d => {
            totalLikes += d.likes || 0;
            totalWords += (d.text || "").split(" ").length;
            dates.push(d.date);
        });

        if (el("totalLikes")) el("totalLikes").textContent = totalLikes;
        if (el("totalWords")) el("totalWords").textContent = totalWords;
        if (el("streak")) el("streak").textContent = Utils.calculateStreak(dates);

        const feelingCounts = Utils.countFeelings(dreams);
        const sorted = Object.entries(feelingCounts).sort((a, b) => b[1] - a[1]);
        const feelingText = sorted.map(([f, c]) => `<span style="display:inline-block;margin:3px 0;">${f} <span style="color:var(--accent);font-weight:600;">${c}</span></span>`).join(" &nbsp;·&nbsp; ");
        if (el("feelingsStats")) el("feelingsStats").innerHTML = feelingText || __("dash.noData");

        const categoryCounts = Utils.countCategories(dreams);
        const catText = Object.entries(categoryCounts).map(([c, n]) => `${c} <span style="color:var(--accent);font-weight:600;">${n}</span>`).join(" &nbsp;·&nbsp; ");
        if (el("categoryStats")) el("categoryStats").innerHTML = catText || __("dash.noData");

        this.renderCharts(dreams);
    },

    renderCharts(dreams) {
        this.renderEmotionChart(dreams);
        this.renderMoodChart(dreams);
        this.renderCategoryChart(dreams);
        this.renderRadarChart(dreams);
    },

    destroyChart(key) {
        if (this.charts[key]) {
            this.charts[key].destroy();
            this.charts[key] = null;
        }
    },

    renderEmotionChart(dreams) {
        const canvas = document.getElementById("emotionChart");
        if (!canvas) return;
        this.destroyChart("emotion");

        const counts = Utils.countFeelings(dreams);
        if (Object.keys(counts).length === 0) return;

        const colors = [
            "#7c5cff", "#a78bfa", "#4f46e5", "#6366f1",
            "#22c55e", "#4ade80", "#f59e0b", "#fbbf24",
            "#ef4444", "#f87171", "#06b6d4", "#22d3ee",
            "#ec4899", "#f472b6", "#8b5cf6", "#c084fc"
        ];

        this.charts["emotion"] = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: colors.slice(0, Object.keys(counts).length),
                    borderWidth: 2,
                    borderColor: "var(--bg-card)",
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "55%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#a0a0b8",
                            font: { size: 11, family: "'Segoe UI', sans-serif" },
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 8
                        }
                    }
                }
            }
        });
    },

    renderMoodChart(dreams) {
        const canvas = document.getElementById("moodChart");
        if (!canvas) return;
        this.destroyChart("mood");

        if (dreams.length === 0) return;

        const moodValue = {
            "😊 Happy": 8, "🤩 Excited": 7, "🥰 Loved": 6, "😌 Calm": 5,
            "😴 Sleepy": 4, "😕 Confused": 3, "😢 Sad": 2, "😨 Scared": 1,
            "😡 Angry": 0, "🤯 Shocked": 3
        };

        const labels = dreams.map(d => d.date);
        const values = dreams.map(d => {
            if (d.feelings && d.feelings.length > 0) {
                const first = d.feelings[0];
                return moodValue[first] !== undefined ? moodValue[first] : 4;
            }
            return 4;
        });

        const ctx = canvas.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(124, 92, 255, 0.3)");
        gradient.addColorStop(1, "rgba(124, 92, 255, 0.01)");

        this.charts["mood"] = new Chart(canvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: __("dash.mood"),
                    data: values,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: "#7c5cff",
                    borderWidth: 2.5,
                    pointBackgroundColor: "#7c5cff",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0, max: 8,
                        ticks: {
                            color: "#8888a0",
                            font: { size: 11 },
                            callback: (v) => {
                                const map = { 8: "😊", 7: "🤩", 6: "🥰", 5: "😌", 4: "😐", 3: "😕", 2: "😢", 1: "😨", 0: "😡" };
                                return map[v] || "";
                            }
                        },
                        grid: { color: "rgba(48,48,64,0.5)", drawBorder: false }
                    },
                    x: {
                        ticks: { color: "#8888a0", font: { size: 10 }, maxRotation: 45 },
                        grid: { display: false }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    renderCategoryChart(dreams) {
        const canvas = document.getElementById("categoryChart");
        if (!canvas) return;
        this.destroyChart("category");

        const counts = Utils.countCategories(dreams);
        if (Object.keys(counts).length === 0) return;

        const colors = [
            "#7c5cff", "#a78bfa", "#4f46e5", "#6366f1",
            "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"
        ];

        this.charts["category"] = new Chart(canvas, {
            type: "bar",
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: colors.slice(0, Object.keys(counts).length),
                    borderRadius: 8,
                    borderSkipped: false,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: { color: "#8888a0", font: { size: 11 }, stepSize: 1 },
                        grid: { color: "rgba(48,48,64,0.5)", drawBorder: false }
                    },
                    y: {
                        ticks: { color: "#ccc", font: { size: 12, weight: "500" } },
                        grid: { display: false }
                    }
                }
            }
        });
    },

    renderRadarChart(dreams) {
        const canvas = document.getElementById("radarChart");
        if (!canvas) return;
        this.destroyChart("radar");

        const feelingCounts = Utils.countFeelings(dreams);
        const total = dreams.length || 1;

        const labels = [__("dash.creativity"), __("dash.fear"), __("dash.adventure"), __("dash.symbols"), __("dash.lucidity"), __("dash.positivity")];
        const mapping = {
            [__("dash.creativity")]: ["😕 Confused", "🤩 Excited", "🤯 Shocked"],
            [__("dash.fear")]: ["😨 Scared", "😰 Anxious"],
            [__("dash.adventure")]: ["😊 Happy", "🤩 Excited", "😲 Amazed"],
            [__("dash.symbols")]: ["😡 Angry", "🤯 Shocked", "😲 Amazed"],
            [__("dash.lucidity")]: ["😌 Calm", "😴 Sleepy", "🥰 Loved"],
            [__("dash.positivity")]: ["😊 Happy", "😌 Calm", "🥰 Loved", "🤩 Excited"]
        };

        const data = labels.map(label => {
            const matchFeelings = mapping[label] || [];
            let count = 0;
            matchFeelings.forEach(f => { count += feelingCounts[f] || 0; });
            return Math.min(10, Math.round((count / total) * 10));
        });

        this.charts["radar"] = new Chart(canvas, {
            type: "radar",
            data: {
                labels: labels,
                datasets: [{
                    label: __("dash.dreamProfile"),
                    data: data,
                    fill: true,
                    backgroundColor: "rgba(124, 92, 255, 0.15)",
                    borderColor: "#7c5cff",
                    borderWidth: 2,
                    pointBackgroundColor: "#7c5cff",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        beginAtZero: true, min: 0, max: 10,
                        ticks: { display: false, stepSize: 2 },
                        angleLines: { color: "rgba(48,48,64,0.6)" },
                        grid: { color: "rgba(48,48,64,0.6)" },
                        pointLabels: {
                            color: "#ccc",
                            font: { size: 11, weight: "500", family: "'Segoe UI', sans-serif" }
                        }
                    }
                }
            }
        });
    }
};
