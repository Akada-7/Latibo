const { MongoClient } = require("mongodb");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

async function reset() {
    console.log("URI mevcut mu:", !!process.env.MONGO_URI);
    const client = new MongoClient(process.env.MONGO_URI, {
        ssl: true,
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        servername: "ac-lor5htd-shard-00-00.8lncda8.mongodb.net"
    });
    await client.connect();
    const db = client.db("dreamapp");

    await db.collection("users").deleteMany({});
    console.log("users temizlendi");

    await db.collection("dreams").deleteMany({});
    console.log("dreams temizlendi");

    await db.collection("sharedDreams").deleteMany({});
    console.log("sharedDreams temizlendi");

    console.log("Tum veriler silindi!");
    await client.close();
}

reset().catch(err => { console.error("Hata:", err.message); process.exit(1); });
