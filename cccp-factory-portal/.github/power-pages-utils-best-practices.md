# Power Pages API & Utilities Best Practices

**Quick reference guide for Power Pages projects with Dataverse Web API integration.**

---

## 🏗️ Architecture Pattern

### File Structure
```
web-files/
├── utils.js                 # ⭐ Global utilities (load FIRST)
└── resources-page.js        # Page-specific logic

web-templates/
└── api-wrapper/             # API token provider
```

### Loading Order (Critical)
```html
<!-- 1. API Wrapper (provides webapi.safeAjax) -->
{% include 'API Wrapper' %}

<!-- 2. Utilities (shared functions) -->
<script src="~/utils.js"></script>

<!-- 3. Page scripts -->
<script src="~/resources-page.js"></script>
```

---

## 📦 utils.js Structure

**Purpose**: Single source of shared functionality across all pages/components.

```javascript
window.ProjectUtils = (() => {
  'use strict';

  // =============================================================================
  // CONFIGURATION
  // =============================================================================
  const CONFIG = {
    CACHE_KEYS: {
      ORDERS: 'cached_orders'
    },
    EVENTS: {
      ORDERS_UPDATED: 'orders:updated'
    }
  };

  // =============================================================================
  // CACHE UTILITIES (sessionStorage)
  // =============================================================================
  const CacheUtils = {
    /**
     * Get cached orders from sessionStorage
     * @returns {Array|null} - Cached orders or null if not found/expired
     */
    getOrders() {
      try {
        const cached = sessionStorage.getItem(CONFIG.CACHE_KEYS.ORDERS);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        // Optional: Add timestamp check for expiration
        // if (Date.now() - data.timestamp > 300000) return null; // 5 min
        
        return data.orders || null;
      } catch (error) {
        console.error('Cache read error:', error);
        return null;
      }
    },

    /**
     * Store orders in sessionStorage
     * @param {Array} orders - Orders array to cache
     */
    setOrders(orders) {
      try {
        const cacheData = {
          orders: orders,
          timestamp: Date.now()
        };
        sessionStorage.setItem(CONFIG.CACHE_KEYS.ORDERS, JSON.stringify(cacheData));
      } catch (error) {
        console.error('Cache write error:', error);
      }
    },

    /**
     * Clear orders cache
     */
    clearOrders() {
      sessionStorage.removeItem(CONFIG.CACHE_KEYS.ORDERS);
    }
  };

  // =============================================================================
  // API UTILITIES
  // =============================================================================
  const ApiUtils = {
    /**
     * Fetch orders from Dataverse (with cache)
     * @returns {Promise<Array>} - Array of orders
     */
    async getOrders() {
      // 1. Check cache first
      const cached = CacheUtils.getOrders();
      if (cached !== null) {
        console.log('Orders loaded from cache');
        return cached;
      }

      // 2. Fetch from API
      const url = "/_api/ccc_orders"
        + "?$select=ccc_orderid,ccc_name,ccc_status,createdon"
        + "&$orderby=createdon desc";

      try {
        const response = await webapi.safeAjax({
          type: "GET",
          url: url,
          contentType: "application/json"
        });

        const orders = response.value || [];
        
        // 3. Cache the result
        CacheUtils.setOrders(orders);
        
        console.log(`Loaded ${orders.length} orders from API`);
        return orders;

      } catch (error) {
        console.error('Failed to fetch orders:', error);
        throw error;
      }
    },

    /**
     * Create a new order
     * @param {Object} orderData - Order data object
     * @returns {Promise<string>} - Created order ID
     */
    async createOrder(orderData) {
      try {
        const response = await webapi.safeAjax({
          type: "POST",
          url: "/_api/ccc_orders",
          contentType: "application/json",
          data: JSON.stringify(orderData)
        });

        // Invalidate cache after mutation
        CacheUtils.clearOrders();

        // Extract ID from response header or body
        const orderId = response.ccc_orderid || 
                       response.id || 
                       response.headers?.get('entityid');
        
        console.log('Order created:', orderId);
        return orderId;

      } catch (error) {
        console.error('Failed to create order:', error);
        throw error;
      }
    }
  };

  // =============================================================================
  // UI UTILITIES
  // =============================================================================
  const UiUtils = {
    /**
     * Set button loading state
     * @param {HTMLElement} button - Button element
     * @param {boolean} isLoading - Loading state
     */
    setButtonLoading(button, isLoading) {
      if (!button) return;
      
      if (isLoading) {
        button.setAttribute('disabled', '');
        button.setAttribute('isLoading', '');
      } else {
        button.removeAttribute('disabled');
        button.removeAttribute('isLoading');
      }
    },

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success/danger/info/warning)
     */
    showAlert(message, type = 'info') {
      const alertContainer = document.getElementById('alertContainer');
      if (!alertContainer) return;

      alertContainer.innerHTML = `
        <pkt-alert skin="${type}">
          <span>${this.escapeHtml(message)}</span>
        </pkt-alert>
      `;

      // Auto-hide after 5 seconds
      setTimeout(() => {
        alertContainer.innerHTML = '';
      }, 5000);
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };

  // =============================================================================
  // PUBLIC API
  // =============================================================================
  return {
    CONFIG,
    CacheUtils,
    ApiUtils,
    UiUtils
  };
})();
```

---

## 🎯 Usage in Page Scripts

### Example: resources-page.js

```javascript
(() => {
  'use strict';

  // =============================================================================
  // IMPORT UTILITIES
  // =============================================================================
  const { ApiUtils, UiUtils, CONFIG } = window.ProjectUtils;

  // =============================================================================
  // DOM ELEMENTS (lazy getters)
  // =============================================================================
  const elements = {
    get createOrderBtn() { return document.getElementById('createOrderBtn'); },
    get ordersContainer() { return document.getElementById('ordersContainer'); },
    get alertContainer() { return document.getElementById('alertContainer'); }
  };

  // Early return if not on correct page
  if (!elements.createOrderBtn) return;

  // =============================================================================
  // FUNCTIONS
  // =============================================================================

  /**
   * Load and display orders
   */
  async function loadOrders() {
    try {
      const orders = await ApiUtils.getOrders();
      renderOrders(orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      UiUtils.showAlert('Could not load orders. Please refresh the page.', 'danger');
    }
  }

  /**
   * Render orders to DOM
   */
  function renderOrders(orders) {
    if (!elements.ordersContainer) return;

    if (orders.length === 0) {
      elements.ordersContainer.innerHTML = '<p>No orders found.</p>';
      return;
    }

    const html = orders.map(order => `
      <div class="order-item">
        <h4>${UiUtils.escapeHtml(order.ccc_name || 'Unnamed Order')}</h4>
        <p>Status: ${order.ccc_status || 'N/A'}</p>
        <p>Created: ${new Date(order.createdon).toLocaleDateString()}</p>
      </div>
    `).join('');

    elements.ordersContainer.innerHTML = html;
  }

  /**
   * Handle create order button click
   */
  async function handleCreateOrder(event) {
    const button = event.currentTarget;
    UiUtils.setButtonLoading(button, true);

    try {
      // Build order data
      const orderData = {
        ccc_name: "New Order",
        ccc_status: 1,
        // Add lookups like this:
        // "ccc_contact@odata.bind": `/contacts(${contactId})`
      };

      // Create order
      const orderId = await ApiUtils.createOrder(orderData);
      
      // Reload orders (will fetch fresh data since cache was cleared)
      await loadOrders();
      
      // Show success message
      UiUtils.showAlert('Order created successfully!', 'success');

      // Notify other components (optional)
      document.dispatchEvent(new CustomEvent(CONFIG.EVENTS.ORDERS_UPDATED, {
        detail: { orderId }
      }));

    } catch (error) {
      console.error('Failed to create order:', error);
      UiUtils.showAlert('Could not create order. Please try again.', 'danger');
    } finally {
      UiUtils.setButtonLoading(button, false);
    }
  }

  // =============================================================================
  // EVENT LISTENERS
  // =============================================================================
  function initialize() {
    // Load orders on page load
    loadOrders();

    // Create order button
    elements.createOrderBtn.addEventListener('click', handleCreateOrder);
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
```

---

## 🔑 Key Principles

### 1. **Cache-First Pattern**
```javascript
// ✅ Always check cache before API call
const cached = CacheUtils.getOrders();
if (cached !== null) return cached;

// Fetch from API only if cache miss
const data = await ApiUtils.getOrders();
```

### 2. **Invalidate After Mutations**
```javascript
// ✅ Clear cache after POST/PATCH/DELETE
await ApiUtils.createOrder(orderData);
CacheUtils.clearOrders(); // Force fresh data on next load
```

### 3. **Error Handling**
```javascript
// ✅ Always wrap API calls in try/catch
try {
  await ApiUtils.createOrder(orderData);
  UiUtils.showAlert('Success!', 'success');
} catch (error) {
  console.error('Error:', error);
  UiUtils.showAlert('Failed. Please try again.', 'danger');
}
```

### 4. **Loading States**
```javascript
// ✅ Disable button during API call
UiUtils.setButtonLoading(button, true);
try {
  await ApiUtils.createOrder(data);
} finally {
  UiUtils.setButtonLoading(button, false);
}
```

### 5. **IIFE Encapsulation**
```javascript
// ✅ Wrap all page scripts in IIFE
(() => {
  'use strict';
  // Your code here (no global pollution)
})();
```

---

## 📋 Quick Checklist

**Before implementing:**
- [ ] API Wrapper template included in page
- [ ] `utils.js` loaded before page scripts
- [ ] Scripts wrapped in IIFE with `'use strict'`
- [ ] Utilities imported from `window.ProjectUtils`
- [ ] Early return if component not on page

**For each API call:**
- [ ] Check cache first (GET operations)
- [ ] Wrapped in try/catch
- [ ] Loading state on button
- [ ] User feedback (success/error alert)
- [ ] Cache invalidated after mutations

**Code quality:**
- [ ] JSDoc comments on functions
- [ ] Descriptive variable names
- [ ] Lazy DOM element getters
- [ ] No hardcoded values
- [ ] Semantic HTML with data attributes

---

## 🔗 Common Patterns

### Lookup Fields (Relationships)
```javascript
// Link to another record via lookup
const orderData = {
  ccc_name: "Order Name",
  "ccc_contact@odata.bind": `/contacts(${contactId})`,
  "ccc_product@odata.bind": `/products(${productId})`
};
```

### Multi-Select Fields (Choices)
```javascript
// Set multi-select choice field
const orderData = {
  ccc_name: "Order",
  ccc_categories: [100000000, 100000001] // Array of choice values
};
```

### Filtering GET Requests
```javascript
// Filter by current user or specific criteria
const url = "/_api/ccc_orders"
  + "?$select=ccc_orderid,ccc_name"
  + "&$filter=_ccc_contact_value eq " + currentUserId
  + "&$orderby=createdon desc";
```

---

**Last Updated**: January 23, 2026  
**Based on**: Sommerskolen Kursportal patterns
