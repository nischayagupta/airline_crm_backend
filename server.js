require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const mainRoutes = require('./routes/mainRoutes');
app.use('/api', mainRoutes);

// Serve Angular files
// app.use(express.static(path.join(__dirname, "dist")));

// app.use((req, res) => {
//   res.sendFile(path.join(__dirname, "../airline-crm-frontend/dist/airline-crm-frontend/index.html"));
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
