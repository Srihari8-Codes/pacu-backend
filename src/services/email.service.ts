import nodemailer from 'nodemailer';
import { errorResponse } from '../utils/response';

/**
 * Service to handle email operations using Nodemailer.
 */
export class EmailService {
    private static transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'bvaj1212@gmail.com',
            pass: process.env.EMAIL_PASS, // App password should be in .env
        },
    });

    /**
     * Sends a 6-digit OTP to the specified email address.
     * @param to Recipient email address
     * @param otp The 6-digit OTP code
     */
    static async sendOTP(to: string, otp: string): Promise<void> {
        const mailOptions = {
            from: process.env.EMAIL_USER || 'bvaj1212@gmail.com',
            to,
            subject: 'PACU Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #00A389;">Password Reset Request</h2>
                    <p>You requested a password reset for your PACU Monitoring Tool account.</p>
                    <p>Your 6-digit One Time Password (OTP) is:</p>
                    <h1 style="color: #00A389; letter-spacing: 5px;">${otp}</h1>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you did not request this, please ignore this email.</p>
                    <br>
                    <p>Regards,<br>PACU Team</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`OTP sent successfully to ${to}`);
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email. Please try again later.');
        }
    }
}
