const mysql = require('mysql2');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lms_db',
  timezone: '+05:30'   // IST
});
module.exports = pool.promise();