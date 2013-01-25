Mongoose Account Locking - Useful for Mongoose User Schema with locking
========================

This mongoose plugin is based on the post by Jeremy Martin’s [DevSmash Blog](http://devsmash.com/blog/implementing-max-login-attempts-with-mongoose)

### How it works?

- A user’s account should be “locked” after some number of consecutive failed login attempts
- A user’s account should become unlocked once a sufficient amount of time has passed
- The User model should expose the reason for a failed login attempt to the application (though not necessarily to the end user)

### Installation
    npm install mongoose-account-locking

### How to use?

After define your Mongoose user schema, just add mongoose-account-locking as plugin to your user schema

    UserSchema.plugin(locking);

You can also pass options when adding plugin

    var options = {
        , maxLoginAttempts = 5
        , lockTime = 2 * 60 * 60 * 1000
        , username = 'username'
        , password = 'password';
    };
    User.plugin(locking, options)

where

    maxLoginAttempts - Maximum number of allowable failed logins

    lockTime  - Amount of duration that account will be locked after exceeding the maxLoginAttemts

    username - username key that is used in User schema. By default, it is 'username'. If you are using email as username, you can set to 'email'

    password - password key that is used in User schema. By default, it is 'password'.


Example:
    Refer examples folder for sample code

    To verify the code, you have to run the sample.js 5 times.
    After 5th time, it will lock the account. It wont allow you to access the account for next 2 hours.

### Contributors

- [Jeremy Martin](https://devsmash.com/)
- [Fizer Khan](https://github.com/fizerkhan)

### License

MIT License
