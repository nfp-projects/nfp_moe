import _ from 'lodash'
import knex from 'knex'
import bookshelf from 'bookshelf'

import config from './config.mjs'
import defaults from './defaults.mjs'
import log from './log.mjs'

let connections = [config.get('knex:connection')]

if (config.get('knex:connectionslave')) {
  connections.push(config.get('knex:connectionslave'))
}

let isRecovering = false
let isUrgent = false
let currentIndex = 0
let nextIndex = currentIndex + 1
let client
let secondaryClient

/**
 * Semi-gracefully shift the current active client connection from the
 * current connected client and switch to the selected index server.
 */
async function shiftConnection(index) {
  // Update our variables
  isUrgent = false
  currentIndex = index

  log.warn('DB: Destroying current pool')
  await client.destroy()

  // Update connection settings to the new server and re-initialize the pool.
  log.warn(connections[currentIndex], 'DB: Connecting to next server')
  client.client.connectionSettings = connections[currentIndex]
  client.initialize()
}

/**
 * Start a graceful server migration. Creates a secondary database connection
 * and checks other available servers we have if they're up and can be used.
 */
async function gracefulServerMigrate() {
  // Check if we're already recovering and exit then.
  if (isRecovering) return

  // Urgent means we don't have ANY active database connectiong and need one quickly.
  if (isUrgent) {
    log.error(connections[currentIndex], `DB: Server connected to is offline.`)
  } else {
    log.warn(connections[currentIndex], `DB: Successfully connected to a server but its status was recovering (slave).`)
  }
  log.warn('DB: Attempting to gracefully connecting to different server')
  isRecovering = true

  // Load up next server into a new knex connection and start connecting.
  if (nextIndex === connections.length) {
    nextIndex = 0
  }
  secondaryClient = knex(getConfig(nextIndex, false))

  // Keep on trying :)
  while (true) {
    // Make multiple attempts when we're connecting to downed or timed out databases.
    let attempts = 0

    while (attempts++ < 5) {
      try {
        log.warn(connections[nextIndex], `DB: Gracefully attempting to connect to server (attempt ${attempts}/5).`)

        // Connect to the database (this creates a new pool connection) and check if it's in recovery mode
        let data = await secondaryClient.raw('select pg_is_in_recovery()')

        // If we reach here, we got data which means the database is up and running.
        // As such, there's no need to make more attempts to same server
        attempts = 6

        // Check if it's master or if we are desperate
        if (!data.rows[0].pg_is_in_recovery || isUrgent) {
          // Found a viable server to connect to. Shift our active client to it.
          log.info(connections[nextIndex], 'DB: Found available server, connecting to it')
          await shiftConnection(nextIndex)

          // Check if we're connected to master or just a slave.
          if (!data.rows[0].pg_is_in_recovery) {
            // We found a master, stop recovering
            log.info(connections[nextIndex], 'DB: Connection established with master.')
            isRecovering = false
            break
          }
        }
      } catch (err) {
        // We only care to log weird errors like postgresql errors or such.
        if (err.code !== 'ECONNREFUSED' && err.code !== 'ETIMEDOUT') {
          log.error({ code: err.code, message: err.message }, `DB: Unknown error while gracefully connecting to ${connections[nextIndex].host}`)
        }

        // Make a next attempt after 10 seconds
        await new Promise(res => setTimeout(res, 10000))
      }
    }

    // Check if we found a master and break if we did.
    if (isRecovering === false) break

    // Didn't find a master :( wait 60 seconds before running another attempt
    log.warn(connections[nextIndex], 'DB: Connected server was deemeed unable to fit master role')
    log.warn('DB: waiting 60 seconds before attempting next server')

    await new Promise(res => setTimeout(res, 60000))

    // Move to next server
    nextIndex++
    if (nextIndex === connections.length) {
      nextIndex = 0
    }

    // Time to destroy our active pool on our current server and update
    // the connection settings to the next server and re-initialise.
    await secondaryClient.destroy()
    secondaryClient.client.connectionSettings = connections[nextIndex]
    secondaryClient.initialize()
  }

  // We got here means we have stopped recovery process.
  // Shut down the secondary knex client and destroy it and
  // remove reference to it so GC can collect it eventually, hopefully.
  await secondaryClient.destroy()
  nextIndex = currentIndex + 1
  secondaryClient = null
}

/**
 * Event handler after our pool is created and we are creating a connection.
 * Here  we check if the database is in recovery mode (a.k.a. slave) and if so
 * start the graceful migration to migrate back to master once it's up and running.
 */
function afterCreate(conn, done) {
  conn.query('select pg_is_in_recovery()', (e, res) => {
    if (e) return done(e, conn)
    if (res.rows[0].pg_is_in_recovery) gracefulServerMigrate().then()
    done(null, conn)
  })
}

/**
 * Event handler for when the pool gets destroyed. Here we check
 * if the connection has been marked with _ending = true.
 * There are some checks available we can use to check if current
 * connection was abrubtly disconnected. Among those from my testing
 * are as follows:
 *
 * conn.__knex__disposed = 'Connection ended unexpectedly'
 * conn.connection._ending = true
 *
 * I went with connection._ending one as I feel that one's the safest.
 * 
 */
function beforeDestroy(conn) {
  if (conn.connection._ending) {
    checkActiveConnection()
  }
}

/**
 * Return a valid confic for knex based on specific connection index.
 * Note that we don't wanna hook into afterCreate or beforeDestroy
 * in our secondary knex connection doing the recovery checking.
 */
function getConfig(index = 0, addEvents = true) {
  return {
    'client': 'pg',
    'connection': connections[index],
    'migrations': {
    },
    pool: {
      afterCreate: addEvents && afterCreate || null,
      min: 2,
      max: 10,
      beforeDestroy: addEvents && beforeDestroy || null,
    },
    acquireConnectionTimeout: 10000,
  }
}

client = knex(getConfig(currentIndex))

/**
 * Make sure no update or delete queries are run while we're recovering.
 * This allows knex to connect to a slave and only process select queries.
 *
 * Note: Probably does not support complicated select queries that cause
 *       updates on trigger or other such things.
 */
client.on('query', data => {
  if (isRecovering && data.method !== 'select') {
    throw new Error('Database is in read-only mode')
  }
})

function checkActiveConnection(attempt = 1) {
  if (attempt > 5) {
    isUrgent = true
    return gracefulServerMigrate().then()
  }
  // log.info(`DB: (Attempt ${attempt}/5) Checking connection is active.`)
  client.raw('select 1').catch(err => {
    if (err.code === 'ECONNREFUSED') { // err.code === 'ETIMEDOUT'
      isUrgent = true
      return gracefulServerMigrate().then()
    }
    if (err) {
      let wait = 3000 // err.code like '57P03' and such.
      if (err.code === 'ETIMEDOUT') {
        wait = 10000
      }

      log.error({ code: err.code, message: err.message }, `DB: (Attempt ${attempt}/5) Error while checking connection status`)
      if (attempt < 5) {
        log.warn(`DB: (Attempt ${attempt}/5) Attempting again in ${wait / 1000} seconds.`)
        setTimeout(() => checkActiveConnection(attempt + 1), wait)
      } else {
        checkActiveConnection(attempt + 1)
      }
    }
  })
}

// Only way to check startup connection errors
log.info(getConfig(currentIndex).connection, 'DB: Connecting to server')
setTimeout(() => checkActiveConnection(), 100)

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
