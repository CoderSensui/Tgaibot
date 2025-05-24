const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const app = express();
const fetch = require('node-fetch');
//app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/t', (req, res) => {
    res.send("Maintenance Go To https://t.me/SensuiBots For Updates")
})

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.get('/ActiveBots', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/ainfo.html'));
});

app.get('/Admin', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/admin.html'));
});

// Read bot tokens from bottokens.json file
const botTokensFile = 'bottokens.json';
const rawTokens = fs.readFileSync(botTokensFile);
const botTokensAndUsernames = JSON.parse(rawTokens);

// API URL for fetching AI response
const apiUrl = 'https://sensui-useless-apis.codersensui.repl.co/api/tools/ai?question=';

// Create an array to hold instances of the TelegramBot class
const bots = [];

// Initialize each bot using the tokens from the JSON file
for (const token of Object.keys(botTokensAndUsernames)) {
  const bot = new TelegramBot(token, { polling: true });

  const channelId = '@SensuiBots'; // Replace with your channel username

const userAdsCounter = new Map();

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    const welcomeMessage = `Hi ${firstName}! Welcome to My bot.\nFeel free to ask any questions, and I'll do my best to help you out.\nJust send your message, and I'll provide you with a response.`;
    bot.sendMessage(chatId, welcomeMessage);
    
    userAdsCounter.set(msg.from.id, 0);
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
  const userMessage = msg.text;
  const userId = msg.from.id;

    if (userMessage === '/start') {
      return; // Ignore /start command
    }

    // Send "Please wait..." message
    const waitMessage = await bot.sendMessage(chatId, 'Please wait.');

    try {
      const response = await fetch(apiUrl + encodeURIComponent(userMessage));
      const data = await response.json();
      const answer = data.answer;

      // Edit the "Please wait..." message with the API response
      bot.editMessageText(answer, {
        chat_id: chatId,
        message_id: waitMessage.message_id
      });
    } catch (error) {
      console.error('Error fetching API:', error);
      bot.editMessageText('Sorry, an error occurred.', {
        chat_id: chatId,
        message_id: waitMessage.message_id
      });
    }

  if (userAdsCounter.has(userId)) {
    const adsCount = userAdsCounter.get(userId);
    if (adsCount >= 6 && adsCount <= 9) {
      const adMessage = `This Bot Is Powered By ${channelId}`;
      const keyboard = {
        inline_keyboard: [[
          { text: 'Join Channel', url: `https://t.me/${channelId.substring(1)}` }
        ]]
      };

      bot.sendMessage(chatId, adMessage, { reply_markup: keyboard });

      // Increment the ads counter for the user
      userAdsCounter.set(userId, adsCount + 1);
    } else if (adsCount > 9) {
      // Reset the ads counter for the user
      userAdsCounter.delete(userId);
    } else {
      // Increment the message count for the user
      userAdsCounter.set(userId, adsCount + 1);
    }
  }
});

  bots.push(bot);
}

app.post('/save-token', async (req, res) => {
    const { token, username } = req.body;

    // Create a bot instance with the provided token
    const bot = new TelegramBot(token, { polling: false });

    try {
        // Fetch bot information to verify token validity
        const botInfo = await bot.getMe();

        // Check if the received username matches the one in the bot info
        if (botInfo.username === username) {
            // Update the botTokensAndUsernames object
            botTokensAndUsernames[token] = username;
            
            // Write the updated object to bottokens.json
            fs.writeFileSync(botTokensFile, JSON.stringify(botTokensAndUsernames, null, 2));

            // Restart the application
            console.log('Restarting the application...');
            process.exit(0);

            // The following line will be reached only if the application is not restarted
            res.json({ success: true, message: 'Bot Token Saved Successfully.'});
          console.log('Restarted Successfully');
        } else {
            // Invalid token or username
            res.json({ success: false, message: 'Invalid Bot Token or Username.' });
          console.log('Error Restarting');
        }
    } catch (error) {
        // Handle any errors that might occur during the token validation
        console.error('Error validating token:', error);
        res.json({ success: false, message: 'An error occurred while validating the Bot Token.' });
    }
});


let activeBotCount = 0;

// Function to periodically check and remove invalid bot tokens
async function checkBotTokensValidity() {
    const newBotTokensAndUsernames = {};

    for (const token of Object.keys(botTokensAndUsernames)) {
        const bot = new TelegramBot(token, { polling: false });

        try {
            const botInfo = await bot.getMe();
            newBotTokensAndUsernames[token] = botTokensAndUsernames[token];
            
            // Increment the activeBotCount only if token is valid
            if (botInfo.username) {
                activeBotCount++;
            }
        } catch (error) {
            // Handle errors that occur during token validation
            console.error(`Error validating token ${token}:`, error);
        }
    }    

    // Update the botTokensAndUsernames object with the valid tokens and usernames
    fs.writeFileSync(botTokensFile, JSON.stringify(newBotTokensAndUsernames, null, 2));

    // Call the function again after a 1-minute timeout
    setTimeout(checkBotTokensValidity, 60 * 500); // Repeat every 1 minute
}

// Create an API endpoint to fetch the active bot count
app.get('/active-bot-count', (req, res) => {
    const activeBotCount = Object.keys(botTokensAndUsernames).length;
    res.json({ activeBotCount });
});



// Start the token validity checking function
checkBotTokensValidity();


app.get('/active-bot-usernames', (req, res) => {
    const activeBotUsernames = Object.values(botTokensAndUsernames);
    res.json({ botUsernames: activeBotUsernames });
});

app.post('/check-password', (req, res) => {
    const enteredPassword = req.body.password;

    if (enteredPassword === '7675') {
        res.json({ authorized: true });
    } else {
        res.json({ authorized: false });
    }
});


app.post('/delete-bot', (req, res) => {
    const { botusername } = req.body;

    // Find the bot token based on the bot username
    const botToken = Object.keys(botTokensAndUsernames).find(token => botTokensAndUsernames[token] === botusername);

    if (!botToken) {
        res.json({ success: false, message: 'Bot username not found.' });
        return;
    }

    // Delete the bot token from the object
    delete botTokensAndUsernames[botToken];

    // Write the updated object to the bottokens.json file
    fs.writeFileSync(botTokensFile, JSON.stringify(botTokensAndUsernames, null, 2));

    res.json({ success: true, message: 'Bot token deleted successfully.' });
});



app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
         