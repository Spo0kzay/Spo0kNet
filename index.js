require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const token = process.env.TOKEN;
const clientId = '1493486475201740930';

// ---- Commands ----
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
    )
].map(cmd => cmd.toJSON());

// ---- Register commands ----
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  await rest.put(
    Routes.applicationCommands(clientId),
    { body: commands }
  );
  console.log('Commands registered');
})();

// ---- Ready ----
client.once('ready', () => {
  console.log(`Spo0kNet is online as ${client.user.tag}`);
});

// ---- Command handler ----
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const user = interaction.options.getUser('user');

  let message = '';

  if (interaction.commandName === 'offline') {
    message = "I'm offline right now, I'll reply later.";
  }

  if (interaction.commandName === 'busy') {
    message = "I'm busy right now, talk later.";
  }

  try {
    await user.send(message);
    await interaction.reply({ content: 'Sent ✅', ephemeral: true });
  } catch {
    await interaction.reply({ content: 'Could not DM user ❌', ephemeral: true });
  }
});

client.login(token);
