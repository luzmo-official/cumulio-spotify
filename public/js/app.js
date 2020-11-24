/* 
  
  STATE

*/

const CUMULIO_PLAYLIST = '0GIFfPsuHdZUQGrGvKiXSm';
let user = {};
const spotifyFns = {};
const helper = {};
const ui = {};
let spotifyParams = {};
let customEventsActive = false;
let activeDashboard = null;
const dashboards = {
  kaggle: '8edf0005-6493-48e1-9689-5740a1829cdd',
  playlist: 'b9254071-560a-4140-9d20-91ec388d35ab',
  cumulio: 'f3555bce-a874-4924-8d08-136169855807',
  cumulio_songInfo: 'e92c869c-2a94-406f-b18f-d691fd627d34',
  kaggle_songInfo: '3f5d2cb6-9a8a-43e4-83d4-9c3dae66a194'
};
const playlistModal = new bootstrap.Modal(document.getElementById('playlist-modal'), {});
const songInfoModal = new bootstrap.Modal(document.getElementById('song-info-modal'), {});

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
  spotifyParams = helper.getHashParams();
  if (!spotifyParams.access_token) return ui.setLoginStatus(false);
  spotifyFns.makeSpotifyRequest('https://api.spotify.com/v1/me', 'get')
    .then(response => {
      if (response.error) ui.setLoginStatus(false);
      else ui.setLoginStatus(true, response);
    });

  this.openPageSongAnalytics();
};

/* 
  
  UI

*/

ui.toggleMenu = (boolean) => {
  if (boolean) {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('open');
  }
  else {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
    document.getElementById('dashboard-container').innerHTML = '';
    document.getElementById('playlists-list').innerHTML = '';

  }
};

ui.openPage = (title, name) => {
  ui.setTitle(title);
  ui.setActiveMenuItem(name);
  ui.toggleMenu(false);
  removeDashboard();
};

ui.setLoginStatus = (boolean, res) => {
  if (res) user = res;
  const loginBtnEl = document.getElementById('login-btn');
  const smallLoginBtnEls = document.querySelectorAll('.login-btn-small');
  const guardedEls = document.querySelectorAll('.guarded');
  const userEl = document.getElementById('user');
  const userImgEl = document.getElementById('user-img');
  const userLetterEl = document.getElementById('user-letter');
  if (boolean) {
    user.loggedIn = true;
    loginBtnEl.classList.add('d-none');
    userEl.classList.remove('d-none');
    smallLoginBtnEls.forEach((d) => d.classList.add('d-none'));
    guardedEls.forEach((d) => d.classList.remove('guarded'));
    userLetterEl.innerText = user && user.display_name ? user.display_name.substring(0, 1) : '';
    if (user.images && user.images.length > 0) {
      userImgEl.classList.remove('d-none');
      userImgEl.src = user.images[0].url;
    }
    else userImgEl.classList.add('d-none');
  }
  else {
    userEl.classList.add('d-none');
    loginBtnEl.classList.remove('d-none');
    smallLoginBtnEls.forEach((d) => d.classList.remove('d-none'));
  }
};

ui.setTitle = (title) => {
  document.querySelector('#page-title').innerText = title;
};

ui.setActiveMenuItem = (name) => {
  const listItems = document.querySelectorAll('.menu-item');
  listItems.forEach((el) => el.classList.remove('active'));
  document.querySelector(`.menu-item[menu-item="${name}"]`).classList.add('active');
};

ui.generatePlaylistCards = (playlists, callback) => {
  const container = document.createElement('div');
  container.classList.add('row');
  playlists.forEach(playlist => {
    const div = document.createElement('div');
    div.classList.add('col-6', 'col-md-3', 'col-lg-2', 'mb-3');
    div.onclick = () => { callback(playlist); };
    div.innerHTML = `
      <div class="card playlist-card">
        <img src="${ playlist.image ? playlist.image.url : ''}" class="card-img-top"/>
        <div class="card-body">
          <h5 class="card-title text-truncate">${playlist.name}</h2>
          <h6 class="card-subtitle">${playlist.tracks.total} tracks</p>
        </div>
      </div>
    `;
    container.append(div);
  });
  return container;
};

ui.generatePlaylistSongList = async (playlist) => {
  const containerEl = document.createElement('div');
  containerEl.classList.add('w-100', 'text-right');
  const visualizeButtonEl = document.createElement('button');
  visualizeButtonEl.classList.add('btn', 'btn-primary', 'mb-3');
  visualizeButtonEl.onclick = () => this.openPageVisualizePlaylist(playlist.id);
  visualizeButtonEl.innerText = 'Visualize';
  containerEl.append(visualizeButtonEl);
  const headerEl = document.createElement('div');
  headerEl.classList.add('playlist-header', 'text-left', 'd-flex', 'py-3');
  headerEl.innerHTML = `
    <div class="img-header"></div>
    <div class="song-info-header px-2">Track</div>
    <div class="song-album-header px-2">Album</div>
    <div class="song-year-header px-2">Year</div>
    <div class="song-duration-header px-2">Duration</div>
  `;
  containerEl.append(headerEl);
  const listEl = document.createElement('ul');
  listEl.classList.add('songs-list', 'list-unstyled', 'w-100', 'text-left', 'px-3', 'px-lg-0');
  const songs = await spotifyFns.getSongsinPlaylist(playlist.id);
  songs.forEach((song) => {
    const itemEl = document.createElement('li');
    itemEl.classList.add('song-item', 'd-flex', 'w-100', 'align-items-center');
    itemEl.onclick = () => { ui.displaySongInfo(song, dashboards.cumulio); };
    itemEl.innerHTML = `
      <div class="song-img rounded"><img src="${song.image}"/></div>
      <div class="song-info flex-grow-1 flex-shrink-1 px-2">
        <div class="song-title text-truncate">
          <span>${song.name}</span>
          ${song.explicit ? '<span class="explicit-banner"></span>' : ''}
        </div>
        <div class="song-artist text-truncate">${song.artist}</div>
      </div>
      <div class="song-album d-none d-lg-flex text-truncate px-2">${song.album}</div>
      <div class="song-year d-none d-lg-flex px-2">${song.releaseYear}</div>
      <div class="song-duration px-2">${song.duration}</div>
    `;
    listEl.append(itemEl);
  });
  containerEl.append(listEl);
  return containerEl;
};

ui.removePlaylists = () => {
  document.querySelector('#playlists-list').innerHTML = '';
};

ui.displaySongInfo = async (song, origin) => {
  const dashboardId = (origin === dashboards.cumulio) ? dashboards.cumulio_songInfo : dashboards.kaggle_songInfo;
  const token = await getDashboardAuthorizationToken({ songId: [song.id] });
  loadDashboard(dashboardId, token.id, token.token, '#song-info-dashboard');
  songInfoModal.show();
  const modalTitle = document.querySelector('#song-info-modal-label');
  const modalPlayer = document.getElementById('song-player');
  modalPlayer.src =`https://open.spotify.com/embed/track/${song.id}`;
  modalTitle.innerText = song.artist ? `${song.name} - ${song.artist}` : `${song.name} - ${song.artist}`;
  document.getElementById('add-song-btn').onclick = async function () {
    await addToPlaylistSelector(song.name, song.id);
    modalPlayer.src = '';
    songInfoModal.hide();
    playlistModal.show();
  };
};

ui.closeSongInfoModal = () => {
  const modalPlayer = document.getElementById('song-player');
  modalPlayer.src = '';
  songInfoModal.hide();
};

/* 
  
  PAGE NAVIGATION

*/

this.openPageSongAnalytics = () => {
  toggleCustomEventListeners(true);
  ui.openPage('Songs visualized', 'songs');
  loadDashboard(dashboards.kaggle);
};

this.openPageByGenre = () => {
  ui.openPage('Songs by genre', 'by-genre');
  toggleCustomEventListeners(true);
  loadDashboard('4e745750-c474-4439-8374-b9baf7c1d894');
};

this.openPageCumulioFavorites = async () => {
  ui.openPage('Cumul.io playlist visualized', 'cumulio-playlist-viz');
  toggleCustomEventListeners(true);
  loadDashboard(dashboards.cumulio);
};

this.openPageMyPlaylistsVisualized = async () => {
  if (!user.loggedIn) return window.location.href = '/login';
  ui.openPage('Select a playlist to visualize', 'my-playlists-viz');
  const playlists = await spotifyFns.getPlaylists();
  const playlistsEl = document.getElementById('playlists-list');
  playlistsEl.innerHTML = '';
  const container = ui.generatePlaylistCards(playlists, this.openPageVisualizePlaylist);
  playlistsEl.append(container);
};

this.openPageCumulioPlaylist = async () => {
  ui.openPage('Cumul.io playlist', 'cumulio-playlist');
  const playlistEl = await ui.generatePlaylistSongList({id: CUMULIO_PLAYLIST, name: 'Cumul.io Playlist'});
  const container = document.getElementById('playlists-list');
  container.innerHTML = '';
  container.append(playlistEl);
};

this.openPageMyPlaylists = async () => {
  if (!user.loggedIn) return window.location.href = '/login';
  ui.openPage('My Playlists', 'my-playlists');
  const playlists = await spotifyFns.getPlaylists();
  const playlistsEl = document.getElementById('playlists-list');
  playlistsEl.innerHTML = '';
  const container = ui.generatePlaylistCards(playlists, this.openPagePlaylist);
  playlistsEl.append(container);
};

this.openPageVisualizePlaylist = async (playlist) => {
  ui.openPage(playlist.name || 'Playlist', 'my-playlists-viz');
  const token = await getDashboardAuthorizationToken({ playlistId: playlist.id });
  ui.removePlaylists();
  loadDashboard(dashboards.playlist, token.id, token.token);
};

this.openPagePlaylist = async (playlist) => {
  ui.openPage(playlist.name || 'Playlist', 'my-playlists');
  removeDashboard();
  const playlistEl = await ui.generatePlaylistSongList(playlist);
  const container = document.getElementById('playlists-list');
  container.innerHTML = '';
  container.append(playlistEl);
};

this.openPageInformation = async () => {
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
  
  MODAL FUNCTIONS

*/


const addToPlaylistSelector = async (name, id, artist) => {
  const playlists = await spotifyFns.getPlaylists();
  const playlistsEl = document.getElementById('add-to-playlists');
  const modalTitle = document.getElementById('playlist-modal-label');
  const songName = name || 'song';
  modalTitle.innerHTML = `Add <i><b>${songName}${artist ? ' - ' + artist : ''}</b></i> to`;
  playlistsEl.innerHTML = '';
  playlists.forEach(playlist => {
    const div = document.createElement('div');
    div.classList.add('col-6', 'col-lg-3', 'mb-3');
    div.onclick = async () => {
      const response = await spotifyFns.addToPlaylist(playlist.id, id);
      if (response.snapshot_id !== 'undefined') {
        const trackCounter = document.querySelector(`.playlist-${playlist.id} .track-counter`);
        trackCounter.textContent = `${playlist.tracks.total + 1} tracks`;
        succesfullyAddedToPlaylist(name, id, playlist);
      }
      else {
        // TODO unhappy path to create
      }
    };
    div.innerHTML = `
    <div class="playlist-${playlist.id} card playlist-card mr-1 mb-2">
      <img src="${ playlist.image ? playlist.image.url : ''}" class="card-img-top"/>
      <div class="card-body">
        <div class="card-title text-truncate">${playlist.name}</div>
        <div class="track-counter" class="card-subtitle">${playlist.tracks.total} tracks</div>
      </div>
    </div>
    `;

    playlistsEl.append(div);
  });
};

const succesfullyAddedToPlaylist = (song, id, playlist) => {
  const modalTitle = document.querySelector('#playlist-modal .modal-title');
  const modalBody = document.getElementById('add-to-playlists');
  // TODO add content & style
  modalTitle.innerText = 'Succes';
  modalBody.innerHTML = `
    <div>Succesfully added ${song} to ${playlist.name}</div>
    <button id="add-song-btn" type="button" class="btn btn-primary">Add to other playlist</button>
  `;
  document.getElementById('add-song-btn').onclick = async function () {
    await addToPlaylistSelector(song, id);
  };
};

/* 
  
  CUMUL.IO FUNCTIONS

*/

const loadDashboard = (id, key, token, container) => {
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

const removeDashboard = () => {
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
    songArtist = event.data.columns[0].value;
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
        await addToPlaylistSelector(song.name, song.id);
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
const getDashboardAuthorizationToken = async (metadata) => {
  try {
    const body = {
      access_token: spotifyParams.access_token,
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


helper.getHashParams = () => {
  const hashParams = {};
  let e;
  const r = /([^&;=]+)=?([^&;]*)/g;
  const q = window.location.hash.substring(1);
  // eslint-disable-next-line no-cond-assign
  while (e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
};

/* 
  
  SPOTIFY FUNCTIONS

*/

spotifyFns.refreshToken = () => {
  const refresh_token = spotifyParams.refresh_token;
  const access_token = spotifyParams.access_token;
  return fetch('/refresh_token', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    method: 'POST',
    body: JSON.stringify({
      refresh_token: refresh_token,
      access_token: access_token
    })
  })
    .then(res => res.json())
    .then(response => spotifyParams.access_token = response)
    .then(() => true);
};

spotifyFns.getPlaylists = async () => {
  let playlists = [];
  let response;
  do {
    response = await spotifyFns.makeSpotifyRequest(`https://api.spotify.com/v1/users/${user.id}/playlists?limit=50`, 'get');
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
};

spotifyFns.getSongsinPlaylist = async (playListId) => {
  let songs = [];
  let response;
  do {
    response = await spotifyFns.makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playListId}/tracks`, 'get');
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
};

spotifyFns.getSongInfo = (id) => {
  return spotifyFns.makeSpotifyRequest(`https://api.spotify.com/v1/tracks/${id}`, 'get')
    // eslint-disable-next-line no-console
    .then(response => console.log(response));
};

spotifyFns.makeSpotifyRequest = async (url, method) => {
  try {
    let res;
    do {
      res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${spotifyParams.access_token}`, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    while (res.status === 401 && await spotifyFns.refreshToken());
    return await res.json();
  }
  // eslint-disable-next-line no-console
  catch (err) { console.log(err); }
};

spotifyFns.addToPlaylist = async (playlistId, songId) => {
  return spotifyFns.makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?uris=spotify%3Atrack%3A${songId}`, 'post')
    .then(response => { return response; });
};