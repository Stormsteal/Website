const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import services
const ProductService = require('../services/productService');
const { logger } = require('../utils/logger');

// Validation middleware
const validateProduct = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Produktname muss zwischen 2 und 100 Zeichen lang sein'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Beschreibung muss zwischen 10 und 500 Zeichen lang sein'),
  body('price').isFloat({ min: 0 }).withMessage('Gültiger Preis erforderlich'),
  body('category').optional().trim().isLength({ max: 50 }).withMessage('Kategorie zu lang'),
  body('imageUrl').optional().isURL().withMessage('Gültige Bild-URL erforderlich'),
  body('available').optional().isBoolean().withMessage('Verfügbarkeit muss boolean sein')
];

// GET /api/products - Get all products
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      available,
      sort = 'name'
    } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (available !== undefined) filters.available = available === 'true';

    const products = await ProductService.getProducts({
      page: parseInt(page),
      limit: parseInt(limit),
      filters,
      sort
    });

    res.json({
      success: true,
      data: products.products,
      pagination: {
        page: products.page,
        limit: products.limit,
        total: products.total,
        pages: Math.ceil(products.total / products.limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Produkte'
    });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produkt nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Produkts'
    });
  }
});

// POST /api/products - Create new product (admin only)
router.post('/', validateProduct, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const productData = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const product = await ProductService.createProduct(productData);

    logger.info('Product created successfully', {
      productId: product.id,
      name: product.name
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Produkt erfolgreich erstellt'
    });

  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Produkts'
    });
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', validateProduct, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    const product = await ProductService.updateProduct(id, updateData);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produkt nicht gefunden'
      });
    }

    logger.info('Product updated successfully', {
      productId: id,
      name: product.name
    });

    res.json({
      success: true,
      data: product,
      message: 'Produkt erfolgreich aktualisiert'
    });

  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Produkts'
    });
  }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductService.deleteProduct(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produkt nicht gefunden'
      });
    }

    logger.info('Product deleted', {
      productId: id,
      name: product.name
    });

    res.json({
      success: true,
      data: product,
      message: 'Produkt erfolgreich gelöscht'
    });

  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Produkts'
    });
  }
});

// GET /api/products/categories - Get all product categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await ProductService.getCategories();

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Kategorien'
    });
  }
});

// PUT /api/products/:id/stock - Update product stock
router.put('/:id/stock', [
  body('quantity').isInt({ min: 0 }).withMessage('Gültige Menge erforderlich')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { quantity } = req.body;

    const product = await ProductService.updateStock(id, quantity);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produkt nicht gefunden'
      });
    }

    logger.info('Product stock updated', {
      productId: id,
      newStock: quantity
    });

    res.json({
      success: true,
      data: product,
      message: 'Lagerbestand erfolgreich aktualisiert'
    });

  } catch (error) {
    logger.error('Error updating product stock:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Lagerbestands'
    });
  }
});

module.exports = router;
