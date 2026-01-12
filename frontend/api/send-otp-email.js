const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const key = req.headers["x-internal-key"];
    if (!key || key !== process.env.INTERNAL_KEY) {
        return res.status(401).send("Unauthorized");
    }

    const { to, otp, brand, subject: customSubject, html: customHtml } = req.body;

    if (!to) {
        return res.status(400).send("Missing 'to'");
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
    });

    let subject = customSubject;
    let html = customHtml;

    // Default to OTP template if no custom HTML provided
    if (!html && otp) {
        subject = subject || `${brand || "Annya Jewellers"} Verification Code`;
        html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #c4ad94;">Annya Jewellers</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 36px; letter-spacing: 8px; color: #333;">${otp}</h1>
          <p>This code expires in 5 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `;
    }

    if (!subject || !html) {
        return res.status(400).send("Missing email content (subject/html or otp)");
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
            to,
            subject,
            html,
        });
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Vercel Mailer Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
