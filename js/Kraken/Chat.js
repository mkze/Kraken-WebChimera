
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
    Elements: {
        MessageList: document.getElementById("chatMessageList"),
        ChatLoadingText: document.getElementById("chatLoadingText"),
        ChatContainer: document.getElementById("chatContainer"),
        ChatToggle: document.getElementById("chatToggle"),
        ChatEnabled: document.getElementById("chatEnabled"),
        ButtonSendChat: document.getElementById("btnSendChat"),
        ChatMessageText: document.getElementById("chatMessageText"),
        ChatToken: document.getElementById("chatToken"),
        isChatOpen: true
    },
    Settings: {
        Enabled: null,
        ScrollLock: true
    },

    GetEmoteData: function() {

        Kraken.Elements.chatLoadIndicator.style.display = "block";
        Kraken.Chat.Elements.ChatLoadingText.textContent = "Retrieving emote data...";

        Kraken.Utils.GetJSONP("https://api.twitch.tv/kraken/chat/emoticon_images", function (data) {
            if (data) {
                data.emoticons.forEach(function (emoticon) {
                    Kraken.Chat.Emotes.Twitch[emoticon.id] = { code: emoticon.code, emoticon_set: emoticon.emoticon_set };
                });
            }

            Kraken.Modules.HTTPS.get("https://api.betterttv.net/emotes", function (res) {

                var response = "";

                res.on('data', function (chunk) {
                    response += chunk;
                });

                res.on('end', function () {
                    Kraken.Chat.Emotes.BTTV = JSON.parse(response);
                    Kraken.Elements.chatLoadIndicator.style.display = "none";
                    localStorage.setItem("TwitchEmoteData", JSON.stringify(Kraken.Chat.Emotes));
                });
            }).on('error', function (e) {
                Kraken.Utils.DisplayError("Error retrieving BTTV emotes: " + e.message);
            });

        });
    },

    Initialize: function (channel) {

        Kraken.Elements.chatLoadIndicator.style.display = "block";
        Kraken.Chat.Elements.ChatLoadingText.textContent = "Connecting to #" + channel;
        Kraken.CurrentStream = channel;

        if (Kraken.Chat.Client) {
            Kraken.Chat.Client.disconnect();
            Kraken.Chat.Elements.MessageList.innerHTML = "";
        }

        Kraken.Utils.GetJSONP("https://api.twitch.tv/kraken/chat/"+ channel +"/badges", function(data) {
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
        });

    },

    OpenChat: function () {
        Kraken.Chat.Elements.ChatContainer.style.display = "block";
        Kraken.Chat.Elements.ChatToggle.style.display = "block";

        if (Kraken.CurrentStream) {

            if (Kraken.Chat.Client && Kraken.Chat.Client.connected) {

                if (Kraken.Chat.Client.currentChannels[0] == Kraken.CurrentStream) {
                    return;
                }
            }
            Kraken.Chat.Initialize(Kraken.CurrentStream);
        }
    },

    SystemMessage: function (message) {

        var div = document.createElement("div");
        var span = document.createElement("span");

        span.textContent = message;
        div.appendChild(span);

        Kraken.Chat.Elements.MessageList.appendChild(div);
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
                msg = msg.replace(regex, "<img onload='Kraken.Chat.ScrollToBottom' class='emote-image' src='" + Kraken.URL.EmoteBase + id + "/1.0" + "'/>");
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
            Kraken.Chat.Elements.MessageList.scrollTop = Kraken.Chat.Elements.MessageList.scrollHeight;
        }
    },

    AddChatMessage: function (user, message) {

        message = Kraken.Utils.EscapeHTML(message);
        message = Kraken.Chat.ReplaceBTTVEmotes(message);

        if (Object.keys(user.emote).length != 0) {

            var emoteIDs = [];
            for (var id in user.emote) {
                emoteIDs.push(id);
            }

            message = Kraken.Chat.ReplaceEmotes(message, emoteIDs);
        }

        Kraken.Chat.Elements.MessageList.insertAdjacentHTML("beforeend", 
            "<div class='chat-line'>" +
                 user.Badges +
                "<span class='chat-name' style='color:" + user.color + "'>" + user.username + "</span>" +
                "<span>: </span>" +
                "<span class='chat-text'>" + message + "</span>" +
            "</div>");

        while (Kraken.Chat.Elements.MessageList.children.length > 150 && Kraken.Chat.Settings.ScrollLock) {
            Kraken.Chat.Elements.MessageList.removeChild(Kraken.Chat.Elements.MessageList.firstChild);
        }

        var lastMessage = Kraken.Chat.Elements.MessageList.lastChild.querySelector(".chat-name");
        lastMessage.addEventListener("click", function () {
            var chatMessageText = Kraken.Chat.Elements.ChatMessageText;
            var existingText = chatMessageText.value;

            if (existingText && existingText != "") {
                chatMessageText.value = existingText + " @" + this.textContent;
            } else {
                chatMessageText.value = "@" + this.textContent + " ";
            }

            chatMessageText.focus();
        });

        Kraken.Chat.ScrollToBottom();
    },

    AddIRCHandlers: function (channel) {

        Kraken.Chat.Client.addListener('connected', function (address, port) {
            Kraken.Elements.chatLoadIndicator.style.display = "none";
            document.getElementById("chatHeader").textContent = channel;
        });
        Kraken.Chat.Client.addListener('connectfail', function () {
            Kraken.Elements.chatLoadIndicator.style.display = "none";
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
            Kraken.Chat.Elements.MessageList.innerHTML = "";
            Kraken.Chat.SystemMessage("Chat was cleared by a moderator");
        });
        Kraken.Chat.Client.addListener('crash', function (message, stack) {
            Kraken.Chat.SystemMessage("Oh No! Twitch-IRC crashed at " + stack + ": " + message);
        });
        Kraken.Chat.Client.addListener('disconnected', function (reason) {
            Kraken.Chat.SystemMessage("Disconnected from #" + channel + " due to " + reason);
        });
        Kraken.Chat.Client.addListener('reconnect', function (reason) {
            Kraken.Elements.chatLoadIndicator.style.display = "block";
            Kraken.Chat.Elements.ChatLoadingText.textContent = "Reconnecting to #" + channel;
        });
    },

    SetEnabledState: function() {
        if (Kraken.Chat.Settings.Enabled) {
            Kraken.Chat.Elements.ChatEnabled.setAttribute("data-state", "enabled");
            Kraken.Chat.OpenChat();
        } else {
            Kraken.Chat.Elements.ChatContainer.style.display = "none";
            Kraken.Chat.Elements.ChatToggle.style.display = "none";
            Kraken.Chat.Elements.ChatEnabled.setAttribute("data-state", "disabled");
            if (Kraken.Chat.Client && Kraken.Chat.Client.connected) {
                Kraken.Chat.Client.disconnect();
            }
        }
    },

    AddEventHandlers: function () {

        document.getElementById("chatToggle").addEventListener("click", function () {

            Kraken.Chat.Elements.isChatOpen = !Kraken.Chat.Elements.isChatOpen;

            var chat = document.getElementById("chatContainer");
            var displayStyle = Kraken.Chat.Elements.isChatOpen ? "block" : "none";
            chat.style.display = displayStyle;

            var toggleIndicator = document.querySelector("#chatToggle > i");
            toggleIndicator.classList.toggle("mdi-hardware-keyboard-arrow-left");
            toggleIndicator.classList.toggle("mdi-hardware-keyboard-arrow-right");
        });

        document.getElementById("checkChat").addEventListener("click", function () {
            Kraken.Chat.Settings.Enabled = !Kraken.Chat.Settings.Enabled;
            localStorage.setItem("ChatEnabled", Kraken.Chat.Settings.Enabled);

            Kraken.Chat.SetEnabledState();
        });

        Kraken.Chat.Elements.MessageList.addEventListener("scroll", function (e) {
            if ((e.currentTarget.scrollHeight - e.currentTarget.scrollTop) <= (e.currentTarget.clientHeight * 1.25)) {
                Kraken.Chat.Settings.ScrollLock = true;
            } else {
                Kraken.Chat.Settings.ScrollLock = false;
            }
        });

        Kraken.Chat.Elements.ChatToken.addEventListener("change", function () {

            var value = this.value;

            if (value && value != "") {
                Kraken.Chat.OAuthToken = value;
                localStorage.setItem("ChatToken", value);
            } else {
                Kraken.Chat.OAuthToken = null;
                localStorage.removeItem("ChatToken");
            }
        });

        Kraken.Chat.Elements.ButtonSendChat.addEventListener("click", function () {

            if (Kraken.Chat.Client && Kraken.Chat.Client.connected && (Kraken.Chat.Client.myself == Kraken.Username)) {
                var msg = Kraken.Chat.Elements.ChatMessageText.value;
                if (msg && msg != "") {                    
                    Kraken.Chat.Client.say(Kraken.CurrentStream, msg).then(function () {
                        Kraken.Chat.AddChatMessage(Kraken.Username, msg);
                        Kraken.Chat.Elements.ChatMessageText.value = "";
                    });
                }
            }
        });

        document.getElementById('chatMessageText').addEventListener("keypress", function (e) {
            if (e.keyCode == 13) Kraken.Chat.Elements.ButtonSendChat.click();
        })

    },

    SetDefaults: function () {

        Kraken.Chat.Settings.Enabled = JSON.parse(localStorage.getItem("ChatEnabled"));
        Kraken.Chat.OAuthToken = localStorage.getItem("ChatToken");

        if (Kraken.Chat.Settings.Enabled == null) {
            Kraken.Chat.Settings.Enabled = true;
        }

        if (Kraken.Chat.OAuthToken != null) {
            Kraken.Chat.Elements.ChatToken.value = Kraken.Chat.OAuthToken;
        }

        Kraken.Chat.SetEnabledState();

        if (localStorage.getItem("TwitchEmoteData") == null) {
            Kraken.Chat.GetEmoteData();
        } else {
            Kraken.Chat.Emotes = JSON.parse(localStorage.getItem("TwitchEmoteData"));
        }

    }
}