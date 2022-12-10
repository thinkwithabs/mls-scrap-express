const express = require('express');
const app = express();
app.use(express.json());
const fs = require('fs');
const axios = require('axios');

const cors = require('cors');

const corsOption = {
  origin: ['http://localhost:5173'],
};
app.use(cors(corsOption));
//if you want in every domain then
app.use(cors());

//morgan logger
const morgan = require('morgan');
app.use(morgan('tiny'));

//check API health
app.get('/health', (_req, res) => {
  res.status(200).json({ message: 'ok' });
});

//get all listings
app.get('/listing', (req, res) => {
  let page = 1;
  let limit = 20;
  if (req.query.page) {
    page = req.query.page;
  }
  if (req.query.limit) {
    limit = req.query.limit;
  }
  let offset = (page - 1) * limit;
  let lastIndex = offset + limit;

  const token = '38e0a05020fd4fdf29430a851686d691dca9f957';

  const tenDaysInMs = 864000000;
  let timestampNow = new Date().getTime();
  const stats = fs.statSync('./listing.json');

  if (stats && timestampNow < stats.mtimeMs + tenDaysInMs) {
    // read file
    let rawdata = fs.readFileSync('./listing.json');
    let listings = JSON.parse(rawdata);
    res.status(200).json(listings.value.slice(offset, lastIndex));
  } else {
    console.log('fetching data...');
    axios
      .get(`https://api.mlsgrid.com/v2/Property?$expand=Media`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        data = JSON.stringify(response.data, null, 2);
        fs.writeFileSync('listing.json', data);
        res.status(200).json(response.data.value.slice(offset, lastIndex));
      })
      .catch((err) => console.log(err));
  }
});

//get single listing
app.get('/listing/:listingId', (req, res) => {
  let rawdata = fs.readFileSync('./listing.json');
  let listings = JSON.parse(rawdata);
  res
    .status(200)
    .json(listings.value.find((el) => el.ListingId === req.params.listingId));
});

// erro handling
//we need to put this code at last,this code run when there is no route match
app.all('*', (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 404;
  err.statusCode = 404;
  next(err);
});
//when we use next(err) it will go to error handling middleware and it will catch error and send response.
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
