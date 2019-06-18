var fs = require('fs');

module.exports.registerError = function(error){
    var now = new Date();
    fs.appendFile(__dirname+"/log_errors.txt",now +"\t"+ error+"\n",function(err,data){
        if(err!=null)
            console.log("Error al intentar registrar el error en el log, sí esto a ocurrido en serio");
    });
};
