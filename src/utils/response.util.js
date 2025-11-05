export function error(res, message, status = 400) {
    return res.status(status).json({ message });
  }