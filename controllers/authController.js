const db = require('../db/db'); // your DB connection
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query(`SELECT u.*,ut.name AS usertype_name FROM users as u join user_type as ut on u.u_type = ut.value WHERE username = ?`, [username]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid username' });

    const user = rows[0];
    const md5Password = crypto.createHash('md5').update(password).digest('hex');
    if(user.password !== md5Password) return res.status(401).json({ message: 'Invalid password' });
    
    const token = jwt.sign({ id: user.id, role: user.usertype_name, role_id: user.u_type }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token:token,
        userdetails:user
     });

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};