/**
 * CCCP Factory Portal Utilities
 * Centralized utilities for API calls, UI helpers, and shared functionality
 */
window.ProjectUtils = (() => {
  'use strict';

  // =============================================================================
  // CONFIGURATION
  // =============================================================================
  const CONFIG = {
    API: {
      // Entity name: ccc_order (from table permissions file)
      ORDERS: "/_api/ccc_orders",
      ORDERLINES: "/_api/ccc_orderlines",  // Try plural
      RESOURCES: "/_api/ccc_resources",
      HARVESTERS: "/_api/ccc_harvesters",
      HARVESTERSUMMARIES: "/_api/ccc_harvestersummaries"
    },
    EVENTS: {
      ORDER_CREATED: 'order:created'
    }
  };

  // =============================================================================
  // API UTILITIES
  // =============================================================================
  const ApiUtils = {
    /**
     * Promise-based wrapper for webapi.safeAjax with header access
     * @param {Object} options - Ajax options
     * @returns {Promise} - Promise that resolves with response data and xhr
     */
    ajax(options) {
      return new Promise((resolve, reject) => {
        webapi.safeAjax({
          ...options,
          success: function(data, textStatus, xhr) {
            // Resolve with both data and xhr for header access
            resolve({ data, xhr });
          },
          error: reject
        });
      });
    },

    /**
     * Create a new order in Dataverse
     * @param {Object} orderData - Order data object
     * @param {string} orderData.ccc_ordername - Order name
     * @param {string} orderData.contactId - Contact ID for lookup
     * @param {string} orderData.ccc_orderdate - Order date (ISO format)
     * @returns {Promise<string>} - Created order ID
     */
    async createOrder(orderData) {
      try {
        // Build the order object with resource name and date
        const payload = {
          ccc_ordername: orderData.ccc_ordername
        };

        // Add contact lookup if provided
        if (orderData.contactId) {
          payload["ccc_ordercontact@odata.bind"] = `/contacts(${orderData.contactId})`;
        }

        // Add order date if provided
        if (orderData.ccc_orderdate) {
          payload.ccc_orderdate = orderData.ccc_orderdate;
        }

        console.log('Creating order:', payload);

        const result = await this.ajax({
          type: "POST",
          url: CONFIG.API.ORDERS + "?$select=ccc_orderid",
          contentType: "application/json",
          headers: {
            "Prefer": "return=representation"
          },
          data: JSON.stringify(payload)
        });

        console.log('✅ Order created successfully!');
        console.log('Response data:', result.data);
        console.log('XHR object:', result.xhr);
        
        // Try to get ID from response body first
        let orderId = result.data?.ccc_orderid || result.data?.id;
        
        // If no body, try to extract from headers
        if (!orderId && result.xhr) {
          const entityIdHeader = result.xhr.getResponseHeader('OData-EntityId') || 
                                 result.xhr.getResponseHeader('entityid') ||
                                 result.xhr.getResponseHeader('Location');
          console.log('EntityId header:', entityIdHeader);
          
          if (entityIdHeader) {
            // Extract GUID from URL: ...ccc_orders(guid-here)
            const match = entityIdHeader.match(/\(([^)]+)\)/);
            orderId = match ? match[1] : null;
          }
        }
        
        console.log('Extracted orderId:', orderId);
        
        if (!orderId) {
          throw new Error('Could not extract order ID from response');
        }
        
        return orderId;

      } catch (error) {
        console.error('❌ Failed to create order:', error);
        throw error;
      }
    },

    /**
     * Create an order line linked to an order
     * @param {string} orderId - Parent order ID
     * @param {Object} lineData - Order line data
     * @param {string} lineData.resourceId - Resource ID for lookup
     * @param {number} lineData.quantity - Quantity
     * @param {number} lineData.pricePerUnit - Price per unit
     * @returns {Promise<string>} - Created order line ID
     */
    async createOrderLine(orderId, lineData) {
      try {
        console.log('🔍 createOrderLine called with:');
        console.log('  - orderId:', orderId);
        console.log('  - lineData:', lineData);
        console.log('  - resourceId:', lineData.resourceId);
        console.log('  - quantity:', lineData.quantity);
        console.log('  - pricePerUnit:', lineData.pricePerUnit);

        const cleanOrderId = String(orderId).replace(/[{}]/g, '');
        const cleanResourceId = String(lineData.resourceId).replace(/[{}]/g, '');

        console.log('🔍 After cleaning:');
        console.log('  - cleanOrderId:', cleanOrderId);
        console.log('  - cleanResourceId:', cleanResourceId);

        // Calculate total price
        const totalPrice = lineData.quantity * lineData.pricePerUnit;
        console.log('💰 Calculated total price:', totalPrice);

        const payload = {
          ccc_quantity: lineData.quantity,
          ccc_orderlineprice: totalPrice
        };

        // Link to parent order
        if (orderId) {
          payload["ccc_order@odata.bind"] = `/ccc_orders(${cleanOrderId})`;
        }

        // Link to resource
        if (lineData.resourceId) {
          payload["ccc_resource@odata.bind"] = `/ccc_resources(${cleanResourceId})`;
        }

        console.log('📦 Final payload:', payload);
        console.log('🌐 Posting to:', CONFIG.API.ORDERLINES);

        const result = await this.ajax({
          type: "POST",
          url: CONFIG.API.ORDERLINES + "?$select=ccc_orderlineid",
          contentType: "application/json",
          headers: {
            "Prefer": "return=representation"
          },
          data: JSON.stringify(payload)
        });

        console.log('✅ Order line created successfully!');
        console.log('Response data:', result.data);
        
        // Try to get ID from response body first
        let lineId = result.data?.ccc_orderlineid || result.data?.id;
        
        // If no body, try to extract from headers
        if (!lineId && result.xhr) {
          const entityIdHeader = result.xhr.getResponseHeader('OData-EntityId') || 
                                 result.xhr.getResponseHeader('entityid') ||
                                 result.xhr.getResponseHeader('Location');
          console.log('EntityId header:', entityIdHeader);
          
          if (entityIdHeader) {
            const match = entityIdHeader.match(/\(([^)]+)\)/);
            lineId = match ? match[1] : null;
          }
        }
        
        console.log('Extracted lineId:', lineId);
        
        if (!lineId) {
          throw new Error('Could not extract order line ID from response');
        }
        
        return lineId;

      } catch (error) {
        console.error('❌ Failed to create order line:', error);
        throw error;
      }
    },

    /**
     * Update resource quantity (subtract ordered amount)
     * @param {string} resourceId - Resource ID to update
     * @param {number} newQuantity - New quantity value
     * @returns {Promise<void>}
     */
    async updateResourceQuantity(resourceId, newQuantity) {
      try {
        const cleanResourceId = String(resourceId).replace(/[{}]/g, '');

        console.log('Updating resource quantity:', resourceId, 'New quantity:', newQuantity);

        await this.ajax({
          type: "PATCH",
          url: `${CONFIG.API.RESOURCES}(${cleanResourceId})`,
          contentType: "application/json",
          data: JSON.stringify({
            ccc_quantity: newQuantity
          })
        });

        console.log('✅ Resource quantity updated successfully!');

      } catch (error) {
        console.error('❌ Failed to update resource quantity:', error);
        throw error;
      }
    },

    /**
     * Get orders for a specific contact
     * @param {string} contactId - Contact ID
     * @returns {Promise<Array>} - Array of orders
     */
    async getOrdersByContact(contactId) {
      try {
        const cleanContactId = String(contactId).replace(/[{}]/g, '');
        
        const url = CONFIG.API.ORDERS
          + "?$select=ccc_orderid,ccc_ordername,ccc_orderdate,createdon,statuscode"
          + "&$filter=_ccc_ordercontact_value eq " + cleanContactId
          + "&$orderby=createdon desc";

        console.log('Fetching orders for contact:', cleanContactId);

        const result = await this.ajax({
          type: "GET",
          url: url,
          contentType: "application/json"
        });

        const orders = result.data?.value || [];
        console.log(`✅ Loaded ${orders.length} orders`);
        return orders;

      } catch (error) {
        console.error('❌ Failed to fetch orders:', error);
        throw error;
      }
    },

    /**
     * Get order details with order lines
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Order with lines
     */
    async getOrderDetails(orderId) {
      try {
        const cleanOrderId = String(orderId).replace(/[{}]/g, '');
        
        // Fetch order
        const orderUrl = CONFIG.API.ORDERS + `(${cleanOrderId})`
          + "?$select=ccc_orderid,ccc_ordername,ccc_orderdate,createdon,statuscode"
          + "&$expand=ccc_ordercontact($select=fullname,emailaddress1)";

        const orderResult = await this.ajax({
          type: "GET",
          url: orderUrl,
          contentType: "application/json"
        });

        const order = orderResult.data;

        // Fetch order lines
        const linesUrl = CONFIG.API.ORDERLINES
          + "?$select=ccc_orderlineid,ccc_quantity,ccc_orderlineprice"
          + "&$filter=_ccc_order_value eq " + cleanOrderId
          + "&$expand=ccc_resource($select=ccc_resourcename,ccc_priceperunit)";

        const linesResult = await this.ajax({
          type: "GET",
          url: linesUrl,
          contentType: "application/json"
        });

        const orderLines = linesResult.data?.value || [];
        
        console.log('✅ Loaded order details with', orderLines.length, 'lines');
        
        return {
          order,
          orderLines
        };

      } catch (error) {
        console.error('❌ Failed to fetch order details:', error);
        throw error;
      }
    },

    /**
     * Get harvester activity/summary for a specific harvester
     * @param {string} harvesterId - Harvester ID
     * @param {number} limit - Number of records to return (default 5)
     * @returns {Promise<Array>} - Array of harvest summary records
     */
    async getHarvesterActivity(harvesterId, limit = 5) {
      try {
        const cleanHarvesterId = String(harvesterId).replace(/[{}]/g, '');
        
        const url = CONFIG.API.HARVESTERSUMMARIES
          + "?$select=ccc_harvestersummaryid,ccc_quantity,createdon"
          + "&$filter=_ccc_harvester_value eq " + cleanHarvesterId
          + "&$expand=ccc_resource($select=ccc_resourcename)"
          + "&$orderby=createdon desc"
          + "&$top=" + limit;

        console.log('Fetching harvester activity:', cleanHarvesterId);

        const result = await this.ajax({
          type: "GET",
          url: url,
          contentType: "application/json"
        });

        const activities = result.data?.value || [];
        console.log(`✅ Loaded ${activities.length} harvester activities`);
        return activities;

      } catch (error) {
        console.error('❌ Failed to fetch harvester activity:', error);
        throw error;
      }
    },

    /**
     * Update harvester status (activate/deactivate)
     * @param {string} harvesterId - Harvester ID
     * @param {number} statecode - State code (0=Active, 1=Inactive)
     * @returns {Promise<void>}
     */
    async updateHarvesterStatus(harvesterId, statecode) {
      try {
        const cleanHarvesterId = String(harvesterId).replace(/[{}]/g, '');
        const statuscode = statecode === 0 ? 1 : 2; // 1=Active, 2=Inactive

        console.log('Updating harvester status:', { harvesterId: cleanHarvesterId, statecode, statuscode });

        await this.ajax({
          type: "PATCH",
          url: `${CONFIG.API.HARVESTERS}(${cleanHarvesterId})`,
          contentType: "application/json",
          data: JSON.stringify({
            statecode: statecode,
            statuscode: statuscode
          })
        });

        console.log('✅ Harvester status updated successfully');

      } catch (error) {
        console.error('❌ Failed to update harvester status:', error);
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
        button.dataset.originalText = button.textContent;
        button.textContent = 'Processing...';
      } else {
        button.removeAttribute('disabled');
        if (button.dataset.originalText) {
          button.textContent = button.dataset.originalText;
          delete button.dataset.originalText;
        }
      }
    },

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success/danger/info/warning)
     */
    showAlert(message, type = 'info') {
      const alertContainer = document.getElementById('alertContainer');
      if (!alertContainer) {
        console.warn('Alert container not found');
        return;
      }

      // Map type to Bootstrap classes
      const alertClass = `alert-${type}`;
      
      alertContainer.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
          ${this.escapeHtml(message)}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;

      // Auto-hide after 5 seconds
      setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
          alert.classList.remove('show');
          setTimeout(() => {
            alertContainer.innerHTML = '';
          }, 150);
        }
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
    },

    /**
     * Show custom confirmation dialog
     * @param {Object} options - Confirmation options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Confirmation message
     * @param {string} options.confirmText - Confirm button text (default: "Confirm")
     * @param {string} options.cancelText - Cancel button text (default: "Cancel")
     * @param {string} options.type - Type: 'warning', 'danger', 'info', 'success' (default: 'warning')
     * @returns {Promise<boolean>} - True if confirmed, false if cancelled
     */
    showConfirm(options) {
      return new Promise((resolve) => {
        const {
          title = 'Confirm Action',
          message = 'Are you sure?',
          confirmText = 'Confirm',
          cancelText = 'Cancel',
          type = 'warning'
        } = options;

        // Icon mapping
        const icons = {
          warning: 'fa-triangle-exclamation',
          danger: 'fa-circle-exclamation',
          info: 'fa-circle-info',
          success: 'fa-circle-check'
        };

        // Color mapping
        const colors = {
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
          success: '#10b981'
        };

        const icon = icons[type] || icons.warning;
        const color = colors[type] || colors.warning;

        // Create modal HTML
        const modalId = 'cccpConfirmModal_' + Date.now();
        const modalHtml = `
          <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content cccp-modal" style="border: 3px solid #991b1b; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);">
                <div class="modal-header cccp-modal-header">
                  <h5 class="modal-title fw-bold">
                    <i class="fa-solid ${icon} me-2"></i>${this.escapeHtml(title)}
                  </h5>
                </div>
                <div class="modal-body cccp-modal-body">
                  <div class="text-center mb-3">
                    <i class="fa-solid ${icon}" style="font-size: 3rem; color: ${color};"></i>
                  </div>
                  <p class="text-center mb-0" style="font-size: 1rem; color: #4b5563;">
                    ${this.escapeHtml(message)}
                  </p>
                </div>
                <div class="modal-footer cccp-modal-footer">
                  <button type="button" class="btn cccp-btn-cancel" data-action="cancel">
                    <i class="fa-solid fa-times me-2"></i>${this.escapeHtml(cancelText)}
                  </button>
                  <button type="button" class="btn cccp-btn-confirm" data-action="confirm">
                    <i class="fa-solid fa-check me-2"></i>${this.escapeHtml(confirmText)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);

        // Handle button clicks
        modalElement.addEventListener('click', (e) => {
          const action = e.target.closest('[data-action]')?.dataset.action;
          if (action) {
            modal.hide();
            resolve(action === 'confirm');
          }
        });

        // Clean up after modal is hidden
        modalElement.addEventListener('hidden.bs.modal', () => {
          modalElement.remove();
        });

        // Show modal
        modal.show();
      });
    },

    /**
     * Show custom notification/alert
     * @param {Object} options - Notification options
     * @param {string} options.title - Notification title
     * @param {string} options.message - Notification message
     * @param {string} options.type - Type: 'success', 'error', 'info', 'warning' (default: 'info')
     * @returns {Promise<void>}
     */
    showNotification(options) {
      return new Promise((resolve) => {
        const {
          title = 'Notification',
          message = '',
          type = 'info'
        } = options;

        // Icon and color mapping
        const config = {
          success: { icon: 'fa-circle-check', color: '#10b981' },
          error: { icon: 'fa-circle-exclamation', color: '#ef4444' },
          warning: { icon: 'fa-triangle-exclamation', color: '#f59e0b' },
          info: { icon: 'fa-circle-info', color: '#3b82f6' }
        };

        const { icon, color } = config[type] || config.info;

        // Create modal HTML
        const modalId = 'cccpNotificationModal_' + Date.now();
        const modalHtml = `
          <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content cccp-modal" style="border: 3px solid #991b1b; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);">
                <div class="modal-header cccp-modal-header">
                  <h5 class="modal-title fw-bold">
                    <i class="fa-solid ${icon} me-2"></i>${this.escapeHtml(title)}
                  </h5>
                </div>
                <div class="modal-body cccp-modal-body">
                  <div class="text-center mb-3">
                    <i class="fa-solid ${icon}" style="font-size: 3rem; color: ${color};"></i>
                  </div>
                  <p class="text-center mb-0" style="font-size: 1rem; color: #4b5563;">
                    ${this.escapeHtml(message)}
                  </p>
                </div>
                <div class="modal-footer cccp-modal-footer">
                  <button type="button" class="btn cccp-btn-confirm" data-bs-dismiss="modal">
                    <i class="fa-solid fa-check me-2"></i>OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalElement = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalElement);

        // Clean up and resolve after modal is hidden
        modalElement.addEventListener('hidden.bs.modal', () => {
          modalElement.remove();
          resolve();
        });

        // Show modal
        modal.show();
      });
    }
  };

  // =============================================================================
  // DATE UTILITIES
  // =============================================================================
  const DateUtils = {
    /**
     * Get current date in ISO format (YYYY-MM-DD)
     * @returns {string} - ISO date string
     */
    getCurrentDate() {
      return new Date().toISOString().split('T')[0];
    },

    /**
     * Format date for display
     * @param {string|Date} date - Date to format
     * @returns {string} - Formatted date string
     */
    formatDate(date) {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // =============================================================================
  // PUBLIC API
  // =============================================================================
  return {
    CONFIG,
    ApiUtils,
    UiUtils,
    DateUtils
  };
})();

console.log("✅ ProjectUtils loaded successfully");