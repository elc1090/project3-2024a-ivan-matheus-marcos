//codigo pra rodar  servidor local no pc e online no deploy 
if(process.env.NODE_ENV == "production"){
    module.exports = {mongoURI:"mongodb+srv://marcosluznoble:yHPYPp7sXU6HLd4o@cluster0.rzsq6zh.mongodb.net/blogapp?retryWrites=true&w=majority&appName=Cluster0"}
}else{
    //module.exports = {mongoURI:"mongodb://localhost/blogapp"}
    module.exports = {mongoURI:"mongodb+srv://marcosluznoble:yHPYPp7sXU6HLd4o@cluster0.rzsq6zh.mongodb.net/blogapp?retryWrites=true&w=majority&appName=Cluster0"}
}