
'use strict';

var Kraken = Kraken || {};

Kraken = {
    
    Username: null,
    Streams: [],
    StaleStreams: [],
    FollowingCount: 0,
    CurrentStream: null,
    RefreshTimeout: null,
    IdleTimeout: null,
    URL: {
        Base: "http://twitch.tv/",
        APIBase: "https://api.twitch.tv/",
        UsherBase:"http://usher.twitch.tv/",
        DefaultProfileImage: "http://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_150x150.png",
        EmoteBase: "http://static-cdn.jtvnw.net/emoticons/v1/"
    },
    Elements: {
        menuLoadIndicator: $("#menuLoadIndicator"),
        chatLoadIndicator: $("#chatLoadIndicator"),
        streamList: $("#streamList"),
        userButton: $("#btnGetUser"),
        chatFrame: $("#chatFrame"),
        isMenuOpen: true
    },

    Settings: {
        ShowChat: false,
        Quality: null,
        ShouldNotify: null,
    },

    HTMLEntities: {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    },

    Modules: {
        HTTP: require('http'),
        HTTPS: require('https'),
        IRC: require('twitch-irc'),
        NWGUI: require('nw.gui')
    },

    Initialize: function () {
        Kraken.Utils.AddEventHandlers();
        Kraken.Utils.SetDefaults();
        Kraken.Chat.AddEventHandlers();
        Kraken.Chat.SetDefaults();
    }
};


$(function () {

    Kraken.Initialize();

});