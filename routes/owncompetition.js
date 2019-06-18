var express = require('express');
var router = express.Router();
var db = require('../db');
var errors = require('../errors');
var authentication = require("../authentication");
var moment = require("moment");


//Parámetros entrada: indcup, indleague, teamleague y teamcup para filtrar que se quiere
//200: Json con las competiciones que ya participa el usuario
router.get('/', function (req, res) {

    try{
        var token = req.headers.authorization;
        if(token==null)
            res.status(403).send({message: "Cabecera incorrecta, se requiere de un token"});
        else{
        
            var userID = authentication.decodeToken(token);

            var querys =[];

            if(req.query.indcup!=null)
                querys.push(getIndividualCupsJoined(userID));
            if(req.query.indleague!=null)
                querys.push(getIndividualLeaguesJoined(userID));
            if(req.query.teamcup!=null)
                querys.push(getTeamCupsJoined(userID));
            if(req.query.teamleague!=null)
                querys.push(getTeamLeaguesJoined(userID));

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

router.get('/info/:id',(req,res)=>{
    var idCompetition = req.params.id;

    db.query("select id,name,(select name from user where id = c.admin) as admin, description, expire, state, "+
    "(select title from videogame where id = c.videogame) as videogame, type from competition c",
    [idCompetition],(err,resQInfo)=>{

        
        switch(resQInfo[0].type){
            case "ind_cup":
                getCupIndividualInfo(idCompetition)
                .then((done)=>{
                    var response = {
                        id: resQInfo[0].id,
                        name: resQInfo[0].name,
                        admin: resQInfo[0].admin,
                        description: resQInfo[0].description,
                        expire: moment(resQInfo[0].expire).format("YYYY-MM-DD"),
                        state: resQInfo[0].state,
                        videogame: resQInfo[0].videogame,
                        rounds: done
                    }
                    res.status(200).send(response);
                }).catch((rej)=>{
                    errors.registerError(rej);
                });
                break;

            case "ind_league":
                break;
            case "team_cup":
                break;
            case "team_league":
                break;
        }




    });
});

//INFO
function getLeagueIndividualInfo (id) {
    return new Promise(function(done,rej){
        //select c.id, c.league_day, c.player_one,c.player_two,c.winner from ind_league_day_confrontation c join ind_league_day r on r.id = c.id and r.league_day = c.league_day where r.id = 2 order by c.league_day;
        db.query("select c.id, c.league_day, c.player_one,c.player_two,c.winner from "+
        "ind_league_day_confrontation c join ind_league_day r on r.id = c.id and r.league_day = c.league_day "+
        "where r.id = ? order by c.league_day",
        [id],(err,resQ)=>{

            if(err!=null)
                rej(err);
 
            var json = [];
            var confrontations = [];


            for (let index = 0; index < resQ.length; index++) {
                const line = resQ[index];

                //Obtenemos los datos de la confrontación de cada fila y lo añadimos al array de confrontations
                var confrontation = {
                    player_one: line.player_one,
                    player_two: line.player_two,
                    winner: line.winner,
                };

                confrontations.push(confrontation);

                //Comprobamos si el número de ronda actual es la última vez que aparece o si es la última linea directamente
                //En este caso añadimos la ronda con las confrontacioens recogidas hasta ahora

                if(index == resQ.length-1 || line.league_day != resQ[index+1].league_day){
                    var lDay = {
                        league_day: line.league_day,
                        confrontations: confrontations
                    }

                    //Añadimos la ronda al array respuesta
                    json.push(lDay);

                    //Limpiamos las confrontaciones de esta ronda que ya quedo registrada
                    confrontations = [];
                }
            }

            done(json);
        });
    });
}


function getCupIndividualInfo (id){
    return new Promise(function(done,rej){
        //select c.id,c.nRound, r.round_name,c.player_one,c.player_two,c.winner from ind_cup_confrontation c join ind_cup_round r on r.id = c.id and r.nRound = c.nRound where r.id = 1;
        db.query("select c.id,c.nRound, r.round_name,c.player_one,c.player_two,c.winner from "+
        "ind_cup_confrontation c join ind_cup_round r on r.id = c.id and r.nRound = c.nRound where r.id = ? order by c.nRound",
        [id],(err,resQ)=>{

            if(err!=null)
                rej(err);

            
            var json = [];
            var confrontations = [];


            for (let index = 0; index < resQ.length; index++) {
                const line = resQ[index];

                //Obtenemos los datos de la confrontación de cada fila y lo añadimos al array de confrontations
                var confrontation = {
                    player_one: line.player_one,
                    player_two: line.player_two,
                    winner: line.winner,
                };

                confrontations.push(confrontation);

                //Comprobamos si el número de ronda actual es la última vez que aparece o si es la última linea directamente
                //En este caso añadimos la ronda con las confrontacioens recogidas hasta ahora


                if(index == resQ.length-1 || line.nRound != resQ[index+1].nRound){
                    var round = {
                        nRound: line.nRound,
                        round_name: line.round_name,
                        confrontations: confrontations
                    }

                    //Añadimos la ronda al array respuesta
                    json.push(round);

                    //Limpiamos las confrontaciones de esta ronda que ya quedo registrada
                    confrontations = [];
                }
            }

            done(json);
        });
    });
}


//JOINED
function getIndividualCupsJoined (id){
    //select id,name,(select name from user u where u.id = c.admin) as admin, state,expire,(select title from videogame v where v.id = c.videogame) as game, type  from competition c where c.id in (select cup from ind_cup_participant where user =1) AND expired = 0;
    return new Promise(function(done,rej){
        db.query("select id,name,(select name from user u where u.id = c.admin) as admin, state,expire, " + 
        "(select title from videogame v where v.id = c.videogame) as game, type  from competition c " + 
        "where c.id in (select cup from ind_cup_participant where user = ?) AND expired = 0",[id],(error,result)=>{
            if(error!=null){
                console.log(error);
                rej(error);
            }else
                done(result);
        });
    });
};

function getIndividualLeaguesJoined (id){
    //select id,name,(select name from user u where u.id = c.admin) as admin, state,expire,(select title from videogame v where v.id = c.videogame) as game, type  from competition c where c.id in (select cup from ind_cup_participant where user =1) AND expired = 0;
    return new Promise(function(done,rej){
        db.query("select id,name,(select name from user u where u.id = c.admin) as admin, state,expire, " + 
        "(select title from videogame v where v.id = c.videogame) as game, type  from competition c " + 
        "where c.id in (select league from ind_league_participant where user = ?) AND expired = 0",[id],(error,result)=>{
            if(error!=null){
                console.log(error);
                rej(error);
            }else
                done(result);
        });
    });
}


function getTeamCupsJoined (id){
    // select id,name,(select name from user u where u.id = c.admin) as admin, state,expire,(select title from videogame v where v.id = c.videogame) as game, type  from competition c where c.id in (select cup from team_cup_participant where team = (select team from user where id = 3)) AND expired = 0;
    return new Promise(function(done,rej){
        db.query("select id,name,(select name from user u where u.id = c.admin) as admin, state,expire, " + 
        "(select title from videogame v where v.id = c.videogame) as game, type  from competition c " + 
        "where c.id in (select cup from team_cup_participant where team = (select team from user where id = ?)) "+ 
        " AND expired = 0;",[id],(error,result)=>{
            if(error!=null){
                console.log(error);
                rej(error);
            }else
                done(result);
        });
    });
}

function getTeamLeaguesJoined (id){
    return new Promise(function(done,rej){
        db.query("select id,name,(select name from user u where u.id = c.admin) as admin, state,expire, " + 
        "(select title from videogame v where v.id = c.videogame) as game, type  from competition c " + 
        "where c.id in (select league from team_league_participant where team = (select team from user where id = ?)) "+ 
        " AND expired = 0;",[id],(error,result)=>{
            if(error!=null){
                console.log(error);
                rej(error);
            }else
                done(result);
        });
    });
}

module.exports = router;