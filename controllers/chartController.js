const e = require('express');
const db = require('../db/db'); // your DB connection
const XLSX = require('xlsx');

exports.dayWiseSales = async (req, res) => {

  try {

    // 🔥 JWT se aaya hua data
  const userId = req.user.id;
  const role = req.user.role;
  const roleId = req.user.role_id;

    const { startDate, endDate } = req.query;
    let query = `
      SELECT DATE(l.lead_date) as date, COUNT(*) as lead_count, SUM(l.mco) as total_sales FROM lead_list as l join users u on l.assigned_to = u.id
      WHERE l.status = '1'`;

    const queryParams = [];


    if (roleId === 7) {
      // SUPERVISOR → team leads
      query += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      queryParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      query += ` AND l.assigned_to = ? `;
      queryParams.push(userId);
    }



    // 2. Dynamically add Date Filter OR Default to Current Month
    if (startDate && endDate) {
      query += ` AND DATE(l.lead_date) BETWEEN ? AND ? `;
      queryParams.push(startDate, endDate);
    } else {
      query += ` 
        AND MONTH(l.lead_date) = MONTH(CURRENT_DATE()) 
        AND YEAR(l.lead_date) = YEAR(CURRENT_DATE()) 
      `;
    }

    query += ` GROUP BY DATE(l.lead_date) ORDER BY date DESC;`;


    // 3. Execute with params
    const [results] = await db.query(query, queryParams);
    
    //console.log(results);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch day-wise sales data' });
  }
};

exports.monthWiseSales = async (req, res) => {
  try {

    // 🔥 JWT se aaya hua data
  const userId = req.user.id;
  const role = req.user.role;
  const roleId = req.user.role_id;


    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        DATE_FORMAT(l.lead_date, '%Y-%m') AS month_date,
        COUNT(*) AS lead_count,
        COALESCE(SUM(l.mco), 0) AS total_sales
      FROM lead_list as l join users u on l.assigned_to = u.id
      WHERE l.status = '1'
    `;

    const queryParams = [];

    
    if (roleId === 7) {
      // SUPERVISOR → team leads
      query += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      queryParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      query += ` AND l.assigned_to = ? `;
      queryParams.push(userId);
    }

    // ✅ Apply filter if provided
    if (startDate && endDate) {
      query += ` AND DATE(l.lead_date) BETWEEN ? AND ? `;
      queryParams.push(startDate, endDate);
    } else {
      // ✅ Default = current year
      query += `
        AND YEAR(l.lead_date) = YEAR(CURRENT_DATE())
      `;
    }

    query += `
      GROUP BY YEAR(l.lead_date), MONTH(l.lead_date)
      ORDER BY YEAR(l.lead_date), MONTH(l.lead_date)
    `;

    const [results] = await db.query(query, queryParams);

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to fetch month-wise sales data'
    });
  }
};


exports.todaySales = async (req, res) => {
  try {
    // 🔥 JWT se aaya hua data
  const userId = req.user.id;
  const role = req.user.role;
  const roleId = req.user.role_id;

    let query = `
      SELECT COUNT(*) AS today_leads, COALESCE(SUM(l.mco), 0) AS total_sales_today FROM lead_list AS l JOIN users u ON l.assigned_to = u.id WHERE l.status = '1' AND DATE(l.lead_date) = CURRENT_DATE();
    `;

    const queryParams = [];

    if (roleId === 7) {
      // SUPERVISOR → team leads
      query += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      queryParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      query += ` AND l.assigned_to = ? `;
      queryParams.push(userId);
    }

    const [results] = await db.query(query, queryParams);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to fetch today-wise sales data'
    });
  }
};

exports.monthSales = async (req, res) => {
  try {
    // 🔥 JWT se aaya hua data
  const userId = req.user.id;
  const role = req.user.role;
  const roleId = req.user.role_id;

    let query = `
      SELECT COUNT(*) AS current_month_leads, COALESCE(SUM(l.mco), 0) AS current_month_sales FROM lead_list AS l JOIN users u ON l.assigned_to = u.id WHERE l.status = '1' AND YEAR(l.lead_date) = YEAR(CURRENT_DATE()) AND MONTH(l.lead_date) = MONTH(CURRENT_DATE());
    `;

    const queryParams = [];

    if (roleId === 7) {
      // SUPERVISOR → team leads
      query += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
      queryParams.push(userId, userId);

    } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
      // TEAM LEAD / SALES EXECUTIVE → own leads
      query += ` AND l.assigned_to = ? `;
      queryParams.push(userId);
    }

    const [results] = await db.query(query, queryParams);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to fetch month-wise sales data'
    });
  }
};

  exports.monthPendingLeads = async (req, res) => {
    try {
      // 🔥 JWT se aaya hua data
    const userId = req.user.id;
    const role = req.user.role;
    const roleId = req.user.role_id;

      let query = `
        SELECT COUNT(*) AS pending_leads_this_month, COALESCE(SUM(l.mco), 0) AS pending_leads_total_value FROM lead_list AS l JOIN users u ON l.assigned_to = u.id WHERE l.status = '0' AND l.refund_status = 0 AND YEAR(l.lead_date) = YEAR(CURRENT_DATE()) AND MONTH(l.lead_date) = MONTH(CURRENT_DATE());
      `;

      const queryParams = [];

      if (roleId === 7) {
        // SUPERVISOR → team leads
        query += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
        queryParams.push(userId, userId);

      } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
        // TEAM LEAD / SALES EXECUTIVE → own leads
        query += ` AND l.assigned_to = ? `;
        queryParams.push(userId);
      }

      const [results] = await db.query(query, queryParams);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Failed to fetch month-wise pending leads data'
      });
    }
  };

  exports.monthRefundedLeads = async (req, res) => {
    try {
      // 🔥 JWT se aaya hua data
    const userId = req.user.id;
    const role = req.user.role;
    const roleId = req.user.role_id;
      let query = `
        SELECT COUNT(*) AS refunded_leads_this_month, COALESCE(SUM(l.mco), 0) AS refunded_leads_total_value FROM lead_list AS l JOIN users u ON l.assigned_to = u.id WHERE l.refund_status != '0' AND YEAR(l.lead_date) = YEAR(CURRENT_DATE()) AND MONTH(l.lead_date) = MONTH(CURRENT_DATE());
      `;

      const queryParams = [];

      if (roleId === 7) {
        // SUPERVISOR → team leads
        query += ` AND (u.team_lead = ? OR l.assigned_to = ?)`;
        queryParams.push(userId, userId);

      } else if (roleId === 4 || roleId === 5 || roleId === 6 || roleId === 2) {
        // TEAM LEAD / SALES EXECUTIVE → own leads
        query += ` AND l.assigned_to = ? `;
        queryParams.push(userId);
      }

      const [results] = await db.query(query, queryParams);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Failed to fetch month-wise refunded leads data'
      });
    }
  };
