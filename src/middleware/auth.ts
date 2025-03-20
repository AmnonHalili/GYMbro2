// Check if token exists in the request
if (!token) {
  console.log(`[auth] No token provided in request to ${req.originalUrl}`);
  res.status(401).json({ message: 'Access token is required' });
  return;
} 