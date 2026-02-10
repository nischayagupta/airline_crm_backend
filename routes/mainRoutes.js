const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth.middleware');

const multer = require('multer');
router.get('/', (req, res) => {
  res.send('Airline CRM Backend is running.');
});

router.get('/leads', authMiddleware,leadController.getAllLeads);
router.get('/pendingLeads', authMiddleware, leadController.getpendingLeads);
router.get('/refundedLeads', authMiddleware, leadController.getrefundedLeads);
router.get('/users', userController.getAllUsers);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `avatar-${req.body.id || Date.now()}.png`),
});
const upload = multer({ storage });

router.post('/createuser',upload.single('avatar'), userController.createUser);
router.post('/updateUserProfile', upload.none(),userController.updateUserProfile);
router.delete('/deleteuser/:id', userController.deleteUser);
router.get('/usersType', userController.usersType);
router.get('/reportingList', userController.reportingList);
router.get('/user/:id', userController.getUserById);
router.put('/updateuser/:id', upload.none(), userController.updateUser);
router.post('/login', authController.login);
router.get('/getCallTrackerLeads', leadController.getCallTrackerLeads);
router.delete('/deleteCallTracker/:id', leadController.deleteCallTracker);
router.get('/getAllActiveUsersName', userController.getAllActiveUsersName);
router.get('/callTypes', leadController.callTypes);
router.post('/createCallTracker', leadController.createCallTracker);
router.get('/getCallTrackerById/:id', leadController.getCallTrackerById);
router.put('/updateCallTracker/:id', leadController.updateCallTracker);
router.post('/createLead', leadController.createLead);
router.put('/updateLead/:id', leadController.createLead);
router.delete('/deleteLead/:id', leadController.deleteLead);
router.get('/getLeadById/:id', leadController.getLeadById);
router.post('/requestDownloadApproval',authMiddleware, leadController.requestDownloadApproval);
router.post('/downloadLeads', leadController.downloadLeads);
router.get('/getDownloadApprovals', authMiddleware, leadController.getDownloadApprovals);
router.post('/approveDownloadRequest/:id',authMiddleware, leadController.approveDownloadRequest);
router.post('/rejectDownloadRequest/:id',authMiddleware, leadController.rejectDownloadRequest);
router.delete('/deleteDownloadRequest/:id',authMiddleware, leadController.deleteDownloadRequest);
router.post('/refundLead', authMiddleware, leadController.refundLead);
router.post('/removeRefund/:id', authMiddleware, leadController.removeRefund);
module.exports = router;