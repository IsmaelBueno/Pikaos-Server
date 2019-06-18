var express = require('express');
var router = express.Router();
var authentication = require("../authentication");
var db = require('../db');
var errors = require('../errors');

//Entrada: token
//200: Devuelve los usuarios amigos del usuario
router.get('/', function(req,res){

    var token = req.headers.authorization;
      if(token==null)
        res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
      else{
  
      var userid = authentication.decodeToken(token);
  
        var querys = [];
  
        querys.push(new Promise(function(done, reject) {
          db.query("select u.id,u.name,u.status,u.avatar,f.chat from friend f join user u on f.userTwo = u.id where f.userOne = ?",
          [userid],(error,resFriends)=>{
            if(error!=null)
              reject(error);
            else
              done(resFriends);
          });
        }));
  
        querys.push(new Promise(function(done, reject) {
          db.query("select u.id,u.name,u.status,u.avatar,f.chat from friend f join user u on f.userOne = u.id where f.userTwo = ?",
          [userid],(error,resFriends)=>{
            if(error!=null)
              reject(error);
            else
              done(resFriends);
          });
        }));
  
        Promise.all(querys).then(result=>{
  
          var json;
          if(result.length>0) {
              
              json = result[0];
  
              for (let index = 1; index < result.length; index++) {
                  json = json.concat(result[index]);      
              }
          }else{
              json = [];
          }
  
          res.status(200).send(json);
  
        }).catch(reject=>{
          errors.registerError(reject);
          res.status(500).send({message: "Error inesperado"});
  
        });
      }
  });

//Entrada: token y nombre del usuario objetivo
//200: Todo Ok
//409: El usuario ya es amigo
//410: El usuario objetivo ya cuenta con una petición de este usuario o el usuario ya tiene una petición del usuario objetivo
//403: El usuario objetivo no existe
router.post('/request', function(req,res){
  try{
      var token = req.headers.authorization;
      var targetUserName = req.body.user;

      if(token==null)
          res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
      else{
  
          var userid = authentication.decodeToken(token);

          //Obtener id del usuario objetivo
          db.query("select id from user where name = ? AND id != ?",[targetUserName,userid],(error,id)=>{
              if(id.length==0){
                  res.status(403).send();
              }else{
                  var targetUserId = id[0].id;

                  //Comprobar que los usuarios ya no sean amigos
                  db.query("select * from friend where (userOne = ? AND userTwo = ?) OR (userTwo=? AND userOne = ?)",
                  [userid,targetUserId,userid,targetUserId],(error,checkFriends)=>{
                      if(checkFriends.length>0)
                          res.status(409).send();
                      else{
                          //Comprobar que no haya ninguna petición ya de alguno de los dos usuarios
                          db.query("select * from friend_request where (from_user = ? AND to_user = ?) OR (from_user=? AND to_user=?)",
                          [userid,targetUserId,targetUserId,userid],(error,checkFriendsRequests)=>{
                              if(checkFriendsRequests.length>0)
                                  res.status(410).send();
                              else{
                                  db.query("insert into friend_request values(?,?)",[userid,targetUserId],(error,done)=>{
                                      res.status(200).send();
                                  })
                              }
                          });
                      }
                  });
              }
          });
      }
  }catch(e){
      errors.registerError(e);
      res.status(500).send({message: "Error inesperado"});
  }
});

//Entrada: token
//200: Develve todas las peticiones de amistad del usuario
router.get('/request',function(req,res){
  try{
      var token = req.headers.authorization;
      if(token==null)
        res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
      else{
          var userid = authentication.decodeToken(token);
          
          db.query("select id, name,avatar from user where id in (select from_user from friend_request where to_user = ?)",[userid],
          function(error,resReqFriends){
              res.status(200).send(resReqFriends);
          });
      }
  }catch(e){
    errors.registerError(e);
    res.status(500).send({message: "Error inesperado"});
  }
});


//Entrada: token y id del usuario de la petición
//200: Todo Ok
router.post('/request_accept', function(req,res)
{
    try{

        var token = req.headers.authorization;
        var targetUserId = req.body.userID;

        if(token==null)
            res.status(403).send();
        else{

            var userid = authentication.decodeToken(token);

            db.query("insert into chat values(0)",function(err,result){
                var idChat  = result.insertId;

                db.query("insert into friend values(?,?,?)",[userid,targetUserId,idChat],(err,result)=>{

                    db.query("delete from friend_request where to_user = ? and from_user = ?",[userid,targetUserId],(err,result)=>{
                        res.status(200).send();
                    });
                });
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send();
    }
});

//Entrada: token y id del usuario de la petición
//200: Todo OK
router.post('/request_decline', function(req,res)
{
    try{

        var token = req.headers.authorization;
        var targetUserId = req.body.userID;

        if(token==null)
            res.status(403).send();
        else{

            var userid = authentication.decodeToken(token);

            db.query("delete from friend_request where to_user = ? and from_user = ?",[userid,targetUserId],(err,result)=>{
                res.status(200).send();
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send();
    }
});

//Entrada: token y id dle usuario para borrar
//200: Todo OK
router.post('/delete',function(req,res){
    try{

        var token = req.headers.authorization;
        var targetUserId = req.body.userID;

        if(token==null)
            res.status(403).send();
        else{
            var userid = authentication.decodeToken(token);
            db.query("delete from friend where (userOne = ? AND userTwo = ?) OR (userOne = ? AND userTwo = ?)",[userid,targetUserId,targetUserId,userid],
            (err,result)=>{
                res.status(200).send();
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send();
    }
})



module.exports = router;