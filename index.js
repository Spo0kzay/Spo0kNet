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
  intents: [GatewayIntentBits.Guilds]
});

const token = process.env.TOKEN;
const clientId = 'YOUR_CLIENT_ID'; // <-- replace this

// ---------------- COMMANDS ----------------
const commands = [
  new SlashCommandBuilder()
    .setName('offline')
    .setDescription('Tell someone you are offline')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to message')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('busy')
    .setDescription('Tell someone you are busy')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to message')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Full scientific calculator')
    .addStringOption(option =>
      option.setName('expression')
        .setDescription('Example: sqrt(16) + 2^3')
        .setRequired(true)
    )

].map(cmd => cmd.toJSON());

// ---------------- REGISTER COMMANDS ----------------
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

// ---------------- COMMAND HANDLER ----------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // -------- OFFLINE / BUSY --------
  if (interaction.commandName === 'offline' || interaction.commandName === 'busy') {
    const user = interaction.options.getUser('user');

    const message =
      interaction.commandName === 'offline'
        ? "I'm offline right now, I'll reply later."
        : "I'm busy right now, talk later.";

    try {
      await user.send(message);
      await interaction.reply({ content: 'Sent ✅', ephemeral: true });
    } catch {
      await interaction.reply({ content: 'Could not DM user ❌', ephemeral: true });
    }
  }

  // -------- CALCULATOR --------
  if (interaction.commandName === 'calc') {
    const expr = interaction.options.getString('expression');

    try {
      const result = math.format(math.evaluate(expr), { precision: 14 });

      await interaction.reply({
        content: `🧮 **${expr} = ${result}**`
      });

    } catch (err) {
      await interaction.reply({
        content: `Invalid expression ❌`
      });
    }
  }
});

// ---------------- LOGIN ----------------
client.login(token);
