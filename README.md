## Cassandra Membership Portal

Simple membership portal for the Cassandra Labs Assocation

## TODO 

- [ ] Finish the wizard’s middle steps.
    – Copy the STEP 2 → STEP 6 blocks from the earlier snippet (they were unchanged).
    – Drop in a one-line progress bar if you want visual polish.
- [ ] Send the welcome email + .ics invite.
    – In stripe-webhook/route.js after you mark the row active, call your mailer (Resend, Postmark, etc.) and attach a static public/annual_meeting.ics.
    – That keeps the annual-meeting notice automatic and NCUA-compliant.
- [ ] Tighten Supabase security.
    – The wizard runs in the browser, so it should import Supabase with the anon key only.
    – Keep the service_role key exclusively inside the API routes (create-checkout-session and stripe-webhook).
- [ ] Copy & marketing polish.
    – Replace the placeholder root page with a short intro + Join Now button linking to /membership.
    – Paste the membership-page copy we drafted earlier into Squarespace so the public site and the portal tell the same story.
- [ ] QA pass.
    – Test the ?coupon=DUESPAID flow once (it should zero-out the charge).
    – Run one paid $1 test and confirm Stripe → Supabase → email all fire.
    – Kill one join halfway through Checkout and make sure the “pending” draft row is harmless.