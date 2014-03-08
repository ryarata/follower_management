
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;

var TWITTER_CONSUMER_KEY = "l64F8GdLVbKdkh7kMFHWEw";
var TWITTER_CONSUMER_SECRET = "vExiA6ykDWiA1ldbAypdxOHkaiAo7w82CgfY0Bcu7Co";

// Passport sessionのセットアップ
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// PassportでTwitterStrategyを使うための設定
passport.use(new TwitterStrategy({
  consumerKey: TWITTER_CONSUMER_KEY,
  consumerSecret: TWITTER_CONSUMER_SECRET,
  callbackURL: "http://127.0.0.1:3000/auth/twitter/callback"
}, 
function(token, tokenSecret, profile, done) {
    profile.twitter_token = token;
    profile.twitter_token_secret = tokenSecret;
	
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser()); 
app.use(express.session({secret: "hogehoge"}));
app.use(passport.initialize()); 
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/login', routes.login);
app.get('/users', user.list);

// Twitterの認証
app.get("/auth/twitter", passport.authenticate('twitter'));

// Twitterからのcallback
app.get("/auth/twitter/callback", passport.authenticate('twitter', {
  successRedirect: '/timeline',
  failureRedirect: '/login'
}));

// タイムラインの表示
app.get('/timeline', function(req,res){
  // search tweets.
    passport._strategies.twitter._oauth.getProtectedResource(
        'https://api.twitter.com/1.1/statuses/user_timeline.json',
        'GET',
    req.session.passport.user.twitter_token,
    req.session.passport.user.twitter_token_secret,
    function (err, data, response) {
        if(err) {
            res.send(err, 500);
            return;
        }
		/*
		タイムラインの情報がdataに格納されており、それを配列化し、その後必要となる
		配列の情報を抜き出す。
		仮にこの形状がfollowerの方にも適用されているならば、var jsonObl以降はその
		まま利用できる。
		*/
		var jsonObj = JSON.parse(data);
		console.log(jsonObj[1].user);
		res.send(data);
        /*var jsonObj = JSON.parse(data);
        // ユーザ名とツイート内容だけ抜き出す
        var result = [];
        for(i in jsonObj){
            result.push(jsonObj[i].user.name + ": " + jsonObj[i].text);
        }
        res.send(result);*/

    });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
