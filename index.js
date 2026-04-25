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
const clientId = '1493486475201740930'; // replace this

// ---------------- COMMAND ----------------
const commands = [
  new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Advanced scientific calculator')
    .addStringOption(option =>
      option.setName('expression')
        .setDescription('Example: sqrt(16) + 2^3')
        .setRequired(true)
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
    console.log('Calc command registered');
  } catch (err) {
    console.error(err);
  }
})();

// ---------------- READY ----------------
client.once('clientReady', () => {
  console.log(`Spo0kNet is online as ${client.user.tag}`);
});

// ---------------- CALC HANDLER ----------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'calc') {
    const expr = interaction.options.getString('expression');

    try {
      const result = math.format(math.evaluate(expr), {
        precision: 14
      });

      await interaction.reply({
        content:
`🧮 **Calculator**

Expression:
\`${expr}\`

Result:
\`${result}\``
      });

    } catch (err) {
      await interaction.reply({
        content:
`❌ Invalid expression

Try things like:
• 2+2*5
• sqrt(16)
• sin(pi/2)
• 5!`
      });
    }
  }
});

// ---------------- LOGIN ----------------
client.login(token);
