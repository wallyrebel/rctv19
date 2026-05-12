const Parser = require('rss-parser');
const Anthropic = require('@anthropic-ai/sdk');
const slugify = require('slugify');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const parser = new Parser({
  customFields: {
    item: ['media:content', 'enclosure', 'content:encoded']
  }
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FEEDS = [
  'https://tippahsports.com/feed/',
  'https://fetchrss.com/feed/1vcaujD2G3c21vdUps9A70IP.rss'
];

const PROCESSED_LOG = path.join(__dirname, 'processed_items.json');
const BLOG_DIR = path.join(__dirname, '../src/blog');
const IMG_DIR = path.join(__dirname, '../src/assets/img/posts');

async function getProcessedItems() {
  try {
    const data = await fs.readFile(PROCESSED_LOG, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function saveProcessedItems(items) {
  await fs.writeFile(PROCESSED_LOG, JSON.stringify(items, null, 2));
}

function extractImageUrl(item) {
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  if (item['media:content'] && item['media:content'].$) {
    return item['media:content'].$.url;
  }
  
  const content = item['content:encoded'] || item.content || item.description || '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return null;
}

async function downloadImage(url, slug) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    // Determine extension from content-type or URL
    const contentType = response.headers.get('content-type');
    let ext = '.jpg';
    if (contentType) {
      if (contentType.includes('png')) ext = '.png';
      if (contentType.includes('gif')) ext = '.gif';
      if (contentType.includes('webp')) ext = '.webp';
    } else {
      const match = url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
      if (match) ext = `.${match[1].toLowerCase()}`;
    }

    const filename = `${slug}-${Date.now()}${ext}`;
    const filepath = path.join(IMG_DIR, filename);
    
    const buffer = await response.arrayBuffer();
    await fs.mkdir(IMG_DIR, { recursive: true });
    await fs.writeFile(filepath, Buffer.from(buffer));
    
    return `/assets/img/posts/${filename}`;
  } catch (error) {
    console.error('Error downloading image:', error.message);
    return null;
  }
}

async function rewriteArticle(item) {
  const contentToRewrite = `
Title: ${item.title}
Original Content: ${item['content:encoded'] || item.content || item.description || ''}
  `;

  const msg = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1500,
    temperature: 0.7,
    system: "You are a professional journalist. Rewrite the provided RSS feed item into a comprehensive news article. Return the result strictly as a JSON object with three keys: 'title' (a catchy headline), 'excerpt' (a 1-2 sentence summary), and 'article' (the rewritten article formatted in Markdown). Do not wrap the JSON in markdown backticks, return only the raw JSON.",
    messages: [
      {
        "role": "user",
        "content": contentToRewrite
      }
    ]
  });

  try {
    let jsonStr = msg.content[0].text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse Claude output as JSON. Raw output:', msg.content[0].text);
    throw new Error('Claude response was not valid JSON');
  }
}

function generateMarkdown(rewritten, localImgPath, date) {
  const formattedDate = date.toISOString().split('T')[0];
  let frontmatter = `---
title: "${rewritten.title.replace(/"/g, '\\"')}"
date: ${formattedDate}
excerpt: "${rewritten.excerpt.replace(/"/g, '\\"')}"
`;
  if (localImgPath) {
    frontmatter += `featuredImage: ${localImgPath}\n`;
  }
  frontmatter += `---\n\n${rewritten.article}\n`;
  return frontmatter;
}

async function main() {
  const processedItems = await getProcessedItems();
  let hasNewItems = false;

  for (const feedUrl of FEEDS) {
    try {
      console.log(`Fetching feed: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      
      // Process the first 3 items to avoid hitting rate limits if it's a new setup
      const itemsToProcess = feed.items.slice(0, 3);
      
      for (const item of itemsToProcess) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
        const now = new Date();
        const hoursDiff = (now.getTime() - pubDate.getTime()) / (1000 * 3600);
        
        const guid = item.guid || item.id || item.link || crypto.createHash('md5').update(item.title).digest('hex');
        
        if (processedItems.includes(guid)) {
          console.log(`Skipping already processed item: ${item.title}`);
          continue;
        }

        if (hoursDiff > 24) {
          console.log(`Skipping item older than 24 hours (${Math.round(hoursDiff)}h old): ${item.title}`);
          continue;
        }

        console.log(`Processing new item: ${item.title}`);
        
        // Rewrite
        const rewritten = await rewriteArticle(item);
        
        // Image handling
        let localImgPath = null;
        const imgUrl = extractImageUrl(item);
        const itemSlug = slugify(rewritten.title, { lower: true, strict: true }).substring(0, 50);
        
        if (imgUrl) {
          localImgPath = await downloadImage(imgUrl, itemSlug);
        }

        // Generate Markdown
        const markdown = generateMarkdown(rewritten, localImgPath, pubDate);
        
        // Save File
        const fileNameDate = pubDate.toISOString().split('T')[0];
        const fileName = `${fileNameDate}-${itemSlug}.md`;
        const filePath = path.join(BLOG_DIR, fileName);
        
        await fs.mkdir(BLOG_DIR, { recursive: true });
        await fs.writeFile(filePath, markdown);
        console.log(`Created post: ${filePath}`);
        
        // Mark as processed
        processedItems.push(guid);
        hasNewItems = true;
      }
    } catch (error) {
      console.error(`Error processing feed ${feedUrl}:`, error);
    }
  }

  if (hasNewItems) {
    await saveProcessedItems(processedItems);
    console.log('Finished processing all feeds. New items were added.');
  } else {
    console.log('No new items found.');
  }
}

main().catch(console.error);
