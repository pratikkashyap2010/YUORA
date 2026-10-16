# YUORA website (single folder)

Files: server.js (backend), index.html (store), admin.html (admin), .env.example, README.md.
data.json (products, orders) is created automatically on first run. Back it up regularly.

## Run on your computer
1. Install Node.js 18 or newer (nodejs.org). No other installs needed.
2. Copy `.env.example` to `.env`; set ADMIN_PASSWORD (10+ chars).
3. In this folder run: `node server.js`
4. Store: http://localhost:3000   Admin: http://localhost:3000/admin
5. In Admin: edit the 7 draft placeholder products (real name, price, stock), set status to "published".

## Payments (Razorpay, test mode first)
1. Create a Razorpay account, copy Test Key ID and Secret into `.env`.
2. In Razorpay Dashboard > Webhooks add `https://YOUR-DOMAIN/api/webhook/razorpay`, event `payment.captured` (and `payment.failed`), set a secret, put it in RAZORPAY_WEBHOOK_SECRET.
3. Keep auto-capture on. Test with Razorpay test cards. Switch to Live keys only after approval.
Without keys, checkout is disabled. Cash on Delivery does not exist in the code.

## Going live
Needs a host that runs Node (e.g. a VPS or Render/Railway with a persistent disk so data.json survives), a domain, https, and COOKIE_SECURE=1. Do not use hosts with temporary disks.

## What is included
Storefront, search/filter/sort, cart, server-side pricing and stock checks, PIN/phone/email validation, Razorpay order creation, signature + server verification, signed idempotent webhook, private order-code tracking, admin (products, orders, manual tracking, announcement, audit log), login rate limiting.

## NOT included (needs more work or accounts)
Customer accounts and password reset, email notifications, Shiprocket (tracking is entered manually), automatic refunds (refund in the Razorpay dashboard, then mark the order), image uploads (products use colour tiles), tax/GST invoices, policy page text, product variants, SQL database (data.json is fine for a small shop only), automated tests. Admin is single-owner (one password).
