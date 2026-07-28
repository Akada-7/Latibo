const Voice = {
    recognition: null,
    isListening: false,
    textarea: null,
    lang: "tr-TR",
    restartTimeout: null,

    init() {
        this.textarea = document.getElementById("ruya");
        this.lang = localStorage.getItem("dreamapp_voice_lang") || "tr-TR";
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            this.disableButton();
            return;
        }
        this.bindEvents();
    },

    setupRecognition() {
        if (this.recognition) {
            try { this.recognition.abort(); } catch (e) {}
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.lang;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            if (transcript) {
                this.textarea.value += transcript + " ";
                this.textarea.dispatchEvent(new Event("input"));
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === "not-allowed") {
                Utils.showToast(__("voice.denied"), "error");
                this.stop();
            } else if (event.error === "no-speech") {
                this.stop();
                this.restart();
            } else {
                this.stop();
            }
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                this.restart();
            }
        };
    },

    restart() {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
            if (this.isListening) {
                this.start();
            }
        }, 300);
    },

    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem("dreamapp_voice_lang", lang);
        this.stop();
        this.updateLangButton();
        const msgKey = lang === "tr-TR" ? "voice.switchTR" : "voice.switchEN";
        Utils.showToast(__(msgKey), "info");
    },

    toggleLanguage() {
        this.setLanguage(this.lang === "tr-TR" ? "en-US" : "tr-TR");
    },

    updateLangButton() {
        const btn = document.getElementById("voiceLangBtn");
        if (btn) {
            btn.textContent = this.lang === "tr-TR" ? "🇹🇷 TR" : "🇬🇧 EN";
        }
    },

    bindEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "voiceBtn" || e.target.closest("#voiceBtn")) {
                this.toggle();
            }
            if (e.target.id === "voiceLangBtn" || e.target.closest("#voiceLangBtn")) {
                this.toggleLanguage();
            }
        });
    },

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.setupRecognition();
            this.start();
        }
    },

    start() {
        if (!this.recognition) return;
        try {
            this.recognition.start();
            this.isListening = true;
            this.updateUI(true);
            Utils.showToast(__("voice.start"), "info");
        } catch (e) {
            console.error("Voice start error:", e);
            this.isListening = false;
        }
    },

    stop() {
        clearTimeout(this.restartTimeout);
        this.isListening = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) {}
            try { this.recognition.abort(); } catch (e) {}
        }
        this.updateUI(false);
        const preview = document.getElementById("voicePreview");
        if (preview) preview.textContent = "";
    },

    updateUI(listening) {
        const btn = document.getElementById("voiceBtn");
        const indicator = document.getElementById("voiceIndicator");
        if (btn) {
            btn.classList.toggle("listening", listening);
            btn.innerHTML = listening
                ? "⏹️ " + (this.lang === "tr-TR" ? "Durdur" : "Stop")
                : "🎙️ " + (this.lang === "tr-TR" ? "Sesli Giriş" : "Voice Input");
        }
        if (indicator) {
            indicator.style.display = listening ? "flex" : "none";
        }
    },

    disableButton() {
        const btn = document.getElementById("voiceBtn");
        if (btn) {
            btn.disabled = true;
            btn.title = __("voice.notSupported");
            btn.style.opacity = "0.4";
        }
    }
};
