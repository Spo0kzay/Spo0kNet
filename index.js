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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ]
});

const token = process.env.TOKEN;
const clientId = '1493486475201740930';
const OWNER_ID = '1492311096193847499';

// ---------------- STORAGE ----------------
const userSettings = new Map();
const mentionTracking = new Map();
const mentionLogs = new Map();

let autoReplyEnabled = false;
let autoReplyMessage = "I’m offline right now.";

// ---------------- COMMANDS ----------------
const commands = [

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show commands'),

  new SlashCommandBuilder()
    .setName('type')
    .setDescription('Send your custom message')
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Message to send')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Calculator')
    .addStringOption(o =>
      o.setName('expression')
        .setDescription('Math expression')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Set rounding')
    .addIntegerOption(o =>
      o.setName('rounding')
        .setDescription('Decimal places (1-15)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set reminder')
    .addStringOption(o =>
      o.setName('time')
        .setDescription('Time (10s, 5m, 1h)')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Reminder text')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('mentiontrack')
    .setDescription('Track mentions while offline')
    .addStringOption(o =>
      o.setName('state')
        .setDescription('Turn on or off')
        .setRequired(true)
        .addChoices(
          { name: 'on', value: 'on' },
          { name: 'off', value: 'off' }
        )
    ),

  new SlashCommandBuilder()
    .setName('autoreply')
    .setDescription('Auto reply when mentioned')
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
        .setDescription('Custom reply message')
        .setRequired(false)
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

  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: 'No permission', flags: 64 });
  }

  // HELP
  if (interaction.commandName === 'help') {
    return interaction.reply({
      content:
`/type <msg>
/calc <math>
/settings rounding
/reminder
/mentiontrack on/off
/autoreply on/off`,
      flags: 64
    });
  }

  // TYPE (your custom message)
  if (interaction.commandName === 'type') {
    const msg = interaction.options.getString('message');
    return interaction.reply({ content: msg });
  }

  // CALC
  if (interaction.commandName === 'calc') {
    const expr = interaction.options.getString('expression');

    try {
      const s = userSettings.get(OWNER_ID) || { rounding: 6 };
      const raw = math.evaluate(expr);
      const result = math.format(raw, { precision: s.rounding });

      return interaction.reply({ content: `${result}` });

    } catch {
      return interaction.reply({ content: 'Invalid', flags: 64 });
    }
  }

  // SETTINGS
  if (interaction.commandName === 'settings') {
    const r = interaction.options.getInteger('rounding');

    if (r < 1 || r > 15) {
      return interaction.reply({ content: '1-15 only', flags: 64 });
    }

    userSettings.set(OWNER_ID, { rounding: r });
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

  // MENTION TRACK
  if (interaction.commandName === 'mentiontrack') {
    const state = interaction.options.getString('state');
    mentionTracking.set(OWNER_ID, state === 'on');

    return interaction.reply({ content: `Tracking ${state}`, flags: 64 });
  }

  // AUTOREPLY
  if (interaction.commandName === 'autoreply') {
    const state = interaction.options.getString('state');
    const msg = interaction.options.getString('message');

    autoReplyEnabled = state === 'on';
    if (msg) autoReplyMessage = msg;

    return interaction.reply({ content: `Auto reply ${state}`, flags: 64 });
  }
});

// ---------------- MESSAGE LISTENER ----------------
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // track mentions
  if (message.mentions.users.has(OWNER_ID)) {
    if (mentionTracking.get(OWNER_ID)) {
      if (!mentionLogs.has(OWNER_ID)) mentionLogs.set(OWNER_ID, []);

      mentionLogs.get(OWNER_ID).push(
        `${message.author.tag}: ${message.content}`
      );
    }

    // auto reply
    if (autoReplyEnabled) {
      try {
        await message.reply(autoReplyMessage);
      } catch {}
    }
  }
});

// ---------------- LOGIN ----------------
client.login(token);
