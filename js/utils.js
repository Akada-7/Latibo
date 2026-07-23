const Utils = {
    truncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    },

    extractTitle(text) {
        const firstSentence = text.split(".")[0];
        return this.truncate(firstSentence, 40);
    },

    calculateStreak(dates) {
        if (dates.length === 0) return 0;
        const unique = [...new Set(dates)];
        unique.sort((a, b) => new Date(b) - new Date(a));
        let streak = 1;
        for (let i = 0; i < unique.length - 1; i++) {
            const diff = (new Date(unique[i]) - new Date(unique[i + 1])) / (1000 * 60 * 60 * 24);
            if (diff === 1) streak++;
            else break;
        }
        return streak;
    },

    countFeelings(dreams) {
        const counts = {};
        dreams.forEach(d => {
            if (d.feelings) {
                d.feelings.forEach(f => {
                    counts[f] = (counts[f] || 0) + 1;
                });
            }
        });
        return counts;
    },

    countCategories(dreams) {
        const counts = {};
        dreams.forEach(d => {
            if (d.category) {
                const cats = Array.isArray(d.category) ? d.category : [d.category];
                cats.forEach(c => {
                    if (c) counts[c] = (counts[c] || 0) + 1;
                });
            }
        });
        return counts;
    },

    showToast(message, type = "info") {
        let container = document.getElementById("toastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "toastContainer";
            container.className = "toast-container";
            document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
};
