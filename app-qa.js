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
//var bot = new builder.UniversalBot(connector);
//server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send("You said: %s", session.message.text);
})

var recognizer = new builder_cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: 'a521defe-72d3-4ef9-a6a7-ebaca5ba2926', // process.env.QnAKnowledgebaseId, 
    subscriptionKey: '7a62c495-bcca-4425-84ec-252ed4efa352'}); //process.env.QnASubscriptionKey});

var basicQnAMakerDialog = new builder_cognitiveservices.QnAMakerDialog({
recognizers: [recognizer],
defaultMessage: 'No match! Try changing the query terms!',
qnaThreshold: 0.3}
);

basicQnAMakerDialog.respondFromQnAMakerResult = function(session, qnaMakerResult){
    // Save the question
    var question = session.message.text;
    session.conversationData.userQuestion = question;

    // boolean to check if the result is formatted for a card
    var isCardFormat = qnaMakerResult.answers[0].answer.includes(';');

    if(!isCardFormat){
        // Not semi colon delimited, send a normal text response 
        session.send(qnaMakerResult.answers[0].answer);
    }else if(qnaMakerResult.answers && qnaMakerResult.score >= 0.5){
        
        var qnaAnswer = qnaMakerResult.answers[0].answer;
        
                var qnaAnswerData = qnaAnswer.split(';');
                var title = qnaAnswerData[0];
                var description = qnaAnswerData[1];
                var url = qnaAnswerData[2];
                var imageURL = qnaAnswerData[3];
        
                var msg = new builder.Message(session)
                msg.attachments([
                    new builder.HeroCard(session)
                    .title(title)
                    .subtitle(description)
                    .images([builder.CardImage.create(session, imageURL)])
                    .buttons([
                        builder.CardAction.openUrl(session, url, "Learn More")
                    ])
                ]);
        }
    session.send(msg).endDialog();
}

bot.dialog('/', basicQnAMakerDialog);