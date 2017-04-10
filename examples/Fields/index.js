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

	const fields = {
		title: 'BBCode Info',
		from: username,
		info: text,
		image_url: 'https://www.bbcode.org/images/lubeck_small.jpg'
	};
	const options = {
		action: 'page',
		fields_template: [
			{
				 template_type: 'page',
				 template: '<p><image src="{{image_url}}" height="36" width="36"/><br/>' +
				  '<div>Title: {{title}}<br/>From: {{from}}<br/>Message: {{info}}</div></p>'				
			}
		]  
	};  

  chat.sendJSON(fields, null, options);
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

