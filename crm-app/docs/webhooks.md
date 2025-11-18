# Webhook Integration Guide

This guide covers how to set up and use webhooks with n8n in your CRM application.

## Overview

The CRM webhook system allows you to automatically send real-time notifications to n8n (or other webhook endpoints) when important events occur in your CRM. This enables powerful automation workflows and integrations with external systems.

## Supported Webhook Events

The following events can trigger webhooks:

| Event Type | Description | When It's Triggered |
|------------|-------------|-------------------|
| `contact.created` | New contact added | When a contact is successfully created |
| `contact.updated` | Contact modified | When any contact field is updated |
| `contact.deleted` | Contact removed | When a contact is deleted |
| `deal.created` | New deal added | When a deal is successfully created |
| `deal.updated` | Deal modified | When any deal field is updated |
| `deal.stage_changed` | Deal moved between stages | When a deal is dragged to a different stage |
| `company.created` | New company added | When a company is successfully created |
| `company.updated` | Company modified | When any company field is updated |
| `note.created` | Note added | When a note is added to a contact/company/deal |
| `file.uploaded` | File attached | When a file is uploaded and attached |
| `activity.logged` | Activity recorded | When an activity (call, email, meeting) is logged |

## Authentication & Security

### API Key Authentication
All webhook requests include an `X-N8N-API-Key` header for authentication.

### Signature Verification
Webhook payloads are signed using HMAC-SHA256. The signature is sent in the `X-Webhook-Signature` header.

### Timestamp Verification
A timestamp is included in the `X-Webhook-Timestamp` header to prevent replay attacks (5-minute tolerance).

## Webhook Payload Structure

All webhook payloads follow this structure:

```json
{
  \"event\": \"contact.created\",
  \"data\": {
    // Event-specific data
  },
  \"timestamp\": \"2024-01-20T10:30:00.000Z\",
  \"user_id\": \"user-uuid\"
}
```

## Event-Specific Payloads

### Contact Events

#### contact.created
```json
{
  \"event\": \"contact.created\",
  \"data\": {
    \"id\": \"contact-uuid\",
    \"first_name\": \"John\",
    \"last_name\": \"Doe\",
    \"email\": \"john.doe@example.com\",
    \"phone\": \"+1 234 567 8900\",
    \"company_id\": \"company-uuid\",
    \"position\": \"CEO\",
    \"created_at\": \"2024-01-20T10:30:00.000Z\"
  },
  \"timestamp\": \"2024-01-20T10:30:00.000Z\",
  \"user_id\": \"user-uuid\"
}
```

#### contact.updated
```json
{
  \"event\": \"contact.updated\",
  \"data\": {
    \"id\": \"contact-uuid\",
    \"changes\": {
      \"phone\": \"+1 234 567 8901\",
      \"position\": \"CTO\"
    },
    \"updated_at\": \"2024-01-20T10:30:00.000Z\"
  },
  \"timestamp\": \"2024-01-20T10:30:00.000Z\",
  \"user_id\": \"user-uuid\"
}
```

#### contact.deleted
```json
{
  \"event\": \"contact.deleted\",
  \"data\": {
    \"id\": \"contact-uuid\",
    \"deleted_at\": \"2024-01-20T10:30:00.000Z\"
  },
  \"timestamp\": \"2024-01-20T10:30:00.000Z\",
  \"user_id\": \"user-uuid\"
}
```

### Deal Events

#### deal.created
```json
{
  \"event\": \"deal.created\",
  \"data\": {
    \"id\": \"deal-uuid\",
    \"title\": \"Website Redesign\",
    \"value\": 25000,
    \"stage\": \"proposal\",
    \"contact_id\": \"contact-uuid\",
    \"company_id\": \"company-uuid\",
    \"close_date\": \"2024-02-15\",
    \"created_at\": \"2024-01-20T10:30:00.000Z\"
  },
  \"timestamp\": \"2024-01-20T10:30:00.000Z\",
  \"user_id\": \"user-uuid\"
}
```

#### deal.stage_changed
```json
{
  \"event\": \"deal.stage_changed\",
  \"data\": {
    \"id\": \"deal-uuid\",
    \"previous_stage\": \"proposal\",
    \"new_stage\": \"negotiation\",
    \"changed_at\": \"2024-01-20T10:30:00.000Z\"
  },
  \"timestamp\": \"2024-01-20T10:30:00.000Z\",
  \"user_id\": \"user-uuid\"
}
```

### Company Events

#### company.created
```json
{
  \"event\": \"company.created\",
  \"data\": {
    \"id\": \"company-uuid\",
    \"name\": \"Acme Corporation\",
    \"industry\": \"Technology\",
    \"website\": \"https://acme.com\",
    \"phone\": \"+1 555 0100\",
    \"address\": \"123 Tech Street, Silicon Valley, CA\",
    \"created_at\": \"2024-01-20T10:30:00.000Z\"
  },
  \"timestamp\": \"2024-01-20T10:30:00.000Z\",
  \"user_id\": \"user-uuid\"
}
```

## Setup Instructions

### 1. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# n8n Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
N8N_API_KEY=your_n8n_api_key_here
WEBHOOK_SECRET=your_webhook_signing_secret_here
```

### 2. Set Up n8n Webhook

1. Create a new workflow in n8n
2. Add a \"Webhook\" trigger node
3. Configure the webhook trigger:
   - Method: POST
   - Authentication: Header Auth
   - Header Name: `X-N8N-API-Key`
   - Header Value: Your API key
4. Copy the webhook URL to your environment variables

### 3. Configure CRM Webhook Settings

1. Navigate to **Settings > Webhooks** in your CRM
2. Enable webhooks
3. Enter your n8n webhook URL
4. Set your API key and webhook secret
5. Select which events to enable
6. Save configuration

### 4. Test Your Setup

1. Click \"Test Webhook\" in the webhook settings
2. Check your n8n workflow execution logs
3. Verify the test payload was received

## Example n8n Workflow Configurations

### Basic Contact Notification
```json
{
  \"nodes\": [
    {
      \"parameters\": {
        \"path\": \"crm-webhook\",
        \"options\": {}
      },
      \"name\": \"Webhook\",
      \"type\": \"n8n-nodes-base.webhook\",
      \"typeVersion\": 1,
      \"position\": [300, 300]
    },
    {
      \"parameters\": {
        \"conditions\": {
          \"string\": [
            {
              \"value1\": \"={{$json.event}}\",
              \"value2\": \"contact.created\"
            }
          ]
        }
      },
      \"name\": \"IF Contact Created\",
      \"type\": \"n8n-nodes-base.if\",
      \"typeVersion\": 1,
      \"position\": [500, 300]
    },
    {
      \"parameters\": {
        \"message\": \"New contact added: {{$json.data.first_name}} {{$json.data.last_name}} ({{$json.data.email}})\"
      },
      \"name\": \"Send Notification\",
      \"type\": \"n8n-nodes-base.slack\",
      \"typeVersion\": 1,
      \"position\": [700, 200]
    }
  ]
}
```

### Deal Stage Automation
```json
{
  \"nodes\": [
    {
      \"parameters\": {
        \"path\": \"crm-webhook\"
      },
      \"name\": \"Webhook\",
      \"type\": \"n8n-nodes-base.webhook\",
      \"typeVersion\": 1,
      \"position\": [300, 300]
    },
    {
      \"parameters\": {
        \"conditions\": {
          \"string\": [
            {
              \"value1\": \"={{$json.event}}\",
              \"value2\": \"deal.stage_changed\"
            },
            {
              \"value1\": \"={{$json.data.new_stage}}\",
              \"value2\": \"closed-won\"
            }
          ]
        }
      },
      \"name\": \"IF Deal Won\",
      \"type\": \"n8n-nodes-base.if\",
      \"typeVersion\": 1,
      \"position\": [500, 300]
    },
    {
      \"parameters\": {
        \"to\": \"sales@company.com\",
        \"subject\": \"Deal Won! 🎉\",
        \"text\": \"Deal {{$json.data.id}} has been won!\"
      },
      \"name\": \"Send Email\",
      \"type\": \"n8n-nodes-base.emailSend\",
      \"typeVersion\": 1,
      \"position\": [700, 200]
    }
  ]
}
```

## Webhook Validation in n8n

To verify webhook authenticity in n8n, add a code node with signature validation:

```javascript
// Webhook validation code node
const crypto = require('crypto');

const payload = JSON.stringify($input.all()[0].json);
const signature = $node[\"Webhook\"].json.headers[\"x-webhook-signature\"];
const secret = \"your_webhook_secret_here\";

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

return $input.all();
```

## API Endpoints

### Incoming Webhook Endpoint
```
POST /api/webhooks/n8n
```

Receives webhooks from n8n or external systems.

**Headers:**
- `X-N8N-API-Key`: API key for authentication
- `X-Webhook-Signature`: HMAC signature for payload verification
- `X-Webhook-Timestamp`: Unix timestamp for replay protection

### Send Webhook Endpoint
```
POST /api/webhooks/send
```

Internal endpoint for sending webhook events.

**Body:**
```json
{
  \"event\": \"contact.created\",
  \"data\": {
    // Event data
  }
}
```

## Retry Logic

The webhook system includes automatic retry logic:

- **Maximum Attempts**: 3 retries
- **Retry Delay**: Exponential backoff (1m, 2m, 4m)
- **Timeout**: 30 seconds per request
- **Status Tracking**: Logs all delivery attempts

## Monitoring & Logs

### Webhook Logs

View detailed logs in **Settings > Webhooks > Logs & Stats**:

- Event type and timestamp
- Delivery status (delivered, failed, pending, retrying)
- Number of attempts
- HTTP response codes
- Error messages

### Statistics

Monitor webhook performance:
- Total events sent
- Success/failure rates
- Pending deliveries
- Average response times

## Troubleshooting

### Common Issues

#### Webhook Not Firing
1. Check if the event type is enabled in settings
2. Verify webhook URL is correct
3. Ensure webhooks are enabled globally

#### Authentication Failures
1. Verify API key is correct
2. Check webhook secret matches
3. Ensure headers are properly set

#### Signature Verification Failures
1. Confirm webhook secret is identical in both systems
2. Check payload is not modified during transit
3. Verify signature calculation method

#### Timeout Issues
1. Ensure n8n endpoint responds within 30 seconds
2. Check network connectivity
3. Verify n8n workflow is active

### Debug Steps

1. **Test Webhook**: Use the test button to send a test payload
2. **Check Logs**: Review webhook logs for error details
3. **Verify n8n**: Check n8n execution logs
4. **Network**: Test webhook URL directly with curl
5. **Payload**: Verify payload structure matches expected format

### Manual Testing with curl

```bash
curl -X POST https://your-n8n-instance.com/webhook/your-webhook-id \\
  -H \"Content-Type: application/json\" \\
  -H \"X-N8N-API-Key: your-api-key\" \\
  -H \"X-Webhook-Signature: signature-hash\" \\
  -H \"X-Webhook-Timestamp: $(date +%s)\" \\
  -d '{
    \"event\": \"contact.created\",
    \"data\": {
      \"test\": true,
      \"message\": \"Test webhook\"
    },
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
  }'
```

## Security Best Practices

1. **Always verify signatures** in your n8n workflows
2. **Use HTTPS** for all webhook URLs
3. **Rotate API keys** regularly
4. **Monitor webhook logs** for suspicious activity
5. **Set appropriate timeouts** to prevent hanging requests
6. **Validate timestamps** to prevent replay attacks

## Rate Limiting

The webhook system has built-in rate limiting:
- Maximum 100 webhooks per minute per user
- Automatic retry with exponential backoff
- Failed webhooks are queued for retry

## Support

For additional help:
1. Check the webhook logs in your CRM settings
2. Review n8n execution logs
3. Test with the built-in webhook test feature
4. Verify all configuration settings match this guide