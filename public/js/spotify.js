class Spotify {

  constructor(){
    this.spotifyParams = {};
    this.user = {};
  }
  
  async refreshToken() {
    const t = this;
    const refresh_token = t.spotifyParams.refresh_token;
    const access_token = t.spotifyParams.access_token;
    return fetch('/refresh_token', {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refresh_token,
        access_token: access_token
      })
    })
      .then(res => res.json())
      .then(response => t.spotifyParams.access_token = response)
      .then(() => true);
  }

  async makeSpotifyRequest(url, method){
    const t = this;
    try {
      let res;
      do {
        res = await fetch(url, {
          method: method,
          headers: { Authorization: `Bearer ${t.spotifyParams.access_token}`, 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
      while (res.status === 401 && await t.refreshToken());
      return await res.json();
    }
    // eslint-disable-next-line no-console
    catch (err) { console.log(err); }
  }
  
  async getPlaylists() {
    const t = this;
    let playlists = [];
    let response;
    do {
      response = await t.makeSpotifyRequest(`https://api.spotify.com/v1/users/${t.user.id}/playlists?limit=50`, 'get');
      playlists = playlists.concat(response.items.map(item => {
        return {
          image: item.images.find(img => img.height === 300 || img.height > 300 || img.url !== null),
          name: item.name,
          tracks: item.tracks,
          uri: item.uri,
          id: item.id
        };
      }));
    }
    while (!response.next === null);
    return playlists;
  }

  async getSongsinPlaylist(playListId) {
    const t = this;
    let songs = [];
    let response;
    do {
      response = await t.makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playListId}/tracks`, 'get');
      songs = songs.concat(response.items.map(item => {
        const track = item.track || {};
        const artists = track.artists ? track.artists : [];
        const album = track.album ? track.album : null;
        const trackImage = album && album.images && album.images.find((img) => img.height === 64) ? album.images.find((img) => img.height === 64).url : null;
        return {
          id: track.id,
          name: track.name,
          artist: artists.length > 0 ? artists.map((a) => a.name).join(', ') : 'Unknown',
          album: track.album.name,
          releaseYear: album.release_date ? album.release_date.substring(0, 4) : 'Unknown',
          explicit: track.explicit,
          isPlayable: track.is_playable,
          previewUrl: track.preview_url,
          duration: `${Math.floor(track.duration_ms / 60000)}:${('0' + ((track.duration_ms % 60000) / 1000).toFixed(0)).slice(-2)}`,
          image: trackImage
        };
      }));
    }
    while (!response.next === null);
    return songs;
  }
  
  getSongInfo(id){
    const t = this;
    return t.makeSpotifyRequest(`https://api.spotify.com/v1/tracks/${id}`, 'get')
      // eslint-disable-next-line no-console
      .then(response => console.log(response));
  }
  
  async addToPlaylist(playlistId, songId){
    const t = this;
    return t.makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?uris=spotify%3Atrack%3A${songId}`, 'post')
      .then(response => { return response; });
  }

}

export {Spotify};