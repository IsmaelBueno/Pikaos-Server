var express = require('express');
var router = express.Router();
var db = require('../db');
var errors = require("../errors");
var registerEmail = require("../email");
var authentication = require("../authentication");


//Respuestas
//200: Registro con éxito
//409: Correo o usuario ya existentes
router.post('/', function (req, res) {
    try{
        var user = req.body.user;
        var password = req.body.password;
        var email = req.body.email;

        if(user==null || password==null || email==null)
            res.status(403).send({message: "Parámetros incorrectos"});
        else{

            db.query("SELECT * from user where name = ? || email = ?",[user,email],(error,result)=>{
                if(result.length!=0)
                    res.status(409).send("-1");
                else{                   
                    registerEmail.sendRegisterMail(email,user);
                    
                    db.query("INSERT INTO user VALUES (0,?,?,?,NULL,NULL,0,NULL);",[user,email,password],(error,result)=>{                        
                        res.status(200).send("0");
                    });
                }
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});

router.get('/validate/:token',function(req,res){
    try{
        var email = authentication.decodeToken(req.params.token);

        db.query("update user set email_verified = 1 where email = ?",[email],function(error,response){
            if(response.affectedRows==1){
                res.status(200).render('validateEmail');
            }else{
                res.status(404).render('error');
            }
        });

    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }

});

module.exports = router;