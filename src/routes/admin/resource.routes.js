// import express from 'express';
// import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
// import * as resourceController from '../../controllers/admin/resource.controller.js';

// const router = express.Router();

// router.post('/resources', authenticate, requireAdmin, resourceController.create);
// router.get('/resources', authenticate, requireAdmin, resourceController.list);
// router.get('/resources/:resource_id', authenticate, requireAdmin, resourceController.get);
// router.put('/resources/:resource_id', authenticate, requireAdmin, resourceController.update);
// router.delete('/resources/:resource_id', authenticate, requireAdmin, resourceController.remove);

// export default router;

import express from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import upload from '../../middleware/upload.js'; // ✅ This matches what your file exports
import * as resourceController from '../../controllers/admin/resource.controller.js';

const router = express.Router();

// POST /resources - Create resource with file upload
router.put('/resources/:resource_id', 
  authenticate, 
  requireAdmin, 
  upload.single('file'), // ✅ handles formData.append("file", file)
  resourceController.update
);

router.post('/resources', 
  authenticate, 
  requireAdmin, 
  upload.single('file'), // ✅ also for create
  resourceController.create
);

// GET /resources - List resources (supports pagination and search)
router.get('/resources', 
  authenticate, 
  requireAdmin, 
  resourceController.list
);

// GET /resources/:resource_id - Get single resource
router.get('/resources/:resource_id', 
  authenticate, 
  requireAdmin, 
  resourceController.get
);


// DELETE /resources/:resource_id - Delete resource
router.delete('/resources/:resource_id', 
  authenticate, 
  requireAdmin, 
  resourceController.remove
);

export default router;