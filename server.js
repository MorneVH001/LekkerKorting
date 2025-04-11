const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

const MONGO_URI = process.env.MONGODB_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

const express = require('express');
const puppeteer = require('puppeteer');
const Stripe = require('stripe');
const stripe = Stripe('YOUR_STRIPE_SECRET_KEY'); // Get this from the Stripe dashboard

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// MongoDB connection setup
mongoose.connect('YOUR_MONGODB_CONNECTION_STRING', { useNewUrlParser: true, useUnifiedTopology: true });

// Route to search for products
app.get('/search', async (req, res) => {
  const query = req.query.query;
  // Scraping logic here
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://www.example.com/search?q=${query}`);
  
  const products = await page.evaluate(() => {
    let items = [];
    document.querySelectorAll('.product-item').forEach(item => {
      items.push({
        name: item.querySelector('.product-name').innerText,
        price: item.querySelector('.product-price').innerText,
        link: item.querySelector('a').href,
      });
    });
    return items;
  });

  await browser.close();
  res.json(products);
});

// Stripe checkout endpoint
app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Subscription Plan',
          },
          unit_amount: 500, // Example price in cents (5€)
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${req.headers.origin}/success`,
    cancel_url: `${req.headers.origin}/cancel`,
  });
  res.json({ id: session.id });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
