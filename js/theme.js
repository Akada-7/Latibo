const Theme = {
    init() {
        const saved = Storage.getTheme();
        this.apply(saved);
        this.bindToggle();
    },

    apply(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        Storage.setTheme(theme);
        this.updateIcon(theme);
    },

    toggle() {
        const current = Storage.getTheme();
        const next = current === "dark" ? "light" : "dark";
        this.apply(next);
    },

    updateIcon(theme) {
        const btn = document.getElementById("themeToggle");
        if (btn) {
            btn.textContent = theme === "dark" ? "☀️" : "🌙";
        }
    },

    bindToggle() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "themeToggle" || e.target.closest("#themeToggle")) {
                this.toggle();
            }
        });
    }
};
