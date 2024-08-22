const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');
const { format } = require('date-fns');

const app = express();
const port = 3000;

const parseXML = async (url) => {
  const response = await axios.get(url);
  const parser = new xml2js.Parser({ explicitArray: false });
  const feed = await parser.parseStringPromise(response.data);

  feed.rss.channel.item.forEach((item) => {
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
  });

  return feed.rss.channel;
};

app.use('/public', express.static('public'));


app.get('/', async (req, res) => {
  const feedUrls = [
    'https://medium.com/feed/@shahbishwa21', 
    'https://medium.com/feed/@rohanshakya254'
  ];


  const feeds = await Promise.all(feedUrls.map(parseXML));
  res.render('index', { feeds });
});

app.set('view engine', 'ejs');


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
