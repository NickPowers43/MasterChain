var express = require('express');
var router = express.Router();

// assuming existence of global session

router.get('/', function (req, res) {
  console.log(req.session);
  if (typeof req.session.globalPassword == null) req.session.globalPassword = null;
  res.render('Landing',
              { globalPassword : req.session.globalPassword,
                isLoggedInMessage : "Welcome to BlockApps' landing page! You are logged in and can sign transactions",
                isNotLoggedInMessage : "Welcome to BlockApps' landing page! You are not logged in, and need to do so to sign transactions",
                title : "Welcome to BlockApps!" }
             );
});

module.exports = router;
