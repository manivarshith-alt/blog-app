const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blog-app';
const JWT_SECRET = 'your_jwt_super_secret_key'; // In production, use environment variables

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB database successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schemas & Models
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Blog = mongoose.model('Blog', blogSchema);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403) .json({ message: 'No token provided!' });
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized / Invalid token!' });
        req.userId = decoded.userId;
        req.userName = decoded.name;
        next();
    });
};

// --- AUTH ROUTES ---

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists!' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password!' });

        const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Login successful!', token, name: user.name, email: user.email });
    } catch (err) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Get User Profile
app.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found!' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching profile.' });
    }
});

// --- BLOG ROUTES ---

// Create Blog (Protected)
app.post('/api/blogs', verifyToken, async (req, res) => {
    try {
        const { title, content } = req.body;
        const newBlog = new Blog({
            title,
            content,
            author: req.userId,
            authorName: req.userName
        });
        await newBlog.save();
        res.status(201).json({ message: 'Blog created successfully!', blog: newBlog });
    } catch (err) {
        res.status(500).json({ message: 'Error creating blog.' });
    }
});

// Get All Blogs (Public)
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching blogs.' });
    }
});

// Get Logged-in User's Blogs (Protected Dashboard Blogs)
app.get('/api/my-blogs', verifyToken, async (req, res) => {
    try {
        const blogs = await Blog.find({ author: req.userId }).sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching your blogs.' });
    }
});

// Get Single Blog Detail
app.get('/api/blogs/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found!' });
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching blog details.' });
    }
});

// Update Blog (Protected - Only Author)
app.put('/api/blogs/:id', verifyToken, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found!' });
        if (blog.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized to edit this blog!' });
        }

        blog.title = req.body.title || blog.title;
        blog.content = req.body.content || blog.content;
        await blog.save();

        res.json({ message: 'Blog updated successfully!', blog });
    } catch (err) {
        res.status(500).json({ message: 'Error updating blog.' });
    }
});

// Delete Blog (Protected - Only Author)
app.delete('/api/blogs/:id', verifyToken, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found!' });
        if (blog.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized to delete this blog!' });
        }

        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting blog.' });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});