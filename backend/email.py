"""
Email utility for Tracal.

Uses Python's built-in smtplib with Gmail SMTP (TLS on port 587).
All SMTP credentials are read from environment variables — never hardcoded.

Required environment variables (set in the shell or a .env file loaded before startup):
    SMTP_HOST      e.g. smtp.gmail.com
    SMTP_PORT      e.g. 587
    SMTP_USER      your Gmail address  e.g. yourapp@gmail.com
    SMTP_PASSWORD  your Gmail App Password (16-char, no spaces)
    FROM_EMAIL     display sender address (can equal SMTP_USER)

If any variable is missing, send_email() logs a warning and returns silently
so the rest of the API keeps working even without email configured.
"""

import os
import logging
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import partial
from .settings import settings

# Load email configuration from Settings singleton
SMTP_HOST     = settings.SMTP_HOST
SMTP_PORT     = settings.SMTP_PORT
SMTP_USER     = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
FROM_EMAIL    = settings.FROM_EMAIL or settings.SMTP_USER

logger = logging.getLogger(__name__)

SMTP_HOST     = os.getenv("SMTP_HOST", "")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL", SMTP_USER)


def _send_blocking(to_email: str, subject: str, html_body: str) -> None:
    """Blocking SMTP send — called inside a thread pool."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Tracal <{FROM_EMAIL}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())


async def send_email(to_email: str, subject: str, html_body: str) -> None:
    """
    Non-blocking email send.
    Runs the blocking SMTP call in FastAPI's default thread-pool executor
    so the async event loop is never blocked.
    Silently skips if SMTP credentials are not configured.
    """
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
        logger.warning(
            "Email not sent — SMTP_HOST / SMTP_USER / SMTP_PASSWORD not configured. "
            "Set these environment variables to enable emails."
        )
        return

    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(
            None,
            partial(_send_blocking, to_email, subject, html_body),
        )
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception as exc:
        # Log but never crash the API endpoint
        logger.error("Failed to send email to %s: %s", to_email, exc)


# ---------------------------------------------------------------------------
# Email template helpers
# ---------------------------------------------------------------------------

def _base_template(title: str, body_html: str) -> str:
    """Minimal responsive HTML email wrapper matching Tracal's orange/teal palette."""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);
                       padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:900;
                         letter-spacing:-0.5px;">Tracal</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                Authentic Homestays Across India
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              {body_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:20px 40px;text-align:center;
                       border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © 2026 Tracal · Authentic Local Homestays<br/>
                You received this email because you registered on Tracal.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def verification_email(name: str, email: str, verification_url: str) -> tuple[str, str]:
    """Returns (subject, html_body) for email verification link."""
    subject = "Verify your Tracal account"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:800;">
        Welcome to Tracal, {name}! 🏡
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Thank you for signing up. Please verify your email address to activate your account and start exploring authentic homestays.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="{verification_url}"
           style="background:#f97316;color:#ffffff;text-decoration:none;
                  font-weight:700;font-size:16px;padding:14px 36px;
                  border-radius:50px;display:inline-block;box-shadow:0 4px 12px rgba(249,115,22,0.3);">
          Verify Email Address →
        </a>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background:#fff7ed;border-left:4px solid #f97316;
                     border-radius:8px;padding:16px 20px;">
            <p style="margin:0;color:#9a3412;font-size:13px;font-weight:600;">
              ⏳ Time-Sensitive Link
            </p>
            <p style="margin:4px 0 0;color:#1e293b;font-size:14px;">
              This verification link expires in <strong>15 minutes</strong> and can only be used once.
            </p>
          </td>
        </tr>
      </table>

      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 10px;">
        If the button above does not work, copy and paste this link into your browser:
      </p>
      <p style="word-break:break-all;color:#f97316;font-size:12px;margin:0 0 24px;">
        <a href="{verification_url}" style="color:#f97316;">{verification_url}</a>
      </p>

      <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;">
        If you did not sign up for a Tracal account, you can safely ignore this email.
      </p>
    """
    return subject, _base_template(subject, body)


def welcome_email(name: str, email: str) -> tuple[str, str]:
    """Returns (subject, html_body) for a new registration welcome email."""
    subject = "Welcome to Tracal — Your Adventure Awaits 🏡"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:800;">
        Welcome, {name}! 👋
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Your Tracal account has been created successfully.
        You can now browse authentic homestays, save your favourites,
        and book directly with local hosts — all in ₹.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background:#fff7ed;border-left:4px solid #f97316;
                     border-radius:8px;padding:16px 20px;">
            <p style="margin:0;color:#9a3412;font-size:14px;font-weight:600;">
              Your registered email
            </p>
            <p style="margin:4px 0 0;color:#1e293b;font-size:15px;">{email}</p>
          </td>
        </tr>
      </table>

      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Here's what you can do right now:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="color:#f97316;font-weight:700;">🏖️</span>
            <span style="color:#334155;font-size:14px;margin-left:8px;">
              Browse Beach, Mountain, City and Village stays
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="color:#f97316;font-weight:700;">❤️</span>
            <span style="color:#334155;font-size:14px;margin-left:8px;">
              Save your favourite homestays
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <span style="color:#f97316;font-weight:700;">🏠</span>
            <span style="color:#334155;font-size:14px;margin-left:8px;">
              List your own property and earn in ₹
            </span>
          </td>
        </tr>
      </table>

      <div style="text-align:center;margin-top:36px;">
        <a href="http://localhost:3000"
           style="background:#f97316;color:#ffffff;text-decoration:none;
                  font-weight:700;font-size:15px;padding:14px 36px;
                  border-radius:50px;display:inline-block;">
          Start Exploring →
        </a>
      </div>
    """
    return subject, _base_template(subject, body)


def login_notification_email(name: str, email: str) -> tuple[str, str]:
    """Returns (subject, html_body) for a login notification email."""
    from datetime import datetime
    now = datetime.now().strftime("%d %b %Y at %I:%M %p")
    subject = "New login to your Tracal account"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;font-weight:800;">
        Hi {name}, you just logged in 👋
      </h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        We noticed a new sign-in to your Tracal account.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background:#f0fdf4;border-left:4px solid #14b8a6;
                     border-radius:8px;padding:16px 20px;">
            <p style="margin:0;color:#134e4a;font-size:13px;font-weight:600;
                      text-transform:uppercase;letter-spacing:0.05em;">
              Login Details
            </p>
            <p style="margin:8px 0 4px;color:#1e293b;font-size:14px;">
              <strong>Account:</strong> {email}
            </p>
            <p style="margin:0;color:#1e293b;font-size:14px;">
              <strong>Time:</strong> {now}
            </p>
          </td>
        </tr>
      </table>

      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
        If this was you, no action is needed.
        If you did not log in, please change your password immediately
        by contacting us at support@tracal.com.
      </p>
    """
    return subject, _base_template(subject, body)
