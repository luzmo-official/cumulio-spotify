/* 
  
  STATE

*/


let user = {};
let spotifyParams = {};
let playerStatus = { playing: false };
const playLists = [];
let currentPlaylist = { songs: [] };
let currentSong = {};
let customEventsActive = false;
let activeDashboard = null;
let dashboardId = '8edf0005-6493-48e1-9689-5740a1829cdd';
let dashboards = {
  playlist: '12c7c734-562e-4f8f-9500-16dc59c38adc',
  cumulio: 'f3555bce-a874-4924-8d08-136169855807'
};
let activeToken = {};
const playlistModal = new bootstrap.Modal(document.getElementById('playlist-modal'), {});
const songInfoModal = new bootstrap.Modal(document.getElementById('song-info-modal'), {});

const dashboardOptions = {
  dashboardId: dashboardId,
  container: '#dashboard-container',
  loader: {
    background: '#111b31',
    spinnerColor: '#f44069',
    spinnerBackground: '#0d1425',
    fontColor: '#ffffff'
  }
}

/* 
  
  START

*/

window.onload = async () => {
  getUserData();
  loadSongs();
}

/* 
  
  NAVIGATION

*/

const toggleMenu = (boolean) => {
  if (boolean) {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('open');
  }
  else {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
  }
}

const openPage = (title, name) => {
  setTitle(title);
  setActiveMenuItem(name);
  toggleMenu(false);
}

// load the song analytics page
const loadSongs = () => {
  console.log("trying to load default page");
  toggleCustomEventListeners(true);
  openPage('Songs visualized', 'songs');
  loadDashboard('8edf0005-6493-48e1-9689-5740a1829cdd');
}

const loadByGenre = () => {
  openPage('Songs by genre', 'by-genre');
  toggleCustomEventListeners(true);
  loadDashboard('4e745750-c474-4439-8374-b9baf7c1d894');
}

const loadMyPlaylistsVisualized = () => {
  if (!user.loggedIn) return window.location.href = '/login';
  openPage('My playlists visualized', 'my-playlists-viz');
  removeDashboard();
}

const loadCumulioFavorites = async () => {
  openPage('Cumul.io playlist visualized', 'cumulio-playlist-viz');
  toggleCustomEventListeners(true);
  removeDashboard();
  console.log("Trying to load " + dashboards['cumulio']);
  loadDashboard(dashboards['cumulio']);
}

const loadCumulioPlaylist = () => {
  openPage('Cumul.io playlist', 'cumulio-playlist');
  removeDashboard();
}
const loadMyPlaylist = () => {
  if (!user.loggedIn) return window.location.href = '/login';
  openPage('My playlists', 'my-playlists');
  removeDashboard();
}

const addToPlaylistSelector = async (id, msg) => {
  let playlists = await getPlaylists();
  let playlistsEl = document.querySelector('#add-to-playlists');
  let modalTitle = document.querySelector('#playlist-modal-label');
  modalTitle.innerText = msg || 'Chose a playlist to add song to';
  playlistsEl.innerHTML = '';
  playlists.forEach(playlist => {
    let div = document.createElement('div');
    div.classList.add('col-6', 'col-lg-3');
    div.onclick = async () => {
      const response = await addToPlaylist(playlist.id, id);
      if(response.snapshot_id !== 'undefined')
      {
        const trackCounter = document.getElementById("track-counter");
        trackCounter.textContent = `${playlist.tracks.total + 1} tracks`;
      }
    };
    div.innerHTML = `
    <div class="card playlist-card mr-1 mb-2">
      <img src="${ playlist.image ? playlist.image.url : ''}" class="card-img-top"/>
      <div class="card-body">
        <div class="card-title text-truncate">${playlist.name}</div>
        <div id="track-counter" class="card-subtitle">${playlist.tracks.total} tracks</div>
      </div>
    </div>
    `
    playlistsEl.append(div);
  });
}

const loadMyPlaylists = async () => {
  openPage('My Playlists', 'my-playlists');
  removeDashboard();
  let playlists = await getPlaylists();
  let playlistsEl = document.querySelector('#playlists-list');
  playlistsEl.innerHTML = '';
  playlists.forEach(playlist => {
    let div = document.createElement('div');
    div.classList.add('card', 'ml-1', 'mr-1', 'mb-2', 'playlist-card');
    div.onclick = () => {selectPlaylist(playlist.id)};
    div.innerHTML = `
    <img src="${ playlist.image ? playlist.image.url : ''}" class="card-img-top"/>
    <div class="card-body">
      <h5 class="card-title">${playlist.name}</h2>
      <h6 class="card-subtitle">${playlist.tracks.total} tracks</p>
    </div>
    `
    playlistsEl.append(div);
  });
}

const selectPlaylist = async (id) => {
  let token = await getDashboardAuthorizationToken({playlist_id: id});
  showPlaylistDashboard(token);
}

const showPlaylistDashboard = async (token) => {
  removePlaylists();
  loadDashboard(dashboards['playlist'], token.id, token.token);
}

/* 
  
  CUMUL.IO FUNCTIONS

*/

const loadDashboard = (id, key, token, container) => {
  if (id) {
    dashboardOptions.dashboardId = id;
  }
  activeToken = null; // Reset active dashboard token
  //use container if available
  if (container) {
    dashboardOptions.container = container;
  }
  // use tokens if available
  if (key && token) {
    dashboardOptions.key = key;
    dashboardOptions.token = token;
    activeToken = { key: key, token: token };
  }

  // add the dashboard to the #dashboard-container element
  activeDashboard = Cumulio.addDashboard(dashboardOptions);
}

const removeDashboard = () => {
  Cumulio.removeDashboard(activeDashboard)
}

const toggleCustomEventListeners = (boolean) => {
  if (customEventsActive && !boolean) {
    Cumulio.offCustomEvent()
  }
  else if (!customEventsActive && boolean) {
    Cumulio.onCustomEvent(async (event) => {
      if(event.data.event === "add_to_playlist") {
        console.log("want to add to playlist");
        getSongUri(event.data.name.id);
        await addToPlaylistSelector(event.data.name.id.split("&id=")[1]);
        playlistModal.show();
      }
      else if(event.data.event === "song_info") {
        await displaySongInfo(event.data.name.id.split("&id=")[1]);
      }
    })
  }
  customEventsActive = boolean;
}

// Function to retrieve the dashboard authorization token from the platform's backend
const getDashboardAuthorizationToken = async (metadata) => {
  try {
    // Get the platform access credentials from the current logged in user
    // const accessCredentials = await auth0.getTokenSilently();

    let body = {
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
    const response = await fetch(`/authorization`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'}
    });

    // Fetch the JSON result with the Cumul.io Authorization key & token
    const responseData = await response.json();
    return responseData;
  }
  catch (e) {
    // Display errors in the console
    console.error(e);
    return { error: 'Could not retrieve dashboard authorization token.' };
  }
};


/* 
  
  HELPER FUNCTIONS

*/

const removePlaylists = () => {
  document.querySelector('#playlists-list').innerHTML = '';
}


const getHashParams = () => {
  const hashParams = {};
  let e;
  let r = /([^&;=]+)=?([^&;]*)/g;
  let q = window.location.hash.substring(1);
  while (e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

const setTitle = (title) => {
  document.querySelector('#page-title').innerText = title;
}

const setActiveMenuItem = (name) => {
  const listItems = document.querySelectorAll('#menu-list li');
  listItems.forEach((el) => el.classList.remove('active'));
  document.querySelector(`#menu-list li[menu-item="${name}"]`).classList.add('active');
}

const setLoginStatus = (boolean, res) => {
  if (res) user = res;
  const loginBtnEl = document.getElementById('login-btn');
  const smallLoginBtnEls = document.querySelectorAll('.login-btn-small');
  const guardedEls = document.querySelectorAll('.guarded');
  const userEl = document.getElementById('user');
  const userImgEl = document.getElementById('user-img');
  const userLetterEl = document.getElementById('user-letter');
  if (boolean) {
    user.loggedIn = true
    loginBtnEl.classList.add('d-none');
    userEl.classList.remove('d-none');
    smallLoginBtnEls.forEach((d) => d.classList.add('d-none'));
    guardedEls.forEach((d) => d.classList.remove('guarded'));
    userLetterEl.innerText = user && user.display_name ? user.display_name.substring(0,1) : '';
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
}

const getSongUri = async (songName) => {
  if (activeToken) {
    // If we have an active token we used our plugin as a data source.
    // Let's re-use the token when fetching the song's ID so we don't need to
    // create an authorization token twice.
    let data = await makeCumulioRequest('data', {
      key: activeToken.key,
      token: activeToken.token,
      action: 'get',
      find: {
        dimensions: [{
          column_id: '',
          dataset_id: ''
        }],
        where: [{
          expression: '? = ?',
          parameters: [
            {
              column_id: '',
              dataset_id: ''
            },
            songName
          ]
        }]
      }
    });
    console.log(data);
  }
  else {
    // No active token -> using a public dashboard. The only way to get the song ID is via backend.
    let res = await fetch(`song_uri?songName=${songName}&type=cumulioplaylist`)
    res = await res.json();
    console.log(res);
  }
}

const makeCumulioRequest = async (endpoint, payload) => {
  const apiURL = 'https://api.cumul.io/0.1.0/';
  payload.version = '0.1.0';
  let res = await fetch(apiURL + endpoint, {
    method: 'POST',
    headers: {'Content-type': 'application/json'},
    body: JSON.stringify(payload)
  });
  return await res.json();
}

/* 
  
  SPOTIFY FUNCTIONS

*/

const getUserData = () => {
  spotifyParams = getHashParams();
  if (!spotifyParams.access_token) {
    return setLoginStatus(false);
  }
  makeSpotifyRequest('https://api.spotify.com/v1/me', 'get')
    .then(response => {
      if (response.error) {
        setLoginStatus(false);
      }
      else {
        console.log(response, 'RR')
        setLoginStatus(true, response);
      }
    });
}

const refreshToken = () => {
  refresh_token = spotifyParams.refresh_token;
  let access_token = spotifyParams.access_token;
  return fetch(`/refresh_token`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    method: 'POST',
    body: JSON.stringify({
      refresh_token: refresh_token,
      access_token: access_token
    })
  })
    .then(res => res.json())
    .then(response => {
      spotifyParams.access_token = response;
    })
    .then(() => {
      return true;
    });
}

const getPlaylists = async () => {
  let playlists = [];
  let response;
  do {
    response = await makeSpotifyRequest(`https://api.spotify.com/v1/users/${user.id}/playlists?limit=50`, 'get');
    playlists = playlists.concat(response.items.map(item => {
      return {
        image: item.images.find(img => img.height === 300 || img.height > 300 || img.url !== null),
        name: item.name,
        tracks: item.tracks,
        uri: item.uri,
        id: item.id
      }
    }));
  }
  while (!response.next === null);
  return playlists;
}

const getSongInfo = (id) => {
  return makeSpotifyRequest(`https://api.spotify.com/v1/tracks/${id}`, 'get')
    .then(response => console.log(response));
}

const playPlaylist = (id) => {
  return makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${id}`, 'get')
    .then(response => console.log(response));
}

const playSong = (id) => {
  return makeSpotifyRequest(`https://api.spotify.com/v1/tracks/${id}`, 'get')
    .then(response => console.log(response));
}

const pauseSong = (id) => {

}

const nextSong = (id) => {

}

const previousSong = (id) => {

}

const makeSpotifyRequest = async (url, method) => {
  try {
    let res;
    do {
      console.log("URL: " + url);
      res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${spotifyParams.access_token}`, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    while (res.status === 401 && await refreshToken());

    return await res.json();
  }
  catch (err) {
    console.log(err);
  }
}

const addToPlaylist = async (playlist_id, song_id) => {
  console.log("Attempting to add song id: " + song_id + " to " + playlist_id);
  return makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks?uris=spotify%3Atrack%3A${song_id}`, 'post')
    .then(response => {return response;});
  //await loadPlaylistSelector();
  //playlistModal.show();
}

const displaySongInfo = async (song_id) => {
  let token = await getDashboardAuthorizationToken({song_id: [song_id]});
  loadDashboard("e92c869c-2a94-406f-b18f-d691fd627d34", token.id, token.token, "#song-info-dashboard");
  songInfoModal.show();
  document.getElementById("add-song-btn").onclick = async function() {
    await addToPlaylistSelector(song_id);
    songInfoModal.hide();
    //TODO: these modals should pottentially be one? And then we only add to the internal div. 
    //This needs to shaw the playlists modal which you can then use to add your song to
    //Back functionality to go back to song info
    playlistModal.show();
  }
}