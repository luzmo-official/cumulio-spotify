import {removeDashboard} from './app.js';

const playlistModal = new bootstrap.Modal(document.getElementById('playlist-modal'), {});
const songInfoModal = new bootstrap.Modal(document.getElementById('song-info-modal'), {});

class UI {

  constructor(spotify){
    this.spotify = spotify;
  }

  toggleMenu(boolean) {
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
  }
  
  openPage(title, name) {
    const t = this;
    t.setTitle(title);
    t.setActiveMenuItem(name);
    t.toggleMenu(false);
    removeDashboard();
  }
  
  setLoginStatus(boolean, res) {
    const t = this;
    if (res) t.spotify.user = res;
    const loginBtnEl = document.getElementById('login-btn');
    const smallLoginBtnEls = document.querySelectorAll('.login-btn-small');
    const guardedEls = document.querySelectorAll('.guarded');
    const userEl = document.getElementById('user');
    const userImgEl = document.getElementById('user-img');
    const userLetterEl = document.getElementById('user-letter');
    if (boolean) {
      t.spotify.user.loggedIn = true;
      loginBtnEl.classList.add('d-none');
      userEl.classList.remove('d-none');
      smallLoginBtnEls.forEach((d) => d.classList.add('d-none'));
      guardedEls.forEach((d) => d.classList.remove('guarded'));
      userLetterEl.innerText = t.spotify.user && t.spotify.user.display_name ? t.spotify.user.display_name.substring(0, 1) : '';
      if (t.spotify.user.images && t.spotify.user.images.length > 0) {
        userImgEl.classList.remove('d-none');
        userImgEl.src = t.spotify.user.images[0].url;
      }
      else userImgEl.classList.add('d-none');
    }
    else {
      userEl.classList.add('d-none');
      loginBtnEl.classList.remove('d-none');
      smallLoginBtnEls.forEach((d) => d.classList.remove('d-none'));
    }
  }
  
  setTitle(title) {
    document.querySelector('#page-title').innerText = title;
  }
  
  setActiveMenuItem(name) {
    const listItems = document.querySelectorAll('.menu-item');
    listItems.forEach((el) => el.classList.remove('active'));
    document.querySelector(`.menu-item[menu-item="${name}"]`).classList.add('active');
  }
  
  generatePlaylistCards(playlists, callback) {
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
  }
  
  async generatePlaylistSongList(playlist, callback) {
    const t = this;
    const containerEl = document.createElement('div');
    containerEl.classList.add('w-100', 'text-right');
    const visualizeButtonEl = document.createElement('button');
    visualizeButtonEl.classList.add('btn', 'btn-primary', 'mb-3');
    visualizeButtonEl.onclick = () => callback(playlist);
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
    const songs = await t.spotify.getSongsinPlaylist(playlist.id);
    songs.forEach((song) => {
      const itemEl = document.createElement('li');
      itemEl.classList.add('song-item', 'd-flex', 'w-100', 'align-items-center');
      itemEl.onclick = () => { this.displaySongInfo(song); };
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
  }
  
  removePlaylists() {
    document.querySelector('#playlists-list').innerHTML = '';
  }
  
  async addToPlaylistSelector (name, id, artist) {
    const t = this;
    const playlists = await t.spotify.getPlaylists();
    const playlistsEl = document.getElementById('add-to-playlists');
    const modalTitle = document.getElementById('playlist-modal-label');
    const songName = name || 'song';
    modalTitle.innerHTML = `Add <i><b>${songName}${artist ? ' - ' + artist : ''}</b></i> to`;
    playlistsEl.innerHTML = '';
    playlists.forEach(playlist => {
      const div = document.createElement('div');
      div.classList.add('col-6', 'col-lg-3', 'mb-3');
      div.onclick = async () => {
        const response = await t.spotify.addToPlaylist(playlist.id, id);
        if (response.snapshot_id !== 'undefined') {
          const trackCounter = document.querySelector(`.playlist-${playlist.id} .track-counter`);
          trackCounter.textContent = `${playlist.tracks.total + 1} tracks`;
          t.succesfullyAddedToPlaylist(name, id, playlist);
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
    playlistModal.show();
  }
  
  succesfullyAddedToPlaylist(song, id, playlist){
    const t = this;
    const modalTitle = document.querySelector('#playlist-modal .modal-title');
    const modalBody = document.getElementById('add-to-playlists');
    playlistModal._dialog.classList.remove('modal-lg');

    modalTitle.innerText = 'Succes';
    modalBody.innerHTML = `
    <div id="success-info">
      <div>Succesfully added <b><i>${song}</i></b> to <b>${playlist.name}</b>!</div>
      <button id="add-song-again-btn" type="button" class="btn btn-primary">Add to other playlist</button>
    </div>
    `;
    document.getElementById('add-song-again-btn').onclick = async function () {
      if (!playlistModal._dialog.classList.contains('modal-lg')) {
        playlistModal._dialog.classList.add('modal-lg');
      }
      await t.addToPlaylistSelector(song, id);
    };
  }

  resetModalWidth() {
    if (!playlistModal._dialog.classList.contains('modal-lg')) {
      playlistModal._dialog.classList.add('modal-lg');
    }
  }

  async displaySongInfo(song) {
    const t = this;
    songInfoModal.show();
    const modalTitle = document.querySelector('#song-info-modal-label');
    const modalPlayer = document.getElementById('song-player');
    modalPlayer.src =`https://open.spotify.com/embed/track/${song.id}`;
    modalTitle.innerText = song.artist ? `${song.name} - ${song.artist}` : `${song.name}`;
    document.getElementById('add-song-btn').onclick = async function () {
      await t.addToPlaylistSelector(song.name, song.id);
      modalPlayer.src = '';
      songInfoModal.hide();
      playlistModal.show();
    };
  }
  
  closeSongInfoModal() {
    const modalPlayer = document.getElementById('song-player');
    modalPlayer.src = '';
    songInfoModal.hide();
  }
}

export {UI};