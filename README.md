## Cassandra Membership Portal

Simple membership portal for the Cassandra Labs Assocation

## TODO 

- [x] Finish the wizard
    - [x] searchable physical address
    - [x] link to Cassandra website in Mission Affirmation 
        - [x] also include the paragraph from the by-laws
    - [x] Explain participation areas
- [ ] Account creation
    - this should include Supabase Auth 
    - this also means we have to create a page for stuff
- [x] Meeting prefrences 
    - [x] Live Zoom vs. Watch Recording should be a dropdown 
    - [x] Insetad of preferred Timezone, let's link to When2Meet
- [ ] Optional nominations & agenda ideas
    - [x] Add conditional check on David and other board candidates
        - 'As Member Liaison, I’ll be the bridge between our growing community and Cassandra’s mission to build public-good infrastructure—from open-source prediction markets to fintech tools that widen access to finance. I thrive on greeting new members, turning our charitable, educational, and scientific goals into clear first steps, and following through until everyone feels heard. When feedback rolls in, I act fast—updating docs, scheduling live Q&As, and looping in the right experts—so momentum never stalls. Empowering volunteers to contribute their best work isn’t a side task for me; it’s how I’ll keep Cassandra’s Association vibrant and moving forward.'
    - [x] Voting on by-laws
    - [x] Add agenda so that people can vote on it
        - [x] Ranked Voting on the projects
    - [ ] Questions for Jacob and I to answer
- [ ] Send the welcome email + .ics invite.
    – In stripe-webhook/route.js after you mark the row active, call your mailer (Resend, Postmark, etc.) and attach a static public/annual_meeting.ics.
    – That keeps the annual-meeting notice automatic and NCUA-compliant.
- [ ] QA pass.
    – Test the ?coupon=DUESPAID flow once (it should zero-out the charge).
    – Run one paid $1 test and confirm Stripe → Supabase → email all fire.
    – Kill one join halfway through Checkout and make sure the “pending” draft row is harmless.
- [ ] Membership Portal
    - enable people to modify their answers from the portal 
    - eventually we can add the rest of the information