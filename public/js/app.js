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
let access_token;
// let refresh_token;
let dashboardId = '8edf0005-6493-48e1-9689-5740a1829cdd';
const playlistModal = new bootstrap.Modal(document.getElementById('playlist-modal'), {});
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
  openPage('My playlists visualized', 'my-playlists-viz');
  removeDashboard();
}

const loadCumulioFavorites = () => {
  openPage('Cumul.io playlist visualized', 'cumulio-playlist-viz');
  toggleCustomEventListeners(true);
  removeDashboard();
}

const loadCumulioPlaylist = () => {
  openPage('Cumul.io playlist', 'cumulio-playlist');
  removeDashboard();
}

const loadMyPlaylists = async () => {
  openPage('My Playlists', 'my-playlists');
  removeDashboard();
  let playlists = await getPlaylists();
  let playlistsDiv = document.querySelector('#playlists-list');
  playlistsDiv.innerHTML = '';
  playlists.forEach(playlist => {
    let div = document.createElement('div');
    div.classList.add('card', 'ml-1', 'mr-1', 'mb-2', 'playlist-card');
    div.onclick = selectPlaylist(playlist.id);
    div.innerHTML = `
    <img src="${ playlist.image ? playlist.image.url : ''}" class="card-img-top"/>
    <div class="card-body">
      <h5 class="card-title">${playlist.name}</h2>
      <h6 class="card-subtitle">${playlist.tracks.total} tracks</p>
    </div>
    `
    playlistsDiv.append(div);
  });
}

/* 
  
  CUMUL.IO FUNCTIONS

*/

const loadDashboard = (id, key, token) => {
  if (id) {
    dashboardOptions.dashboardId = id;
  }
  // use tokens if available
  if (key && token) {
    dashboardOptions.key = key;
    dashboardOptions.token = token;
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
    Cumulio.onCustomEvent((event) => {
      addToPlaylist();
      console.log(event);
    })
  }
  customEventsActive = boolean;
}

// Function to retrieve the dashboard authorization token from the platform's backend
const getDashboardAuthorizationToken = async () => {
  try {
    // Get the platform access credentials from the current logged in user
    const accessCredentials = await auth0.getTokenSilently();
    /*
      Make the call to the backend API, using the platform user access credentials in the header
      to retrieve a dashboard authorization token for this user
    */
    const response = await fetch('/authorization', {
      headers: new Headers({
        Authorization: `Bearer ${accessCredentials}`
      })
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
  if (boolean) {
    document.querySelector('#login-btn').classList.add('d-none');
    user = { ...user, ...res };
    console.log(user)
    document.getElementById('user-name').textContent = user.display_name;
    if (user.images && user.images.length > 0) {
      document.getElementById('user-img').src = user.images[0].url;
    }
    else {

    }
  }
  else {
    document.querySelector('#login-btn').classList.remove('d-none');
  }
}


/* 
  
  SPOTIFY FUNCTIONS

*/

const getUserData = () => {
  spotifyParams = getHashParams();
  if (!spotifyParams.access_token) {
    return setLoginStatus(false);
  }
  makeSpotifyRequest('https://api.spotify.com/v1/me')
    .then(response => {
      if (response.error) {
        setLoginStatus(false);
      }
      else {
        setLoginStatus(true, response);
      }
    });
}

const getRefreshToken = () => {
  refresh_token = getHashParams().refresh_token;
  return fetch(`/refresh_token`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    method: 'POST',
    body: JSON.stringify({
      refresh_token: refresh_token
    })
  })
    .then(res => res.json())
    .then(response => {
      access_token = response.access_token;
      // oauthPlaceholder.innerHTML = oauthTemplate({
      //   access_token: access_token,
      //   refresh_token: refresh_token
      // });
    })
}

const getPlaylists = () => {
  return makeSpotifyRequest(`https://api.spotify.com/v1/users/${user.id}/playlists`)
    .then(response => {
      return response.items.map(item => {
        return {
          image: item.images.find(img => img.height === 300 || img.height > 300),
          name: item.name,
          tracks: item.tracks,
          uri: item.uri,
          id: item.id
        }
      });
    });
}

const getSongInfo = (id) => {
  return makeSpotifyRequest(`https://api.spotify.com/v1/tracks/${id}`)
    .then(response => console.log(response));
}

const playPlaylist = (id) => {
  return makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${id}`)
    .then(response => console.log(response));
}

const playSong = (id) => {
  return makeSpotifyRequest(`https://api.spotify.com/v1/tracks/${id}`)
    .then(response => console.log(response));
}

const pauseSong = (id) => {

}

const nextSong = (id) => {

}

const previousSong = (id) => {

}

const makeSpotifyRequest = async (url) => {
  if (!access_token) access_token = spotifyParams.access_token;
  try {
    let res;
    do {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json; charset=utf-8' }
      });
      if (res.status === 401) await getRefreshToken();
    }
    while (res.status === 401)
    
    return await res.json();
  }
  catch (err) {
    console.log(err);
  }
}

const addToPlaylist = (ids, playlistId) => {
  playlistModal.show();
}