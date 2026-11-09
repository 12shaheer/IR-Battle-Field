# Railway deployment

Both mobile apps use the same DropZone backend:

- Project: `dropzone` (`8822424e-6c66-493f-97e7-71e9413ef59f`)
- Service: `dropzone-server` (`b6a15e1b-2e1c-473c-b573-bb8ae9f5b354`)
- Environment: `production` (`d69af80a-31b5-4933-8cb9-04766f6fee10`)
- HTTPS: `https://dropzone-server-production-f2d2.up.railway.app`
- WebSocket: `wss://dropzone-server-production-f2d2.up.railway.app`
- Health check: `GET /health`

Client endpoints are in `dropzone-app/src/utils/firebase.js` and
`dropzone-gm/src/utils/api.js`. Reload the development apps or build new APKs
to apply endpoint changes to installed release apps.

The Railway service settings use `npm start`, health check `/health` with a
60-second timeout, restart on failure (10 retries), one replica, and no application
sleeping. The public domain targets port 8080. The server listens on Railway's
`PORT` environment variable, falling back to 3001 locally.

From `local-server/`, link and deploy only this server directory:

```sh
railway link --project 8822424e-6c66-493f-97e7-71e9413ef59f --environment production --service dropzone-server
railway up . --path-as-root --service dropzone-server
```

This deployment is uploaded through the CLI; GitHub automatic deployments are
not configured. GM and player apps run on phones and connect to this shared service.

Sessions and registered users are currently held in server memory. They are not
transferred from the old account and reset when the server restarts or redeploys.
Keep one replica until persistent shared storage is implemented. The old Railway
account/service has not been modified.
