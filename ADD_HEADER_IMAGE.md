# How to Add Your Header Image

## Quick Steps

1. **Find the image you sent** (the one with four men at a table with food and beer)

2. **Save it to this location:**
   ```
   /Users/ermanbozdogan/Lissabon app/public/images/header-bg.jpg
   ```

3. **Supported file names:**
   - `header-bg.jpg` (recommended)
   - `header-bg.webp`
   - `header-bg.png`

## Method 1: Using Finder (Mac)

1. Open Finder
2. Navigate to: `/Users/ermanbozdogan/Lissabon app/public/images/`
3. Drag and drop your image into this folder
4. Rename it to `header-bg.jpg`

## Method 2: Using Terminal

```bash
# Navigate to the project
cd "/Users/ermanbozdogan/Lissabon app"

# Copy your image (replace /path/to/your/image.jpg with actual path)
cp /path/to/your/image.jpg public/images/header-bg.jpg
```

## Method 3: If Image is in Downloads

```bash
# Find your image file first
ls ~/Downloads/*.jpg
ls ~/Downloads/*.png

# Then copy it (replace filename with your actual file)
cp ~/Downloads/your-image-name.jpg "/Users/ermanbozdogan/Lissabon app/public/images/header-bg.jpg"
```

## Verify It Works

After adding the image:
1. Refresh your browser (hard refresh: Cmd+Shift+R)
2. The purple gradient should be replaced with your image
3. You should see the four men at the table as the background

## Troubleshooting

- **Still seeing purple?** 
  - Check the file name is exactly `header-bg.jpg`
  - Check the file is in `public/images/` folder
  - Try restarting the dev server: `npm run dev`

- **Image not loading?**
  - Make sure the file extension matches (.jpg, .png, or .webp)
  - Check file permissions
  - Try a different image format
