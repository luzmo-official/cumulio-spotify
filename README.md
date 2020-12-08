# cumulio-spotify

cuMusicalio is an app that integrates a Cumul.io dashboards that displays playlist and song analytics. Users have the choice of  logging in to their Spotify account abd use the dashboards to add songs to their own Spotify playlists, or create dashboards for their own playlists. 

This project is a demonstration of how Cumul.io `Custom Events` can be used for bidirectional communication between Cumul.io and your own platform. The 2 main events here are:
1. Add to Playlist: Where you can add a song to one of your own playlists by selecting it from the chart
2. Song Info: Where you can select a song to display a `drill-through` dashboard that displays in detail information on the song's acoustincness, danceablity and energy.

### Resources
* [Spotify Developer API](https://developer.spotify.com/)
* [Cumul.io](https://cumul.io/main)
* [Custom Events](https://academy.cumul.io/article/a1gwnpc6)


### To run:
1. `npm install`
2. Create a `.env` file in the root directory and add the following from your [Cumul.io](https://cumul.io/main) and [Spotify Developer](https://developer.spotify.com/) accounts:
 
 From Cumul.io:
 ```
 CUMULIO_API_KEY=xxx
 CUMULIO_API_TOKEN=xxx
 ```
 From Spotify:
 ```
 SPOTIFY_CLIENT_ID=xxx
 SPOTIFY_CLIENT_SECRET=xxx
 SPOTIFY_REDIRECT_URI=xxx
 ACCESS_TOKEN=xxx
 REFRESH_TOKEN=xxx
 ```
3. `npm run start`
4. On your browser, go to `http://localhost:3000/` and Login to your Spotify account 🥳

Note: You do not have to rebuild every time you make a change to this once it's running. Just refresh your browser!