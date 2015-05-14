
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
        wjs("#playerContainer").addPlayer({ id: "webchimera", autoplay: 1, theme: "sleek", buffer: 8000 });
        wjs("#webchimera").skin(Kraken.Player.Skin);
    },

    OpenStream: function (url) {

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
        wjs("#webchimera").addPlaylist(url);
        wjs("#webchimera").plugin.playlist.next();

    },

    IsPlaying: function () {

        try {
            if (wjs("#webchimera").plugin.playlist.isPlaying)
                return true;
            else
                return false;
        } catch (e) {
            return false;
        }

    }

};