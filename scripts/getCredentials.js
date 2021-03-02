/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
require('dotenv').config();
const chalk = require('chalk');
const clipboardy = require('clipboardy');
const app = require('express')();

const { google } = require('googleapis');

const PORT = 3080;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  `http://localhost:${PORT}`,
);

app.get('/', (req, res) => {
  const { code } = req.query;
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error(chalk.red('Error retrieving access token'), err);
      return;
    }
    oAuth2Client.setCredentials(token);
    const stringifiedCredentials = JSON.stringify(token);
    clipboardy.writeSync(stringifiedCredentials);
    console.log();
    console.log(chalk.black.bgWhite(stringifiedCredentials));
    console.log();
    console.log(chalk.green('🚀 Credentials are copied into you clipboard! You can paste it in your .env file, on the CREDENTIAL key.'));
    console.log(chalk.green('If not, just copy the json above'));
    process.exit(0);
  });
  res.send('You can close the page.');
});

app.listen(PORT, () => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log(`▶️ Visit this url to authorize the app: ${chalk.blue(authUrl)}`);
});
