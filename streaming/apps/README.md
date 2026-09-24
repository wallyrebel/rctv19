# RCTV 19 television apps

These are separate RCTV 19 sources. They do not update or sign the Mississippi Sports apps, and do not automatically replace the apps published by FrontLayer.

Both apps load `https://watch.rctv19.com/api/catalog.json`. The home screen contains a live tile and a tile for each show. The `category` on each video determines its show; the first episode's optional `seriesThumbnail` supplies that show's cover, falling back to its `thumbnail`. Each episode keeps its own `thumbnail`.

## Roku

From the streaming directory, run `npm run build:roku`. The unsigned sideload package is `dist/rctv19-roku-dev.zip`. The initial manifest version is 1.0.0. Roku packaging for distribution requires the intended RCTV signing identity and a device; this source setup does not generate, replace, or use a signing key.

Retained behavior includes remote navigation, grouped show/episode artwork, live and replay playback, local replay bookmarks and Resume, content-ID deep links, and catalog refresh with the star button. Supply HD and SD BIF files for long replays. Verify these behaviors with RCTV media on a Roku before submission.

## Amazon Fire TV / Fire OS

The Android application ID is `com.rctv19.tv`; the initial version is 1.0.0 (1). This is a proposed new RCTV app identity, not an assertion that an existing store listing is owned by this developer. Confirm the appropriate listing before uploading.

Use JDK 17, Gradle 8.13 and Android SDK 35. Set `ANDROID_HOME` to the SDK directory, or create an ignored `local.properties` containing its `sdk.dir`. From `apps/fire-tv`, run:

```text
gradle :app:assembleRelease :app:lintRelease
```

The release APK is unsigned at `app/build/outputs/apk/release/app-release-unsigned.apk`. There is no release signing configuration or key in the source. A development build can be made with `:app:assembleDebug` for emulator/device checks; Android signs that build with its development identity.

The minimum Android API is 23; Fire OS models below that level are excluded. This Android build does not target Amazon's separate Vega operating system. Catalog access and artwork require HTTPS, and the app has no account, advertising SDK or analytics SDK. Playback uses native Media3, audio focus, remote media keys and a MediaSession.

## Release prerequisites

Do not submit an empty catalog or unavailable live feed. Confirm real licensed RCTV live programming and on-demand shows, verify playback and navigation, capture screenshots from the built apps, confirm the privacy/support pages, and complete store declarations for the actual RCTV content. Copied test results for Mississippi Sports do not establish testing of these RCTV builds.
