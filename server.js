const express = require('express');
const bodyparser = require('body-parser');
const bcrypt = require('bcrypt-nodejs'); // for storing passwords securely
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      port : 5432,
      user : 'postgres',
      password : 'test',
      database : 'face-recognition'
    }
  });


const app = express();
app.use(bodyparser.json())
app.use(cors());



app.get('/', (req, res) =>{

    db('users').select('*').then(data => res.json(data));

      
})

app.post('/signin', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    db('users').select('*').where({email: email})
    .then(user => {
        if(user.length){
            const profile = user[0];
            db('login').select('*').where({email: email})
            .then(user => {
                if(bcrypt.compareSync(password, user[0].hash)) res.json(profile)
                else res.status(400).json('invalid')
            })
        }
        else res.status(400).json('invalid')
    }).catch(err => console.log(err));


})

app.post('/register', (req, res) => {
    const {email, name, password} = req.body;
    const hash = bcrypt.hashSync(password);

    if(!email || !password || !name) {
        res.status(400).json('Incorrect submission');
        return;
    }

    db.transaction(trx => {    // read about transactions: https://knexjs.org/guide/query-builder.html#transacting
        trx('login').insert({
            email: email,
            hash: hash
        }).returning('email')
        .then(loginEmail => {
            return trx('users').returning('*')
            .insert({
                name: name,
                email: loginEmail[0].email,
                joined: new Date()
            })
            .then(user => res.json(user[0]))
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('Unable to register'));

})

app.get('/profile/:id', (req, res) => {
    const id = req.params.id;
    db('users')
    .select('*').where({id: id})
    .then(user => {
        if(user.length ) res.json(user[0])
        else  res.status(400).json('No such user...')  
    })
    .catch(err => console.log(err));
})


app.put('/image', (req, res) => {
    let id = req.body.id

    db('users').returning('*').where({id: id}).increment({entries: 1})
    .then(data => res.json(Number(data[0].entries)))
    .catch(err => console.log(err));
    
})


app.listen(3000, () => {
    console.log('App is running on localHost:3000')
});


