const Voice = {
    recognition: null,
    isListening: false,
    textarea: null,
    lang: "tr-TR",

    init() {
        this.textarea = document.getElementById("ruya");
        this.lang = localStorage.getItem("dreamapp_voice_lang") || "tr-TR";
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            this.disableButton();
            return;
        }
        this.setupRecognition();
        this.bindEvents();
    },

    setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.lang;

        this.recognition.onresult = (event) => {
            let finalTranscript = "";
            let interimTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + " ";
                } else {
                    interimTranscript = transcript;
                }
            }

            if (finalTranscript) {
                const current = this.textarea.value;
                this.textarea.value = current + finalTranscript;
            }

            const preview = document.getElementById("voicePreview");
            if (preview) {
                const listeningText = this.lang === "tr-TR" ? "Dinleniyor..." : "Listening...";
                preview.textContent = interimTranscript || (finalTranscript ? listeningText : "");
            }
        };

        this.recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            if (event.error === "not-allowed") {
                const msg = this.lang === "tr-TR"
                    ? "Mikrofon erişimi reddedildi. Lütfen mikrofona izin verin."
                    : "Microphone access denied. Please allow microphone.";
                Utils.showToast(msg, "error");
            } else if (event.error === "language-not-supported") {
                const msg = this.lang === "tr-TR"
                    ? "Türkçe ses tanıma bu tarayıcıda desteklenmiyor. İngilizce'ye geçiliyor."
                    : "This language is not supported. Switching to English.";
                Utils.showToast(msg, "error");
                this.setLanguage("en-US");
                return;
            }
            this.stop();
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                this.recognition.start();
            }
        };
    },

    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem("dreamapp_voice_lang", lang);
        this.stop();
        this.setupRecognition();
        this.start();
    },

    toggleLanguage() {
        const newLang = this.lang === "tr-TR" ? "en-US" : "tr-TR";
        this.setLanguage(newLang);
        const msg = newLang === "tr-TR" ? "Türkçe ses tanıma aktif" : "English voice recognition active";
        Utils.showToast(msg, "info");
        this.updateLangButton();
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
            this.start();
        }
    },

    start() {
        if (!this.recognition) return;
        try {
            this.recognition.start();
            this.isListening = true;
            this.updateUI(true);
            const msg = this.lang === "tr-TR"
                ? "Ses kaydı başladı. Konuşun!"
                : "Voice recording started. Speak now!";
            Utils.showToast(msg, "info");
        } catch (e) {
            console.error("Failed to start recognition:", e);
        }
    },

    stop() {
        if (!this.recognition) return;
        this.isListening = false;
        this.recognition.stop();
        this.updateUI(false);

        const preview = document.getElementById("voicePreview");
        if (preview) preview.textContent = "";
    },

    updateUI(listening) {
        const btn = document.getElementById("voiceBtn");
        const indicator = document.getElementById("voiceIndicator");
        if (btn) {
            btn.classList.toggle("listening", listening);
            if (this.lang === "tr-TR") {
                btn.innerHTML = listening ? "⏹️ Kaydı Durdur" : "🎙️ Sesli Giriş";
            } else {
                btn.innerHTML = listening ? "⏹️ Stop Recording" : "🎙️ Start Voice";
            }
        }
        if (indicator) {
            indicator.style.display = listening ? "flex" : "none";
        }
    },

    disableButton() {
        const btn = document.getElementById("voiceBtn");
        if (btn) {
            btn.disabled = true;
            btn.title = "Voice input not supported in this browser";
            btn.style.opacity = "0.4";
        }
    }
};
