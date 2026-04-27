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

// ✅ USERS
const MAIN_USER = '1492311096193847499';
const ALLOWED_USERS = [
  MAIN_USER,
  '1460205888575897795'
];

// ---------------- STORAGE ----------------
const userSettings = new Map();

let afkEnabled = false;
let afkMessage = "I’m currently AFK, I’ll reply later.";

// ---------------- COMMANDS ----------------
const commands = [

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all commands'),

  new SlashCommandBuilder()
    .setName('type')
    .setDescription('Send a custom message')
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Message to send')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a DM')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('User to DM')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Message to send')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Toggle AFK auto reply')
    .addStringOption(o =>
      o.setName('state')
        .setDescription('on or off')
        .setRequired(true)
        .addChoices(
          { name: 'on', value: 'on' },
          { name: 'off', value: 'off' }
        )
    )
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Custom AFK message')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Advanced calculator')
    .addStringOption(o =>
      o.setName('expression')
        .setDescription('Example: sqrt(16)+2^3')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Set calculator rounding')
    .addIntegerOption(o =>
      o.setName('rounding')
        .setDescription('Decimal places (1-15)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set a reminder')
    .addStringOption(o =>
      o.setName('time')
        .setDescription('Time (10s, 5m, 1h)')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Reminder message')
        .setRequired(true)
    )

].map(c => c.toJSON());

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
  console.log(`Online as ${client.user.tag}`);
});

// ---------------- INTERACTIONS ----------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!ALLOWED_USERS.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ No permission', flags: 64 });
  }

  // HELP
  if (interaction.commandName === 'help') {
    return interaction.reply({
      content:
`/type <msg>
/dm <user> <msg>
/afk on/off
/calc <math>
/settings rounding
/reminder`,
      flags: 64
    });
  }

  // TYPE (like reminder style)
  if (interaction.commandName === 'type') {
    const msg = interaction.options.getString('message');
    return interaction.reply({ content: msg });
  }

  // DM
  if (interaction.commandName === 'dm') {
    const user = interaction.options.getUser('user');
    const msg = interaction.options.getString('message');

    try {
      await user.send(msg);
      return interaction.reply({ content: '✅ DM sent', flags: 64 });
    } catch {
      return interaction.reply({ content: '❌ Cannot DM user', flags: 64 });
    }
  }

  // AFK
  if (interaction.commandName === 'afk') {
    const state = interaction.options.getString('state');
    const msg = interaction.options.getString('message');

    afkEnabled = state === 'on';
    if (msg) afkMessage = msg;

    return interaction.reply({ content: `AFK ${state}`, flags: 64 });
  }

  // CALC
  if (interaction.commandName === 'calc') {
    const expr = interaction.options.getString('expression');

    try {
      const s = userSettings.get(interaction.user.id) || { rounding: 6 };
      const raw = math.evaluate(expr);
      const result = math.format(raw, { precision: s.rounding });

      return interaction.reply({ content: `${result}` });

    } catch {
      return interaction.reply({ content: 'Invalid expression', flags: 64 });
    }
  }

  // SETTINGS
  if (interaction.commandName === 'settings') {
    const r = interaction.options.getInteger('rounding');

    if (r < 1 || r > 15) {
      return interaction.reply({ content: '1–15 only', flags: 64 });
    }

    userSettings.set(interaction.user.id, { rounding: r });

    return interaction.reply({ content: `Rounding: ${r}`, flags: 64 });
  }

  // REMINDER
  if (interaction.commandName === 'reminder') {
    const t = interaction.options.getString('time');
    const m = interaction.options.getString('message');

    const ms =
      t.endsWith('s') ? parseInt(t)*1000 :
      t.endsWith('m') ? parseInt(t)*60000 :
      t.endsWith('h') ? parseInt(t)*3600000 : null;

    if (!ms) return interaction.reply({ content: 'Invalid time', flags: 64 });

    await interaction.reply({ content: 'Reminder set!' });

    setTimeout(() => {
      interaction.user.send(`⏰ ${m}`).catch(()=>{});
    }, ms);
  }
});

// ---------------- AFK AUTO REPLY ----------------
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (!message.mentions.users.has(MAIN_USER)) return;
  if (!afkEnabled) return;

  const delay = Math.floor(Math.random() * 4000) + 2000;

  setTimeout(async () => {
    try {
      await message.reply(afkMessage);
    } catch {}
  }, delay);
});

// ---------------- LOGIN ----------------
client.login(token);
