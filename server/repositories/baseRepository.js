// server/repositories/baseRepository.js

const { PaginationHelper } = require("../utils/paginationHelper");

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll(filter = {}, populate = "") {
    const query = this.model.find(filter);
    if (populate) {
      query.populate(populate);
    }
    return await query;
  }

  async findById(id, populate = "") {
    const query = this.model.findById(id);
    if (populate) {
      query.populate(populate);
    }
    return await query;
  }

  async findOne(filter, populate = "") {
    const query = this.model.findOne(filter);
    if (populate) {
      query.populate(populate);
    }
    return await query;
  }

  async create(data) {
    const entity = new this.model(data);
    return await entity.save();
  }

  async update(id, data) {
    return await this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await this.model.findByIdAndDelete(id);
  }

  async exists(filter) {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }

  async count(filter = {}) {
    return await this.model.countDocuments(filter);
  }

  async paginate(query, options) {
    return await PaginationHelper.paginate(this.model, query, options);
  }

  // Bulk operations
  async createMany(dataArray) {
    return await this.model.insertMany(dataArray);
  }

  async updateMany(filter, update) {
    return await this.model.updateMany(filter, update);
  }

  async deleteMany(filter) {
    return await this.model.deleteMany(filter);
  }

  // Aggregation helper
  async aggregate(pipeline) {
    return await this.model.aggregate(pipeline);
  }
}

module.exports = BaseRepository;
