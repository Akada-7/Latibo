const Auth = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.addEventListener("submit", (e) => {
            if (e.target.id === "loginForm") {
                e.preventDefault();
                this.handleLogin();
            }
            if (e.target.id === "registerForm") {
                e.preventDefault();
                this.handleRegister();
            }
        });

        document.addEventListener("click", (e) => {
            if (e.target.id === "logoutBtn" || e.target.closest("#logoutBtn")) {
                this.handleLogout();
            }
        });
    },

    async handleRegister() {
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;

        if (!name || !email || !password) {
            Utils.showToast(__("toast.fillAll"), "error");
            return;
        }
        if (password.length < 4) {
            Utils.showToast(__("toast.passShort"), "error");
            return;
        }

        try {
            await Storage.register(name, email, password);
            Utils.showToast(__("toast.welcomeAccount"), "success");
            App.showApp();
        } catch (err) {
            Utils.showToast(err.message, "error");
        }
    },

    async handleLogin() {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        if (!email || !password) {
            Utils.showToast(__("toast.fillAll"), "error");
            return;
        }

        try {
            await Storage.login(email, password);
            Utils.showToast(__("toast.welcomeBack"), "success");
            App.showApp();
        } catch (err) {
            Utils.showToast(err.message, "error");
        }
    },

    handleLogout() {
        Storage.clearUser();
        Utils.showToast(__("toast.loggedOut"), "info");
        App.showAuth();
    },

    isLoggedIn() {
        return Storage.isLoggedIn();
    },

    getCurrentUser() {
        return Storage.getUser();
    }
};
