const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

// ====== CONFIG ======
const BOT_TOKEN = process.env.BOT_TOKEN;
const CANAL_DESTINO = process.env.CANAL_DESTINO;

// ====== DATABASE ======
let db = { users: [] };

function saveDB() {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

if (fs.existsSync("db.json")) {
    db = JSON.parse(fs.readFileSync("db.json"));
}

// ====== COMANDOS EM FILA ======
let commands = [];

// ====== DISCORD BOT ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log("Bot iniciado!");
});

// ====== COMANDOS DIGITADOS NO DISCORD ======
client.on("messageCreate", async (msg) => {
    if (!msg.content.startsWith(".")) return;

    const args = msg.content.split(" ");
    const cmd = args[0].substring(1); // remove "."
    const targetUser = args[1]?.toLowerCase();

    if (!targetUser) return msg.reply("Use: .comando username argumentos");

    const c = {
        user: targetUser,     // username do roblox
        command: cmd,
        arg1: args[2],
        arg2: args[3]
    };

    commands.push(c);

    msg.reply(`Comando **${cmd}** enviado para **${targetUser}**.`);
});

// ====== ENDPOINT PARA O SCRIPT PEGAR COMANDO ======
app.post("/nextCommand", (req, res) => {
    const username = req.body.username?.toLowerCase();
    if (!username) return res.json({ command: null });

    const found = commands.find(c => c.user === username);

    if (found) {
        commands = commands.filter(c => c !== found);
        return res.json(found);
    }

    return res.json({ command: null });
});

// ====== ENDPOINT PARA LOG DO ROBLOX ======
app.post("/log", async (req, res) => {

    const {
        userId, username, executor, device,
        date, time, placeId, serverJobId
    } = req.body;

    if (!userId || !username)
        return res.status(400).send("Requisição inválida.");

    if (!db.users.includes(userId)) {
        db.users.push(userId);
        saveDB();

        const channel = await client.channels.fetch(CANAL_DESTINO);

        const msg =
`📌 **USUÁRIO NOVO**
**Usuário:** [${username}](https://www.roblox.com/users/${userId}/profile)
**Executor:** ${executor}
**Dispositivo:** ${device}
**Data:** ${date}
**Hora:** ${time}
**Entrar no servidor:** https://www.roblox.com/games/start?placeId=${placeId}&jobId=${serverJobId}
`;

        channel.send(msg);
    }

    res.send("OK");
});

// ====== START ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});

client.login(BOT_TOKEN);
