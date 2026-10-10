const { FirestoreAdapter } = require('./firestoreAdapter');

const userAdapter = new FirestoreAdapter('users');

function UserModel(data = {}) {
  return userAdapter.createInstance(data);
}

UserModel.findOne = (query) => userAdapter.findOne(query);
UserModel.find = (query) => userAdapter.find(query);
UserModel.findById = (id) => userAdapter.findById(id);
UserModel.findByIdAndUpdate = (id, update, options) => userAdapter.findByIdAndUpdate(id, update, options);
UserModel.findByIdAndDelete = (id) => userAdapter.findByIdAndDelete(id);
UserModel.create = (data) => userAdapter.create(data);
UserModel.updateMany = (query, update) => userAdapter.updateMany(query, update);
UserModel.deleteMany = (query) => userAdapter.deleteMany(query);

module.exports = UserModel;