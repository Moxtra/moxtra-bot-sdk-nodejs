'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const MoxtraBot = require('../../');

// create moxtra bot
const bot = new MoxtraBot({
  client_id: 'YOUR_CLIENT_ID',
  client_secret: 'YOUR_CLIENT_SECRET',
  api_endpoint: 'https://apisandbox.moxtra.com/v1'
});

bot.on('bot_installed', (chat) => {

  const username = chat.username;  
  
  // obtain access_token    
  bot.getAccessToken(chat.client_id, chat.org_id, function(error, token) {

	if (error) {
	  // error happens

	} else {
	  chat.setAccessToken(token.access_token);

	  chat.sendText(`@${username} Welcome to MoxtraBot!!`);
	}
  });
  
});

bot.on('bot_uninstalled', (chat) => {

  const binder_id = chat.binder_id;
  
  console.log(`Bot uninstalled on ${binder_id}`);
});

bot.on('message', (chat) => {

  const username = chat.username;
  const text = chat.comment.text;

  // obtain access_token    
  bot.getAccessToken(chat.client_id, chat.org_id, function(error, token) {

	if (error) {
	  // error happens

	} else {
	  chat.setAccessToken(token.access_token);

	  chat.sendText(`Echo: @${username} ${text}`);
	}
  });
  
});

// App
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json( { verify: bot.verifyRequestSignature.bind(bot) }));

// handle message events
app.post('/webhooks', (req, res, next) => {
  bot.handlePostRequest(req, res, next);
});	

app.use(function(err, req, res, next) { 
  if (process.env.NODE_ENV !== 'test') { 
    console.error(err.stack);
  }

  var code = err.code || 500;
  var message = err.message;
  res.writeHead(code, message, {'content-type' : 'application/json'});
  res.end(err);

});

app.set('host', process.env.HOST || 'localhost');
app.set('port', process.env.PORT || 3000);
//app.set('sslport', process.env.SSLPORT || 3003);

app.listen(app.get('port'), function() {
  console.log('Server started: http://%s:%s', app.get('host'), app.get('port'));
});

module.exports = app;

