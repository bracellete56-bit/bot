const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

// ====== CONFIG ======
const BOT_TOKEN = process.env.BOT_TOKEN;   // ← SEGURO
const CANAL_DESTINO = process.env.CANAL_DESTINO; // ← SEGURO

// ====== DATABASE ======
let db = { users: [] };

function saveDB() {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

if (fs.existsSync("db.json")) {
    db = JSON.parse(fs.readFileSync("db.json"));
}

// ====== DISCORD BOT ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

client.once("ready", () => {
    console.log("Bot iniciado!");
});

// ====== ENDPOINT RECEBENDO DO ROBLOX ======
app.post("/log", async (req, res) => {
    const { userId, username } = req.body;

    if (!userId || !username) {
        return res.status(400).send("Requisição inválida.");
    }

    if (!db.users.includes(userId)) {
        db.users.push(userId);
        saveDB();

        const channel = await client.channels.fetch(CANAL_DESTINO);
        channel.send(`[${username}](https://www.roblox.com/users/${userId}/profile)`);
    }

    return res.send("OK");
});

// ====== INICIA SERVIDOR ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});

client.login(BOT_TOKEN);
