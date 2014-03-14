exports.index = function(req, res){
		//postgre
	pg.connect(connectionString,function(error,client){
		var query = client.query('SELECT * FROM user_identify;');
		query.on('error',function(error){
		var msg = error;
		console.log(error);
		
		});
		query.on('row',function(row,error){
			var rows = [];
			console.log("row event start...");
			rows.push(row);
		});
		
		query.on('end', function(row, error) {
		  console.log("end event start...");
				query = client.query('DELETE FROM user_identify;');
				console.log("DB clear");
		  });
	});

	res.render('login', { title: 'Express',msg:'DB clear' });
	
};

exports.login = function(req, res){
  res.render('login', { title: 'Express' });
};
