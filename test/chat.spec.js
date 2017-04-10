'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const MoxtraBot = require('../lib/MoxtraBot');
const Chat = require('../lib/chat');

describe('Chat Test', () => {
  let server;
  let bot;
  let chat;

  beforeEach(() => {
    const configs = {
      verify_token: '5678',
      client_secret: 'abcd'
    };
    bot = new MoxtraBot(configs);
    chat = new Chat(bot);
    chat.access_token = 'test';
    server = sinon.fakeServer.create();
    server.autoRespond = true;
  });

  afterEach(() => {
    server.restore();
  });

  it('creates a bot instance', () => {
    expect(bot instanceof MoxtraBot).to.equal(true);
  });

  it('throws an error if there are missing tokens', () => {
    expect(() => new MoxtraBot()).to.throw(Error);
  });
  
  it('creates a chat instance', () => {
    expect(chat instanceof Chat).to.equal(true);
  });

  it('can send a text message', () => {
    const spy = sinon.spy(chat, 'sendRequest');
    const text = 'Hello MoxtraBot!';
    const expected = {
      message: {
        text
      }
    };

    chat.sendText(text);
    expect(spy.calledWith(expected)).to.equal(true);
  });

  it('can send a text message with buttons', () => {
    const spy = sinon.spy(chat, 'sendRequest');
    const text = 'Hello MoxtraBot!';

    // buttons with auto-generated payload
    const buttons = ['Sure', 'Not Sure'];
    const expected = {
      message: {
        text,
        buttons: [{
          type: 'postback',
          text: 'Sure',
          payload: 'MOXTRABOT_SURE'
        }, {
          type: 'postback',
          text: 'Not Sure',
          payload: 'MOXTRABOT_NOT SURE'
        }]
      }
    };

    chat.sendText(text, buttons);
    expect(spy.calledWith(expected)).to.equal(true);
  });  
 
  it('can send a richtext message with buttons', () => {
    const spy = sinon.spy(chat, 'sendRequest');
    const richtext = '[b]Hello[/b] [coler=Red]MoxtraBot[/color]!';
    
    // buttons as objects with partial information
    const buttons = ['First', {
      type: 'postback',
      text: 'Wow!'
    }, {
      type: 'account_link',
      text: 'Sign In'
    }];
    
    const expected = {
      message: {
        richtext,
        buttons: [{
          type: 'postback',
          text: 'First',
          payload: 'MOXTRABOT_FIRST'
        }, {
          type: 'postback',
          text: 'Wow!'
        }, {
          type: 'account_link',
          text: 'Sign In'
        }]
      }
    };

    chat.sendRichText(richtext, buttons);
    expect(spy.calledWith(expected)).to.equal(true);
  }); 

  it('can send a richtext message', () => {
    const spy = sinon.spy(chat, 'sendRequest');
    const richtext = '[table][tr][th][center]BBCode Info[/center][/th][/tr]' +
    	'[tr][td]See the image below:[/td][/tr]' +
    	'[tr][td][img=25x12]https://www.bbcode.org/images/lubeck_small.jpg[/img][/td][/tr]' +
 			'[tr][td][color=Red]Good Luck![/color][/td][/tr][/table]';   
    
    const expected = {
      message: {
        richtext
      }
    };

    chat.sendRichText(richtext);
    expect(spy.calledWith(expected)).to.equal(true);
  }); 

  it('can send a fields message with buttons', () => {
    const spy = sinon.spy(chat, 'sendRequest');
    const fields = {
    	firstname: 'John',
    	lastname: 'Smith'
    };
    const buttons = ['Second'];

    const expected = {
      message: {
        fields,
        buttons: [{
          type: 'postback',
          text: 'Second',
          payload: 'MOXTRABOT_SECOND'
        }]        
      }
    };

    chat.sendJSON(fields, buttons);
    expect(spy.calledWith(expected)).to.equal(true);
  });

  it('can send a fields with template for page', () => {
    const spy = sinon.spy(chat, 'sendRequest');
    const fields = {
    	info: 'BBCode Info',
    	image_url: 'https://www.bbcode.org/images/lubeck_small.jpg'
    };
    const options = {
    	action: 'page',
    	fields_template: [
    		{
	   			template_type: 'page',
	   			template: '<p><image src="{{image_url}}" height="36" width="36"/><br/><div>Message: {{info}}</div></p>'
    	  }
    	]  
    };

    const expected = {
      message: {
        fields,
        action: 'page'
      },
      fields_template: [
			{      
			   template_type: 'page',
			   template: '<p><image src="{{image_url}}" height="36" width="36"/><br/><div>Message: {{info}}</div></p>'
			}      
      ]
    };

    chat.sendJSON(fields, null, options);
    expect(spy.calledWith(expected)).to.equal(true);
  });
    
});
