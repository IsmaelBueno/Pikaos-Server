var express = require('express');
var router = express.Router();
var authentication = require("../authentication");
var db = require('../db');
var errors = require('../errors');
var config = require('../config');
var fs = require('fs');
var multer, storage, path, crypto;
multer = require('multer')
path = require('path');
crypto = require('crypto');

//Entrada: token
//200: Develve los datos del equipo del usuario en caso de que los haya
//403: El usuario no tiene equipo
router.get('/',function(req,res){
    try{
        var token = req.headers.authorization;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userid = authentication.decodeToken(token);

            //Jugadores del equipo
            db.query("select u.name as player from team t join user u on u.team = t.id where u.team = (select team from user where id = ?)",[userid],
            (err,resPlayers)=>{
                //Datos del equpio
                db.query("select t.id,t.name,t.logo, (select name from user u2 where u2.id = t.captain) as captain from team t join user u on u.team = t.id where u.id = ?",[userid],
                (err,resTeam)=>{

                    if(resTeam.length!=0){

                        var Tplayers = []
                        for (let index = 0; index < resPlayers.length; index++)
                        Tplayers.push(resPlayers[index].player)

                        var team ={
                            id:resTeam[0].id,
                            name:resTeam[0].name,
                            logo:resTeam[0].logo,
                            captain:resTeam[0].captain,
                            players: Tplayers
                        }

                        res.status(200).send(team);
                    }else{
                        res.status(403).send("Este usuario aún no tiene team");
                    }
                });
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});


//MULTER / Lectura de imagenes
storage = multer.diskStorage({destination: '/var/www/html/logos/',filename: function(req, file, cb) {
    return crypto.pseudoRandomBytes(16, function(err, raw) {
      if (err) {
        return cb(err);
      }
      return cb(null, "" + (raw.toString('hex')) + (path.extname(file.originalname)));
    });
  }
});

//Entrada: token
//Respuesta codigo 200
//200: Develve los datos del equpo creado
//409: Ya existe un equipo con ese nombre
//422: Falta el parámetro "name" del equipo
router.post('/create',multer({storage: storage}).single('upload'),function(req,res){

    try{
        var token = req.headers.authorization;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userid = authentication.decodeToken(token);

            var name = req.body.nameTeam;
            var logo = req.file.filename;

            
            if(name==null)
                res.status(422).send({message: "Se necesita el parámetro name"});
            else{
                var nameTeamFixed = name.substr(1).slice(0, -1);//Fixeo porque por alguna razón se añaden comillas al principio y al final del string

                db.query("INSERT INTO team VALUES(0,?,?,?)",[nameTeamFixed,logo,userid],(err,resInsert)=>{
                    if(err!=null){
                        //Ya existe un equipo con el mismo nombre
                        res.status(409).send();
                    }
                    else{
                        var idTeam = resInsert.insertId
                        db.query("UPDATE user SET team = ? WHERE id = ?",[idTeam,userid],(err,resQ)=>{
                            res.status(200).send();
                        });
                    }
                });
            }
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});

//Entrada: token
//200: Todo OK
router.post('/leave',function(req,res){
    try{
        var token = req.headers.authorization;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userid = authentication.decodeToken(token);

            db.query("select id,captain from team where id = (select team from user where id = ?)",[userid],
            (err,resTeam)=>{
                var idTeam = resTeam[0].id;
                var captain = resTeam[0].captain;
                //Si es el captián deja el equipo se borra el equipo si no solo lo abandona el jugador
                if(captain == userid){
                    db.query("DELETE FROM team where id = ?",[idTeam],(err,resDelete)=>{
                        
                        //db.query("UPDATE user set team = null where team = ?",[idTeam],(err,resUpdate)=>{
                            res.status(200).send("0");
                        //});
                    });
                }else{
                    db.query("UPDATE user set team = null where id = ?",[userid],(err,resUpdate)=>{
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

/*

//Entrada token
//200: Imagen del logo del equipo del usuario
router.get('/logo', function (req, res){

    try{
        var token = req.headers.authorization;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userid = authentication.decodeToken(token);
            db.query("SELECT logo FROM team WHERE id = (SELECT team FROM user WHERE id = ?",[userid],(err,resQ)=>{
                var file = resQ[0].logo;
                var img = fs.readFileSync(__dirname + "/../logos/" + file);
                res.writeHead(200, {'Content-Type': 'image/png' });
                res.send(img, 'binary');
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});

*/



//Entrada: token
//200: Las invitaciones a equipo del usuario
router.get('/requests',function(req,res){
    try{
        var token = req.headers.authorization;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userid = authentication.decodeToken(token);

            db.query("select id, name, logo from team where id = (select team from team_request where user = ?)",[userid],(err,result)=>{
                res.status(200).send(result);
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});

//Entrada: token, nombre del usuario invitado al equipo
//200: todo OK
//428: El equipo ya cuenta con el máximo de jugadores
//402: El usuario invitado no existe
//409: El usuario ya cuenta con una invitación
router.post('/invite',function(req,res){
    try{
        var token = req.headers.authorization;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userid = authentication.decodeToken(token);
            var userTarget = req.body.user;

            db.query("select count(*) as total from user where team in (select team from user where id=?)",[userid],
            function(err,resPlayers){
                var total = resPlayers[0].total;
                if(total>=config.MAXPLAYERSTEAMS){
                    res.status(428).send();
                }else{

                    db.query("SELECT id FROM user WHERE name = ?",[userTarget],(err,resQ)=>{

                        if(resQ.length==0){
                            res.status(402).send();
                        }else{
                            var userTargetId = resQ[0].id;

                            db.query('insert into team_request values((select team from user where id = ?),?)',[userid,userTargetId],
                            function(err,resTeamRequest){

                                //Problemas con las primary key, es decir, el usuario ya cuenta con una invitación a este equipo
                                if(err)
                                    res.status(409).send();
                                else
                                    res.status(200).send();
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

//Entrada token, id del equipo
//200: todo OK
//428: El usuario ya cuenta con un equipo, no puedo aceptar la invitación
router.post('/request_accept',function(req,res){
    try{
        var token = req.headers.authorization;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userid = authentication.decodeToken(token);
            var teamID = req.body.idTeam;

            db.query("SELECT team FROM user WHERE id = ?",[userid],function(err,resTeam){
                if(resTeam[0].team==null){
                    db.query("UPDATE user SET team = ? WHERE id = ?",[teamID,userid],(req,response)=>{
                        db.query("DELETE FROM team_request WHERE team=? AND user=?",[teamID,userid],(req,response)=>{
                            res.status(200).send("Petición aceptada con éxito");
                        });
                    });
                    
                }else{
                    res.status(428).send("El usuario ya tiene equipo");
                }
            })
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});

//Entrada token, id del equipo
//200: todo OK
router.post('/request_denied',function(req,res){
    try{
        var token = req.headers.authorization;

        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            db.query("DELETE FROM team_request WHERE team=? AND user=?",[teamID,userid],(req,response)=>{
                res.status(200).send("Petición rechazada con éxito");
            });
        }
        }catch(e){
            errors.registerError(e);
            res.status(500).send({message: "Error inesperado"});
        }
});

module.exports = router;