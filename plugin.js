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
    console.log('plugin initialized');
    const t = this;
    app.get('/datasets', (req, res) => {
      console.log("in /dataset");
      if (!process.env.LOCAL && req.headers['x-secret'] !== process.env.CUMULIO_SECRET)
        return res.status(403).end('Given plugin secret does not match Cumul.io plugin secret.');
      const datasets = [
        {
            id: 'Selected Playlist',
            name: {en: 'Spotify Playlist selected by user'},
            description: {en: 'Song and playlist characteristics for selected playlist'},
            columns: [
                    {id: 'song_name', name: {en: 'Name'}, type: 'hierarchy'},
                    {id: 'song_id', name: {en: 'ID'}, type: 'hierarchy'},
                    {id: 'artist_name', name: {en: 'Main Artist Name'}, type: 'hierarchy'},
                    {id: 'release_date', name: {en: 'Release Date'}, type: 'datetime'},
                    {id: 'danceability', name: {en: 'Danceability'}, type: 'numeric'},
                    {id: 'energy', name: {en: 'Energy'}, type: 'numeric'},
                    {id: 'acousticness', name: {en: 'Acousticness'}, type: 'numeric'},
                    {id: 'tempo', name: {en: 'Tempo (bpm)'}, type: 'numeric'},
                    {id: 'name_id', name: {en: 'Name & ID'}, type: 'hierarchy'},
                    {id: 'danceability_category', name: {en: 'Danceability_category'}, type: 'hierarchy'}
                ]
        }];
      return res.status(200).json(datasets);
    });
    
    function get_audio_features(track, authorization_id){
      return t.makeSpotifyRequest(`https://api.spotify.com/v1/audio-features/${track.id}`, authorization_id)
        .then(features => {
          let danceability_category = '';
          if(features.body.danceability >= 0.8) danceability_category = '5. Even grandma is on the dancefloor!';
          else if(features.body.danceability >= 0.6) danceability_category = '4. My legs are twitching';
          else if(features.body.danceability >= 0.4) danceability_category = '3. I could dance to this...';
          else if(features.body.danceability >= 0.3) danceability_category = '2. I need a few more beers for this';
          else danceability_category = '1. Barely bopping my head';
          return [track.name, track.id, track.album.artists[0].name, new Date(track.album.release_date).toISOString(), features.body.danceability, features.body.energy, features.body.acousticness, features.body.tempo, `${track.name}&id=${track.id}`, danceability_category];
        });
    }
    
    app.post('/query', (req, res) => {
      console.log('got to /query');
      if (!process.env.LOCAL && req.headers['x-secret'] !== process.env.CUMULIO_SECRET)
        return res.status(403).end('Given plugin secret does not match Cumul.io plugin secret.');
      
      let access_token = process.env.ACCESS_TOKEN;
      let refresh_token = process.env.REFRESH_TOKEN;
      let playlist_id = process.env.PLAYLIST_ID;
    
      if (req.body.user && req.body.user.metadata) {
        access_token = req.body.user.metadata.access_token || process.env.ACCESS_TOKEN;
        refresh_token = req.body.user.metadata.refresh_token || process.env.REFRESH_TOKEN;
        playlist_id = req.body.user.metadata.playlistId || process.env.PLAYLIST_ID;
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