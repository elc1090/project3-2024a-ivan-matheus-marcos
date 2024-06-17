const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Produto = new Schema({
    nome: {
        type: String,
        required: true
    },    
    descricao: {
        type: String,
        required: true
    },
    // peso: {
    //     type: Number,
    //     require: true
    // },
    categoria: {
        type: Schema.Types.ObjectId,
        ref: "categorias",
        required: true
    }
});

mongoose.model("produtos", Produto);
