package com.vibedeck.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.support.v4.media.MediaMetadataCompat;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import java.io.InputStream;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PlaybackService extends Service {
    private static final String CHANNEL_ID = "playback_channel_v2";
    private static final int NOTIFICATION_ID = 1;
    private static final String ACTION_TOGGLE = "com.vibedeck.app.action.TOGGLE";
    private static final String ACTION_NEXT = "com.vibedeck.app.action.NEXT";
    private static final String ACTION_PREVIOUS = "com.vibedeck.app.action.PREVIOUS";
    private static final String EXTRA_TITLE = "extra_title";
    private static final String EXTRA_ARTIST = "extra_artist";
    private static final String EXTRA_IS_PLAYING = "extra_is_playing";
    private static String currentTitle = "VibeDeck";
    private static String currentArtist = "Ready to play";
    private static String currentCoverUrl = "";
    private static boolean currentIsPlaying = false;
    private static Bitmap currentCoverBitmap = null;
    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    
    private static PlaybackService instance;
    private MediaSessionCompat mediaSession;

    public static void updatePlaybackState(
        android.content.Context context,
        String title,
        String artist,
        String coverUrl,
        boolean isPlaying
    ) {
        currentTitle = title;
        currentArtist = artist;
        currentIsPlaying = isPlaying;

        if (instance != null) {
            // Safe direct update when service is already running
            instance.updateMediaSession();
            Notification notification = instance.buildNotification();
            instance.startForegroundCompat(notification);
            
            NotificationManager manager = instance.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.notify(NOTIFICATION_ID, notification);
            }
        } else {
            Intent serviceIntent = new Intent(context, PlaybackService.class);
            serviceIntent.putExtra(EXTRA_TITLE, title);
            serviceIntent.putExtra(EXTRA_ARTIST, artist);
            serviceIntent.putExtra(EXTRA_IS_PLAYING, isPlaying);

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } catch (Exception e) {
                // Ignore background start restrictions if they occur
            }
        }

        if (coverUrl != null && !coverUrl.equals(currentCoverUrl)) {
            currentCoverUrl = coverUrl;
            executor.execute(() -> {
                try {
                    InputStream in = new URL(coverUrl).openStream();
                    Bitmap b = BitmapFactory.decodeStream(in);
                    if (b != null) {
                        int maxSize = 400;
                        int width = b.getWidth();
                        int height = b.getHeight();
                        if (width > maxSize || height > maxSize) {
                            float ratio = (float) width / (float) height;
                            if (ratio > 1) {
                                width = maxSize;
                                height = (int) (width / ratio);
                            } else {
                                height = maxSize;
                                width = (int) (height * ratio);
                            }
                            currentCoverBitmap = Bitmap.createScaledBitmap(b, width, height, true);
                        } else {
                            currentCoverBitmap = b;
                        }
                    }
                } catch (Exception e) {
                    currentCoverBitmap = null;
                }
                if (instance != null) {
                    instance.updateMediaSession();
                    Notification notification = instance.buildNotification();
                    NotificationManager manager = instance.getSystemService(NotificationManager.class);
                    if (manager != null) {
                        manager.notify(NOTIFICATION_ID, notification);
                    }
                }
            });
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        mediaSession = new MediaSessionCompat(this, "VibeDeckMediaSession");
        
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                MainActivity.emitPlaybackAction("toggle");
            }

            @Override
            public void onPause() {
                MainActivity.emitPlaybackAction("toggle");
            }

            @Override
            public void onSkipToNext() {
                MainActivity.emitPlaybackAction("next");
            }

            @Override
            public void onSkipToPrevious() {
                MainActivity.emitPlaybackAction("previous");
            }
        });

        mediaSession.setActive(true);
        createNotificationChannel();
        updateMediaSession();
        Notification notification = buildNotification();
        startForegroundCompat(notification);
    }

    private void updateMediaSession() {
        if (mediaSession == null) return;
        mediaSession.setActive(true);

        MediaMetadataCompat.Builder builder = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Vibe Deck")
                .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, currentArtist)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, -1L);
        
        if (currentCoverBitmap != null) {
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentCoverBitmap);
        }

        mediaSession.setMetadata(builder.build());

        int state = currentIsPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        PlaybackStateCompat playbackState = new PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE | PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
                .build();
        mediaSession.setPlaybackState(playbackState);
    }

    private void startForegroundCompat(Notification notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Media playback controls");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private PendingIntent actionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, PlaybackService.class);
        intent.setAction(action);
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification buildNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingContentIntent = PendingIntent.getActivity(this, 0, contentIntent, PendingIntent.FLAG_IMMUTABLE);

        int playPauseIcon = currentIsPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(pendingContentIntent)
                .setOngoing(currentIsPlaying)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .addAction(android.R.drawable.ic_media_previous, "Previous", actionIntent(ACTION_PREVIOUS, 100))
                .addAction(playPauseIcon, currentIsPlaying ? "Pause" : "Play", actionIntent(ACTION_TOGGLE, 101))
                .addAction(android.R.drawable.ic_media_next, "Next", actionIntent(ACTION_NEXT, 102))
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setShowActionsInCompactView(0, 1, 2)
                        .setMediaSession(mediaSession.getSessionToken()));

        if (currentCoverBitmap != null) {
            builder.setLargeIcon(currentCoverBitmap);
        }

        return builder.build();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            if (ACTION_TOGGLE.equals(action)) {
                MainActivity.emitPlaybackAction("toggle");
            } else if (ACTION_NEXT.equals(action)) {
                MainActivity.emitPlaybackAction("next");
            } else if (ACTION_PREVIOUS.equals(action)) {
                MainActivity.emitPlaybackAction("previous");
            }
        }

        if (intent != null) {
            currentTitle = intent.getStringExtra(EXTRA_TITLE) != null ? intent.getStringExtra(EXTRA_TITLE) : currentTitle;
            currentArtist = intent.getStringExtra(EXTRA_ARTIST) != null ? intent.getStringExtra(EXTRA_ARTIST) : currentArtist;
            currentIsPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, currentIsPlaying);
        }

        updateMediaSession();
        Notification notification = buildNotification();
        startForegroundCompat(notification);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (instance == this) {
            instance = null;
        }
        stopForeground(true);
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        super.onDestroy();
    }
}
