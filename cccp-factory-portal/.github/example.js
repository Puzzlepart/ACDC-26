/**
 * Sommerskolen Shared Utilities
 * Centralizes common functionality used across multiple components
 * Provides consistent API patterns, error handling, and DOM utilities
 * Reduces code duplication and improves maintainability
 */

// Sommerskolen Shared Utilities - Global namespace for common functionality
window.SommerskolenUtils = (() => {
  'use strict';

  // =============================================================================
  // CONSTANTS & CONFIGURATION
  // =============================================================================
  
  const CONFIG = {
    API: {
      SESSION_APPLICATIONS: "/_api/ude_sessionapplications",
      ACCOMMODATION_APPLICATIONS: "/_api/ude_accommodationapplications",
      SESSIONS: "/msevtmgt_sessions",
      MAX_APPLICATIONS_PER_CHILD: 5
    },
    PRIORITY: {
      // Map priority LABEL -> CRM VALUE (1:1 mapping)
      LABEL_TO_VALUE: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
      // Map CRM VALUE -> priority LABEL (1:1 mapping)
      VALUE_TO_LABEL: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
    },
    EVENTS: {
      CHILDREN_LOADED: 'children:loaded',
      WISHLIST_CHANGED: 'wishlist:changed'
    }
  };

  // =============================================================================
  // APPLICATION CACHE (sessionStorage)
  // =============================================================================
  
  /**
   * Application Data Cache using sessionStorage
   * Mirrors the pattern used for children cache in Sommerskolen-Get-Relations
   * Persists across page navigations within the same browser session
   */
  const ApplicationCache = (() => {
    const CACHE_PREFIX = 'ssk:applications:';
    const ACCOM_PREFIX = 'ssk:accommodation:';
    const ALLOCATED_SPOTS_PREFIX = 'ssk:allocatedspots:';

    return {
      /**
       * Get cached applications for a child
       * @param {string} childId - Child contact ID
       * @returns {Array|null} - Cached applications or null
       */
      getApplications(childId) {
        try {
          const key = `${CACHE_PREFIX}${childId}`;
          const cached = sessionStorage.getItem(key);
          if (!cached) return null;
          
          const data = JSON.parse(cached);
          console.log('📦 Cache hit: applications for', childId);
          return data.applications;
        } catch (error) {
          console.error('Error reading application cache:', error);
          return null;
        }
      },

      /**
       * Cache applications for a child
       * @param {string} childId - Child contact ID
       * @param {Array} applications - Applications array
       */
      setApplications(childId, applications) {
        try {
          const key = `${CACHE_PREFIX}${childId}`;
          sessionStorage.setItem(key, JSON.stringify({
            applications,
            timestamp: Date.now()
          }));
          console.log('💾 Cached applications for', childId);
        } catch (error) {
          console.error('Error writing application cache:', error);
        }
      },

      /**
       * Get cached accommodation object for a child
       * @param {string} childId - Child contact ID
       * @returns {Object|null|undefined} - Cached accommodation object, null (no accommodation), or undefined (not cached)
       */
      getAccommodation(childId) {
        try {
          const key = `${ACCOM_PREFIX}${childId}`;
          const cached = sessionStorage.getItem(key);
          if (!cached) return undefined;
          
          const data = JSON.parse(cached);
          console.log('📦 Cache hit: accommodation for', childId);
          return data.accommodation; // Returns full object or null
        } catch (error) {
          console.error('Error reading accommodation cache:', error);
          return undefined;
        }
      },

      /**
       * Cache accommodation object for a child
       * @param {string} childId - Child contact ID
       * @param {Object|null} accommodation - Full accommodation object or null if none exists
       */
      setAccommodation(childId, accommodation) {
        try {
          const key = `${ACCOM_PREFIX}${childId}`;
          sessionStorage.setItem(key, JSON.stringify({
            accommodation, // Store full object or null
            timestamp: Date.now()
          }));
          console.log('💾 Cached accommodation for', childId, accommodation ? '(has data)' : '(no accommodation)');
        } catch (error) {
          console.error('Error writing accommodation cache:', error);
        }
      },

      /**
       * Get cached allocated spots for a child
       * @param {string} childId - Child contact ID
       * @returns {Array|null} - Cached allocated spots or null
       */
      getAllocatedSpots(childId) {
        try {
          const key = `${ALLOCATED_SPOTS_PREFIX}${childId}`;
          const cached = sessionStorage.getItem(key);
          if (!cached) return null;
          
          const data = JSON.parse(cached);
          console.log('📦 Cache hit: allocated spots for', childId);
          return data.spots;
        } catch (error) {
          console.error('Error reading allocated spots cache:', error);
          return null;
        }
      },

      /**
       * Cache allocated spots for a child
       * @param {string} childId - Child contact ID
       * @param {Array} spots - Allocated spots array
       */
      setAllocatedSpots(childId, spots) {
        try {
          const key = `${ALLOCATED_SPOTS_PREFIX}${childId}`;
          sessionStorage.setItem(key, JSON.stringify({
            spots,
            timestamp: Date.now()
          }));
          console.log('💾 Cached allocated spots for', childId);
        } catch (error) {
          console.error('Error writing allocated spots cache:', error);
        }
      },

      /**
       * Invalidate cache for a specific child (when data changes)
       * @param {string} childId - Child contact ID
       */
      invalidateChild(childId) {
        try {
          sessionStorage.removeItem(`${CACHE_PREFIX}${childId}`);
          sessionStorage.removeItem(`${ACCOM_PREFIX}${childId}`);
          sessionStorage.removeItem(`${ALLOCATED_SPOTS_PREFIX}${childId}`);
          console.log('🗑️  Cache invalidated for child:', childId);
        } catch (error) {
          console.error('Error invalidating child cache:', error);
        }
      },

      /**
       * Invalidate all application/accommodation/allocated spots cache
       */
      invalidateAll() {
        try {
          const keys = Object.keys(sessionStorage);
          keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX) || key.startsWith(ACCOM_PREFIX) || key.startsWith(ALLOCATED_SPOTS_PREFIX)) {
              sessionStorage.removeItem(key);
            }
          });
          console.log('🗑️  All application cache cleared');
        } catch (error) {
          console.error('Error invalidating all cache:', error);
        }
      }
    };
  })();

  // =============================================================================
  // API UTILITIES
  // =============================================================================
  
  const ApiUtils = {
    /**
     * Promise-based wrapper for webapi.safeAjax
     * @param {Object} options - Ajax options
     * @returns {Promise} - Promise that resolves with response data
     */
    ajax(options) {
      return new Promise((resolve, reject) => {
        // Check if webapi and shell are available
        if (typeof webapi === 'undefined' || !webapi.safeAjax) {
          reject(new Error('webapi is not available. Please ensure the Portal Web API Wrapper is loaded.'));
          return;
        }
        
        if (typeof shell === 'undefined') {
          reject(new Error('shell is not defined. Power Pages infrastructure not ready yet.'));
          return;
        }
        
        webapi.safeAjax({
          ...options,
          success: resolve,
          error: reject
        });
      });
    },

    /**
     * Get session applications for a specific child (with sessionStorage cache)
     * @param {string} childId - Child's contact ID
     * @returns {Promise<Array>} - Array of application records
     */
    async getChildApplications(childId) {
      const cleanId = String(childId).replace(/[{}]/g, "");
      
      // Check cache first
      const cached = ApplicationCache.getApplications(cleanId);
      if (cached !== null) {
        return cached;
      }

      // Cache miss - fetch from API
      console.log('🌐 Fetching applications from API for:', cleanId);
      const url = CONFIG.API.SESSION_APPLICATIONS
        + "?$select=ude_sessionapplicationid,ude_priority,statuscode,ude_registeredbytextformat"
        + "&$filter=_ude_student_value eq " + cleanId
        + "&$expand=ude_session($select=msevtmgt_sessionid,ude_setweek,msevtmgt_name,_msevtmgt_event_value,_ude_school_value;$expand=ude_school($select=name))"
        + "&$top=" + CONFIG.API.MAX_APPLICATIONS_PER_CHILD;

      try {
        const response = await this.ajax({
          type: "GET",
          url,
          headers: { "Prefer": 'odata.include-annotations="*",odata.maxpagesize=50' },
          contentType: "application/json"
        });
        const applications = Array.isArray(response?.value) ? response.value : [];
        
        // Store in cache
        ApplicationCache.setApplications(cleanId, applications);
        return applications;
      } catch (error) {
        console.error('Failed to fetch applications for child:', cleanId, error);
        return [];
      }
    },

    /**
     * Create a new draft application
     * @param {string} sessionId - Session ID
     * @param {string} childId - Child's contact ID
     * @param {number} priorityLabel - Priority (1-5)
     * @returns {Promise} - Promise that resolves when created
     */
    /**
     * Create a draft application for a child
     * @param {string} sessionId - Session ID
     * @param {string} childId - Child's contact ID
     * @param {number} priorityLabel - Priority label (1-5)
     * @param {string} registeredById - User (parent) contact ID who is registering
     * @param {string} registeredByName - User (parent) full name
     * @returns {Promise} - Promise that resolves when created
     */
    async createDraftApplication(sessionId, childId, priorityLabel, registeredById, registeredByName) {
      const cleanSessionId = String(sessionId).replace(/[{}]/g, "");
      const cleanChildId = String(childId).replace(/[{}]/g, "");
      const cleanRegisteredById = String(registeredById).replace(/[{}]/g, "");
      const priorityValue = CONFIG.PRIORITY.LABEL_TO_VALUE[priorityLabel] || 1;

      const result = await this.ajax({
        type: "POST",
        url: CONFIG.API.SESSION_APPLICATIONS,
        contentType: "application/json",
        data: JSON.stringify({
          "ude_student@odata.bind": `/contacts(${cleanChildId})`,
          "ude_session@odata.bind": `${CONFIG.API.SESSIONS}(${cleanSessionId})`,
          "ude_RegisteredBy@odata.bind": `/contacts(${cleanRegisteredById})`,
          "ude_registeredbytextformat": registeredByName || '',
          ude_priority: priorityValue,
          statuscode: 1
        })
      });
      
      // Invalidate cache for this child
      ApplicationCache.invalidateChild(cleanChildId);
      return result;
    },

    /**
     * Update application priority
     * @param {string} applicationId - Application ID
     * @param {number} newPriority - New priority label (1-5)
     * @returns {Promise} - Promise that resolves when updated
     */
    async updateApplicationPriority(applicationId, newPriority) {
      const priorityValue = CONFIG.PRIORITY.LABEL_TO_VALUE[newPriority];
      if (!priorityValue) {
        throw new Error(`Invalid priority: ${newPriority}`);
      }

      const result = await this.ajax({
        type: "PATCH",
        url: `${CONFIG.API.SESSION_APPLICATIONS}(${applicationId})`,
        contentType: "application/json",
        data: JSON.stringify({ ude_priority: priorityValue })
      });
      
      // Invalidate all cache (we don't have childId in this context)
      ApplicationCache.invalidateAll();
      return result;
    },

    /**
     * Delete an application
     * @param {string} applicationId - Application ID
     * @returns {Promise} - Promise that resolves when deleted
     */
    async deleteApplication(applicationId) {
      const result = await this.ajax({
        type: "DELETE",
        url: `${CONFIG.API.SESSION_APPLICATIONS}(${applicationId})`
      });
      
      // Invalidate all cache (we don't have childId in this context)
      ApplicationCache.invalidateAll();
      return result;
    },

    /**
     * Create accommodation application for a child
     * @param {string} childId - Child's contact ID
     * @param {string} registeredById - User (parent) contact ID
     * @param {string} registeredByName - User (parent) full name
     * @returns {Promise} - Promise that resolves when created
     */
    async createAccommodationApplication(childId, registeredById, registeredByName) {
      const cleanChildId = String(childId).replace(/[{}]/g, "");
      const cleanRegisteredById = String(registeredById).replace(/[{}]/g, "");

      const result = await this.ajax({
        type: "POST",
        url: CONFIG.API.ACCOMMODATION_APPLICATIONS,
        contentType: "application/json",
        data: JSON.stringify({
        "ude_student@odata.bind": `/contacts(${cleanChildId})`,
        "ude_registeredBy@odata.bind": `/contacts(${cleanRegisteredById})`,
        "ude_registeredbytextformat": registeredByName || '',
        statuscode: 1 // Ubehandlet
      })
      });
      
      // Invalidate cache for this child
      ApplicationCache.invalidateChild(cleanChildId);
      return result;
    },

    /**
     * Check if child already has an accommodation application (with sessionStorage cache)
     * Uses the same cache as getAccommodationApplication() for efficiency
     * @param {string} childId - Child's contact ID
     * @returns {Promise<boolean>} - Promise that resolves to true if application exists
     */
    async hasAccommodationApplication(childId) {
      const cleanId = String(childId).replace(/[{}]/g, "");
      
      // Check cache first - now stores full object or null
      const cached = ApplicationCache.getAccommodation(cleanId);
      if (cached !== undefined) {
        // cached is either an object (has accommodation) or null (no accommodation)
        console.log('📦 Cache hit: accommodation boolean for', cleanId, cached !== null);
        return cached !== null;
      }

      // Cache miss - fetch full details and cache them
      // This ensures both hasAccommodation and getAccommodation use same cache
      console.log('🌐 Fetching accommodation details from API for:', cleanId);
      const accommodation = await this.getAccommodationApplication(cleanId);
      
      // getAccommodationApplication already cached the result
      return accommodation !== null;
    },

    /**
     * Get accommodation application details for a child (with sessionStorage cache)
     * Caches full object for reuse by both this function and hasAccommodationApplication()
     * @param {string} childId - Child's contact ID
     * @returns {Promise<Object|null>} - Promise that resolves to accommodation application or null
     */
    async getAccommodationApplication(childId) {
      const cleanId = String(childId).replace(/[{}]/g, "");
      
      // Check cache first - now stores full object or null
      const cached = ApplicationCache.getAccommodation(cleanId);
      if (cached !== undefined) {
        // cached is either the full object or null
        console.log('📦 Cache hit: accommodation details for', cleanId);
        return cached;
      }
      
      // Cache miss - fetch full details from API
      const url = CONFIG.API.ACCOMMODATION_APPLICATIONS
        + "?$select=ude_accommodationapplicationid,statuscode,createdon,ude_registeredbytextformat"
        + "&$expand=ude_student($select=fullname)"
        + "&$filter=_ude_student_value eq " + cleanId
        + "&$top=1";

      try {
        console.log('🌐 Fetching accommodation details from API for:', cleanId);
        const response = await this.ajax({
          type: "GET",
          url,
          contentType: "application/json"
        });
        
        const accommodation = (Array.isArray(response?.value) && response.value.length > 0) 
          ? response.value[0] 
          : null;
        
        // Cache the full object (or null if no accommodation exists)
        ApplicationCache.setAccommodation(cleanId, accommodation);
        return accommodation;
      } catch (error) {
        console.error('Failed to get accommodation application:', error);
        // Cache null on error to avoid repeated failed requests
        ApplicationCache.setAccommodation(cleanId, null);
        return null;
      }
    },

    /**
     * Delete accommodation application for a child
     * @param {string} childId - Child's contact ID
     * @returns {Promise} - Promise that resolves when deleted
     */
    async deleteAccommodationApplication(childId) {
      const cleanId = String(childId).replace(/[{}]/g, "");
      
      // First, find the accommodation application ID
      const url = CONFIG.API.ACCOMMODATION_APPLICATIONS
        + "?$select=ude_accommodationapplicationid"
        + "&$filter=_ude_student_value eq " + cleanId
        + "&$top=1";

      try {
        const response = await this.ajax({
          type: "GET",
          url,
          contentType: "application/json"
        });

        if (!Array.isArray(response?.value) || response.value.length === 0) {
          throw new Error('No accommodation application found for this child');
        }

        const accommodationId = response.value[0].ude_accommodationapplicationid;

        // Delete the accommodation application
        const result = await this.ajax({
          type: "DELETE",
          url: `${CONFIG.API.ACCOMMODATION_APPLICATIONS}(${accommodationId})`,
          contentType: "application/json"
        });
        
        // Invalidate cache for this child
        ApplicationCache.invalidateChild(cleanId);
        return result;
      } catch (error) {
        console.error('Failed to delete accommodation application:', error);
        throw error;
      }
    },

    /**
     * Create registration for direct registration phase
     * Used in direct registration phase (Restplasser)
     * Creates msevtmgt_sessionregistration record directly, bypassing application/lottery flow
     * IMPORTANT: Spot is created in pending state - parent must approve/reject on My Page
     * @param {string} sessionId - Session ID
     * @param {string} childId - Child's contact ID
     * @param {string} registeredById - User (parent) contact ID who is registering
     * @param {number} statusCode - 1 (Registered/default) or 3 (Waitlist)
     * @returns {Promise} - Promise that resolves with created registration
     */
    async createDirectRegistration(sessionId, childId, registeredById, statusCode = 1) {
      const cleanSessionId = String(sessionId).replace(/[{}]/g, "");
      const cleanChildId = String(childId).replace(/[{}]/g, "");
      const cleanRegisteredById = String(registeredById).replace(/[{}]/g, "");

      const data = {
        "msevtmgt_SessionId@odata.bind": `/msevtmgt_sessions(${cleanSessionId})`,
        "msevtmgt_contactid@odata.bind": `/contacts(${cleanChildId})`,
        "ude_RegistreredBy@odata.bind": `/contacts(${cleanRegisteredById})`,
        "ude_registrationphase": 938620001 // Direct registration (not lottery)
        // ude_acceptedregistration: null (not set) - Pending approval (requires parent approval on My Page)
      };

      // Only set statuscode if not default (1 = Registered)
      if (statusCode !== 1) {
        data.statuscode = statusCode;
        // ude_waitlistposition: auto-populated by backend when statuscode = 3
      }

      try {
        const result = await this.ajax({
          type: "POST",
          url: "/_api/msevtmgt_sessionregistrations",
          contentType: "application/json",
          data: JSON.stringify(data)
        });

        // Invalidate cache for this child
        ApplicationCache.invalidateChild(cleanChildId);
        const actionType = statusCode === 3 ? 'waitlist' : 'direct';
        console.log(`Created ${actionType} registration (pending approval):`, result);
        return result;
      } catch (error) {
        console.error('Failed to create registration:', error);
        throw error;
      }
    },

    /**
     * Get active session registrations for a specific child
     * Used to check for duplicates before direct registration
     * NOTE: Only returns active registrations (statecode = 0), does NOT cache results
     * to avoid overwriting My Page cache which includes rejected spots
     * @param {string} childId - Child's contact ID
     * @returns {Promise<Array>} - Array of active registration records
     */
    async getChildRegistrations(childId) {
      const cleanId = String(childId).replace(/[{}]/g, "");

      console.log('🌐 Fetching active registrations from API for:', cleanId);
      const url = "/_api/msevtmgt_sessionregistrations"
        + "?$select=msevtmgt_sessionregistrationid,statuscode,ude_acceptedregistration,ude_waitlistposition,_msevtmgt_contactid_value,_msevtmgt_sessionid_value"
        + "&$filter=_msevtmgt_contactid_value eq " + cleanId + " and statecode eq 0"
        + "&$expand=msevtmgt_SessionId($select=msevtmgt_sessionid,msevtmgt_name,ude_setweek;$expand=msevtmgt_Event($select=msevtmgt_name))";

      try {
        const response = await this.ajax({
          type: "GET",
          url,
          headers: { "Prefer": 'odata.include-annotations="*"' },
          contentType: "application/json"
        });
        const registrations = Array.isArray(response?.value) ? response.value : [];
        
        // Do NOT cache - this would overwrite My Page cache which needs all spots (including rejected)
        return registrations;
      } catch (error) {
        console.error('Failed to fetch registrations for child:', cleanId, error);
        return [];
      }
    },

    /**
     * Approve an allocated spot (session registration)
     * @param {string} spotId - Session registration ID
     * @param {string} childId - Child contact ID (for cache invalidation)
     * @returns {Promise} - Promise that resolves when approved
     */
    async approveAllocatedSpot(spotId, childId) {
      const cleanSpotId = String(spotId).replace(/[{}]/g, "");
      const cleanChildId = String(childId).replace(/[{}]/g, "");

      try {
        await this.ajax({
          type: "PATCH",
          url: `/_api/msevtmgt_sessionregistrations(${cleanSpotId})`,
          contentType: "application/json",
          data: JSON.stringify({ ude_acceptedregistration: 938620000 }) // Akseptert
        });

        // Invalidate cache for this child
        ApplicationCache.invalidateChild(cleanChildId);
        console.log('Approved allocated spot:', cleanSpotId);
      } catch (error) {
        console.error('Failed to approve allocated spot:', error);
        throw error;
      }
    },

    /**
     * Reject an allocated spot (session registration) by deactivating it
     * @param {string} spotId - Session registration ID
     * @param {string} childId - Child contact ID (for cache invalidation)
     * @returns {Promise} - Promise that resolves when rejected
     */
    async rejectAllocatedSpot(spotId, childId) {
      const cleanSpotId = String(spotId).replace(/[{}]/g, "");
      const cleanChildId = String(childId).replace(/[{}]/g, "");

      try {
        await this.ajax({
          type: "PATCH",
          url: `/_api/msevtmgt_sessionregistrations(${cleanSpotId})`,
          contentType: "application/json",
          data: JSON.stringify({
            ude_acceptedregistration: 938620001, // Avslått
            statecode: 1
          })
        });

        // Invalidate cache for this child
        ApplicationCache.invalidateChild(cleanChildId);
        console.log('Rejected allocated spot:', cleanSpotId);
      } catch (error) {
        console.error('Failed to reject allocated spot:', error);
        throw error;
      }
    },

    /**
     * Unsubscribe an allocated spot (set approved to false and deactivate)
     * @param {string} spotId - Session registration ID
     * @param {string} childId - Child contact ID (for cache invalidation)
     * @returns {Promise} - Promise that resolves when unsubscribed
     */
    async unsubscribeAllocatedSpot(spotId, childId) {
      const cleanSpotId = String(spotId).replace(/[{}]/g, "");
      const cleanChildId = String(childId).replace(/[{}]/g, "");

      try {
        await this.ajax({
          type: "PATCH",
          url: `/_api/msevtmgt_sessionregistrations(${cleanSpotId})`,
          contentType: "application/json",
          data: JSON.stringify({
            ude_acceptedregistration: 938620001, // Avslått (same as reject)
            statecode: 1
          })
        });

        // Invalidate cache for this child
        ApplicationCache.invalidateChild(cleanChildId);
        console.log('Unsubscribed allocated spot:', cleanSpotId);
      } catch (error) {
        console.error('Failed to unsubscribe allocated spot:', error);
        throw error;
      }
    }
  };

  // =============================================================================
  // DOM UTILITIES
  // =============================================================================
  
  const DomUtils = {
    /**
     * Safely escape HTML content
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeHtml(str) {
      const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return String(str ?? '').replace(/[&<>"']/g, match => escapeMap[match]);
    },

    /**
     * Set loading state on pkt-button elements
     * @param {HTMLElement} button - Button element
     * @param {boolean} isLoading - Loading state
     */
    setButtonLoading(button, isLoading) {
      if (!button) return;
      
      try { 
        button.isLoading = !!isLoading; 
      } catch {}
      
      button.toggleAttribute('disabled', !!isLoading);
      button.toggleAttribute('isLoading', !!isLoading);
      
      if (isLoading) {
        button.setAttribute('aria-busy', 'true');
      } else {
        button.removeAttribute('aria-busy');
      }
    },

    /**
     * Show/hide elements with proper accessibility
     * @param {HTMLElement} element - Element to show/hide
     * @param {boolean} show - Whether to show the element
     */
    toggleVisibility(element, show) {
      if (!element) return;
      
      if (show) {
        element.style.display = '';
        element.removeAttribute('hidden');
      } else {
        element.style.display = 'none';
        element.setAttribute('hidden', '');
      }
    }
  };

  // =============================================================================
  // BUSINESS LOGIC UTILITIES
  // =============================================================================
  
  const BusinessUtils = {
    /**
     * Get priority label from OData response
     * @param {Object} row - OData row with priority information
     * @returns {number} - Priority label (1-5)
     */
    getPriorityLabel(row) {
      // Try formatted value first
      const formatted = row["ude_priority@OData.Community.Display.V1.FormattedValue"];
      if (formatted) {
        const num = Number(formatted);
        if (num >= 1 && num <= 5) return num;
      }
      
      // Try raw value
      if (row.ude_priority !== null && row.ude_priority !== undefined) {
        const num = Number(row.ude_priority);
        if (num >= 1 && num <= 5) return num;
      }
      
      // Default fallback
      return 1;
    },

    /**
     * Find next available priority for a child
     * @param {Array} applications - Child's current applications
     * @returns {Object} - {nextPriority: number, currentCount: number}
     */
    getNextAvailablePriority(applications) {
      const usedPriorities = new Set(
        applications
          .map(app => this.getPriorityLabel(app))
          .filter(Boolean)
      );

      // Find smallest missing priority from 1 to MAX
      for (let i = 1; i <= CONFIG.API.MAX_APPLICATIONS_PER_CHILD; i++) {
        if (!usedPriorities.has(i)) {
          return {
            nextPriority: i,
            currentCount: applications.length
          };
        }
      }

      return {
        nextPriority: CONFIG.API.MAX_APPLICATIONS_PER_CHILD,
        currentCount: applications.length
      };
    },

    /**
     * Filter children by course grade requirements
     * @param {Array} children - Array of children objects
     * @param {string} courseGradesStr - Comma-separated grade values
     * @returns {Array} - Filtered children array
     */
    filterChildrenByGrades(children, courseGradesStr) {
      if (!children || !Array.isArray(children)) return [];
      
      const courseGrades = new Set(
        (courseGradesStr || "")
          .split(",")
          .map(s => parseInt(s.trim(), 10))
          .filter(Number.isFinite)
      );

      return courseGrades.size > 0
        ? children.filter(child => Number.isFinite(+child.grade) && courseGrades.has(+child.grade))
        : children;
    },

    /**
     * Group applications by child
     * @param {Array} children - Array of children
     * @param {Array} allApplications - Array of application arrays (one per child)
     * @returns {Array} - Array of {child, applications} objects
     */
    groupApplicationsByChild(children, allApplications) {
      return children.map((child, index) => ({
        child,
        applications: allApplications[index] || []
      }));
    }
  };

  // =============================================================================
  // UI INTERACTION UTILITIES
  // =============================================================================
  
  const UiUtils = {
    /**
     * Open the shopping cart offcanvas
     */
    openShoppingCart() {
      const cartElement = document.getElementById("draftCart");
      if (cartElement && window.bootstrap?.Offcanvas) {
        bootstrap.Offcanvas.getOrCreateInstance(cartElement).show();
      }
    },

    /**
     * Show alert message using global alert system
     * @param {string} message - Alert message
     * @param {string} type - Alert type (info, success, warning, danger)
     * @param {number} duration - Duration in milliseconds
     */
    showAlert(message, type = 'info', duration = 3000) {
      if (window.sskShowAlert) {
        window.sskShowAlert(message, type, duration);
      } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    },

    /**
     * Publish event when wishlist changes
     * @param {number} count - New item count
     */
    publishWishlistChanged(count) {
      document.dispatchEvent(
        new CustomEvent(CONFIG.EVENTS.WISHLIST_CHANGED, { 
          detail: { count } 
        })
      );
    },

    /**
     * Create a new child contact with parent relation using deep insert from relation entity
     * @param {Object} childData - Child data (firstname, lastname, grade, role)
     * @param {string} parentId - Parent contact ID
     * @param {number} relationType - Relation type (938620000 for Foresatt/Parent)
     * @returns {Promise<string>} - Promise that resolves to created contact ID
     */
    async createChildContactWithRelation(childData, parentId, relationType) {
      const cleanParentId = String(parentId).replace(/[{}]/g, "");

      // Build the student object with all provided fields
      const studentData = {
        firstname: childData.firstname,
        lastname: childData.lastname,
        ude_grade: childData.grade, // Integer value (1-10)
        ude_role: "938620000" // String value for Elev/Student option
      };

      // Add birthdate if provided
      if (childData.birthdate) {
        studentData.birthdate = childData.birthdate;
      }

      // Add optional contact information if provided
      if (childData.mobilephone) {
        studentData.mobilephone = childData.mobilephone;
      }
      if (childData.emailaddress1) {
        studentData.emailaddress1 = childData.emailaddress1;
      }

      // Add address fields if provided
      if (childData.address1_line1) {
        studentData.address1_line1 = childData.address1_line1;
      }
      if (childData.address1_postalcode) {
        studentData.address1_postalcode = childData.address1_postalcode;
      }
      if (childData.address1_city) {
        studentData.address1_city = childData.address1_city;
      }

      // Add gender if provided
      if (childData.gendercode !== null && childData.gendercode !== undefined) {
        studentData.gendercode = childData.gendercode;
      }

      // Deep insert: Create relation with nested contact creation
      // Create from ude_relation entity, referencing existing parent and creating new student
      const response = await ApiUtils.ajax({
        type: "POST",
        url: "/_api/ude_relations?$select=ude_relationid&$expand=ude_student($select=contactid)",
        contentType: "application/json",
        headers: {
          "Prefer": "return=representation"
        },
        data: JSON.stringify({
          "ude_person@odata.bind": `/contacts(${cleanParentId})`, // Existing parent
          ude_relation_type: relationType, // 938620000 for Foresatt/Parent
          statecode: 0, // Active
          // Deep insert: Create the child contact inline
          ude_student: studentData
        })
      });

      // Extract contact ID from expanded student
      if (response?.ude_student?.contactid) {
        return response.ude_student.contactid;
      }

      // Fallback: Query for the newly created contact if expand didn't work
      const searchUrl = "/_api/contacts"
        + "?$select=contactid"
        + "&$filter=firstname eq '" + childData.firstname.replace(/'/g, "''") + "'"
        + " and lastname eq '" + childData.lastname.replace(/'/g, "''") + "'"
        + " and ude_grade eq " + childData.grade
        + " and ude_role eq '938620000'"
        + "&$orderby=createdon desc"
        + "&$top=1";

      const searchResponse = await ApiUtils.ajax({
        type: "GET",
        url: searchUrl,
        contentType: "application/json"
      });

      if (!searchResponse?.value || searchResponse.value.length === 0) {
        throw new Error('Contact was created but could not be found');
      }

      return searchResponse.value[0].contactid;
    },

    /**
     * Clear children cache to force refresh
     */
    clearChildrenCache() {
      try {
        // Get current user ID from session storage pattern
        const keys = Object.keys(sessionStorage);
        const childrenKey = keys.find(key => key.startsWith('ssk:children:'));
        
        if (childrenKey) {
          sessionStorage.removeItem(childrenKey);
          console.log('Children cache cleared:', childrenKey);
        }
      } catch (error) {
        console.error('Error clearing children cache:', error);
      }
    }
  };

  // =============================================================================
  // PUBLIC API
  // =============================================================================
  
  return {
    CONFIG,
    ApiUtils,
    DomUtils,
    BusinessUtils,
    UiUtils,
    ApplicationCache
  };
})();

// Global convenience functions for backward compatibility
window.sskFilterChildrenByGrades = window.SommerskolenUtils.BusinessUtils.filterChildrenByGrades;