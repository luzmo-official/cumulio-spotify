require('dotenv').load();
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
var compression = require('compression');
const { join } = require('path');
const plugin_app = express();
const app = express();
const Cumulio = require('cumulio');

// const plugin = require('./plugin');
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

plugin_app.set('json spaces', 2);
plugin_app.set('x-powered-by', false);
plugin_app.use(compression());
plugin_app.use( (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Language', 'en');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Content-Language, Accept');
  next();
});
plugin_app.use(bodyParser.json());

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

plugin_app.get('/datasets', (req, res) => {
  if (req.headers['x-secret'] !== process.env.CUMULIO_SECRET)
    return res.status(403).end('Given plugin secret does not match Cumul.io plugin secret.');
  const datasets = [
    {
        id: 'Playlist 34',
        name: {en: 'cumul.io Spotify Playlist'},
        description: {en: 'Real-time air quality data for select cities'},
        columns: [
                {id: 'song_name', name: {en: 'Song Name'}, type: 'hierarchy'},
                {id: 'song_id', name: {en: 'Song ID'}, type: 'hierarchy'},
                {id: 'artist_name', name: {en: 'Main Artist Name'}, type: 'hierarchy'},
                {id: 'release_date', name: {en: 'Release Date'}, type: 'datetime'},
                {id: 'danceability', name: {en: 'Danceability'}, type: 'numeric'},
                {id: 'energy', name: {en: 'Energy'}, type: 'numeric'},
                {id: 'acousticness', name: {en: 'Acousticness'}, type: 'numeric'},
                {id: 'tempo', name: {en: 'Tempo'}, type: 'numeric'}
            ]
    }];
  return res.status(200).json(datasets);
});

function get_audio_features(track){
  return new Promise((resolve, reject) => {
    request.get({
        headers : {'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`},
        uri: `https://api.spotify.com/v1/audio-features/${track.id}`,
        gzip: true,
        json: true
    }, function(error, features) {
      if (error)
        return res.status(500).end('Internal Server Error');

      resolve([track.name,  track.id, track.album.artists[0].name, new Date(track.album.release_date).toISOString(), features.body.danceability, features.body.energy ,features.body.acousticness , features.body.tempo]);
    });
  })
}

plugin_app.post('/query', (req, res) => {
  if (req.headers['x-secret'] !== process.env.CUMULIO_SECRET)
    return res.status(403).end('Given plugin secret does not match Cumul.io plugin secret.');

  request.get({
      headers : {'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`},
      uri: `https://api.spotify.com/v1/playlists/${req.body.user.metadata.playlist_id}/tracks`,
      gzip: true,
      json: true
  }, function(error, tracks) {
  if (error)
      return res.status(500).end('Internal Server Error');

  Promise.all(tracks.body.items.map(function(track) {
    return get_audio_features(track.track);
  })).then(result => {return res.status(200).json(result)});
  });
  
});

// Serve the index page for all other requests
app.get('/*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

plugin_app.options('*', (req, res) => {
  res.status(204);
});

plugin_app.listen(process.env.PORT, () => console.log(`[OK] Cumul.io plugin \'Spotify\' listening on port ${process.env.PORT}`));

// plugin.init(app);

// Listen on port 3000
app.listen(3000, () => console.log('Application running on port 3000'));