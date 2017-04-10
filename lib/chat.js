'use strict'

const fetch = require('node-fetch');


function Chat(moxtrabot, data, condition) {

  this.moxtrabot = moxtrabot;
  this.data = data;
  
  if (condition) {
  	this.condition = condition;
  }
 
	if (data) {	  
		this.access_token = data.access_token;
		this.binder_id = data.binder_id;
		
		this.event = data.event;
		
		console.log("chat data: " + JSON.stringify(data));
		
		
		this.user_id = this.event.user.id;
		this.username = this.event.user.name;
		
    var message_type = data.message_type;
      
    switch(message_type) {
  		case "bot_installed":
  			this.bot = this.event.bot;
  			break;
  		
  		case "page_created":
  			this.page = this.event.page;
  			break;
  		
			case "file_uploaded":
				this.file = this.event.file;
				break;
			
			case "page_annotated":  
				this.annotate = this.event.annotate;
				break;
				
			case "todo_created":  	
			case "todo_completed":
				this.todo = this.event.todo;
				break;
			
			case "meet_recording_ready":  	
  	    this.meet = this.event.meet;
  	    break;
      
	  	case "comment_posted": 
	  	case "comment_posted_on_page":
  	    this.comment = this.event.comment;	
  	    break;
  	
  		case "bot_postback": 
  	    this.postback = this.event.postback;
  	    break;  	    
    }    
	}
}	

// send Text Message
Chat.prototype.sendText = function(text, buttons, options) {
  const message = { text };
  if (buttons) {
		const formattedButtons = _formatButtons(buttons);
		message.buttons = formattedButtons;    
  }
  return this.send(message, options);	
};

// send Richtext Message
Chat.prototype.sendRichText = function(richtext, buttons, text, options) {
  const message = { richtext };
  if (text) {
   	message.text = text;
  }
  if (buttons) {
		const formattedButtons = _formatButtons(buttons);
		message.buttons = formattedButtons;    
  }
  return this.send(message, options);
};
   
// send JSON Message  
Chat.prototype.sendJSON = function(fields, buttons, options) {
	const message = { fields };
  if (buttons) {
		const formattedButtons = _formatButtons(buttons);
		message.buttons = formattedButtons;    
  }
  return this.send(message, options);
}; 
 
// generic send 
Chat.prototype.send = function(message, options) {
  const body = { message };	
  if (options) {
   	if (options.action && typeof options.action === 'string') {
			message.action = options.action;
	  }	
    if (options.fields_template && Array.isArray(options.fields_template)) {	
			body['fields_template'] = options.fields_template;
		}	
		
		console.log('body: ' + body);
  }
  const req = () => (
    this.sendRequest(body).then((json) => {
    	return json;
    })
  );

  return req();
  
};

// send Request
Chat.prototype.sendRequest = function(body, path, method) {

	if (!this.access_token) {
		console.log("Unable to send request without access_token!");
		return;
	}
	
	path = path || '/messages';
	method = method || 'POST';
	const url = this.moxtrabot.api_endpoint + path; 
	
	console.log("url: " + url + " body: " + JSON.stringify(body));
	
	return fetch(url, {
		method,
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + this.access_token
		},
		body: JSON.stringify(body)
	})
	.then(res => res.json())
	.then(res => {
		if (res.error) {
			console.log(res.error);
		}
			return res;
		})
	.catch(err => {
		console.log(`Error sending message: ${err}`);
		//this.moxtrabot.emit('error', `Error sending message: ${err}`);
	 });
	
};
 
// get Binder Info 
Chat.prototype.getBinderInfo = function(callback) {
	var ret = sendRequest(null, '/messages/binderinfo', 'GET'); 
	if (callback)
		callback(null, ret);
};

// get User Info
Chat.prototype.getUserInfo = function(callback) {

	if (!this.user_id) {
		console.log("Unable to send request without user_id!");
		return;
	}

  return sendRequest(null, '/messages/userinfo/' + this.user_id, 'GET'); 
};

function _formatString(str) {
  return str.replace(/[^\x20-\x7E]+/g, '').toUpperCase();
}

function _formatButtons(buttons) {
	buttons = Array.isArray(buttons) ? buttons : [ buttons ];
	return buttons && buttons.map((button) => {
		if (typeof button === 'string') {
			return {
				type: 'postback',
				text: button,
				payload: 'MOXTRABOT_' + _formatString(button)
			};
		} else if (button && button.text) {
			// account link or postback
			return button;
		}
		return {};
	});
}

module.exports = Chat;
