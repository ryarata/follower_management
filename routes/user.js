
/*
 * GET users listing.
 */

exports.list = function(req, res){
  res.send("respond with a resource");
};

exports.save_user = function(req,res){
	var tw_id = req.body.tw_name;
	console.log(tw_id);
	res.render('login',{msg:'DB saveed!' ,title: 'Express'});
};