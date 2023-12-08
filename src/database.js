const mongoose = require('mongoose');
require ('dotenv').config();

const url = process.env.MONGODB_URL;

mongoose.connect(url)
        .then( db=> console.log("Base de datos conectada"))
        .catch( err=> console.log(err));