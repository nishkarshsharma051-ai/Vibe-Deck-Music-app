package com.vibedeck.app;

import android.media.AudioManager;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    private static MainActivity currentInstance;

    public static void emitPlaybackAction(String action) {
        if (currentInstance == null || currentInstance.bridge == null || currentInstance.bridge.getWebView() == null) {
            return;
        }

        WebView webView = currentInstance.bridge.getWebView();
        String escapedAction = action.replace("'", "\\'");
        currentInstance.runOnUiThread(() ->
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('native-playback-action', { detail: { action: '" + escapedAction + "' } }));",
                null
            )
        );
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentInstance = this;
        registerPlugin(PlaybackControlsPlugin.class);

        // Request notification permission for Android 13+ (API 33+) so that playback controls display in status bar
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        // Start the playback foreground service to enable media notification
        android.content.Intent serviceIntent = new android.content.Intent(this, PlaybackService.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            this.startForegroundService(serviceIntent);
        } else {
            this.startService(serviceIntent);
        }
        // Volume buttons control media volume, not ringtone
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Resume WebView JS execution when app returns to foreground
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().onResume();
            this.bridge.getWebView().resumeTimers();
        }
    }

    @Override
    public void onPause() {
        // Intentionally NOT pausing the WebView or its timers so that
        // audio keeps playing when the user backgrounds the app or
        // locks the screen — same behavior as Spotify / music apps.
        super.onPause();
        // Do NOT call: bridge.getWebView().onPause() or .pauseTimers()
    }

    @Override
    public void onStop() {
        // Keep WebView JS timers running so the audio element keeps playing.
        super.onStop();
        // Do NOT call: bridge.getWebView().onPause() or .pauseTimers()
    }

    @Override
    public void onDestroy() {
        if (currentInstance == this) {
            currentInstance = null;
        }
        super.onDestroy();
    }
}
