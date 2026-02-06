// OpenProject Assistant - Utility Functions

const Utils = {
  // Escape HTML special characters to prevent XSS attacks
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Format decimal hours as human-readable string (e.g., 1.5 → "1h 30m")
  formatHours(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  },

  // Convert decimal hours to ISO 8601 duration format (e.g., 1.5 → "PT1H30M")
  convertToISO8601(hours) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (m === 0) return `PT${h}H`;
    if (h === 0) return `PT${m}M`;
    return `PT${h}H${m}M`;
  },

  // Parse ISO 8601 duration format and convert to decimal hours (e.g., "PT1H30M" → 1.5)
  convertFromISO8601(duration) {
    if (!duration) return 0;

    const hoursMatch = duration.match(/(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);

    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

    return hours + minutes / 60;
  },

  // Debounce: Delay function execution until after wait time expires (prevents excessive calls)
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle: Limit function execution to once per wait time (useful for scroll/resize events)
  throttle(func, wait = 300) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), wait);
      }
    };
  },

  // Create a simple Map-based cache with maximum size limit (evicts oldest when full)
  createCache(maxSize = 100) {
    const cache = new Map();

    return {
      get(key) {
        return cache.get(key);
      },

      set(key, value) {
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, value);
      },

      has(key) {
        return cache.has(key);
      },

      clear() {
        cache.clear();
      },

      get size() {
        return cache.size;
      },
    };
  },

  // Wrapper for async functions with automatic error handling and logging
  async safeApiCall(apiFunc, errorMessage = 'API call failed') {
    try {
      return await apiFunc();
    } catch (error) {
      console.error(errorMessage, error);
      return { error: error.message };
    }
  },

  // Safely format date string to locale format, returns original on error
  formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  },

  // Build work package URL from server URL and work package ID
  getWorkPackageUrl(serverUrl, wpId) {
    return wpId ? `${serverUrl}/work_packages/${wpId}` : '#';
  },

  // Validate that end time is after start time, calculate hours if valid
  validateTimeRange(startTime, endTime, date) {
    if (!startTime || !endTime || !date) {
      return { valid: true }; // Optional fields
    }

    const startDate = new Date(`${date}T${startTime}`);
    const endDate = new Date(`${date}T${endTime}`);
    const diffMs = endDate - startDate;

    if (diffMs <= 0) {
      return {
        valid: false,
        error: 'End time must be after start time',
      };
    }

    return {
      valid: true,
      hours: diffMs / (1000 * 60 * 60),
    };
  },

  // Parse time range from comment format "(HH:MM - HH:MM) Comment text"
  extractTimeFromComment(comment) {
    if (!comment) return null;

    const timeMatch = comment.match(
      /^\((\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\)\s*(.*)/
    );
    if (timeMatch) {
      return {
        startTime: timeMatch[1],
        endTime: timeMatch[2],
        cleanComment: timeMatch[3],
      };
    }

    return null;
  },

  // Toggle loading state on button/element (disables and shows loading text)
  setLoading(element, isLoading, loadingText = 'Loading...') {
    if (isLoading) {
      element.disabled = true;
      element.dataset.originalText = element.textContent;
      element.textContent = loadingText;
    } else {
      element.disabled = false;
      if (element.dataset.originalText) {
        element.textContent = element.dataset.originalText;
        delete element.dataset.originalText;
      }
    }
  },

  // Convert status text to CSS class name (lowercase with hyphens)
  getStatusClass(status) {
    const statusLower = (status || '').toLowerCase().replace(/\s+/g, '-');
    return statusLower;
  },

  // Split array into smaller batches for processing
  batch(array, batchSize = 50) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  },

  // Async delay for specified milliseconds (useful for testing/rate limiting)
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  // Calculate ISO week number (1-53) for a given date
  getWeekNumber(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  },

  // Copy text to system clipboard using Navigator Clipboard API
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  },
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
