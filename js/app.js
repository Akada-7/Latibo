const App = {
    currentPage: "dashboard",

    async init() {
        Theme.init();
        Auth.init();
        this.registerServiceWorker();

        if (Storage.getToken()) {
            try {
                await Storage.apiCall("/health");
            } catch (e) {
                Storage.clearUser();
            }
        }

        Dreams.init();
        Stats.update();
        AIAnalysis.init();
        Voice.init();
        Recurring.init();
        Discover.init();
        Settings.init();

        if (Auth.isLoggedIn()) {
            await Storage.syncDreamsFromServer();
            this.showApp();
        } else {
            this.showAuth();
        }

        this.bindNavigation();
    },

    registerServiceWorker() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(r => r.unregister());
            });
            caches.keys().then(keys => {
                keys.forEach(k => caches.delete(k));
            });
        }
    },

    bindNavigation() {
        document.addEventListener("click", (e) => {
            const nav = e.target.closest(".nav-item");
            if (nav && nav.dataset.page) {
                this.navigateTo(nav.dataset.page);
            }
        });
    },

    showAuth() {
        document.getElementById("authPage").style.display = "flex";
        document.getElementById("appPage").style.display = "none";
    },

    showApp() {
        document.getElementById("authPage").style.display = "none";
        document.getElementById("appPage").style.display = "flex";

        const user = Auth.getCurrentUser();
        if (user) {
            const nameEl = document.getElementById("userName");
            const emailEl = document.getElementById("userEmail");
            const avatarEl = document.getElementById("userAvatar");
            if (nameEl) nameEl.textContent = user.name;
            if (emailEl) emailEl.textContent = user.email;
            if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
        }

        Dreams.render();
        this.navigateTo("dashboard");
    },

    navigateTo(page) {
        this.currentPage = page;

        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add("active");

        document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
        const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navItem) navItem.classList.add("active");

        if (page === "dashboard") {
            Stats.update();
        }

        if (page === "details" && Dreams.selectedDreamId) {
            const dreams = Storage.getDreams();
            const dream = dreams.find(d => d.id === Dreams.selectedDreamId);
            if (dream) {
                AIAnalysis.loadExistingAnalysis(dream);
                Discover.checkShareStatus(dream.id.toString());
            }
        }

        if (page === "discover") {
            Discover.loadDiscover();
        }

        if (page === "settings") {
            Settings.loadProfile();
        }

        if (page === "stats") {
            setTimeout(() => Stats.renderCharts(Storage.getDreams()), 100);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => App.init());
