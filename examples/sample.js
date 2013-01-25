var  mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , locking = require('../');

var connStr = 'mongodb://localhost:27017/mongoose-locking-test';
mongoose.connect(connStr, function(err) {
    if (err) throw err;
    console.log('Successfully connected to MongoDB');
});

// Define User Schema
var UserSchema = new Schema({
    username: { type: String, required: true, index: { unique: true }},
    password: { type: String, required: true }
});

// Add locking
UserSchema.plugin(locking);

// Create Model based on User Schema
var User = mongoose.model('User', UserSchema);

// create a user a new user
var testUser = new User({
    username: 'guest',
    password: 'Password123'
});
 
// save user to database
testUser.save(function(err) {
    // if (err) throw err; // Skip To avoid duplicate entry creation error.
 
    // attempt to authenticate user, it takes username and password.
    // We are giving wrong password to verify the account locking.
    // By default, it takes after 5 failed attempts
    User.getAuthenticated('guest', 'MyPassword', function(err, user, reason) {
        if (err) throw err;
 
        // login was successful if we have a user
        if (user) {
            // handle login success
            console.log('login success');
            process.exit(0);    // Just to exit the app. Not needed for Server.
        }
 
        // otherwise we can determine why we failed
        var reasons = User.failedLogin;
        switch (reason) {
            case reasons.NOT_FOUND:
                // handle not found
                console.log('User is not found');
                break;
            case reasons.PASSWORD_INCORRECT:
                // note: these cases are usually treated the same - don't tell
                // the user *why* the login failed, only that it did
                console.log('Invalid Password');
                break;
            case reasons.MAX_ATTEMPTS:
                // send email or otherwise notify user that account is
                // temporarily locked
                console.log('Your account has been locked for next 2 hours.');
                break;
        }
        process.exit(1);    // Just to exit the app. Not needed for Server.
    });
});