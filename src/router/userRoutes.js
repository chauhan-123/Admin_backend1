const express = require('express');
const router = express.Router()
const bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var otpGenerator = require('otp-generator')
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const config = require('../../model/config.js');
const multer = require('multer');
const mailFun = require('../utilities/mail')
const path = require('path');
var pin = require('pincode');
var app = express();
var registraion = require('../models/user');
var registraionFrom = registraion.User;
var uploadImage = registraion.uploadImage;
var addBooksSchema = registraion.addBooksSchema;
var chatApplicationSchema = registraion.chatApplicationSchema;
var subscribeSchema = registraion.subscribeSchema;
var cashOnDelivery = registraion.cashOnDeliveey;
// chattind import
let http = require('http');

const server = http.createServer(app);
const io = require('socket.io')(server);
io.origins(['*:*']);

io.on('connection', (socket) => {
    socket.on('new-message', (message) => {
        io.sockets.emit('new-message', message);
    });
});

// Middlewares
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "../Images/");
    },
    filename: function (req, file, callback) {
        callback(null, Date.now() + "_" + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true)
    } else {
        cb(new Error('Can only upload jpg or png files'), false)
    }
}
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5mb
    },
    fileFilter
});

/*      
 DASHBOARD API FOR ADMIN WHICH SHOW 
 THE HOW MANY USERS AND ADMIN LOGIN WITH CURRENT DATABASE
*/

router.get('/dashboard_details', auth, (req, res) => {
    try {
        registraionFrom.find().then((user, err) => {
            res.status(200).json({ statusCode: 200, message: 'data successfully get from database', data: user })
        })
    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
})



/*    >>>>>>>>>>>>>>>>>>>>>>> REGISTRATION  API  FOR SIGNUP  >>>>>>>>>>>>>>>>>>>>>   */
router.post("/registration", (req, res) => {
    console.log(req.body, '------------')
    try {
        registraionFrom.findOne({ email: req.body.email }, async (err, user) => {
            var emailToValidate = req.body.email;
            const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (emailRegexp.test(emailToValidate)) {
                if (err) res.status(401).json({ statusCode: 401, message: 'something went wrong......' });
                if (user) res.status(400).json({ statusCode: 400, message: 'your are alredy registered this email.......' })
                else {
                    var body = req.body;
                    let password = await bcrypt.hash(req.body.password, 12);
                    let otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });
                    var data = {
                        firstName: body.firstName,
                        lastName: body.lastName,
                        email: body.email,
                        address: body.address,
                        phone: body.phone,
                        password: password,
                        otp: otp,
                        role: body.role
                    }

                    var token = jwt.sign({ id: data._id }, config.secret, {
                        expiresIn: 86400 // expires in 24 hours
                    });
                    data.token = token;
                    var myData = new registraionFrom(data);
                    let mailsent = await sendMailAfterRegistration(myData, otp)
                    myData.save().then(item => {
                        res.status(200).json({ statusCode: 200, message: 'item saved to the database', result: item })
                    })
                        .catch(err => {
                            res.status(400).json({ statusCode: 400, message: 'unable send to the data', error: err });
                        });
                }
            }
            else {
                res.status(500).json({ statusCode: 500, message: 'wrong email??????????????', error: err })
            }
        })
    } catch (e) {
        res.status(500).json({ error: e });
    }
});

async function sendMailAfterRegistration(user, otp) {
    link = `http://localhost:1111/account/login`
    mailContent = `<h2>Good to see you ${user.firstName} ${user.phone}</h2>
    <p>this is the otp thats verify the user <h1> ${user.otp}</h1></p>
    <p>click on the link below to verify mail ${user.email}</p>
  
    <a href=${link}>VERIFY</a>`
    return mailFun(user.email, 'Verify mail', mailContent)
}

// router.get('/account/login/:email', async (req, res) => {
//     var user = await User.findOne({
//         workemail: req.params.email
//     })
//     if (user.mailHash == req.query.code) {
//         user.mailVerified = true;
//         await User.findOneAndUpdate({email:user.workemail},{$set:{mailVerified:true}})
//         res.json({
//             error: false,
//             msg: 'mail verified successfully'
//         })
//     } else {
//         res.json({
//             error: true,
//             msg: 'mail not verified'
//         })
//     }
// })



/*    >>>>>>>>>>>>>>>>>>>>>>>>>> LOGIN API FOR SIGNIN  >>>>>>>>>>>>> >>>>>>>>>>>>>>>>>>>>>  */

router.post("/login", (req, res) => {
    registraionFrom.findOne({ 'email': req.body.email }).then((user, err) => {
        if (err) res.status(401).json({ statusCode: 401, message: 'not a registered user' })
        if (!user) res.status(401).json({ statusCode: 401, message: 'first signup or email is not valid' });
        var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) res.status(402).json({ statusCode: 402, message: ' your password is not match with registered password ....' });
        if ((req.body.role == user.role) && (user.email === req.body.email)) {
            if (user.authOtpVerified == true) {
                var token = jwt.sign({ id: user._id, email: user.email, firstName: user.firstName }, config.secret, {
                    expiresIn: 86400 // expires in 24 hours
                });
                registraionFrom.findByIdAndUpdate(user._id, { token });
                var sendToken = {
                    token: token,
                    firstName: user.firstName,
                    email: user.email,
                    _id: user._id,
                    status: 200,
                    role: user.role
                }
                res.status(200).json({ statusCode: 200, message: 'successfully logged in', result: sendToken });
            }
            else {
                res.status(400).json({ statusCode: 400, message: 'your otp is not verified and u switch the one step thats is verify otp..', error: err, sendtoken: user._id })
            }
        } else if ((req.body.role == user.role) && (user.email === req.body.email)) {
            if (user.authOtpVerified == true) {
                var token = jwt.sign({ id: user._id, email: user.email, firstName: user.firstName }, config.secret, {
                    expiresIn: 86400 // expires in 24 hours
                });
                registraionFrom.findByIdAndUpdate(user._id, { token });
                var sendToken = {
                    token: token,
                    firstName: user.firstName,
                    email: user.email,
                    _id: user._id,
                    status: 200,
                    role: user.role
                }
                res.status(200).json({ statusCode: 200, message: 'successfully logged in', result: sendToken });
            }
            else {
                res.status(400).json({ statusCode: 400, message: 'your otp is not verified and u switch the one step thats is verify otp..', error: err, sendtoken: user._id })
            }
        } else {
            res.status(401).json({ 'message': 'you are not access this account' })
        }

    }).catch(err => {
        console.log('error', err)
    })


});

/*  >>>>>>>>>>>>>>>>>>>>>>>>> VERIFY OTP API WHICH SEND THE ADMIN >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> */
router.post('/verify-otp', (req, res) => {
    try {
        registraionFrom.findOne({ _id: req.body.sendtoken }, (err, user) => {
            if (user.otp === req.body['data'].otp) {
                let authOtpVerified = true;
                registraionFrom.findOneAndUpdate({ email: user.email }, { $set: { authOtpVerified: authOtpVerified } }).then((result) => {
                    res.status(200).json({ statusCode: 200, message: 'your otp is verified..', result: user });
                })
            }
            else {
                res.status(400).json({ statusCode: 400, message: 'otp is not matched with the database otp', result: err })
            }
        })
    } catch (e) {
        res.status(500).json({ error: e });
    }
})


/*  >>>>>>>>>>>>>>>>>>>>>>>>> FORGOT PASSWORD API >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> */

router.post('/forgot-password', (req, res) => {
    registraionFrom.findOne({ 'email': req.body.email }, (err, user) => {
        if (err) res.status(401).json({ statusCode: 401, message: 'not a valid email id' });
        if (!user) res.status(401).json({ statusCode: 401, message: 'email id is not registered ' });
        console.log(user);
        if (user.role === 'user') {
            if (user) {
                var token = jwt.sign({ id: user._id, email: user.email, firstName: user.firstName }, config.secret, {
                    expiresIn: 86400 // expires in 24 hours
                });
                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'chauhan1995sumit@gmail.com',
                        pass: 'Sumit@12345'
                    }
                });
                var mailOptions = {
                    from: 'chauhan1995sumit@gmail.com',
                    to: req.body.email,
                    text: 'resend email',
                    subject: 'Sending Email using Node.js',
                    html: `<p>Click <a href="http://localhost:1111/user/reset-password?token=${token}">sendToken=${token}</a> to reset your password</p>`
                    // text: OTP,
                    //html: '<p>Click</p> <a href="http://localhost:1111/account/forgot-password?email=${email}" > here</a> '
                    // from: 'sumitchauan111@gmail.com',
                    // to: req.body.email,
                    // subject: 'Sending Email using Node.js',
                    // text: otp
                    // html: `<p>Click <a href="http://localhost:1111/account/reset-password?email=${Email}">sendEmail</a> to reset your password</p>`
                };
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                var time = new Date();
                registraionFrom.findOneAndUpdate({ 'email': req.body.email }, { $set: { 'time': time } }).then((result) => {
                    res.status(200).json({ statusCode: 200, message: 'Reset pasword link send to your email..', result: user });
                }).catch(e => res.status(500).json({ error: e }))

            }
        }
        else if (user.role === 'admin') {
            if (user) {
                var token = jwt.sign({ id: user._id, email: user.email, firstName: user.firstName }, config.secret, {
                    expiresIn: 86400 // expires in 24 hours
                });
                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'chauhan1995sumit@gmail.com',
                        pass: 'Sumit@12345'
                    }
                });
                var mailOptions = {
                    from: 'chauhan1995sumit@gmail.com',
                    to: req.body.email,
                    text: 'resend email',
                    subject: 'Sending Email using Node.js',
                    html: `<p>Click <a href="http://localhost:1111/account/reset-password?token=${token}">sendToken=${token}</a> to reset your password</p>`
                    // text: OTP,
                    //html: '<p>Click</p> <a href="http://localhost:1111/account/forgot-password?email=${email}" > here</a> '
                    // from: 'sumitchauan111@gmail.com',
                    // to: req.body.email,
                    // subject: 'Sending Email using Node.js',
                    // text: otp
                    // html: `<p>Click <a href="http://localhost:1111/account/reset-password?email=${Email}">sendEmail</a> to reset your password</p>`
                };
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                var time = new Date();
                registraionFrom.findOneAndUpdate({ 'email': req.body.email }, { $set: { 'time': time } }).then((result) => {
                    res.status(200).json({ statusCode: 200, message: 'Reset pasword link send to your email..', result: user });
                }).catch(e => res.status(500).json({ error: e }))

            }
        } else {
        }
    });
});



/*  >>>>>>>>>>>>>>>>>>>>>>>>>>>>> RESET PASSWORD API ....>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> */

router.post('/reset-password', (req, res) => {
    registraionFrom.findOne({ 'email': req.body.email }, async (err, user) => {
        if (user.authTokenVerified === true) {
            /*
             find out the difference between two days in days,hours and minute

            var diffMs = (Christmas - today); // milliseconds between now & Christmas
            var diffDays = Math.floor(diffMs / 86400000); // days
            var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
            var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
            
            */
            var time = new Date();
            var diffMs = (time - user.time); // millisecond 
            var diffDays = Math.floor(diffMs / 86400000); // days
            var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
            var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
            var diffSec = diffMins / 1000;
            if (diffMins >= 5) { // thats is 5 minute..
                res.status(500).json({ statusCode: 500, message: 'your token is expired....' })
            } else {
                var password = req.body.password;
                var confirmPassword = req.body.confirmPassword;
                if (password !== confirmPassword) {
                    res.status(400).json({ statusCode: 400, message: 'password not match with confirm password' });
                } else {
                    let password2 = await bcrypt.hash(req.body.password, 12);
                    registraionFrom.findOneAndUpdate({ email: user.email }, { $set: { password: password2, authTokenVerified: false } }).then((result) => {
                        res.status(200).json({ statusCode: 200, message: 'you are login with new password with registered email.... ' })
                    })
                }
            }
        } else {
            res.status(405).json({ statusCode: 405, message: 'token is expired ..' })
        }
        /*
                  if(user.otp == req.body.otp){     <....this code generate the otp time and checking and validate the otp...>
                var start_date = moment(user.time, 'YYYY-MM-DD HH:mm:ss'); 
                var timePresent = moment().format('YYYY-MM-DD HH:mm:ss');
                var end_date = moment(timePresent, 'YYYY-MM-DD HH:mm:ss');
                var duration = moment.duration(end_date.diff(start_date));
                var timeDi = duration.asMinutes(); 
                var timeDiff = Math.round(timeDi);
        */

        //   }
        //   else {
        //       res.send('wrong otp...')
        //   }
    })

})

//<--------------------------change password api for admin panel --------------->

router.post('/changePassword', auth, (req, res) => {
    registraionFrom.findOne({ 'email': req.decoded.email }, async (err, user) => {
        var passwordIsValid = bcrypt.compareSync(req.body.oldPassword, user.password);
        if (passwordIsValid) {
            var password = req.body.password;
            var confirmPassword = req.body.confirmPassword;
            if (password !== confirmPassword) {
                return res.status(500).send({ statusCode: 500, auth: false, message: 'Failed to authenticate token.' });
            } else {
                let password2 = await bcrypt.hash(req.body.password, 12);
                registraionFrom.findOneAndUpdate({ email: user.email }, { $set: { password: password2 } }).then((result) => {
                    return res.status(200).send({ statusCode: 200, auth: true, message: 'you password changed.' });
                })
            }
        } else {
            return res.status(500).send({ statusCode: 500, auth: false, message: 'Failed to authenticate token.' });
        }
    });
})

/* <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< ADMIN DETAILS API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.get('/admin_details', auth, (req, res) => {
    try {
        registraionFrom.findOne({ email: req.decoded.email }).then((user, err) => {
            res.status(200).json({ statusCode: 200, message: 'data successfully get from database', data: user })
        })
    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
})

/* <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< UPLOAD IMAGE API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
const fs = require('fs');
router.post("/upload", upload.array('images', 1), auth, (req, res) => {
    try {
        let arr = [];
        let files = Object.keys(req.files);
        files.forEach(file => {
            arr.push(req.files[file].path);
        });
        var data = {
            url: arr,
        }

        let filesToSend = arr.map(item => {
            return fs.readFileSync(path.resolve(path.join(__dirname, '../', item)), 'base64');
        });
        registraionFrom.findOneAndUpdate({ 'email': req.decoded.email }, { $set: { 'url': filesToSend } }).then((result) => {

            res.status(200).json({ statusCode: 200, files: filesToSend });
        })
        res.status(200).json({ statusCode: 200, files: filesToSend });
    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
});

/* <<<<<<<<<<<<<<<<<<<<<<< EDIT PROFILE  API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.put("/edit_profile", auth, (req, res) => {
    try {
        registraionFrom.findOne({ 'email': req.decoded.email }, (err, user) => {
            var userImage = user.url;
            var firstName = req.body.firstName;
            var images = req.body.images;
            registraionFrom.findOneAndUpdate({ 'email': req.decoded.email }, { $set: { 'url': userImage, 'firstName': firstName } },
                { new: true }).then((result) => {
                    res.status(200).json({ statusCode: 200, message: 'Saved successfully', result: userImage });
                })
        })
    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
})

/* <<<<<<<<<<<<<<<<<<<<<<< ADD BOOK  API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
router.post("/add_book", auth, (req, res) => {
    addBooksSchema.findOne({ 'code': req.body.code }, (err, user) => {
        if (user) res.status(400).json({ statusCode: 400, message: 'you can use another code.' });
        if (req.body.images === [] || req.body.images === undefined) {
            return res.status(500).json({ 'message': 'image is required' })
        }
        try {
            let data = {
                name: req.body.name,
                price: req.body.price,
                description: req.body.description,
                author: req.body.author,
                images: req.body.images,
                code: req.body.code,
                status: req.body.status
            }
            var myData = new addBooksSchema(data);
            myData.save();
            res.status(200).json({ statusCode: 200, message: ' book data Saved successfully', data: myData });
        } catch (e) {
            res.status(500).json({ statusCode: 500, error: e });
        }
    })

})


/* <<<<<<<<<<<<<<<<<<<<<<< UPLOAD IMAGE  API FOR BOOK FOR  ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.post("/upload_image", upload.array('images', 1), auth, (req, res) => {
    console.log(req.decoded.id, '>>>>>>>>>>')
    try {
        let arr = [];
        let files = Object.keys(req.files);
        files.forEach(file => {
            arr.push(req.files[file].path);
        });
        var data = {
            url: arr,
        }

        let filesToSend = arr.map(item => {
            return fs.readFileSync(path.resolve(path.join(__dirname, '../', item)), 'base64');
        });

        var myData = new uploadImage(filesToSend);
        myData.save(myData);
        res.status(200).json({ statusCode: 200, files: filesToSend });
    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
});


/* <<<<<<<<<<<<<<<<<<<<<<< GET BOOK  API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.get("/get_book", auth, async (req, res) => {
    try {
        var pageOptions = {
            page: parseInt(req.query.page) || 0,
            limit: parseInt(req.query.limit) || 10
        }
        let key = req.query.field;
        let val = req.query.order;
        let name = req.query.name;
        let author = req.query.author;
        let price = req.query.price;
        let promises = [
            findBooks(pageOptions.page, pageOptions.limit, req.query.search, key, val, name, author, price),
            addBooksSchema.find().count()
        ];
        Promise.all(promises).then(data => {
            res.status(200).json({ result: data[0], total: data[1] })
        }).catch(e => res.status(500).json({ error: e.message }))
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

async function findBooks(skip, limit, search = '', field, order, Name, Author, Price) {
    let obj = {};
    let agg = [];
    if (field) {
        obj[field] = +order
        agg.push({ $sort: obj })
    }
    if (Name && Author && Price) {
        agg.push({ $match: { $or: [{ $and: [{ name: Name }, { author: Author }] }, { price: { $lte: + Price } }] } })
        // agg.push({ $match: { $and: [{name: Name}, { author: Author }, {price: { $eq: +Price}}]}})
    }
    if (limit) {
        agg.push({ $skip: limit * skip }, { $limit: limit });
    }
    if (search) {
        agg.push({ $match: { $or: [{ name: search }, { author: search }] } })
    }
    let books = await addBooksSchema.aggregate(agg);
    agg = [];
    return books;
}

/* <<<<<<<<<<<<<<<<<<<<<<< GET USER DETAILS API FOR ADMIN PANEL WHEN CLICK THE IMAGE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.get("/books_details", auth, (req, res) => {
    try {
        addBooksSchema.find({ '_id': req.query.bookId }, (err, user) => {
            res.status(200).json({ result: user, 'message': 'data get' })
        })
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
})

/* <<<<<<<<<<<<<<<<<<<<<<< UPDATE BOOK  API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.put("/add_book", auth, (req, res) => {
    console.log(req.body)
    try {
        var book = req.body.book;
        var author = req.body.author;
        var price = req.body.price;
        var description = req.body.description;
        var images = req.body.images;
        var status = req.body.status
        addBooksSchema.findOneAndUpdate({ 'code': req.body.code }, { $set: { 'book': book, 'price': price, 'description': description, 'author': author, images: images, status: status } },
            { new: true }).then((result) => {
                res.status(200).json({ statusCode: 200, message: 'Saved successfully', result: result });
            })
    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
})

/* <<<<<<<<<<<<<<<<<<<<<<< DELETE  BOOK  API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.delete("/delete_book", auth, (req, res) => {
    console.log(req.query, '-----------')
    try {
        addBooksSchema.deleteMany({ '_id': req.query.id }).then((result) => {
            res.status(200).json({ statusCode: 200, message: 'deleted succesfully ', result: result });
        })
    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
})

/* <<<<<<<<<<<<<<<<<<<<<<< ACTIVE AND BLOCK  BOOK  API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.put("/active_block_books", auth, (req, res) => {
    console.log(req.body, '-----------');
    try {
        let status = req.body.status;
        addBooksSchema.findOneAndUpdate({ '_id': req.body.id }, { $set: { 'status': status } },
            { new: true }).then((user) => {
                res.status(200).json({ result: user, 'message': 'user blocked successfully', statusCode: 200 })
            })
    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
})

/* <<<<<<<<<<<<<<<<<<<<<<< CHAT API FOR ADMIN PANEL >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
router.post("/user_chat", auth, (req, res) => {
    console.log(req.decoded)
    try {
        chatApplicationSchema.create((req.body), (err, user) => {
            res.status(200).json({ 'message': ' meg send ', result: user })
        })

    } catch (e) {
        res.status(500).json({ statusCode: 500, error: e });
    }
})


/* <<<<<<<<<<<<<<<<<<<<<<< NOTIFICATION API FOR ADMIN PANEL>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.get("/get_notification", (req, res) => {
    console.log('notification working');
    registraionFrom.find((err, user) => {
        res.status(200).json({ 'message': 'notification data get successfully ', statusCode: 200, result: user })
    })
})


/* <<<<<<<<<<<<<<<<<<<<<<< SUBSCRIPTION API FOR USER PANEL>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.post("/subscription", auth, (req, res) => {
    try {
        let data = {
            firstName: req.body.firstName,
            email: req.body.email,
            subscribeType: req.body.subscribeType,
            subscribeAmount: req.body.subscribeAmount
        }
        var myData = new subscribeSchema(data);
        myData.save();
        res.status(200).json({ statusCode: 200, message: ' subscription data Saved successfully', data: myData });
    }
    catch (e) {
        res.status(500).json({ statusCode: 500, error: e })
    }
})



/* <<<<<<<<<<<<<<<<<<<<<<< SUBSCRIPTION API FOR ADMIN PANEL SHOW THE ADMIN DETAILS>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
router.get("/subscription_details", auth, (req, res) => {
    try {
        subscribeSchema.find((err, user) => {
            res.status(200).json({ 'message': 'subscription data get successfully ', statusCode: 200, result: user })
        })
    }
    catch (e) {
        res.status(500).json({ statusCode: 500, error: e })
    }
});



/* <<<<<<<<<<<<<<<<<<<<<<< SUBSCRIPTION API FOR ADMIN PANEL WHEN USER CLICK THE VIEW BUTTON>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
router.get("/viewSubscriptionDetails", auth, (req, res) => {
    try {
        subscribeSchema.find({ '_id': req.query.subscribeId }, (err, user) => {
            res.status(200).json({ result: user, 'message': 'data get' })
        })
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



/* <<<<<<<<<<<<<<<<<<<<<<< CASH ON DELIVERY API FOR ONLINE PAYMENT>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/

router.post("/cashOnDelivery", auth, (req, res) => {
    try {
        let data = {
            firstName: req.body.firstName,
            email: req.body.email,
            phone: req.body.phone,
            country: req.body.country,
            city: req.body.city,
            pincode: req.body.pincode,
            address: req.body.address,
            state: req.body.state
        }
        var myData = new cashOnDelivery(data);
        myData.save();
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'chauhan1995sumit@gmail.com',
                pass: 'Sumit@12345'
            }
        });
        var mailOptions = {
            from: 'chauhan1995sumit@gmail.com',
            to: req.body.email,
            text: 'resend email',
            subject: 'Sending Email using Node.js',
            html: `<p>Thanks for shopping on our online book store<br> 
                      We will be deliver as soon as possible <br>
                      Thanks @ Regards<br>
                      <h3> Sumit Singh Chauhan</h3></p>`
        };
        
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        res.status(200).json({ statusCode: 200, message: ' subscription data Saved successfully', data: myData });
    }
    catch (e) {
        res.status(500).json({ statusCode: 500, error: e })
    }
})


/* <<<<<<<<<<<<<<<<<<<<<<< GET THE PINCODE DATA FROM THIS API>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
router.get("/getPincodeData", auth, (req, res) => {
    console.log(req.query.pincode, '================');
    let pincode = req.query.pincode;
    pin.seachByPin(pincode, function (response) {
        response.forEach(function (data) {
            console.log(data);
        });
    });
});

// router.get("/getPincodeData",auth, (req,res)=>{
//     console.log(pincode , 'oooooooooo')
//     router.get("postalpincode.in/api/pincode/201301" , (req,res)=>{
//         console.log(data, req,res,'---------------------------------------------')
//     })
// let data = "http://postalpincode.in/api/pincode/`pincode`";

//     try{
//         console.log(res)
// res.status(200).json({'message':'pincode dat get successfully'  , result : res})
//     } catch(e){
//         res.status(500).json({ statusCode: 500, error: e })
//     }
// })



















app.get("/getName", (req, res) => {
    var userName = req.body.name;
    User.findOne({ 'firstName': userName }).then((result) => {
        res.send(result);
    })
});

app.put("/updateName", (req, res) => {
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var name = req.body.name;
    User.findOneAndUpdate({ 'firstName': firstName }, { $set: { 'lastName': lastName, 'firstName': name } },
        { new: true }).then((result) => {
            res.send('result')
        })

})


app.delete("/deleteName", (req, res) => {
    var firstName = req.body.firstName;
    User.remove({ 'firstName': firstName }).then((result) => {
        res.send(result)
    })
})


module.exports = router





