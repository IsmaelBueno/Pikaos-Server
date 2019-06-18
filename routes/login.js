var express = require('express');
var router = express.Router();
var db = require('../db');
var authentication = require("../authentication");
var errors = require("../errors");


//Respuestas
//200: token y nombre del usuario
//401: Error en las credenciales
//400: email sin verificar
router.post('/', function (req, res) {

    try{
        var user = req.body.user;
        var password = req.body.password;

        if(user==null || password==null)
            res.status(403).send({message: "Se necesita un usuario y una contraseña"});
        else{

            db.query("SELECT id,email_verified,name,avatar,status from user where (name = ? OR email=?)  AND password=?",[user,user,password],(error,result)=>{
                if(result.length!=1)
                    res.status(401).send("-1");
                else{
                        //Comprobar que el usuario ha validado la cuenta
                        
                        //if(result[0].email_verified!=1)
                        //    res.status(400).send("-2");
                        //else{
                            //Generar token
                            var token =  authentication.createToken(result[0].id);
                            var name = result[0].name;

                            var response = {
                                token: token,
                                user: name,
                                avatar: result[0].avatar,
                                status: result[0].status
                            };

                            console.log("Login user: " + result[0].id)

                            res.status(200).send(response);
                        //}
                }
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});

module.exports = router;