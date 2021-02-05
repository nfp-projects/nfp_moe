import _ from 'lodash'
import knexCore from 'knex-core'

import config from './config.mjs'
import defaults from './defaults.mjs'
import log from './log.mjs'

const knex = knexCore(config.get('knex'))

const functionMap = new Map()
let joinPostFix = 1

// Helper method to create models
export function createPrototype(opts) {
  return defaults(opts, {
    knex: knex,

    init() {
      if (!this.tableName) throw new Error('createModel was called with missing tableName')
      if (!this.Model) throw new Error('createModel was called with missing Model')

      if (!this.includes) this.includes = {}
      if (!this.publicFields) throw new Error(this.tableName + ' was missing publicFields')
      if (!this.privateFields) throw new Error(this.tableName + ' was missing privateFields')

      this.__includeFields = this.publicFields.map(x => x)

      this.publicFields = this.publicFields.map(x => `${this.tableName}.${x} as ${this.tableName}.${x}`)
      if (this.publicFields !== this.privateFields) {
        this.privateFields = this.privateFields.map(x => `${this.tableName}.${x} as ${this.tableName}.${x}`)
      }
    },

    addInclude(name, include) {
      this.includes[name] = include
    },

    _includeBase(type, subq) {
      let self = this
      let postfix = '_' + joinPostFix++
      let table = this.tableName + postfix
      return {
        type: type,
        postfix: postfix,
        table: table,
        fields: this.__includeFields.map(x => `${table}.${x} as ${table}.${x}`),
        model: self,
        qb: function(qb) {
          return subq(self, table, qb)
        }
      }
    },

    includeHasOne(source_id, target_id) {
      return this._includeBase(1, function(self, table, qb) {
        return qb.leftOuterJoin(`${self.tableName} as ${table}`, function() {
          this.on(source_id, '=', table + '.' + target_id)
              .andOn(table + '.is_deleted', '=', knex.raw('false'))
        })
      })
    },

    includeHasMany(source_id, target_id, subq = null) {
      return this._includeBase(2, function(self, table, qb) {
        return qb.leftOuterJoin(`${self.tableName} as ${table}`, function() {
          this.on(table + '.' + source_id, '=', target_id)
              .andOn(table + '.is_deleted', '=', knex.raw('false'))
          if (subq) {
            subq(this, self)
          }
        })
      })
    },

    async getAllQuery(query, queryContext = null) {
      let context = (queryContext || query).queryContext()
      if (!context.tables) throw new Error('getAll was called before query')
      let tables = context.tables
      let tableMap = new Map(tables)

      let data = await query

      if (data.length === 0) {
        return data
      }

      let keys = Object.keys(data[0])
      for (let i = 0; i < keys.length; i++) {
        let parts = keys[i].split('.')
        if (parts.length === 1) {
          if (parts[0] !== '__group') {
            tables[0][1].builder += `'${parts[0]}': data.${keys[i]},`
          }
        } else {
          let builder = tableMap.get(parts[0])
          if (builder) {
            builder.builder += `'${parts[1]}': data['${keys[i]}'],`
          }
        }
      }

      tableMap.forEach(table => {
        table.builder += '}'
        table.fn = functionMap.get(table.builder)
        if (!table.fn) {
          table.fn = new Function('data', table.builder)
          functionMap.set(table.builder, table.fn)
        }
      })

      let out = []
      let includesTwoSet = new Set()

      for (let i = 0; i < data.length; i++) {
        let baseItem = null
        for (var t = 0; t < tables.length; t++) {
          let table = tables[t][1]
          let propertyName = table.include
          let formattedData = table.fn(data[i])

          if (!formattedData) {
            if (propertyName && baseItem[propertyName] === undefined) {
              console.log('emptying')
              baseItem[propertyName] = (table.includeType.type === 1 ? null : [])
            }
            continue
          }

          let row = new table.Model(table.fn(data[i]))
          let rowId = row.id
          if (table.isRoot && data[i].__group) {
            rowId = data[i].__group + '_' + row.id
          }

          let foundItem = table.map.get(rowId)

          // If we didn't find this item, current table moble or joined table model
          // is new, therefore we need to create it
          if (!foundItem) {
            // Create a reference to it if we're dealing with the root object
            if (table.isRoot) {
              baseItem = row
            }
            table.map.set(rowId, row)

            if (table.isRoot) {
              // Add item to root array since this is a root array
              out.push(baseItem)
            } else if (table.includeType.type === 1) {
              // This is a single instance join for the root mode,
              // set it directly to the root
              baseItem[propertyName] = row
            } else if (table.includeType.type === 2) {
              // This is an array instance for the root model. Time to dig in.
              /* if (!baseItem[propertyName]) {
                baseItem[propertyName] = []
              } */
              if (!includesTwoSet.has(baseItem.id + '_' + propertyName + '_' + row.id)) {
                baseItem[propertyName].push(row)
                includesTwoSet.add(baseItem.id + '_' + propertyName + '_' + row.id)
              }
            }
          } else if (table.isRoot) {
            baseItem = foundItem
          } else if (propertyName) {
            if (table.includeType.type === 1 && !baseItem[propertyName]) {
              baseItem[propertyName] = foundItem
            } else if (table.includeType.type === 2 && !includesTwoSet.has(baseItem.id + '_' + propertyName + '_' + row.id)) {
              /* if (!baseItem[propertyName]) {
                baseItem[propertyName] = []
              } */
              baseItem[propertyName].push(foundItem)
              includesTwoSet.add(baseItem.id + '_' + propertyName + '_' + row.id)
            }
          }
        }
      }

      return out
    },

    async getSingleQuery(query, require = true) {
      let data = await this.getAllQuery(query)
      if (data.length) return data[0]
      if (require) throw new Error('EmptyResponse')
      return null
    },

    query(qb, includes = [], customFields = null, parent = null, pagination = null, paginationOrderBy = null) {
      let query
      let fields
      if (customFields === true) {
        fields = this.publicFields
      } else {
        fields = customFields ? customFields : this.publicFields
      }
      if (pagination) {
        query = knex.with(this.tableName, subq => {
          subq.select(this.tableName + '.*')
            .from(this.tableName)
            .where(this.tableName + '.is_deleted', '=', 'false')

          qb(subq)
          subq.orderBy(pagination.orderProperty, pagination.sort)
              .limit(pagination.perPage)
              .offset((pagination.page - 1) * pagination.perPage)
        }).from(this.tableName)
      } else {
        query = knex(this.tableName).where(this.tableName + '.is_deleted', '=', 'false')
        qb(query)
      }
      let tables = parent && parent.queryContext().tables || []
      let tableMap = new Map(tables)
      if (!tables.length) {
        tables.push([this.tableName, {
          builder: 'return {',
          fn: null,
          map: new Map(),
          Model: this.Model,
          isRoot: true,
          include: null,
          includeType: {},
        }])
      }

      query.select(fields)

      for (let i = 0; i < includes.length; i++) {
        let includeType = this.includes[includes[i]]
        if (!includeType) {
          throw new Error(`Model ${this.tableName} was missing includes ${includes[i]}`)
        }
        includeType.qb(query).select(includeType.fields)
        
        if (tableMap.has(includeType.table)) {
          continue
        }

        if (includeType.type === 1) {
          tables[0][1].builder += `${includes[i]}: null,`
        } else {
          tables[0][1].builder += `${includes[i]}: [],`
        }
        let newTable = [
          includeType.table,
          {
            builder: `if (!data.id && !data['${includeType.table}.id']) {/*console.log('${includeType.table}', data.id, data['${includeType.table}.id']);*/return null;} return {`,
            fn: null,
            map: new Map(),
            isRoot: false,
            Model: includeType.model.Model,
            include: includes[i],
            includeType: includeType,
          }
        ]
        tables.push(newTable)
        tableMap.set(newTable[0], newTable[1])
      }

      if (pagination) {
        query.orderBy(pagination.orderProperty, pagination.sort)
      }

      query.queryContext({ tables: tables })

      return query
    },

    async _getAll(ctx, subq, includes = [], orderBy = 'id') {
      let orderProperty = orderBy
      let sort = 'ASC'

      if (orderProperty[0] === '-') {
        orderProperty = orderProperty.slice(1)
        sort = 'DESC'
      }

      ctx.state.pagination.sort = sort
      ctx.state.pagination.orderProperty = orderProperty

      let [data, total] = await Promise.all([
        this.getAllQuery(this.query(qb => {
          let qbnow = qb
          if (subq) {
            qbnow = subq(qb) || qb
          }
          return qbnow
        }, includes, null, null, ctx.state.pagination)),
        (() => {
          let qb = this.knex(this.tableName)
          if (subq) {
            qb = subq(qb) || qb
          }
          qb.where(this.tableName + '.is_deleted', '=', false)
          return qb.count('* as count')
        })(),
      ])
      ctx.state.pagination.total = total[0].count
      return data
    },

    getAll(ctx, subq, includes = [], orderBy = 'id') {
      return this._getAll(ctx, subq, includes, orderBy)
    },

    _getSingle(subq, includes = [], require = true, ctx = null) {
      return this.getSingleQuery(this.query(qb => {
        return qb
          .where(qb => {
            if (subq) subq(qb)
          })
      }, includes), require)
    },

    getSingle(id, includes = [], require = true, ctx = null) {
      return this._getSingle(qb => qb.where(this.tableName + '.id', '=', Number(id) || 0 ), includes, require, ctx)
    },

    async updateSingle(ctx, id, body) {
      // Fetch the item in question, making sure it exists
      let item = await this.getSingle(id, [], true, ctx)

      // Paranoia checking
      if (typeof(item.id) !== 'number') throw new Error('Item was missing id')

      body.updated_at = new Date()

      // Update our item in the database
      let out = await knex(this.tableName)
        .where({ id: item.id })
        // Map out the 'as' from the private fields so it returns a clean
        // response in the body
        .update(body, this.privateFields.map(x => x.split('as')[0]))
      
      // More paranoia checking
      if (out.length < 1) throw new Error('Updated item returned empty result')

      return out[0]
    },

    /**
     * Create new entry in the database.
     *
     * @param {Object} data - The values the new item should have
     * @return {Object} The resulting object
     */
    async create(body) {
      body.created_at = new Date()
      body.updated_at = new Date()
      let out = await knex(this.tableName)
        // Map out the 'as' from the private fields so it returns a clean
        // response in the body
        .insert(body, this.privateFields.map(x => x.split('as')[0]))
      
      // More paranoia checking
      if (out.length < 1) throw new Error('Updated item returned empty result')

      return out[0]
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

    /*async getSingle(id, require = true, ctx = null) {
      let where = { id: Number(id) || 0 }

      let data = await knex(this.tableName).where(where).first(this.publicFields)

      if (!data && require) throw new Error('EmptyResponse')

      return data
    },*/
  })
}

export function safeColumns(extra) {
  return ['id', /*'is_deleted',*/ 'created_at', 'updated_at'].concat(extra || [])
}
/*shelf.safeColumns = (extra) =>
  ['id', 'is_deleted', 'created_at', 'updated_at'].concat(extra || [])*/
