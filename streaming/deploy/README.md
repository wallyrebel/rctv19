# RCTV 19 deployment

The website and catalog can be deployed independently of the live encoder. The intended public endpoints are watch.rctv19.com, live.rctv19.com/rctv19/index.m3u8 and vod.rctv19.com. Configuration files do not establish that these endpoints are ready; verify the actual deployment before sharing links.

The broadcaster will be a different computer from the current development PC. Use local/README.md when that computer is available. A later shared rented VM is covered by live/README.md. No receiver, uploader, startup task or stream key is installed by copying this project.

Use dedicated rctv19-live and rctv19-vod buckets with separate bucket-scoped upload credentials. No credential belongs in Git. Apply deploy/r2-cors.json to each public bucket and use its custom domain for playback. Configure automatic deletion only for the temporary live buffer, never for the replay library. Confirm retention and cache headers on real objects before continuous operation.

The same catalog/rctv19.json drives the web player and TV apps. Publish a completed replay only after all referenced objects are uploaded and publicly verified. Changing a catalog does not itself submit an app-store build.
