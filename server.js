require('dotenv').load();
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
var compression = require('compression');
const { join } = require('path');
const app = express();
const Cumulio = require('cumulio');

const plugin = require('./plugin');
const spotify = require('./spotify');

const dashboardId = '04cf04c4-c7b2-49a9-99d8-05e232244d94';
const stateKey = 'spotify_auth_state';

const client = new Cumulio({
  api_key: process.env.CUMULIO_API_KEY,
  api_token: process.env.CUMULIO_API_TOKEN
});

const generateRandomString = function (length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Serve static assets from the /public folder
app
  .use(express.static(join(__dirname, 'public')))
  .use(cors())
  .use(cookieParser())
  .use(bodyParser.json());

app.get('/login', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);
  spotify.login(state, res);
});

app.post('/refresh_token', function (req, res) {
  // requesting access token from refresh token
  const refresh_token = req.body.refresh_token || null;
  const access_token = req.body.access_token || null;

  spotify.refreshToken(access_token, refresh_token)
    .then(access_token => {
      res.status(200).json(access_token);
    })
    .catch(error => {
      res.status(500).send(error);
    });
});

app.get('/callback', function (req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
  }
  else {
    res.clearCookie(stateKey);
    spotify.exchangeToken(code)
      .then(credentials => {
        res.redirect('/#' + querystring.stringify(credentials));
      })
      .catch(err => {
        res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
      });
  }
});

app.post('/authorization', (req, res) => {
  let metadata = req.body || {};
  // TODO: add securables to authorization
  client.create('authorization', {
    type: 'temporary',
    expiry: '24 hours',
    inactivity_interval: '10 minutes',
    metadata: metadata
  })
    .then(auth => {
      res.status(200).json(auth);
    })
    .catch(err => {
      res.status(500).json('An unexpected error occurred, please try again later.');
    });
});

plugin.init(app);

// Serve the index page for all other requests
app.get('/*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Listen on port 3000
app.listen(3000, () => console.log('Application running on port 3000'));