'use strict';

const Chat = require('./chat');
const EventEmitter = require('eventemitter3');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const URLSafeBase64 = require('urlsafe-base64');


// key: org_id   value: access_token & expired_time from Moxtra
var _moxtraAccessToken = {};

class MoxtraBot extends EventEmitter {

  constructor(config) {
    super();
    
    if (!config || !(config.client_id && config.client_secret && config.api_endpoint)) {
      throw new Error('Please specify client_id, client_secret, and api_endpoint!');
    }
    
    this.client_id = config.client_id;    
    this.client_secret = config.client_secret;
    this._hearMap = [];
    this.api_endpoint = config.api_endpoint;
    this.genericHandling = false;    // default is false
  }
  
  _handleEvent(type, data, conditions) {	   
    const chat = new Chat(this, data, conditions);
    
    this.emit(type, chat);
  }

  _handleMessageEvent(data) {

    const text = data.event.comment.text;
    if (!text)
    	text = data.event.comment.richtext;
    
    if (!text) { return; }

    let primatches = 0;
    this._hearMap.forEach(hear => {
      if (typeof hear.keyword === 'string' && hear.keyword.toLowerCase() === text.toLowerCase()) {
        const res = hear.callback.apply(null, [ new Chat(this, data, {
          match: hear.keyword,
          primatches
        })]);
        primatches++;
        return res;
      } else if (hear.keyword instanceof RegExp && hear.keyword.test(text)) {
        const res = hear.callback.apply(null, [ new Chat(this, data, {
          match: text.match(hear.keyword),
          primatches
        })]);
        primatches++;
        return res;
      }
    });

    // whether to invoke generic handler if no matches
    if (primatches == 0 || this.genericHandling) {
      this._handleEvent('message', data, { primatches });
    }
  }

  _handlePostbackEvent(data) {

    const payload = data.event.postback.payload;
    const text = data.event.postback.text;
    if (text) {
    	this._handleEvent(`postback:${text}`, data);
    }
    this._handleEvent('postback', data);
  }
  
}

// say as the generic way to send message
MoxtraBot.prototype.say = function(access_token, message, options) {
  
    const chat = new Chat(this);   
    chat.access_token = access_token;
  
    if (typeof message === 'string') {
      return chat.sendText(message, null, options);
    } else if (message && message.richtext) {      
      return chat.sendRichText(message.richtext, message.text, message.buttons, options);      
    } else if (message && message.text) { 
      return chat.sendText(message.text, message.buttons, options);
    } else if (message && message.fields) {
      return chat.sendJSON(message.fields, message.buttons, options);	
    } 
    
    console.error('Incorrect say message format!');
};

// hears is to register callback for matching keywords 
MoxtraBot.prototype.hears = function(keywords, callback) {
    keywords = Array.isArray(keywords) ? keywords : [ keywords ];
    keywords.forEach(keyword => this._hearMap.push({ keyword, callback }));
    return this;
};

// handle http GET
MoxtraBot.prototype.handleGetRequest = function(req, res, next) {

  if (req.query['message_type'] === 'account_link') {

    // account_link
    var account_link_token = req.query['account_link_token'];
    console.log('Account Link Token: ' + account_link_token + ' client_secret: ' + this.client_secret);

    // obtain user_id, binder_id, client_id, & org_id
    try {
      var decoded = jwt.verify(account_link_token, this.client_secret);
      console.log(JSON.stringify(decoded));

    } catch(err) {
      // log error			  
      console.error('Unable to verify account_link_token! ' + err);
      res.sendStatus(412);
      return;			  
    }			

    this.emit('account_link', req, res, decoded);
    //res.sendStatus(200);  

    if(typeof next === 'function') {
      next();
    }

  } else {
    // bad request
    res.sendStatus(400);
  }		
};

// handle Http POST
MoxtraBot.prototype.handlePostRequest = function(req, res, next) {
    var data = req.body;
    if (data == null) {
      res.sendStatus(404);
      if(typeof next === 'function') {
	next();
      }       
      return;
    }

    // Send 200 back
    res.sendStatus(200);
      
    var message_type = data.message_type;
      
    switch(message_type) {
	case "bot_enabled":
	case "bot_disabled":
	case "bot_installed":
	case "bot_uninstalled":
	case "page_created":
	case "file_uploaded":  	
	case "page_annotated":  	
	case "todo_created":  	
	case "todo_completed":  	
	case "meet_recording_ready":  	
  	    this._handleEvent(message_type, data);
  	    break;
  	      
	case "comment_posted": 
	case "comment_posted_on_page":
  	    this._handleMessageEvent(data);	
  	    break;
  	
	case "bot_postback": 
  	    this._handlePostbackEvent(data);
  	    break;
    }    
  	
    if(typeof next === 'function') {
      next();
    }  	
};

// verify Moxtra request signature
MoxtraBot.prototype.verifyRequestSignature = function(req, res, buf) {
    var signature = req.headers['x-moxtra-signature'];
    if (!signature) {
      console.error("No signature to validate!");    
      //throw new Error("No request signature!");
      this.emit('error', "No request signature!");
      
    } else {
        
      var elements = signature.split('=');
      var method = elements[0];
      var signatureHash = elements[1];
      var expectedHash = crypto.createHmac('sha1', new Buffer(this.client_secret))
	  .update(new Buffer(buf, 'utf8'))
	  .digest('hex');

      console.log("signature: " + signatureHash + " generated: " + expectedHash);

      if (signatureHash != expectedHash) {
        //throw new Error("Validation on the request signature failed!");
        this.emit('error', "Validation on the request signature failed!");
      }
    }  
};

// objtain org based access_token
MoxtraBot.prototype.getAccessToken = function(client_id, org_id, callback) {

  const timestamp = (new Date).getTime();

  var token = _moxtraAccessToken[ org_id ];

  if (token) {

    console.log('timestamp: ' + timestamp + ' expired_time: ' + token.expired_time);

    // verify if still valid
    if (timestamp < token.expired_time) {

	console.log('getting existing token: ' + token.access_token);

	callback(null, token);
	return;
    }
  }

  const buf = client_id + org_id + timestamp;
  const sig = crypto.createHmac('sha256', new Buffer(this.client_secret))
	  .update(buf)
	  .digest();
  const signature = URLSafeBase64.encode(sig);
  
  const url = this.api_endpoint + '/apps/token?client_id=' + client_id + '&org_id=' + org_id + '&timestamp=' + timestamp + '&signature=' + signature;
  
  console.log("url: " + url);
  
  fetch(url)
  .then(response => {
    response.json().then(json => {

      var org_token = {};
      org_token.access_token = json.access_token;
      org_token.expired_time = timestamp + parseInt(json.expires_in) * 1000;

      // store access_token
      _moxtraAccessToken[ org_id ] = org_token;

      console.log(
	`access_token: ${json.access_token} -`,
	`expires_in: ${json.expires_in}`
      );

      callback(null, org_token);

    });
  })
  .catch(error => {
    console.log(error);
    callback(error, null);
  });
	
};

// whether to invoke generic message event if there are specific matches
// default is false
MoxtraBot.prototype.setGenericHandling = function(flag) {
    this.genericHandling = (flag == true) ? true : false; 
};

module.exports = MoxtraBot;
