# RCTV 19 local broadcaster

Prepared for the separate Windows computer that will ultimately run the RCTV 19 vMix/OBS feed. A manually started, isolated live helper is also available on the development PC for authorized testing. No RCTV 19 startup/recovery task has been installed yet; see ../../STORE-STATUS.md for the current snapshot.

## Isolated paths and ports

- Private runtime: %USERPROFILE%\.rctv19-streaming. RCTV_BROADCAST_DIRECTORY may select another absolute, non-OneDrive private folder whose basename begins with rctv19.
- Live credential: r2.env in that folder; bucket must be rctv19-live.
- Replay credential: vod.env in that folder; bucket must be rctv19-vod.
- RTMP: 127.0.0.1:19360, path rctv19.
- Local HLS: 127.0.0.1:18898.
- Helper status: 127.0.0.1:19361.
- Recovery task: RCTV 19 Broadcast Recovery; mutex: Local\RCTV19Launch-<user SID>.

## Commission on the actual encoder PC

1. Install a supported Node.js runtime, project dependencies, official MediaMTX and FFmpeg. The receiver expects .cache/mediamtx/mediamtx.exe unless MEDIAMTX_PATH explicitly names the installed binary. Keep this project in its own folder.
2. Create the private runtime folder and restrict its Windows ACL to the broadcaster user and SYSTEM. On Windows, Node file modes alone do not configure these ACLs.
3. Run node scripts/configure-local.mjs once on that computer. It creates an authenticated loopback receiver and a private vmix-settings.txt. It refuses to replace existing configuration.
4. Set the intended R2_ACCOUNT_ID, then run node scripts/setup-r2-local.mjs. Its short-lived local page saves a live-bucket-only key. For the separate replay key, set R2_SETUP_BUCKET=rctv19-vod before running that importer. Neither key is printed or committed.
5. Run deploy/local/start-broadcast.ps1 -ValidateOnly, then start-broadcast.ps1. Enter the private settings in vMix/OBS on that same computer. No port forwarding is needed. Use H.264 video and AAC audio; retain the desired picture/audio quality and a two-second keyframe interval.
6. Check real incoming frames, fresh public HLS, and playback with sound on the website and TV devices. A listening port alone does not prove video is live.
7. Only after the stream is verified, run install-broadcast-recovery.ps1 on that encoder PC. It installs the windowless current-user recovery check at sign-in and every minute. Windows must be signed in, awake and connected; this is not a boot-time service.

stop-broadcast.ps1 intentionally pauses the helper and automatic recovery. start-broadcast.ps1 resumes it. These scripts target only this installation's RCTV 19 paths and processes.

The publish-show.ps1 desktop form prepares, reviews, uploads and publishes replays. It uses this channel's private vod.env and watch.rctv19.com catalog. A show requires a unique title, real media and an explicit publish confirmation. Cloudflare deployment access must already be configured on the publishing computer. FFMPEG and FFPROBE can explicitly select encoder tool paths.
