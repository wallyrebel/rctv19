# RCTV19 - Ripley Community Television Website

A modern, fast, and accessible website for RCTV19 built with [Eleventy](https://www.11ty.dev/) static site generator.

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18.x or higher
- [Git](https://git-scm.com/)
- npm (comes with Node.js)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/rctv19-website.git
   cd rctv19-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start dev server**
   ```bash
   npm run dev
   ```

4. **View the site**
   Open [http://localhost:8080](http://localhost:8080) in your browser.

### Build for Production

```bash
npm run build
```

The built site will be in the `_site` directory.

---

## 📦 Cloudflare Pages Deployment

### Build Settings

When setting up your Cloudflare Pages project:

| Setting | Value |
|---------|-------|
| **Build command** | `npm run build` |
| **Build output directory** | `_site` |
| **Node.js version** | 18 (set via environment variable `NODE_VERSION=18`) |

### Connecting Your Domain

1. **Add custom domain** in Cloudflare Pages project settings
2. **Add `rctv19.com`** as the primary domain
3. **Add `www.rctv19.com`** and set up redirect to apex domain
4. **DNS Configuration**:
   - If using Cloudflare DNS: Pages will add records automatically
   - If external DNS: Add CNAME record pointing to `*.pages.dev`

### Automatic Deployments

- Pushes to `main` branch trigger automatic builds and deployments
- Preview deployments are created for pull requests

---

## 📺 Watch Live Configuration

### Updating the Stream URL

The Watch Live URL is configured in `src/_data/site.json`:

```json
{
  "watchLiveUrl": "https://player.frontlayer.com/live/fl238965"
}
```

To change the stream URL:

1. **Option A - Via CMS**: Go to `/admin` → Site Settings → Watch Live URL
2. **Option B - Direct edit**: Modify `src/_data/site.json`

### Watch Live Badge

The badge image is located at `src/assets/img/watch-live-badge.png`. To update:

1. Replace the file with your new badge
2. Maintain the same filename or update references in templates

---

## 💰 Advertising Setup

### Google AdSense Integration

1. **Get your Publisher ID** from [Google AdSense](https://www.google.com/adsense/)

2. **Update `src/_data/ads.json`**:
   ```json
   {
     "adsensePublisherId": "ca-pub-YOUR_PUBLISHER_ID",
     "sidebar1": {
       "type": "adsense",
       "enabled": true,
       "slot": "YOUR_AD_SLOT_ID"
     }
   }
   ```

3. **Uncomment AdSense code** in `src/_includes/components/ad-slot.njk`:
   - Find the commented AdSense script section
   - Uncomment to activate ads

### Local Sponsor Ads

Sponsor ads are configured in `src/_data/ads.json`:

```json
{
  "topBanner": {
    "type": "sponsor",
    "enabled": true,
    "image": "/assets/img/sponsors/my-sponsor.jpg",
    "link": "https://sponsor-website.com",
    "alt": "Sponsor Name - Description",
    "label": "Sponsored"
  }
}
```

**To add/edit sponsors:**

1. **Option A - Via CMS**: Go to `/admin` → Advertising
2. **Option B - Direct edit**: Modify `src/_data/ads.json`

**Adding sponsor images:**
1. Add image files to `src/assets/img/sponsors/`
2. Recommended sizes:
   - Banner: 728x90 pixels
   - Rectangle: 300x250 pixels

---

## 📝 Content Management (Pages CMS)

The site includes [Pages CMS](https://pagescms.org/) for browser-based content editing.

### Setup Steps

1. **Create a GitHub OAuth App**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in:
     - **Application name**: RCTV19 CMS
     - **Homepage URL**: `https://rctv19.com`
     - **Authorization callback URL**: `https://rctv19.com/admin/`
   - Save your **Client ID** and **Client Secret**

2. **Configure Pages CMS**:
   - Edit `public/admin/index.html`
   - Update `owner` and `repo` values:
     ```javascript
     owner: 'YOUR_GITHUB_USERNAME',
     repo: 'rctv19-website',
     ```

3. **Access the CMS**:
   - Navigate to `https://rctv19.com/admin/`
   - Authorize with GitHub
   - Edit content directly in your browser

### What You Can Edit

| Section | Description |
|---------|-------------|
| **Blog Posts** | Create, edit, delete news articles |
| **Site Pages** | About, Contact, Privacy pages |
| **Advertising** | Sponsor ads and AdSense configuration |
| **Site Settings** | Title, description, Watch Live URL |

### Content Workflow

1. Make edits in the CMS
2. Changes are committed directly to your GitHub repo
3. Cloudflare Pages automatically rebuilds and deploys
4. Live in ~1-2 minutes

---

## 📁 Project Structure

```
rctv19-website/
├── src/
│   ├── _data/           # Site data (JSON files)
│   │   ├── site.json    # Site configuration
│   │   └── ads.json     # Advertising configuration
│   ├── _includes/
│   │   ├── layouts/     # Page layouts
│   │   └── components/  # Reusable components
│   ├── assets/
│   │   ├── css/         # Stylesheets
│   │   ├── js/          # JavaScript
│   │   └── img/         # Images and media
│   ├── blog/            # Blog posts (Markdown)
│   ├── pages/           # Static pages
│   ├── index.njk        # Home page
│   ├── blog.njk         # Blog listing
│   ├── feed.njk         # RSS feed
│   └── sitemap.njk      # XML sitemap
├── public/
│   └── admin/           # Pages CMS
├── .eleventy.js         # Eleventy configuration
├── package.json         # Dependencies
└── README.md            # This file
```

---

## ✏️ Creating Content

### Adding a Blog Post

1. Create a new `.md` file in `src/blog/` with format:
   ```
   YYYY-MM-DD-post-slug.md
   ```

2. Add front matter:
   ```markdown
   ---
   title: "Your Post Title"
   date: 2026-01-15
   excerpt: "Brief summary of the post"
   featuredImage: "/assets/img/posts/your-image.jpg"
   ---
   
   Your post content here...
   ```

3. Commit and push to deploy

### Adding Images

1. Place images in `src/assets/img/posts/`
2. Reference in front matter: `/assets/img/posts/filename.jpg`
3. Images are automatically lazy-loaded

---

## 🎨 Customization

### Brand Colors

Edit CSS variables in `src/assets/css/main.css`:

```css
:root {
  --rctv-blue: #203090;
  --rctv-yellow: #F0D000;
  --white: #FFFFFF;
}
```

### Navigation

Edit navigation items in `src/_data/site.json`:

```json
{
  "navigation": [
    { "label": "Home", "url": "/" },
    { "label": "Blog", "url": "/blog/" },
    { "label": "Watch Live", "url": "/watch-live/", "highlight": true }
  ]
}
```

---

## 🔍 SEO Features

- **Meta tags**: Automatic title and description
- **Open Graph**: Facebook/social sharing optimization
- **Twitter Cards**: Twitter sharing optimization
- **Canonical URLs**: Proper URL handling
- **RSS Feed**: Available at `/feed.xml`
- **Sitemap**: Available at `/sitemap.xml`

---

## ♿ Accessibility

- Semantic HTML structure
- Skip navigation link
- Keyboard focus indicators
- ARIA labels where appropriate
- Good color contrast ratios

---

## 📞 Support

For technical issues:
- Email: support@rctv19.com
- Check the [Eleventy documentation](https://www.11ty.dev/docs/)
- Check the [Pages CMS documentation](https://pagescms.org/docs)

---

## 📄 License

MIT License - See LICENSE file for details.

---

*Built with ❤️ for the Ripley community*
