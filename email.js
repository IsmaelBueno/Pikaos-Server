var nodemailer = require('nodemailer');
var authentication = require("./authentication");

var transporter = nodemailer.createTransport({
    service:'gmail',
    secure: true,
    auth: {
        user: 'pikaosapp@gmail.com',
        pass: 'CENSURADO'
    }
});

module.exports.sendRegisterMail = (email,user)=>{

    var emailEncripted = authentication.createTokenRegister(email);

    var mailOptions = {
        from: 'Pikaos',
        to: email,
        subject: 'Validación de tu correo en pikaos',
        html: '<h1>¡'+user+' te damos la bienvenida a pikaos!</h1><p>Pulsa en el siguiente enlace para <strong>validar</strong> tu cuenta: http://157.230.114.223:8090/register/validate/'+emailEncripted+'</p>'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports.videogameProposal = (videogame,description)=>{
    
    var mailOptions = {
        from: 'videogame Proposal',
        to: 'pikaosapp@gmail.com',
        subject: videogame,
        text: description
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports.reportAdmin = (adminName, competition, description)=>{

    var mailOptions = {
        from: 'Player reported',
        to: 'pikaosapp@gmail.com',
        subject: videogame,
        text: "Player: " + adminName +
        "\nCompetition ID: "+ competition +
        "\nDescription: "+ description
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}


    