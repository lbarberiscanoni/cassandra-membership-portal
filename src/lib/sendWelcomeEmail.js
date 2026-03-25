import { getResend } from "@/lib/resend";

export async function sendWelcomeEmail({ name, email }) {
  const firstName = name.split(" ")[0];

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Cassandra Labs <hello@cassandralabs.org>",
    to: email,
    subject: "Welcome to Cassandra Labs!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome to Cassandra Labs, ${firstName}!</h1>
        <p>Your membership is now active. We're excited to have you on board.</p>
        <p>Here's what to expect next:</p>
        <ul>
          <li>You'll receive an invite to our next member meeting.</li>
          <li>You can participate in initiatives you signed up for.</li>
          <li>Keep an eye on your inbox for updates from the community.</li>
        </ul>
        <p>If you have any questions, just reply to this email.</p>
        <p>— The Cassandra Labs Team</p>
      </div>
    `,
  });

  if (error) {
    console.error("❌ Failed to send welcome email:", error);
    throw error;
  }

  console.log(`✅ Welcome email sent to ${email}`);
}
