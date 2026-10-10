const { FirestoreAdapter } = require('./firestoreAdapter');

const companyAdapter = new FirestoreAdapter('companies');

function CompanyModel(data = {}) {
  return companyAdapter.createInstance(data);
}

CompanyModel.findOne = (query) => companyAdapter.findOne(query);
CompanyModel.find = (query) => companyAdapter.find(query);
CompanyModel.findById = (id) => companyAdapter.findById(id);
CompanyModel.findByIdAndUpdate = (id, update, options) => companyAdapter.findByIdAndUpdate(id, update, options);
CompanyModel.findByIdAndDelete = (id) => companyAdapter.findByIdAndDelete(id);
CompanyModel.create = (data) => companyAdapter.create(data);
CompanyModel.updateMany = (query, update) => companyAdapter.updateMany(query, update);
CompanyModel.deleteMany = (query) => companyAdapter.deleteMany(query);

module.exports = CompanyModel;
