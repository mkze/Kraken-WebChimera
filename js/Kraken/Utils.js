
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

        var items = document.querySelectorAll("#streamList .collection-item");
        var itemArray = Array.prototype.slice.call(items, 0);

        itemArray.sort(function (first) {
            if (!first.classList.contains("stream-online")) {
                return 1;
            }
        });

        itemArray.forEach(function (item) {
            Kraken.Elements.streamList.appendChild(item);
        });

    },

    DisplayError: function (errorMessage) {

        Kraken.Elements.menuLoadIndicator.style.display = "none";
        Kraken.Elements.chatLoadIndicator.style.display = "none";

        Kraken.Elements.errorField.firstChild.textContent = errorMessage;
        Kraken.Elements.errorField.style.display = "block";
    },


    BuildList: function () {

        var channels = Kraken.Streams;
        var list = Kraken.Elements.streamList;
        list.innerHTML = "";

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

            list.innerHTML += "<a class='waves-effect waves-dark collection-item avatar " + onlineIndicator + "'>" +
                                  "<img class='circle stream-avatar' src='" + image + "'></img>" +
                                  "<span class='title stream-name'>" + name + "</span>" +
                                  "<div class='description grey-text'>" + game + "</div>" +
                                    viewers +
                              "</a>";


        });

        Kraken.Utils.SortStreams();

        Array.prototype.forEach.call(document.querySelectorAll(".collection-item.stream-online"), function (ele) {
            ele.addEventListener('click', function (target) {
                var channel = target.currentTarget.querySelector(".title").innerText.toLowerCase().trim();

                Kraken.CurrentStream = channel;

                if (Kraken.Chat.Settings.Enabled) {
                    Kraken.Chat.OpenChat();
                }

                if (channel)
                    Kraken.API.GetLiveToken(channel);
            })
        });




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

            var qualIndicator = document.getElementById("qualityIndicator");
            qualIndicator.setAttribute("data-quality", quality);
        }
    },

    SetNotificationState: function () {

        var notifyIndicator = document.getElementById("notifyIndicator");
        var state = "disabled";

        if (Kraken.Settings.ShouldNotify)
            state = "enabled";

        notifyIndicator.setAttribute("data-state", state);
    },

    GetJSONP: function(url, callback) {
        var handle = "_jsonp_" + Math.floor(Math.random() * 10000);

        var jsonp = document.createElement('script');
        jsonp.src = url;
        jsonp.src += url.indexOf("?") != -1 ? "&callback=" + handle : "?callback=" + handle;


        window[handle] = function (data) {
            callback.call(window, data);
            document.head.removeChild(document.head.lastChild);
            delete window[handle];
        }

        window.onerror = function (msg, url, line) {
            if (url.indexOf("jsonp") != -1) {
                callback.call(window, null);
                document.head.removeChild(document.head.lastChild);
                delete window[handle];
            }
        }

        document.head.appendChild(jsonp);
    },

    AddEventHandlers: function () {

        Kraken.Elements.userButton.addEventListener("click", function () {

            var username = Kraken.Elements.inputUsername.value;
            if (username != Kraken.Username) {
                Kraken.StaleStreams = [];   //empty stale streams on changed username
            }

            Kraken.Username = username;
            Kraken.Elements.errorField.style.display = "none";

            if (Kraken.Username) {
                localStorage.setItem("TwitchUsername", Kraken.Username);
                Kraken.Elements.menuLoadIndicator.style.display = "block";
                Kraken.API.GetUser();
            }
            else {
                Kraken.Utils.DisplayError("Enter a username");
            }
        });


        Array.prototype.forEach.call(document.querySelectorAll("#selectQuality > li"), function (ele) {
            ele.addEventListener("click", function () {

                var qual = this.firstChild.getAttribute("value");
                if (qual) {
                    Kraken.Settings.Quality = qual;
                    localStorage.setItem("TwitchStreamQuality", Kraken.Settings.Quality);
                    if (Kraken.Player.IsPlaying()) {
                        Kraken.API.GetLiveToken(Kraken.CurrentStream);
                    }
                    Kraken.Utils.IndicateQuality();
                }
            });
        });

        document.getElementById("menuToggle").addEventListener("click", function () {
            Kraken.Elements.isMenuOpen = !Kraken.Elements.isMenuOpen;
            
            var menu = document.getElementById("mainMenu");
            var displayStyle = Kraken.Elements.isMenuOpen ? "block" : "none";
            menu.style.display = displayStyle;
            
            var toggleIndicator = document.querySelector("#menuToggle > i");
            toggleIndicator.classList.toggle("mdi-hardware-keyboard-arrow-left");
            toggleIndicator.classList.toggle("mdi-hardware-keyboard-arrow-right");
        });

        document.getElementById("usernameForm").addEventListener("submit", function (form) {
            form.preventDefault();
            Kraken.Elements.userButton.click();
        });

        document.getElementById("checkNotify").addEventListener("click", function () {

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

        //materialize needs jQuery
        $('ul.tabs').tabs();

        if (Kraken.Username) {
            Kraken.Elements.inputUsername.value = Kraken.Username;
            Kraken.Elements.inputUsername.focus();
            Kraken.Elements.menuLoadIndicator.style.display = "block";
            Kraken.API.GetUser();
        }

        Kraken.Utils.IndicateQuality();

        Kraken.Utils.SetNotificationState();

        //toast gui notifications on windows 8
        Kraken.Modules.NWGUI.App.createShortcut(process.env.APPDATA + "\\Microsoft\\Windows\\Start Menu\\Programs\\node-webkit.lnk");

    }

};