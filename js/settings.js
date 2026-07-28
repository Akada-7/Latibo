const Settings = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "saveProfileBtn") this.saveProfile();
            if (e.target.id === "changePasswordBtn") this.changePassword();
            if (e.target.id === "exportDreamBtn") this.exportDream();
        });
    },

    loadProfile() {
        const user = Storage.getUser();
        if (!user) return;
        const nameEl = document.getElementById("settingsName");
        const emailEl = document.getElementById("settingsEmail");
        if (nameEl) nameEl.value = user.name || "";
        if (emailEl) emailEl.value = user.email || "";
    },

    async saveProfile() {
        const name = document.getElementById("settingsName").value.trim();
        const email = document.getElementById("settingsEmail").value.trim();
        if (!name || !email) {
            Utils.showToast("Name and email are required.", "error");
            return;
        }

        try {
            const result = await Storage.apiCall("/profile", "PUT", { name, email });
            Storage.setToken(result.token);
            Storage.setUser(result.user);

            const nameEl = document.getElementById("userName");
            const emailEl = document.getElementById("userEmail");
            const avatarEl = document.getElementById("userAvatar");
            if (nameEl) nameEl.textContent = result.user.name;
            if (emailEl) emailEl.textContent = result.user.email;
            if (avatarEl) avatarEl.textContent = result.user.name.charAt(0).toUpperCase();

            Utils.showToast("Profile updated!", "success");
        } catch (e) {
            Utils.showToast("Failed: " + e.message, "error");
        }
    },

    async changePassword() {
        const current = document.getElementById("currentPassword").value;
        const newPass = document.getElementById("newPassword").value;
        const confirm = document.getElementById("confirmPassword").value;

        if (!current || !newPass) {
            Utils.showToast("Fill in all password fields.", "error");
            return;
        }
        if (newPass !== confirm) {
            Utils.showToast("New passwords don't match.", "error");
            return;
        }
        if (newPass.length < 4) {
            Utils.showToast("New password must be at least 4 characters.", "error");
            return;
        }

        try {
            await Storage.apiCall("/password", "PUT", { currentPassword: current, newPassword: newPass });
            Utils.showToast("Password changed!", "success");
            document.getElementById("currentPassword").value = "";
            document.getElementById("newPassword").value = "";
            document.getElementById("confirmPassword").value = "";
        } catch (e) {
            Utils.showToast("Failed: " + e.message, "error");
        }
    },

    exportDream() {
        if (!Dreams.selectedDreamId) return;
        const dreams = Storage.getDreams();
        const dream = dreams.find(d => d.id === Dreams.selectedDreamId);
        if (!dream) return;

        const emojis = (dream.feelings || []).map(f => f.split(" ")[0]).join(" ");
        const cats = Array.isArray(dream.category) ? dream.category : (dream.category ? [dream.category] : []);
        let text = `Dream Journal\n`;
        text += `${"=".repeat(40)}\n\n`;
        text += `Title: ${dream.title}\n`;
        text += `Date: ${dream.date}\n`;
        text += `Categories: ${cats.join(", ") || "None"}\n`;
        text += `Feelings: ${emojis}\n`;
        text += `Stars: ${dream.likes || 0}\n\n`;
        text += `${"-".repeat(40)}\n\n`;
        text += `${dream.text}\n\n`;

        if (dream.aiAnalysis && typeof dream.aiAnalysis === "object") {
            text += `${"-".repeat(40)}\n`;
            text += `AI ANALYSIS\n`;
            text += `${"-".repeat(40)}\n\n`;
            if (dream.aiAnalysis.mood) text += `Mood: ${dream.aiAnalysis.mood}\n\n`;
            if (dream.aiAnalysis.symbols) text += `Symbols:\n${dream.aiAnalysis.symbols}\n\n`;
            if (dream.aiAnalysis.patterns) text += `Patterns: ${dream.aiAnalysis.patterns}\n\n`;
            if (dream.aiAnalysis.suggestions) text += `Suggestions: ${dream.aiAnalysis.suggestions}\n\n`;
            if (dream.aiAnalysis.deepAnalysis) text += `Deep Analysis:\n${dream.aiAnalysis.deepAnalysis}\n`;
        }

        const blob = new Blob([text], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `dream-${dream.date || "export"}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
        Utils.showToast("Dream exported!", "success");
    }
};
