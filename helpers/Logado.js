module.exports ={
    Logado: function(req, res,next){
        if(req.isAuthenticated()){
            return next();
        }
        req.flash("error_msg", "Você precisa estar logado para acessar aqui")
        res.redirect("/")
    }
    // ,
    // isAdmin: isAdmin(req, res,next){
    //     if(req.isAuthenticated() && req.user.eAdmin == 1){        
    //         return next();
    //     }
    //     req.flash("error_msg", "Você precisa ser admin logado para acessar aqui")
    //     res.redirect("/")
    // }
}