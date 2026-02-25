# OpenClaims → Cassandra Member API

## Endpoint

```
POST https://cassandra-membership-portal.vercel.app/api/openclaims/add-member
Content-Type: application/json
```

## Request Body

| Field              | Type    | Required | Description                                      |
|--------------------|---------|----------|--------------------------------------------------|
| `name`             | string  | ✅       | Member's legal name                              |
| `email`            | string  | ✅       | Email address (used as unique identifier)        |
| `address`          | string  | ✅       | Physical address                                 |
| `is_adult`         | boolean | ✅       | Must be `true` — user confirms they are 18 or older |
| `mission`          | boolean | ✅       | Must be `true` — user has read and affirms the [Cassandra Labs mission](https://cassandralabs.org/) |
| `research_consent` | boolean | ✅       | Must be `true` — user has read and agrees to the [Research Participation Consent](https://cassandra-labs.gitbook.io/openclaim/research-participation-consent) |
| `phone`            | string  | ❌       | Phone number                                     |
| `source_detail`    | string  | ❌       | Settlement name, campaign, or referral tracking  |

## Consent Requirements

Before calling this endpoint, the OpenClaims UI must present the user with three affirmative checkboxes:

1. **Age verification** — *"I confirm that I am at least 18 years of age."*
2. **Mission affirmation** — A link to or summary of the [Cassandra Labs mission](https://cassandralabs.org/) with: *"I have read and support the Cassandra Labs mission."*
3. **Research consent** — A link to the full [Research Participation Consent](https://cassandra-labs.gitbook.io/openclaim/research-participation-consent) with: *"I have read and agree to participate in Cassandra Labs research as described in the Research Participation Consent."*

All three must be affirmatively checked by the user. The API rejects requests where any value is `false` or missing.

**Important**: Joining Cassandra is optional. Users may continue using OpenClaims without joining the Association. These checkboxes should only appear when a user chooses to join Cassandra.

## Example Request

```bash
curl -X POST https://cassandra-membership-portal.vercel.app/api/openclaims/add-member \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "address": "123 Main St, Berkeley, CA 94704",
    "is_adult": true,
    "mission": true,
    "research_consent": true,
    "phone": "555-0100",
    "source_detail": "Disney+ $43M Settlement"
  }'
```

## Responses

### 201 Created
```json
{
  "ok": true,
  "member": {
    "id": "uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "status": "active",
    "source": "openclaims",
    "created_at": "2026-02-19T..."
  }
}
```

### 400 Bad Request
```json
{ "error": "Missing required fields: name, email, address" }
```
```json
{ "error": "Invalid email format" }
```
```json
{ "error": "is_adult must be true — members must be at least 18 years of age" }
```
```json
{ "error": "mission must be true — members must affirm the Cassandra Labs mission" }
```
```json
{ "error": "research_consent must be true — members joining through OpenClaims participate via research" }
```

### 409 Conflict (duplicate email)
```json
{
  "error": "Member with this email already exists",
  "existing_member_id": "uuid",
  "status": "active"
}
```

### 500 Server Error
```json
{ "error": "Database error message" }
```

## Notes

- Members added via this endpoint are marked `status: "active"` (dues collected by OpenClaims)
- Members are tagged with `source: "openclaims"` for tracking
- `is_adult`, `mission`, and `research_consent` must all be `true`
- Email is normalized to lowercase and trimmed
- Duplicate emails are rejected with a 409 containing the existing member ID
- Default values set automatically: `participation: ["Regular member"]`, `meeting_pref: "Watch recording"`, `signature` set to member's name
- No authentication required (to be added later)