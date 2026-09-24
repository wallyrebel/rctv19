# Future rented ingest server

This template is prepared for RCTV 19 only. It has not been run on a VM. The current plan is first to commission the separate local encoder PC, then move ingest to a shared rented VM when that server is selected. Do not run server configuration or Docker services on the current development PC as part of copying these files.

The video flow remains vMix/OBS -> authenticated RTMPS -> MediaMTX -> HLS uploader -> rctv19-live -> the same public URL in the website and apps. Media is repackaged without transcoding. The live master-playlist optimization is preserved.

## Standalone RCTV 19 template

1. On the selected Linux server, create a private directory such as /var/lib/rctv19. Set owner-only permissions. Save actual configuration in a private server.env based on .env.example. Configure a DNS-only ingest hostname to the server; do not change rctv19.com's existing website records.
2. Set RCTV_BROADCAST_DIRECTORY to that same private directory. Run node --env-file=/var/lib/rctv19/server.env scripts/configure-live.mjs from the project root. It creates server/mediamtx.json and server/traefik.json with exclusive creation; it does not replace existing secrets. Provide a unique RCTV_PUBLISH_PASSWORD. Credentials are not printed.
3. Put the rctv19-live bucket-only upload key in /var/lib/rctv19/r2.env. Use a separate vod.env for replay uploads. Configure live.rctv19.com for the live bucket and vod.rctv19.com for replays, with public read CORS and suitable playlist/segment cache behavior. Confirm lifecycle expiration on the live bucket only.
4. From deploy/live, use docker compose --env-file=/var/lib/rctv19/server.env config to inspect the resolved configuration, then start it only on the authorized server. This standalone template requires public TCP 80 for certificate issuance and TCP 19366 for RCTV 19 RTMPS. It exposes no raw RTMP, HLS or admin API port. Do not print the resolved config into shared logs because it can contain credentials.
5. Encoder server: rtmps://ACTUAL-INGEST-HOST:19366/. Stream key: rctv19?user=ENCODED-USER&pass=ENCODED-PASSWORD. Use the actual supplied credentials, URL-encoded. Verify the URL split with vMix/OBS. Public viewers use https://live.rctv19.com/rctv19/index.m3u8.

## Sharing one VM across channels

Use one shared TLS/certificate proxy and an authenticated MediaMTX path or isolated container stack for each channel. Assign RCTV 19 its own publisher and rctv19 path, HLS volume, credentials and R2 bucket. Other channels retain their own paths and keys; viewers do not change links when ingest moves.

Do not start multiple copies of this standalone TLS service on the same VM: only one service can own host port 80. The shared proxy configuration must be merged after the other channels' ingest hostnames and VM are known. RTMP can share one listener using different authenticated stream paths, or use distinct listener ports if operational separation is preferred. The RCTV compose project is named rctv19-ingest so its volumes and network do not reuse another channel's project.

Before cutover, test encoder reconnect, receiver/uploader restarts, TLS renewal, stale-input detection, complete HLS segment publication, real TV playback and a sustained 24-hour run. Keep the existing FrontLayer broadcast available during that transition. Neither these templates nor a VM rental creates a 24/7 content schedule; the user's local vMix/OBS instance remains the source.
