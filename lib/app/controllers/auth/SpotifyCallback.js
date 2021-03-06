var debug = require('debug')('r2s:controllers:auth:SpotifyCallback');
var spotifyConfig = require('../../../../config/spotify.json');
var request = require('koa-request');
var promisify = require('es6-promisify');
var fs = require('fs');
var writeFile = promisify(fs.writeFile);
var getMe = require('../../actions/spotify/Me');
var path = require('path');
var tokenPath = path.resolve(__dirname, '../../../../data/spotifyRefreshToken');

debug(tokenPath);

var spotifyAPI = 'https://api.spotify.com/v1';

function postOptions () {

  var code = this.query.code;
  var clientID = spotifyConfig.clientID;
  var clientSecret = spotifyConfig.clientSecret;
  return {
    'url': 'https://accounts.spotify.com/api/token',
    'form': {
      'grant_type': 'authorization_code',
      'redirect_uri': spotifyConfig.redirectURI,
      'code': code
    },
    'headers': {
      'Authorization': 'Basic ' + (new Buffer(clientID + ':' + clientSecret).toString('base64'))
    },
    'json': true
  };
}

module.exports = function *SpotifyCallback () {

  var response = yield request.post(postOptions.call(this));
  var body = response.body;
  if (response.statusCode === 200) {
    debug('exchange success');
    var me = yield getMe(body.access_token);
    if (me.id === spotifyConfig.userID) {
      debug('correct user id', me.id);
      var token = body.refresh_token;
      debug('refresh token', token);
      yield writeFile(tokenPath, token, {
        'encoding': 'utf8'
      }).catch(function (err) {
        debug(err);
      });
      debug('done');
    }
    else {
      throw new Error('you are not me');
    }
  }
  else {
    debug('exchange failed');
    debug(response.statusCode, response.body);
  }
};