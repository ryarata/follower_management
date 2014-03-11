
/*
 * GET users listing.
 */

exports.list = function(req, res){
  res.send("respond with a resource");
};

exports.save_user = function(req,res){
	res.render('login',{msg:'DB saveed!' ,title: 'Express'});
};