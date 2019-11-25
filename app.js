var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
var otpGenerator = require('otp-generator')
var nodemailer = require('nodemailer');
var moment = require('moment');
// var diff  = require('diff');
// var config = require('./model/config');

var registraion = require('./model/schema.js');
var registraionFrom = registraion.User;
var loginFrom = registraion.login;

const Verifier = require("email-verifier");
var validator = require("email-validator");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/node", { useNewUrlParser: true })
// mongoose.connect("mongodb://localhost:27017/node-demo");

var app = express();
var port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var nameSchema = new mongoose.Schema({
    firstName: String,
    lastName: String
});



/*     REGISTRATION  API >>>>>>>>>>>>>>>>>>>>>            */
app.post("/registration", (req, res) => {
    console.log("Testing addname");
    registraionFrom.findOne({ email: req.body.email }, async (err, user) => {
        var emailToValidate = req.body.email;
        const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (emailRegexp.test(emailToValidate)) {
            if (err) return res.status(401).send('something went wrong......');
            console.log(">>>>>>>>>")
            if (user) return res.send('your are alredy registered this email.......')
            else {
                var body = req.body;
                let password = await bcrypt.hash(req.body.password, 12)
                var data = {
                    firstName: body.firstName,
                    lastName: body.lastName,
                    email: body.email,
                    address: body.address,
                    phone: body.phone,
                    password: password
                }
                console.log("data", data);
                var myData = new registraionFrom(data);
                myData.save().then(item => {
                    console.log("new user ?????")
                    res.send('item saved to the database')
                })
                    .catch(err => {
                        res.status(400).send('unable send to the data');
                    });
            }
        }
        else {
            console.log("You have entered an invalid email address!");
            res.send('wrong email??????????????')
        }
    })
});


/*     LOGIN API >>>>>>>>>>>>>>>>>>>>>            */

app.get("/login", (req, res) => {
    console.log("Testing login api");
    registraionFrom.findOne({ email: req.body.email }, async (err, user) => {
        if (err) return res.status(401).send('not a regisyered user')
        if (!user) return res.status(401).send({ msg: 'the email address' + req.body.email + 'is not registered' });
        if (user) {
            console.log('email id registered')
            // let password = await bcrypt.hash(req.body.password, 12)
            var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
            console.log(passwordIsValid)
            if (!passwordIsValid) return res.status(401).send('not match password');
            res.send('your password  is matched with registered email.......')
            // console.log(user, "^^^^^^^^^^^^", password);
            //     if(user.password === password){
            //        
            //     }
        }
        // console.log('checking>>>>>>>>>>>>')
        // var str1 = req.body.password;
        // var str2 = user.password;
        // var ispassword = (str1).localeCompare(str2);
        // console.log(ispassword, "checking_______")
        // if (!ispassword) return res.send('password does not match the registered email');
        // console.log("Yahooooooo, you can login");
        // res.send("You can login");
    });
});


/*   FORGOT PASSWORD API */
app.post('/forgot', (req, res) => {
    console.log('forgot password api testing>>>>>>');
    registraionFrom.findOne({ 'email': req.body.email }, (err, user) => {
        if (err) return res.status(401).send('not a valid email id');
        if (!user) return res.status(401).send('your email id is not registered with database..');
        if (user) {
            console.log('user', '//////////////')
            res.send(user.password);
        }

        let otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });
        console.log(otp);
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'sumitchauan111@gmail.com',
                pass: 'Sumit34977001524'
            }
        });

        var mailOptions = {
            from: 'sumitchauan111@gmail.com',
            to: req.body.email,
            subject: 'Sending Email using Node.js',
            text: otp
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        // var today = new Date();
        // var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        // var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        // var dateTime = time;

        // const now = new Date();
        // console.log(now);
        // const minute = now.getTime();
        // const time = minute/1000;
         // 1 hour
        // const minute = now.getMilliseconds();
        // console.log(minute);

        // var time = moment().format('YYYY-MM-DD HH:mm:ss');

       var time = new Date();


        registraionFrom.findOneAndUpdate({ 'email': req.body.email }, { $set: { 'otp': otp, 'time': time } }).then((result) => {
            console.log('update data is', result);
            res.send(result)
        })
    })
})

  /*  RESET PASSWORD API .... */
   app.post('/reset',(req,res)=>{
    console.log('reset password api calling.........');
    registraionFrom.findOne({'email':req.body.email},(err,user)=>{
        if(err) return res.status(401).send('not a valid otp');
        if(!user) return res.status(401).send('not a valid email...');
        console.log(user,'111111');
          if(user.otp == req.body.otp){
            // var start_date = moment(user.time, 'YYYY-MM-DD HH:mm:ss');
            // var timePresent = moment().format('YYYY-MM-DD HH:mm:ss');
            // var end_date = moment(timePresent, 'YYYY-MM-DD HH:mm:ss');
            // var duration = moment.duration(end_date.diff(start_date));
            // var timeDi = duration.asMinutes(); 
            // console.log(timeDi,'???');
            // var timeDiff = Math.round(timeDi);

            var time = new Date();
            var diff =(time.getTime() - user.time) / 1000;
            console.log(diff);
            let d = diff/60;
            var timeDiff = Math.round(d);
            console.log(timeDiff);
             if(timeDiff<=15){
              res.send('your token is expired....')
            } else  {  
                 var password = req.body.password;
                 var confirmPassword = req.body.confirmPassword;
                 if(password !== confirmPassword){
                     res.send('password not match with confirm password')
                 } else{
                     registraionFrom.findOneAndUpdate({email:req.body.email}, {$set:{password:password}}).then((result)=>{
                         console.log(result);
                         res.send('you are login with new password with rwgistered email.... ')
                     })
                 }
                }
   
         
          }
          else {
              res.send('wrong otp...')
          }
    })

   })



app.post("/addName", (req, res) => {
    console.log("Testing addname");
    var myData = new User(req.body);
    myData.save().then(item => {
        res.send('item saved to the database')
    })
        .catch(err => {
            res.status(400).send('unable send to the data');
        });
});

app.get("/getName", (req, res) => {
    console.log("new data get from data base");
    var userName = req.body.name;
    User.findOne({ 'firstName': userName }).then((result) => {
        console.log('the result is ', result);
        res.send(result);
    })
})

app.put("/updateName", (req, res) => {
    console.log("update query run>>>>>>>>");
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var name = req.body.name;
    User.findOneAndUpdate({ 'firstName': firstName }, { $set: { 'lastName': lastName, 'firstName': name } },
        { new: true }).then((result) => {
            console.log('update data is', result);
            res.send(result)
        })

})


app.delete("/deleteName", (req, res) => {
    console.log("data deleted from database");
    var firstName = req.body.firstName;
    User.remove({ 'firstName': firstName }).then((result) => {
        console.log('delete data is ', result);
        res.send(result)
    })
})




// app.use("/login",(req,res)=>{

// })

// app.use("/signup",(req,res)=>{

// })

app.listen(port, () => {
    console.log("server listen to the port " + port);

});