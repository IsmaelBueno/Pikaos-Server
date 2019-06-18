var cron = require("node-cron");
var moment = require("moment");
var db = require("../db");
var errors = require("../errors");

function competitionExpired(id){
    return new Promise((done,rej)=>{
        db.query("UPDATE competition SET expired = 1 WHERE id = ?",[id],(err,resUpdated)=>{
            if(err)
                rej(err);
            done(resUpdated);
        });
    });
}

//Se ejecutará cada noche a las 12 y 10
module.exports.start = ()=>{
    cron.schedule("10 0 * * *",()=>{
        console.log("Comienzo de la comprobación de competiciones expiradas");

        db.query("SELECT id, expire FROM competition WHERE expired = 0",(err,res)=>{

            var competitionsExpirated = 0;
            var promises = [];

            for (let index = 0; index < res.length; index++) {
                const competition = res[index];

                var expire = moment(competition.expire).format("YYYY-MM-DD")
                var today = moment().format("YYYY-MM-DD");

                if(today>=expire){
                    promises.push(competitionExpired(competition.id));
                    competitionsExpirated++;
                }
            }

            Promise.all(promises).then((done)=>{
                console.log("Competiciones expiradas "+ competitionsExpirated);

            }).catch((rej)=>{
                errors.registerError(rej);
            });
        });
    });
};