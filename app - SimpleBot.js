var restify = require('restify');
var builder = require('botbuilder');
//=========================================================
// Bot Setup
//=========================================================
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('listening to %s', server.url);
});

var connector = new builder.ChatConnector({
    appId: 'e0038a8f-7906-4cdb-9c58-7a852ab4a1fc',
    appPassword: 'hkWV4}^ruuxeLKXYV4762?*'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send("You said: %s", session.message.text);
})