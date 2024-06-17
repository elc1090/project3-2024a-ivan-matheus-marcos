const localstrategy = require("passport-local").Strategy
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

//Model de usuário
require("../models/Usuario")
const Usuario = mongoose.model("usuarios")

module.exports = function(passport){
    passport.use(new localstrategy({usernameField: 'email', passwordField: "senha"}, (email,senha, done)=>{
        Usuario.findOne({email:email}).lean().then((usuario)=>{
            if(!usuario){
                return done(null,false,{message: "esta conta não existe"})
            }
            bcrypt.compare(senha,usuario.senha, (erro, batem)=>{
                if(batem){
                    return done(null, usuario)
                }else{
                    return done(null, false,{message: "senha incorreta"})
                }
            });
        }).catch(err => done(err));
    }))
    passport.serializeUser((usuario,done)=>{
        done(null, usuario._id)
    })

    passport.deserializeUser((id,done)=>{
        Usuario.findById(id)
        .then(usuario => done(null, usuario))
        .catch(err => done(err));        
    })
}