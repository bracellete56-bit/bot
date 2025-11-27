const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CANAL_DESTINO = process.env.CANAL_DESTINO;

// --- Database ---
let db = { users: [] };
if (fs.existsSync("db.json")) db = JSON.parse(fs.readFileSync("db.json"));

function saveDB() {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

// --- Commands & Active Users ---
let commands = [];
let activeUsers = {}; // [username] = timestamp of last activity

// --- Discord Client ---
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

// --- Message Commands ---
client.on("messageCreate", async (msg) => {
    if (!msg.content.startsWith(".")) return;

    const args = msg.content.split(" ");
    const cmd = args[0].substring(1);
    const targetUser = args[1]?.toLowerCase();

    const delAfter10 = async (...messages) => {
        setTimeout(() => {
            messages.forEach(m => m?.delete?.().catch(() => {}));
        }, 10000);
    };

    if (cmd === "cmds") {
        const cmdsList = [
            ".kill",
            ".message <user> <content>",
            ".speed <v>",
            ".teleport <user>",
            ".bring <user1> <user2>",
            ".freeze",
            ".unfreeze",
            ".rejoin",
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

    if (!targetUser && !["cmds", "removeuser"].includes(cmd)) {
        const m = await msg.reply("Use: .<cmd> <user> <arg>");
        return delAfter10(msg, m);
    }

    const content = args.slice(2).join(" ");

    if (!["cmds", "removeuser"].includes(cmd)) {
        const c = { user: targetUser, command: cmd, arg1: args[2], arg2: args[3], content };
        commands.push(c);
        activeUsers[targetUser] = Date.now();
        const m = await msg.reply(`**${cmd}** enviado para **${targetUser}**.`);
        return delAfter10(msg, m);
    }

    if (cmd === "removeuser") {
        const userIdToRemove = args[1];
        if (!userIdToRemove) {
            const m = await msg.reply("Use: `.removeuser <userId>`");
            return delAfter10(msg, m);
        }
        const index = db.users.indexOf(Number(userIdToRemove));
        if (index === -1) {
            const m = await msg.reply(`Usuário ${userIdToRemove} não está na database.`);
            return delAfter10(msg, m);
        }
        db.users.splice(index, 1);
        saveDB();
        const m = await msg.reply(`Usuário ${userIdToRemove} removido da database com sucesso!`);
        return delAfter10(msg, m);
    }
});

// --- Endpoint /exit ---
app.post("/exit", (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send("Faltando username");

    delete activeUsers[username.toLowerCase()];
    console.log(`Usuário ${username} saiu do script.`);
    res.send("OK");
});

// --- Endpoint /nextCommand ---
app.post("/nextCommand", (req, res) => {
    const username = req.body.username?.toLowerCase();
    if (!username) return res.json({ command: null });

    const found = commands.find(c => c.user === username);
    if (found) {
        commands = commands.filter(c => c !== found);
        activeUsers[username] = Date.now();
        return res.json(found);
    }

    return res.json({ command: null });
});

// --- Endpoint /log ---
app.post("/log", async (req, res) => {
    const { userId, username, executor, device, date, time, placeId, serverJobId } = req.body;
    if (!userId || !username) return res.status(400).send("Requisição inválida.");

    if (!db.users.includes(userId)) {
        db.users.push(userId);
        saveDB();
        const channel = await client.channels.fetch(CANAL_DESTINO);
        const embed = new EmbedBuilder()
            .setColor("#000000")
            .setTitle("EXECUÇÃO")
            .setThumbnail("https://i.pinimg.com/1200x/4f/d2/ed/4fd2ed732361669608231f27822661dd.jpg")
            .addFields(
                { name: "Usuário", value: `[${username}](https://www.roblox.com/users/${userId}/profile)`, inline: true },
                { name: "Executor", value: executor, inline: true },
                { name: "Dispositivo", value: device, inline: true },
                { name: "Data", value: date, inline: true },
                { name: "Hora", value: time, inline: true },
                { name: "Servidor", value: `[Clique aqui](https://www.roblox.com/games/start?placeId=${placeId}&jobId=${serverJobId})`, inline: false }
            )
            .setFooter({ text: "Feito por fp3" })
            .setTimestamp();
        channel.send({ embeds: [embed] });
    }

    res.send("OK");
});

// --- Start server ---
app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor rodando na porta " + (process.env.PORT || 3000));
});

client.login(BOT_TOKEN);
