'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const MoxtraBot = require('../../');
const OAuth2 = require('../../lib/oauth2');
const config = require('./config');

// key: binder_id + user_id   value: chat
var _pendingResponse = {};

// key: user_id   value: chat
var _pendingOAuth = {};

// key: user_id   value: accessToken from the 3rd party service
var _accountLinked = {};

// key: binder_id   value: access_token from Moxtra
var _moxtraAccessToken = {};

// create moxtra bot
const bot = new MoxtraBot(config);

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

bot.hears([/(schedule|plan|have)? meet/i, 'meeting together'], (chat) => {

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
	
	var buttons = [{
		type: 'account_link',
		text: 'Sign In'
	}];
	
	// save chat in pendingResponse for account_link
	_pendingResponse[ chat.binder_id + chat.user_id ] = chat;
	
	chat.sendText(`@${username} do you need to schedule a meet?`, buttons);
});

// obtain account_link info in the following format
// { 
//   timestamp: xxxx,
//   user_id: xxxx,
//   username: xxxx,
//   binder_id: xxxx
// }

bot.on('account_link', (req, res, data) => {
	
	const user_id = data.user_id;
	const username = data.username;
	const binder_id = data.binder_id;
	
	// obtain from pendingResponse
	const chat = _pendingResponse[ binder_id + user_id ];
	
	if (chat) {	  
		chat.sendText(`@${username} performs an account_link for user_id: ${user_id} on binder_id: ${binder_id}`);
	} else {
		chat = _pendingOAuth[ user_id ];	
	}
	
	// saved linked accessToken from the 3rd party service
	const accessToken = _accountLinked[ user_id ];
	
	if (accessToken) {	
		res.sendStatus(200);
		
		if (!chat) {
			console.log('Unable to get pending request!');	
			
			// create a new Chat
			chat = new Chat(bot);
			chat.access_token = _moxtraAccessToken[ binder_id ];
		}	
			
		chat.sendText(`@${username} has already obtained access_token from the 3rd party service!`);			
		
	}	else { 

	  delete _pendingResponse[ binder_id + user_id ];	  

		// save chat to the pendingOAuth 
		_pendingOAuth[ user_id ] = chat;

		// redirect if needed	
		res.cookie('user_id', user_id);
		
		res.redirect('/auth');		
	}	
	
});

// after doing OAuth2 against the 3rd party service to obtain a user level access_token
bot.on('access_token', (accessToken, req) => {

	const user_id = req.cookies.user_id;
	var chat;
	
	if (user_id) {
		chat = _pendingOAuth[ user_id ];		
		
		// save linked accessToken
		_accountLinked[ user_id ] = accessToken;
	}
	
	if (chat) {
		
	  delete _pendingOAuth[ user_id ];

		// complete the pending request
		const username = chat.username;
		const text = chat.comment.text;
		
		chat.sendText(`@${username} after account linked, bot will complete your request: ${text}`);
	}

	console.log(`Obtained access_token: ${accessToken.token.access_token} for user ${user_id}`);

});

const oauth2 = new OAuth2(bot, config);

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json( { verify: bot.verifyRequestSignature.bind(bot) }));
app.use(cookieParser());

// OAuth2 request flow
app.get('/auth', (req, res, next) => { 
	oauth2.auth(req, res, next);
});

// OAuth2 callback to obtain access_token
app.get('/callback', (req, res, next) => {
	oauth2.callback(req, res, next);
});

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

