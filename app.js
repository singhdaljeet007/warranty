/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/
require('dotenv-extended').load();
var restify = require('restify');
var builder = require('botbuilder');
var cognitiveservices = require('botbuilder-cognitiveservices');

var querystring = require('querystring');
var request = require('request');
var https = require('https');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
    console.log(process.env.LuisAppId)
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.
var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
});

// These cridentials are for LUIS
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';
const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
console.log("Setting Up LUIS and QnA Maker cridentials");

// These cridentials for QnAMaker FAQ KnowledgeBase
var recognizerqnaFAQ = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: process.env.QNAknowledgeBaseIdFAQ,
    authKey: process.env.QNAauthKey,
    endpointHostName: process.env.QNAendpointHostName
});

//  QnAMakerDialog FAQ
var QnAMakerDialogFAQ = new cognitiveservices.QnAMakerDialog({
    recognizers: [recognizerqnaFAQ],
    defaultMessage: 'No match with FAQ! Try changing the query terms!',
    qnaThreshold: 0.3
});

// These cridentials for QnAMaker Troubleshooting  KnowledgeBase 
var recognizerqnaMACHINE = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: process.env.QNAknowledgeBaseIdMACHINE,
    authKey: process.env.QNAauthKey,
    endpointHostName: process.env.QNAendpointHostName
});

//  QnAMakerDialog Troubleshooting
var QnAMakerDialogMACHINE = new cognitiveservices.QnAMakerDialog({
    recognizers: [recognizerqnaMACHINE],
    defaultMessage: 'No match with Troubleshooting! Try changing the query terms!',
    qnaThreshold: 0.3
});

// These cridentials for QnAMaker Fridge  KnowledgeBase 
var recognizerqnaFRIDGE = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: process.env.QNAknowledgeBaseIdFRIDGE,
    authKey: process.env.QNAauthKey2,
    endpointHostName: process.env.QNAendpointHostName2
});

//  QnAMakerDialog Troubleshooting
var QnAMakerDialogFRIDGE = new cognitiveservices.QnAMakerDialog({
    recognizers: [recognizerqnaFRIDGE],
    defaultMessage: 'No match with FRIDGE Troubleshooting! Try changing the query terms!',
    qnaThreshold: 0.3
});

bot.recognizer(recognizer, recognizerqnaMACHINE, recognizerqnaFAQ, recognizerqnaFRIDGE);

///
// QnAMaker Dialog Connections.
///
bot.dialog('qnaFAQ', QnAMakerDialogFAQ);

bot.dialog('qnaMACHINE', QnAMakerDialogMACHINE);

bot.dialog('qnaFRIDGE', QnAMakerDialogFRIDGE);


//This is a hero card for introduction
function createHeroCard(session) {
    return new builder.HeroCard(session)
        .title("Hi! this is Atos ChatBot")
        .subtitle('Your personalized digital assistant')
        .text("Hi I'm here to support, If you need assistant please type 'I need help'")
        .images([
            builder.CardImage.create(session, 'https://www.varindia.com/uploads/2018/02/5bfba0c145634.jpg')
        ]);
}

///
// LUIS Dialog Connections.
// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 
bot.dialog('GreetingDialog',
    (session) => {
        var card = createHeroCard(session);

        // attach the card to the reply message
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
    }
).triggerAction({
    matches: 'Greeting'
})

// These are prepopulated categories and sub categories
helpchoices = ["FAQ", "Troubleshooting", "Warranty Registration", "API Testing", "Other"];   //changes in helpchoices
appliancechoices = ["Washing Machine", "Refrigerator", "Vacuum Cleaner", "Other"]; // changes in softwareChoices


bot.dialog('HelpDialog', [
    function (session) {
        builder.Prompts.choice(session, "You reached the Help, How can I help you?", helpchoices);

    },
    function (session, results, next) {
        if (results.response) {
            // These options are categories for the problem.
            if (results.response.entity === 'FAQ') {   //hardware changed to FAQ 
                session.dialogData.searchType = 'FAQ';
                next(results);
            }
            else if (results.response.entity === 'Troubleshooting') // software changed to Troubleshooting
                builder.Prompts.choice(session, "Which appliance you have an issue with?", appliancechoices);
            else if (results.response.entity === 'Warranty Registration') {// Warranty Registration
                session.dialogData.searchType = 'WarrantyRegistration';
                next(results);
            }
            else if (results.response.entity === 'API Testing') { // API test
                session.dialogData.searchType = 'APITesting';
                next(results);
            }
            else
                builder.Prompts.text(session, "Please can you provide your issue?");
        } else {
            session.send("OK");
        }
    },
    function (session, results, next) {
        // In below cases for seperated for each Service Item, 
        // In every case you can provide more spesific answer for users
        // Here are some sub category samples 
        console.log("-------------------");
        console.log(results.response);

        if (results.response) {
            if (session.dialogData.searchType === 'FAQ') {
                builder.Prompts.text(session, "Please type your query briefly.");
                next();
            }
            else if (results.response.entity === 'Washing Machine' || results.response.entity === 'Vacuum Cleaner') {
                session.dialogData.searchType = 'Troubleshooting';
                builder.Prompts.text(session, "I'll be helping for your '" + results.response.entity + "' issue!, Please can you describe your issue?");
            }
            else if (results.response.entity === 'Refrigerator') {
                session.dialogData.searchType = 'FridgeTroubleshooting';
                builder.Prompts.text(session, "I'll be helping for your '" + results.response.entity + "' issue!, Please can you describe your issue?");
            }
            else if (session.dialogData.searchType === 'WarrantyRegistration') {
                next(results);
            }
            else if (session.dialogData.searchType === 'APITesting') {
                next(results);
            }
            else if (results.response.entity === 'Other')
                builder.Prompts.text(`Your issue is listed as other, I'll be happy to help please describe your issues!`);
            else
                //send the query into other QnA KB. 
                session.send(`I'll be helping for your request: %s`, session.response);
        } else {
            session.send("OK");
        }
    },
    function (session, results) {
        if (results.response) {
            console.log("------------------");
            console.log(results.response);
            console.log("------------------");
            console.log(session.dialogData.searchType);

            if (session.dialogData.searchType === 'FAQ')
                session.beginDialog('qnaFAQ');
            else if (session.dialogData.searchType === 'Troubleshooting') {
                console.log("MACHINE QNA triggered");
                session.beginDialog('qnaMACHINE');
            }
            else if (session.dialogData.searchType === 'FridgeTroubleshooting') {
                console.log("FRIDGE Troubleshooting QNA triggered");
                session.beginDialog('qnaFRIDGE');
            }
            else if (session.dialogData.searchType === 'WarrantyRegistration') {
                console.log("Warranty Registration LUIS triggered");
                session.beginDialog('luisWarranty');
            }
            else if (session.dialogData.searchType === 'APITesting') {
                console.log("API Testing triggered");
                session.beginDialog('apiTesting');
            }
        } else {
            session.send("OK");
        }
    }
]
).triggerAction({
    matches: 'Help'
})


bot.dialog('luisWarranty', [
    function (session) {
        session.dialogData.userObject = {};
        builder.Prompts.text(session, 'I understand you want to register for a warranty. But before that I will require some details.\nWhat is your name?');
    },
    async function (session, results) {
        if (results.response) {
            console.log("Name : " + results.response);
            let luisResponseData = await sendDataToLUIS(results.response);
            console.log("luis response data : " + luisResponseData);
            session.dialogData.userObject.name = luisResponseData.entities[0].entity;
            console.log("data " + luisResponseData.entities[0].entity)
            builder.Prompts.text(session, 'What is your email?');
        }
    },
    async function (session, results) {
        if (results.response) {
            console.log("EmailId : " + results.response);
            let luisResponseData = await sendDataToLUIS(results.response);
            session.dialogData.userObject.email = luisResponseData.entities[0].entity;
            builder.Prompts.text(session, 'What is your mobile number?');
        }
    },
    async function (session, results) {
        if (results.response) {
            console.log("Name : " + results.response);
            let luisResponseData = await sendDataToLUIS(results.response);
            session.dialogData.userObject.mobileNumber = luisResponseData.entities[0].entity;
            builder.Prompts.text(session, 'What is your appliance serial number?');
        }
    },
    async function (session, results) {
        if (results.response) {
            console.log("Name : " + results.response);
            let luisResponseData = await sendDataToLUIS(results.response);
            session.dialogData.userObject.applianceNumber = luisResponseData.entities[0].entity;
            console.log("userObject: " + session.dialogData.userObject.name + " " + session.dialogData.userObject.email + " " + session.dialogData.userObject.mobileNumber);
            builder.Prompts.text(session, 'Please confirm your details before procedding with warranty registration.' + "\nName: " + session.dialogData.userObject.name + "\nEmail: " + session.dialogData.userObject.email + "\nMobile Number: " + session.dialogData.userObject.mobileNumber + "\nAppliance Serial Number: " + session.dialogData.userObject.applianceNumber + "\nPlease type 'yes' to confirm");
        }
    },
    function (session, results) {
        if (results.response) {
            if (results.response === 'yes') {
                builder.Prompts.text(session, 'Your warranty registration is successful.\nYour Warranty Number is 123456');
            }
        }
    }
])

bot.dialog('apiTesting', [
    function (session) {
        builder.Prompts.text(session, 'Please type Model number.');
    },
    async function (session, results) {
        if (results.response) {
            console.log("Model Number typed by user: " + results.response);
            var productDetails = await getProductDetails(results.response);
            console.log("Api Test data: " + productDetails);
            builder.Prompts.text(session,  productDetails);
        }
    }
])

bot.dialog('CancelDialog',
    (session) => {
        session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
    }
).triggerAction({
    matches: 'Cancel'
})

async function sendDataToLUIS(utterance) {
    return new Promise(function (resolve, reject) {
        let luisEndpoint = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId;

        console.log("Utterance : " + utterance);
        let queryParams = {
            "verbose": true,
            "q": utterance,
            "subscription-key": luisAPIKey,
        }

        let luisRequest = luisEndpoint + "?" + querystring.stringify(queryParams);
        request(luisRequest, function (error, response, body) {
            if (error) {
                console.log("Error while retreiving data from LUIS: " + error);
            }
            else {
                let data = JSON.parse(body);
                //console.log("json :" + JSON.stringify(body))
                //console.log(`Top Intent:  ${data.topScoringIntent.intent}`); //${data.entities[0].entity}`
                resolve(data);
            }
        });
    });
}

async function getProductDetails(modelNumber) {
    return new Promise(function (resolve, reject) {
        let baseEnpoint = "https://product-information-api.au-syd.mybluemix.net/api/v1.0";
        let productEndpoint = baseEnpoint + "/product/" + modelNumber;

        request.get({
            method: 'GET',
            uri: productEndpoint,
            headers: {
                'api-key': 'MAOA-X5DA-F27R-K6R4',
                'accept': 'application/json',
            }
        },
            function (error, response, body) {
                if (error) {
                    console.log("Error while retreiving data from Product api: " + error);
                }
                else {
                    let data = JSON.stringify(body);
                    console.log("data : " + data);
                    resolve(data);
                }
            });
    });
}    