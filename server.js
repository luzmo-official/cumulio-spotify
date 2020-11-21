require('dotenv').load();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const { join } = require('path');
const app = express();
const Cumulio = require('cumulio');

const plugin = require('./plugin');
const spotify = require('./spotify');

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
  .use(bodyParser.json())
  .use( (req, res, next) => {
    res.setHeader('Content-Language', 'en');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
  });

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
      .catch(() => {
        res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
      });
  }
});

app.post('/authorization', (req, res) => {
  const metadata = req.body || {};
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
    .catch(() => {
      res.status(500).json('An unexpected error occurred, please try again later.');
    });
});

// Fetch song ID based on song name
app.get('/song_uri', async (req, res) => {
  const songName = req.query.songName || null;
  const type = req.query.type || null;
  if(songName && type) {
    const data = await client.get('data', {
      dimensions: [{
        column_id: '0e7dc298-6751-4467-b6ac-ca48fd8d0cb4',
        dataset_id: '86c120f8-7890-4aec-98cc-c27f7928c877'
      }],
      where: [{
        expression: '? = ?',
        parameters: [
          {
            column_id: 'c5766a72-055b-447b-ac87-3b95e3fce7ce',
            dataset_id: '86c120f8-7890-4aec-98cc-c27f7928c877'
          },
          songName
        ]
      }]
    });
    res.status(200).json(data);
  }
  else {
    return res.status(400).json({message: 'you must supply a valid songName and type'});
  }
});

plugin.init(app);

// Serve the index page for all other requests
app.get('/*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Listen on port 3000
// eslint-disable-next-line no-console
app.listen(3000, () => console.log('Application running on port 3000'));