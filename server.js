require('dotenv').load();
const express = require('express');
const request = require('request');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')
var compression = require('compression');
const { join } = require('path');
const plugin_app = express();
const app = express();
const Cumulio = require('cumulio');
const dashboardId = '04cf04c4-c7b2-49a9-99d8-05e232244d94';
const redirect = 'http://localhost:3000/callback';
const scopes = 'user-read-private user-read-email';

const generateRandomString = function (length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

const client = new Cumulio({
  api_key: process.env.CUMULIO_API_KEY,
  api_token: process.env.CUMULIO_API_TOKEN
});

// Serve static assets from the /public folder
app
  .use(express.static(join(__dirname, 'public')))
  .use(cors())
  .use(cookieParser());

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

  // your application requests authorization
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scopes,
      redirect_uri: redirect,
      state: state
    }));
});

app.get('/refresh_token', function (req, res) {
  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
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
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;
        const options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          // console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' + querystring.stringify({ access_token: access_token, refresh_token: refresh_token }));
      }
      else {
        res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
      }
    });
  }
});

plugin_app.get('/datasets', (req, res) => {
  if (req.headers['x-secret'] !== process.env.CUMULIO_SECRET)
    return res.status(403).end('Given plugin secret does not match Cumul.io plugin secret.');
  const datasets = [
    {
        id: 'Playlist 34',
        name: {en: 'Playlist 34 Profile'},
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
      resolve([track.name,  track.id, track.album.artists[0].name, track.album.release_date, features.body.danceability, features.body.energy ,features.body.acousticness , features.body.tempo]);
    });
  })
}

plugin_app.post('/query', (req, res) => {
  if (req.headers['x-secret'] !== process.env.CUMULIO_SECRET)
    return res.status(403).end('Given plugin secret does not match Cumul.io plugin secret.');

  request.get({
      headers : {'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`},
      uri: `https://api.spotify.com/v1/playlists/${process.env.PLAYLIST_ID}/tracks`,
      gzip: true,
      json: true
  }, function(error, tracks) {
  if (error)
      return res.status(500).end('Internal Server Error');

  Promise.all(tracks.body.items.map(function(track) {
    return get_audio_features(track.track);
  })).then(result => { console.log(result); return res.status(200).json(result)});
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
// Listen on port 3000
app.listen(3000, () => console.log('Application running on port 3000'));