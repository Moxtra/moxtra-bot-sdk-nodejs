'use strict'

var simpleOauthModule = require('simple-oauth2');


function OAuth2(bot, config) {

  this.bot = bot;

  const client_id = config.oauth2_client_id;
  const client_secret = config.oauth2_client_secret;
  const oauth2_endpoint = config.oauth2_endpoint;
  const oauth2_auth_path = config.oauth2_auth_path;
  const oauth2_token_path = config.oauth2_token_path;
  const oauth2_redirect_uri = config.oauth2_redirect_uri;
  
  if (!client_id && !client_secret && !oauth2_endpoint && !oauth2_auth_path && !oauth2_token_path
     && !oauth2_redirect_uri) {
    throw new Error('Require a complete configuration for OAuth2');
  }  
  
  // keep track of redirect URI
  this.oauth2_redirect_uri = oauth2_redirect_uri;
  
  this.oauth2 = simpleOauthModule.create({
    client: {
      id: client_id,
      secret: client_secret
    },
    auth: {
      tokenHost: oauth2_endpoint,
      tokenPath: oauth2_token_path,
      authorizePath: oauth2_auth_path
    }
  });

  // Authorization uri definition
  this.authorizationUri = this.oauth2.authorizationCode.authorizeURL({
    redirect_uri: oauth2_redirect_uri,
    //  scope: 'read,write',
    state: '3(#0/!~',
  });	
}	

// get /oauth
OAuth2.prototype.auth = function(req, res, next) {
  console.log(this.authorizationUri);
  res.redirect(this.authorizationUri);
};

// get /callback
OAuth2.prototype.callback = function(req, res, next) {

  const code = req.query.code;
  
  console.log('authorize code: ', code);
  
  const options = {
    code: code,
    redirect_uri: this.oauth2_redirect_uri
  };

  this.oauth2.authorizationCode.getToken(options, (error, result) => {
    if (error) {
      console.error('Access Token Error', error.message);
      return res.json('Authentication failed');
    }

    console.log('The resulting token: ', result);
    const token = this.oauth2.accessToken.create(result);
    
    //console.log('access_token: ', token);

    res.status(200).json(token);

    this.bot.emit("access_token", token, req);

  });

};

module.exports = OAuth2;
