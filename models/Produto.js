const mongoose = require("mongoose")

const VarianteSchema = new mongoose.Schema({
  id: { type: String },
  titulo: { type: String, default: null },
  imagem: {
    url: { type: String, default: null },
    filename: { type: String, default: null }
  },
  imagens: [
    {
      url: { type: String, default: null },
      filename: { type: String, default: null }
    }
  ],
  acabamento: { type: String },
  desenho: { type: String, default: null },
  tamanho: { type: String, default: null },
  dimensoes: {
    altura: { type: Number },
    largura: { type: Number }
  },
  preco: { type: Number }
}, { _id: false })

const ImagemSchema = new mongoose.Schema({
  url: { type: String, default: null },
  filename: { type: String, default: null }
}, { _id: false })

const CorImagemSchema = new mongoose.Schema({
  cor: { type: String },
  imagens: [ImagemSchema]
}, { _id: false })

const ProdutoSchema = new mongoose.Schema({
  id: { type: Number },
  ativo: { type: Boolean, default: true },
  titulo_geral: { type: String },
  categorias: [{ type: String }],
  descricao: { type: String, default: "" },
  ordem: { type: Number, default: null },
  codigo: { type: String, default: null },
  novidade: { type: Boolean, default: false },
  personalizavel: { type: Boolean, default: false },
  imagem_geral: [ImagemSchema],
  imagens_por_cor: [CorImagemSchema],
  variantes: [VarianteSchema]
}, {
  collection: "new_cards_json",
  timestamps: true
})

module.exports = mongoose.model("Produto", ProdutoSchema)
