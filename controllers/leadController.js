const e = require('express');
const db = require('../db/db'); // your DB connection
const XLSX = require('xlsx');

exports.getAllLeads = async (req, res) => {

   // 🔥 JWT se aaya hua data
  const userId = req.user.id;
  const role = req.user.role;
  const roleId = req.user.role_id;

  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const offset = (page - 1) * size;

  const search = req.query.search || '';
  const fromDate = req.query.fromDate || '';
  const toDate = req.query.toDate || '';

  // const searchSql = `
  //   (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ?)
  // `;

  try {
    let dataSql = `SELECT l.*,DATE_FORMAT(l.lead_date, '%d-%m-%Y') as lead_date,DATE_FORMAT(l.date_created, '%d-%m-%Y %H:%i:%s') AS date_created, DATE_FORMAT(l.date_updated, '%d-%m-%Y %H:%i:%s') AS date_updated , n.note, CONCAT(c.firstname,' ', COALESCE(c.middlename, ''),' ', c.lastname) AS client, CONCAT(u.firstname,' ', COALESCE(u.middlename, ''),' ', u.lastname) AS agent_name, c.email, c.contact FROM lead_list l JOIN client_list c ON c.lead_id = l.id LEFT JOIN users u ON u.id = l.assigned_to LEFT JOIN note_list n ON n.id = ( SELECT id FROM note_list WHERE lead_id = l.id ORDER BY id DESC LIMIT 1 ) WHERE l.status = 1 AND l.refund_status = 0`;

    const dataParams = [];

    // 📅 Date range filter

    if (fromDate && toDate) {
      dataSql += ` AND l.lead_date BETWEEN ? AND ?`;
      dataParams.push(fromDate, toDate);
    } else if (fromDate) {
      dataSql += ` AND l.lead_date >= ?`;
      dataParams.push(fromDate);
    } else if (toDate) {
      dataSql += ` AND l.lead_date <= ?`;
      dataParams.push(toDate);
    }

    if (search) {
      dataSql += ` AND (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ? OR l.airline_pnr LIKE ? OR l.airline LIKE ? OR l.mco LIKE ?)`;
      dataParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 🔐 Role-based filter
    if (roleId === 7) {
      // SUPERVISOR → team leads
      dataSql += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      dataParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      dataSql += ` AND l.assigned_to = ? `;
      dataParams.push(userId);
    }
    // ADMIN / MANAGER → no filter

    dataSql += ` ORDER BY l.lead_date DESC LIMIT ? OFFSET ? `;
    dataParams.push(size, offset);

    const [data] = await db.query(dataSql, dataParams);
    // console.log(searchSql);

    let countSql = `SELECT COUNT(*) AS count FROM lead_list l JOIN client_list c ON c.lead_id = l.id LEFT JOIN users u ON u.id = l.assigned_to WHERE l.status = 1 AND l.refund_status = 0`;

    const countParams = [];

    if (search) {
      countSql += ` AND (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ? OR l.airline_pnr LIKE ? OR l.airline LIKE ? OR l.mco LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (fromDate && toDate) {
      countSql += ` AND l.lead_date BETWEEN ? AND ?`;
      countParams.push(fromDate, toDate);
    } else if (fromDate) {
      countSql += ` AND l.lead_date >= ?`;
      countParams.push(fromDate);
    } else if (toDate) {
      countSql += ` AND l.lead_date <= ?`;
      countParams.push(toDate);
    }

    if (roleId === 7) {
      countSql += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      countParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      countSql += ` AND l.assigned_to = ? `;
      countParams.push(userId);
    }

    const [[{ count }]] = await db.query(countSql, countParams);

    return res.json({
      data,
      total: count,
      page,
      size
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error fetching leads' });
  }
};

exports.getLeadById = async (req, res) => {
  const { id } = req.params;
  try {
    const [data] = await db.query(`SELECT l.*, DATE_FORMAT(l.lead_date, '%Y-%m-%d') as lead_date, n.note, c.firstname, c.middlename, c.lastname, c.email, c.contact, DATE_FORMAT(dob, '%Y-%m-%d') as dob FROM lead_list l JOIN client_list c ON c.lead_id = l.id LEFT JOIN users u ON u.id = l.assigned_to LEFT JOIN note_list n ON n.id = ( SELECT id FROM note_list WHERE lead_id = l.id ORDER BY id DESC LIMIT 1 ) WHERE l.id = ?`, [id]);
    return res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error fetching lead' });
  }
};

exports.getpendingLeads = async (req, res) => {

   // 🔥 JWT se aaya hua data
  const userId = req.user.id;
  const role = req.user.role;
  const roleId = req.user.role_id;

  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const offset = (page - 1) * size;

  const search = req.query.search || '';

  // const searchSql = `
  //   (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ?)
  // `;

  try {
    let dataSql = `SELECT l.*,DATE_FORMAT(l.lead_date, '%d-%m-%Y') as lead_date,DATE_FORMAT(l.date_created, '%d-%m-%Y %H:%i:%s') AS date_created, DATE_FORMAT(l.date_updated, '%d-%m-%Y %H:%i:%s') AS date_updated,CONCAT(c.firstname,' ', c.lastname , '', COALESCE(c.middlename,'')) as client, CONCAT(u.firstname,' ', u.lastname , '', COALESCE(u.middlename,'')) as agent_name , c.email, c.contact, l.status FROM lead_list l inner join client_list c on c.lead_id = l.id join users u on u.id = l.assigned_to where l.status = 0 and l.refund_status = 0`;

    const dataParams = [];

    if (search) {
      dataSql += ` AND (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ? OR l.airline_pnr LIKE ? OR l.airline LIKE ? OR l.mco LIKE ?)`;
      dataParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }


    // 🔐 Role-based filter
    if (roleId === 7) {
      // SUPERVISOR → team leads
      dataSql += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      dataParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      dataSql += ` AND l.assigned_to = ? `;
      dataParams.push(userId);
    }
    // ADMIN / MANAGER → no filter

    dataSql += ` order by l.status asc, unix_timestamp(l.lead_date) desc LIMIT ? OFFSET ?`;
    dataParams.push(size, offset);

    const [data] = await db.query(dataSql, dataParams);

    let countSql = `SELECT COUNT(*) as count FROM lead_list l where l.status = 0 and l.refund_status = 0`;
    const countParams = [];
    if (search) {
      countSql += ` AND (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ? OR l.airline_pnr LIKE ? OR l.airline LIKE ? OR l.mco LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 🔐 Role-based filter
    if (roleId === 7) {
      // SUPERVISOR → team leads
      countSql += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      countParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      countSql += ` AND l.assigned_to = ? `;
      countParams.push(userId);
    }
    // ADMIN / MANAGER → no filter

    const [[{ count }]] = await db.query(countSql, countParams);

    return res.json({
      data,
      total: count,
      page,
      size
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error fetching leads' });
  }
};


exports.getrefundedLeads = async (req, res) => {

   // 🔥 JWT se aaya hua data
  const userId = req.user.id;
  const role = req.user.role;
  const roleId = req.user.role_id;

  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const offset = (page - 1) * size;

  const search = req.query.search || '';

  // const searchSql = `
  //   (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ?)
  // `;

  try {
    let dataSql = `SELECT l.*,DATE_FORMAT(l.lead_date, '%d-%m-%Y') as lead_date,DATE_FORMAT(l.date_created, '%d-%m-%Y %H:%i:%s') AS date_created, DATE_FORMAT(l.date_updated, '%d-%m-%Y %H:%i:%s') AS date_updated,CONCAT(c.firstname,' ', c.lastname , '', COALESCE(c.middlename,'')) as client, CONCAT(u.firstname,' ', u.lastname , '', COALESCE(u.middlename,'')) as agent_name , c.email, c.contact, l.status FROM lead_list l inner join client_list c on c.lead_id = l.id join users u on u.id = l.assigned_to where l.refund_status != 0`;

    const dataParams = [];

    if (search) {
      dataSql += ` AND (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ?)`;
      dataParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 🔐 Role-based filter
    if (roleId === 7) {
      // SUPERVISOR → team leads
      dataSql += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      dataParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      dataSql += ` AND l.assigned_to = ? `;
      dataParams.push(userId);
    }
    // ADMIN / MANAGER → no filter

    dataSql += ` order by l.status asc, unix_timestamp(l.lead_date) desc LIMIT ? OFFSET ?`;
    dataParams.push(size, offset);


    
    const [data] = await db.query(dataSql, dataParams);

    // console.log(searchSql);

    let countSql = `SELECT COUNT(*) as count FROM lead_list l where l.refund_status != 0`;
    const countParams = [];
    if (search) {
      countSql += ` AND (c.firstname LIKE ? OR c.lastname LIKE ? OR c.email LIKE ? OR c.contact LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 🔐 Role-based filter
    if (roleId === 7) {
      // SUPERVISOR → team leads
      countSql += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      countParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      countSql += ` AND l.assigned_to = ? `;
      countParams.push(userId);
    }
    // ADMIN / MANAGER → no filter

    const [[{ count }]] = await db.query(countSql, countParams);
    return res.json({
      data,
      total: count,
      page,
      size
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error fetching leads' });
  }
};

exports.getCallTrackerLeads = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 20;
  const offset = (page - 1) * size;  
  try {
    const [data] = await db.query(
      `SELECT ct.*,
              CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.middlename, '')) AS agent_name,
              ctype.type_name AS call_type_name,
              CASE call_conversion
           WHEN 1 THEN 'Converted'
           WHEN 2 THEN 'Not Converted'
           WHEN 3 THEN 'Follow Up'
           ELSE 'Unknown'
       END AS call_conversion_status
       FROM call_tracker as ct
       JOIN users u ON u.id = ct.agent_id
       join call_type as ctype on ctype.id = ct.call_type
       ORDER BY ct.id DESC LIMIT ? OFFSET ?`, [ size, offset]
    );

    const [[{ count }]] = await db.query(`SELECT COUNT(*) as count FROM call_tracker ct`);
    return res.json({
      data,
      total: count,
      page,
      size
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error fetching leads' });
  }
};

exports.deleteCallTracker = async (req, res) => {
  const { id } = req.params;  
  try {
    await db.query(`DELETE FROM call_tracker WHERE id = ?`, [id]);
    res.json({ message: 'Call tracker entry deleted successfully' });  
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Error deleting call tracker entry' }); 
  } 
  };

  exports.callTypes = async (req, res) => {
    try {
      const [data] = await db.query(`SELECT * FROM call_type ORDER BY id ASC`);      
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: 2, msg: 'Server error' });
    }
  };

  exports.createCallTracker = async (req, res) => {
    try {
      const { call_date, agent_id,client_name,contact,pnr,airline,call_que, call_type, call_conversion,mco,comment } = req.body;      
      await db.query(`INSERT INTO call_tracker (call_date, agent_id,client_name,contact,pnr,airline,call_que, call_type, call_conversion,mco,comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [call_date, agent_id,client_name,contact,pnr,airline,call_que, call_type, call_conversion,mco,comment]);
      res.json({ message: 'Call tracker entry created successfully' }); 
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'Error creating call tracker entry' }); 
    } 
    };

    exports.updateCallTracker = async (req, res) => {
      const { id } = req.params;
      try {
        const { call_date, agent_id,client_name,contact,pnr,airline,call_que, call_type, call_conversion,mco,comment } = req.body;
        await db.query(`UPDATE call_tracker SET call_date=?, agent_id=?,client_name=?,contact=?,pnr=?,airline=?,call_que=?, call_type=?, call_conversion=?,mco=?,comment=? WHERE id=?`, [call_date, agent_id,client_name,contact,pnr,airline,call_que, call_type, call_conversion,mco,comment,id]);
        res.json({ message: 'Call tracker entry updated successfully' });
      } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Error updating call tracker entry' });
      }
    };

    exports.getCallTrackerById = async (req, res) => {
      const { id } = req.params;  
      try {        
        const [data] = await db.query(`SELECT * FROM call_tracker WHERE id = ?`, [id]);      
        return res.status(200).json(data);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 2, msg: 'Server error' });
      }
    };

    exports.createLead = async (req, res) => {
      try {
        const body = req.body;
        const userId = req.body.assigned_to;
        let leadId = body.id || null;

        /* ---------------- LEAD CODE (CREATE ONLY) ---------------- */
        if (!leadId) {
          const prefix = new Date().toISOString().slice(0, 7).replace('-', '');
          let codeNumber = 1;
          let code;

          while (true) {
            code = `${prefix}-${String(codeNumber).padStart(5, '0')}`;
            const [check] = await db.query(
              'SELECT id FROM lead_list WHERE code = ?',
              [code]
            );
            if (check.length === 0) break;
            codeNumber++;
          }

          body.code = code;
          body.user_id = userId;
        }

        body.user_id = userId;

        /* ---------------- ALLOWED FIELDS ---------------- */
        const leadFields = [
          'code','assigned_to','user_id','mco','airline_pnr','fxl_avl',
          'total_charge','ticket_charge','issuance','reason','airline',
          'confirmation','card_number','expiration','cvv','billing_address',
          'card_holder','departing_place','departing','returning_place',
          'returning','lead_date','tfn','status','in_opportunity',
          'delete_flag','date_updated'
        ];

        const clientFields = [
          'lead_id','firstname','middlename','lastname',
          'dob','contact','email'
        ];

        const noteFields = ['lead_id','note','user_id'];

        /* ---------------- SAVE / UPDATE LEAD ---------------- */
        const leadData = {};
        leadFields.forEach(f => {
          if (body[f] !== undefined) leadData[f] = body[f];
        });

        if (!leadId) {
          const [result] = await db.query(
            'INSERT INTO lead_list SET ?',
            [leadData]
          );
          leadId = result.insertId;
        } else {
          await db.query(
            'UPDATE lead_list SET ? WHERE id = ?',
            [leadData, leadId]
          );
        }

        /* ---------------- SAVE / UPDATE CLIENT ---------------- */
        const clientData = {};
        clientFields.forEach(f => {
          if (body[f] !== undefined) clientData[f] = body[f];
        });

        if (Object.keys(clientData).length > 0) {
          clientData.lead_id = leadId;

          const [existingClient] = await db.query(
            'SELECT id FROM client_list WHERE lead_id = ?',
            [leadId]
          );

          if (existingClient.length === 0) {
            await db.query(
              'INSERT INTO client_list SET ?',
              [clientData]
            );
          } else {
            await db.query(
              'UPDATE client_list SET ? WHERE lead_id = ?',
              [clientData, leadId]
            );
          }
        }

        /* ---------------- SAVE NOTE (OPTIONAL) ---------------- */
        if (body.note) {
          const noteData = {
            note: body.note,
            lead_id: leadId,
            user_id: userId
          };

          await db.query(
            'INSERT INTO note_list SET ?',
            [noteData]
          );
        }

        return res.json({
          message: leadId && body.id
            ? 'Lead details updated successfully.'
            : 'Lead added successfully.'
        });

      } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Error creating lead' }); 
      } 
      };

      exports.updateLead = async (req, res) => {
        const { id } = req.params;
        try {
          const { lead_date, assigned_to, status, refund_status } = req.body;
          await db.query(`UPDATE lead_list SET lead_date=?, assigned_to=?,status=?, refund_status=? WHERE id=?`, [lead_date, assigned_to, status, refund_status,id]);
          res.json({ message: 'Lead updated successfully' });
        } catch (err) {
          console.log(err);
          res.status(500).json({ message: 'Error updating lead' });
        }
      };

      exports.deleteLead = async (req, res) => {
        const { id } = req.params;
        try {
          await db.query(`DELETE FROM lead_list WHERE id = ?`, [id]);
          res.json({ message: 'Lead deleted successfully' });  
        } catch (err) {
          console.log(err);
          res.status(500).json({ message: 'Error deleting lead' }); 
        } 
        };

        // controllers/lead.controller.js
exports.requestDownloadApproval = async (req, res) => {
  
  const { search, fromDate, toDate } = req.body;
  const userId = req.user.id;

  await db.execute(
    `INSERT INTO lead_download_requests 
     (requested_by, filters) VALUES (?, ?)`,
    [userId, JSON.stringify({ search, fromDate, toDate })]
  );

  res.json({ message: 'Download request sent to admin' });
};

exports.getDownloadApprovals = async (req, res) => {
  const userId = req.user.id;
const userType = req.user.role_id;

try {
  let rowsQuery = `
    SELECT j.*, 
           CONCAT(u.firstname,' ', u.lastname , '', COALESCE(u.middlename,'')) AS username, 
           CONCAT(a.firstname,' ', a.lastname , '', COALESCE(a.middlename,'')) AS approved_by_name
    FROM lead_download_requests j
    LEFT JOIN users u ON u.id = j.requested_by
    LEFT JOIN users a ON a.id = j.approved_by
  `;

  let countQuery = `SELECT COUNT(*) as count FROM lead_download_requests`;

  const queryParams = [];

  // If user is NOT type 3, restrict to only their own data
  if (userType !== 3) {
    rowsQuery += ` WHERE j.requested_by = ?`;
    countQuery += ` WHERE requested_by = ?`;
    queryParams.push(userId);
  }

  rowsQuery += ` ORDER BY j.created_at DESC`;

  // Execute queries
  const [rows] = await db.query(rowsQuery, queryParams);
  const [[{ count }]] = await db.query(countQuery, queryParams);

  return res.json({
    data: rows,
    total: count,
    page: 1,
    size: 10
  });
} catch (err) {
  console.error(err);
  return res.status(500).json({ status: 2, msg: 'Server error' });
}

  // if (req.user.u_type !== 3) {

  // }
  // const userType = req.user.u_type;
  // const userId = req.user.id;
  // try {
  // const [rows] = await db.query(`SELECT j.*, CONCAT(u.firstname,' ', u.lastname , '', COALESCE(u.middlename,'')) as username, CONCAT(a.firstname,' ', a.lastname , '', COALESCE(a.middlename,'')) as approved_by_name FROM lead_download_requests j LEFT join users u on u.id = j.requested_by LEFT Join users a on a.id = j.approved_by ORDER BY j.created_at DESC`);
  
  // const [[{ count }]] = await db.query(`SELECT COUNT(*) as count FROM lead_download_requests `);
  //     return res.json({
  //       data: rows,
  //       total: count,
  //       page: 1,
  //       size: 10
  //     });
  // } catch (err) {
  //   console.error(err);
  //   return res.status(500).json({ status: 2, msg: 'Server error' });
  // }
};

exports.rejectDownloadRequest = async (req, res) => {
  const requestId = req.params.id;
  const adminId = req.user.id;

  await db.execute(
    `UPDATE lead_download_requests 
     SET status='REJECTED', approved_by=?, approved_at=NOW()
     WHERE id=?`,
    [adminId, requestId]
  );

  res.json({ message: 'Download rejected' });
};

exports.approveDownloadRequest = async (req, res) => {
  const requestId = req.params.id;
  const adminId = req.user.id;

  await db.execute(
    `UPDATE lead_download_requests 
     SET status='APPROVED', approved_by=?, approved_at=NOW()
     WHERE id=?`,
    [adminId, requestId]
  );

  res.json({ message: 'Download approved' });
};

exports.deleteDownloadRequest = async (req, res) => {
  const requestId = req.params.id;
  await db.execute(`DELETE FROM lead_download_requests WHERE id=?`, [requestId]);
  res.json({ message: 'Download request deleted' });
};

exports.downloadLeads = async (req, res) => {

  // if (req.user.u_type !== 3) {
  //   return res.status(403).json({ message: 'Access denied' });
  // }

  const { search, fromDate, toDate } = req.body;

  let sql = `
    SELECT 
      *
    FROM lead_list
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    sql += ` AND (client LIKE ? OR email LIKE ? OR contact LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (fromDate && toDate) {
    sql += ` AND DATE(lead_date) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  console.log(sql, params);

  const [rows] = await db.execute(sql, params);

  // Convert to Excel
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx'
  });

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=leads.xlsx'
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.send(buffer);
};

exports.refundLead = async (req, res) => {
  const { id, comment, refundType } = req.body;

  await db.execute(`UPDATE lead_list SET refund_status=?, refund_comment=? WHERE id=?`, [refundType, comment, id]);
  res.json({ message: 'Lead refunded' });
};

exports.removeRefund = async (req, res) => {
  const id = req.params.id;

  await db.execute(`UPDATE lead_list SET refund_status='', refund_comment='' WHERE id=?`, [id]);
  res.json({ message: 'Refund removed' });
};

