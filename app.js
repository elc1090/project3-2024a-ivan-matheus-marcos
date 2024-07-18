//carregando modulos
const express = require('express')
const { engine } = require('express-handlebars');
const bodyParser = require("body-parser")
const app = express()
const path = require("path")
const mongoose = require("mongoose")
const session = require("express-session")
const flash = require("connect-flash")
const passport = require("passport")
require("./config/auth")(passport)
require("./models/Usuario");
require("./models/Produto")
require("./models/Categoria")
require("./models/Estoque")
require("dotenv").config()
const Usuario = mongoose.model("usuarios");
const Produto = mongoose.model("produtos")
const Categoria = mongoose.model("categorias")
const Estoque = mongoose.model("estoques")
const bcrypt = require("bcryptjs");
const {Logado} = require("./helpers/Logado")

//Configurações
//sessão
    app.use(session({
        secret: "qualquerCoisaSegura",
        resave: true,
        saveUninitialized: true
    }))

    //a ordem importa
    app.use(passport.initialize())
    app.use(passport.session())
    app.use(flash())

//Middleware
    app.use((req,res,next)=>{
        res.locals.success_msg = req.flash("success_msg")
        res.locals.error_msg = req.flash("error_msg")
        res.locals.error = req.flash("error")
        res.locals.user = req.user || null;
        next()
    })

    app.use((req, res, next) => {
        if (req.user) {
          // Supondo que o nome completo do usuário está em req.user.name
          const nome = req.user.nome;
          const initials = nome.split(' ').map(n => n[0]).join('').toUpperCase();
          res.locals.user = req.user;
          res.locals.userInitials = initials;
        }
        next();
    });

    ////???////???
    app.use(express.static('public'));

    // app.use((req, res, next) => {
    //     res.status(404).render('index', { message: 'Página não encontrada' });
    // });

    // // Middleware de erro genérico
    // app.use((err, req, res, next) => {
    //     console.error(err.stack);
    //     res.status(500).render('index', { message: 'Erro interno do servidor' });
    // });

//Bodyparser
    app.use(bodyParser.urlencoded({extended:true}))
    app.use(bodyParser.json())

// //Handlebars

//     app.engine('handlebars', engine({ defaultLayout: 'main' }));
//     app.set('view engine', 'handlebars');

app.engine('handlebars', engine({
    defaultLayout: 'main',
    helpers: {
        getClassByAdminStatus: function(eAdmin) {
            if (eAdmin === 1) {
                return 'alert-danger'; // Vermelho para admins
            } else {
                return 'alert-success'; // Verde para usuários comuns
            }
        }
    }
}));
app.set('view engine', 'handlebars');

//mongoose        
    mongoose.Promise = global.Promise;
    mongoose.connect(process.env.MONGODB_URL, {
    }).then(() => {
        console.log("conectado ao MongoDB Atlas");
    }).catch((err) => {
        console.log("falha na conexão ao MongoDB Atlas: " + err);
    });
//public
    app.use(express.static(path.join(__dirname, "public")))

//rotas
app.get('/', (req, res) => {
    res.render('index')
});

app.get("/registro", (req, res) => {
    res.render("usuarios/registro");
});

app.post("/registro", (req, res)=>{
    var erros = []

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
        erros.push({texto:"Nome inválido"})
    }
    if(!req.body.email || typeof req.body.email == undefined || req.body.email == null){
        erros.push({texto:"email inválido"})
    }
    if(!req.body.senha || typeof req.body.senha == undefined || req.body.senha == null){
        erros.push({texto:"senha inválida"})
    }
    if(req.body.senha.length < 4){
        erros.push({texto:"senha curta demais"})        
    }
    if(req.body.senha != req.body.senha2){        
        erros.push({texto:"senhas diferentes"})
    }
    if(erros.length > 0){
        res.render("usuarios/registro",{erros:erros})
    }else{
        Usuario.findOne({email:req.body.email}).then((usuario)=>{
            if(usuario){
                req.flash("error_msg", "ja existe uma conta com esse e-mail")
                res.redirect("/registro")    
            }else{
                const novoUsuario = new Usuario({
                    nome: req.body.nome,
                    email: req.body.email,
                    senha: req.body.senha
                })
                bcrypt.genSalt(10,(erro,salt)=>{
                    bcrypt.hash(novoUsuario.senha, salt, (erro, hash)=>{
                        if(erro){
                            req.flash("error_msg", "houve um erro no salvamento do usuario")
                            res.redirect('/')
                        }
                        novoUsuario.senha = hash
                        novoUsuario.save().then(()=>{
                            req.flash("success_msg", "Usuário salvo")
                            res.redirect('/')
                        }).catch((err)=>{
                            req.flash("error_msg", "houve um erro no salvamento do usuario")
                            res.redirect('/')
                        })
                    })
                })
            }
        }).catch((err)=>{
            req.flash("error_msg", "erro interno de achar usuario")
        })
    }
})

app.get("/login", (req, res)=>{
    res.render("usuarios/login")
})

app.post("/login", (req, res,next)=>{
    passport.authenticate("local",{
        successRedirect: "/",
        failureRedirect: "/login",
        failureFlash: true
    })(req,res,next)
})

app.get("/logout", (req, res)=>{
    req.logout((err) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        req.flash("success_msg", "Deslogado");
        res.redirect("/");
    });
});
/////
//Produtos

app.get('/produtos',Logado,  (req, res) => {
    Produto.find().populate('categoria').sort({nome: 'desc'}).lean().then((produtos) => {
        if(req.user.eAdmin == 1){
            res.render("produtos/produtos", {produtos: produtos});
        }else{
            res.render("produtos/produtosUser", {produtos: produtos});
        }        
    }).catch((err) => {
        req.flash("error_msg", "Houve um erro ao listar os produtos");
        res.redirect('/');
    });
});

app.get("/produtos/add",Logado,  (req, res) => {
    Categoria.find().lean().then((categorias) => {
        res.render("produtos/addprodutos", { categorias: categorias });
    }).catch((err) => {
        req.flash("error_msg", "Erro ao carregar o formulário de adição de produtos");
        res.redirect("/produtos");
    });
});

app.post("/produtos/novo",Logado,  (req, res)=>{
    var erros = []
    if(!req.body.nome || typeof req.body.nome == undefined ||req.body.nome == null){
        erros.push({ texto:"Nome inválido"})
    }    
    if(req.body.nome.length <2){
        erros.push({ texto:"Nome do produto muito curto"})
    }
    if(erros.length >0){
        res.render("produtos/addprodutos",{erros: erros})
    }else{
        const novoProduto = {
            nome: req.body.nome,
            // peso: req.body.peso,
            descricao: req.body.descricao,
            categoria: req.body.categoria
        }    
        new Produto(novoProduto).save().then(()=>{
            req.flash("success_msg","produto salvo com sucesso")
            res.redirect("/produtos"); // Redirect to avoid re-submitting the form on refresh
        }).catch((err)=>{
            req.flash("error_msg","erro ao salvar produto")
            console.log("falha ao salvar produto"+ err)
            res.redirect("/produtos/add");
        })
    }        
})

app.post("/produtos/edit",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Produto.findOne({_id:req.body.id}).then((produto)=>{
            produto.nome = req.body.nome
            produto.descricao= req.body.descricao
            produto.categoria = req.body.categoria
            produto.save().then(()=>{
                req.flash("success_msg", "Sucesso na edição")
                res.redirect("/produtos")
            }).catch((err)=>{
                res.flash("error_msg", "Problema na edição")
                res.redirect("/produtos")
            })
        }).catch((err)=>{
            req.flash("error_msg", "erro ao editar")
            res.redirect("/produtos")
        })        
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/produtos")
    }       
    
})     

app.get("/produtos/edit/:id",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Produto.findOne({_id:req.params.id}).populate('categoria').lean().then((produto)=>{
            Categoria.find().lean().then((categorias)=>{
                res.render('produtos/editprodutos', {categorias:categorias, produto:produto})
            }).catch((err)=>{
                req.flash("error_msg", "erro ao listar categorias")
                res.redirect("/admin/postagens") 
            })
        }).catch((err)=>{
            req.flash("error_msg", "erro ao listar produto ")
            res.redirect("/produtos")
        })    
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/produtos")
    } 
})

app.post("/produtos/deletar",Logado, (req,res)=>{   
    if(req.user.eAdmin == 1){
        Produto.deleteOne({_id:req.body.id}).then(()=>{
            req.flash("success_msg", "deletado com sucesso")
            res.redirect("/produtos")
        }).catch((err)=>{
            req.flash("error_msg", "erro ao deletar produto")
            res.redirect("/produtos")
        })    
    }else{
        req.flash("error_msg", "Sómente admins podem deletar")
        res.redirect("/produtos")
    }
})

///
///Categorias
app.get('/categorias',Logado, (req, res)=>{
    if(req.user.eAdmin == 1){
        Categoria.find().sort({date:'desc'}).lean().then((categorias)=>{
            res.render("categorias/categorias", {categorias: categorias})
        }).catch((err)=>{
            req.flash("error_msg", "Houve um erro ao listar as categorias")
        })    
    }else{
        Categoria.find().sort({date:'desc'}).lean().then((categorias)=>{
            res.render("categorias/categoriasUser", {categorias: categorias})
        }).catch((err)=>{
            req.flash("error_msg", "Houve um erro ao listar as categorias")
        })    
    }     
})

app.get('/categorias/add',Logado, (req, res)=>{
    res.render("categorias/addcategorias")
})

app.post("/categorias/nova",Logado,  (req, res)=>{
    var erros = []
    if(!req.body.nome || typeof req.body.nome == undefined ||req.body.nome == null){
        erros.push({ texto:"Nome inválido"})
    }        
    if(req.body.nome.length <2){
        erros.push({ texto:"Nome da categoria muito curto"})
    }
    if(erros.length >0){
        res.render("/addcategorias",{erros: erros})
    }else{
        const novaCategoria = {
            nome: req.body.nome
        }    
        new Categoria(novaCategoria).save().then(()=>{
            console.log("Categoria salva")
            req.flash("success_msg","categoria criada com sucesso")
            res.redirect("/categorias"); // Redirect to avoid re-submitting the form on refresh
        }).catch((err)=>{
            req.flash("error_msg","erro ao salvar categoria")
            console.log("falha ao salvar categoria"+ err)
            res.redirect("/");
        })
    }    
})
app.post("/categorias/edit",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Categoria.findOne({_id:req.body.id}).then((categoria)=>{
            categoria.nome = req.body.nome
            categoria.descricao= req.body.descricao
            categoria.categoria = req.body.categoria
            categoria.save().then(()=>{
                req.flash("success_msg", "Sucesso na edição")
                res.redirect("/categorias")
            }).catch((err)=>{
                res.flash("error_msg", "Problema na edição")
                res.redirect("/produtos")
            })
        }).catch((err)=>{
            req.flash("error_msg", "erro ao editar")
            res.redirect("/categorias")
        })        
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/categorias")
    }       
    
})     

app.get("/categorias/edit/:id",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Categoria.findOne({_id:req.params.id}).lean().then((categoria)=>{           
            res.render('categorias/editcategorias', {categoria:categoria})           
        }).catch((err)=>{
            req.flash("error_msg", "erro ao listar categorias ")
            res.redirect("/categorias")
        })    
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/categorias")
    } 
})

app.post("/categorias/deletar",Logado, (req,res)=>{   
    if(req.user.eAdmin == 1){
        Categoria.deleteOne({_id:req.body.id}).then(()=>{
            req.flash("success_msg", "Deletada com sucesso")
            res.redirect("/categorias")
        }).catch((err)=>{
            req.flash("error_msg", "erro ao deletar categoria")
            res.redirect("/categorias")
        })    
    }else{
        req.flash("error_msg", "Sómente admins podem deletar")
        res.redirect("/categorias")
    }
})

/////////
//estoques e retirdas
app.get('/estoques', Logado, (req, res) => {
    if(req.user.eAdmin == 1){
        Estoque.find({ retirado: 0 }).populate('produto').populate('recebedor').sort({dataE: 'desc'}).lean().then((estoques) => {
            res.render("estoques/estoques", {estoques: estoques});
        }).catch((err) => {
            req.flash("error_msg", "Houve um erro ao listar os produtos");
            console.log(err)
            res.redirect('/');
        });
    }else{
        Estoque.find({ retirado: 0 }).populate('produto').populate('recebedor').sort({dataE: 'desc'}).lean().then((estoques) => {
            res.render("estoques/estoquesUser", {estoques: estoques});
        }).catch((err) => {
            req.flash("error_msg", "Houve um erro ao listar os produtos");
            console.log(err)
            res.redirect('/');
        });
    } 
    
});

app.get('/retiradas',Logado,  (req, res) => {
    if(req.user.eAdmin == 1){
        Estoque.find({ retirado: 1 }).populate('produto').populate('recebedor').sort({dataE: 'desc'}).lean().then((estoques) => {
            res.render("estoques/retiradas", {estoques: estoques});
        }).catch((err) => {
            req.flash("error_msg", "Houve um erro ao listar os produtos");
            console.log(err)
            res.redirect('/');
        });
    }else{
        Estoque.find({ retirado: 1 }).populate('produto').populate('recebedor').sort({dataE: 'desc'}).lean().then((estoques) => {
            res.render("estoques/retiradasUser", {estoques: estoques});
        }).catch((err) => {
            req.flash("error_msg", "Houve um erro ao listar os produtos");
            console.log(err)
            res.redirect('/');
        });
    } 
    
});

app.get("/estoques/add",Logado,  (req, res) => {
    Produto.find().lean().then((produtos) => {
        res.render("estoques/addestoque", { produtos: produtos });
    }).catch((err) => {
        req.flash("error_msg", "Erro ao carregar o formulário de adição de estoques");
        res.redirect("/estoques");
    });
});

app.post("/estoques/novo",Logado,  (req, res)=>{
    var erros = []
    //não fiz validação de dados aqui, estas comentadas são de onde eu copiei esse codigo 
    // if(!req.body.nome || typeof req.body.nome == undefined ||req.body.nome == null){
    //     erros.push({ texto:"Nome inválido"})
    // }        
    // if(req.body.nome.length <2){
    //     erros.push({ texto:"Nome do produto muito curto"})
    // }
    if(!req.body.quantidade || typeof req.body.quantidade == undefined ||req.body.quantidade == null){
        erros.push({ texto:"Quantidade errada"})
    }    
    
    if(req.body.observacoes.length <1){
        erros.push({ texto:"Observação vazia"})
    }
    if(!req.body.produto){
        erros.push({ texto:"Selecione um produto"})
    }

    if(erros.length >0){
        res.render("/estoques",{erros: erros})
    }else {
        const novaEntrada = {
            produto: req.body.produto,
            quantidade: req.body.quantidade,
            dataE: Date.now(),
            observacoes: req.body.observacoes,
            dataV: req.body.dataV,
            recebedor: req.user ? req.user._id : null // ensure user is logged in
        };    
        new Estoque(novaEntrada).save().then(() => {
            req.flash("success_msg", "entrada salva com sucesso");
            res.redirect("/estoques"); // Redirect to avoid re-submitting the form on refresh
        }).catch((err) => {
            req.flash("error_msg", "erro ao salvar entrada");
            console.log("falha ao salvar entrada"+ err);
            res.redirect("/");
        });
    }        
})

app.get("/estoques/edit/:id",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Estoque.findOne({_id:req.params.id}).populate('produto').lean().then((estoque)=>{
            Produto.find().lean().then((produtos)=>{
                res.render('estoques/editestoques', {produtos:produtos, estoque: estoque})
            }).catch((err)=>{
                req.flash("error_msg", "erro ao listar produtos")
                res.redirect("/estoques") 
            })
        }).catch((err)=>{
            req.flash("error_msg", "esta produto não existe")
            res.redirect("/estoques")
        })    
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/estoques")
    } 
})

app.post("/estoques/edit",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Estoque.findOne({_id:req.body.id}).then((estoque)=>{
            estoque.quantidade = req.body.quantidade
            estoque.observacoes= req.body.observacoes
            estoque.dataV = req.body.dataV || Date.now(); // Set to Date.now() if not provided        
            estoque.produto= req.body.produto
            estoque.recebedor = req.user ? req.user._id : null // ensure user is logged in
            estoque.save().then(()=>{
                req.flash("success_msg", "Sucesso na edição")
                res.redirect("/estoques")
            }).catch((err)=>{
                res.flash("error_msg", "Problema na edição")
                res.redirect("/estoques")
            })
        }).catch((err)=>{
            console.log(err)
            req.flash("error_msg", "erro ao editar")
            res.redirect("/estoques")
        })            
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/produtos")
    } 
})

app.post("/retiradas/retirar",Logado, (req,res)=>{
    Estoque.findOne({_id:req.body.id}).then((estoque)=>{        
        estoque.dataS= Date.now(),        
        estoque.removedor = req.user ? req.user._id : null // ensure user is logged in
        estoque.retirado = 1
        estoque.save().then(()=>{
            req.flash("success_msg", "Sucesso na edição")
            res.redirect("/estoques")
        }).catch((err)=>{
            res.flash("error_msg", "Problema na edição")
            res.redirect("/estoques")
        })
    }).catch((err)=>{
        console.log(err)
        req.flash("error_msg", "erro ao editar")
        res.redirect("/estoques")
    })    
})

app.get("/retiradas/retirarparcial/:id",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Estoque.findOne({_id:req.params.id}).populate('produto').lean().then((estoque)=>{
            console.log(estoque)
            res.render('estoques/retiradaparcial', {estoque: estoque})
        }).catch((err)=>{
            req.flash("error_msg", "esta entrada não existe")
            res.redirect("/estoques")
        })    
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/estoques")
    } 
 
})

app.post("/retiradas/retirarparcial",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Estoque.findOne({_id:req.body.id}).then((estoque)=>{
            estoque.quantidade =  estoque.quantidade - req.body.quantidade            
            estoque.save().catch((err)=>{
                res.flash("error_msg", "problema na retirada parcial")
                res.redirect("/estoques")
            })
            const novaSaida = {
                produto: estoque.produto,
                quantidade: req.body.quantidade,
                dataE: estoque.dataE,
                dataS: Date.now(),
                observacoes: estoque.observacoes,
                dataV: estoque.dataV,
                recebedor: estoque.recebedor,
                removedor: req.user ? req.user._id : null, // ensure user is logged in
                retirado: 1
                
            };    
            new Estoque(novaSaida).save().then(() => {
                req.flash("success_msg", "retirada salva com sucesso");
                res.redirect("/estoques"); // Redirect to avoid re-submitting the form on refresh
            }).catch((err) => {
                req.flash("error_msg", "erro ao salvar retirada");
                console.log("falha ao salvar retirada"+ err);
                res.redirect("/");
            });
        }).catch((err)=>{
            console.log(err)
            req.flash("error_msg", "erro na retirada parcial")
            res.redirect("/estoques")
        })            
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/produtos")
    } 
    
 
})

app.post("/estoques/deletar",Logado, (req,res)=>{   
    if(req.user.eAdmin == 1){
        Estoque.deleteOne({_id:req.body.id}).then(()=>{
            req.flash("success_msg", "deletado com sucesso")
            res.redirect("/produtos")
        }).catch((err)=>{
            req.flash("error_msg", "erro ao deletar estoque")
            res.redirect("/estoques")
        })
    }else{
        req.flash("error_msg", "Sómente admins podem deletar")
        res.redirect("/produtos")
    } 
})

async function getQuantidadePorCategoria(retirado) {
    return await Categoria.aggregate([
        {
            $lookup: {
                from: 'produtos',
                localField: '_id',
                foreignField: 'categoria',
                as: 'produtos'
            }
        },
        {
            $unwind: "$produtos"
        },
        {
            $lookup: {
                from: 'estoques',
                localField: 'produtos._id',
                foreignField: 'produto',
                as: 'estoques'
            }
        },
        {
            $unwind: "$estoques"
        },
        {
            $match: {
                "estoques.retirado": retirado
            }
        },
        {
            $group: {
                _id: "$_id",
                nome: { $first: "$nome" },
                quantidade: { $sum: 1 }
            }
        }
    ]);
}

async function getQuantidadePorProduto(retirado) {
    return await Estoque.aggregate([
        {
            $match: { retirado: retirado }
        },
        {
            $group: {
                _id: "$produto",
                quantidade: { $sum: "$quantidade" }
            }
        },
        {
            $lookup: {
                from: 'produtos',
                localField: '_id',
                foreignField: '_id',
                as: 'produtoInfo'
            }
        },
        {
            $unwind: "$produtoInfo"
        },
        {
            $project: {
                nome: "$produtoInfo.nome",
                quantidade: 1
            }
        }
    ]);
}

app.get('/estatisticas', Logado, async (req, res) => {
    try {
        // Estatísticas para produtos no estoque (retirado = 0)
        const quantidadePorCategoriaNoEstoque = await getQuantidadePorCategoria(0);
        const quantidadePorProdutoNoEstoque = await getQuantidadePorProduto(0);
        
        // Estatísticas para produtos fora do estoque (retirado = 1)
        const quantidadePorCategoriaForaEstoque = await getQuantidadePorCategoria(1);
        const quantidadePorProdutoForaEstoque = await getQuantidadePorProduto(1);

        res.render('estoques/estatisticas', {
            quantidadePorCategoriaNoEstoque: quantidadePorCategoriaNoEstoque,
            quantidadePorProdutoNoEstoque: quantidadePorProdutoNoEstoque,
            quantidadePorCategoriaForaEstoque: quantidadePorCategoriaForaEstoque,
            quantidadePorProdutoForaEstoque: quantidadePorProdutoForaEstoque
        });
    } catch (err) {
        req.flash("error_msg", "Erro ao carregar as estatísticas");
        res.redirect('/');
    }
});

app.get('/users',Logado,  (req, res) => {
    Usuario.find().sort({nome: 'desc'}).lean().then((usuarios) => {
        if(req.user.eAdmin == 1){
            res.render("usuarios/users", {usuarios: usuarios});
        }else{
            res.render("usuarios/usersusers", {usuarios: usuarios});
        }        
    }).catch((err) => {
        req.flash("error_msg", "Houve um erro ao listar os produtos");
        res.redirect('/');
    });
});

app.get("/users/edit/:id",Logado, (req,res)=>{
    if(req.user.eAdmin == 1){
        Usuario.findOne({_id:req.params.id}).then((user)=>{
            if(user.eAdmin == 0 ){
                user.eAdmin = 1
            }else{
                user.eAdmin = 0
            }
            user.save().then(()=>{
                req.flash("success_msg", "Sucesso na edição")
                res.redirect("/users")
            }).catch((err)=>{
                res.flash("error_msg", "Problema na edição")
                res.redirect("/users")
            })
        }).catch((err)=>{
            req.flash("error_msg", "erro ao editar admin status")
            res.redirect("/users")
        })    
    }else{
        req.flash("error_msg", "Sómente admins podem editar")
        res.redirect("/users")
    } 
})

app.post("/users/deletar",Logado, (req,res)=>{   
    if(req.user.eAdmin == 1){
        Usuario.deleteOne({_id:req.body.id}).then(()=>{
            req.flash("success_msg", "deletado com sucesso")
            res.redirect("/users")
        }).catch((err)=>{
            req.flash("error_msg", "erro ao deletar estoque")
            res.redirect("/users")
        })
    }else{
        req.flash("error_msg", "Sómente admins podem deletar")
        res.redirect("/users")
    } 
})

const PORT = process.env.PORT || 8089
app.listen(PORT,()=>{
    console.log("Servidor rodando na porta " + PORT);
})
