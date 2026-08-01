package com.vibedeck.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PlaybackControls")
public class PlaybackControlsPlugin extends Plugin {

    @PluginMethod
    public void updateState(PluginCall call) {
        String title = call.getString("title", "VibeDeck");
        String artist = call.getString("artist", "Ready to play");
        String coverUrl = call.getString("coverUrl", "");
        boolean isPlaying = call.getBoolean("isPlaying", false);

        PlaybackService.updatePlaybackState(
            getContext(),
            title,
            artist,
            coverUrl,
            isPlaying
        );

        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }
}
