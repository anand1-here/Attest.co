// Case and evidence IDs end up in filenames, the DB and the chain, so keep them strict.
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const isValidId = (s) => typeof s === "string" && ID_RE.test(s);
module.exports = { isValidId, ID_MESSAGE: "IDs may contain only letters, digits, '-' and '_' (max 64 characters)" };
