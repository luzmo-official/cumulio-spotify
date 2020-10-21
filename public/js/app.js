/* 
  
  STATE

*/

const user = { loggedIn: false };
let playerStatus = { playing:false };
const playLists = [];
let currentPlaylist = { songs:[] };
let currentSong = {};
let customEventsActive = false;
let activeDashboard = null;
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
  loadSongs();
}

/* 
  
  AUTHENTICATION

*/

const login = async () => {
};

const logout = () => {
};

const setUserDetails = (user) => {
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
  loadDashboard();
}

const loadByGenre = () => {
  openPage('Songs by genre', 'by-genre');
  toggleCustomEventListeners(true);
  loadDashboard();
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

const loadMyPlaylists = () => {
  openPage('My Playlists', 'my-playlists');
  removeDashboard();
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
  console.log(customEventsActive, boolean)
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

const setTitle = (title) => {
  document.querySelector('#page-title').innerText = title;
}

const setActiveMenuItem = (name) => {
  const listItems = document.querySelectorAll('#menu-list li');
  listItems.forEach((el) => el.classList.remove('active'));
  document.querySelector(`#menu-list li[menu-item="${name}"]`).classList.add('active');
}


/* 
  
  SPOTIFY FUNCTIONS

*/

const getPlaylists = () => {

}

const getSongInfo = (id) => {

}

const playPlaylist = (id) => {

}

const playSong = (id) => {

}

const pauseSong = (id) => {

}

const nextSong = (id) => {

}

const previousSong = (id) => {

}

const addToPlaylist = (ids, playlistId) => {
  playlistModal.show();
}