
'use strict';

Kraken.Utils = {

    //escape html courtesy of mustache.js
    EscapeHTML: function(string) {
        return String(string).replace(/[&<>"'\/]/g, function (s) {
            return Kraken.HTMLEntities[s];
        });
    },

    GetChannelString: function () {

        var channelString = "?channel=";

        Kraken.Streams.forEach(function (stream) {
            channelString += stream.channel.name + ",";
        });

        return channelString;
    },

    SortStreams: function () {

        var arr = $("#streamList .collection-item");

        arr.sort(function (first, second) {
            if ($(first).hasClass("stream-online")) {
                return -1
            } else {
                return 1;
            }
        });

        Kraken.Elements.streamList.empty();
        Kraken.Elements.streamList.append(arr);

    },

    DisplayError: function (errorMessage) {

        Kraken.Elements.menuLoadIndicator.hide();
        Kraken.Elements.chatLoadIndicator.hide();

        $("#inputErrorField").first().text(errorMessage);
        $("#inputErrorField").show();
    },


    BuildList: function () {

        var channels = Kraken.Streams;
        var list = Kraken.Elements.streamList;
        list.empty();

        channels.forEach(function (current) {
            var image = current.channel.logo || Kraken.URL.DefaultProfileImage;
            var game = current.channel.game;
            var name = current.channel.display_name;
            var onlineIndicator = "";
            var viewers = "";

            if (current.stream) {
                onlineIndicator = "stream-online";

                game = current.stream.game || "";
                name = current.stream.channel.display_name;
                viewers = "<div class='secondary-content'>" +
                          "<i class='mdi-social-person red-text'></i>" +
                          "<span class='white-text'>" + current.stream.viewers.toLocaleString() + "</span>" +
                          "</div>";
            }

            list.append("<a class='waves-effect waves-dark collection-item avatar " + onlineIndicator + "'>" +
                          "<img class='circle stream-avatar' src='" + image + "'></img>" +
                          "<span class='title stream-name'>" + name + "</span>" +
                          "<div class='description grey-text'>" + game + "</div>" +
                            viewers +
                       "</a>");


        });

        Kraken.Utils.SortStreams();

        $(".collection-item.stream-online").click(function (target) {
            var channel = $(target.currentTarget).find(".title").text().toLowerCase().trim();

            Kraken.CurrentStream = channel;

            if (Kraken.Chat.Settings.Enabled) {
                Kraken.Chat.OpenChat();
            }

            if (channel)
                Kraken.API.GetLiveToken(channel);
        })


        clearInterval(Kraken.RefreshTimeout);
        Kraken.RefreshTimeout = setInterval(function () {
            Kraken.StaleStreams = Kraken.Streams;
            Kraken.API.GetUser();
        }, 60000);

    },

    IndicateQuality: function () {

        if (Kraken.Settings.Quality) {
            var quality;
            switch (Kraken.Settings.Quality) {
                case "chunked":
                    quality = "Source";
                    break;
                case "audio_only":
                    quality = "Audio";
                    break;
                default:
                    quality = Kraken.Settings.Quality;
            }

            $("#qualityIndicator").attr("data-content", quality);
        }
    },

    SetNotificationState: function() {
        if (Kraken.Settings.ShouldNotify) {
            $("#notifyIndicator").attr("data-state", "enabled");
        } else {
            $("#notifyIndicator").attr("data-state", "disabled");
        }
    },

    AddEventHandlers: function () {

        Kraken.Elements.userButton.click(function () {

            var username = $("#inputUsername").val();
            if (username != Kraken.Username) {
                Kraken.StaleStreams = [];   //empty stale streams on changed username
            }

            Kraken.Username = username;
            $("#inputErrorField").hide();

            if (Kraken.Username) {
                localStorage.setItem("TwitchUsername", Kraken.Username);
                Kraken.Elements.menuLoadIndicator.show();
                Kraken.API.GetUser();
            }
            else {
                Kraken.Utils.DisplayError("Enter a username");
            }
        });


        $("#selectQuality > li").click(function () {
            var qual = $(this).find("a").attr("value");

            if (qual) {
                Kraken.Settings.Quality = qual;
                localStorage.setItem("TwitchStreamQuality", Kraken.Settings.Quality);
                if (Kraken.Player.IsPlaying()) {
                    Kraken.API.GetLiveToken(Kraken.CurrentStream);
                }
                Kraken.Utils.IndicateQuality();
            }

        });

        $("#menuToggle, #close-button").click(function () {
            Kraken.Elements.isMenuOpen = !Kraken.Elements.isMenuOpen;
            $("#mainMenu").toggle();
            $("#menuToggle > i").toggleClass("mdi-hardware-keyboard-arrow-left mdi-hardware-keyboard-arrow-right");
        });

        $("#usernameForm").submit(function (e) {
            e.preventDefault();
            Kraken.Elements.userButton.click();
        });

        $("#checkNotify").click(function () {

            Kraken.Settings.ShouldNotify = !Kraken.Settings.ShouldNotify;
            localStorage.setItem("TwitchNotifications", Kraken.Settings.ShouldNotify);
            Kraken.Utils.SetNotificationState();
        });

    },

    SetDefaults: function () {

        Kraken.Username = localStorage.getItem("TwitchUsername");
        Kraken.Settings.Quality = localStorage.getItem("TwitchStreamQuality") || "medium";
        Kraken.Settings.ShouldNotify = JSON.parse(localStorage.getItem("TwitchNotifications"));

        if (Kraken.Settings.ShouldNotify == null) {
            Kraken.Settings.ShouldNotify = true;
        }

        $('ul.tabs').tabs();

        Kraken.Elements.streamList.niceScroll({
            autohidemode: "leave"
        });

        if (Kraken.Username) {
            $("#inputUsername").val(Kraken.Username);
            Kraken.Elements.menuLoadIndicator.show();
            Kraken.API.GetUser();
        }

        Kraken.Utils.IndicateQuality();

        Kraken.Utils.SetNotificationState();

        //toast gui notifications on windows 8
        Kraken.Modules.NWGUI.App.createShortcut(process.env.APPDATA + "\\Microsoft\\Windows\\Start Menu\\Programs\\node-webkit.lnk");

    }

};