package com.rctv19.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.LruCache;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ImageView;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.ui.PlayerView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@androidx.media3.common.util.UnstableApi
public class MainActivity extends Activity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private FrameLayout root;
    private ScrollView menu;
    private LinearLayout rows;
    private PlayerView playerView;
    private ExoPlayer player;
    private MediaSession session;
    private JSONObject selected;
    private long savedPosition;
    private boolean playingScreen;
    private View lastButton;
    private JSONObject catalog;
    private ShowGroup activeGroup;
    private String focusGroupTitle;
    private final LruCache<String, Bitmap> artwork = new LruCache<String, Bitmap>(12 * 1024) {
        @Override protected int sizeOf(String key, Bitmap value) { return Math.max(1, value.getByteCount() / 1024); }
    };
    private static final int INK = Color.rgb(242,245,246);
    private static final int MUTED = Color.rgb(169,186,198);
    private static final int GOLD = Color.rgb(255,225,0);
    private boolean loadingCatalog;

    private static final class ShowGroup {
        final String title;
        final String thumbnail;
        final List<JSONObject> episodes = new ArrayList<>();
        ShowGroup(String title, String thumbnail) { this.title = title; this.thumbnail = thumbnail; }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this); root.setBackgroundColor(Color.rgb(11,23,34)); setContentView(root);
        menu = new ScrollView(this); menu.setFillViewport(true);
        rows = new LinearLayout(this); rows.setOrientation(LinearLayout.VERTICAL); rows.setPadding(dp(50),dp(28),dp(50),dp(30));
        menu.addView(rows); root.addView(menu);
        playerView = new PlayerView(this); playerView.setUseController(true); playerView.setShowSubtitleButton(true); playerView.setControllerAutoShow(true);
        playerView.setVisibility(View.GONE); root.addView(playerView, new FrameLayout.LayoutParams(-1,-1));
        if (state != null && state.containsKey("selected")) {
            try { selected = new JSONObject(state.getString("selected")); savedPosition = state.getLong("position"); playingScreen = state.getBoolean("playingScreen"); } catch (Exception ignored) { selected = null; }
        }
        loadCatalog();
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void text(String value, int size, int color) {
        TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color); t.setPadding(0,dp(6),0,dp(10)); rows.addView(t);
    }
    private void heading() {
        rows.removeAllViews(); lastButton = null;
        LinearLayout brand = new LinearLayout(this); brand.setGravity(android.view.Gravity.CENTER_VERTICAL);
        ImageView logo = new ImageView(this); logo.setImageResource(R.drawable.app_icon); logo.setContentDescription("RCTV 19 logo");
        brand.addView(logo,new LinearLayout.LayoutParams(dp(76),dp(76)));
        TextView title = new TextView(this); title.setText("RCTV 19"); title.setTextSize(30); title.setTextColor(GOLD); title.setTypeface(null,Typeface.BOLD); title.setPadding(dp(20),0,0,0);
        brand.addView(title); rows.addView(brand);
        text("Ripley Community Television  •  Live and on demand",15,MUTED);
    }
    private Button button(String title, Runnable action) {
        Button b = new Button(this); b.setText(title); b.setAllCaps(false); b.setTextSize(18); b.setTextColor(INK); b.setTypeface(null,Typeface.BOLD); b.setPadding(dp(18),dp(12),dp(18),dp(12)); b.setFocusable(true);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(30,51,66)));
        b.setOnFocusChangeListener((v, focus) -> { b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(focus ? GOLD : Color.rgb(30,51,66))); b.setTextColor(focus ? Color.rgb(11,23,34) : INK); });
        b.setOnClickListener(v -> action.run());
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,-2); p.bottomMargin = dp(8); rows.addView(b,p); return b;
    }
    private void loadCatalog() {
        if (loadingCatalog || isDestroyed()) return;
        heading();
        if (!BuildConfig.CATALOG_URL.startsWith("https://")) {
            text("Programming is coming soon.",22,INK); text("The live broadcast and replays will appear here when available.",16,MUTED); return;
        }
        text("Loading programming…",18,MUTED);
        loadingCatalog = true;
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(BuildConfig.CATALOG_URL).openConnection();
                connection.setConnectTimeout(10000); connection.setReadTimeout(10000); connection.setInstanceFollowRedirects(false);
                if (connection.getResponseCode() != 200) throw new Exception("Catalog unavailable");
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try (InputStream input = connection.getInputStream()) { byte[] chunk = new byte[8192]; int count; while ((count = input.read(chunk)) != -1) { if (bytes.size() + count > 2_000_000) throw new Exception("Catalog too large"); bytes.write(chunk,0,count); } }
                JSONObject data = new JSONObject(bytes.toString(StandardCharsets.UTF_8.name()));
                if (data.optInt("version") != 1) throw new Exception("Unsupported catalog");
                runOnUiThread(() -> { loadingCatalog = false; if (!isDestroyed()) showCatalog(data); });
            } catch (Exception e) {
                runOnUiThread(() -> { loadingCatalog = false; if (isDestroyed()) return; heading(); text("Programming could not be loaded. Please try again.",18,MUTED); button("Retry",this::loadCatalog).requestFocus(); });
            } finally { if (connection != null) connection.disconnect(); }
        });
    }
    private void showCatalog(JSONObject data) {
        catalog = data;
        showHome();
    }
    private void section(String title, String subtitle) {
        TextView label = new TextView(this);
        label.setText(title); label.setTextSize(22); label.setTextColor(INK); label.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,-2); p.topMargin = dp(18); rows.addView(label,p);
        if (!subtitle.isEmpty()) text(subtitle,14,MUTED);
    }
    private int cardWidth() {
        return (getResources().getDisplayMetrics().widthPixels - dp(100) - dp(48)) / 3;
    }
    private GradientDrawable cardBackground(boolean focused) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(focused ? Color.rgb(25,56,72) : Color.rgb(20,39,53));
        d.setCornerRadius(dp(12));
        d.setStroke(dp(focused ? 3 : 1), focused ? GOLD : Color.rgb(52,80,100));
        return d;
    }
    private LinearLayout addCard(LinearLayout row, String title, String subtitle, int localImage, String remoteImage, Runnable action) {
        int width = cardWidth();
        LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(7),dp(7),dp(7),dp(13)); card.setBackground(cardBackground(false));
        card.setFocusable(true); card.setClickable(true);
        ImageView poster = new ImageView(this); poster.setImageResource(localImage);
        poster.setScaleType(ImageView.ScaleType.CENTER_CROP);
        poster.setContentDescription(title + " artwork");
        card.addView(poster,new LinearLayout.LayoutParams(-1,Math.round((width-dp(14))*9f/16f)));
        if (remoteImage != null && remoteImage.startsWith("https://")) loadArtwork(remoteImage, poster);
        TextView name = new TextView(this); name.setText(title); name.setTextSize(19); name.setTextColor(INK);
        name.setTypeface(null,Typeface.BOLD); name.setMaxLines(2); name.setEllipsize(TextUtils.TruncateAt.END);
        name.setPadding(dp(10),dp(12),dp(10),0); card.addView(name);
        TextView detail = new TextView(this); detail.setText(subtitle); detail.setTextSize(14); detail.setTextColor(MUTED);
        detail.setPadding(dp(10),dp(3),dp(10),0); card.addView(detail);
        card.setOnFocusChangeListener((v, focused) -> {
            card.setBackground(cardBackground(focused));
            detail.setTextColor(focused ? GOLD : MUTED);
            card.setScaleX(focused ? 1.025f : 1f); card.setScaleY(focused ? 1.025f : 1f);
        });
        card.setOnClickListener(v -> action.run());
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(width,-2); p.rightMargin = dp(24); p.bottomMargin = dp(24);
        row.addView(card,p); return card;
    }
    private LinearLayout gridRow() {
        LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL);
        rows.addView(row,new LinearLayout.LayoutParams(-1,-2)); return row;
    }
    private void loadArtwork(String address, ImageView view) {
        Bitmap cached = artwork.get(address);
        if (cached != null) { view.setImageBitmap(cached); return; }
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(address).openConnection();
                connection.setConnectTimeout(7000); connection.setReadTimeout(7000);
                if (connection.getResponseCode() != 200) return;
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try (InputStream input = connection.getInputStream()) {
                    byte[] chunk = new byte[8192]; int count;
                    while ((count = input.read(chunk)) != -1) {
                        if (bytes.size() + count > 2_000_000) return;
                        bytes.write(chunk,0,count);
                    }
                }
                byte[] data = bytes.toByteArray();
                BitmapFactory.Options bounds = new BitmapFactory.Options(); bounds.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(data,0,data.length,bounds);
                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inSampleSize = 1;
                while (bounds.outWidth / options.inSampleSize > 640) options.inSampleSize *= 2;
                Bitmap image = BitmapFactory.decodeByteArray(data,0,data.length,options);
                if (image == null) return;
                artwork.put(address,image);
                runOnUiThread(() -> { if (!isDestroyed() && view.isAttachedToWindow()) view.setImageBitmap(image); });
            } catch (Exception ignored) { } finally { if (connection != null) connection.disconnect(); }
        });
    }
    private List<ShowGroup> groups(JSONArray videos) {
        List<ShowGroup> result = new ArrayList<>();
        if (videos == null) return result;
        for (int i=0;i<videos.length();i++) {
            JSONObject item = videos.optJSONObject(i);
            if (item == null || !validMedia(item)) continue;
            String category = item.optString("category").trim();
            if (category.isEmpty()) category = "More shows";
            ShowGroup group = null;
            for (ShowGroup candidate : result) if (candidate.title.equals(category)) { group = candidate; break; }
            if (group == null) {
                String seriesThumbnail = item.optString("seriesThumbnail");
                group = new ShowGroup(category,seriesThumbnail.startsWith("https://") ? seriesThumbnail : item.optString("thumbnail"));
                result.add(group);
            }
            group.episodes.add(item);
        }
        return result;
    }
    private void showHome() {
        if (catalog == null) return;
        activeGroup = null;
        heading(); View first = null, preferred = null;
        JSONObject live = catalog.optJSONObject("live");
        section("WATCH NOW", "Live and on demand. Select a show to browse its episodes.");
        LinearLayout row = gridRow(); int slot = 0;
        if (live != null && validMedia(live)) {
            first = addCard(row,live.optString("title","RCTV 19 Live"),"LIVE  •  Watch now",R.drawable.live_cover,null,() -> play(live,true));
            slot++;
        }
        List<ShowGroup> groups = groups(catalog.optJSONArray("videos"));
        for (int i=0;i<groups.size();i++) {
            ShowGroup group = groups.get(i);
            if (slot > 0 && slot % 3 == 0) row = gridRow();
            String count = group.episodes.size() + (group.episodes.size() == 1 ? " episode  •  Browse ›" : " episodes  •  Browse ›");
            View card = addCard(row,group.title,count,R.drawable.show_placeholder,group.thumbnail,() -> { focusGroupTitle = group.title; showEpisodes(group); });
            if (first == null) first = card;
            if (group.title.equals(focusGroupTitle)) preferred = card;
            slot++;
        }
        if (groups.isEmpty()) text("Replays and shows will appear here when available.",16,MUTED);
        Button refresh = button("Refresh programming",this::loadCatalog); if (first == null) first = refresh;
        button("Help and privacy",this::showHelp);
        menu.scrollTo(0,0);
        if (!playingScreen) (preferred == null ? first : preferred).requestFocus();
    }
    private void showEpisodes(ShowGroup group) {
        activeGroup = group;
        heading();
        section(group.title.toUpperCase(),"Choose an episode to watch. Press Back to see all shows.");
        button("‹  All shows",this::showHome);
        LinearLayout row = null; View first = null;
        for (int i=0;i<group.episodes.size();i++) {
            JSONObject item = group.episodes.get(i);
            if (i % 3 == 0) row = gridRow();
            int minutes = Math.round(item.optInt("durationSeconds") / 60f);
            View card = addCard(row,item.optString("title"),minutes > 0 ? minutes + " min  •  Play" : "Play",R.drawable.show_placeholder,item.optString("thumbnail"),() -> play(item,false));
            if (first == null) first = card;
        }
        if (first != null) first.requestFocus();
    }
    private void play(JSONObject item, boolean live) {
        try { item.put("isLive",live); } catch (Exception ignored) { }
        lastButton = getCurrentFocus();
        selected = item; savedPosition = 0; playingScreen = true; openPlayer(true);
    }
    private boolean validMedia(JSONObject item) { return item.optString("url").startsWith("https://") && !item.optString("id").isEmpty() && !item.optString("title").isEmpty() && (item.optString("type").equals("hls") || item.optString("type").equals("mp4")); }
    private void showHelp() {
        new AlertDialog.Builder(this).setTitle("Help and privacy")
            .setMessage("Use your remote to choose Watch live or a show, then choose an episode. Press Back to return to the show or to all shows.\n\nIf playback stops, check your internet connection and try again.\n\nSupport: myersgrouponline@gmail.com\nwatch.rctv19.com/support/\n\nThe app does not require an account and has no analytics or advertising SDK. Hosting providers process connection information to deliver video.\n\nVersion " + BuildConfig.VERSION_NAME)
            .setNeutralButton("Privacy policy",(dialog,which) -> showPrivacy())
            .setPositiveButton("Close",null).show();
    }
    private void showPrivacy() {
        new AlertDialog.Builder(this).setTitle("Privacy policy")
            .setMessage("Effective September 23, 2026\n\nThis policy covers the RCTV 19 streaming player and TV apps operated by Mississippi News Group. It does not cover separate news websites or services provided by your TV platform.\n\nYou can watch without an account or providing a name, email address, payment information, or precise location. The apps do not include analytics or advertising SDKs, request an advertising identifier, or use tracking cookies. Broadcasts may include commercials or sponsorships as part of the video.\n\nLoading programming and video sends technical connection information to Cloudflare, our hosting and delivery provider. This may include IP address, requested files, request time, and browser or device information in network requests. It is used to deliver content, maintain security, and diagnose problems. Provider handling and retention follow its operational policies: cloudflare.com/privacypolicy/\n\nPlayback position and screen state may be kept on your device to continue playback when you return. This saved state is not sent to a viewer profile or analytics service.\n\nIf you email support, we use your email address and message to respond. Please do not send passwords or payment details.\n\nWe do not sell viewer information or share it for targeted advertising through these apps. Providers needed to operate the service process technical information. Your TV platform, internet provider and websites embedding the player have their own policies.\n\nThere is no streaming-app account to delete. Questions or requests to delete support correspondence: myersgrouponline@gmail.com\n\nThe service provides local news, sports, religious and community programming. We do not ask children to create accounts or submit personal information. Changes to the policy will be published with an updated date at watch.rctv19.com/privacy/")
            .setPositiveButton("Close",null).show();
    }
    private void openPlayer(boolean autoPlay) {
        if (selected == null) return;
        long startPosition = savedPosition;
        releasePlayer(); menu.setVisibility(View.GONE); playerView.setVisibility(View.VISIBLE); getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        player = new ExoPlayer.Builder(this).build(); player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(),true); player.setHandleAudioBecomingNoisy(true);
        session = new MediaSession.Builder(this,player).build(); playerView.setPlayer(player);
        MediaItem item = new MediaItem.Builder().setMediaId(selected.optString("id")).setUri(selected.optString("url")).setMimeType(selected.optString("type").equals("hls") ? MimeTypes.APPLICATION_M3U8 : MimeTypes.VIDEO_MP4).setMediaMetadata(new MediaMetadata.Builder().setTitle(selected.optString("title")).build()).build();
        player.setMediaItem(item); player.addListener(new Player.Listener() {
            @Override public void onPlayerError(PlaybackException error) {
                closePlayer();
                if (!isFinishing() && !isDestroyed()) new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Video unavailable")
                    .setMessage(selected.optBoolean("isLive") ? "The live feed is temporarily unavailable. Please try again shortly." : "This program could not be played. Check your internet connection and try again.")
                    .setPositiveButton("Try again",(dialog,which) -> { playingScreen = true; openPlayer(true); })
                    .setNegativeButton("Back to programming",null).show();
            }
            @Override public void onPlaybackStateChanged(int state) { if (state == Player.STATE_ENDED) closePlayer(); }
        });
        if (!selected.optBoolean("isLive")) player.seekTo(startPosition);
        player.prepare(); player.setPlayWhenReady(autoPlay); playerView.requestFocus();
    }
    private void closePlayer() { playingScreen = false; releasePlayer(); playerView.setVisibility(View.GONE); menu.setVisibility(View.VISIBLE); getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); if (lastButton != null && lastButton.isAttachedToWindow()) lastButton.requestFocus(); else { for (int i=0;i<rows.getChildCount();i++) if (rows.getChildAt(i) instanceof Button) { rows.getChildAt(i).requestFocus(); break; } } }
    private void releasePlayer() { if (session != null) { session.release(); session = null; } if (player != null) { savedPosition = player.getCurrentPosition(); playerView.setPlayer(null); player.release(); player = null; } }
    @Override public void onBackPressed() { if (playingScreen) closePlayer(); else if (activeGroup != null) showHome(); else super.onBackPressed(); }
    @Override public boolean onKeyDown(int code, KeyEvent event) {
        if (player != null && code == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) { if (player.isPlaying()) player.pause(); else player.play(); return true; }
        if (player != null && code == KeyEvent.KEYCODE_MEDIA_PLAY) { player.play(); return true; }
        if (player != null && code == KeyEvent.KEYCODE_MEDIA_PAUSE) { player.pause(); return true; }
        return super.onKeyDown(code,event);
    }
    @Override protected void onStart() { super.onStart(); if (playingScreen && selected != null && player == null) openPlayer(false); }
    @Override protected void onStop() { releasePlayer(); getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); super.onStop(); }
    @Override protected void onSaveInstanceState(Bundle state) { if (selected != null) state.putString("selected",selected.toString()); state.putBoolean("playingScreen",playingScreen); state.putLong("position",player == null ? savedPosition : player.getCurrentPosition()); super.onSaveInstanceState(state); }
    @Override protected void onDestroy() { releasePlayer(); executor.shutdownNow(); super.onDestroy(); }
}
