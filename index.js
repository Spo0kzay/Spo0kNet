require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const math = require('mathjs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const token = process.env.TOKEN;
const clientId = '1493486475201740930';

// ---------------- STORAGE ----------------
const userSettings = new Map();      // rounding
const mentionTracking = new Map();  // on/off
const mentionLogs = new Map();      // stored mentions

// ---------------- COMMANDS ----------------
const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all commands'),

  new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Advanced calculator')
    .addStringOption(option =>
      option.setName('expression')
        .setDescription('Example: sqrt(16)+2^3')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Set calculator settings')
    .addIntegerOption(option =>
      option.setName('rounding')
        .setDescription('Decimal places (1-15)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set a reminder')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('e.g. 10s, 5m, 1h')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Reminder message')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('mentiontrack')
    .setDescription('Toggle mention tracking')
    .addStringOption(option =>
      option.setName('state')
        .setDescription('on or off')
        .setRequired(true)
        .addChoices(
          { name: 'on', value: 'on' },
          { name: 'off', value: 'off' }
        )
    )
].map(cmd => cmd.toJSON());

// ---------------- REGISTER ----------------
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log('Commands registered');
  } catch (err) {
    console.error(err);
  }
})();

// ---------------- READY ----------------
client.once('clientReady', () => {
  console.log(`Spo0kNet is online as ${client.user.tag}`);
});

// ---------------- INTERACTIONS ----------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const OWNER_ID = '1492311096193847499';

if (interaction.user.id !== OWNER_ID) {
  return interaction.reply({
    content: "❌ You don’t have permission to use this bot",
    ephemeral: true
  });
}

  // ---------- HELP ----------
  if (interaction.commandName === 'help') {
    return interaction.reply({
      content:
`📘 **Spo0kNet Commands**

🧮 /calc <expression>
→ Advanced calculator
Example: \`/calc sqrt(16)+2^3\`

⚙️ /settings rounding:<number>
→ Set decimal precision

⏰ /reminder time:<10m> message:<text>
→ Get reminded later

🔔 /mentiontrack on/off
→ Track mentions while offline`
    });
  }

  // ---------- CALC ----------
  if (interaction.commandName === 'calc') {
    const expr = interaction.options.getString('expression');

    try {
      const settings = userSettings.get(interaction.user.id) || { rounding: 6 };

      const raw = math.evaluate(expr);

      if (!isFinite(raw)) {
        return interaction.reply({ content: '❌ Invalid math result' });
      }

      const result = math.format(raw, {
        precision: settings.rounding
      });

      return interaction.reply({
        content: `🧮 ${expr} = ${result}`
      });

    } catch {
      return interaction.reply({
        content:
`❌ Invalid expression

Try:
• 2+2*5
• sqrt(16)
• sin(pi/2)
• 5!`
      });
    }
  }

  // ---------- SETTINGS ----------
  if (interaction.commandName === 'settings') {
    const rounding = interaction.options.getInteger('rounding');

    if (rounding < 1 || rounding > 15) {
      return interaction.reply({
        content: '❌ Rounding must be between 1 and 15'
      });
    }

    userSettings.set(interaction.user.id, { rounding });

    return interaction.reply({
      content: `⚙️ Rounding set to ${rounding}`
    });
  }

  // ---------- REMINDER ----------
  if (interaction.commandName === 'reminder') {
    const time = interaction.options.getString('time');
    const message = interaction.options.getString('message');

    const ms =
      time.endsWith('s') ? parseInt(time) * 1000 :
      time.endsWith('m') ? parseInt(time) * 60000 :
      time.endsWith('h') ? parseInt(time) * 3600000 : null;

    if (!ms) {
      return interaction.reply({ content: '❌ Invalid time format (use s/m/h)' });
    }

    await interaction.reply({ content: `⏰ Reminder set!` });

    setTimeout(() => {
      interaction.user.send(`⏰ Reminder: ${message}`).catch(() => {});
    }, ms);
  }

  // ---------- MENTION TRACK ----------
  if (interaction.commandName === 'mentiontrack') {
    const state = interaction.options.getString('state');

    mentionTracking.set(interaction.user.id, state === 'on');

    return interaction.reply({
      content: `🔔 Mention tracking ${state}`
    });
  }
});

// ---------------- TRACK MENTIONS ----------------
client.on('messageCreate', message => {
  if (message.author.bot) return;

  message.mentions.users.forEach(user => {
    if (!mentionTracking.get(user.id)) return;

    if (user.presence?.status === 'offline') {
      if (!mentionLogs.has(user.id)) {
        mentionLogs.set(user.id, []);
      }

      mentionLogs.get(user.id).push({
        author: message.author.tag,
        content: message.content
      });
    }
  });
});

// ---------------- PRESENCE UPDATE ----------------
client.on('presenceUpdate', (oldP, newP) => {
  if (!oldP || !newP) return;

  if (oldP.status === 'offline' && newP.status !== 'offline') {
    const logs = mentionLogs.get(newP.userId);

    if (!logs || logs.length === 0) return;

    const user = client.users.cache.get(newP.userId);

    let text = '🔔 While you were offline:\n\n';

    logs.forEach(m => {
      text += `• ${m.author}: ${m.content}\n`;
    });

    user.send(text).catch(() => {});

    mentionLogs.delete(newP.userId);
  }
});

// ---------------- LOGIN ----------------
client.login(token);
