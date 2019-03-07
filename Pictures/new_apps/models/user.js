var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = new Schema({
    username: { 
        type: String, 
        required: true, 
        index: { 
            unique: true 
        } 
    },
    password: {
         type: String, 
        required: true
     },
    loginAttempts: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    lockUntil: { 
        type: Number 
    }
});

var UserSchema = mongoose.model('UserSchema', User);
module.exports = UserSchema;