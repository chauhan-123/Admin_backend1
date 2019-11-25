var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/registration");

var registrationSchema = new mongoose.Schema({
    firstName:String,
    lastName: String,
    email:String,
    address:String,
    phone:Number,
    password:String,
    otp:String,
    time:Object

});

var User = mongoose.model("user",registrationSchema);

var loginSchema = new mongoose.Schema({
    email:String,
    password:String
})

var login = mongoose.model("login",loginSchema);

module.exports.User = User;
module.exports.login= login;