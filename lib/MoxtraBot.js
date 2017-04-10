'use strict';

const Chat = require('./chat');
const EventEmitter = require('eventemitter3');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');


class MoxtraBot extends EventEmitter {

  constructor(config) {
    super();
    
    if (!config || !(config.verify_token && config.client_secret)) {
      throw new Error('Please specify verify_token and client_secret!');
    }
    
    this.verify_token = config.verify_token;
    this.client_secret = config.client_secret;
    this._hearMap = [];
    this.api_endpoint = "https://api.grouphour.com/v1";	
    
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

    this._handleEvent('message', data, { primatches });
  }

  _handlePostbackEvent(data) {

    const payload = data.event.postback.payload;
    const text = data.event.postback.text;
		if (text) {
    	this._handleEvent(`postback:${text}`, data);
    }
    this._handleEvent('postback', data);
  }
  
  _handleUninstallEvent(type, data) {	   
    this.emit(type, data);
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

		if (req.query['message_type'] === 'bot_verify' && req.query['verify_token'] === this.verify_token) {
			console.log('Verification Succeed!')
			res.status(200).send(req.query['bot_challenge']);
			
		} else if (req.query['message_type'] === 'account_link') {
		
			// account_link
			var account_link_token = req.query['account_link_token'];
			console.log('Account Link Token: ' + account_link_token);
			
			// obtain user_id & binder_id
			try {
			  var decoded = jwt.verify(account_link_token, this.client_secret);
			  console.log(JSON.stringify(decoded));
			  
				this.emit('account_link', req, res, decoded);
				//res.sendStatus(200);  
			  
			} catch(err) {
			  // log error			  
				console.error('Unable to verify account_link_token!');
				res.sendStatus(412);
			  
			}			
			
		} else {
			console.error('Verification Failed!');
			res.sendStatus(403);
		}
		
    if(typeof next === 'function') {
      next();
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
  		case "bot_installed":   		
  		case "page_created":
			case "file_uploaded":  	
			case "page_annotated":  	
			case "todo_created":  	
			case "todo_completed":  	
			case "meet_recording_ready":  	
  	    this._handleEvent(message_type, data);
  	    break;
  	    
  	  case "bot_uninstalled":  
  	    this._handleUninstallEvent(message_type, data);	
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

module.exports = MoxtraBot;
