'use strict'

const fetch = require('node-fetch');
const formData = require('form-data');
const fs = require('fs');


function Chat(moxtrabot, data, condition) {

  this.moxtrabot = moxtrabot;
  this.data = data;
  
  if (condition) {
    this.condition = condition;
  }
 
  if (data) {	  
    this.client_id = data.client_id;
    this.org_id = data.org_id;
    this.binder_id = data.binder_id;

    this.event = data.event;

    console.log("chat data: " + JSON.stringify(data));


    this.user_id = this.event.user.id;
    this.username = this.event.user.name;
		
    var message_type = data.message_type;
      
    switch(message_type) {
	case "bot_enabled":
	case "bot_disabled":    
	case "bot_installed":
	case "bot_uninstalled":
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
  	    this.reply_to = this.event.reply_to;
  	    break;
  	
	case "bot_postback": 
  	    this.postback = this.event.postback;
  	    break;  	    
    }    
  }
}	

// send Text Message
Chat.prototype.sendText = function(text, buttons, options) {
  var message;
  if (text) { 
  	message = { text };
  }	
  if (buttons) {
	const formattedButtons = _formatButtons(buttons);
	message = message || {};
	message.buttons = formattedButtons;    
  }
  return this.send(message, options);	
};

// send Richtext Message
Chat.prototype.sendRichText = function(richtext, buttons, text, options) {
  var message;
  if (richtext) {
  	message = { richtext };
  }
  if (text) {
  	message = message || {};
   	message.text = text;
  }
  if (buttons) {
	const formattedButtons = _formatButtons(buttons);
	message = message || {};
	message.buttons = formattedButtons;    
  }
  return this.send(message, options);
};
   
// send JSON Message  
Chat.prototype.sendJSON = function(fields, buttons, options) {
  var message;
  if (fields) {
	message = { fields };
  }
  if (buttons) {
	const formattedButtons = _formatButtons(buttons);
	message = message || {};
	message.buttons = formattedButtons;    
  }
  return this.send(message, options);
}; 
 
// generic send 
Chat.prototype.send = function(message, options) {
  var body;
  if (message) {
  	body = { message };	
  }
  if (options) {
   	if (options.action && typeof options.action === 'string') {
		message = message || {};
		message.action = options.action;
   	}	
   	if (options.fields_template && Array.isArray(options.fields_template)) {
		body = body || {};
		body['fields_template'] = options.fields_template;
   	}	
		
   	console.log('body: ' + body);
  }
  const req = (() => {
  
   	if (options && (options.file_path || options.audio_path)) {
		this.uploadRequest(body, options.file_path, options.audio_path).then((json) => {
			return json;
		})    
	} else {  
		this.sendRequest(body).then((json) => {
			return json;
		})    
	}        
  });

  return req();
  
};

// send Request
Chat.prototype.sendRequest = function(body, path, method) {

  if (!this.access_token) {
	console.log("Unable to send request without access_token!");
	return;
  }

  if (!this.binder_id) {
	console.log("Unable to send request without binder_id!");
	return;
  }

  path = path || '/' + this.binder_id + '/messages';
  method = method || 'POST';
  const url = this.moxtrabot.api_endpoint + path; 

  console.log("url: " + url + " body: " + JSON.stringify(body));
  console.log("access_token: " + this.access_token);

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

// upload Request
Chat.prototype.uploadRequest = function(body, file_path, audio_path) {

  if (!this.access_token) {
	console.log("Unable to upload request without access_token!");
	return;
  }

  var form = new formData();

  if (body) {
	form.append('payload', JSON.stringify(body));
  }
  if (file_path) {
	form.append('file', fs.createReadStream(file_path));
  }
  if (audio_path) {
	form.append('audio', fs.createReadStream(audio_path));
  }

  const url = this.moxtrabot.api_endpoint + '/' + this.binder_id + '/messages'; 

  return fetch(url, {
	method: 'POST',
	headers: {
		'Accept': 'multipart/form-data',
		'Authorization': 'Bearer ' + this.access_token
	},
	body: form
  })
  .then(res => res.json())
  .then(res => {
	if (res.error) {
		console.log(res.error);
	}
		return res;
	})
  .catch(err => {
	console.log(`Error uploading file: ${err}`);
	//this.moxtrabot.emit('error', `Error sending message: ${err}`);
  });
	
};
 
// get Binder Info 
Chat.prototype.getBinderInfo = function(callback) {

  if (!this.binder_id) {
	console.log("Unable to send request without binder_id!");
	return;
  }

  var ret = sendRequest(null, '/' + this.binder_id, 'GET'); 
  if (callback)
	callback(null, ret);
};

Chat.prototype.setAccessToken = function(token) {

  this.access_token = token;
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
