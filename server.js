const mongoose = require('mongoose');
const express = require('express');
const puppeteer = require('puppeteer');
const Stripe = require('stripe');
const stripe = Stripe('YOUR_STRIPE_SECRET_KEY'); // Replace with your key

mongoose.set('strictQuery', false);

const MONGO_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Prevent duplicate connection attempt
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    }

    const app = express();
    app.use(express.json());

    // 🛍️ Product search route using Puppeteer
    app.get('/search', async (req, res) => {
      const query = req.query.query;
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(`https://www.example.com/search?q=${query}`);

      const products = await page.evaluate(() => {
        let items = [];
        document.querySelectorAll('.product-item').forEach(item => {
          items.push({
            name: item.querySelector('.product-name')?.innerText || '',
            price: item.querySelector('.product-price')?.innerText || '',
            link: item.querySelector('a')?.href || '',
          });
        });
        return items;
      });

      await browser.close();
      res.json(products);
    });

    // 💳 Stripe checkout route
    app.post('/create-checkout-session', async (req, res) => {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: { name: 'Subscription Plan' },
              unit_amount: 500,
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
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
