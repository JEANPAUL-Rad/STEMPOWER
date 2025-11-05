// Week: Groups projects by week
const WeekSchema = new Schema({
  name: String, // e.g., "Week 1"
  order: Number, // sort order
  projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }]
});