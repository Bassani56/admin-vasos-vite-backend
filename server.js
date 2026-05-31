require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const fs = require("fs")
const path = require("path")

const Forms = require('./models/InputForm')

const app = express()
app.use(express.json())

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

const corsOptions = {};
if (allowedOrigins.length > 0) {
  corsOptions.origin = function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked by server: ${origin}`));
    }
  };
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


const multer = require("multer");

const {
  uploadImage,
  deleteImage,
} = require("./s3");

const upload = multer({
  storage: multer.memoryStorage(),
});

app.post("/upload", upload.array("images", 10), async (req, res) => {
  try {
    const files = req.files;

    const uploadedImages = [];

    for (const file of files) {
      const fileName = `${Date.now()}-${file.originalname}`;

      await uploadImage(
        file.buffer,
        fileName,
        file.mimetype
      );

      const url = `https://${process.env.AWS3_BUCKET}.s3.${process.env.AWS3_REGION}.amazonaws.com/${fileName}`;

      uploadedImages.push({
        fileName,
        url,
      });
    }

    res.json({
      success: true,
      images: uploadedImages,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Erro upload múltiplo",
    });
  }
});

app.delete("/image/:name", async (req, res) => {
  try {
    const { name } = req.params;

    const result = await deleteImage(name);

    res.json(result);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Erro ao deletar imagem",
    });
  }
});


app.get('/forms', async (req, res) => {
    try {
        const forms = await Forms.find()
        res.json(forms)
    } catch (error) {
        console.error(error)
        res.status(500).json({erro: error.message})
    }  
})


app.post("/forms/options", async (req, res) => {
  try {
    const {
      categoria,
      cor,
      desenho,
    } = req.body;

    const form = await Forms.findOne();

    /*
    =========================
    CATEGORIA
    =========================
    */

    if (
      categoria &&
      !form.categorias.includes(categoria)
    ) {
      form.categorias.push(categoria);
    }

    /*
    =========================
    COR
    =========================
    */

    if (
      cor &&
      !form.cores.includes(cor)
    ) {
      form.cores.push(cor);
    }

    /*
    =========================
    DESENHO
    =========================
    */

    if (
      desenho &&
      !form.desenhos.includes(desenho)
    ) {
      form.desenhos.push(desenho);
    }

    await form.save();

    res.json({
      success: true,
      form,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      erro: error.message,
    });
  }
});


const Produto = require('./models/Produto')

app.get('/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find()
        res.json(produtos)
        
    } catch (error) {
        console.error(error)
        res.status(500).json({erro: error.message})
    }
})

app.get('/produtos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produto.findOne({ $or: [{ _id: id }, { id: Number(id) }] });
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }
    res.json(produto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: error.message });
  }
});

app.post('/products', async (req, res) => {
  try {
    const produtoData = req.body;

    const created = await Produto.create(produtoData);

    res.json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: error.message });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // const updated = await Produto.findOneAndUpdate(
    //   { $or: [{ _id: id }, { id: Number(id) }] },
    //   updateData,
    //   { new: true, runValidators: true }
    // );

    const updated = await Produto.findByIdAndUpdate(
  id,
  updateData,
  {
    new: true,
    runValidators: true
  }
);

    if (!updated) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      erro: error.message || 'Erro ao atualizar produto',
      details: error.errors ? Object.keys(error.errors).map(key => error.errors[key].message) : []
    });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find the product first to get all image filenames
    const produto = await Produto.findById(id);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    // Collect all filenames to delete from S3
    const filesToDelete = [];

    // Add general images
    if (Array.isArray(produto.imagem_geral)) {
      produto.imagem_geral.forEach(img => {
        if (img.filename) filesToDelete.push(img.filename);
      });
    }

    // Add color-based images
    if (Array.isArray(produto.imagens_por_cor)) {
      produto.imagens_por_cor.forEach(bucket => {
        if (Array.isArray(bucket.imagens)) {
          bucket.imagens.forEach(img => {
            if (img.filename) filesToDelete.push(img.filename);
          });
        }
      });
    }

    // Add variant images
    if (Array.isArray(produto.variantes)) {
      produto.variantes.forEach(variant => {
        if (variant.imagem && variant.imagem.filename) {
          filesToDelete.push(variant.imagem.filename);
        }
        if (Array.isArray(variant.imagens)) {
          variant.imagens.forEach(img => {
            if (img.filename) filesToDelete.push(img.filename);
          });
        }
      });
    }

    // Delete all images from S3
    for (const filename of filesToDelete) {
      try {
        await deleteImage(filename);
      } catch (err) {
        console.error(`Erro ao deletar imagem ${filename}:`, err);
      }
    }

    // Delete the product from MongoDB
    await Produto.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Produto e todas as imagens deletados com sucesso',
      deletedImages: filesToDelete.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      erro: error.message || 'Erro ao deletar produto'
    });
  }
});

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/meu_banco';

// Conectar ao MongoDB com tratamento de erro
mongoose.connect(mongoUri, {
    dbName: 'meu_banco',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000
}).catch(error => {
  console.error('Erro ao conectar ao MongoDB:', error.message);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Exportar para Vercel/serverless e para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server rodando na porta ${PORT}`);
  });
}

module.exports = app;
