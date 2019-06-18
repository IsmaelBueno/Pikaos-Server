var express = require('express');
var router = express.Router();
var db = require('../db');
var errors = require('../errors');
var authentication = require("../authentication");
var moment = require("moment");
var config = require("../config");


//Respuestas 200
//Parámetros entrada: indcup, indleague, teamleague y teamcup para filtrar que se quiere
//Todo Ok: Json con las competiciones disponibles
router.get('/', function (req, res) {

    try{
        var token = req.headers.authorization;
        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
        
            var userID = authentication.decodeToken(token);

            var querys =[];

            if(req.query.indcup!=null)
                querys.push(getIndividualCupsOpens(userID));
            if(req.query.indleague!=null)
                querys.push(getIndividualLeagueOpens(userID));
            if(req.query.teamcup!=null)
                querys.push(getTeamsCupsOpens(userID));
            if(req.query.teamleague!=null)
                querys.push(getTeamsLeagueOpens(userID));

            Promise.all(querys).then((result)=>{

                //Se discrimina si no se encontró ningún dato tanto si no lo hay como si se buscó nada y además
                //los datos encontrados se depuran un poco para que queden bien
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

            }).catch((rej)=>{
                errors.registerError(rej);
                res.status(500).send({message: "Error inesperado"});
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});

//Respuestas 200
//Todo ok: JSON con la competición creada.
//-1: Competición en equipo y el usuario no tene equipo.
//-2: Competición en equipo y el usuario no es capitán de su equipo.
//---------------------------------------------------------------------------------
//HAY QUE COMPROBAR QUE EL USUARIO TENGA UN LIMITE DE COMPETICIONES PARTICIPANDO
//Además metemos el equipo del admin como participante (Esto debería ir en el trigger como en las competiciones individuales, pero no tengo huevos)
router.post('/create',function(req,res){
    try{
        var token = req.headers.authorization;
   
        if(token==null)
          res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var name = req.body.name;
            var admin = authentication.decodeToken(token);
            var state = 'preparing';
            var description = req.body.description;
            var created = moment(new Date()).format("YYYY-MM-DD");
            var expire = moment(new Date()).add(config.COMPETITIONEXPIREDTIME, 'days').format("YYYY-MM-DD");
            var expired = 0;
            var videogame = req.body.videogame;
            var type = req.body.type;
            var isPrivate = req.body.isPrivate;
            var password = req.body.password;

            if(name==null || videogame==null || type==null || isPrivate==null)
                res.status(422).send({message: "Se necesitan los parámetros name, videogame, type y si es privada"});
            else{
                
                //Comprobar en caso de que se cree una competición en equipos de que el creador sea capitán de su equipo
                //Esta query devuelve todos los capitanes del equipo del usuario
                if(type=='team_cup' || type=='team_league'){

                    db.query("select captain from team where id = (select team from user where id = ?)",[admin],
                    (error,resCaptain)=>{
                        if(resCaptain.length==0){
                            //El usuario no tiene equipo
                            res.status(200).send("-1");
                        }else{

                            //Si es o no capitán de su equipo
                            if(resCaptain[0].captain != admin)
                                res.status(200).send("-2");
                            else{
                                db.query("SELECT id FROM videogame WHERE title LIKE ?",[videogame],(error,result)=>{
                                    var idVideogame = result[0].id;
                                    db.query("INSERT INTO competition VALUES(0,?,?,?,?,?,?,?,?,?,?,?)",[name,admin,state,description,created,expire,expired,idVideogame,type,isPrivate,password],
                                    (error,result)=>{        
                                        res.status(200).send("Competición creada con éxito");
                                    });
                                });
                            }
                        }
                    });
                }else{
                    //No es por equipo así que insertamos directamente la competición sin comprobar nada
                    db.query("SELECT id FROM videogame WHERE title LIKE ?",[videogame],(error,result)=>{
                        var idVideogame = result[0].id;
                        db.query("INSERT INTO competition VALUES(0,?,?,?,?,?,?,?,?)",[name,admin,state,description,created,expired,idVideogame,type],
                        (error,result)=>{
                            getCompetitionFromID(result.insertId).then((resultJson)=>{
                                res.status(200).send(resultJson);
                            }).catch((rej)=>{
                                errors.registerError(rej);
                            });
                        });
                    });
                }
            }
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});


//Respuestas 
//Parámetros entrada: idCompetición
//200: Unido a la competición con éxito
//409: La competición ya no se encuentra disponible para unirse, ya comenzó
//401: El usuario que pretende unirse a una competición de equpo no es admin de un equpo
router.post('/join',(req,res)=>{
    try{
        var token = req.headers.authorization;
        var idCompetition = req.body.competition;
   
        if(token==null || idCompetition == null)
          res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
            var userID = authentication.decodeToken(token);

            //Comprobar que la competicion aun sigue en estado preparandose
            db.query(" SELECT state, type FROM competition WHERE id = ?",[idCompetition],(err,resQ)=>{
                if(resQ[0].state!="preparing")
                    res.status(409).send("La competición ya no disponible para unirse");
                else{
                    switch(resQ[0].type){
                        case "ind_cup":
                            db.query("INSERT INTO ind_cup_participant values(?,?,0)",[idCompetition,userID],(err,resQ)=>{
                                res.status(200).send("Participante añadido con éxito");
                            });
                            break;
                        case "ind_league":
                            db.query("INSERT INTO ind_league_participant values(?,?,0)",[idCompetition,userID],(err,resQ)=>{
                                res.status(200).send("Participante añadido con éxito");
                            });
                            break;
                        case "team_cup":
                                db.query("select id,captain from team where id = (select team from user where id =?)",[userID],(err,resQTeam)=>{
                                    if(resQTeam[0].captain!=userID){
                                        res.status(401).send("El usuario no es capitán de un equipo");
                                    }else{
                                        db.query("INSERT INTO team_cup_participant values(?,?,0)",[idCompetition,resQTeam[0].team],(err,resQ)=>{
                                            res.status(200).send("Participante y su equipo añadido con éxito");
                                        });
                                    }
                                });
                            break;
                        case "team_league":
                                db.query("select id,captain from team where id = (select team from user where id =?)",[userID],(errr,resQTeam)=>{
                                    if(resQTeam[0].captain!=userID){
                                        res.status(401).send("El usuario no es capitán de un equipo");
                                    }else{
                                        db.query("INSERT INTO team_league_participant values(?,?,0)",[idCompetition,resQTeam[0].id],(err,resQ)=>{
                                            console.log(err);
                                            res.status(200).send("Participante y su equipo añadido con éxito");
                                        });
                                    }
                                });
                            break;
                    }              
                }
            });
        }
    }catch(e){
        errors.registerError(e);
        res.status(500).send({message: "Error inesperado"});
    }
});

//OPEN
function getIndividualCupsOpens (id){
    //SELECT c.id,c.name,u.name,c.created,v.title,c.type FROM ind_cup_participant ic join competition c join videogame v join user u ON c.admin = u.id AND c.videogame = v.id AND ic.cup = c.id WHERE c.state = 'preparing' AND NOT EXISTS (SELECT * FROM ind_cup_participant b where user = 3 AND ic.cup = b.cup) group by c.id;
    return new Promise(function(done,rej){
        db.query("SELECT c.id,c.name,u.name as admin,c.created,v.title as game,c.type, c.isPrivate FROM ind_cup_participant ic join competition c "+
        "join videogame v join user u ON c.admin = u.id AND c.videogame = v.id AND ic.cup = c.id WHERE "+
        "c.state = 'preparing' AND c.expired = '0' AND NOT EXISTS (SELECT * FROM ind_cup_participant b where user = ? AND ic.cup = b.cup) "+
        "group by c.id",[id],(error,result)=>{
            if(error!=null){
                console.log(error);
                rej(error);
            }else
                done(result);
        });
    });
};

function getIndividualLeagueOpens (id){
    //SELECT c.id,c.name,u.name,c.created,v.title,c.type FROM ind_league_participant ic join competition c join videogame v join user u ON c.admin = u.id AND c.videogame = v.id AND ic.league = c.id WHERE c.state = 'preparing' AND NOT EXISTS (SELECT * FROM ind_league_participant b where user = 3 AND ic.league = b.league) group by c.id;
    return new Promise(function(done,rej){
        db.query("SELECT c.id,c.name,u.name as admin,c.created,v.title as game,c.type, c.isPrivate FROM ind_league_participant ic join competition c "+
        "join videogame v join user u ON c.admin = u.id AND c.videogame = v.id AND ic.league = c.id WHERE "+
        "c.state = 'preparing' AND c.expired = '0' AND NOT EXISTS (SELECT * FROM ind_league_participant b where user = ? AND ic.league = b.league) "+
        "group by c.id",[id],(error,result)=>{
            if(error!=null){
                console.log(error);
                rej(error);
            }else
                done(result);
        });
    });
};

function getTeamsCupsOpens(id){
    //SELECT c.id,c.name,u.name,c.created,v.title,c.type FROM team_cup_participant ic join competition c join videogame v join user u ON c.admin = u.id AND c.videogame = v.id AND ic.cup = c.id WHERE c.state = 'preparing' AND NOT EXISTS (SELECT * FROM team_cup_participant b where team = 2 AND ic.cup = b.cup) group by c.id;

    return new Promise(function(done,rej){
        db.query("select team from user where id = ?",[id],function(error,idTeam){
            if(error!=null){
                rej(error);
            }else{
                try{
                    db.query("SELECT c.id,c.name,u.name,c.created,v.title,c.type, c.isPrivate FROM team_cup_participant ic "+
                    "join competition c join videogame v join user u ON c.admin = u.id AND c.videogame = v.id "+
                    "AND ic.cup = c.id WHERE c.state = 'preparing' AND c.expired = '0' AND NOT EXISTS (SELECT * FROM team_cup_participant b "+
                    "where u.team = ? AND ic.cup = b.cup) group by c.id",[idTeam[0].team],
                    function(error,result){
                        if(error!=null)
                            rej(error);
                        else
                            done(result);
                    });

                }catch(e){
                    //No tiene equipo, //Poner esto más bonito sin el try catch
                    done(new Array());
                }

            }
        });
    });
}

function getTeamsLeagueOpens(id){
    //SELECT c.id,c.name,u.name,c.created,v.title,c.type FROM team_league_participant ic join competition c join videogame v join user u ON c.admin = u.id AND c.videogame = v.id AND ic.league = c.id WHERE c.state = 'preparing' AND NOT EXISTS (SELECT * FROM team_league_participant b where team = 1 AND ic.league = b.league) group by c.id;
    return new Promise(function(done,rej){
        db.query("select team from user where id = ?",[id],function(error,idTeam){
            if(error!=null){
                rej(error);
            }else{
                try{
                    db.query("SELECT c.id,c.name,u.name,c.created,v.title,c.type, c.isPrivate FROM team_league_participant ic "+
                    "join competition c join videogame v join user u ON c.admin = u.id AND c.videogame = v.id "+
                    "AND ic.league = c.id WHERE c.state = 'preparing' AND c.expired = '0' AND NOT EXISTS (SELECT * FROM team_league_participant b "+
                    "where u.team = ? AND ic.league = b.league) group by c.id",[idTeam[0].team],
                    function(error,result){
                        if(error!=null)
                            rej(error);
                        else
                            done(result);
                    });

                }catch(e){
                    //No tiene equipo, Poner esto más bonito sin el try catch
                    done(new Array());
                }
            }
        });
    });
}

module.exports = router;