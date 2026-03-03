# 💬 Chat Application

A **full-stack real-time chat application** built with React, Node.js, Socket.IO, and MongoDB. Supports private messaging, group chats, media sharing, and push notifications via Firebase.

## 🌐 Live Demo

- **Frontend:** [https://chat-application-1-66mp.onrender.com](https://chat-application-1-66mp.onrender.com)
- **Backend API:** [https://chat-application-saku.onrender.com](https://chat-application-saku.onrender.com)

---

## ✨ Features

- 🔐 **Authentication** — Register/Login with JWT-based sessions and secure cookie storage
- 💬 **Private Messaging** — Real-time one-on-one chat powered by Socket.IO
- 👥 **Group Chats** — Create and manage group conversations with multiple participants
- 🖼️ **Media Sharing** — Send images in chats (uploaded to Cloudinary)
- 🟢 **Online Presence** — See which users are currently online in real time
- 🔔 **Push Notifications** — Firebase Cloud Messaging (FCM) for browser push notifications
- 🧑 **Profile Management** — Update profile picture and display name
- 🌓 **Theme Settings** — Customizable UI theme via the settings page
- 🏪 **Seller System** — Add and manage seller accounts

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** + Vite | UI framework and build tool |
| **React Router DOM v7** | Client-side routing |
| **Zustand** | Global state management |
| **Tailwind CSS v4** + DaisyUI | Styling and UI components |
| **Socket.IO Client** | Real-time communication |
| **Axios** | HTTP API requests |
| **Firebase** | Push notifications (FCM) |
| **Lucide React** | Icon library |
| **React Hot Toast** | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** + Express | REST API server |
| **Socket.IO** | Real-time WebSocket server |
| **MongoDB** + Mongoose | Database and ODM |
| **JWT** | Authentication tokens |
| **Bcrypt** | Password hashing |
| **Cloudinary** | Image/media storage |
| **Firebase Admin SDK** | Server-side push notifications |
| **Nodemon** | Development auto-restart |

---

## 📁 Project Structure

```
Chat Application/
├── FrontEnd/                   # React + Vite application
│   └── src/
│       ├── components/         # Reusable UI components
│       │   ├── Chat.jsx
│       │   ├── ChatHeader.jsx
│       │   ├── MessageInput.jsx
│       │   ├── Navbar.jsx
│       │   ├── Sidebar.jsx
│       │   └── Skeletons/
│       ├── pages/              # Application pages/routes
│       │   ├── HomePage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── ProfilePage.jsx
│       │   ├── SettingPage.jsx
│       │   ├── GroupPage.jsx
│       │   ├── GroupChatPage.jsx
│       │   ├── GroupsListPage.jsx
│       │   └── AddSellerPage.jsx
│       ├── store/              # Zustand state stores
│       ├── lib/                # Utility and config (axios, firebase, socket)
│       └── constants/          # App-wide constants
│
└── BackEnd/                    # Node.js + Express API
    └── src/
        ├── Config/             # Database connection
        ├── Controllers/        # Route handler logic
        │   ├── auth.Ctl.js
        │   ├── message.Ctl.js
        │   ├── group.Ctl.js
        │   └── seller.Ctl.js
        ├── Models/             # Mongoose schemas
        │   ├── user.model.js
        │   ├── message.model.js
        │   ├── group.model.js
        │   └── seller.model.js
        ├── Routes/             # API route definitions
        ├── lib/                # Utilities (socket, cloudinary, jwt, firebase)
        └── index.js            # Server entry point
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **MongoDB Atlas** account
- **Cloudinary** account
- **Firebase** project (for push notifications)

### 1. Clone the Repository

```bash
git clone https://github.com/yashwebcods/Chat-Application.git
cd Chat-Application
```

### 2. Configure Environment Variables

#### Backend (`BackEnd/.env`)

```env
PORT=8001
MONGO_URI=your_mongodb_atlas_connection_string
jwt_secret=your_jwt_secret_key
NODE_ENV=development

# Cloudinary
cloudinary_name=your_cloudinary_cloud_name
cloudinary_api_key=your_cloudinary_api_key
cloudinary_api_secret=your_cloudinary_api_secret

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CLIENT_CERT_URL=your_cert_url

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

#### Frontend (`FrontEnd/.env`)

```env
VITE_API_BASE_URL=http://localhost:8001
VITE_SOCKET_URL=http://localhost:8001

# Firebase
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### 3. Install & Run (Development)

Run both frontend and backend simultaneously from the root:

```bash
npm install
npm run dev
```

Or run them individually:

```bash
# Backend only
cd BackEnd && npm install && npm run dev

# Frontend only
cd FrontEnd && npm install && npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8001](http://localhost:8001)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT cookie |
| `POST` | `/api/auth/logout` | Logout and clear session |
| `GET` | `/api/auth/check` | Verify current session |
| `PUT` | `/api/auth/update-profile` | Update profile picture |
| `GET` | `/api/message/users` | Get all users for sidebar |
| `GET` | `/api/message/:id` | Get chat history with a user |
| `POST` | `/api/message/send/:id` | Send a private message |
| `GET` | `/api/group` | Get all groups for current user |
| `POST` | `/api/group/create` | Create a new group |
| `GET` | `/api/group/:id/messages` | Get group message history |
| `POST` | `/api/group/:id/send` | Send a group message |
| `GET` | `/api/seller` | Get all sellers |
| `POST` | `/api/seller/add` | Add a new seller |

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `getOnlineUser` | Server → Client | Broadcasts list of online users |
| `privateMessage` | Client → Server | Sends a direct message |
| `newMessage` | Server → Client | Delivers a direct message |
| `joinGroup` | Client → Server | Join a group room |
| `groupMessage` | Client → Server | Sends a message to a group |
| `newGroupMessage` | Server → Client | Delivers a group message |
| `groupNotification` | Server → Client | Join/leave notifications |

---

## ☁️ Deployment

This project is configured for deployment on **Render** using `render.yaml`.

### Deploy to Render

1. Push your code to GitHub
2. Connect the repository in [Render Dashboard](https://dashboard.render.com)
3. Render will auto-detect the `render.yaml` and create both the **backend web service** and **frontend static site**
4. Set all required environment variables in the Render dashboard

For step-by-step deployment instructions, see [DEPLOYMENT_RENDER.md](./DEPLOYMENT_RENDER.md).

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 👤 Author

**Yash Siddhapura**
- GitHub: [@yashwebcods](https://github.com/yashwebcods)

---

## 📄 License

This project is licensed under the **ISC License**.
