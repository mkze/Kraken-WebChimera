
'use strict';

Kraken.Player = {

    Skin: {
        toolbar: {
            colors: {
                volume: {
                    color: "#e53935"
                }
            }
        }
    },

    CreatePlayer: function () {
        wjs("#playerContainer").addPlayer({ id: "webchimera", autoplay: 1, theme: "sleek", buffer: 10000 });
        wjs("#webchimera").skin(Kraken.Player.Skin);
    },

    OpenStream: function (hls) {

        if (!wjs("#webchimera").plugin) {
            Kraken.Player.CreatePlayer();
        }

        var title;

        Kraken.Streams.forEach(function (stream) {
            if (stream.channel.name === Kraken.CurrentStream) {
                title = stream.stream.channel.status;
                return;
            }
        });

        wjs("#webchimera").setOpeningText(title);
        wjs("#webchimera").stopPlayer();
        wjs("#webchimera").plugin.playlist.clear();
        wjs("#webchimera").addPlaylist({
            url: hls,
            vlcArgs: "--sout-livehttp-caching --sout-livehttp-ratecontrol"
        });
        wjs("#webchimera").plugin.playlist.next();

    },

    IsPlaying: function () {

        try {
            var state = wjs("#webchimera").plugin.playlist.isPlaying;
            return state;
        } catch (e) {
            return false;
        }

    }

};