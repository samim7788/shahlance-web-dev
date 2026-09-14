"""Order receipt email service.

PLACEHOLDER SENDER: this does not call a real email provider yet. It renders the
receipt and records it (logs + `email_receipts` collection) so the flow is fully
wired and testable. To go live, set RESEND_API_KEY and implement the real send in
`_send_via_resend` — no caller changes required.
"""
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

FROM_EMAIL = os.environ.get('RECEIPT_FROM_EMAIL', 'noreply@shahlance.com')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')  # unset => placeholder mode


def build_receipt_html(order: dict, download_url: str) -> str:
    title = order.get('title', 'Your order')
    price = float(order.get('price', 0))
    order_id = order.get('id', '')
    seller = order.get('sellerName', 'Seller')
    has_file = bool(order.get('fileId'))
    download_block = (
        f'<a href="{download_url}" style="display:inline-block;background:#10b981;color:#04120b;'
        f'text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;margin-top:8px">'
        f'Access your download</a>'
        f'<p style="color:#94a3b8;font-size:12px;margin-top:10px">'
        f'This link is secure — you must be signed in to your ShahLance account'
        + (' and your download will be available on your order.' if has_file
           else '. Your seller will deliver the files to this order shortly.')
        + '</p>'
    ) if download_url else ''
    return f"""\
<div style="background:#0a0f1e;padding:32px 0;font-family:Inter,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#0f1526;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06)">
      <span style="display:inline-flex;align-items:center;gap:8px;color:#fff;font-weight:800;font-size:18px">
        <span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#34d399,#22c55e);color:#04120b;text-align:center;line-height:28px;font-weight:900">S</span>
        ShahLance
      </span>
    </div>
    <div style="padding:28px">
      <h1 style="color:#fff;font-size:22px;margin:0 0 6px">Payment successful 🎉</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 20px">Thanks for your purchase. Here's your receipt.</p>
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:18px">
        <table style="width:100%;color:#e2e8f0;font-size:14px;border-collapse:collapse">
          <tr><td style="color:#94a3b8;padding:4px 0">Order ID</td><td style="text-align:right">{order_id}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 0">Product</td><td style="text-align:right">{title}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 0">Seller</td><td style="text-align:right">{seller}</td></tr>
          <tr><td style="color:#94a3b8;padding:4px 0">Amount paid</td><td style="text-align:right;font-weight:800;color:#fff">${price:.2f}</td></tr>
        </table>
      </div>
      <div style="margin-top:22px">{download_block}</div>
      <p style="color:#64748b;font-size:12px;margin-top:24px">You received this because you made a purchase on ShahLance. Payments are escrow-protected.</p>
    </div>
  </div>
</div>"""


def _send_via_resend(to: str, subject: str, html: str) -> dict:
    """Real provider hook (future). Only used when RESEND_API_KEY is set."""
    import requests
    resp = requests.post(
        'https://api.resend.com/emails',
        headers={'Authorization': f'Bearer {RESEND_API_KEY}', 'Content-Type': 'application/json'},
        json={'from': FROM_EMAIL, 'to': [to], 'subject': subject, 'html': html},
        timeout=20,
    )
    resp.raise_for_status()
    return {'provider': 'resend', 'status': 'sent', 'id': resp.json().get('id')}


def send_email(to: str, subject: str, html: str) -> dict:
    """Send an email. Placeholder mode unless RESEND_API_KEY is configured."""
    if RESEND_API_KEY:
        try:
            result = _send_via_resend(to, subject, html)
            logger.info(f"[EMAIL] sent to {to} via resend")
            return result
        except Exception as e:
            logger.error(f"[EMAIL] resend send failed: {e}")
            return {'provider': 'resend', 'status': 'failed', 'error': str(e)}
    # Placeholder: log only, no external call.
    logger.info(f"[EMAIL PLACEHOLDER] from={FROM_EMAIL} to={to} subject='{subject}' (not actually sent)")
    return {'provider': 'placeholder', 'status': 'logged'}
