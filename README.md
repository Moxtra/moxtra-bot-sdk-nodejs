# Moxtra Bot SDK

[![npm](https://img.shields.io/badge/npm-1.0.1-orange.svg)](https://www.npmjs.com/package/moxtra-bot-sdk)
[![David](https://img.shields.io/david/strongloop/express.svg)](https://github.com/Moxtra/moxtra-bot-sdk-nodejs.git)
[![Packagist](https://img.shields.io/packagist/l/doctrine/orm.svg)](https://spdx.org/licenses/MIT)

Moxtra Bot SDK will ease and streamline the Bot development for Moxtra's business collaboration platform. The design allows developers to focus on application logic instead of APIs for sending and receiving data payload.

```js
const MoxtraBot = require('moxtra-bot-sdk');

const bot = new MoxtraBot({
  verify_token: 'YOUR_VERIFY_TOKEN',
  client_secret: 'YOUR_CLIENT_SECRET'
});

bot.on('message', (chat) => {
  const username = chat.username;
  const text = chat.comment.text;
  chat.sendText(`Echo: @${username} ${text}`);
});
```

| [Core Concepts][] | [Installation][] | [Getting Started][] | [Account Linking][] | [Documentation][] | [Examples][] | [License][] |
|---|---|---|---|---|---|---|

---

## Core Concepts

- Bot verification flow: before saving bot configuration during bot creation, a verification request with message_type=bot_verify&verify_token='YOUR_VERIFY_TOKEN'&  
bot_challenge='RANDOM_STRING' sending to the configured callback_url. To complete the bot creation, this request expects the same 'RANDOM_STRING' gets returned.  

- Binder based bot installation: each received message event has the corresponding *binder_id* and *access_token* for reply, which are encapsulated in the `Chat` object  

- Each `POST` message event from Moxtra has `x-moxtra-signature` header set as HMA-SHA1 hash of the message content signed with `client_secret` 

- Different message event has the corresponding object in the event; however, the basic message structure remains the same. Below shows a `Comment` message event format:
```js
{
  message_id: 'MESSAGE_ID',
  message_type: 'comment_posted',
  binder_id: 'BINDER_ID',
  access_token: 'ACCESS_TOKEN',
  event: {
    timestamp: 'TIMESTAMP',
    user: {
      id: 'USER_ID',
      username: 'USERNAME'
    },
    comment: {
      id: 'COMMENT_ID',
      text: 'TEXT MESSAGE',
      audio: 'AUDIO MESSAGE'    
    },
    target: {
      id: 'BINDER_ID',
      object_type: 'binder'
    }
  }
}
```

## Installation

```
$ npm install moxtra-bot-sdk --save
```

You can also check out Moxtra Bot SDK directly from Git.
If you want to use the example code and included bots, it may be preferable to use Github over NPM.

```bash
git clone https://github.com/Moxtra/moxtra-bot-sdk-nodejs.git
```

## Getting Started

- After MoxtraBot is installed via NPM, create a new bot instance using your `verify_token` and `client_secret` obtained from your [MoxtraBot configuration](https://developer.moxtra.com/nextbots):

```js
const MoxtraBot = require('moxtra-bot-sdk');

const bot = new MoxtraBot({
  verify_token: 'YOUR_VERIFY_TOKEN',
  client_secret: 'YOUR_CLIENT_SECRET'
});
```

- Subscribe to messages with the `bot.on()` method for various events: *message*, *bot_installed*, *bot_uninstalled*, *postback*,
and *account_link*. 

```js
bot.on('message', (chat) => {
  const username = chat.username;
  const text = chat.comment.text;
  console.log(`@${username} says ${text}`);
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
```
Other message events are *page_created*, *file_uploaded*, *page_annotated*, *todo_created*, *todo_completed* and *meet_recording_ready*.

- Subscribe to messages with the `bot.hears()` method using regular expression or exact keyword match:

```js
bot.hears([/(schedule|plan|have)? meet/i, 'meeting together'], (chat) => {
  const username = chat.username;
  console.log('@${username} said "schedule... meet", "plan... meet", "have... meet", or "meeting together"');
});
```

- Reply to messages using the `chat` object:

```js
bot.hears([/(schedule|plan|have)? meet/i, 'meeting together'], (chat) => {
  const username = chat.username;

  chat.sendText(`@${username} do you need to schedule a meet?`);
});
```
>- Send Text  
>```js
>chat.sendText(`@${username} do you need to schedule a meet?`);
>```
>
>- Send RichText (in [BBCode](https://www.bbcode.org) style)  
>```js
>chat.sendRichText(`@[b]${username}[/b] [i][color=Blue]do you need to schedule a meet?[/color][/i]`); 
>```
>
>- Send JSON (in key-value style along with a pre-configured or an on-demand template)  
>```js
>const fields = {  
>   title: 'BBCode Info',  
>   from: username,  
>   info: text,  
>   image_url: 'https://www.bbcode.org/images/lubeck_small.jpg'  
>};  
>chat.sendJSON(fields);  
>```

- Matching keywords for more than once:

If there are more than one keyword matches in `bot.hears()`, the same handler as well as *bot.on('message')* event handler would get invoked. By checking `chat.condition` to determine whether to handle in this situation. 

`chat.condition.match` - the word that matches the regular expression or the whole keyword  
`chat.condition.primatches` - the number of times that match happened before 


```js
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
};  

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
  
  chat.sendText(`@${username} do you need to schedule a meet?`);
});
```

- Add `POSTBACK` button to the reply: 

>- `buttons` array  
>Setting desired buttons in an array which would form buttons in a single column layout 
>- `POSTBACK` object   
>&nbsp;type - "postpack"  
>&nbsp;text - required text shown on the button   
>&nbsp;payload - optional info to carry back; if not specified, it's "MOXTRABOT_text in uppercase" 
>
>- A single string can also turn into a button object; for example 'Not Sure?' becomes  
>{  
>&nbsp;type: 'postpack',  
>&nbsp;text: 'Not Sure?',   
>&nbsp;payload: 'MOXTRABOT_NOT SURE?"   
>}

```js
  var buttons = [{
    type: 'postback',
    text: 'Sure!'
  }, 'Not Sure?'];
  
  chat.sendText(`@${username} do you need to schedule a meet?`, buttons);
```
or
```js
  chat.sendRichText(`${richtext}`, buttons);    
```
or
```js
  chat.sendJSON(fields, buttons);
```

- Handle *postback* event:  

The *postback* event gets triggered when the `POSTBACK` button is tapped. The corresponding *postback:TEXT* gets triggered as well.  

```js
bot.on('postback:Not Sure?', (chat) => {
  
  const username = chat.username;
  const text = chat.postback.text;
  const payload = chat.postback.payload;

  chat.sendText(`@${username} specific postback ${text} ${payload}`);
});

bot.on('postback', (chat) => {
  
  const username = chat.username;
  const text = chat.postback.text;
  const payload = chat.postback.payload;

  chat.sendText(`@${username} generic postback ${text} ${payload}`);
});
```

- Set up Express server:

You can setup your own preferred web application framework as well as endpoints for handling `GET` and `POST` methods. In the example, we use `Express` to showcase how it is to be done and using `/webhooks` as the endpoints.  

```js
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const MoxtraBot = require('moxtra-bot-sdk');

const bot = new MoxtraBot({
  verify_token: 'YOUR_VERIFY_TOKEN',
  client_secret: 'YOUR_CLIENT_SECRET'
});

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
```

## Account Linking

- Link Moxtra account with the 3rd party service through Account Linking flow:
>1. User sends a request to Bot, which requires access to a 3rd party service that needs user's authorization. Bot does not have prior user account linking info with the 3rd party service.
>2. Bot sends `ACCOUNT_LINK` button back to Moxtra chat.
>3. User clicks the button and a [JSON web token](https://en.wikipedia.org/wiki/JSON_Web_Token) sends back to Bot via the `GET` method.
>4. Bot verifies the token using `client_secret` as the key and decodes the token; Bot obtains *user_id*, *username*, and *binder_id* via handling the *bot.on('account_link')* event.
>5. Bot needs to check whether the *user_id* having the corresponding *access_token* from the 3rd party service in case `ACCOUNT_LINK` button might be tapped more than once or by different users in a group chat. If no, next OAuth2 authorization flow would then follows.
>6. After obtaining the *access_token* from the 3rd party service, Bot needs to complete the original request.

- Add `ACCOUNT_LINK` button:
```js
  var buttons = [{
    type: 'account_link',
    text: 'Sign In'
  }];
  
  chat.sendText(`@${username} do you need to schedule a meet?`, buttons);
```
- Handle *account_link* event:
```js 
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
    
  }  else { 

    delete _pendingResponse[ binder_id + user_id ];    

    // save chat to the pendingOAuth 
    _pendingOAuth[ user_id ] = chat;

    // redirect if needed  
    res.cookie('user_id', user_id);    
    res.redirect('/auth');    
  }  
  
});
```
- Setup OAuth2 configuration and handle OAuth2 flow:

```js
const OAuth2 = require('./lib/oauth2');

const config = {
  verify_token: "YOUR_VERIFY_TOKEN",
  client_secret: "YOUR_CLIENT_SECRET",
  oauth2_client_id: "SERVICE_OAUTH2_CLIENT_ID",
  oauth2_client_secret: "SERVICE_OAUTH2_CLIENT_SECRET",
  oauth2_endpoint: "SERVICE_OAUTH2_ENDPOINT",
  oauth2_auth_path: "SERVICE_OAUTH2_AUTH_PATH",
  oauth2_token_path: "SERVICE_OAUTH2_TOKEN_PATH",
  oauth2_redirect_uri: "SERVICE_OAUTH2_DIRECT_URI"
};

...
const oauth2 = new OAuth2(bot, config);

// OAuth2 request flow
app.get('/auth', (req, res, next) => { 
  oauth2.auth(req, res, next);
});

// OAuth2 callback to obtain access_token
app.get('/callback', (req, res, next) => {
  oauth2.callback(req, res, next);
});
```

- Obtain `access_token` via catching *access_token* event 

```js
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
```

## Documentation

### MoxtraBot Class

#### `new MoxtraBot(configuration)`

| `configuration` key | Type | Required |
|:--------------|:-----|:---------|
| `verify_token` | string | `Y` |
| `client_secret` | string | `Y` |

Creates a new `MoxtraBot` instance. 

---

### MoxtraBot API


#### `.on(event, callback (parameters) )`

Subscribe to the message event emitted by the bot, and a callback gets invoked with the parameter pertaining to the event type. Available events are:

| Event | Callback Parameters | Description |
|:------|:-----|:-----|
| *bot_installed* | Chat object - chat.bot | The user installed the bot in one binder |
| *bot_uninstalled* | raw message event data | The user removed the bot from the binder |
| *message* | Chat object - chat.comment | The bot received a text message from the user by commenting in a binder |
| *postback* | Chat object - chat.postback | The bot received a postback call from the user after  clicking a `POSTBACK` button |
| *account_link* | Request, Response, JSON Web Token content | The bot received an account_link call from the user after clicking an `ACCOUNT_LINK` button |
| *page_created* | Chat object - chat.page | The bot received a message that a page was created in the binder |
| *file_uploaded* | Chat object - chat.file | The bot received a message that a file was uploaded in the binder |
| *page_annotated* | Chat object - chat.annotate | The bot received a message that an annotation was created on a page in the binder |
| *todo_created* | Chat object - chat.todo | The bot received a message that a todo item was created in the binder |
| *todo_completed* | Chat object - chat.todo | The bot received a message that a todo item was completed in the binder |
| *meet_recording_ready* | Chat object - chat.meet | The bot received a message that a meet recording was ready in the binder |

##### Example:

```js
bot.on('message', (chat) => {
  const text = chat.comment.text; 
  chat.sendText(`message ${text} was received!`);
});

bot.on('postback', (chat) => {
  const text = chat.postback.text;
  const payload = chat.postback.payload;
  chat.sendText(`Postback ${text} with payload: ${payload} was received!`);
});

bot.on('file_uploaded', (chat) => {
  const name = chat.file.name;
  const file_id = chat.file.id;
  chat.sendText(`File:${file_id} ${name} was uploaded!`);
});
```

#### `.hears(patterns, callback (chat) )`

Using pattern matching mechanism to handle desired message. The `patterns` param can be a string, a regex or an array of both strings and regexs that find matching against the received message. If a match was found, the callback gets invoked. At the same time, `message` event also gets fired.  `chat.condition` needs to be checked in such case.

| Param | Type | Required |
|:------|:-----|:---------|
| `patterns` | string, regex or mixed array | `Y` |
| `callback (chat)` | function | `Y` |

##### Example:

```js
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
  
  chat.sendText(`@${username} do you need to schedule a meet?`);
});
```
---

### Chat Class and API

#### `new Chat(bot)`

Chat instance is created in the callback for each type of message event except *bot_uninstalled* and *account_link*. Therefore, chat.binder_id, chat.user_id, chat.username, and chat.access_token as well as the corresponding event object are pre-populated.  

A typical `Chat` instance has the following structure:

```js
{
  moxtrabot: {MoxtraBot instance},
  data: {raw message event data},
  binder_id: 'BINDER_ID',
  access_token: 'ACCESS_TOKEN',
  condition: {
    match: 'MATCHED_KEYWORD',
    primatches: NUMBER_OF_MATCHES_BEFORE
  },
  user_id: 'USER_ID',
  username: 'USERNAME',
  // for bot_installed event
  bot: {   
    id: 'BOT_ID',
    name: 'BOT_NAME'
  },
  // for message event
  comment: {
    id: 'COMMENT_ID',
    text: 'TEXT MESSAGE',
    audio: 'AUDIO MESSAGE'    
  },
  // for postback event
  postback: {
    text: 'POSTBACK_TEXT',
    payload: 'POSTBACK_PAYLOAD'
  },
  // for page_created and page_annotated event
  page: {
    id: 'PAGE_ID',
    type: 'PAGE_TYPE'
  },  
  // for file_uploaded event
  file: {
    id: 'FILE_ID',
    name: 'FILE_NAME'
  },
  // for todo_created and todo_completed event
  todo: {
    id: 'TODO_ID',
    name: 'TODO_ITEM_NAME'
  },
  // for meet_recording_ready event
  meet: {
    id: 'MEET_ID',
    topic: 'MEET_TOPIC',
    start_time: 'MEET_START_TIME',
    end_time: 'MEET_END_TIME',
    recording_url: 'MEET_RECORDING_URL'
  },
  // sendText API
  sendText: function (text, buttons, options) {    
  },
  // sendRichText API
  sendRichText: function (richtext, buttons, text, options) {    
  },
  // sendJSON API
  sendJSON: function (fields, buttons, options) {    
  },
  // send API
  send: function (message, options) {    
  },
  // sendRequest API
  sendRequest: function (body, path, method) {    
  },
  // getBinderInfo API
  getBinderInfo: function (callback) {    
  },
  // getUserInfo API
  getUserInfo: function (callback) {    
  }  
}
```

#### `buttons`

`buttons` is a string, button, or mixed array. A typical `button` object structure is as follows:

```js
{
  type: 'postback | account_link',
  text: 'BUTTON_TEXT',
  payload: 'BUTTON_PAYLOAD'
}  
```

#### `options`

`options` is an object that specify on-demand action type and fields_template array, which is used in `sendJSON()` . A typical `options` has the following structure:

```js
{
  action: 'chat | page | todo',
  fields_template: [
    {
      template_type: 'text | richtext | page',
      template: 'TEMPLATE'
    }
  ]  
}  
```
##### Example:

```js
const fields = {
  title: 'BBCode Info',
  from: 'USERNAME',
  info: 'TEXT',
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
```

#### `.sendText(text, buttons, options)`

Send a text message to Binder along with optional `buttons` and `options`.

| Param | Type | Required |
|:------|:-----|:--------|:---------|
| `text` | string | `Y` |
| `buttons` | string, button or mixed array | `N` |
| `options` | options object | `N` |

##### Example:

```js
const username = chat.username;

var buttons = [{
  type: 'postback',
  text: 'Sure!'
}, 'Not Sure?'];

chat.sendText(`@${username} do you need to schedule a meet?`, buttons);
```

#### `.sendRichText(richtext, buttons, text, options)`

Send a richtext (in [BBCode](https://www.bbcode.org) style) message along with optional `buttons`, `text` and `options`.   
If `action` is *todo*, `text` is set as todo item name and `richtext` message as todo comment.   

| Param | Type | Required |
|:------|:-----|:---------|
| `richtext` | string | `Y` |
| `buttons` | string, button or mixed array | `N` |
| `text` | string | `N`, `Y` for action is `todo` |
| `options` | options object | `N` |

##### Example:

```js
const username = chat.username;
const text = chat.comment.text;

const richtext = '[table][tr][th][center]BBCode Info[/center][/th][/tr]' +
  '[tr][td][img=50x25]https://www.bbcode.org/images/lubeck_small.jpg[/img][/td][/tr]' +
  '[tr][td]From: [i]' + username + '[/i][/td][/tr]' +
  '[tr][td][color=Red]' + text + '[/color][/td][/tr][/table]';     

chat.sendRichText(`${richtext}`);
```

#### `.sendJSON(fields, buttons, options)`

Send a JSON object `fields` (in key-value style along with a pre-configured or an on-demand template) message along with optional `buttons` and `options`. 

| Param | Type | Required |
|:------|:-----|:---------|
| `fields` | fields object | `Y` |
| `buttons` | string, button or mixed array | `N` |
| `options` | options object | `N` |

##### Example:

```js
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
```

#### `.send(message, options)`

Send a complete message along with `options`. The message structure is shown as follows:

```js
{
  message: {
    text: 'TEXT',
    richtext: 'RICHTEXT',
    fields: {FIELDS},
    action: 'chat | page | todo',
    buttons: [
      {
        type: 'postback | account_link',
        text: 'TEXT',
        payload: 'PAYLOAD'
      }
    ]
  }
}  
```

#### `.sendRequest(body, path, method)`

This is the root API for sending API request to Moxtra. `access_token` in the `chat` has to present to send the request. 

| Param | Type | Required |
|:------|:-----|:---------|
| `body` | string | `Y` |
| `path` | string | `N`, default is '/messages' |
| `method` | string | `N`, default is 'POST' |


#### `.getBinderInfo()`

This API is to get the installed binder information, which can use the `access_token` obtained on the *bot_installed* event.  

##### Example:

```js
var chat = new Chat(bot);
chat.access_token = _moxtraAccessToken[ 'BINDER_ID' ];

const binder_info = chat.getBinderInfo();
```
##### Result:

```js
{
  "code": "RESPONSE_SUCCESS",
  "data": {
    "id": "BiHGjPE2ZbsHyhVujuU4TUL",
    "name": "test bot",
    "created_time": 1487787567445,
    "updated_time": 1491598936463,
    "total_comments": 0,
    "total_members": 8,
    "total_pages": 0,
    "total_todos": 0,
    "revision": 884,
    "thumbnail_uri": "https://www.moxtra.com/board/BiHGjPE2ZbsHyhVujuU4TUL/4",
    "conversation": false,
    "users": [],
    "restricted": false,
    "team": false,
    "description": "",
    "feeds_timestamp": 1491598936463,
    "status": "BOARD_MEMBER",
    "last_feed": null,
    "binder_email": "b2f583d00339e44d0b2d02f9d50f352fa",
    "tags": null,
    "unread_feeds": 0,
    "pages": []
  }
}
```

#### `.getUserInfo()`

This API is to get the specific user information in the binder, which can use the `access_token` obtained on the *bot_installed* event.  

##### Example:

```js
var chat = new Chat(bot);
chat.access_token = _moxtraAccessToken[ 'BINDER_ID' ];
chat.user_id = 'USER_ID';

const user_info = chat.getUserInfo();
```
##### Result:

```js
{
  "code": "RESPONSE_SUCCESS",
  "data": {
    "id": "Utkj3YC5BxRHCCbq9widP67",
    "email": "john@test.com",
    "name": "John Smith",
    "picture_uri": "https://www.moxtra.com/board/BiHGjPE2ZbsHyhVujuU4TUL/user/2/1763",
    "phone_number": "",
    "unique_id": ""
  }
}
```

---

## Examples

Check the `examples` directory to see more samples of:

- An echo bot
- A bot using regular expression to capture text message
- A bot sending RichText message
- A bot sending Fields message
- A bot handling Account Link with OAuth2 

To run the examples, make sure to complete the bot creation on [MoxtraBot configuration](https://developer.moxtra.com/nextbots) and setup required configurations. For example, to run Echo example using the following command:

```
$ node examples/Echo
```

## License

MIT

[Core Concepts]:#core-concepts
[Installation]:#installation
[Getting Started]:#getting-started
[Account Linking]:#account-linking
[Documentation]:#documentation
[Examples]:#examples
[License]:#license
