const request = require('request');
const spotify = require('./spotify');

function requestPromise(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if(error) reject(error);
      else resolve(response);
    });
  });
}

class Plugin {

  constructor() {
    this.credentials = {};
  }

  init(app) {
    const t = this;
    app.get('/datasets', (req, res) => {
      if (!process.env.LOCAL && req.headers['x-secret'] !== process.env.CUMULIO_SECRET)
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
    
    function get_audio_features(track, authorization_id){
      return t.makeSpotifyRequest(`https://api.spotify.com/v1/audio-features/${track.id}`, authorization_id)
        .then(features => {
          return [track.name, track.id, track.album.artists[0].name, new Date(track.album.release_date).toISOString(), features.body.danceability, features.body.energy, features.body.acousticness, features.body.tempo];
        });
    }
    
    app.post('/query', (req, res) => {
      if (!process.env.LOCAL && req.headers['x-secret'] !== process.env.CUMULIO_SECRET)
        return res.status(403).end('Given plugin secret does not match Cumul.io plugin secret.');
      
      let access_token = process.env.ACCESS_TOKEN;
      let refresh_token = process.env.REFRESH_TOKEN;
      let playlist_id = process.env.PLAYLIST_ID;
    
      if (req.body.user && req.body.user.metadata) {
        access_token = req.body.user.metadata.access_token || process.env.ACCESS_TOKEN;
        refresh_token = req.body.user.metadata.refresh_token || process.env.REFRESH_TOKEN;
        playlist_id = req.body.user.metadata.playlist_id || process.env.PLAYLIST_ID;
      }

      // Save credentials
      let authorization_id = 'none';
      if (req.authorization_id) {
        authorization_id = req.authorization_id;
      }

      t.credentials[authorization_id] = access_token;

      t.makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, authorization_id)
        .then(tracks => {
          return Promise.all(tracks.body.items.map(function(track) {
            return get_audio_features(track.track, authorization_id);
          }));
        })
        .then(result => {
          return res.status(200).json(result);
        })
        .catch(error => {
          console.log(error);
          return res.status(500).json('An unexpected error occurred');
        });
    });
 
    app.options('*', (req, res) => {
      res.status(204);
    });
  }

  async makeSpotifyRequest(url, authorization_id) {
    const t = this;
    let access_token;
    if (!t.credentials[authorization_id]) throw Error('No access token');
    access_token = t.credentials[authorization_id];
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
          access_token = await spotify.refreshToken(access_token);
          t.credentials[authorization_id] = access_token;
        }
      }
      while (res.statusCode === 401);
      return res;
    }
    catch (err) {
      console.log(err);
    }
  }

}

module.exports = new Plugin();