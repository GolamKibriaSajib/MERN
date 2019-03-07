var mongoose = require('mongoose');
var express = require("express");
var path = require('path');
var app = express();
var bodyParser = require("body-parser");
var User = require('./Secure');
var session = require('express-session');
varconfig = require("./config");
var jwt = require("jsonwebtoken");
var config = require('./config');
var cookieParser = require("cookie-parser");
var connStr = 'mongodb://localhost:27017/checkout';
var port= 7070;
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ 
    secret: "Your secret key",
    resave: false,
    saveUninitialized: true
}));
mongoose.set('useNewUrlParser',true);
mongoose.set('useCreateIndex',true);

mongoose.connect(connStr,{ useNewUrlParser: true } ,function (err) {
    if (err) throw err;
  //  console.log('Successfully connected to MongoDB');
});

function checkLogin(req, res, next) {

    if (req.session.user) {
        next();
    } else {
        var err = new Error("Not logged in!");
        res.render("login.ejs")

    }
}

function isAdmin(req, res, next) {
    if (req.session.user) {
        let user = req.session.user;
        console.log(req.session.user)
        if (user.admin == 'yes') {
            next();
        }
        else {
            res.send("Sorry you have not permission on this page")
        }

    }
}

// create a user a new user
app.get("/", checkLogin, function (req, res) {
    res.send("You are logged in");
});
app.post("/save", function (req, res) {

    let access_app = [];
    var data = {
        application_access: req.body.access_app,
        startup_arg: req.body.startup_arg //"en_gb"
    }

    access_app.push(data);

    User.findOne({ "username": req.body.name }, function (err, user) {
        console.log(user);
        if (err) {
            throw err;
        }
        else if (user == null) {

            var testUser = new User({
                username: req.body.name,
                password: req.body.password,
                permissions: access_app,
                admin: req.body.isAdmin
            });

            // save user to database
            testUser.save(function (err) {
                if (err) {
                    throw err;
                }
                res.send("SuccessFully Saved");

                // attempt to authenticate user
            });
        }

        else if (user) {

            user.permissions.push(data)

            User.findOneAndUpdate({ username: user.username }, { $set: user }, { new: true }, function (err, doc) {
                res.send("User information updated")
                console.log(doc)
            });

        }
    })


});
app.get("/login", checkLogin, function (req, res) {

    res.redirect("/");
});

app.post("/login", function (req, res) {
    console.log(req.body.name)
    User.getAuthenticated(req.body.name, req.body.password, async function (err, user, reason) {
        if (err) throw err;

        // login was successful if we have a user
        if (user) {
            req.session.user = user;

            let token = jwt.sign({
                user: user
            },
                config.secret
                , {
                    expiresIn: '24h'
                }

            );
            res.cookie("cookie", token);
            var id = req.session.user._id;
            var jsonObj = await User.findById({ _id: id });
            var route = [];
            jsonObj.permissions.filter(function (obj) {
                route.push(obj.application_access)

            });
        //    console.log(route)
          //  res.render("success.ejs", { access: route })
          res.send("success")
        }

        // otherwise we can determine why we failed
        var reasons = User.failedLogin;
        switch (reason) {
            case reasons.NOT_FOUND:
                res.send("Not Found This User");
                break;
            case reasons.PASSWORD_INCORRECT:
                res.send("Password Incorrect");
                // note: these cases are usually treated the same - don't tell
                // the user *why* the login failed, only that it did
                break;
            case reasons.MAX_ATTEMPTS:
                res.send("Max Attempts tried");
                // send email or otherwise notify user that account is
                // temporarily locked
                break;
        }
    });

});

app.get("/logout", checkLogin, function (req, res) {
    req.session.destroy();
    res.cookie('cookie', '', { expires: new Date(0) });
    res.send("your are logged out");
});
app.get("/adduser", checkLogin, isAdmin, function (req, res) {
    res.render("register.ejs")
});

app.get("/edituser", checkLogin, isAdmin, function (req, res) {
    res.render("editProfile.ejs")

});

app.post("/edituser", checkLogin, isAdmin, async function (req, res) {

    let obj = req.body;


    if (obj.access_app) {
        var user = await User.findOne({ username: req.body.username });

        for (var i = 0; i < user.permissions.length; i++) {

            user.permissions[i].application_access = req.body.access_app;
        }

        await User.findOneAndUpdate({ username: req.body.username }, { $set: user }, { new: true });
    }
    if (obj.startup_arg) {
        var user = await User.findOne({ username: req.body.username });

        for (var i = 0; i < user.permissions.length; i++) {
            user.permissions[i].startup_arg = req.body.startup_arg;
            console.log(user.permissions[i].startup_arg)
        }

    }
        await  User.findOneAndUpdate({ username: req.body.username }, { $set: user }, { new: true });

    if (obj.loginAttempts) {
        await   User.findOneAndUpdate({ username: req.body.username }, { $set: { "loginAttempts": obj.loginAttempts } }, { new: true });
    }
    if (obj.lockUntil) {
        await User.findOneAndUpdate({ username: req.body.username }, { $set: { "lockUntil": obj.lockUntil } }, { new: true });
    }

    res.send("User information updated")
});










//************************Exam purpose********************** */

app.get("/data",async function(req,res){

    var id = req.session.user._id;
    console.log(id)
    var jsonObj = await User.findById({ _id: id });
    var route = [];
    console.log(jsonObj)
    jsonObj.permissions.filter(function (obj) {
        route.push(obj.application_access)

    });
    console.log(route)
res.send(route)


});
app.get("/admin",async function(req,res){
    var jsonObj = await User.find({});
res.send(jsonObj)


})



app.post("/edit", async function (req, res) {
    
    let obj = req.body;
    console.log(req.body)
console.log(obj)
    if (obj.access_app!='') {
        var user = await User.findById({ _id: req.body.id });
     console.log(user)
        for (var i = 0; i < user.permissions.length; i++) {

            user.permissions[i].application_access = req.body.access_app;
        }

        await User.findOneAndUpdate({ _id: req.body.id }, { $set: user }, { new: true });
    }
    if (obj.startup_arg!='') {
        var user = await User.findById({ _id: req.body.id });

        for (var i = 0; i < user.permissions.length; i++) {
            user.permissions[i].startup_arg = req.body.startup_arg;
            console.log(user.permissions[i].startup_arg)
        }

    }
     //   await  User.findOneAndUpdate({ _id: req.body.id }, { $set: user }, { new: true });

    if (obj.loginAttempts!='') {
        
        await   User.findOneAndUpdate({ _id: req.body.id }, { $set: { "loginAttempts": obj.loginAttempts } });
    }
    if (obj.lockUntil!='') {
      
        await User.findOneAndUpdate({ _id: req.body.id }, { $set: { "lockUntil": obj.lockUntil } });
    }

    res.send("User information updated")
});




//***************************************************exam**************************** */



app.listen(port, () => console.log(`Server is listening on port: ${port}`));






// db.users.update(
//     { _id:'5c77da8c0d6b8023f7d5e5a1'  },
//     { $addToSet: { permissions: { $each: [ "camera", "accessories" ] } } }
//   )

//db.users.update({_id:ObjectId('5c77ecefb29ad016c3135990')}, {$push: {"permissions":{"application_access":"/good","startup_arg":"en_gb"}}})