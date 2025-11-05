export function requireAdmin(req, res, next) {
    // Simple logging for debugging/admin audit
    console.log(`[ADMIN CHECK] User: ${req.user ? req.user.email : 'Unknown'}, Role: ${req.user ? req.user.role : 'Unknown'}, Time: ${new Date().toISOString()}`);
  
    if (!req.user || req.user.role !== 'admin') {
      console.warn(`[ADMIN DENIED] User: ${req.user ? req.user.email : 'Unknown'}, attempted admin action at ${new Date().toISOString()}`);
      return res.status(403).json({ message: 'Admins only' });
    }
    next();
  }