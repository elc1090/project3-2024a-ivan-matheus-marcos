const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Estoque = new Schema({
    produto: {
        type: Schema.Types.ObjectId,
        ref: "produtos",
        required: true
    },
    quantidade: {
        type: Number,
        required: true
    },
    dataE: {
        type: Date,
        default: Date.now
    },
    dataS: {
        type: Date
    },
    dataV: {
        type: Date,
        required: true
    },
    recebedor: {
        type: Schema.Types.ObjectId,
        ref: "usuarios"
    },
    removedor: {
        type: Schema.Types.ObjectId,
        ref: "usuarios"
    },
    observacoes: {
        type: String
    },
    retirado:{
        type: Number,
        default: 0
    }
});

mongoose.model("estoques", Estoque);
