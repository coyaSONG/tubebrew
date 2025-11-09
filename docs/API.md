# TubeBrew API Documentation

**Version**: 0.1.0
**Base URL**: `http://localhost:3000` (Development) | `https://tubebrew.vercel.app` (Production)
**Authentication**: Supabase Auth (Session-based)

---

## Table of Contents

1. [Authentication](#authentication)
2. [YouTube Integration](#youtube-integration)
3. [Channel Management](#channel-management)
4. [Video Management](#video-management)
5. [User Settings](#user-settings)
6. [Worker API](#worker-api)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

All API endpoints (except auth routes) require authentication via Supabase session cookies.

### Sign In

**Endpoint**: `POST /api/auth/signin`
**Authentication**: None (public)
**Description**: Initiates Google OAuth flow

**Response**:
```json
{
  "data": { "url": "https://accounts.google.com/..." },
  "error": null
}
```

---

### OAuth Callback

**Endpoint**: `GET /auth/callback?code={code}`
**Authentication**: None (public)
**Description**: Handles Google OAuth callback

**Query Parameters**:
- `code` (string, required): OAuth authorization code

**Response**: Redirects to `/onboarding` or `/dashboard`

---

### Sign Out

**Endpoint**: `POST /auth/signout`
**Authentication**: Required
**Description**: Signs out the current user

**Response**: Redirects to `/auth/signin`

---

## YouTube Integration

### Get User Subscriptions

**Endpoint**: `GET /api/youtube/subscriptions`
**Authentication**: Required
**Description**: Fetches user's YouTube channel subscriptions

**Response**:
```json
{
  "data": {
    "channels": [
      {
        "id": "UCxxx",
        "title": "Channel Name",
        "description": "Channel description",
        "thumbnailUrl": "https://...",
        "subscriberCount": 1000000,
        "videoCount": 500
      }
    ]
  },
  "error": null
}
```

**Error Responses**:
- `401`: User not authenticated
- `404`: YouTube channel not linked
- `500`: YouTube API error

---

### Get Channel Videos

**Endpoint**: `GET /api/youtube/channel-videos?channelId={id}`
**Authentication**: Required
**Description**: Fetches recent videos from a specific channel

**Query Parameters**:
- `channelId` (string, required): YouTube channel ID

**Response**:
```json
{
  "data": {
    "videos": [
      {
        "videoId": "xxx",
        "title": "Video Title",
        "publishedAt": "2025-11-08T10:00:00Z"
      }
    ]
  },
  "error": null
}
```

**Error Responses**:
- `400`: Missing channelId parameter
- `401`: User not authenticated
- `500`: YouTube API error

---

## Channel Management

### Classify Channels (AI)

**Endpoint**: `POST /api/channels/classify`
**Authentication**: Required
**Description**: Uses AI to classify channels into categories

**Request Body**:
```json
{
  "channels": [
    {
      "id": "UCxxx",
      "title": "Channel Name",
      "description": "Channel description",
      "recentVideoTitles": ["Video 1", "Video 2"]
    }
  ]
}
```

**Response**:
```json
{
  "data": {
    "classifications": [
      {
        "channelId": "UCxxx",
        "category": "개발/기술",
        "confidence": 0.95
      }
    ]
  },
  "error": null
}
```

**AI Categories**:
- 개발/기술 (Development/Tech)
- 음악/엔터 (Music/Entertainment)
- 뉴스 (News)
- 교육 (Education)
- 라이프스타일 (Lifestyle)
- 게임 (Gaming)
- 스포츠 (Sports)
- 요리 (Cooking)
- 여행 (Travel)
- 과학 (Science)
- 비즈니스 (Business)
- 건강/피트니스 (Health/Fitness)
- 예술 (Arts)
- 코미디 (Comedy)
- 기타 (Other)

**Error Responses**:
- `400`: Invalid request body
- `401`: User not authenticated
- `500`: AI classification error

---

### Save User Channels

**Endpoint**: `POST /api/channels/save`
**Authentication**: Required
**Description**: Saves user's selected channels with categories

**Request Body**:
```json
{
  "channels": [
    {
      "youtubeId": "UCxxx",
      "title": "Channel Name",
      "description": "Description",
      "thumbnailUrl": "https://...",
      "subscriberCount": 1000000,
      "videoCount": 500,
      "category": "개발/기술",
      "customCategory": null,
      "isHidden": false
    }
  ]
}
```

**Response**:
```json
{
  "data": {
    "saved": 10,
    "message": "Channels saved successfully"
  },
  "error": null
}
```

**Database Operations**:
1. Upserts channels into `channels` table
2. Creates relationships in `user_channels` table
3. Subscribes to WebSub notifications for each channel

**Error Responses**:
- `400`: Invalid request body
- `401`: User not authenticated
- `500`: Database error

---

## Video Management

### Get Video Feed

**Endpoint**: `GET /api/videos/feed?category={category}&limit={limit}&offset={offset}`
**Authentication**: Required
**Description**: Fetches user's personalized video feed

**Query Parameters**:
- `category` (string, optional): Filter by category (default: all)
- `limit` (number, optional): Number of videos to return (default: 20, max: 100)
- `offset` (number, optional): Pagination offset (default: 0)
- `sort` (string, optional): Sort order - `newest`, `oldest`, `popular` (default: `newest`)

**Response**:
```json
{
  "data": {
    "videos": [
      {
        "id": "uuid",
        "youtubeId": "xxx",
        "title": "Video Title",
        "description": "Video description",
        "thumbnailUrl": "https://...",
        "duration": 1234,
        "publishedAt": "2025-11-08T10:00:00Z",
        "viewCount": 50000,
        "likeCount": 1000,
        "channel": {
          "id": "uuid",
          "youtubeId": "UCxxx",
          "title": "Channel Name",
          "category": "개발/기술"
        },
        "summaries": [
          {
            "level": 1,
            "content": "One-line summary"
          },
          {
            "level": 2,
            "content": "Three-line summary"
          }
        ],
        "isBookmarked": false,
        "isWatched": false
      }
    ],
    "total": 150,
    "hasMore": true
  },
  "error": null
}
```

**Error Responses**:
- `401`: User not authenticated
- `500`: Database error

---

### Bookmark Video

**Endpoint**: `POST /api/videos/bookmark`
**Authentication**: Required
**Description**: Adds or removes video from bookmarks

**Request Body**:
```json
{
  "videoId": "uuid",
  "action": "add",  // or "remove"
  "priority": 2     // optional, 1-3 (default: 1)
}
```

**Response**:
```json
{
  "data": {
    "success": true,
    "action": "added"
  },
  "error": null
}
```

**Error Responses**:
- `400`: Invalid action or missing videoId
- `401`: User not authenticated
- `404`: Video not found
- `500`: Database error

---

### Mark Video as Watched

**Endpoint**: `POST /api/videos/watch`
**Authentication**: Required
**Description**: Marks video as watched

**Request Body**:
```json
{
  "videoId": "uuid",
  "source": "tubebrew"  // or "youtube"
}
```

**Response**:
```json
{
  "data": {
    "success": true,
    "watchedAt": "2025-11-08T10:00:00Z"
  },
  "error": null
}
```

**Error Responses**:
- `400`: Missing videoId
- `401`: User not authenticated
- `404`: Video not found
- `500`: Database error

---

## User Settings

### Get User Settings

**Endpoint**: `GET /api/settings`
**Authentication**: Required
**Description**: Retrieves current user settings

**Response**:
```json
{
  "data": {
    "summaryLevel": 2,
    "notificationType": "daily",
    "notificationTime": "08:00:00",
    "youtubeSyncEnabled": true
  },
  "error": null
}
```

**Settings Fields**:
- `summaryLevel` (1-4): Default summary detail level
- `notificationType`: `realtime`, `daily`, `weekly`, or `off`
- `notificationTime`: Time for daily digest (HH:MM:SS format)
- `youtubeSyncEnabled`: Whether to sync YouTube watch history

**Error Responses**:
- `401`: User not authenticated
- `404`: Settings not found (auto-created on first access)
- `500`: Database error

---

### Update User Settings

**Endpoint**: `PATCH /api/settings`
**Authentication**: Required
**Description**: Updates user settings

**Request Body** (all fields optional):
```json
{
  "summaryLevel": 3,
  "notificationType": "daily",
  "notificationTime": "09:00:00",
  "youtubeSyncEnabled": false
}
```

**Validation**:
- `summaryLevel`: Must be 1, 2, 3, or 4
- `notificationType`: Must be `realtime`, `daily`, `weekly`, or `off`
- `notificationTime`: Must be valid HH:MM:SS format

**Response**:
```json
{
  "data": {
    "updated": true,
    "settings": {
      "summaryLevel": 3,
      "notificationType": "daily",
      "notificationTime": "09:00:00",
      "youtubeSyncEnabled": false
    }
  },
  "error": null
}
```

**Error Responses**:
- `400`: Invalid field values
- `401`: User not authenticated
- `500`: Database error

---

## Worker API

**Base URL**: `http://localhost:3001` (Development)

### Health Check

**Endpoint**: `GET /health`
**Authentication**: None
**Description**: Returns worker health status

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-08T10:00:00Z",
  "uptime": 12345,
  "redis": "connected",
  "database": "connected"
}
```

---

### Queue Statistics

**Endpoint**: `GET /stats`
**Authentication**: None
**Description**: Returns BullMQ queue statistics

**Response**:
```json
{
  "videoCollection": {
    "waiting": 5,
    "active": 2,
    "completed": 1000,
    "failed": 3
  },
  "summaryGeneration": {
    "waiting": 10,
    "active": 5,
    "completed": 500,
    "failed": 2
  }
}
```

---

### WebSub Subscribe Endpoint

**Endpoint**: `GET /websub/subscribe?hub.mode={mode}&hub.topic={topic}&hub.challenge={challenge}`
**Authentication**: None (verified by hub.challenge)
**Description**: WebSub subscription verification endpoint

**Query Parameters**:
- `hub.mode`: `subscribe` or `unsubscribe`
- `hub.topic`: YouTube channel feed URL
- `hub.challenge`: Random string from hub
- `hub.lease_seconds`: Subscription duration

**Response**: Echo `hub.challenge` value (text/plain)

---

### WebSub Notification Callback

**Endpoint**: `POST /websub/callback`
**Authentication**: None (public webhook)
**Description**: Receives new video notifications from YouTube

**Request Body**: Atom XML feed
```xml
<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <yt:videoId>xxx</yt:videoId>
    <yt:channelId>UCxxx</yt:channelId>
    <title>Video Title</title>
    <published>2025-11-08T10:00:00Z</published>
  </entry>
</feed>
```

**Response**: `200 OK` (acknowledgment)

**Processing**:
1. Parses XML feed
2. Extracts video and channel IDs
3. Adds to BullMQ `videoCollection` queue
4. Returns 200 immediately (async processing)

---

## Error Handling

### Standard Error Response

All API endpoints return errors in this format:

```json
{
  "data": null,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not permitted |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Unexpected server error |

### Common Error Messages

- `"User not authenticated"` - Session expired or missing
- `"Invalid request body"` - Request body doesn't match schema
- `"Channel not found"` - YouTube channel doesn't exist
- `"YouTube API quota exceeded"` - Daily API limit reached
- `"Database error"` - Supabase operation failed

---

## Rate Limiting

### Current Implementation

**Status**: Not yet implemented
**Planned**: Upstash Rate Limit middleware

### Future Limits (Phase 2)

- **General API**: 100 requests/minute per user
- **YouTube API proxy**: 10 requests/minute per user
- **AI Classification**: 5 requests/minute per user

---

## Authentication Details

### Session Management

- **Provider**: Supabase Auth
- **Method**: HTTP-only cookies
- **Duration**: 7 days (refresh token: 30 days)
- **Middleware**: Next.js middleware validates all routes except `/auth/*`

### OAuth Scopes

When users sign in, they grant these permissions:

- `openid` - Basic identity
- `email` - Email address
- `profile` - Name and avatar
- `youtube.readonly` - Read subscriptions
- `youtube.force-ssl` - Read watch history (optional)

### Provider Token Storage

YouTube OAuth tokens are stored in `users.provider_token` (encrypted by Supabase):

```typescript
{
  "access_token": "ya29...",
  "refresh_token": "1//...",
  "expires_at": 1699999999
}
```

**Automatic Refresh**: Worker refreshes tokens before expiry using `packages/db/src/oauth-utils.ts`

---

## Request/Response Examples

### Complete Request Flow

#### 1. Sign In
```bash
curl -X POST http://localhost:3000/api/auth/signin
```

#### 2. Get Subscriptions
```bash
curl http://localhost:3000/api/youtube/subscriptions \
  -H "Cookie: session=..."
```

#### 3. Classify Channels
```bash
curl -X POST http://localhost:3000/api/channels/classify \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "channels": [
      {
        "id": "UCxxx",
        "title": "Fireship",
        "description": "Tech news and tutorials",
        "recentVideoTitles": ["React 19", "AI Update"]
      }
    ]
  }'
```

#### 4. Save Channels
```bash
curl -X POST http://localhost:3000/api/channels/save \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "channels": [
      {
        "youtubeId": "UCxxx",
        "title": "Fireship",
        "category": "개발/기술"
      }
    ]
  }'
```

#### 5. Get Video Feed
```bash
curl "http://localhost:3000/api/videos/feed?category=개발/기술&limit=10" \
  -H "Cookie: session=..."
```

---

## Development Tips

### Testing APIs Locally

1. **Start Services**
   ```bash
   pnpm dev
   ```

2. **Get Session Cookie**
   - Sign in via browser at http://localhost:3000
   - Open DevTools → Application → Cookies
   - Copy session cookie value

3. **Test with cURL**
   ```bash
   curl http://localhost:3000/api/videos/feed \
     -H "Cookie: session=YOUR_SESSION_COOKIE"
   ```

### Using Postman/Insomnia

1. Create a request
2. Set cookie manually or use cookie jar
3. Use JSON body for POST/PATCH requests

### API Response Logging

All API routes use Next.js logging:
```typescript
console.log('[API] /videos/feed', { category, limit });
```

Worker uses Pino structured logging:
```typescript
logger.info({ event: 'video_processed', videoId });
```

---

## Changelog

### Version 0.1.0 (2025-11-08)
- Initial API documentation
- All core endpoints implemented
- WebSub integration complete

---

**Maintained By**: TubeBrew Development Team
**Last Updated**: 2025-11-08
