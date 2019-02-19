import _ from 'lodash'
import knex from 'knex'
import bookshelf from 'bookshelf'

import config from './config'
import defaults from './defaults'
import log from './log'

let host = config.get('knex:connection')

log.info(host, 'Connecting to DB')

const client = knex(config.get('knex'))

// Check if we're running tests while connected to
// potential production environment.
/* istanbul ignore if  */
if (config.get('NODE_ENV') === 'test' &&
    (config.get('knex:connection:database') !== 'kisildalur_test' ||
     config.get('knex:connection:connection'))) {
  // There is an offchance that we're running tests on
  // production database. Exit NOW!
  log.error('Critical: potentially running test on production enviroment. Shutting down.')
  process.exit(1)
}

const shelf = bookshelf(client)

shelf.plugin('virtuals')
shelf.plugin('pagination')

// Helper method to create models
shelf.createModel = (attr, opts) => {
  // Create default attributes to all models
  let attributes = defaults(attr, {
    /**
     * Always include created_at and updated_at for all models default.
     */
    hasTimestamps: true,

    /**
     * Columns selected in get single queries.
     */
    privateFields: ['*'],

    /**
     * Event handler when fetch() is called. This gets called for both
     * when getSingle() or just manual fetch() is called as well as
     * when relation models through belongsTo() resources get fetched.
     *
     * @param {Model} model - The model instance if fetch() was used. For
     *                        belongsTo this is the relation model thingy.
     * @param {Array} columns - Array of columns to select if fetch() was used.
     *                          Otherwise this is null.
     * @param {Object} options - Options for the fetch. Includes the query
     *                           builder object.
     */
    checkFetching(model, columns, options) {
      // First override that is_deleted always gets filtered out.
      options.query.where({ is_deleted: false })

      // If we have columns, fetch() or getSingle is the caller and no
      // custom select() was called on the query.
      if (columns) {
        // We override columns default value of 'table_name.*' select and
        // replace it with actual fields. This allows us to hide columns in
        // public results.
        columns.splice(...[0, columns.length].concat(
          model.privateFields.map(item => `${model.tableName}.${item}`)
        ))
      // If we have relatedData in the model object, then we're dealing with a
      // belongsTo relation query. If not, then we're dealing with a custom
      // fetch() with select() query.
      } else if (model.relatedData) {
        // We are dealing with belongsTo relation query. Override the default
        // 'relation_table.*' with public select columns.

        // We override the actual value in the query because doing select()
        // does not override or replace the previous value during testing.
        let relatedColums = options.query._statements[0].value

        // During some Model.relatedDAta() queries, the select statement
        // is actually hidden in the third statement so we grab that instead
        if (options.query._statements[0].grouping === 'where') {
          relatedColums = options.query._statements[2].value
        }

        relatedColums.splice(...[0, relatedColums.length].concat(
          model.relatedData.target.publicFields.map(item => `${model.relatedData.targetTableName}.${item}`)
        ))
      }
    },

    /**
     * Event handler after a fetch() operation and finished.
     *
     * @param {Model} model - The model instance.
     * @param {Object} response - Knex query response.
     * @param {Object} options - Options for the fetched.
     */
    checkFetched(model, response, options) {
      model._ctx = options.ctx
    },

    /**
     * Event handler when fetchALL() is called. This gets called for both
     * when getAll() or just manual fetchAll().
     *
     * @param {CollectionBase} collection - The collection base for the model.
     *                                      This does not contain a model
     *                                      instance so privateFields is not
     *                                      accessible here.
     * @param {Array} columns - Array of columns to select if fetchAll() was
     *                          used. Otherwise this is null.
     * @param {Object} options - Options for the fetch. Includes the query
     *                           builder object.
     */
    checkFetchingCollection(collection, columns, options) {
      // I really really apologise for this.
      if (!options.query._statements[0] ||
          !options.query._statements[0].column ||
          !options.query._statements[0].column.indexOf ||
          options.query._statements[0].column.indexOf('is_deleted') === -1) {
        // First override that is_deleted always gets filtered out.
        options.query.where(`${collection.tableName()}.is_deleted`, false)
      }

      // If we have columns, we're dealing with a normal basic fetchAll() or
      // a getAll() caller.
      if (columns) {
        columns.splice(...[0, columns.length].concat(collection.model.publicFields))
      }
    },

    /**
     * Event handler when fetchAll() has been called and fetched.
     *
     * @param {CollectionBase} collection - The collection that has been fetched.
     * @param {Array} columns - Array of columns to select if fetchAll() was
     *                          used. Otherwise this is null.
     * @param {Object} options - Options for the fetch.
     */
    checkFetchedCollection(collection, columns, options) {
      collection.forEach(item => (item._ctx = options.ctx))
    },

    /**
     * Event handler for hasMany relation fetching. This gets called whenever
     * hasMany related is being fetched.
     *
     * @param {CollectionBase} collection - The collection base for the model.
     *                                      This does not contain a model
     *                                      instance so privateFields is not
     *                                      accessible here.
     * @param {Array} columns - Array of columns to select. This is
     *                          always null.
     * @param {Object} options - Options for the fetch. Includes the query
     *                           builder object.
     */
    checkFetchingHasMany(collection, columns, options) {
      // First override that is_deleted always gets filtered out.
      options.query.where({ is_deleted: false })

      // Then we override the actual value in the query because doing select()
      // does not override or replace the previous value during testing.
      let relatedColums
      if (options.query._statements[0].grouping === 'columns') {
        relatedColums = options.query._statements[0].value
      } else {
        relatedColums = options.query._statements[1].value
      }

      relatedColums.splice(...[0, relatedColums.length]
        .concat(collection.model.publicFields.map(
          item => `${collection.relatedData.targetTableName}.${item}`
        ))
      )

      // check if pagination is being requested and we support it
      if (collection.relatedName
          && options.ctx
          && options.ctx.state.pagination
          && options.ctx.state.pagination[collection.relatedName]) {
        let pagination = options.ctx.state.pagination[collection.relatedName]

        options.query.limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage)
      }
    },

    /**
     * Event handler for belongsTo relation fetching. This gets called whenever
     * belongsTo related is being fetched.
     *
     * @param {CollectionBase} collection - The collection base for the model.
     *                                      This does not contain a model
     *                                      instance so privateFields is not
     *                                      accessible here.
     * @param {Array} columns - Array of columns to select. This is
     *                          always null.
     * @param {Object} options - Options for the fetch. Includes the query
     *                           builder object.
     */
    checkFetchingBelongs(model, columns, options) {
      // First override that is_deleted always gets filtered out.
      options.query.where({ is_deleted: false })

      // Then we override the actual value in the query because doing select()
      // does not override or replace the previous value during testing.

      // The difference between belongsTo and hasMany is in belongsTo, the
      // actual 'table_name.*' value is in the second item in _statements as
      // opposed to the first.
      let relatedColums = options.query._statements[1].value

      relatedColums.splice(...[0, relatedColums.length].concat(
        model.model.publicFields.map(item => `${model.relatedData.targetTableName}.${item}`)
      ))

      // check if pagination is being requested and we support it
      if (model.relatedName
          && options.ctx
          && options.ctx.state.pagination
          && options.ctx.state.pagination[model.relatedName]) {
        let pagination = options.ctx.state.pagination[model.relatedName]

        options.query.limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage)
      }
    },

    /**
     * Initialize a new instance of model. This does not get called when
     * relations to this model is being fetched though.
     */
    initialize() {
      this.on('fetching', this.checkFetching)
      this.on('fetched', this.checkFetched)
      this.on('fetching:collection', this.checkFetchingCollection)
      this.on('fetched:collection', this.checkFetchedCollection)
    },

    /**
     * Define a hasMany relations with the model. This version as opposed to
     * the default hasMany has filtering enabled to filter is_deleted items
     * out among other things.
     */
    hasManyFiltered(model, relatedName, foreignKey) {
      let out = this.hasMany(model, foreignKey)

      // Hook to the fetching event on the relation
      out.on('fetching', this.checkFetchingHasMany)
      out.on('fetched', this.checkFetched)

      // Add related name if specified to add pagination support
      out.relatedName = relatedName

      return out
    },

    /**
     * Define belongsToMany relations with the model. This version as opposed
     * to the default belongsToMany has filtering enabled to filter is_deleted items
     * out among other things.
     */
    belongsToManyFiltered(model, table, foreignKey, otherKey, relatedName) {
      let out = this.belongsToMany(model, table, foreignKey, otherKey)

      // Hook to the fetching event on the relation
      out.on('fetching', this.checkFetchingBelongs)
      out.on('fetched', this.checkFetched)

      // Add related name if specified to add pagination support
      out.relatedName = relatedName

      return out
    },
  })

  // Create default options for all models
  let options = defaults(opts, {
    /**
     * Columns selected in get many queries and relation queries.
     */
    publicFields: ['*'],

    /**
     * Create new model object in database.
     *
     * @param {Object} data - The values the new model should have
     * @return {Model} The resulted model
     */
    create(data) {
      return this.forge(data).save()
    },

    /**
     * Apply basic filtering to query builder object. Basic filtering
     * applies stuff like custom filtering in the query and ordering and other stuff
     *
     * @param {Request} ctx - API Request object
     * @param {QueryBuilder} qb - knex query builder object to apply filtering on
     * @param {Object} [where={}] - Any additional filtering
     * @param {string} [orderBy=id] - property to order result by
     * @param {Object[]} [properties=[]] - Properties allowed to filter by from query
     */
    _baseQueryAll(ctx, qb, where = {}, orderBy = 'id', properties = []) {
      let orderProperty = orderBy
      let sort = 'ASC'

      if (orderProperty[0] === '-') {
        orderProperty = orderProperty.slice(1)
        sort = 'DESC'
      }

      qb.where(where)
      _.forOwn(ctx.state.filter.where(properties), (value, key) => {
        if (key.startsWith('is_')) {
          qb.where(key, value === '0' ? false : true)
        } else {
          qb.where(key, 'LIKE', `%${value}%`)
        }
      })
      _.forOwn(ctx.state.filter.whereNot(properties), (value, key) => {
        if (key.startsWith('is_')) {
          qb.whereNot(key, value === '0' ? false : true)
        } else {
          qb.where(key, 'NOT LIKE', `%${value}%`)
        }
      })
      qb.orderBy(orderProperty, sort)
    },

    /**
     * Wrapper for _baseQueryAll that can be overridden.
     */
    baseQueryAll(ctx, qb, where, orderBy, properties) {
      return this._baseQueryAll(ctx, qb, where, orderBy, properties)
    },

    getSingle(id, withRelated = [], require = true, ctx = null) {
      let where = { id: Number(id) || 0 }

      return this.query({ where })
        .fetch({ require, withRelated, ctx })
    },

    getAll(ctx, where = {}, withRelated = [], orderBy = 'id') {
      return this.query(qb => {
        this.baseQueryAll(ctx, qb, where, orderBy)
      })
      .fetchPage({
        pageSize: ctx.state.pagination.perPage,
        page: ctx.state.pagination.page,
        withRelated,
        ctx: ctx,
      })
      .then(result => {
        ctx.state.pagination.total = result.pagination.rowCount
        return result
      })
    },
  })

  return shelf.Model.extend(attributes, options)
}

shelf.safeColumns = (extra) =>
  ['id', 'is_deleted', 'created_at', 'updated_at'].concat(extra || [])


export default shelf
