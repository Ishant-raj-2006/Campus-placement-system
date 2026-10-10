const { FirestoreAdapter } = require('./firestoreAdapter');

const jobAdapter = new FirestoreAdapter('jobs');

function JobModel(data = {}) {
  return jobAdapter.createInstance(data);
}

JobModel.findOne = (query) => jobAdapter.findOne(query);
JobModel.find = (query) => jobAdapter.find(query);
JobModel.findById = (id) => jobAdapter.findById(id);
JobModel.findByIdAndUpdate = (id, update, options) => jobAdapter.findByIdAndUpdate(id, update, options);
JobModel.findByIdAndDelete = (id) => jobAdapter.findByIdAndDelete(id);
JobModel.create = (data) => jobAdapter.create(data);
JobModel.updateMany = (query, update) => jobAdapter.updateMany(query, update);
JobModel.deleteMany = (query) => jobAdapter.deleteMany(query);

module.exports = JobModel;
