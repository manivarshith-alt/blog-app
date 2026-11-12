const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Temporary mock databases (arrays)
let users = [];
let blogs = [];

// 1. User Registration API
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists!' });
    }
    
    users.push({ name, email, password });
    res.status(201).json({ message: 'User registered successfully!' });
});

// 2. User Login API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password!' });
    }
    
    res.json({ message: 'Login successful!', name: user.name });
});

// 3. Create Blog API
app.post('/api/blogs', (req, res) => {
    const { title, content } = req.body;
    const newBlog = { id: blogs.length + 1, title, content };
    blogs.push(newBlog);
    res.status(201).json({ message: 'Blog created successfully!', blog: newBlog });
});

// 4. Get All Blogs API
app.get('/api/blogs', (req, res) => {
    res.json(blogs);
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});