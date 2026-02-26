const db = require('../db/db'); // your DB connection

const crypto = require('crypto');

exports.getAllUsers = async (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.role_id;

  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const offset = (page - 1) * size;

  let whereClause = `u.id != ?`;
  let params = ['2']; // excluded user id

  // 🔒 Team Lead → only their team
  if (roleId === 2) {
    whereClause += ` AND u.team_lead = ?`;
    params.push(userId);
  }

  // Admin & Manager → no extra restriction

  try {
    const [data] = await db.query(`SELECT u.*, CONCAT(u.firstname,' ',u.lastname) AS name, ut.name AS usertype_name FROM users u JOIN user_type ut ON u.u_type = ut.value
      WHERE ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,[...params, size, offset]);

    const [[{ count }]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM users u
      WHERE ${whereClause}
      `,
      params
    );

    return res.json({
      data,
      total: count,
      page,
      size
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching users' });
  }
};


// Save or update user
exports.createUser = async (req, res) => {
  try {
    const {
      id,
      username,
      firstname,
      middlename,
      lastname,
      u_type,
      password,
      oldpassword,
      login_type,
      team_lead
    } = req.body;

    const avatar = req.file ? req.file.filename : null;

    let status = req.body.status;
    if (!status && login_type == 1) status = 1;

    // Check old password if present
    if (oldpassword && id) {
      const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [id]);
      if (rows.length && rows[0].password !== md5(oldpassword)) {
        return res.status(200).json({ status: 4 });
      }
    }

    // Check if username already exists
    const [check] = await db.query(
        'SELECT * FROM users WHERE username = ? ' + (id ? 'AND id != ?' : ''),
        id ? [username, id] : [username]
      );

    if (check.length > 0) {
      return res.status(200).json({ status: 3 });
    }

    // Prepare data
    const fields = [];
    const values = [];
    for (let key of ['firstname', 'middlename', 'lastname', 'username', 'u_type', 'team_lead']) {
      if (req.body[key]) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (password) {
      fields.push('password = ?');
      values.push(md5(password));
    }

    let result;
    if (!id) {
      const [insertResult] = await db.query(`INSERT INTO users SET ${fields.join(', ')}`, values);
      req.body.id = insertResult.insertId;
      result = { status: 1 };
    } else {
      values.push(id);
      await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      result = { status: 1 };
    }

    // Image Upload
    if (req.body.avatar) {
      const fname = `uploads/${req.body.avatar}`;
      await db.query(
          "UPDATE users SET avatar = CONCAT(?, '?v=', UNIX_TIMESTAMP(CURRENT_TIMESTAMP)) WHERE id = ?",
          [fname, req.body.id]
        );
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const {
      firstname,
      middlename,
      lastname,
      u_type,
      password,
      oldpassword,
      login_type,
      team_lead
    } = req.body;

    const { id } = req.params;

    const avatar = req.file ? req.file.filename : null;

    let status = req.body.status;
    if (!status && login_type == 1) status = 1;

    // Prepare data
    const fields = [];
    const values = [];
    for (let key of ['firstname', 'middlename', 'lastname', 'password', 'u_type', 'team_lead']) {
      if (req.body[key]) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (password) {
      fields.push('password = ?');
      values.push(md5(password));
    }

    let result;
    
      values.push(id);
      await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      result = { status: 1 };

    // Image Upload
    if (req.body.avatar) {
      const fname = `uploads/${req.body.avatar}`;
      await db.query(
          "UPDATE users SET avatar = CONCAT(?, '?v=', UNIX_TIMESTAMP(CURRENT_TIMESTAMP)) WHERE id = ?",
          [fname, req.body.id]
        );
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const {
      id,
      firstname,
      middlename,
      lastname,
      password,
    } = req.body;

    if (!id) {
      return res.status(400).json({ status: 0, msg: 'User ID required' });
    }

    // Prepare data
    const fields = [];
    const values = [];
    for (let key of ['firstname', 'middlename', 'lastname']) {
      if (req.body[key]) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (password) {
      fields.push('password = ?');
      values.push(md5(password));
    }

    if (fields.length === 0) {
      return res.status(400).json({ status: 0, msg: 'No fields to update' });
    }

      values.push(id);
      await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    return res.status(200).json({ status: 1, msg: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: 0, msg: 'User ID required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 0, msg: 'User not found' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: 0, msg: 'User ID required' });
    }

    const [result] = await db.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 0, msg: 'User not found' });
    }

    return res.status(200).json({
      status: 1,
      msg: 'User deleted successfully'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

exports.usersType = async (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.role_id;

  if (roleId === 2) {
    try {
      const [data] = await db.query(`SELECT * FROM user_type where value != 3 and value != 1 and value != 2 order by id asc`);
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: 2, msg: 'Server error' });
    }
  }

  try {
    const [data] = await db.query(`SELECT * FROM user_type where value != 3 order by id asc`);
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

exports.reportingList = async (req, res) => {
  try {
    const [data] = await db.query(`SELECT id, CONCAT(firstname,' ', lastname) as name FROM users where u_type not in (3, 4, 5, 6, 7) order by name asc`);
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

exports.getAllActiveUsersName = async (req, res) => {
  try {
    const [data] = await db.query(`SELECT id, CONCAT(firstname,' ', lastname) as name FROM users where status = 1 and u_type not in (3, 1, 2) order by name asc`);
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!id) {
      return res.status(400).json({ status: 0, msg: 'User ID required' });
    }
    const [rows] = await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return res.status(200).json({ status: 1, msg: 'User status updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 2, msg: 'Server error' });
  }
};

// Utility: MD5 hash
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}