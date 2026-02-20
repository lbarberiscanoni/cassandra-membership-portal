# OpenClaims → Cassandra Member API

## Endpoint

```
POST /api/openclaims/add-member
Content-Type: application/json
```

## Request Body

| Field              | Type    | Required | Description                                      |
|--------------------|---------|----------|--------------------------------------------------|
| `name`             | string  | ✅       | Member's legal name                              |
| `email`            | string  | ✅       | Email address (used as unique identifier)        |
| `address`          | string  | ✅       | Physical address                                 |
| `phone`            | string  | ❌       | Phone number                                     |
| `research_consent` | boolean | ❌       | Consented to Cassandra research participation    |
| `source_detail`    | string  | ❌       | Settlement name, campaign, or referral tracking  |

## Example Request

```bash
curl -X POST https://your-domain.com/api/openclaims/add-member \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "address": "123 Main St, Berkeley, CA 94704",
    "phone": "555-0100",
    "research_consent": true,
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
- Email is normalized to lowercase and trimmed
- Duplicate emails are rejected with a 409 containing the existing member ID
- Default values set automatically: `participation: ["Regular member"]`, `meeting_pref: "Watch recording"`, `signature` set to member's name
- No authentication required (to be added later)