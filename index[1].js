
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const express = require('express');
const app = express();
const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

let userXP = {};
let levels = {};
let tickets = {};
let currentQuestion = null;
let currentAnswer = null;
let currentTimeout = null;

const questions = [
  { question: "Qual è la capitale d’Italia?", answer: "Roma" },
  { question: "2 + 2 = ?", answer: "4" },
  { question: "Colore del cielo sereno?", answer: "blu" },
  { question: "Chi ha scritto 'Divina Commedia'?", answer: "Dante" },
  { question: "Anno della scoperta dell'America?", answer: "1492" },
];

function getLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

function sendMinigioco(channel) {
  if (currentTimeout) clearTimeout(currentTimeout);
  const random = questions[Math.floor(Math.random() * questions.length)];
  currentQuestion = random.question;
  currentAnswer = random.answer.toLowerCase();
  channel.send(`@everyone 🎮 **Minigioco!** Rispondi a: **${random.question}** (hai 3 minuti!)`);
  currentTimeout = setTimeout(() => {
    channel.send("⏰ Tempo scaduto! Nessuno ha risposto correttamente.");
    currentQuestion = null;
    currentAnswer = null;
  }, 3 * 60 * 1000);
}

client.on('ready', () => {
  console.log(`✅ Dolly è online come ${client.user.tag}`);
  setInterval(() => {
    const channel = client.channels.cache.find(c => c.name === "minigiochi");
    if (channel) sendMinigioco(channel);
  }, 15 * 60 * 1000);
});

client.on('guildMemberAdd', member => {
  const welcome = `👋 Benvenuto ${member.user.username} su ${member.guild.name}!
Usa !help per scoprire i comandi.`;
  const channel = member.guild.systemChannel;
  if (channel) channel.send(welcome);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (currentQuestion && content === currentAnswer) {
    clearTimeout(currentTimeout);
    currentQuestion = null;
    currentAnswer = null;
    const userId = message.author.id;
    userXP[userId] = (userXP[userId] || 0) + 50;
    const newLevel = getLevel(userXP[userId]);
    if (newLevel > (levels[userId] || 0)) {
      levels[userId] = newLevel;
      message.channel.send(`🎉 ${message.author.username} è salito al livello ${newLevel}!`);
    } else {
      message.channel.send(`✅ Corretto, ${message.author.username}! Hai guadagnato 50 XP.`);
    }
    return;
  }

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  if (!cmd) return;

  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setTitle("📜 Comandi di Dolly")
      .addFields(
        { name: "👤 Comandi Utente", value: "!minigiochi, !livello, !ship @utente1 @utente2" },
        { name: "🔧 Comandi Admin", value: "!pulisci, !ban @user, !kick @user, !clear N" }
      )
      .setColor("Green");
    message.channel.send({ embeds: [embed] });
  }

  if (cmd === 'minigiochi') {
    sendMinigioco(message.channel);
  }

  if (cmd === 'livello') {
    const xp = userXP[message.author.id] || 0;
    const lvl = levels[message.author.id] || 0;
    message.reply(`Hai ${xp} XP e sei al livello ${lvl}.`);
  }

  if (cmd === 'ship') {
    const [user1, user2] = args;
    if (!user1 || !user2) return message.reply("Devi menzionare due utenti.");
    const love = Math.floor(Math.random() * 100);
    message.channel.send(`💞 Ship tra ${user1} e ${user2}: ${love}% di compatibilità!`);
  }

  if (cmd === 'pulisci') {
    const fetched = await message.channel.messages.fetch({ limit: 100 });
    await message.channel.bulkDelete(fetched);
    message.channel.send("🧹 Pulizia completata!").then(m => setTimeout(() => m.delete(), 3000));
  }

  if (cmd === 'ban') {
    const member = message.mentions.members.first();
    if (!member) return message.reply("Menziona un utente da bannare.");
    await member.ban();
    message.channel.send(`${member.user.username} è stato bannato.`);
  }

  if (cmd === 'kick') {
    const member = message.mentions.members.first();
    if (!member) return message.reply("Menziona un utente da kickare.");
    await member.kick();
    message.channel.send(`${member.user.username} è stato espulso.`);
  }

  if (cmd === 'clear') {
    const amount = parseInt(args[0]);
    if (isNaN(amount)) return message.reply("Specifica un numero di messaggi da eliminare.");
    await message.channel.bulkDelete(amount);
    message.channel.send(`🧹 Eliminati ${amount} messaggi.`).then(m => setTimeout(() => m.delete(), 3000));
  }

  if (cmd === 'a') {
    message.channel.send("🤖 Dolly, bot multifunzione per il server 'doll marine'. Crea minigiochi, livelli, ticket e altro!");
  }
});

// Express per uptime
app.get("/", (req, res) => res.send("Dolly è attiva!"));
app.listen(3000, () => console.log("🌐 Web server attivo per uptime."));

client.login(TOKEN);
