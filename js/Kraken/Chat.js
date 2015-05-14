
'use strict';

Kraken.Chat = {

    OAuthToken: null,
    IRCOptions: {
        options: {
            debug: false,
            debugIgnore: ['ping', 'chat', 'action']
        }
    },
    Client: null,
    Emotes: {
        Twitch: {},
        BTTV: {}
    },
    MessageCount: 0,
    Elements: {
        MessageList: $("#chatMessageList"),
        isChatOpen: true
    },
    Settings: {
        Enabled: null,
        ScrollLock: true
    },

    GetEmoteData: function() {

        Kraken.Elements.chatLoadIndicator.show();
        $("#chatLoadingText").text("Retrieving emote data...");

        $.ajax({
            url: "https://api.twitch.tv/kraken/chat/emoticon_images",
            dataType: "jsonp",
            success: function (data) {

                data.emoticons.forEach(function (emoticon) {
                    Kraken.Chat.Emotes.Twitch[emoticon.id] = { code: emoticon.code, emoticon_set: emoticon.emoticon_set };
                });

                $.ajax({
                    url: "https://api.betterttv.net/emotes",
                    success: function (data) {
                        Kraken.Chat.Emotes.BTTV = data;
                        Kraken.Elements.chatLoadIndicator.hide();
                        localStorage.setItem("TwitchEmoteData", JSON.stringify(Kraken.Chat.Emotes));
                    },
                    error: function () {

                    }
                });
            },
            error: function () {

            }
        })
    },

    Initialize: function (channel) {

        Kraken.Elements.chatLoadIndicator.show();
        $("#chatLoadingText").text("Connecting to #" + channel);
        Kraken.CurrentStream = channel;

        if (Kraken.Chat.Client) {
            Kraken.Chat.Client.disconnect();
            Kraken.Chat.Elements.MessageList.empty();
            Kraken.Chat.MessageCount = 0;
        }

        $.ajax({
            url: "https://api.twitch.tv/kraken/chat/"+ channel +"/badges",
            dataType: "jsonp",
            success: function (data) {
                Kraken.Chat.Emotes.Badges = data;
                Kraken.Chat.IRCOptions.channels = [channel];

                if (Kraken.Chat.OAuthToken) {
                    Kraken.Chat.IRCOptions.identity = {
                        username: Kraken.Username,
                        password: Kraken.Chat.OAuthToken
                    }
                }

                Kraken.Chat.Client = new Kraken.Modules.IRC.client(Kraken.Chat.IRCOptions);
                Kraken.Chat.AddIRCHandlers(channel);
                Kraken.Chat.Client.connect();
            },
            error: function () {
                Kraken.Utils.DisplayError("Failed to retrieve subscriber badges via Twitch API..");
            }
        })
    },

    OpenChat: function () {
        $("#chatContainer, #chatToggle").show();
        if (Kraken.CurrentStream) {

            if (Kraken.Chat.Client && Kraken.Chat.Client.connected) {

                if (Kraken.Chat.Client.currentChannels[0] == Kraken.CurrentStream) {
                    return;
                }
            }
            Kraken.Chat.Initialize(Kraken.CurrentStream);
        }
    },

    SystemMessage: function(message) {
        Kraken.Chat.Elements.MessageList.append("<div><span>" + message + "</span></div>");
        Kraken.Chat.ScrollToBottom();
    },

    MessageRecieved: function (channel, user, message) {

        user.Badges = "";
        if (user.special) {
            user.special.forEach(function (type) {
                user.Badges += "<img class='chat-badge' src='" + Kraken.Chat.Emotes.Badges[type].image + "'/>";
            })
        }

        Kraken.Chat.AddChatMessage(user, message);
    },

    ReplaceEmotes: function (msg, ids) {

        ids.forEach(function (id) {

            try {
                var regex = new RegExp(Kraken.Chat.Emotes.Twitch[id].code, 'g');
            } catch (e) {
                console.log(e);     //someone used a new emote - need to refresh emote data
            }

            if (msg.match(regex)) {
                msg = msg.replace(regex, "<img class='emote-image' src='" + Kraken.URL.EmoteBase + id + "/1.0" + "'/>");
            }

        });

        return msg;
    },

    ReplaceBTTVEmotes: function (msg) {

        Kraken.Chat.Emotes.BTTV.emotes.forEach(function (emote) {

            if (msg.indexOf(emote.regex) != -1) {
                var regex = new RegExp(emote.regex.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'g');
                msg = msg.replace(regex, "<img class='emote-image' src='http:" + emote.url + "'/>");
            }

        });

        return msg;
    },

    ScrollToBottom: function() {
        if (Kraken.Chat.Settings.ScrollLock) {
            Kraken.Chat.Elements.MessageList.scrollTop(Kraken.Chat.Elements.MessageList[0].scrollHeight);
        }
    },

    AddChatMessage: function (user, message) {

        message = Kraken.Utils.EscapeHTML(message);
        message = Kraken.Chat.ReplaceBTTVEmotes(message);

        if (!$.isEmptyObject(user.emote)) {

            var emoteIDs = [];
            for (var id in user.emote) {
                emoteIDs.push(id);
            }

            message = Kraken.Chat.ReplaceEmotes(message, emoteIDs);
        }

        Kraken.Chat.Elements.MessageList.append(
            "<div class='chat-line'>" +
             user.Badges +
            "<span class='chat-name' style='color:" + user.color + "'>" + user.username + "</span>" +
            "<span>: </span>" +
            "<span class='chat-text'>" + message + "</span>" +
            "</div>");

        Kraken.Chat.MessageCount++;

        if (Kraken.Chat.MessageCount > 150) {
            $("#chatMessageList div").first().remove();
        }

        $(".chat-name").last().click(function () {
            var existingText = $("#chatMessageText").val();
            if (existingText && existingText != "") {
                $("#chatMessageText").val(existingText + " @" + $(this).text());
            } else {
                $("#chatMessageText").val("@" + $(this).text() + " ");
            }
            $("#chatMessageText").focus();
        });

        $("#chatMessageList").getNiceScroll().resize();
        Kraken.Chat.ScrollToBottom();
    },

    AddIRCHandlers: function (channel) {

        Kraken.Chat.Client.addListener('connected', function (address, port) {
            Kraken.Elements.chatLoadIndicator.hide();
            $("#chatHeader").text(channel);
        });
        Kraken.Chat.Client.addListener('connectfail', function () {
            Kraken.Elements.chatLoadIndicator.hide();
            Kraken.Chat.SystemMessage("Failed to connect to #" + channel);
        });
        Kraken.Chat.Client.addListener('chat', Kraken.Chat.MessageRecieved);
        Kraken.Chat.Client.addListener('subscription', function (channel, username) {
            Kraken.Chat.SystemMessage(username + " has just subscribed!");
        });
        Kraken.Chat.Client.addListener('subanniversary', function (channel, username, months) {
            Kraken.Chat.SystemMessage(username + " just resubscribed! [" + months + " months]");
        });
        Kraken.Chat.Client.addListener('subscriber', function (channel, enabled) {
            enabled ? Kraken.Chat.SystemMessage("Chat is now in subscriber-only mode") : Kraken.Chat.SystemMessage("Chat is no longer in subscriber-only mode");
        });
        Kraken.Chat.Client.addListener('slowmode', function (channel, enabled, length) {
            enabled ? Kraken.Chat.SystemMessage("Chat is now in slow-mode [" + length + " seconds]") : Kraken.Chat.SystemMessage("Chat is no longer in slow mode");
        });
        Kraken.Chat.Client.addListener('timeout', function (channel, username) {
            if (username == Kraken.Username) {
                Kraken.Chat.SystemMessage("You have been timed out on #" + channel);
            }
        });
        Kraken.Chat.Client.addListener('clearchat', function (channel) {
            Kraken.Chat.Elements.MessageList.empty();
            Kraken.Chat.SystemMessage("Chat was cleared");
        });
        Kraken.Chat.Client.addListener('crash', function (message, stack) {
            Kraken.Chat.SystemMessage("Oh No! Twitch-IRC crashed at " + stack + ": " + message);
        });
        Kraken.Chat.Client.addListener('disconnected', function (reason) {
            Kraken.Chat.SystemMessage("Disconnected from #" + channel + " due to " + reason);
        });
        Kraken.Chat.Client.addListener('reconnect', function (reason) {
            Kraken.Elements.chatLoadIndicator.show();
            $("#chatLoadingText").text("Reconnecting to #" + channel);
        });
    },

    SetEnabledState: function() {
        if (Kraken.Chat.Settings.Enabled) {
            $("#chatEnabled").attr("data-state", "enabled");
            Kraken.Chat.OpenChat();
        } else {
            $("#chatContainer, #chatToggle").hide();
            $("#chatEnabled").attr("data-state", "disabled");
            if (Kraken.Chat.Client && Kraken.Chat.Client.connected) {
                Kraken.Chat.Client.disconnect();
            }
        }
    },

    AddEventHandlers: function () {

        $("#chatToggle").click(function () {

            Kraken.Chat.Elements.isChatOpen = !Kraken.Chat.Elements.isChatOpen;

            $("#chatContainer").toggle();
            $("#chatToggle > i").toggleClass("mdi-hardware-keyboard-arrow-left mdi-hardware-keyboard-arrow-right")
        });

        $("#checkChat").click(function () {
            Kraken.Chat.Settings.Enabled = !Kraken.Chat.Settings.Enabled;
            localStorage.setItem("ChatEnabled", Kraken.Chat.Settings.Enabled);

            Kraken.Chat.SetEnabledState();
        });

        $("#chatMessageList").scroll(function (e) {
            if ((e.currentTarget.scrollHeight - e.currentTarget.scrollTop) <= (e.currentTarget.clientHeight * 1.25)) {
                Kraken.Chat.Settings.ScrollLock = true;
            } else {
                Kraken.Chat.Settings.ScrollLock = false;
            }
        });

        $("#chatToken").change(function () {

            var value = $(this).val();

            if (value && value != "") {
                Kraken.Chat.OAuthToken = value;
                localStorage.setItem("ChatToken", value);
            } else {
                Kraken.Chat.OAuthToken = null;
                localStorage.removeItem("ChatToken");
            }
        });

        //$("#btnSendChat").click(function () {

        //    if (Kraken.Chat.Client && Kraken.Chat.Client.connected && (Kraken.Chat.Client.myself == Kraken.Username)) {
        //        var msg = $("#chatMessageText").val();
        //        if (msg && msg != "") {                    
        //            Kraken.Chat.Client.say(Kraken.CurrentStream, msg).then(function () {
        //                Kraken.Chat.AddChatMessage(Kraken.Username, msg);
        //                $("#chatMessageText").val("");
        //            });
        //        }
        //    }
        //});

        $('#chatMessageText').keypress(function (e) {
            if (e.keyCode == 13) $("#btnSendChat").click();
        })

    },

    SetDefaults: function () {

        Kraken.Chat.Settings.Enabled = JSON.parse(localStorage.getItem("ChatEnabled"));
        Kraken.Chat.OAuthToken = localStorage.getItem("ChatToken");

        if (Kraken.Chat.Settings.Enabled == null) {
            Kraken.Chat.Settings.Enabled = true;
        }

        if (Kraken.Chat.OAuthToken != null) {
            $("#chatToken").val(Kraken.Chat.OAuthToken);
        }

        Kraken.Chat.SetEnabledState();

        $("#chatMessageList, .chat-textarea").niceScroll({
            autohidemode:"none",
            cursorwidth: "1px",
        });

        if (localStorage.getItem("TwitchEmoteData") == null) {
            Kraken.Chat.GetEmoteData();
        } else {
            Kraken.Chat.Emotes = JSON.parse(localStorage.getItem("TwitchEmoteData"));
        }

    }
}