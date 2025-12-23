import express from 'express';
import { sendVerificationEmail } from '../lib/mailerSend.js';

const router = express.Router();

router.post('/test-email', async (req, res) => {
    const { toEmail, toName } = req.body;
    
    if (!toEmail) {
        return res.status(400).json({ success: false, message: 'toEmail is required' });
    }

    try {
        const apiBaseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8001}`;
        const testToken = 'test-token-' + Date.now();
        const verifyUrl = `${apiBaseUrl.replace(/\/$/, '')}/api/auth/verify-email?token=${testToken}`;

        console.log('Sending test email to:', toEmail);
        console.log('Using MAILERSEND_FROM_EMAIL:', process.env.MAILERSEND_FROM_EMAIL);
        
        await sendVerificationEmail({
            toEmail,
            toName: toName || 'Test User',
            verifyUrl
        });
        
        console.log('Test email sent successfully!');
        res.json({ 
            success: true, 
            message: 'Test email sent!',
            details: {
                to: toEmail,
                from: process.env.MAILERSEND_FROM_EMAIL,
                verifyUrl
            }
        });
    } catch (error) {
        console.error('Error in test email endpoint:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send test email',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

export default router;
