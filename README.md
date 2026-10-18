# YUORA website (single folder)

Files: server.js (backend), index.html (store), admin.html (admin), .env.example, README.md.
data.json (products, orders) is created automatically on first run. Back it up regularly.

## Run on your computer
1. Install Node.js 18 or newer (nodejs.org). No other installs needed.
2. Copy `.env.example` to `.env`; set ADMIN_PASSWORD (10+ chars).
3. In this folder run: `node server.js`
4. Store: http://localhost:3000   Admin: http://localhost:3000/admin
5. In Admin: edit the 7 draft placeholder products (real name, price, stock), set status to "published".

## Manual UPI checkout and WhatsApp
The `.env.example` contains sample deployment values for UPI and WhatsApp. Set `UPI_ID`, `WHATSAPP_NUMBER` (digits only, country code included), and `SHIPPING_INR` in your local `.env` and in Render Environment. The QR/UPI link uses the server-calculated order total including shipping. After paying, the customer can open a prefilled WhatsApp message and attach their screenshot manually. WhatsApp messages are not sent automatically by the website. Verify payment in your UPI/bank app before approving the order in Admin.

## Payments (manual UPI only)
Set `UPI_ID`, `WHATSAPP_NUMBER` (digits only, country code included), and `SHIPPING_INR` in Render Environment. Customers pay the exact server-calculated total including shipping by QR or UPI link, then send a screenshot through WhatsApp. Verify payment in your UPI/bank app before approving orders. Razorpay integration has been removed.

## Going live
Needs a host that runs Node (e.g. a VPS or Render/Railway with a persistent disk so data.json survives), a domain, https, and COOKIE_SECURE=1. Do not use hosts with temporary disks.

## What is included
Storefront, search/filter/sort, cart, server-side pricing and stock checks, PIN/phone/email validation, private order-code tracking, admin (products, orders, manual tracking, announcement, audit log), login rate limiting.

## NOT included (needs more work or accounts)
Customer accounts and password reset, email notifications, Shiprocket (tracking is entered manually), automatic refunds (refund in the Razorpay dashboard, then mark the order), image uploads (products use colour tiles), tax/GST invoices, policy page text, product variants, SQL database (data.json is fine for a small shop only), automated tests. Admin is single-owner (one password).
