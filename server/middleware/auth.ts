import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

// JWT Secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'pharmachain-dev-secret-key';
const JWT_EXPIRY = '24h';

// Role hierarchy and permissions
export const ROLES = {
  MANUFACTURER: 'Manufacturer',
  DISTRIBUTOR: 'Distributor', 
  REGULATOR: 'Regulator',
  QA: 'QA',
  AUDITOR: 'Auditor'
} as const;

export const PERMISSIONS = {
  CREATE_BATCH: 'CREATE_BATCH',
  UPDATE_BATCH_STATUS: 'UPDATE_BATCH_STATUS',
  ADD_QUALITY_TEST: 'ADD_QUALITY_TEST',
  RECALL_BATCH: 'RECALL_BATCH',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  MANAGE_USERS: 'MANAGE_USERS',
  EMERGENCY_ACTIONS: 'EMERGENCY_ACTIONS'
} as const;

// Role-based permissions matrix
export const ROLE_PERMISSIONS = {
  [ROLES.MANUFACTURER]: [
    PERMISSIONS.CREATE_BATCH,
    PERMISSIONS.UPDATE_BATCH_STATUS,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ROLES.DISTRIBUTOR]: [
    PERMISSIONS.UPDATE_BATCH_STATUS,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ROLES.QA]: [
    PERMISSIONS.ADD_QUALITY_TEST,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ROLES.REGULATOR]: [
    PERMISSIONS.RECALL_BATCH,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.EMERGENCY_ACTIONS
  ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.ADD_QUALITY_TEST
  ]
};

// User database (in production, use proper database)
interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  licenseId: string;
  companyName: string;
  verified: boolean;
  walletAddress?: string;
  createdAt: Date;
}

// Temporary in-memory user store (replace with database in production)
const users = new Map<string, User>();

// Default admin user for testing
const adminUser: User = {
  id: 'admin-001',
  email: 'admin@pharmachain.com',
  passwordHash: bcrypt.hashSync('Admin123!', 10),
  role: ROLES.REGULATOR,
  licenseId: 'REG-ADMIN-001',
  companyName: 'PharmaChain Regulatory Authority',
  verified: true,
  createdAt: new Date()
};
users.set(adminUser.email, adminUser);

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  // Allow demo tokens for development
  if (authHeader && authHeader.includes('demo-jwt-token')) {
    req.user = {
      id: 'demo-user-1',
      email: 'demo@pharmachain.com',
      role: 'Manufacturer',
      licenseId: 'LIC-DEMO-001',
      companyName: 'Demo PharmaCorp',
      verified: true
    };
    return next();
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Valid authentication token required' 
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired token' 
    });
  }
};

// Permission-based authorization middleware
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }
    
    const userPermissions = ROLE_PERMISSIONS[req.user.role as keyof typeof ROLE_PERMISSIONS] || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Insufficient privileges. Required permission: ${permission}` 
      });
    }
    
    next();
  };
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }
    
    next();
  };
};

// Verification status check
export const requireVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Authentication required' 
    });
  }
  
  if (!req.user.verified) {
    return res.status(403).json({ 
      error: 'Account Not Verified', 
      message: 'Your account must be verified by a regulator before performing this action' 
    });
  }
  
  next();
};

// Authentication routes
export const authRoutes = {
  // User registration
  register: async (req: Request, res: Response) => {
    try {
      const { email, password, role, licenseId, companyName, walletAddress } = req.body;
      
      // Validation
      if (!email || !password || !role || !licenseId || !companyName) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          required: ['email', 'password', 'role', 'licenseId', 'companyName'] 
        });
      }
      
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ 
          error: 'Invalid role', 
          validRoles: Object.values(ROLES) 
        });
      }
      
      if (users.has(email)) {
        return res.status(409).json({ 
          error: 'Email already registered' 
        });
      }
      
      // Password strength validation
      if (password.length < 8) {
        return res.status(400).json({ 
          error: 'Password must be at least 8 characters long' 
        });
      }
      
      const passwordHash = await bcrypt.hash(password, 12);
      
      const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        passwordHash,
        role,
        licenseId,
        companyName,
        verified: false, // Requires regulator verification
        walletAddress,
        createdAt: new Date()
      };
      
      users.set(email, newUser);
      
      const { passwordHash: _, ...userResponse } = newUser;
      res.status(201).json({ 
        message: 'User registered successfully. Awaiting regulator verification.', 
        user: userResponse 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: 'Registration failed', 
        message: 'Internal server error' 
      });
    }
  },
  
  // User login
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password required' 
        });
      }
      
      const user = users.get(email);
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid credentials' 
        });
      }
      
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ 
          error: 'Invalid credentials' 
        });
      }
      
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          verified: user.verified,
          licenseId: user.licenseId,
          companyName: user.companyName,
          walletAddress: user.walletAddress
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      
      const { passwordHash: _, ...userResponse } = user;
      res.json({ 
        message: 'Login successful', 
        token, 
        user: userResponse 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        error: 'Login failed', 
        message: 'Internal server error' 
      });
    }
  },
  
  // User verification (regulator only)
  verifyUser: async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const { verified } = req.body;
      
      const user = users.get(email);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }
      
      user.verified = verified;
      users.set(email, user);
      
      const { passwordHash: _, ...userResponse } = user;
      res.json({ 
        message: `User ${verified ? 'verified' : 'unverified'} successfully`, 
        user: userResponse 
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ 
        error: 'Verification failed', 
        message: 'Internal server error' 
      });
    }
  },
  
  // Get all users (regulator only)
  getUsers: async (req: Request, res: Response) => {
    try {
      const userList = Array.from(users.values()).map(user => {
        const { passwordHash: _, ...userResponse } = user;
        return userResponse;
      });
      
      res.json({ users: userList });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch users', 
        message: 'Internal server error' 
      });
    }
  },
  
  // Get current user profile
  getProfile: async (req: Request, res: Response) => {
    try {
      const user = users.get(req.user.email);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }
      
      const { passwordHash: _, ...userResponse } = user;
      res.json({ user: userResponse });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch profile', 
        message: 'Internal server error' 
      });
    }
  }
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        verified: boolean;
        licenseId: string;
        companyName: string;
        walletAddress?: string;
      };
    }
  }
}