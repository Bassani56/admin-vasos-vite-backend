const mongoose = require("mongoose")

const ProdutoSchema = new mongoose.Schema({
    categorias: [String],
    cores: [String],
    desenhos: [String]
}, {
  collection: "forms"
})

module.exports = mongoose.model("Forms", ProdutoSchema)

