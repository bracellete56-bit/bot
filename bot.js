const express = require("express");
const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent   // NECESSÁRIO PARA LER COMANDOS
    ]
});

const app = express();
app.use(express.json());

// ====== CONFIG ======
const BOT_TOKEN = process.env.BOT_TOKEN;        // seguro
const CANAL_DESTINO = process.env.CANAL_DESTINO;

// ====== DATABASE ======
let db = { users: [] };

function saveDB() {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

if (fs.existsSync("db.json")) {
    db = JSON.parse(fs.readFileSync("db.json"));
}

// ====== DISCORD BOT ======
client.once("ready", () => {
    console.log("Bot iniciado!");
});

// ====== COMANDO !deluser ======
client.on("messageCreate", async (msg) => {
    if (!msg.content.startsWith("!deluser")) return;

    const args = msg.content.split(" ");
    const id = args[1];

    if (!id) return msg.reply("Use: `!deluser <UserId>`");

    const index = db.users.indexOf(id);
    if (index === -1) return msg.reply("Esse ID não está na database.");

    db.users.splice(index, 1);
    saveDB();

    msg.reply(`ID **${id}** removido da database.`);
});

// ====== ENDPOINT RECEBENDO DO ROBLOX ======
app.post("/log", async (req, res) => {
    const { 
        userId, 
        username, 
        executor,
        device,
        date,
        time,
        placeId,
        placeName,
        serverJobId
    } = req.body;

    if (!userId || !username) {
        return res.status(400).send("Requisição inválida.");
    }

    if (!db.users.includes(userId)) {
        db.users.push(userId);
        saveDB();

        const channel = await client.channels.fetch(CANAL_DESTINO);

        const msg =
`USUÁRIO:
**Usuário:** [${username}](https://www.roblox.com/users/${userId}/profile)
**Executor:** ${executor}
**Dispositivo:** ${device}
**Data:** ${date}
**Hora:** ${time}
**Jogo:** [${placeName}](https://www.roblox.com/games/${placeId})
**Entrar no servidor:** https://www.roblox.com/games/start?placeId=${placeId}&jobId=${serverJobId}
`;

        channel.send(msg);
    }

    return res.send("OK");
});

// ====== INICIAR SERVIDOR ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});

client.login(BOT_TOKEN);
