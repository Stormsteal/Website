const { logger } = require('../utils/logger');

// In-memory storage for demo (replace with database in production)
let reviews = new Map();
let reviewStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  averageRating: 0
};

// Initialize with sample reviews
const sampleReviews = [
  {
    id: '1',
    author: 'Mia Schmidt',
    rating: 5,
    text: 'Frischer geht\'s nicht! Mein täglicher Green Power ist einfach perfekt. Tolle Qualität und super Service.',
    product: 'Green Power',
    status: 'approved',
    helpful: 12,
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z'
  },
  {
    id: '2',
    author: 'Jonas Weber',
    rating: 5,
    text: 'Schnell, lecker, nachhaltig. Genau mein Ding. Die Säfte sind immer frisch und die Preise fair.',
    product: 'Sunny Orange',
    status: 'approved',
    helpful: 8,
    createdAt: '2025-01-14T14:20:00.000Z',
    updatedAt: '2025-01-14T14:20:00.000Z'
  },
  {
    id: '3',
    author: 'Lea Müller',
    rating: 4,
    text: 'Berry Boost ist mein Favorit – nicht zu süß, superfruchtig! Würde gerne mehr Sorten haben.',
    product: 'Berry Boost',
    status: 'approved',
    helpful: 15,
    createdAt: '2025-01-13T09:15:00.000Z',
    updatedAt: '2025-01-13T09:15:00.000Z'
  }
];

// Initialize sample data
sampleReviews.forEach(review => {
  reviews.set(review.id, review);
  reviewStats.total++;
  reviewStats.approved++;
});

class ReviewService {
  // Create new review
  static async createReview(reviewData) {
    const review = {
      ...reviewData,
      status: 'pending',
      helpful: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    reviews.set(review.id, review);
    reviewStats.total++;
    reviewStats.pending++;

    logger.info('Review created', {
      reviewId: review.id,
      author: review.author,
      rating: review.rating,
      product: review.product
    });

    return review;
  }

  // Get reviews with filtering and pagination
  static async getReviews(options = {}) {
    const { page = 1, limit = 10, filters = {}, sort = 'newest' } = options;
    
    let filteredReviews = Array.from(reviews.values());
    
    // Apply filters
    if (filters.rating) {
      filteredReviews = filteredReviews.filter(review => review.rating >= filters.rating);
    }
    
    if (filters.product) {
      filteredReviews = filteredReviews.filter(review => 
        review.product && review.product.toLowerCase().includes(filters.product.toLowerCase())
      );
    }

    // Only show approved reviews for public API
    filteredReviews = filteredReviews.filter(review => review.status === 'approved');

    // Apply sorting
    switch (sort) {
      case 'newest':
        filteredReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filteredReviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'rating':
        filteredReviews.sort((a, b) => b.rating - a.rating);
        break;
      case 'helpful':
        filteredReviews.sort((a, b) => b.helpful - a.helpful);
        break;
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

    return {
      reviews: paginatedReviews,
      total: filteredReviews.length,
      page,
      limit,
      totalPages: Math.ceil(filteredReviews.length / limit)
    };
  }

  // Get latest reviews for preview
  static async getLatestReviews(limit = 5) {
    const approvedReviews = Array.from(reviews.values())
      .filter(review => review.status === 'approved')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    return approvedReviews;
  }

  // Get review by ID
  static async getReviewById(reviewId) {
    return reviews.get(reviewId) || null;
  }

  // Update review status (moderation)
  static async updateReviewStatus(reviewId, status, moderatorNotes = '') {
    const review = reviews.get(reviewId);
    if (!review) {
      return null;
    }

    const oldStatus = review.status;
    
    // Update review
    review.status = status;
    review.updatedAt = new Date().toISOString();
    
    if (moderatorNotes) {
      review.moderatorNotes = moderatorNotes;
    }

    reviews.set(reviewId, review);

    // Update stats
    if (reviewStats[oldStatus] > 0) {
      reviewStats[oldStatus]--;
    }
    if (reviewStats[status] !== undefined) {
      reviewStats[status]++;
    }

    logger.info('Review status updated', {
      reviewId,
      author: review.author,
      oldStatus,
      newStatus: status
    });

    return {
      ...review,
      previousStatus: oldStatus
    };
  }

  // Mark review as helpful
  static async markAsHelpful(reviewId) {
    const review = reviews.get(reviewId);
    if (!review) {
      return null;
    }

    review.helpful++;
    review.updatedAt = new Date().toISOString();
    reviews.set(reviewId, review);

    logger.info('Review marked as helpful', {
      reviewId,
      author: review.author,
      helpfulCount: review.helpful
    });

    return review;
  }

  // Delete review
  static async deleteReview(reviewId) {
    const review = reviews.get(reviewId);
    if (!review) {
      return null;
    }

    const oldStatus = review.status;
    reviews.delete(reviewId);

    // Update stats
    if (reviewStats[oldStatus] > 0) {
      reviewStats[oldStatus]--;
    }
    reviewStats.total--;

    logger.info('Review deleted', {
      reviewId,
      author: review.author
    });

    return review;
  }

  // Get review statistics
  static async getReviewStats() {
    const approvedReviews = Array.from(reviews.values())
      .filter(review => review.status === 'approved');

    const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = approvedReviews.length > 0 ? 
      (totalRating / approvedReviews.length).toFixed(1) : 0;

    const ratingDistribution = {
      5: approvedReviews.filter(r => r.rating === 5).length,
      4: approvedReviews.filter(r => r.rating === 4).length,
      3: approvedReviews.filter(r => r.rating === 3).length,
      2: approvedReviews.filter(r => r.rating === 2).length,
      1: approvedReviews.filter(r => r.rating === 1).length
    };

    return {
      ...reviewStats,
      averageRating: parseFloat(averageRating),
      ratingDistribution,
      totalApproved: approvedReviews.length
    };
  }

  // Get pending reviews for moderation
  static async getPendingReviews() {
    return Array.from(reviews.values())
      .filter(review => review.status === 'pending')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  // Search reviews
  static async searchReviews(query) {
    const searchTerm = query.toLowerCase();
    
    return Array.from(reviews.values()).filter(review => 
      review.author.toLowerCase().includes(searchTerm) ||
      review.text.toLowerCase().includes(searchTerm) ||
      (review.product && review.product.toLowerCase().includes(searchTerm))
    );
  }

  // Get reviews by product
  static async getReviewsByProduct(productName) {
    return Array.from(reviews.values())
      .filter(review => 
        review.status === 'approved' && 
        review.product && 
        review.product.toLowerCase() === productName.toLowerCase()
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get reviews by rating
  static async getReviewsByRating(rating) {
    return Array.from(reviews.values())
      .filter(review => 
        review.status === 'approved' && 
        review.rating === rating
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Bulk moderate reviews
  static async bulkModerateReviews(reviewIds, status, moderatorNotes = '') {
    const results = [];
    
    for (const reviewId of reviewIds) {
      try {
        const result = await this.updateReviewStatus(reviewId, status, moderatorNotes);
        results.push({ reviewId, success: true, review: result });
      } catch (error) {
        results.push({ reviewId, success: false, error: error.message });
      }
    }

    logger.info('Bulk moderation completed', {
      totalReviews: reviewIds.length,
      status,
      successful: results.filter(r => r.success).length
    });

    return results;
  }

  // Cleanup old rejected reviews (cron job)
  static async cleanupRejectedReviews() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [reviewId, review] of reviews.entries()) {
      if (review.status === 'rejected' && 
          new Date(review.updatedAt) < thirtyDaysAgo) {
        reviews.delete(reviewId);
        reviewStats.rejected--;
        reviewStats.total--;
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up rejected reviews', { cleanedCount });
    }

    return cleanedCount;
  }
}

module.exports = ReviewService;
