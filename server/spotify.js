const request = require('request');
const querystring = require('querystring');

const redirect = process.env.SPOTIFY_REDIRECT_URI;
const scopes = 'user-read-private user-read-email playlist-read-collaborative playlist-read-private playlist-modify-public playlist-modify-private';

class Spotify {
  constructor() {
    this.refresh_tokens = {};
  }

  login(state, res) {
    // your application requests authorization
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope: scopes,
        redirect_uri: redirect,
        state: state
      })
    );
  }

  refreshToken(acces_token, refresh_token) {
    const t = this;
    return new Promise((resolve, reject) => {
      if(!t.refresh_tokens[acces_token]) {
        // eslint-disable-next-line no-console
        console.log('unknown access_token, falling back to refresh_token');
      }
      else refresh_token = t.refresh_tokens[acces_token];
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
        if(error) reject(error);
        if (!error && response.statusCode === 200) {
          if (t.refresh_tokens[acces_token]) delete t.refresh_tokens[acces_token];
          const new_access_token = body.access_token;
          t.refresh_tokens[new_access_token] = refresh_token;
          resolve(new_access_token);
        }
      });
    });
  }

  exchangeToken(code) {
    const t = this;
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
      },
      json: true
    };
  
    return new Promise((resolve, reject) => {
      request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          const access_token = body.access_token;
          const refresh_token = body.refresh_token;
          t.refresh_tokens[access_token] = refresh_token;
          resolve({ access_token: access_token, refresh_token: refresh_token});
        }
        else {
          reject(error);
        }
      });
    });
  }
}

module.exports = new Spotify();