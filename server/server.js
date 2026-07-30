const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "..")));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Cok fazla istek gonderdiniz. Biraz bekleyin." }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Cok fazla deneme. 15 dakika bekleyin." }
});

app.use("/api/", apiLimiter);
app.use("/api/register", authLimiter);
app.use("/api/login", authLimiter);

let db, usersCol, dreamsCol, sharedCol;

async function connectDB() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const client = new MongoClient(MONGO_URI, {
        ssl: true,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        servername: "ac-lor5htd-shard-00-00.8lncda8.mongodb.net",
        retryWrites: true,
        w: "majority"
    });
    await client.connect();
    db = client.db("dreamapp");
    usersCol = db.collection("users");
    dreamsCol = db.collection("dreams");
    sharedCol = db.collection("sharedDreams");
    await usersCol.createIndex({ email: 1 }, { unique: true });
    await sharedCol.createIndex({ createdAt: -1 });
    console.log("MongoDB baglandi.");
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Giris yapmaniz gerekiyor." });
    }
    try {
        const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: "Token gecersiz." });
    }
}

app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Tum alanlar zorunlu." });
    }
    const exists = await usersCol.findOne({ email });
    if (exists) {
        return res.status(409).json({ error: "Bu e-posta zaten kayitli." });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await usersCol.insertOne({ name, email, password: hash, createdAt: new Date(), role: "user" });
    const id = result.insertedId.toString();
    const token = jwt.sign({ id, name, email, role: "user" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id, name, email, role: "user" } });
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Tum alanlar zorunlu." });
    }
    const user = await usersCol.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "E-posta veya sifre hatali." });
    }
    const id = user._id.toString();
    const role = user.role || "user";
    const token = jwt.sign({ id, name: user.name, email, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id, name: user.name, email, role } });
});

app.put("/api/profile", authMiddleware, async (req, res) => {
    const { name, email } = req.body;
    const userId = req.user.id;

    if (email && email !== req.user.email) {
        const exists = await usersCol.findOne({ email });
        if (exists) return res.status(409).json({ error: "Bu e-posta zaten kullaniliyor." });
    }

    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;

    if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: "Guncellenecek alan yok." });
    }

    await usersCol.updateOne({ _id: new ObjectId(userId) }, { $set: update });

    const newToken = jwt.sign(
        { id: userId, name: name || req.user.name, email: email || req.user.email, role: req.user.role || "user" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({ token: newToken, user: { id: userId, name: name || req.user.name, email: email || req.user.email, role: req.user.role || "user" } });
});

app.put("/api/password", authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Mevcut ve yeni sifre gerekli." });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ error: "Yeni sifre en az 4 karakter olmali." });
    }

    const user = await usersCol.findOne({ _id: new ObjectId(req.user.id) });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Mevcut sifre hatali." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await usersCol.updateOne({ _id: new ObjectId(req.user.id) }, { $set: { password: hash } });
    res.json({ success: true });
});

app.get("/api/dreams", authMiddleware, async (req, res) => {
    const dreams = await dreamsCol.find({ userId: req.user.id }).sort({ createdAt: -1 }).toArray();
    res.json(dreams);
});

app.post("/api/dreams", authMiddleware, async (req, res) => {
    const dream = { ...req.body, userId: req.user.id, nsfw: req.body.nsfw || false, createdAt: new Date() };
    const result = await dreamsCol.insertOne(dream);
    res.status(201).json({ ...dream, _id: result.insertedId });
});

app.put("/api/dreams/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const allowed = {};
    const fields = ["text", "title", "feelings", "category", "tags", "likes", "aiAnalysis", "nsfw"];
    fields.forEach(f => { if (req.body[f] !== undefined) allowed[f] = req.body[f]; });
    await dreamsCol.updateOne({ _id: new ObjectId(id), userId: req.user.id }, { $set: allowed });
    res.json({ success: true });
});

app.delete("/api/dreams/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    await dreamsCol.deleteOne({ _id: new ObjectId(id), userId: req.user.id });
    await sharedCol.deleteOne({ dreamId: id, userId: req.user.id });
    res.json({ success: true });
});

app.post("/api/chat", authMiddleware, async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: "Metin gerekli." });
    }
    if (!DEEPSEEK_KEY) {
        return res.status(500).json({ error: "DeepSeek API key tanimli degil." });
    }

    const isTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(text);

    const systemPrompt = isTurkish
        ? `Sen deneyimli bir rüya yorumcususun. Rüyayı analiz et ve şu JSON formatında yanıt ver:
{"mood":"ruh hali","symbols":"sembol: anlamları, her sembolü yeni satıra yaz, format: sembol - anlama","patterns":"tekrar eden temalar","suggestions":"öneriler","deepAnalysis":"derin analiz"}
Her alanı 5-7 cümle ile detaylı yaz. symbols kısmında her sembolü "sembol - anlama" formatında alt alta yaz. Kullanıcıya ilham veren, merak uyandıran, etkileyici ve sıcak bir dil kullan. Kelimeler seçerken insanın içine işleyen, unutulmayan ifadeler tercih et. SADECE geçerli JSON döndür.`
        : `You are an experienced and eloquent dream interpreter. Analyze the dream and respond in this exact JSON format:
{"mood":"overall mood","symbols":"symbol: meaning, write each symbol on a new line, format: symbol - meaning","patterns":"recurring themes","suggestions":"suggestions","deepAnalysis":"deep analysis"}
Write each field in 5-7 detailed sentences. For symbols, write each symbol on a new line in "symbol - meaning" format. Use captivating, poetic and emotionally rich language that resonates with the reader. Choose words that inspire wonder and introspection. Respond ONLY with valid JSON.`;

    try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "DeepSeek API hatasi");
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/insights", authMiddleware, async (req, res) => {
    if (!DEEPSEEK_KEY) {
        return res.status(500).json({ error: "DeepSeek API key tanimli degil." });
    }

    try {
        const dreams = await dreamsCol.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).toArray();
        if (dreams.length === 0) {
            return res.json({ insights: [] });
        }

        const dreamsText = dreams.map((d, i) =>
            `Rüya ${i+1} (${d.date || d.createdAt?.toISOString().split("T")[0] || "bilinmeyen tarih"}, Kategori: ${d.category || "belirtilmemiş"}, Duygu: ${(d.feelings||[]).join(", ") || "belirtilmemiş"}): ${d.text || ""}`
        ).join("\n\n");

        const isTurkish = dreams.some(d => /[çğıöşüÇĞİÖŞÜ]/.test(d.text || ""));

        const systemPrompt = isTurkish
            ? `Rüya analisti olarak, kullanıcının son rüyalarını analiz et. 4-6 adet kısa, çarpıcı içgörü üret. Her içgörü, kullanıcının rüya desenleri, sık görülen temalar, son trendler, duygu durumu veya ilginç kalıplar hakkında olsun. Doğal, samimi ve akıcı Türkçe yaz. Her içgörü için uygun bir emoji seç.

SADECE şu JSON formatında yanıt ver (başka hiçbir şey yazma):
{"insights":[{"icon":"📊","text":"içgörü metni"},{"icon":"🌊","text":"içgörü metni"}]}

Her içgörü metni 1 cümle, en fazla 80 karakter olsun. Çeşitli konulardan içgörü üret: kategori dağılımı, sık kelimeler, duygu durumu, son haftadaki değişimler, ilginç kalıplar gibi.`
            : `As a dream analyst, analyze the user's recent dreams. Generate 4-6 short, striking insights about their dream patterns, common themes, recent trends, emotional state, or interesting patterns. Write in natural, warm English. Choose an appropriate emoji for each insight.

Respond ONLY with this JSON format (no other text):
{"insights":[{"icon":"📊","text":"insight text"},{"icon":"🌊","text":"insight text"}]}

Each insight text should be 1 sentence, max 80 characters. Cover diverse topics: category distribution, frequent words, emotional state, recent week changes, interesting patterns.`;

        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: dreamsText }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "DeepSeek API hatasi");
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/dreams/:id/shared", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const shared = await sharedCol.findOne({ dreamId: id, userId: req.user.id });
    res.json({ shared: !!shared, sharedId: shared ? shared._id.toString() : null });
});

app.post("/api/dreams/share", authMiddleware, async (req, res) => {
    const { dreamId, text, title, feelings, category } = req.body;
    if (!dreamId || !text) {
        return res.status(400).json({ error: "Dream bilgisi gerekli." });
    }
    const existing = await sharedCol.findOne({ dreamId, userId: req.user.id });
    if (existing) {
        return res.status(409).json({ error: "Bu rüya zaten paylaşılmış." });
    }
    const shared = {
        dreamId,
        userId: req.user.id,
        authorName: req.user.name,
        title: title || "",
        text,
        feelings: feelings || [],
        category: category || [],
        nsfw: false,
        likes: 0,
        likedBy: [],
        comments: [],
        reports: [],
        createdAt: new Date()
    };
    const result = await sharedCol.insertOne(shared);
    res.status(201).json({ ...shared, _id: result.insertedId });
});

app.delete("/api/dreams/share/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    await sharedCol.deleteOne({ _id: new ObjectId(id), userId: req.user.id });
    res.json({ success: true });
});

app.get("/api/discover", async (req, res) => {
    const { q, category } = req.query;
    const filter = {};

    const token = req.headers.authorization;
    if (token && token.startsWith("Bearer ")) {
        try {
            const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
            filter.userId = { $ne: decoded.id };
            filter.hiddenBy = { $nin: [decoded.id] };
        } catch (e) {}
    }

    if (q) filter.text = { $regex: q, $options: "i" };
    if (category) filter.category = { $in: Array.isArray(category) ? category : [category] };
    const dreams = await sharedCol.find(filter).sort({ createdAt: -1 }).limit(50).toArray();
    res.json(dreams);
});

app.post("/api/discover/:id/like", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const shared = await sharedCol.findOne({ _id: new ObjectId(id) });
    if (!shared) return res.status(404).json({ error: "Dream not found." });

    if (shared.likedBy && shared.likedBy.includes(userId)) {
        await sharedCol.updateOne({ _id: new ObjectId(id) }, { $pull: { likedBy: userId }, $inc: { likes: -1 } });
        await dreamsCol.updateOne({ id: parseInt(shared.dreamId), userId: shared.userId }, { $inc: { likes: -1 } });
    } else {
        await sharedCol.updateOne({ _id: new ObjectId(id) }, { $addToSet: { likedBy: userId }, $inc: { likes: 1 } });
        await dreamsCol.updateOne({ id: parseInt(shared.dreamId), userId: shared.userId }, { $inc: { likes: 1 } });
    }

    const updated = await sharedCol.findOne({ _id: new ObjectId(id) });
    res.json({ likes: updated.likes, liked: updated.likedBy.includes(userId) });
});

app.get("/api/discover/:id/liked", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const shared = await sharedCol.findOne({ _id: new ObjectId(id) });
    const liked = shared && shared.likedBy && shared.likedBy.includes(req.user.id);
    res.json({ liked: !!liked });
});

app.post("/api/discover/:id/comment", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
        return res.status(400).json({ error: "Yorum metni gerekli." });
    }
    const comment = {
        _id: new ObjectId(),
        userId: req.user.id,
        authorName: req.user.name,
        text: text.trim(),
        createdAt: new Date()
    };
    await sharedCol.updateOne({ _id: new ObjectId(id) }, { $push: { comments: comment } });
    res.status(201).json(comment);
});

app.get("/api/discover/:id/comments", async (req, res) => {
    const { id } = req.params;
    const shared = await sharedCol.findOne({ _id: new ObjectId(id) });
    res.json(shared ? shared.comments || [] : []);
});

app.post("/api/discover/:id/report", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
        return res.status(400).json({ error: "Sebep gerekli." });
    }
    const report = {
        userId: req.user.id,
        reason: reason.trim(),
        createdAt: new Date()
    };
    await sharedCol.updateOne({ _id: new ObjectId(id) }, { $push: { reports: report }, $addToSet: { hiddenBy: req.user.id } });
    res.json({ success: true, hidden: true });
});

app.post("/api/discover/:id/hide", authMiddleware, async (req, res) => {
    const { id } = req.params;
    await sharedCol.updateOne({ _id: new ObjectId(id) }, { $addToSet: { hiddenBy: req.user.id } });
    res.json({ success: true });
});

app.post("/api/discover/:id/unhide", authMiddleware, async (req, res) => {
    const { id } = req.params;
    await sharedCol.updateOne({ _id: new ObjectId(id) }, { $pull: { hiddenBy: req.user.id } });
    res.json({ success: true });
});

app.get("/api/discover/hidden", authMiddleware, async (req, res) => {
    const dreams = await sharedCol.find({ hiddenBy: req.user.id }).sort({ createdAt: -1 }).limit(50).toArray();
    res.json(dreams);
});

function adminMiddleware(req, res, next) {
    authMiddleware(req, res, () => {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Yetkisiz erisim." });
        }
        next();
    });
}

app.get("/api/admin/discover", adminMiddleware, async (req, res) => {
    const { q, category } = req.query;
    const filter = {};
    if (q) filter.text = { $regex: q, $options: "i" };
    if (category) filter.category = { $in: Array.isArray(category) ? category : [category] };
    const dreams = await sharedCol.find(filter).sort({ createdAt: -1 }).limit(100).toArray();
    res.json(dreams);
});

app.delete("/api/admin/discover/:id", adminMiddleware, async (req, res) => {
    const { id } = req.params;
    const dream = await sharedCol.findOne({ _id: new ObjectId(id) });
    if (!dream) return res.status(404).json({ error: "Rüya bulunamadi." });
    await sharedCol.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, deleted: dream.title || "Untitled" });
});

app.get("/api/admin/comments", adminMiddleware, async (req, res) => {
    const { q } = req.query;
    const match = { "comments.0": { $exists: true } };
    const dreams = await sharedCol.find(match, { projection: { _id: 1, title: 1, comments: 1 } }).sort({ createdAt: -1 }).toArray();
    const all = [];
    for (const d of dreams) {
        for (const c of (d.comments || [])) {
            if (q && !c.text.toLowerCase().includes(q.toLowerCase()) && !c.authorName.toLowerCase().includes(q.toLowerCase())) continue;
            all.push({
                dreamId: d._id,
                dreamTitle: d.title || "Untitled",
                commentId: c._id || c.createdAt?.getTime?.()?.toString(),
                authorName: c.authorName || "Anonymous",
                text: c.text,
                createdAt: c.createdAt
            });
        }
    }
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(all);
});

app.delete("/api/admin/comments/:dreamId/:commentId", adminMiddleware, async (req, res) => {
    const { dreamId, commentId } = req.params;
    const dream = await sharedCol.findOne({ _id: new ObjectId(dreamId) });
    if (!dream) return res.status(404).json({ error: "Rüya bulunamadi." });
    const comment = (dream.comments || []).find(c => (c._id && c._id.toString() === commentId) || (c.createdAt?.getTime?.()?.toString() === commentId));
    if (!comment) return res.status(404).json({ error: "Yorum bulunamadi." });
    await sharedCol.updateOne({ _id: new ObjectId(dreamId) }, { $pull: { comments: { _id: comment._id } } });
    res.json({ success: true });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Sunucu calisiyor: http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("MongoDB baglanti hatasi:", err.message);
    process.exit(1);
});
