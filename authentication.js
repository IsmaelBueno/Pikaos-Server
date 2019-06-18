var jwt = require("jwt-simple");
var moment = require("moment");
const config = require("./config");

module.exports.createToken = (userId) => {

    var params = {
        sub: userId,
        iat: moment().unix(),
        exp: moment().add(14,"days").unix()
    };
    
    return jwt.encode(params,config.TOKENKEY);
}

module.exports.createTokenRegister = (email) => {

    var params = {
        sub: email,
        iat: moment().unix(),
        exp: moment().add(60,"minutes").unix()
    };
    
    return jwt.encode(params,config.TOKENKEY);
}

module.exports.decodeToken = (token) => {
    try{
        var decode = jwt.decode(token, config.TOKENKEY);
        //El sub es el id
        return decode.sub;
    }catch(e){
        //Si no consigue descodificar el token, significa que el token estará mal formado
        //por lo que lo controlaremos como un fallo de autentificación posteriormente
        return null;
    }
}