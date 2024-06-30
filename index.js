const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors())

const userSchema = new mongoose.Schema({
  username: String
})

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  duration: Number,
  date: Date
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", (req, res) => {
  const newUser = new User({ username: req.body.username });

  newUser.save()
    .then((savedUser) => {
      res.json({ username: savedUser.username, _id: savedUser._id });
    })
    .catch((err) => {
      console.error('Error saving user:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

app.get("/api/users", (req, res) => {
  User.find({})
    .then(users => res.json(users))
    .catch(err => res.status(500).json({ error: 'Internal server error' }));
});

app.post("/api/users/:_id/exercises", (req, res) => {
  User.findById(req.params._id)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const exercise = new Exercise({
        userId: req.params._id,
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: req.body.date ? new Date(req.body.date) : new Date()
      });

      return exercise.save()
        .then(savedExercise => {
          res.json({
            _id: savedExercise.userId,
            username: user.username,
            date: savedExercise.date.toDateString(),
            duration: savedExercise.duration,
            description: savedExercise.description
          });
        });
    })
    .catch(err => {
      console.error('Error saving exercise:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

app.get("/api/users/:_id/logs", (req, res) => {
  const { from, to, limit } = req.query;

  User.findById(req.params._id)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let query = { userId: req.params._id };
      if (from || to) {
        query.date = {};
        if (from) {
          query.date.$gte = new Date(from);
        }
        if (to) {
          query.date.$lte = new Date(to);
        }
      }

      Exercise.find(query).limit(parseInt(limit) || 0)
        .then(exercises => {
          res.json({
            _id: user._id,
            username: user.uname,
            count: exercises.length,
            log: exercises.map(ex => ({
              description: ex.description,
              duration: ex.duration,
              date: ex.date.toDateString()
            }))
          });
        });
    })
    .catch(err => {
      console.error('Error fetching logs:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
