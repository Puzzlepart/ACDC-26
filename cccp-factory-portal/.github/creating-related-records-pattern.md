# Creating Related Records in Power Pages

**Two approaches for creating records with parent-child relationships in Dataverse Web API.**

---

## 🎯 The Challenge

You need to create two records where the second record references the first:
1. Create a **parent record** (e.g., Order, Contact)
2. Get the ID of the created parent
3. Create a **child record** that relates to the parent (e.g., Order Line, Relation)

---

## 📋 Two Approaches

### Approach 1: Deep Insert (Single API Call) ⭐ Recommended
**What**: Create both records in a single POST request using OData deep insert.

**When to Use**:
- When the child MUST be created with the parent
- When you want atomic operations (all or nothing)
- When the parent entity supports navigation properties

**Pros**:
- ✅ Single API call (faster, more efficient)
- ✅ Atomic transaction (both succeed or both fail)
- ✅ No need to extract ID from headers
- ✅ Cleaner code

**Cons**:
- ❌ More complex payload structure
- ❌ Requires understanding of OData navigation properties
- ❌ Not all entity relationships support deep insert

---

### Approach 2: Sequential Creation (Two API Calls)
**What**: Create parent first, extract ID, then create child with lookup.

**When to Use**:
- When you need to validate/process parent before creating child
- When deep insert is not supported
- When child creation is optional or conditional
- Simpler logic flow

**Pros**:
- ✅ Straightforward logic (step by step)
- ✅ Works with all entity relationships
- ✅ Child creation can be conditional
- ✅ Easier to debug

**Cons**:
- ❌ Two API calls (slower)
- ❌ Not atomic (parent might exist without child)
- ❌ Need to extract ID from response

---

## 🔧 Implementation Examples

### Example 1: Deep Insert (Sommerskolen Pattern)

**Scenario**: Create a child contact + parent relation in one call.

**Code from** `sommerskolen-utilities.js`:

```javascript
/**
 * Create a new child contact with parent relation using deep insert
 * @param {Object} childData - Child data (firstname, lastname, grade)
 * @param {string} parentId - Parent contact ID
 * @param {number} relationType - Relation type (938620000 for Parent)
 * @returns {Promise<string>} - Created contact ID
 */
async createChildContactWithRelation(childData, parentId, relationType) {
  const cleanParentId = String(parentId).replace(/[{}]/g, "");

  // Build child contact data
  const studentData = {
    firstname: childData.firstname,
    lastname: childData.lastname,
    ude_grade: childData.grade,
    ude_role: "938620000" // Student
  };

  // POST to relation entity with nested contact creation
  const response = await webapi.safeAjax({
    type: "POST",
    url: "/_api/ude_relations?$select=ude_relationid&$expand=ude_student($select=contactid)",
    contentType: "application/json",
    headers: {
      "Prefer": "return=representation" // Request full response with expanded data
    },
    data: JSON.stringify({
      // Link to existing parent
      "ude_person@odata.bind": `/contacts(${cleanParentId})`,
      
      // Relation properties
      ude_relation_type: relationType,
      statecode: 0, // Active
      
      // Deep insert: Create the child contact inline
      ude_student: studentData
    })
  });

  // Extract created child contact ID from expanded data
  if (response?.ude_student?.contactid) {
    return response.ude_student.contactid;
  }

  throw new Error('Failed to create child contact');
}
```

**How it works**:
1. POST to the **relation entity** (`ude_relations`)
2. Use `@odata.bind` to link to existing parent contact
3. Use **navigation property** (`ude_student`) to create child contact inline
4. Add `$expand` in URL to get created child data back
5. Add `Prefer: return=representation` header to get full response
6. Extract child ID from response: `response.ude_student.contactid`

**Key Points**:
- Navigation property name (`ude_student`) is the lookup field name on the relation entity
- Parent record already exists (use `@odata.bind`)
- Child record is created inline (object with properties)
- One API call creates both records

---

### Example 2: Sequential Creation (Order + Order Line)

**Scenario**: Create an order, then create order lines that reference it.

**Step 1 - Create Order**:

```javascript
/**
 * Create an order and return its ID
 * @param {Object} orderData - Order data
 * @returns {Promise<string>} - Created order ID
 */
async createOrder(orderData) {
  const response = await webapi.safeAjax({
    type: "POST",
    url: "/_api/ccc_orders",
    contentType: "application/json",
    headers: {
      "Prefer": "return=representation" // Get full response
    },
    data: JSON.stringify({
      ccc_name: orderData.name,
      ccc_status: orderData.status,
      "ccc_customer@odata.bind": `/contacts(${orderData.customerId})`
    })
  });

  // Extract ID from response
  // Response includes the created record with ID
  if (response?.ccc_orderid) {
    return response.ccc_orderid;
  }

  throw new Error('Failed to create order');
}
```

**Step 2 - Create Order Line**:

```javascript
/**
 * Create an order line linked to an order
 * @param {string} orderId - Parent order ID
 * @param {Object} lineData - Order line data
 * @returns {Promise<string>} - Created order line ID
 */
async createOrderLine(orderId, lineData) {
  const cleanOrderId = String(orderId).replace(/[{}]/g, "");

  const response = await webapi.safeAjax({
    type: "POST",
    url: "/_api/ccc_orderlines",
    contentType: "application/json",
    headers: {
      "Prefer": "return=representation"
    },
    data: JSON.stringify({
      ccc_name: lineData.name,
      ccc_quantity: lineData.quantity,
      ccc_price: lineData.price,
      // Link to parent order
      "ccc_order@odata.bind": `/ccc_orders(${cleanOrderId})`
    })
  });

  if (response?.ccc_orderlineid) {
    return response.ccc_orderlineid;
  }

  throw new Error('Failed to create order line');
}
```

**Step 3 - Complete Workflow**:

```javascript
/**
 * Create order with order lines
 * @param {Object} orderData - Order data
 * @param {Array} orderLines - Array of order line data
 * @returns {Promise<Object>} - Created order and lines
 */
async createOrderWithLines(orderData, orderLines) {
  try {
    // 1. Create parent order
    const orderId = await ApiUtils.createOrder(orderData);
    console.log('Order created:', orderId);

    // 2. Create child order lines
    const lineIds = [];
    for (const lineData of orderLines) {
      const lineId = await ApiUtils.createOrderLine(orderId, lineData);
      lineIds.push(lineId);
      console.log('Order line created:', lineId);
    }

    return {
      orderId: orderId,
      orderLineIds: lineIds
    };

  } catch (error) {
    console.error('Failed to create order with lines:', error);
    throw error;
  }
}
```

**Usage in Page Script**:

```javascript
async function handleCreateOrder() {
  const orderData = {
    name: "Order #123",
    status: 1,
    customerId: currentUserId
  };

  const orderLines = [
    { name: "Product A", quantity: 2, price: 100 },
    { name: "Product B", quantity: 1, price: 200 }
  ];

  try {
    UiUtils.setButtonLoading(createBtn, true);
    
    const result = await ApiUtils.createOrderWithLines(orderData, orderLines);
    
    console.log('Created order:', result.orderId);
    console.log('Created lines:', result.orderLineIds);
    
    UiUtils.showAlert('Order created successfully!', 'success');
    
    // Invalidate cache and reload
    CacheUtils.clearOrders();
    await loadOrders();
    
  } catch (error) {
    console.error('Failed:', error);
    UiUtils.showAlert('Failed to create order', 'danger');
  } finally {
    UiUtils.setButtonLoading(createBtn, false);
  }
}
```

---

## 🔑 Key Concepts

### Getting ID from POST Response

**Option 1: Prefer Header (Recommended)**
```javascript
headers: {
  "Prefer": "return=representation"
}
```
- Returns full created record in response
- Access ID directly: `response.ccc_orderid`
- Most reliable method

**Option 2: Location Header (Alternative)**
```javascript
// Response has OData-EntityId header with full URL
const locationHeader = response.headers?.get('OData-EntityId');
// Example: "https://org.crm.dynamics.com/api/data/v9.2/ccc_orders(guid-here)"
const idMatch = locationHeader.match(/\(([^)]+)\)/);
const orderId = idMatch ? idMatch[1] : null;
```

**Option 3: Query After Creation (Fallback)**
```javascript
// If above fails, query for recently created record
const url = "/_api/ccc_orders"
  + "?$select=ccc_orderid"
  + "&$filter=ccc_name eq '" + orderName + "'"
  + "&$orderby=createdon desc"
  + "&$top=1";

const response = await webapi.safeAjax({ type: "GET", url: url });
const orderId = response.value[0]?.ccc_orderid;
```

---

### Lookup Field Syntax

**Always use `@odata.bind`** for lookups:

```javascript
// Correct
"ccc_order@odata.bind": `/ccc_orders(${orderId})`
"ccc_customer@odata.bind": `/contacts(${contactId})`

// Wrong
"ccc_order": orderId
"ccc_order_value": orderId
```

**Format**: `"fieldname@odata.bind": "/entitysetname(id)"`

---

### Deep Insert Navigation Properties

**Structure**:
```javascript
{
  // Lookup to existing record
  "parent@odata.bind": "/parents(id)",
  
  // Deep insert for new child record
  childNavigationProperty: {
    // Child record properties
    field1: value1,
    field2: value2
  }
}
```

**Finding Navigation Property Name**:
- Check entity metadata or API documentation
- Often same as lookup field name (without `_value`)
- Example: `ude_student` field → `ude_student` navigation property

---

## 📋 Decision Tree

**Should I use Deep Insert?**

```
Can the relationship be created with navigation properties?
  ├─ YES → Do you need both records atomically?
  │   ├─ YES → Use Deep Insert ⭐
  │   └─ NO → Either approach works
  │
  └─ NO → Do you need conditional child creation?
      ├─ YES → Use Sequential Creation
      └─ NO → Use Sequential Creation (simpler)
```

---

## ✅ Best Practices

### For Deep Insert:
- [ ] Use `Prefer: return=representation` header
- [ ] Add `$expand` to get child data back
- [ ] Use `@odata.bind` for existing parent references
- [ ] Test with single record before batch operations
- [ ] Handle errors gracefully (both records fail together)

### For Sequential Creation:
- [ ] Always use `Prefer: return=representation` to get ID
- [ ] Validate parent creation before creating children
- [ ] Handle partial failures (parent exists but child fails)
- [ ] Consider rollback logic if child creation fails
- [ ] Use try/catch for each step

### General:
- [ ] Clean GUID strings (remove `{}` brackets)
- [ ] Escape single quotes in filter strings: `.replace(/'/g, "''")`
- [ ] Log IDs at each step for debugging
- [ ] Invalidate cache after mutations
- [ ] Provide user feedback at each step

---

## 🔧 Utils Template

**Add to your `utils.js`**:

```javascript
const ApiUtils = {
  /**
   * Create parent with child records (sequential approach)
   * @param {Object} parentData - Parent record data
   * @param {Array} childrenData - Array of child record data
   * @param {Function} createParent - Function to create parent
   * @param {Function} createChild - Function to create child
   * @returns {Promise<Object>} - Created parent and children IDs
   */
  async createParentWithChildren(parentData, childrenData, createParent, createChild) {
    const createdChildren = [];
    
    try {
      // Step 1: Create parent
      const parentId = await createParent(parentData);
      console.log('Parent created:', parentId);
      
      // Step 2: Create children
      for (const childData of childrenData) {
        try {
          const childId = await createChild(parentId, childData);
          createdChildren.push(childId);
          console.log('Child created:', childId);
        } catch (error) {
          console.error('Failed to create child:', error);
          // Continue or throw based on requirements
        }
      }
      
      return {
        parentId: parentId,
        childrenIds: createdChildren
      };
      
    } catch (error) {
      console.error('Failed to create parent:', error);
      throw error;
    }
  }
};
```

---

## 📝 Summary

| Aspect | Deep Insert | Sequential Creation |
|--------|-------------|---------------------|
| **API Calls** | 1 | 2+ |
| **Atomicity** | Yes (all or nothing) | No (parent can exist alone) |
| **Complexity** | Higher | Lower |
| **Debugging** | Harder | Easier |
| **Performance** | Faster | Slower |
| **Flexibility** | Lower | Higher |
| **Use Case** | Mandatory children | Optional/conditional children |

**Recommendation**:
- Use **Deep Insert** when child is mandatory and relationship supports it
- Use **Sequential Creation** for conditional logic or when deep insert isn't supported
- In Sommerskolen, we use Deep Insert for child+relation (always created together)
- In your order scenario, either works - choose based on whether order lines are mandatory

---

**Last Updated**: January 23, 2026  
**Based on**: Sommerskolen Kursportal `createChildContactWithRelation` implementation
