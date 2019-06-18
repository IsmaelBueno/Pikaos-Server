var express = require('express');
var router = express.Router();
var authentication = require("../authentication");
var db = require('../db');
var errors = require('../errors');
const path = require('path');
const fs = require('fs');


//Respuestas
//Entrada: token
//200: Datos del usuario
router.get('/',function(req,res){
  try{

    var token = req.headers.authorization;

    if(token==null)
      res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
    else{
      var userID = authentication.decodeToken(token);

      db.query("select status,avatar from user where id = ?",[userID],(err,resQuery)=>{
        res.status(200).send(resQuery[0]);
      });
    }

  }catch(e){
    errors.registerError(e);
    res.status(500).send({message: "Error inesperado"});
  }


});

//Respuestas
//Entrada: token, nuevo estado
//200: Todo OK
router.post('/status',(req,res)=>{
  try{

    var token = req.headers.authorization;

    if(token==null)
      res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
    else{
      var userID = authentication.decodeToken(token);
      var status = req.body.status;

      if(status==""){
        status=null;
      }

      db.query("UPDATE user SET status = ? WHERE id = ?",[status,userID],(err,response)=>{
        res.status(200).send();
      });
    }

  }catch(e){
    errors.registerError(e);
    res.status(500).send({message: "Error inesperado"});
  }
});

//Respuestas
//Entrada: token, contraseña actual y nueva contraseña
//200: contraseña cambiada
//401: Contraseña actual incorrecta
router.post('/password',(req,res)=>{
  try{
    var token = req.headers.authorization;

    if(token==null)
      res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
    else{
      var userID = authentication.decodeToken(token);
      var actualPassword = req.body.actualPassword;
      var newPassword = req.body.newPassword;

      db.query("SELECT * from user where password = ? AND id = ?",[actualPassword,userID],(error,result)=>{
        if(result.length!=1)
          res.status(401).send();
        else{
          db.query("UPDATE user SET password = ? WHERE id = ?",[newPassword,userID],(err,result)=>{
            res.status(200).send();
          });
        }
      }); 
    }
  }catch(e){
    errors.registerError(e);
    res.status(500).send({message: "Error inesperado"});
  }

});

//Entrada: token, nueva url del avatar
//200: Todo OK
router.post('/avatar',(req,res)=>{
  try{
    var token = req.headers.authorization;

    if(token==null)
      res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
    else{
      var userID = authentication.decodeToken(token);
      var avatar = req.body.avatar;

      db.query("UPDATE user SET avatar = ? WHERE id = ?",[avatar,userID],(err,result)=>{
        if(err)
          console.log(err);
        res.status(200).send();
      });
    }
  }catch(e){
    errors.registerError(e);
    res.status(500).send({message: "Error inesperado"});
  }
});


//Entrada: Nada
//Repuestas:
//200: Un JSON con la URL de todos los avatares del servidor
router.get('/avatars',(req,res)=>{

  const imagesFolder = '/var/www/html/images/';

  fs.readdir(imagesFolder, (err, files) => {
    var response = []

    files.forEach(file => {
      response.push("http://157.230.114.223/images/"+file);
    });

    res.status(200).send(response);
  });
});

module.exports = router;
