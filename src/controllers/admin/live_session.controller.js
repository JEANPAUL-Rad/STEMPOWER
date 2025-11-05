import db from '../../config/db.js'; // keep this import

// Get all live sessions
export const getAllLiveSessions = async (req, res) => {
  try {
    const result = await db`
      SELECT * FROM live_sessions ORDER BY created_at DESC
    `;
    res.json(result); // result is already an array
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new live session
export const createLiveSession = async (req, res) => {
  const { title, description, meet_link } = req.body;
  try {
    const result = await db`
      INSERT INTO live_sessions (title, description, meet_link)
      VALUES (${title}, ${description}, ${meet_link})
      RETURNING *
    `;
    res.status(201).json(result[0]); // result is an array
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a live session
export const updateLiveSession = async (req, res) => {
  const { live_id } = req.params;
  const { title, description, meet_link } = req.body;
  try {
    const result = await db`
      UPDATE live_sessions
      SET title = ${title},
          description = ${description},
          meet_link = ${meet_link},
          updated_at = CURRENT_TIMESTAMP
      WHERE live_id = ${live_id}
      RETURNING *
    `;
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a live session
export const deleteLiveSession = async (req, res) => {
  const { live_id } = req.params;
  try {
    await db`
      DELETE FROM live_sessions WHERE live_id = ${live_id}
    `;
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
