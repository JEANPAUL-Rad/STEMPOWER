// import { 
//     approveUser, 
//     blockUser, 
//     unblockUser, 
//     getUsersByStatus, 
//     findUserById,
//     findUserByEmail,
//     updateUser,
//     deleteUser,
//     getUsersByRole,
//     getUsersByRoleAndStatus,
//     countUsersByRole,
//   countUsersByRoleAndStatus,
//     getAllUsers,  // ✅ <--- make sure this is included
//   countAllUsers // ✅ for total count without filters
   
//   } from '../models/user.model.js';
  
//   // Approve pending user
//   export async function approveStudent(req, res) {
//     const user = await findUserById(req.params.user_id);
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     if (user.status !== 'pending') {
//       return res.status(400).json({ message: 'User is not pending approval' });
//     }
//     const updatedUser = await approveUser(req.params.user_id);
//     res.json({ message: 'User approved', user: updatedUser });
//   }
  
//   // Block user
//   export async function blockStudent(req, res) {
//     const user = await findUserById(req.params.user_id);
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     if (user.status === 'blocked') {
//       return res.status(400).json({ message: 'User is already blocked' });
//     }
//     if (user.status === 'pending') {
//       return res.status(400).json({ message: 'Cannot block a pending user. Approve first.' });
//     }
//     const updatedUser = await blockUser(req.params.user_id);
//     res.json({ message: 'User blocked', user: updatedUser });
//   }
  
//   // Unblock user
//   export async function unblockStudent(req, res) {
//     const user = await findUserById(req.params.user_id);
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     if (user.status !== 'blocked') {
//       return res.status(400).json({ message: 'User is not blocked' });
//     }
//     const updatedUser = await unblockUser(req.params.user_id);
//     res.json({ message: 'User unblocked', user: updatedUser });
//   }
  
//   // List users by status (pending/blocked/active)
//   export const listUsersByStatus = async (req, res) => {
//     const { status } = req.query;
//     // if (!status) return res.status(400).json({ message: 'Missing status parameter' });
//     const users = await getUsersByStatus(status);
//     res.json(users);
// };
  
// // get single user by ID
// export async function getSingleUser(req, res) {
//     let user;
//     if (req.params.id) {
//       user = await findUserById(req.params.id);
//     } else if (req.query.email) {
//       user = await findUserByEmail(req.query.email);
//     } else {
//       return res.status(400).json({ message: 'User ID or email required' });
//     }
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     res.json(user);
// }
  
// export async function updateUserProfile(req, res) {
//     const user = await findUserById(req.params.id);
//     if (!user) return res.status(404).json({ message: 'User not found' });
  
//     const allowedFields = ['name', 'email', 'role', 'status'];
//     const fieldsToUpdate = {};
//     for (const key of allowedFields) {
//       if (req.body[key] !== undefined) fieldsToUpdate[key] = req.body[key];
//     }
  
//     try {
//       const updatedUser = await updateUser(req.params.id, fieldsToUpdate);
//       res.json({ message: 'User updated', user: updatedUser });
//     } catch (err) {
//       res.status(400).json({ message: err.message });
//     }
//   }
  
// export async function deleteUserById(req, res) {
//     const user = await findUserById(req.params.id);
//     if (!user) return res.status(404).json({ message: 'User not found' });
  
//     await deleteUser(req.params.id);
//     res.json({ message: 'User deleted' });
// }
  

// // count and get user by role

// export async function listUsers(req, res) {
//     const { role, status, count } = req.query;
  
//     try {
//       // COUNT logic
//       if (count) {
//         let total;
//         if (role && status) {
//           total = await countUsersByRoleAndStatus(role, status);
//         } else if (role) {
//           total = await countUsersByRole(role);
//         } else if (status) {
//           total = await countUsersByStatus(status); // you must define this if you want to support it
//         } else {
//           total = await countAllUsers(); // define this if you want to support it
//         }
//         return res.json({ total });
//       }
  
//       // LIST logic
//       let users;
//       if (role && status) {
//         users = await getUsersByRoleAndStatus(role, status);
//       } else if (role) {
//         users = await getUsersByRole(role);
//       } else if (status) {
//         users = await getUsersByStatus(status);
//       } else {
//         users = await getAllUsers();
//       }
//       res.json(users);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   }




import { 
    approveUser, 
    blockUser, 
    unblockUser, 
    getUsersByStatus, 
    findUserById,
    findUserByEmail,
    updateUser,
    deleteUser,
    getUsersByRole,
    getUsersByRoleAndStatus,
    countUsersByRole,
    countUsersByRoleAndStatus,
    getAllUsers,
    countAllUsers,
    getUsersWithPagination,
    countUsersWithFilters
} from '../models/user.model.js';

// Approve pending user
export async function approveStudent(req, res) {
  const user = await findUserById(req.params.user_id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.status !== 'pending') {
    return res.status(400).json({ message: 'User is not pending approval' });
  }
  const updatedUser = await approveUser(req.params.user_id);
  res.json({ message: 'User approved', user: updatedUser });
}

// Block user
export async function blockStudent(req, res) {
  const user = await findUserById(req.params.user_id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.status === 'blocked') {
    return res.status(400).json({ message: 'User is already blocked' });
  }
  if (user.status === 'pending') {
    return res.status(400).json({ message: 'Cannot block a pending user. Approve first.' });
  }
  const updatedUser = await blockUser(req.params.user_id);
  res.json({ message: 'User blocked', user: updatedUser });
}

// Unblock user
export async function unblockStudent(req, res) {
  const user = await findUserById(req.params.user_id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.status !== 'blocked') {
    return res.status(400).json({ message: 'User is not blocked' });
  }
  const updatedUser = await unblockUser(req.params.user_id);
  res.json({ message: 'User unblocked', user: updatedUser });
}

// List users by status (pending/blocked/active)
export const listUsersByStatus = async (req, res) => {
  const { status } = req.query;
  const users = await getUsersByStatus(status);
  res.json(users);
};

// get single user by ID
export async function getSingleUser(req, res) {
  let user;
  if (req.params.id) {
    user = await findUserById(req.params.id);
  } else if (req.query.email) {
    user = await findUserByEmail(req.query.email);
  } else {
    return res.status(400).json({ message: 'User ID or email required' });
  }
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}

export async function updateUserProfile(req, res) {
  const user = await findUserById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const allowedFields = ['name', 'email', 'role', 'status'];
  const fieldsToUpdate = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) fieldsToUpdate[key] = req.body[key];
  }

  try {
    const updatedUser = await updateUser(req.params.id, fieldsToUpdate);
    res.json({ message: 'User updated', user: updatedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteUserById(req, res) {
  const user = await findUserById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  await deleteUser(req.params.id);
  res.json({ message: 'User deleted' });
}

// Enhanced list users with search and pagination
export async function listUsers(req, res) {
  const { role, status, count, search, page, limit } = req.query;

  try {
    // NEW: Handle search and pagination
    if (search !== undefined || page !== undefined || limit !== undefined) {
      const searchParams = {
        search: search || '',
        role: role || '',
        status: status || '',
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 6
      };
      
      // Get users with pagination
      const users = await getUsersWithPagination(searchParams);
      
      // Get total count for pagination
      const total = await countUsersWithFilters({
        search: searchParams.search,
        role: searchParams.role,
        status: searchParams.status
      });
      
      const totalPages = Math.ceil(total / searchParams.limit);
      
      return res.json({
        users,
        total,
        page: searchParams.page,
        limit: searchParams.limit,
        totalPages,
        hasNextPage: searchParams.page < totalPages,
        hasPrevPage: searchParams.page > 1
      });
    }
    
    // COUNT logic (existing functionality)
    if (count) {
      let total;
      if (role && status) {
        total = await countUsersByRoleAndStatus(role, status);
      } else if (role) {
        total = await countUsersByRole(role);
      } else if (status) {
        total = await countUsersByStatus(status);
      } else {
        total = await countAllUsers();
      }
      return res.json({ total });
    }

    // LIST logic (existing functionality)
    let users;
    if (role && status) {
      users = await getUsersByRoleAndStatus(role, status);
    } else if (role) {
      users = await getUsersByRole(role);
    } else if (status) {
      users = await getUsersByStatus(status);
    } else {
      users = await getAllUsers();
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}