
'use strict';

Kraken.API = {

    GetUser: function () {

        Kraken.Utils.GetJSONP(Kraken.URL.APIBase + "kraken/users/" + Kraken.Username + "/follows/channels?limit=100", function (data) {

            if (data.error) {
                Kraken.Utils.DisplayError(data.error + ": " + data.message);
                return;
            }

            else if (data.follows.length == 0) {
                Kraken.Utils.DisplayError("User is not currently following any channels");
            }
            else if (data.follows) {
                Kraken.Streams = data.follows;
                Kraken.FollowingCount = data._total;
                Kraken.API.GetOnlineData();
            }
            else {
                Kraken.Utils.DisplayError("Error retrieving User data from the Twitch API.");
            }

        });

    },

    GetOnlineData: function () {

        var query = Kraken.Utils.GetChannelString();

        Kraken.Utils.GetJSONP(Kraken.URL.APIBase + "kraken/streams/" + query, function (data) {

            if (!data.streams) {
                Kraken.Utils.DisplayError("Could not retrieve channel stream data from the Twitch API.");
                return;
            }

            data.streams.forEach(function (streamData) {

                Kraken.Streams.forEach(function (channelData) {

                    if (channelData.channel.name == streamData.channel.name)
                        channelData.stream = streamData;
                })
            });

            Kraken.Elements.menuLoadIndicator.style.display = "none";
            Kraken.Utils.BuildList();

            if (Kraken.StaleStreams.length > 0 && Kraken.Settings.ShouldNotify) {
                for (var i = 0; i < Kraken.Streams.length; i++) {
                    if (!Kraken.StaleStreams[i].stream && Kraken.Streams[i].stream) {
                        var notification = new Notification("Kraken Alert", { body: Kraken.Streams[i].channel.display_name + " is live" });
                    }
                }
            }
        });
    },

    GetLiveToken: function (channel) {

        Kraken.Elements.menuLoadIndicator.style.display = "block";

        Kraken.Modules.HTTPS.get(Kraken.URL.APIBase + "api/channels/" + channel + "/access_token", function (res) {
            var response = "";

            res.on('data', function (chunk) {
                response += chunk;
            });

            res.on('end', function () {
                Kraken.Elements.menuLoadIndicator.style.display = "none";
                Kraken.API.GetHLSLinks(JSON.parse(response), channel);
            });
        }).on('error', function (e) {
            Kraken.Utils.DisplayError("Error retrieving stream access token: " + e.message);
        });


    },

    GetHLSLinks: function (access, name) {

        Kraken.Elements.menuLoadIndicator.style.display = "block";

        Kraken.Modules.HTTP.get(Kraken.URL.UsherBase + "api/channel/hls/" + name + ".m3u8?allow_source=true&allow_audio_only=true&type=any&private_code=null&player=twitchweb" + "&token=" + access.token.toString() + "&sig=" + access.sig + "&p=0420420", function (res) {
            var response = "";

            res.on('data', function (chunk) {
                response += chunk;
            });

            res.on('end', function () {
                Kraken.Elements.menuLoadIndicator.style.display = "none";
                var playlist = M3U.parse(response);
                var hls;
                var chunked;

                playlist.forEach(function (url) {

                    if (url != null) {
                        if (url.file.indexOf('chunked') != -1) chunked = url.file;
                        if (url.file.indexOf(Kraken.Settings.Quality) != -1) {
                            hls = url.file;
                            return;
                        }
                    }
                });

                if (!hls)   //fallback to source on non-partnered streams 
                    hls = chunked;

                Kraken.Player.OpenStream(hls);
            });
        }).on('error', function (e) {
            Kraken.Utils.DisplayError("Error retrieving stream HLS data: " + e.message);
        });

    }
};