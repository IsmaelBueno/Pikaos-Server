var express = require('express');
var router = express.Router();
var authentication = require("../authentication");
var db = require('../db');
var errors = require('../errors');

//Entrada: token y usuario amigo objetivo
//200: Develve todas las peticiones de amistad del usuario
//409: No es un usuario amigo
router.post('/',function(req,res){
    try{
        var token = req.headers.authorization;
        var targetUserId = req.body.user;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userid = authentication.decodeToken(token);
            
            db.query("select chat from friend where (userOne = ? AND userTwo = ?) OR (userTwo = ? AND userOne = ?)",[userid,targetUserId,userid,targetUserId],
            (err,resultSearch)=>{
                if(resultSearch.length == 0)
                    res.status(409).send({});
                else{
                    db.query("select m.Chour,m.Cdate,m.text,u.name as Cfrom from message m join user u on m.Cfrom = u.id where chat= ? order by idMessage",
                    [resultSearch[0].chat],(err,resultMessages)=>{
                        res.status(200).send(resultMessages);
                    });
                }
            });
        }
    }catch(e){
      errors.registerError(e);
      res.status(500).send({message: "Error inesperado"});
    }
});

module.exports = router;