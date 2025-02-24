const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

var app = express();

// view engine setup (Handlebars)
app.engine(
  '.hbs',
  engine({
    defaultLayout: 'main',
    extname: '.hbs',
  })
);
app.set('view engine', '.hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({}));

/**
 * Home route
 */
app.get('/', function (req, res) {
  res.render('index');
});

/**
 * Checkout route
 */
app.get('/checkout', async function (req, res) {
  // Just hardcoding amounts here to avoid using a database
  const item = req.query.item;
  let title, amount, error;

  switch (item) {
    case '1':
      title = 'The Art of Doing Science and Engineering';
      amount = 2300;
      break;
    case '2':
      title = 'The Making of Prince of Persia: Journals 1985-1993';
      amount = 2500;
      break;
    case '3':
      title = 'Working in Public: The Making and Maintenance of Open Source';
      amount = 2800;
      break;
    default:
      // Included in layout view, feel free to assign error
      error = 'No item selected';
      break;
  }

  // Create the PaymentIntent with an amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Send to the frontend the client_secret to display the Payment Element component and
  // stripe_publisable_key to initialise the Stripe SDK
  res.render('checkout', {
    title: title,
    amount: amount,
    error: error,
    client_secret: paymentIntent.client_secret,
    stripe_publisable_key: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

/**
 * Success route
 */
app.get('/success', function (req, res) {
  // Send to the frontend the stripe_publisable_key to initialise the Stripe SDK
  res.render('success', {
    stripe_publisable_key: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

/**
 * Start server
 */
app.listen(3000, () => {
  console.log('Getting served on port 3000');
});
