export const cubeSchemas = [
  {
    cubeName: "line_items",
    dimensions: {
      id: { sql: "id", type: "number", primaryKey: true },
      quantity: { sql: "quantity", type: "number" },
      price: { sql: "price", type: "number", format: "currency" },
      createdAt: { sql: "created_at", type: "time" },
    },
    measures: {
      count: { sql: "id", type: "count" },
      totalAmount: { sql: "price", type: "runningTotal", format: "currency" },
      cumulativeTotalRevenue: {
        sql: "price",
        type: "runningTotal",
        format: "currency",
      },
    },
    joins: {
      orders: {
        relationship: "belongsTo",
        sql: "${orders}.id = ${line_items}.order_id",
      },
    },
  },
  {
    cubeName: "orders",
    dimensions: {
      id: { sql: "id", type: "number", primaryKey: true },
      status: { sql: "status", type: "string", description: "Status of order" },
      userId: { sql: "user_id", type: "number", shown: false },
      completedAt: { sql: "completed_at", type: "time" },
      createdAt: { sql: "created_at", type: "time" },
      amount: {
        sql: "${line_items.totalAmount}",
        type: "number",
        format: "currency",
        subQuery: true,
        shown: false,
      },
      amountTier: {
        type: "string",
        case: {
          when: [
            { sql: "${amount} < 100 OR ${amount} is NULL", label: "$0 - $100" },
            {
              sql: "${amount} >= 100 AND ${amount} < 200",
              label: "$100 - $200",
            },
            { sql: "${amount} >= 200", label: "$200 +" },
          ],
          else: { label: "Unknown" },
        },
      },
    },
    measures: {
      count: { type: "count" },
      totalAmount: { sql: "${amount}", type: "sum", format: "currency" },
    },
    joins: {
      products: {
        relationship: "belongsTo",
        sql: "${orders}.product_id = ${products}.id",
      },
      lineItems: {
        relationship: "hasMany",
        sql: "${orders}.id = ${lineItems}.order_id",
      },
    },
    segments: {
      completed: { sql: "status = 'completed'" },
      processing: { sql: "status = 'processing'" },
      shipped: { sql: "status = 'shipped'" },
    },
  },
  {
    cubeName: "product_categories",
    dimensions: {
      id: { sql: "id", type: "number", primaryKey: true },
      name: { sql: "${TABLE}.name", type: "string" },
    },
    measures: {},
    joins: {
      products: {
        relationship: "hasMany",
        sql: "${products}.product_category_id = ${product_categories}.id",
      },
    },
  },
  {
    cubeName: "products",
    dimensions: {
      id: { sql: "id", type: "number", primaryKey: true },
      name: { sql: "name", type: "string" },
    },
    measures: {
      count: { sql: "count(*)", type: "number" },
    },
    joins: {
      product_categories: {
        relationship: "belongsTo",
        sql: "${products}.product_category_id = ${product_categories}.id",
      },
    },
  },
];
