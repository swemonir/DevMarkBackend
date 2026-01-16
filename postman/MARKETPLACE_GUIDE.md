# 🏪 Marketplace API - Postman Guide

## 📥 Import Collection

1. Postman open করুন
2. **Import** → File select → `Marketplace_API.postman_collection.json`
3. Collection import হবে

## 🔧 Environment Setup

Collection এ এই variables আছে (auto-managed):

| Variable | Usage |
|----------|-------|
| `base_url` | Server URL (default: localhost:5000) |
| `access_token` | User token (seller) |
| `admin_token` | Admin token |
| `buyer_token` | Buyer token |
| `project_id` | Auto-saved project ID |
| `listing_id` | Auto-saved listing ID |

## 🚀 Quick Start

### Option 1: Complete Workflow (Recommended)

**"Complete Workflow Example"** folder এ যান এবং সব requests পর পর run করুন:

1. **Create Project** → draft project তৈরি
2. **Submit for Review** → admin review এর জন্য
3. **Admin Approve** → admin approve করে (**admin_token** ব্যবহার করুন!)
4. **List in Marketplace** → marketplace এ list
5. **Browse Marketplace** → public browse
6. **Buy Project** → buyer কিনে (**buyer_token** ব্যবহার করুন!)

**সব IDs automatically save হবে!**

### Option 2: Individual Testing

#### 🔓 **Public Routes (No Token Needed)**

```bash
# Browse all listings
GET /api/marketplace

# Search
GET /api/marketplace/search?search=website&sortBy=price&order=asc

# View single listing
GET /api/marketplace/:id
```

#### 👤 **Seller Routes (Need User Token)**

```bash
# List approved project
POST /api/marketplace
Body: { "projectId": "your_approved_project_id" }

# Update listing
PUT /api/marketplace/:id
Body: { "price": 6000, "title": "Updated..." }

# Remove from marketplace
DELETE /api/marketplace/:id
```

#### 🛒 **Buyer Routes**

```bash
# Buy project
POST /api/marketplace/:id/buy
(Empty body or no body)
```

## 📋 Testing Scenarios

### Scenario 1: Seller Lists Project

```
1. Login as User → GET access_token
2. Already have approved project → Use project_id
3. POST /api/marketplace
   Body: { "projectId": "project_id" }
4. ✅ Project listed!
```

### Scenario 2: Buyer Browses & Buys

```
1. GET /api/marketplace (no token)
2. Find interesting listing → note listing_id
3. Login as different user → GET buyer_token
4. POST /api/marketplace/:id/buy
5. ✅ Project purchased!
```

### Scenario 3: Search Listings

```
GET /api/marketplace/search?
  search=ecommerce&
  category=web-development&
  minPrice=2000&
  maxPrice=8000&
  sortBy=price&
  order=asc
```

## 🎯 Query Parameters

### GET /api/marketplace

| Param | Type | Description | Example |
|-------|------|-------------|---------|
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `10` |
| `category` | string | Filter by category | `web-development` |
| `minPrice` | number | Minimum price | `1000` |
| `maxPrice` | number | Maximum price | `10000` |
| `search` | string | Search text | `website` |

### GET /api/marketplace/search

Same as above, plus:

| Param | Type | Description | Options |
|-------|------|-------------|---------|
| `sortBy` | string | Sort field | `price`, `createdAt`, `title` |
| `order` | string | Sort order | `asc`, `desc` |

## ⚠️ Common Issues

### Error: "Only approved projects can be listed"
**Solution:** Project এর status `approved` হতে হবে
```bash
1. POST /api/projects/:id/submit
2. PUT /api/projects/:id/approve (admin)
3. Then POST /api/marketplace
```

### Error: "Project is already listed"
**Solution:** Already marketplace এ আছে। Delete করে আবার list করুন।

### Error: "You cannot buy your own project"
**Solution:** Different user দিয়ে login করুন (buyer_token)

### Error: "This project has already been sold"
**Solution:** Already বিক্রয় হয়ে গেছে, অন্য project খুঁজুন

## 💡 Pro Tips

### 1. Auto Token Management
Login requests এ **Tests** tab এ script আছে যা auto token save করে:
```javascript
pm.environment.set('access_token', response.accessToken);
```

### 2. Different User Tokens
Testing এর জন্য 3 type token দরকার:
- `access_token` - Seller (project owner)
- `admin_token` - Admin (approve করার জন্য)
- `buyer_token` - Buyer (কেনার জন্য)

### 3. Collection Runner
পুরো workflow test করতে:
1. "Complete Workflow Example" folder select
2. **Run** button click
3. Order maintain করে সব requests run হবে

### 4. Folder Organization
```
📂 Public Routes - Browse without login
📂 Seller Routes - Manage listings
📂 Buyer Routes - Purchase projects
📂 Complete Workflow - End-to-end testing
```

## 🔄 Complete Workflow Diagram

```
Create Project (draft)
    ↓
Submit for Review (submitted)
    ↓
Admin Approve (approved)
    ↓
List in Marketplace (isForSale: true)
    ↓
Public Browse
    ↓
Buyer Purchase (soldTo: buyer)
```

## 📊 Response Examples

### Success - Get Listings
```json
{
  "success": true,
  "count": 5,
  "total": 12,
  "totalPages": 2,
  "currentPage": 1,
  "data": [...]
}
```

### Success - Buy Project
```json
{
  "success": true,
  "message": "Project purchased successfully",
  "data": {
    ...
    "soldTo": { "name": "Buyer Name" },
    "soldAt": "2026-01-15T10:30:00.000Z"
  }
}
```

---

**Happy Testing! 🚀**
