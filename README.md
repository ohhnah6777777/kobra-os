# kobra os

assets: 1. Simple Proxy (Streaming / Request Proxy)
GitHub Repository: https://github.com/ohhnah6777777/simple-proxy
Deployed Cloudflare Worker: https://simple-proxy.sweatyballslove.workers.dev/
Version Reference: Simple Proxy v2.2.0
Environment Variable: SIMPLE_PROXY_URL=https://simple-proxy.sweatyballslove.workers.dev/
2. Media Provider Engine
GitHub Repository: https://github.com/sussy-code/providers
NPM Package Reference: @movie-web/providers
Purpose: Media source scraping and normalization layer for streams and HLS playlists.
3. P-Stream Backend (Account Sync & Multi-Device State)
Backend Repository: https://github.com/p-stream/backend
Documentation Repository: https://github.com/p-stream/docs
Purpose: Reference for v2 account synchronization (12-word recovery passphrase, syncing My List, Continue Watching, and playback progress).
4. TMDB Metadata & Posters (Movie / TV Catalog)
API Documentation: https://developer.themoviedb.org/docs/getting-started
Base URL: https://api.themoviedb.org/3
Environment Variable: TMDB_API_KEY
Purpose: Movie/show posters, backdrops, cast, overviews, ratings, seasons, and episodes.
5. Games App Assets (from your earlier request)
GitHub Repository: https://github.com/ohhnah6777777/chickengames
Purpose: Catalog data (games.json, descriptions.json), icons, and game iframe player routes.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/af14e086-5cbc-400b-9349-1f3b62442b21).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
