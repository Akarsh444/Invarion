const prisma = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

// Register a new user
async function register(req, res) {
  try {
    const { email, password, role, adminSecret } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password before storing
    const hashedPassword = await hashPassword(password);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
                // Public registration ALWAYS creates a CUSTOMER.
        // ADMIN can only be created by supplying the server-side secret,
        // which prevents anyone from self-promoting to admin via the API.
        role:
          role === 'ADMIN' && adminSecret === process.env.ADMIN_SIGNUP_SECRET
            ? 'ADMIN'
            : 'CUSTOMER',
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user info (without password) and token
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

// Login existing user
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if password matches
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { register, login };