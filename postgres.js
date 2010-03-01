var binding = require("./binding");

var Connection = binding.Connection;

// postgres cannot handle multiple queries at the same time.
// thus we must queue them internally and dispatch them as
// others come in. 
Connection.prototype.maybeDispatchQuery = function () {
  if (!this._queries) return;
  // If not connected, do not dispatch. 
  if (this.readyState != "OK") return;
  if (!this.currentQuery && this._queries.length > 0) {
    this.currentQuery = this._queries.shift();
    this.dispatchQuery(this.currentQuery[0]);
  }
};

Connection.prototype.query = function (sql, callback) {
  this._queries = this._queries || [];
  this._queries.push([sql, callback]);
  this.maybeDispatchQuery();
};

exports.createConnection = function (conninfo) {
  var c = new Connection;

  c.addListener("connect", function () {
    c.maybeDispatchQuery();
  });

  c.addListener("result", function (arg) {
    process.assert(c.currentQuery);
    var callback = c.currentQuery[1];
    c.currentQuery = null;
    if (callback) callback(arg[0]);
  });

  c.addListener("ready", function () {
    c.maybeDispatchQuery();
  });

  c.connect(conninfo);

  return c;
};
