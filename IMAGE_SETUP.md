# Header Image Setup

## How to Add the Header Image

1. **Save your image** to the `public/images/` directory
2. **Name it**: `header-bg.jpg` (or `header-bg.webp` for better compression)
3. **Recommended size**: 1200x400px or similar aspect ratio
4. **Format**: JPG, PNG, or WebP

## Image Location

Place your image at:
```
public/images/header-bg.jpg
```

Or if using WebP:
```
public/images/header-bg.webp
```

## Alternative: Using External Image URL

If you want to use an image from a URL instead, you can modify the header in `app/page.tsx` to use:

```tsx
style={{
  backgroundImage: 'url(https://your-image-url.com/image.jpg)',
}}
```

## Current Setup

The header is configured to:
- Display the image as a background
- Show a dark gradient overlay for text readability
- Display "Lisbon Trip" and date range prominently
- Include share and invite buttons with glassmorphism effect
