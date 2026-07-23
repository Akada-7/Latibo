const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "" || window.location.protocol === "file:")
    ? "http://localhost:3000/api"
    : `${window.location.origin}/api`;

const Storage = {
    getToken() {
        return localStorage.getItem("dreamapp_token");
    },

    setToken(token) {
        localStorage.setItem("dreamapp_token", token);
    },

    clearToken() {
        localStorage.removeItem("dreamapp_token");
    },

    getUser() {
        return JSON.parse(localStorage.getItem("dreamapp_current_user"));
    },

    setUser(user) {
        localStorage.setItem("dreamapp_current_user", JSON.stringify(user));
    },

    clearUser() {
        localStorage.removeItem("dreamapp_current_user");
        localStorage.removeItem("dreamapp_token");
    },

    async apiCall(endpoint, method = "GET", body = null) {
        const headers = { "Content-Type": "application/json" };
        const token = this.getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        let res;
        try {
            res = await fetch(`${API_URL}${endpoint}`, config);
        } catch (fetchErr) {
            throw new Error("Backend sunucusu calismiyor. Lutfen sunucuyu baslatin.");
        }

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error("Sunucu yaniti gecersiz. Yanit: " + text.substring(0, 100));
        }

        if (!res.ok) {
            throw new Error(data.error || "API request failed.");
        }

        return data;
    },

    async register(name, email, password) {
        const data = await this.apiCall("/register", "POST", { name, email, password });
        this.setToken(data.token);
        this.setUser(data.user);
        return { success: true };
    },

    async login(email, password) {
        const data = await this.apiCall("/login", "POST", { email, password });
        this.setToken(data.token);
        this.setUser(data.user);
        await this.syncDreamsFromServer();
        return { success: true };
    },

    logout() {
        this.clearUser();
    },

    isLoggedIn() {
        return !!this.getToken() && !!this.getUser();
    },

    getDreams() {
        const user = this.getUser();
        if (!user) return [];
        return JSON.parse(localStorage.getItem(`dreamapp_dreams_${user.email}`)) || [];
    },

    saveDreams(dreams) {
        const user = this.getUser();
        if (!user) return;
        localStorage.setItem(`dreamapp_dreams_${user.email}`, JSON.stringify(dreams));
    },

    async syncDreamsFromServer() {
        try {
            const dreams = await this.apiCall("/dreams", "GET");
            const user = this.getUser();
            if (user) {
                localStorage.setItem(`dreamapp_dreams_${user.email}`, JSON.stringify(dreams));
            }
        } catch (e) {
            console.error("Dreams sync error:", e.message);
        }
    },

    async addDream(dream) {
        dream.id = Date.now();
        dream.date = new Date().toLocaleDateString();
        dream.likes = 0;
        dream.aiAnalysis = "";

        const dreams = this.getDreams();
        dreams.push(dream);
        this.saveDreams(dreams);

        try {
            const result = await this.apiCall("/dreams", "POST", dream);
            if (result._id) dream._id = result._id;
        } catch (e) {
            console.error("Dream save to server error:", e.message);
        }

        return dream;
    },

    async updateDream(id, updates) {
        const dreams = this.getDreams();
        const index = dreams.findIndex(d => d.id === id);
        if (index === -1) return false;
        dreams[index] = { ...dreams[index], ...updates };
        this.saveDreams(dreams);

        if (dreams[index]._id) {
            try {
                await this.apiCall(`/dreams/${dreams[index]._id}`, "PUT", updates);
            } catch (e) {
                console.error("Dream update server error:", e.message);
            }
        }

        return dreams[index];
    },

    async deleteDream(id) {
        const dreams = this.getDreams();
        const dream = dreams.find(d => d.id === id);
        const filtered = dreams.filter(d => d.id !== id);
        this.saveDreams(filtered);

        if (dream && dream._id) {
            try {
                await this.apiCall(`/dreams/${dream._id}`, "DELETE");
            } catch (e) {
                console.error("Dream delete server error:", e.message);
            }
        }
    },

    async likeDream(id) {
        const dreams = this.getDreams();
        const dream = dreams.find(d => d.id === id);
        if (dream) {
            dream.likes = (dream.likes || 0) + 1;
            this.saveDreams(dreams);

            if (dream._id) {
                try {
                    await this.apiCall(`/dreams/${dream._id}`, "PUT", { likes: dream.likes });
                } catch (e) {
                    console.error("Dream like server error:", e.message);
                }
            }
        }
    },

    getTheme() {
        return localStorage.getItem("dreamapp_theme") || "dark";
    },

    setTheme(theme) {
        localStorage.setItem("dreamapp_theme", theme);
    }
};
