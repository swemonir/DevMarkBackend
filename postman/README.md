# 📮 Postman Collection - Project Management API

এই collection এ Project Management feature এর সব API endpoints আছে।

## 📥 Import করার নিয়ম

### Option 1: Direct Import
1. Postman open করুন
2. **Import** button এ click করুন
3. এই file টি select করুন: `Project_Management.postman_collection.json`
4. **Import** button এ click করুন

### Option 2: Drag & Drop
- Postman এ সরাসরি এই file টি drag & drop করুন

## 🔧 Setup (Environment Variables)

Collection import করার পর এই variables set করতে হবে:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:5000` | Your server URL |
| `access_token` | (auto-set) | User JWT token |
| `admin_token` | (auto-set) | Admin JWT token |
| `project_id` | (auto-set) | Created project ID |

## 🚀 দ্রুত শুরু করুন

### Step 1: Server Start করুন
```bash
cd DevMarkBackend
npm run dev
```

### Step 2: Login
**Example Workflows** folder থেকে run করুন:
1. **"1. User Login"** - Regular user হিসেবে login (token automatically save হবে)
2. **"2. Admin Login"** - Admin হিসেবে login (admin_token save হবে)

### Step 3: Project তৈরি করুন
**User Routes - CRUD** folder থেকে:
1. **"Create New Project"** run করুন
   - Auto-matically `project_id` save হবে environment এ

### Step 4: অন্যান্য operations test করুন
এখন যেকোনো endpoint test করতে পারবেন!

## 📁 Folder Structure

```
📦 DevMark - Project Management API
├── 📂 Public Routes
│   ├── Get All Projects (Public - Approved Only)
│   └── Get Project by ID (Public - If Approved)
│
├── 📂 User Routes - CRUD
│   ├── Get All Projects (Authenticated User)
│   ├── Create New Project
│   ├── Update Project
│   └── Delete Project
│
├── 📂 User Routes - Submit & Media
│   ├── Submit Project for Review
│   └── Upload Project Media
│
├── 📂 Admin Routes
│   ├── Get All Projects (Admin - All Projects)
│   ├── Approve Project
│   └── Reject Project
│
└── 📂 Example Workflows
    ├── 1. User Login
    └── 2. Admin Login
```

## 🎯 Common Testing Scenarios

### Scenario 1: সম্পূর্ণ User Workflow
1. **User Login** → Token পাবেন
2. **Create New Project** → Project ID save হবে
3. **Upload Project Media** → Images upload করুন
4. **Submit Project for Review** → Admin এর কাছে পাঠান
5. **Get All Projects (Authenticated)** → Your project দেখুন

### Scenario 2: Admin Approval Workflow
1. **Admin Login** → Admin token পাবেন
2. **Get All Projects (Admin)** → `status=submitted` filter দিয়ে pending projects দেখুন
3. **Approve Project** অথবা **Reject Project** → Decision দিন

### Scenario 3: Re-submission After Rejection
1. **Get All Projects (Authenticated)** → Rejected projects দেখুন
2. **Update Project** → Rejection অনুযায়ী edit করুন
3. **Submit Project for Review** → আবার submit করুন

## 🔐 Authorization

Collection এ **Bearer Token** authentication ব্যবহার করা হয়েছে:
- Automatically `{{access_token}}` variable ব্যবহার করে
- Login করলে token automatically save হয়
- Admin routes এর জন্য manually `{{admin_token}}` set করতে হবে

### Admin Route এ Admin Token ব্যবহার করতে:
1. Admin route select করুন
2. **Authorization** tab এ যান
3. Token field এ `{{access_token}}` এর পরিবর্তে `{{admin_token}}` লিখুন

## 📝 Request Examples

### Create Project Request Body
```json
{
  "title": "Build E-commerce Website with MERN Stack",
  "description": "Need a full-stack e-commerce website...",
  "category": "web-development",
  "price": 5000,
  "deliveryTime": 30
}
```

### Reject Project Request Body
```json
{
  "reason": "Project description is not clear. Please provide more details."
}
```

## 🎨 Available Categories
- `web-development`
- `mobile-development`
- `design`
- `marketing`
- `writing`
- `data-science`
- `other`

## 📊 Query Parameters (Get All Projects)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `10` |
| `category` | string | Filter by category | `web-development` |
| `status` | string | Filter by status | `draft` |
| `search` | string | Search in title/description | `website` |
| `minPrice` | number | Minimum price | `1000` |
| `maxPrice` | number | Maximum price | `10000` |

## 🐛 Troubleshooting

### Token Expired Error
```json
{
  "success": false,
  "message": "Token expired"
}
```
**Solution:** আবার login করুন (User Login অথবা Admin Login)

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Title must be at least 3 characters"]
}
```
**Solution:** Request body check করুন

### Cannot Edit Project Error
```json
{
  "success": false,
  "message": "Cannot edit project in submitted status"
}
```
**Solution:** শুধুমাত্র `draft` বা `rejected` status এর project edit করা যায়

## 💡 Pro Tips

1. **Auto Token Save**: Login requests এ **Tests** tab এ script আছে যা automatically token save করে
2. **Auto Project ID**: Create project request এর পরে `project_id` automatically save হয়
3. **Query Parameter Toggle**: GET requests এ query parameters enable/disable করতে পারবেন
4. **Duplicate Requests**: যেকোনো request duplicate করে custom test scenarios তৈরি করতে পারবেন

## 📚 Additional Resources

- [Walkthrough Documentation](file:///C:/Users/USER/.gemini/antigravity/brain/6016e854-e5da-40d5-9b72-37a3f02033d6/walkthrough.md)
- [Implementation Plan](file:///C:/Users/USER/.gemini/antigravity/brain/6016e854-e5da-40d5-9b72-37a3f02033d6/implementation_plan.md)

---

**Happy Testing! 🚀**
