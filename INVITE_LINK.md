# How to Get and Share the Invite Link

## Quick Access

**Visit this URL to get your invite link:**
```
http://localhost:3000/invite
```

This page works even if you haven't joined yet! It will show you the generic invite link that you can share with everyone.

## The Invite Link Format

Your invite link will look like this:
```
http://localhost:3000/join?token=YOUR_UNIQUE_TOKEN
```

## How to Share

1. **Get the link**: Visit `/invite` or click "🔗 Get Link" in the app header
2. **Copy it**: Click "📋 Copy Link" button
3. **Share it**: 
   - Paste into iPhone Messages
   - Send via WhatsApp
   - Email it
   - Share via any method you prefer

## What Happens When Someone Clicks the Link

1. They'll be taken to a join page
2. They enter their name (Erman, Mathias, Morten, or Dardan)
3. They click "Join Trip"
4. They're automatically logged in and can start planning!

## For Production

When you deploy to Vercel or another hosting service:

1. Set the `NEXT_PUBLIC_BASE_URL` environment variable to your production URL
2. The invite link will automatically use the correct domain
3. Share the link from `/invite` page - it will work on any device!

## Example

If your app is deployed at `https://lisbon-trip.vercel.app`, the invite link will be:
```
https://lisbon-trip.vercel.app/join?token=YOUR_TOKEN
```

Just visit `https://lisbon-trip.vercel.app/invite` to get the link!
