exports.index = function(req, res){
	res.render('login', { title: 'Express',msg:'DB clear' });
};

exports.login = function(req, res){
  res.render('login', { title: 'Express' });
};
