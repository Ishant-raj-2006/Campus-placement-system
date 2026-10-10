const { FirestoreAdapter } = require('./firestoreAdapter');

const noticeAdapter = new FirestoreAdapter('notices');

function NoticeModel(data = {}) {
  return noticeAdapter.createInstance(data);
}

NoticeModel.findOne = (query) => noticeAdapter.findOne(query);
NoticeModel.find = (query) => noticeAdapter.find(query);
NoticeModel.findById = (id) => noticeAdapter.findById(id);
NoticeModel.findByIdAndUpdate = (id, update, options) => noticeAdapter.findByIdAndUpdate(id, update, options);
NoticeModel.findByIdAndDelete = (id) => noticeAdapter.findByIdAndDelete(id);
NoticeModel.create = (data) => noticeAdapter.create(data);
NoticeModel.updateMany = (query, update) => noticeAdapter.updateMany(query, update);
NoticeModel.deleteMany = (query) => noticeAdapter.deleteMany(query);

module.exports = NoticeModel;
