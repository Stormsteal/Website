const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import services
const ReviewService = require('../services/reviewService');
const { logger } = require('../utils/logger');

// Validation middleware
const validateReview = [
  body('author').trim().isLength({ min: 2, max: 50 }).withMessage('Name muss zwischen 2 und 50 Zeichen lang sein'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Bewertung muss zwischen 1 und 5 Sternen liegen'),
  body('text').trim().isLength({ min: 10, max: 500 }).withMessage('Bewertungstext muss zwischen 10 und 500 Zeichen lang sein'),
  body('product').optional().trim().isLength({ max: 100 }).withMessage('Produktname zu lang')
];

// GET /api/reviews - Get all reviews with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      rating, 
      sort = 'newest',
      product 
    } = req.query;

    const filters = {};
    if (rating) filters.rating = parseInt(rating);
    if (product) filters.product = product;

    const reviews = await ReviewService.getReviews({
      page: parseInt(page),
      limit: parseInt(limit),
      filters,
      sort
    });

    res.json({
      success: true,
      data: reviews.reviews,
      pagination: {
        page: reviews.page,
        limit: reviews.limit,
        total: reviews.total,
        pages: Math.ceil(reviews.total / reviews.limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Bewertungen'
    });
  }
});

// GET /api/reviews/latest - Get latest reviews for preview
router.get('/latest', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const reviews = await ReviewService.getLatestReviews(parseInt(limit));

    res.json({
      success: true,
      data: reviews
    });

  } catch (error) {
    logger.error('Error fetching latest reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der neuesten Bewertungen'
    });
  }
});

// GET /api/reviews/stats - Get review statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await ReviewService.getReviewStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching review stats:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Bewertungsstatistiken'
    });
  }
});

// POST /api/reviews - Create new review
router.post('/', validateReview, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const reviewData = {
      id: uuidv4(),
      ...req.body,
      status: 'pending', // Requires moderation
      helpful: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const review = await ReviewService.createReview(reviewData);

    logger.info('Review created successfully', {
      reviewId: review.id,
      author: review.author,
      rating: review.rating
    });

    res.status(201).json({
      success: true,
      data: review,
      message: 'Bewertung erfolgreich erstellt und wartet auf Freigabe'
    });

  } catch (error) {
    logger.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Bewertung'
    });
  }
});

// PUT /api/reviews/:id/helpful - Mark review as helpful
router.put('/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ReviewService.markAsHelpful(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Bewertung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: review,
      message: 'Bewertung als hilfreich markiert'
    });

  } catch (error) {
    logger.error('Error marking review as helpful:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Markieren der Bewertung'
    });
  }
});

// PUT /api/reviews/:id/status - Update review status (admin only)
router.put('/:id/status', [
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Gültiger Status erforderlich'),
  body('moderatorNotes').optional().trim()
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
    const { status, moderatorNotes } = req.body;

    const review = await ReviewService.updateReviewStatus(id, status, moderatorNotes);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Bewertung nicht gefunden'
      });
    }

    logger.info('Review status updated', {
      reviewId: id,
      oldStatus: review.previousStatus,
      newStatus: status
    });

    res.json({
      success: true,
      data: review,
      message: 'Bewertungsstatus erfolgreich aktualisiert'
    });

  } catch (error) {
    logger.error('Error updating review status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Bewertungsstatus'
    });
  }
});

// DELETE /api/reviews/:id - Delete review (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ReviewService.deleteReview(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Bewertung nicht gefunden'
      });
    }

    logger.info('Review deleted', {
      reviewId: id,
      author: review.author
    });

    res.json({
      success: true,
      data: review,
      message: 'Bewertung erfolgreich gelöscht'
    });

  } catch (error) {
    logger.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Bewertung'
    });
  }
});

module.exports = router;
