/*
できたどー！
*/
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
var async = require('async');
 pg = require('pg');

TWITTER_CONSUMER_KEY = "自分のConsumerKey";
TWITTER_CONSUMER_SECRET = "自分のConsumerSecret";
connectionString = "自分のpostgres server";

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
app.post('/save_user',user.save_user);

// Twitterの認証
app.get("/auth/twitter", passport.authenticate('twitter'));

// Twitterからのcallback
app.get("/auth/twitter/callback", passport.authenticate('twitter', {
  successRedirect: '/followers',
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
		
		res.send(jsonObj);
        /*var jsonObj = JSON.parse(data);
        // ユーザ名とツイート内容だけ抜き出す
        var result = [];
        for(i in jsonObj){
            result.push(jsonObj[i].user.name + ": " + jsonObj[i].text);
        }
        res.send(result);*/

    });
});

app.get('/followers', function(req,res){
	var name = "";
	var jsonObj = "";
	var result = [];
	var rows = [];
	var tag_id = [];
	var result_ids = [];
	var count_ids = [];
	
	//下で使うカウント関数
	var count = function(obj){
		var cnt = 0;
		for(var key in obj){
			cnt++;
		}
		return cnt;
	}
	var get_tag_id = function(obj){
		var cnt = 0;
		for(var key in obj){
			cnt++;
			tag_id.push("twitter_id"+cnt);
		}
		return cnt,tag_id;
	}
  //DB connect.
  pg.connect(connectionString,function(error,client){
		//get_twittter_idsにあるrowを削除
		client.query('DELETE FROM get_twitter_ids;');
		//user_identifyテーブル内にあるrowの個数をカウント
		client.query('select count(*) from user_identify;',function(err,results){
			console.log("table rows: "+results.rows[0]["count"]);
			rows_count = results.rows[0]["count"]; 	
			//上で取得したROWの数を元に、ユーザーのfollowerIDを取得
			query = client.query('select * from user_identify;');
			query.on('row',function(row,error){
				rows.push(row["name"]);
				});
			query.on('end',function(row,error){
				//followerIDからscreen_nameを取得
				var rows_amount = count(rows);
				console.log("rows_amount: "+rows_amount);
				
				var i = 0;
				async.forEachSeries(rows,function(val,callback){
					//console.log("rows["+i+"]: "+JSON.stringify(rows[i]));
					var name = rows[i];
					console.log("name: "+JSON.stringify(name));
					passport._strategies.twitter._oauth.getProtectedResource(
						'https://api.twitter.com/1.1/followers/ids.json?screen_name='+name,
						'GET',
					req.session.passport.user.twitter_token,
					req.session.passport.user.twitter_token_secret,
					function (err, data,response) {
						if(err) {
							res.send(err, 500);
							return;
						}
						jsonObj = JSON.parse(data);
						result.push(jsonObj);
						//console.log("result["+i+"][ids]: "+result[i]["ids"]);
						
						var amount = count(result[i]["ids"]);
						//console.log("amount: "+amount);
						
						for(v in result[i]["ids"]){
							query = client.query("INSERT INTO get_twitter_ids(ids) VALUES("+result[i]["ids"][v]+");");
						}
						i++;
						callback();
					});
				},function() {
					query = client.query('SELECT ids,COUNT(*)AS ids_count FROM get_twitter_ids GROUP BY ids HAVING(COUNT(*)>1) ORDER BY ids;');
					query.on('error',function(error){
						console.log("error: "+error);
					});
					query.on('row',function(row){
						result_ids.push(row["ids"]);
						count_ids.push(row["ids_count"]);
						//console.log("row: "+JSON.stringify(result_ids));
						//console.log("count_ids"+JSON.stringify(count_ids))
					});
					query.on('end',function(end){
						passport._strategies.twitter._oauth.getProtectedResource(
							'https://api.twitter.com/1.1/users/lookup.json?user_id='+result_ids,
							'GET',
							req.session.passport.user.twitter_token,
							req.session.passport.user.twitter_token_secret,
							function (err, data_name,response_name) {
								if(err) {
								res.send(err, 500);
								return;
							}
							//console.log("data_name: "+data_name.screen_name);
							var Obj = JSON.parse(data_name);
							var twitter_id = [];
							for(k in Obj){
								twitter_id.push("name: "+Obj[k].screen_name+"    count: "+count_ids[k]);
							}
							var array = JSON.stringify(twitter_id).split(",");
							var amount_ids = get_tag_id(array);
							console.log(array);
							res.render('index',{twitter_id:array,amount:amount_ids});
						});
					});
				});
			});		
		});
	});
    /*
		var tag_id = [];
		var count = function(obj){
			var cnt = 0;
			for(var key in obj){
				cnt++;
			}
			return cnt;
		}
		var get_tag_id = function(obj){
			var cnt = 0;
			for(var key in obj){
				cnt++;
				tag_id.push("twitter_id"+cnt);
			}
			return cnt,tag_id;
		}
		
		var amount = count(result);
		//console.log("amount: "+amount);
		var twitter_ids = get_tag_id(result);
		//console.log("twitter_ids: "+twitter_ids);
		/*
			一度に出来るuser_id→screen_nameへの変換は上限が
			100件であり、それを越すと、エラーが起きる。
			100件を超える場合、超えない場合での分岐が必要であり、それはまた今度
		
		//こっから下はUI用
		passport._strategies.twitter._oauth.getProtectedResource(
			'https://api.twitter.com/1.1/users/lookup.json?user_id='+result,
			'GET',
			req.session.passport.user.twitter_token,
			req.session.passport.user.twitter_token_secret,
			function (err, data_name,response_name) {
				if(err) {
				res.send(err, 500);
				return;
			}
			var Obj = JSON.parse(data_name);
			var twitter_id = [];
			for(k in Obj){
				twitter_id.push(Obj[k].screen_name);
			}
			//res.send(twitter_id);
			/*
			作成したHTMLにid及び、中身を一意に識別するための情報を基にrenderする。
			*/
			//res.render('index',{ twitter_id:twitter_id,amount:twitter_ids});
			
			/*});
		});
    });*/
});
app.get('/ids', function(req,res){
  // search tweets.
	console.log(req.session);
	var name = "momokurimeron";
    passport._strategies.twitter._oauth.getProtectedResource(
        'https://api.twitter.com/1.1/users/lookup.json?user_id='+req.session.passport.user.id,
        'GET',
    req.session.passport.user.twitter_token,
    req.session.passport.user.twitter_token_secret,
    function (err, data,response) {
        if(err) {
            res.send(err, 500);
            return;
        }
		res.send(data);
	});
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});