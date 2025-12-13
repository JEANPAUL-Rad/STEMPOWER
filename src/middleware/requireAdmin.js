export function requireAdmin(req, res, next) {
  const id = req.user?.user_id ?? 'Unknown';
  const email = req.user?.email ?? 'Unknown';
  const role = req.user?.role ?? 'Unknown';
  console.log(`[ADMIN CHECK] User: ${email} (id=${id}), Role: ${role}, Time: ${new Date().toISOString()}`);

  if (!req.user || req.user.role !== 'admin') {
    console.warn(`[ADMIN DENIED] User: ${email} (id=${id}), attempted admin action at ${new Date().toISOString()}`);
    return res.status(403).json({ message: 'Admins only' });
  }
  next();
}
