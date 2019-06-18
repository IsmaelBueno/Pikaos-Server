var express = require('express');
var router = express.Router();
var db = require('../db');
var errors = require("../errors");
var email = require("../email");

//Petición para que los usuarios propongan videojuegos.
//Entrada videogame y description
//200: Todo ok
router.post('/proposal',(req,res)=>{
    var videogame = req.body.videogame;
    var description = req.body.description;

    email.videogameProposal(videogame,description);
    res.status(200).send("Propuesta mandada con éxito");
});

router.get('/',(req,res)=>{
    db.query("select id,title from videogame order by title",(error,videogames)=>{
        res.status(200).send(videogames);
    });
});

router.get('/individual',(req,res)=>{
    db.query("select id,title from videogame where individual = 1 order by title",(error,videogames)=>{
        res.status(200).send(videogames);
    });
});

router.get('/team',(req,res)=>{
    db.query("select id,title from videogame where teams = 1 order by title",(error,videogames)=>{
        res.status(200).send(videogames);
    });
});

module.exports = router;