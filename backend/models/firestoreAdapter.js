const { getDb } = require('../config/Firebase');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

function getNestedValue(obj, pathStr) {
  if (!obj || !pathStr) return undefined;
  const parts = pathStr.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    if (Array.isArray(curr)) {
      return curr.map(item => getNestedValue(item, part)).flat();
    }
    curr = curr[part];
  }
  return curr;
}

function setNestedValue(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== 'object') {
      curr[part] = {};
    }
    curr = curr = curr[part];
  }
  curr[parts[parts.length - 1]] = value;
}

function matchQuery(doc, query) {
  if (!query || Object.keys(query).length === 0) return true;

  for (const [key, expected] of Object.entries(query)) {
    const val = getNestedValue(doc, key);

    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (expected.$in && Array.isArray(expected.$in)) {
        if (!expected.$in.includes(val)) return false;
        continue;
      }
      if (expected.$ne !== undefined) {
        if (val === expected.$ne) return false;
        continue;
      }
    }

    if (Array.isArray(val)) {
      const match = val.some(v => String(v) === String(expected));
      if (!match) return false;
    } else if (val !== undefined) {
      if (String(val) !== String(expected)) return false;
    } else {
      if (expected !== undefined && expected !== null) return false;
    }
  }

  return true;
}

class QueryChain {
  constructor(promise, collectionName) {
    this.promise = promise;
    this.collectionName = collectionName;
    this._populatePaths = [];
    this._selectFields = null;
  }

  populate(pathOptions) {
    this._populatePaths.push(pathOptions);
    return this;
  }

  select(fields) {
    this._selectFields = fields;
    return this;
  }

  async exec() {
    let result = await this.promise;
    if (!result) return result;

    const isArray = Array.isArray(result);
    let items = isArray ? result : [result];

    // Handle populate if requested
    for (const pop of this._populatePaths) {
      const pathStr = typeof pop === 'string' ? pop : pop.path;
      const select = typeof pop === 'object' ? pop.select : null;

      for (let item of items) {
        const refId = getNestedValue(item, pathStr);
        if (refId) {
          // If reference is company or user or job
          let refColName = 'companies';
          if (pathStr === 'sender' || pathStr === 'user' || pathStr === 'studentId') refColName = 'users';
          if (pathStr === 'company') refColName = 'companies';
          if (pathStr === 'job' || pathStr === 'jobId') refColName = 'jobs';

          const db = getDb();
          const docRef = await db.collection(refColName).doc(String(refId)).get();
          if (docRef.exists) {
            let data = { id: docRef.id, _id: docRef.id, ...docRef.data() };
            if (select) {
              const selectedKeys = select.split(' ');
              const filtered = { id: data.id, _id: data._id };
              selectedKeys.forEach(k => { if (k && data[k] !== undefined) filtered[k] = data[k]; });
              data = filtered;
            }
            setNestedValue(item, pathStr, data);
          }
        }
      }
    }

    return isArray ? items : items[0];
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class FirestoreAdapter {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  get collection() {
    return getDb().collection(this.collectionName);
  }

  _wrapDoc(doc) {
    if (!doc.exists) return null;
    const data = doc.data();
    const self = this;
    const documentObj = {
      _id: doc.id,
      id: doc.id,
      ...data,
      async save() {
        const { _id, id, save, deleteOne, ...toSave } = this;
        await self.collection.doc(doc.id).set(toSave, { merge: true });
        return this;
      },
      async deleteOne() {
        await self.collection.doc(doc.id).delete();
        return this;
      }
    };
    return documentObj;
  }

  createInstance(data = {}) {
    const id = data._id || data.id || generateId();
    const self = this;
    const docObj = {
      _id: id,
      id: id,
      ...data,
      async save() {
        const { _id, id, save, deleteOne, ...toSave } = this;
        await self.collection.doc(id).set(toSave, { merge: true });
        return this;
      },
      async deleteOne() {
        await self.collection.doc(id).delete();
        return this;
      }
    };
    return docObj;
  }

  async create(data) {
    const instance = this.createInstance(data);
    await instance.save();
    return instance;
  }

  findOne(query = {}) {
    const promise = (async () => {
      if (query._id || query.id) {
        const id = String(query._id || query.id);
        const doc = await this.collection.doc(id).get();
        const wrapped = this._wrapDoc(doc);
        if (wrapped && matchQuery(wrapped, query)) {
          return wrapped;
        }
        return null;
      }

      const snapshot = await this.collection.get();
      for (const doc of snapshot.docs) {
        const wrapped = this._wrapDoc(doc);
        if (wrapped && matchQuery(wrapped, query)) {
          return wrapped;
        }
      }
      return null;
    })();

    return new QueryChain(promise, this.collectionName);
  }

  find(query = {}) {
    const promise = (async () => {
      const snapshot = await this.collection.get();
      const results = [];
      for (const doc of snapshot.docs) {
        const wrapped = this._wrapDoc(doc);
        if (wrapped && matchQuery(wrapped, query)) {
          results.push(wrapped);
        }
      }
      return results;
    })();

    return new QueryChain(promise, this.collectionName);
  }

  findById(id) {
    const promise = (async () => {
      if (!id) return null;
      const doc = await this.collection.doc(String(id)).get();
      return this._wrapDoc(doc);
    })();

    return new QueryChain(promise, this.collectionName);
  }

  async findByIdAndUpdate(id, updateData, options = {}) {
    if (!id) return null;
    const docRef = this.collection.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return null;

    let current = doc.data();
    if (updateData.$set) {
      Object.assign(current, updateData.$set);
    } else {
      Object.assign(current, updateData);
    }

    await docRef.set(current, { merge: true });
    const updated = await docRef.get();
    return this._wrapDoc(updated);
  }

  async findByIdAndDelete(id) {
    if (!id) return null;
    const docRef = this.collection.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return null;
    const wrapped = this._wrapDoc(doc);
    await docRef.delete();
    return wrapped;
  }

  async updateMany(query, updateData) {
    const matchingDocs = await this.find(query);
    for (const docObj of matchingDocs) {
      const docRef = this.collection.doc(docObj._id);
      if (updateData.$pull) {
        // Handle $pull operation if needed
        let current = (await docRef.get()).data() || {};
        for (const [arrayPath, pullCriteria] of Object.entries(updateData.$pull)) {
          let arr = getNestedValue(current, arrayPath);
          if (Array.isArray(arr)) {
            arr = arr.filter(item => !matchQuery(item, pullCriteria));
            setNestedValue(current, arrayPath, arr);
          }
        }
        await docRef.set(current, { merge: true });
      } else {
        await docRef.update(updateData);
      }
    }
  }

  async deleteMany(query) {
    const matchingDocs = await this.find(query);
    for (const docObj of matchingDocs) {
      await this.collection.doc(docObj._id).delete();
    }
  }
}

module.exports = {
  FirestoreAdapter,
  generateId
};
