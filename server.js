const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// 1. Connect to MongoDB (Using a local MongoDB URI or MongoDB Atlas URI)
// Replace with your MongoDB connection string if using Atlas
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blog-app';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB database successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// 2. Define Mongoose Schemas & Models
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Blog = mongoose.model('Blog', blogSchema);

// 3. API Routes

// Register User
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists!' });
        }
        
        const newUser = new User({ name, email, password });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully and saved to DB!' });
    } catch (err) {
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password!' });
        }
        res.json({ message: 'Login successful!', name: user.name });
    } catch (err) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Create Blog
app.post('/api/blogs', async (req, res) => {
    try {
        const { title, content } = req.body;
        const newBlog = new Blog({ title, content });
        await newBlog.save();
        res.status(201).json({ message: 'Blog created and saved to DB!', blog: newBlog });
    } catch (err) {
        res.status(500).json({ message: 'Error creating blog.' });
    }
});

// Get All Blogs
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching blogs.' });
    }
});

// Get Single Blog Details by ID
app.get('/api/blogs/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found!' });
        }
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching blog details.' });
    }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});