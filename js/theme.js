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
        const icon = theme === "dark" ? "☀️" : "🌙";
        const btn1 = document.getElementById("themeToggle");
        const btn2 = document.getElementById("themeToggleMobile");
        if (btn1) btn1.textContent = icon;
        if (btn2) btn2.textContent = icon;
    },

    bindToggle() {
        document.addEventListener("click", (e) => {
            const toggle = e.target.closest("#themeToggle, #themeToggleMobile");
            if (toggle) {
                this.toggle();
            }
        });
    }
};
