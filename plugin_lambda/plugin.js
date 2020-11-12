const request = require('request');

const datasets = [
  {
    id: 'Selected Playlist',
    name: {en: 'Spotify Playlist selected by user'},
    description: {en: 'Song and playlist characteristics for selected playlist'},
    columns: [
      {id: 'song_name',    name: {en: 'Song Name'},        type: 'hierarchy'},
      {id: 'song_id',      name: {en: 'Song ID'},          type: 'hierarchy'},
      {id: 'artist_name',  name: {en: 'Main Artist Name'}, type: 'hierarchy'},
      {id: 'release_date', name: {en: 'Release Date'},     type: 'datetime'},
      {id: 'danceability', name: {en: 'Danceability'},     type: 'numeric'},
      {id: 'energy',       name: {en: 'Energy'},           type: 'numeric'},
      {id: 'acousticness', name: {en: 'Acousticness'},     type: 'numeric'},
      {id: 'tempo',        name: {en: 'Tempo'},            type: 'numeric'}
    ]
  }
];
const headers = {
  'Content-Type':'application/json',
  'Access-Control-Allow-Origin':'*'
};
const credentials = {};

module.exports.handler = async (event) => {
  if (!process.env.LOCAL && event.headers['x-secret'] !== process.env.CUMULIO_SECRET) {
    return {
      statusCode: 403,
      body: 'Given plugin secret does not match Cumul.io plugin secret.'
    };
  }

  if (event.path === '/datasets') {
    console.log('DATASETS');
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(datasets)
    };
  }

  if (event.httpMethod == 'OPTIONS') {
    console.log('OPTIONS');
    return {
      statusCode: 200,
      headers: headers
    };
  }

  if (event.path === '/query') {
    console.log('QUERY');
    let access_token = process.env.ACCESS_TOKEN;
    let refresh_token = process.env.REFRESH_TOKEN;
    let playlist_id = process.env.PLAYLIST_ID;
  
    if (event.body.user && event.body.user.metadata) {
      access_token = event.body.user.metadata.access_token || process.env.ACCESS_TOKEN;
      refresh_token = event.body.user.metadata.refresh_token || process.env.REFRESH_TOKEN;
      playlist_id = event.body.user.metadata.playlist_id || process.env.PLAYLIST_ID;
    }

    // Save credentials
    let authorization_id = 'none';
    if (event.authorization_id) {
      authorization_id = event.authorization_id;
    }

    credentials[authorization_id] = { acces_token: access_token, refresh_token: refresh_token };

    return makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, authorization_id)
      .then(tracks => {
        return Promise.all(tracks.body.items.map(function(track) {
          return get_audio_features(track.track, authorization_id);
        }));
      })
      .then(result => {
        return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify(result)
        };
      })
      .catch(error => {
        console.log(error);
        return {
          statusCode: 500,
          body: 'Internal server error'
        }
      });
  }
}

async function get_audio_features(track, authorization_id) {
  const features = await makeSpotifyRequest(`https://api.spotify.com/v1/audio-features/${track.id}`, authorization_id);
  return [track.name, track.id, track.album.artists[0].name, new Date(track.album.release_date).toISOString(), features.body.danceability, features.body.energy, features.body.acousticness, features.body.tempo];
}

async function makeSpotifyRequest(url, authorization_id) {
  const t = this;
  let access_token;
  if (!credentials[authorization_id]) throw Error('No access token');
  access_token = t.credentials[authorization_id].acces_token;
  try {
    let res;
    do {
      res = await requestPromise({
        url: url,
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json; charset=utf-8' },
        gzip: true,
        json: true
      });
      if (res.statusCode === 401) {
        access_token = await refreshToken(authorization_id);
        credentials[authorization_id].acces_token = access_token;
      }
    }
    while (res.statusCode === 401);
    return res;
  }
  catch (err) {
    console.log(err);
  }
}

function refreshToken (authorization_id) {
  return new Promise((resolve, reject) => {
    // let refresh_token;
    if(!credentials[authorization_id]) {
      reject('Unknown auth id');
      // console.log('unknown access_token, falling back to refresh_token');
    }
    else refresh_token = credentials[authorization_id].refresh_token;
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: { 'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')) },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
      json: true
    };

    request.post(authOptions, function (error, response, body) {
      console.log('request')
      if(error) reject(error);
      // console.log(response);
      if (!error && response.statusCode === 200) {
        // if (credentials[authorization_id]) delete t.refresh_tokens[acces_token];
        let new_access_token = body.access_token;
        // credentials[authorization_id].refresh_token = refresh_token;
        resolve(new_access_token);
      }
    });
  });
}

function requestPromise(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if(error) reject(error);
      else resolve(response);
    });
  });
}
