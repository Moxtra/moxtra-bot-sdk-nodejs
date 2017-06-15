'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const MoxtraBot = require('../../');

// key: binder_id   value: access_token from Moxtra
var _moxtraAccessToken = {};

// create moxtra bot
const bot = new MoxtraBot({
  verify_token: 'YOUR_VERIFY_TOKEN',
  client_secret: 'YOUR_CLIENT_SECRET'
});

bot.on('bot_installed', (chat) => {

  const binder_id = chat.binder_id;
  const access_token = chat.access_token;
  
  // store binder based Moxtra access_token
  _moxtraAccessToken[ binder_id ] = access_token;
  
  const username = chat.username;
  chat.sendText(`@${username} Welcome to MoxtraBot!!`);
});

bot.on('bot_uninstalled', (data) => {

  const binder_id = data.binder_id;
  
  // remove Moxtra access_token for this binder
  delete _moxtraAccessToken[ binder_id ];
  
	console.log(`Bot uninstalled on ${binder_id}`);
});

bot.on('message', (chat) => {

	const username = chat.username;
  const text = chat.comment.text;

	const condition = chat.condition;

  if (condition && condition.primatches > 0) {
    // don't handle message again
    console.log(`message has been handled: @${username} ${text} for ${condition.primatches} times`);
  	return;
  }

  chat.sendText(`Echo: @${username} ${text}`);
});

bot.hears([/(file|audio|attach)? upload/i, 'attachment'], (chat) => {

	const username = chat.username;
  const text = chat.comment.text;

	const condition = chat.condition;

  if (condition) {  
  	if (condition.primatches > 0) {
  	  // handle message again
  	  console.log(`message has been handled: @${username} ${text} on ${condition.match} for ${condition.primatches} times`);
  		return;
    } else {
    	console.log(`message for: @${username} ${text} on ${condition.match}`);    
    }
  }

	var options = {};
	options.file_path = `${__dirname}/examples/Upload/start.png`;
	options.audio_path = `${__dirname}/examples/Upload/test_comment.3gpp`;
	
  chat.sendText(`@${username} upload files`, null, options);
});

// App
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json( { verify: bot.verifyRequestSignature.bind(bot) }));

// bot verification
app.get('/webhooks', (req, res, next) => {
	bot.handleGetRequest(req, res, next);
});

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

