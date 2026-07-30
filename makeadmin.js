const { MongoClient } = require("./server/node_modules/mongodb");
require("./server/node_modules/dotenv").config({ path: require("path").join(__dirname, "server", ".env") });

const uri = process.env.MONGO_URI;
if (!uri) { console.error("MONGO_URI bulunamadi."); process.exit(1); }

(async () => {
    const client = new MongoClient(uri, {
        ssl: true, tls: true, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true,
        servername: "ac-lor5htd-shard-00-00.8lncda8.mongodb.net"
    });
    await client.connect();
    const db = client.db("dreamapp");
    const users = db.collection("users");

    const me = await users.findOne({ email: "ardadgl07@gmail.com" });
    if (!me) { console.error("Kullanici bulunamadi."); process.exit(1); }

    await users.updateOne({ email: "ardadgl07@gmail.com" }, { $set: { role: "admin" } });
    console.log("Admin yapildi:", me.name);
    await client.close();
})();
