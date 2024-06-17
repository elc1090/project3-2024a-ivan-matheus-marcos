module.exports ={
    Logado: function(req, res,next){
        // if(req.isAuthenticated() && req.user.eAdmin == 1){
        if(req.isAuthenticated()){
            return next();
        }
        req.flash("error_msg", "Você precisa estar logado para acessar aqui")
        res.redirect("/")
    }
}