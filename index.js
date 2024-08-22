const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');
const { format } = require('date-fns');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .trim(); // Trim leading and trailing -
};

const parseXML = async (url) => {
  const response = await axios.get(url);
  const parser = new xml2js.Parser({ explicitArray: false });
  const feed = await parser.parseStringPromise(response.data);

  return feed.rss.channel.item.map((item) => {
    const $ = cheerio.load(item['content:encoded'] || item.description || '');
    const imageUrl = $('img').first().attr('src');
    item.image = imageUrl || 'default-image-url.jpg'; 

    let description = $('p').first().text();
    if (!description) {
      description = $('h1').first().text();
    }
    item.description = description.split('.').slice(0, 2).join('.') + '...';
    const date = new Date(item.pubDate);
    item.formattedDate = format(date, 'dd MMM, yyyy');
    item.slug = slugify(item.title); // Create a slug from the title

    return item;
  });
};

app.get('/api/rss', async (req, res) => {
  try {
    const feedUrls = [
      'https://medium.com/feed/@shahbishwa21', 
      'https://medium.com/feed/@rohanshakya254'
    ];

    const feeds = await Promise.all(feedUrls.map(parseXML));
    const mergedFeeds = feeds.flat(); // Flatten the array if you have multiple feed sources
    res.json(mergedFeeds);
  } catch (error) {
    console.error('Error fetching or parsing feed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const feedUrls = [
      'https://medium.com/feed/@shahbishwa21', 
      'https://medium.com/feed/@rohanshakya254'
    ];

    const feeds = await Promise.all(feedUrls.map(parseXML));
    const mergedFeeds = feeds.flat();

    const blog = mergedFeeds.find(item => item.slug === slug);

    if (blog) {
      res.json(blog);
    } else {
      res.status(404).json({ error: 'Blog not found' });
    }
  } catch (error) {
    console.error('Error fetching or parsing feed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
