/* 
  
  STATE

*/
import {Spotify} from './spotify.js';
import {playlistModal, UI} from './ui.js';

export const CUMULIO_PLAYLIST = '0GIFfPsuHdZUQGrGvKiXSm';
const spotify = new Spotify();
const ui = new UI(spotify);

let customEventsActive = false;
let activeDashboard = null;
export const dashboards = {
  kaggle: '8edf0005-6493-48e1-9689-5740a1829cdd',
  playlist: 'b9254071-560a-4140-9d20-91ec388d35ab',
  cumulio: 'f3555bce-a874-4924-8d08-136169855807',
  cumulio_songInfo: 'e92c869c-2a94-406f-b18f-d691fd627d34',
  kaggle_songInfo: '3f5d2cb6-9a8a-43e4-83d4-9c3dae66a194'
};

const dashboardOptions = {
  dashboardId: dashboards.kaggle,
  container: '#dashboard-container',
  loader: {
    background: '#111b31',
    spinnerColor: '#f44069',
    spinnerBackground: '#0d1425',
    fontColor: '#ffffff'
  }
};

/* 
  
  START

*/

window.onload = async () => {
  spotify.spotifyParams = getHashParams();
  if (!spotify.spotifyParams.access_token) return ui.setLoginStatus(false);
  spotify.makeSpotifyRequest('https://api.spotify.com/v1/me', 'get')
    .then(response => {
      if (response.error) ui.setLoginStatus(false);
      else ui.setLoginStatus(true, response);
    });

  window.openPageSongAnalytics();
};

window.closeSongInfoModal = () => ui.closeSongInfoModal();

window.openPageSongAnalytics = () => {
  toggleCustomEventListeners(true);
  ui.openPage('Songs visualized', 'songs');
  loadDashboard(dashboards.kaggle);
};

window.openPageByGenre = () => {
  ui.openPage('Songs by genre', 'by-genre');
  toggleCustomEventListeners(true);
  loadDashboard('4e745750-c474-4439-8374-b9baf7c1d894');
};

window.openPageCumulioFavorites = async () => {
  ui.openPage('Cumul.io playlist visualized', 'cumulio-playlist-viz');
  toggleCustomEventListeners(true);
  loadDashboard(dashboards.cumulio);
};

window.openPageMyPlaylistsVisualized = async () => {
  if (!spotify.user.loggedIn) return window.location.href = '/login';
  ui.openPage('Select a playlist to visualize', 'my-playlists-viz');
  const playlists = await spotify.getPlaylists();
  const playlistsEl = document.getElementById('playlists-list');
  playlistsEl.innerHTML = '';
  const container = ui.generatePlaylistCards(playlists, window.openPageVisualizePlaylist);
  playlistsEl.append(container);
};

window.openPageCumulioPlaylist = async () => {
  ui.openPage('Cumul.io playlist', 'cumulio-playlist');
  const playlistEl = await ui.generatePlaylistSongList({id: CUMULIO_PLAYLIST, name: 'Cumul.io Playlist'});
  const container = document.getElementById('playlists-list');
  container.innerHTML = '';
  container.append(playlistEl);
};

window.openPageMyPlaylists = async () => {
  if (!spotify.user.loggedIn) return window.location.href = '/login';
  ui.openPage('My Playlists', 'my-playlists');
  const playlists = await spotify.getPlaylists();
  const playlistsEl = document.getElementById('playlists-list');
  playlistsEl.innerHTML = '';
  const container = ui.generatePlaylistCards(playlists, window.openPagePlaylist);
  playlistsEl.append(container);
};

window.openPageVisualizePlaylist = async (playlist) => {
  ui.openPage(playlist.name || 'Playlist', 'my-playlists-viz');
  const token = await getDashboardAuthorizationToken({ playlistId: playlist.id });
  ui.removePlaylists();
  loadDashboard(dashboards.playlist, token.id, token.token);
};

window.openPagePlaylist = async (playlist) => {
  ui.openPage(playlist.name || 'Playlist', 'my-playlists');
  removeDashboard();
  const playlistEl = await ui.generatePlaylistSongList(playlist);
  const container = document.getElementById('playlists-list');
  container.innerHTML = '';
  container.append(playlistEl);
};

window.openPageInformation = async () => {
  ui.openPage('How we built it?', 'information');
  removeDashboard();
  const container = document.getElementById('playlists-list');
  container.innerHTML = `
    <div class="d-block">
      <div>Lorum ipsum... blood sweat & tears and ...</div>
      <div>Spotify API</div>
    </div>
  `;
};

/* 
  
  CUMUL.IO FUNCTIONS

*/

export const loadDashboard = (id, key, token, container) => {
  dashboardOptions.dashboardId = id;
  dashboardOptions.container = container || '#dashboard-container';
  // use tokens if available
  if (key && token) {
    dashboardOptions.key = key;
    dashboardOptions.token = token;
  }

  // add the dashboard to the #dashboard-container element
  activeDashboard = Cumulio.addDashboard(dashboardOptions);
};

export const removeDashboard = () => {
  Cumulio.removeDashboard(activeDashboard);
};

const getSong = (event) => {
  let songName;
  let songArtist;
  let songId;
  if (event.data.columns === undefined) {
    songName = event.data.name.id.split('&id=')[0];
    songId = event.data.name.id.split('&id=')[1];
  }
  else {
    songName = event.data.columns[0].value;
    songArtist = event.data.columns[1].value;
    songId = event.data.columns[event.data.columns.length - 1].value;
  }
  return {id: songId, name: songName, artist: songArtist};
};

const toggleCustomEventListeners = (boolean) => {
  if (customEventsActive && !boolean) {
    Cumulio.offCustomEvent();
  }
  else if (!customEventsActive && boolean) {
    Cumulio.onCustomEvent(async (event) => {
      const song = getSong(event);
      if (event.data.event === 'add_to_playlist') {
        await ui.addToPlaylistSelector(song.name, song.id);
        playlistModal.show();
      }
      else if (event.data.event === 'song_info') {
        await ui.displaySongInfo(song, event.dashboard);
      }
    });
  }
  customEventsActive = boolean;
};

// Function to retrieve the dashboard authorization token from the platform's backend
export const getDashboardAuthorizationToken = async (metadata) => {
  try {
    const body = {
      access_token: spotify.spotifyParams.access_token,
    };
    if (metadata && typeof metadata === 'object') {
      Object.keys(metadata).forEach(key => {
        body[key] = metadata[key];
      });
    }

    /*
      Make the call to the backend API, using the platform user access credentials in the header
      to retrieve a dashboard authorization token for this user
    */
    const response = await fetch('/authorization', {
      method: 'post',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });

    // Fetch the JSON result with the Cumul.io Authorization key & token
    const responseData = await response.json();
    return responseData;
  }
  catch (e) {
    return { error: 'Could not retrieve dashboard authorization token.' };
  }
};


/* 
  
  HELPER FUNCTIONS

*/


function getHashParams() {
  const hashParams = {};
  let e;
  const r = /([^&;=]+)=?([^&;]*)/g;
  const q = window.location.hash.substring(1);
  // eslint-disable-next-line no-cond-assign
  while (e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}