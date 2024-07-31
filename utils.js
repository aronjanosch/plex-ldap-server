// utils.js

function log(message) {
    console.log(message);
}

function handleLDAPError(err, req, res, next) {
    log(`LDAP error encountered: ${err}`);
    return next(new Error(err));
}

module.exports = {
    log,
    handleLDAPError
};
