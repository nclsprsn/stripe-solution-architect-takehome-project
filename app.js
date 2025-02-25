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
app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);

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
 * Expose a endpoint as a webhook handler for asynchronous events.
 * Configure your webhook in the stripe developer dashboard
 * https://dashboard.stripe.com/test/webhooks
 */
app.post('/webhook', async function (req, res) {
  let data, eventType;

  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // we can retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  if (eventType === 'payment_intent.succeeded') {
    // Funds have been captured
    // Fulfill any orders, e-mail receipts, etc
    // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds)
    console.log('💰 Payment captured!');
  } else if (eventType === 'payment_intent.payment_failed') {
    console.log('❌ Payment failed.');
  }

  // Return a 200 response to acknowledge receipt of the event
  res.sendStatus(200);
});

/**
 * Start server
 */
app.listen(3000, () => {
  console.log('Getting served on port 3000');
});
