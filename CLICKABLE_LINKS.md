# Clickable Invite Links

## 🎯 Quick Access Links

### Option 1: Invite Page (Recommended)
**URL:** http://localhost:3000/invite

This page shows:
- ✅ **Big "Join Lisbon Trip Now" button** - Click to join directly
- ✅ Clickable invite link (blue, underlined)
- ✅ Copy and Share buttons

### Option 2: Direct Join Link
**URL:** http://localhost:3000/join?token=YOUR_TOKEN

This link takes people directly to the join page where they can enter their name.

## 📱 How to Share

### Method 1: Share the Invite Page
1. Visit: http://localhost:3000/invite
2. Click "📤 Share" button (uses native sharing on mobile)
3. Or copy the link and paste it anywhere

### Method 2: Share the Direct Join Link
1. Visit: http://localhost:3000/invite
2. Click "📋 Copy Link" 
3. The copied link is: `http://localhost:3000/join?token=YOUR_TOKEN`
4. Paste this link in Messages, WhatsApp, email, etc.

## ✨ Features

- **Big Clickable Button**: The invite page has a prominent "🎉 Join Lisbon Trip Now" button
- **Clickable Link**: The URL itself is a clickable hyperlink (blue, underlined)
- **Mobile Friendly**: Works perfectly on iPhone Messages
- **One-Click Join**: When someone clicks, they go directly to the join page

## 🔗 Example

When you visit http://localhost:3000/invite, you'll see:

```
┌─────────────────────────────────┐
│   🎉 Join Lisbon Trip Now       │  ← Big clickable button
└─────────────────────────────────┘

Or share this link:
http://localhost:3000/join?token=...
                    ↑
              Clickable link
```

Both the button and the link take people directly to the join page!
