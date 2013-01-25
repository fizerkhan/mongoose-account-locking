/**
 * Module dependencies.
 */
'use strict';
var   bcrypt = require('bcrypt')
    , SALT_WORK_FACTOR = 10
    // these values can be whatever you want - we're defaulting to a
    // max of 5 attempts, resulting in a 2 hour lock
    , maxLoginAttempts = 5
    , lockTime = 2 * 60 * 60 * 1000
    , username = 'username'
    , password = 'password';

module.exports = function (schema, options) {
    
    // Update configurations based on options
    if (options && 'Object' == options.constructor.name) {
        // Change login options if exist
        maxLoginAttempts = options.maxLoginAttempts ||
                                 maxLoginAttempts;
        lockTime = options.lockTime || lockTime;

        // Set username and password field key
        username = options.username || username;
        password = options.password || password;
    }

    // For password lock.
    schema.add({
        loginAttempts: { type: Number, required: true, default: 0 },
        lockUntil: { type: Number }
    });

    schema.virtual('isLocked').get(function() {
        // check for a future lockUntil timestamp
        return !!(this.lockUntil && this.lockUntil > Date.now());
    });

    schema.pre('save', function(next) {
        var user = this;

        // only hash the password if it has been modified (or is new)
        if (!user.isModified(password)) return next();
     
        // generate a salt
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if (err) return next(err);
     
            // hash the password using our new salt
            bcrypt.hash(user[password], salt, function(err, hash) {
                if (err) return next(err);
     
                // override the cleartext password with the hashed one
                user[password] = hash;
                next();
            });
        });
    });

    schema.methods.comparePassword = function(candidatePassword, cb) {
        bcrypt.compare(candidatePassword, this[password], function(err, isMatch) {
            if (err) {
                return cb(err);
            }
            cb(null, isMatch);
        });
    };

    schema.methods.incLoginAttempts = function(cb) {
        // if we have a previous lock that has expired, restart at 1
        if (this.lockUntil && this.lockUntil < Date.now()) {
            return this.update({
                $set: { loginAttempts: 1 },
                $unset: { lockUntil: 1 }
            }, cb);
        }
        // otherwise we're incrementing
        var updates = { $inc: { loginAttempts: 1 } };
        // lock the account if we've reached max attempts and it's not locked already
        if (this.loginAttempts + 1 >= maxLoginAttempts && !this.isLocked) {
            updates.$set = { lockUntil: Date.now() + lockTime };
        }
        return this.update(updates, cb);
    };

    // expose enum on the model
    var reasons = schema.statics.failedLogin = {
        NOT_FOUND: 0,
        PASSWORD_INCORRECT: 1,
        MAX_ATTEMPTS: 2
    };

    schema.statics.getAuthenticated = function(name, pwd, cb) {
        var query = {};
        query[username] = name;
        // Find the user by username.  If there is no user with the given
        // username, or the password is not correct, set the user to `null` to
        // indicate failure and set a flash message.  Otherwise, return the
        // authenticated `user`.
        this.findOne(query, function(err, user) {
            if (err) {
                return cb(err);
            }

            // make sure the user exists
            if (!user) {
                return cb(null, null, reasons.NOT_FOUND);
            }
     
            // check if the account is currently locked
            if (user.isLocked) {
                // just increment login attempts if account is already locked
                return user.incLoginAttempts(function(err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, null, reasons.MAX_ATTEMPTS);
                });
            }
     
            // test for a matching password
            user.comparePassword(pwd, function(err, isMatch) {
                if (err) {
                    return cb(err);
                }
     
                // check if the password was a match
                if (isMatch) {
                    // if there's no lock or failed attempts, just return the user
                    if (!user.loginAttempts && !user.lockUntil) {
                        return cb(null, user);
                    }
                    // reset attempts and lock info
                    var updates = {
                        $set: { loginAttempts: 0 },
                        $unset: { lockUntil: 1 }
                    };
                    return user.update(updates, function(err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb(null, user);
                    });
                }
     
                // password is incorrect, so increment login attempts before responding
                user.incLoginAttempts(function(err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, null, reasons.PASSWORD_INCORRECT);
                });
            });
        });
    };
};