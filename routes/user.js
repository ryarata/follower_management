
/*
 * GET users listing.
 */
exports.list = function(req, res){
  res.send("respond with a resource");
};

//textformに入力された、twitterのscreen_nameをデータベースに格納
exports.save_user = function(req,res){
	var tw_id = req.body.tw_name;
	var array = tw_id.split(",");
	console.log(array);
	pg.connect(connectionString,function(error,client){
		for (i in array){
		var query = client.query("INSERT INTO user_identify (name) VALUES ('"+array[i]+"');");
		query.on('error',function(error){
		var msg = error;
		console.log(error);
		});
		}
	});	

	res.render('login',{msg:'DB saveed!' ,title: 'Express'});
};