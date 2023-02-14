const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const LocalStorage = require('node-localstorage').LocalStorage;
const localStorage = new LocalStorage('./localStorage');
require('dotenv').config();

// Basic configuration
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const generateRandomString = (length) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}

app.post("/api/users", function(req, res) {

  let users = JSON.parse(localStorage.getItem("users")) || {};

  const userName = req.body.username;
  const randomString = generateRandomString(24);

  // Check if username already exists in the users object;
  // if it already exists in the users object, ...
  if (users.hasOwnProperty(userName)) {
    let count = users[userName]['count'];
    count = count + 1;
    users[userName]['count'] = count;

    localStorage.setItem("users", JSON.stringify(users));

    return res.json({
      "username": userName,
      "_id": users[userName]["_id"]
    }).end()
  }

  // If username does not exist in the object, key it into an object with the randomstring as its property, save it to localstorage, and return both. 
  let newUser = {};
  newUser["_id"] = randomString;
  newUser['count'] = 1;
  newUser['log'] = [];

  users[userName] = newUser;
  localStorage.setItem("users", JSON.stringify(users));

  return res.json({
    "username": userName,
    "_id": randomString
  }).end()

})

app.post("/api/users/:_id/exercises", (req, res) => {
  // Get the users object from local storage, or create an empty object if none exists in local storage.
  const users = JSON.parse(localStorage.getItem("users")) || {}
  // Get all the provided data from the request body method.
  const { description, duration } = req.body;
  // Get the request id from the request params method
  const { _id } = req.params;
  // if an id is not provided by the client
  if (!_id) {
    return res.status(404).send("_id not provided. Please provide an id");
  }
  // if an id is provided by the client
  const name = Object.keys(users).find(key => users[key]["_id"] === _id);
  // If the provided id does not already exist in the users object, ...
  if (!name) {
    return res.status(404).send("Invalid _id provided");
  }

  // if it exists, get the object attached to the name
  let userObj = users[name];
  // get the logs array from the user object and create an empty log object
  let logs = userObj['log'];
  let logObject = {};
  // if the provided duration is not a valid number
  if (isNaN(duration) == true) {
    return res.status(404).send("Invalid duration provided");
  }
  // save duration and description to the object
  logObject["description"] = description;
  logObject["duration"] = Number(duration);
  // get the date
  const date = req.body.date;

  // if the date is not provided by the client, use the current date
  if (!date) {
    let dateRes = new Date();
    logObject['date'] = dateRes.toDateString();
    logs.push(logObject);

    userObj['log'] = logs;
    users[name] = userObj;
    localStorage.setItem("users", JSON.stringify(users));

    return res.json({
      "_id": userObj["_id"],
      "username": name,
      "date": dateRes.toDateString(),
      "duration": Number(duration),
      "description": description
    }).end()
  }

  // if the date is provided by the client
  let dateRes = new Date(date);
  // if the provided date is invalid
  if (dateRes == "Invalid Date") {
    return res.status(404).send("Invalid date provided");
  }

  logObject['date'] = dateRes.toDateString();
  logs.push(logObject);

  userObj['log'] = logs;
  users[name] = userObj;
  localStorage.setItem("users", JSON.stringify(users));

  return res.json({
    "_id": userObj["_id"],
    "username": name,
    "date": dateRes.toDateString(),
    "duration": Number(duration),
    "description": description
  }).end()

})

app.get("/api/users", (req, res) => {
  // First, get the user object from local storage
  const users = JSON.parse(localStorage.getItem("users")) || {};
  // Initialize the result array and get the array of keys from the newUser object
  let result = [];
  const keys = Object.keys(users);
  // For each key in the keys object, get the corresponding property from the users object, create an object containing key and _id property, and place it in the initialized result array. Do this for all the keys, and return the populated result array.
  for (let key in keys) {
    let momKey = keys[key];
    let newObj = {};
    newObj["username"] = momKey;
    newObj["_id"] = users[momKey]['_id'];
    result.push(newObj);
  }

  res.send(result).end();
})

app.get("/api/users/:_id/logs", (req, res) => {
  // First, get the user object from local storage and get the _id from the request params object.
  const users = JSON.parse(localStorage.getItem("users")) || {};
  const { _id } = req.params;
  
  // Get the corresponding username to the _id provided, the count and the log array.
  const user = Object.keys(users).find(key => users[key]['_id'] === _id);
  const count = users[user]['count'];
  const userLog = users[user]['log'];
  
  // Get the provided from, to, and limit parameters provided, and initialize an empty result array.
  let from = new Date(req.query.from);
  let to = new Date(req.query.to);
  let limit = parseInt(req.query.limit);
  let result = [];
  
  // If from and to are valid dates, ...
  if (from != "Invalid Date" && to != "Invalid Date") {    
    for (log in userLog) {
      if (new Date(userLog[log]['date']) >= from && new Date(userLog[log]['date']) <= to) {
        result.push(userLog[log]);
      }
    }
    
    // If the provided limit is valid, ...
    if (limit) {
      return res.json({
        "username": user,
        "count": count,
        "_id": _id,
        "log": result.splice(0, limit)
      }).end()
    }
    // If the provided limit is not valid, ...
    return res.json({
      "username": user,
      "count": count,
      "_id": _id,
      "log": result
    }).end()
  }
  // If from and to are invalid dates, ...
  // If the provided limit is valid, ...
  if (limit) {
    return res.json({
      "username": user,
      "count": count,
      "_id": _id,
      "log": userLog.splice(0, limit)
    }).end()
  }
  
  // If the provided limit is not valid, ...
  return res.json({
    "username": user,
    "count": count,
    "_id": _id,
    "log": userLog
  }).end()
  
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
