const mongoose = require('mongoose');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION');
  console.log(err);
  console.log(err.name, err.message);
  process.exit(1);
});
// load env config
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

// load our express application
const app = require('./app');

// connect to mongodb
mongoose
  .connect('mongodb://localhost:27017', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connected!'));

const port = 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
